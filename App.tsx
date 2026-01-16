
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, addWeeks, subWeeks, startOfMonth, addMonths, subMonths, isSameDay, parseISO, startOfWeek, addDays, differenceInDays, isSameWeek } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query,
  orderBy,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase';
import { Employee, Shift, ViewType, Role, CurrentUser, TimeOffRequest } from './types';
import WeeklyCalendar from './components/WeeklyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import EmployeeManager from './components/EmployeeManager';
import ShiftModal from './components/ShiftModal';
import LoginScreen from './components/LoginScreen';
import TimeOffManager from './components/TimeOffManager';
import { getWeekDays, checkOverlap, calculateShiftHours } from './utils/helpers';

const LOCAL_STORAGE_KEY_EMPLOYEES = 'shiftmaster_employees';
const LOCAL_STORAGE_KEY_SHIFTS = 'shiftmaster_shifts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  const [view, setView] = useState<ViewType>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [adminPassword, setAdminPassword] = useState('123456');
  
  const [loading, setLoading] = useState(true);
  const [isFirebaseOffline, setIsFirebaseOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  
  const hasAttemptedFirebase = useRef(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);
  const [prefilledData, setPrefilledData] = useState<{ date?: string; startTime?: string; endTime?: string; employeeId?: string }>({});
  
  // Clipboard State
  const [copiedShift, setCopiedShift] = useState<Partial<Shift> | null>(null);
  const [copiedWeekDate, setCopiedWeekDate] = useState<Date | null>(null);

  // Set initial view based on user role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'staff' && currentUser.employeeId) {
        setSelectedEmployeeId(currentUser.employeeId);
      } else {
        setSelectedEmployeeId('all');
      }
    }
  }, [currentUser]);

  // Firestore Listeners
  useEffect(() => {
    if (hasAttemptedFirebase.current) return;
    hasAttemptedFirebase.current = true;

    let unsubscribeEmployees: () => void;
    let unsubscribeShifts: () => void;
    let unsubscribeRequests: () => void;
    let unsubscribeSettings: () => void;

    const handleFallback = (errorType?: string) => {
      setIsFirebaseOffline(true);
      setFirebaseError(errorType || 'Connection Failed');
      const storedEmployees = localStorage.getItem(LOCAL_STORAGE_KEY_EMPLOYEES);
      const storedShifts = localStorage.getItem(LOCAL_STORAGE_KEY_SHIFTS);
      if (storedEmployees) setEmployees(JSON.parse(storedEmployees));
      if (storedShifts) setShifts(JSON.parse(storedShifts));
      setLoading(false);
    };

    const setupFirestore = () => {
      try {
        // Employees Listener
        unsubscribeEmployees = onSnapshot(query(collection(db, 'employees'), orderBy('name')), 
          (snapshot) => {
            const empList: Employee[] = [];
            snapshot.forEach((doc) => { 
                const data = doc.data();
                // Explicitly mapping fields to avoid circular references in case of complex types (like Refs) in DB
                empList.push({ 
                    id: doc.id, 
                    name: data.name || '',
                    role: data.role || 'Other',
                    color: data.color || '#cccccc'
                } as Employee); 
            });
            setEmployees(empList);
            setIsFirebaseOffline(false);
            setLoading(false);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_EMPLOYEES, JSON.stringify(empList));
            } catch (e) {
              console.error("Failed to cache employees", e);
            }
          }, 
          (error) => {
            console.error("Firestore Error:", error);
            handleFallback(error.code);
          }
        );

        // Shifts Listener
        unsubscribeShifts = onSnapshot(query(collection(db, 'shifts')), 
          (snapshot) => {
            const shiftList: Shift[] = [];
            snapshot.forEach((doc) => { 
                const data = doc.data();
                shiftList.push({ 
                    id: doc.id, 
                    employeeId: data.employeeId || '',
                    date: data.date || '',
                    startTime: data.startTime || '',
                    endTime: data.endTime || '',
                    hours: data.hours || 0
                } as Shift); 
            });
            setShifts(shiftList);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_SHIFTS, JSON.stringify(shiftList));
            } catch (e) {
              console.error("Failed to cache shifts", e);
            }
          }
        );

        // Time Off Requests Listener
        unsubscribeRequests = onSnapshot(query(collection(db, 'timeOffRequests')),
          (snapshot) => {
            const reqList: TimeOffRequest[] = [];
            snapshot.forEach((doc) => { 
                const data = doc.data();
                reqList.push({ 
                    id: doc.id, 
                    employeeId: data.employeeId || '',
                    startDate: data.startDate || '',
                    endDate: data.endDate || '',
                    reason: data.reason || '',
                    status: data.status || 'pending',
                    createdAt: data.createdAt || new Date().toISOString()
                } as TimeOffRequest); 
            });
            setTimeOffRequests(reqList);
          }
        );

        // Admin Settings Listener (Password)
        unsubscribeSettings = onSnapshot(doc(db, 'settings', 'admin'), 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data?.password) {
                setAdminPassword(data.password);
              }
            } else {
              // Create default password in Firestore if it doesn't exist
              setDoc(doc(db, 'settings', 'admin'), { password: '123456' })
                .catch(err => console.error("Failed to init admin settings", err));
            }
          },
          (error) => {
            console.warn("Could not fetch admin settings", error);
          }
        );

      } catch (err) {
        handleFallback('Config Error');
      }
    };

    setupFirestore();
    const timeoutId = setTimeout(() => { if (loading) handleFallback('Timeout'); }, 5000);

    return () => {
      if (unsubscribeEmployees) unsubscribeEmployees();
      if (unsubscribeShifts) unsubscribeShifts();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeSettings) unsubscribeSettings();
      clearTimeout(timeoutId);
    };
  }, []);

  const saveShift = async (shift: Shift) => {
    if (currentUser?.role !== 'admin') return;
    try {
      const existing = shifts.find(s => s.id === shift.id);
      if (existing) {
        await setDoc(doc(db, 'shifts', shift.id), shift, { merge: true });
      } else {
        setSyncing(true);
        await addDoc(collection(db, 'shifts'), {
          employeeId: shift.employeeId,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          hours: shift.hours
        });
      }
    } catch (error) {
      console.error("Firestore Save Error:", error);
    } finally {
      setSyncing(false);
      setIsModalOpen(false);
      setEditingShift(undefined);
      setPrefilledData({});
    }
  };

  const deleteShift = async (id: string) => {
    if (currentUser?.role !== 'admin') return;
    setSyncing(true);
    try {
      await deleteDoc(doc(db, 'shifts', id));
    } catch (error) {
      console.error("Firestore Delete Error:", error);
    } finally {
      setSyncing(false);
      setIsModalOpen(false);
      setEditingShift(undefined);
    }
  };

  const handlePasteShift = async (date: string) => {
    if (currentUser?.role !== 'admin') return;
    if (!copiedShift) return;

    const newShiftData = {
      employeeId: copiedShift.employeeId!,
      date: date,
      startTime: copiedShift.startTime!,
      endTime: copiedShift.endTime!,
      hours: calculateShiftHours(copiedShift.startTime!, copiedShift.endTime!)
    };

    if (checkOverlap(shifts, { ...newShiftData, id: 'temp-check' })) {
      alert("Conflict: This employee already has a shift at this time on " + date);
      return;
    }

    setSyncing(true);
    try {
      await addDoc(collection(db, 'shifts'), newShiftData);
    } catch (error) {
      console.error("Paste Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyWeek = (weekStart: Date) => {
    setCopiedWeekDate(weekStart);
  };

  const handlePasteWeek = async (targetWeekStart: Date) => {
    if (!copiedWeekDate || !currentUser || currentUser.role !== 'admin') return;

    const sourceStart = startOfWeek(copiedWeekDate, { weekStartsOn: 0 });
    const targetStart = startOfWeek(targetWeekStart, { weekStartsOn: 0 });
    
    // Find all shifts in source week
    const shiftsToCopy = shifts.filter(s => {
       const sDate = parseISO(s.date);
       return isSameWeek(sDate, sourceStart, { weekStartsOn: 0 });
    });

    if (shiftsToCopy.length === 0) {
      alert("No shifts found in the source week to copy.");
      return;
    }

    if (!confirm(`Paste ${shiftsToCopy.length} shifts from week of ${format(sourceStart, 'MMM d')} to week of ${format(targetStart, 'MMM d')}?`)) {
      return;
    }

    setSyncing(true);
    const batch = writeBatch(db);
    const daysDiff = differenceInDays(targetStart, sourceStart);

    shiftsToCopy.forEach(s => {
      const originalDate = parseISO(s.date);
      const newDate = addDays(originalDate, daysDiff);
      const newShiftRef = doc(collection(db, 'shifts'));
      batch.set(newShiftRef, {
        employeeId: s.employeeId,
        date: format(newDate, 'yyyy-MM-dd'),
        startTime: s.startTime,
        endTime: s.endTime,
        hours: s.hours
      });
    });

    try {
      await batch.commit();
      // Keep copiedWeekDate active to allow multiple pastes
    } catch (e) {
      console.error("Batch Paste Error:", e);
      alert("Failed to paste week. See console.");
    } finally {
      setSyncing(false);
    }
  };

  const saveEmployee = async (emp: Partial<Employee>, id?: string) => {
    if (currentUser?.role !== 'admin') return;
    setSyncing(true);
    try {
      if (id) {
        await setDoc(doc(db, 'employees', id), emp, { merge: true });
      } else {
        await addDoc(collection(db, 'employees'), emp);
      }
    } catch (error) {
      console.error("Firestore Employee Save Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (currentUser?.role !== 'admin') return;
    setSyncing(true);
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      console.error("Firestore Employee Delete Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Time Off Request Handlers
  const handleRequestSubmit = async (requestData: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>) => {
    setSyncing(true);
    try {
      await addDoc(collection(db, 'timeOffRequests'), {
        ...requestData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Request Submit Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRequestStatusUpdate = async (id: string, status: 'approved' | 'denied') => {
    if (currentUser?.role !== 'admin') return;
    setSyncing(true);
    try {
      await setDoc(doc(db, 'timeOffRequests', id), { status }, { merge: true });
    } catch (error) {
      console.error("Request Update Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    setSyncing(true);
    try {
      await deleteDoc(doc(db, 'timeOffRequests', id));
    } catch (error) {
      console.error("Request Delete Error:", error);
    } finally {
      setSyncing(false);
    }
  };

  const navigateDate = (direction: 'next' | 'prev' | 'today') => {
    if (direction === 'today') { setCurrentDate(new Date()); return; }
    setCurrentDate(prev => view === 'weekly' 
      ? (direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1))
      : (direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1))
    );
  };

  const weekRangeLabel = useMemo(() => {
    const days = getWeekDays(currentDate);
    return `${format(days[0], 'MMM d')} – ${format(days[6], 'MMM d, yyyy')}`;
  }, [currentDate]);

  const handleOpenNewShift = (date?: string, start?: string, end?: string) => {
    if (currentUser?.role !== 'admin') return;
    setEditingShift(undefined);
    setPrefilledData({ date, startTime: start, endTime: end });
    setIsModalOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    if (currentUser?.role !== 'admin') return;
    setEditingShift(shift);
    setIsModalOpen(true);
  };

  // ---------------- RENDER ---------------- //

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing Firestone Cloud...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen 
        employees={employees} 
        onLogin={setCurrentUser} 
        adminPassword={adminPassword} 
      />
    );
  }

  const copiedEmployee = employees.find(e => e.id === copiedShift?.employeeId);
  const pendingRequestsCount = timeOffRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col max-h-screen overflow-hidden text-sm print:overflow-visible">
      <header className="bg-white border-b sticky top-0 z-40 px-3 py-1.5 md:px-4 md:py-2 flex flex-col gap-2 md:flex-row md:items-center justify-between no-print shadow-sm">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-100 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-base font-black text-gray-900 tracking-tight leading-none uppercase">ShiftMaster Pro</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-blue-500 animate-ping' : isFirebaseOffline ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                <span className={`text-[9px] font-black uppercase tracking-widest hidden md:inline ${isFirebaseOffline ? 'text-orange-600' : 'text-blue-600'}`}>
                  {syncing ? 'Syncing...' : isFirebaseOffline ? `OFFLINE (${firebaseError})` : 'Firestone Secure'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Mobile Only: Logout */}
          <button onClick={() => setCurrentUser(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>

        {/* Clipboard Indicator */}
        {copiedShift && currentUser.role === 'admin' && (
          <div className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Copied Shift</span>
              <span className="text-[10px] font-black text-blue-700 uppercase leading-none mt-1">
                {copiedEmployee?.name}
              </span>
            </div>
            <button onClick={() => setCopiedShift(null)} className="ml-2 p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        
        {/* Weekly Clipboard Indicator */}
        {copiedWeekDate && currentUser.role === 'admin' && (
          <div className="hidden md:flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest leading-none">Copied Week</span>
              <span className="text-[10px] font-black text-purple-700 uppercase leading-none mt-1">
                {format(startOfWeek(copiedWeekDate, {weekStartsOn:0}), 'MMM d')} - {format(addDays(startOfWeek(copiedWeekDate, {weekStartsOn:0}), 6), 'MMM d')}
              </span>
            </div>
            <button onClick={() => setCopiedWeekDate(null)} className="ml-2 p-1 hover:bg-purple-100 rounded-full text-purple-400 hover:text-purple-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <div className="flex flex-row items-center justify-between gap-2 w-full md:w-auto">
          <nav className="flex bg-gray-100 p-0.5 rounded-lg overflow-x-auto custom-scrollbar flex-1 md:flex-none">
            <button onClick={() => setView('weekly')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-black transition-all whitespace-nowrap ${view === 'weekly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>WEEKLY</button>
            <button onClick={() => setView('monthly')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-black transition-all whitespace-nowrap ${view === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>MONTHLY</button>
            {currentUser.role === 'admin' && (
              <button onClick={() => setView('employees')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-black transition-all whitespace-nowrap ${view === 'employees' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>STAFF</button>
            )}
            <button onClick={() => setView('requests')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${view === 'requests' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              REQ
              {currentUser.role === 'admin' && pendingRequestsCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full leading-none py-0.5">{pendingRequestsCount}</span>
              )}
            </button>
          </nav>

          <div className="flex items-center gap-1">
            {/* Desktop Logout */}
            <button onClick={() => setCurrentUser(null)} className="hidden md:block p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Log Out">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
            {/* Print: Hidden on Mobile */}
            <button onClick={() => window.print()} className="hidden md:block p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors" title="Print Schedule">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            {currentUser.role === 'admin' && (
              <button onClick={() => handleOpenNewShift()} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 md:px-4 md:py-2 rounded-lg font-black text-[10px] md:text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-100 uppercase tracking-widest shrink-0">
                <span className="hidden md:inline">Assign</span>
                <span className="md:hidden"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-gray-50 overflow-hidden print:overflow-visible">
        {view !== 'employees' && view !== 'requests' && (
          <div className="bg-white px-3 md:px-5 py-2 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-2 no-print shadow-sm z-30 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full md:w-auto">
              <h2 className="text-sm md:text-base font-black text-gray-900 min-w-[180px] uppercase truncate">
                {view === 'weekly' ? weekRangeLabel : format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 self-start">
                <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-white rounded-md transition-all text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                <button onClick={() => navigateDate('today')} className="px-2 py-1 hover:bg-white rounded-md text-[9px] font-black text-gray-600 uppercase">Today</button>
                <button onClick={() => navigateDate('next')} className="p-1 hover:bg-white rounded-md transition-all text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
              </div>
            </div>

            {view === 'weekly' && (
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
                <button onClick={() => setSelectedEmployeeId('all')} className={`px-3 py-1 rounded-md text-[10px] font-black whitespace-nowrap transition-all ${selectedEmployeeId === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>ALL</button>
                {employees
                  .filter(emp => currentUser.role === 'admin' || emp.id === currentUser.employeeId)
                  .map(emp => (
                  <button key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)} className={`px-3 py-1 rounded-md text-[10px] font-black whitespace-nowrap flex items-center gap-1.5 transition-all ${selectedEmployeeId === emp.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedEmployeeId === emp.id ? 'white' : emp.color }}></div>
                    {emp.name.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-hidden flex flex-col min-h-0 print:p-0 print:overflow-visible ${view === 'weekly' ? 'p-0' : 'p-0 md:p-2'}`}>
          {view === 'weekly' && (
            <WeeklyCalendar 
              currentDate={currentDate} 
              shifts={shifts} 
              employees={employees} 
              onEditShift={handleEditShift}
              onAddShift={handleOpenNewShift}
              onSaveShift={saveShift}
              onPasteShift={handlePasteShift}
              selectedEmployeeId={selectedEmployeeId}
              hasCopiedShift={!!copiedShift}
              readOnly={currentUser.role !== 'admin'}
            />
          )}
          {view === 'monthly' && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <MonthlyCalendar 
                currentDate={currentDate} 
                shifts={shifts} 
                employees={employees} 
                onDayClick={(date) => { setCurrentDate(date); setView('weekly'); }}
                onCopyWeek={handleCopyWeek}
                onPasteWeek={handlePasteWeek}
                copiedWeekDate={copiedWeekDate}
                currentUserRole={currentUser.role}
              />
            </div>
          )}
          {view === 'employees' && currentUser.role === 'admin' && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <EmployeeManager 
                employees={employees} 
                shifts={shifts}
                onSave={saveEmployee}
                onDelete={deleteEmployee}
                onEditShift={handleEditShift}
              />
            </div>
          )}
          {view === 'requests' && (
            <div className="flex-1 overflow-auto custom-scrollbar">
              <TimeOffManager 
                requests={timeOffRequests}
                employees={employees}
                currentUser={currentUser}
                onRequestSubmit={handleRequestSubmit}
                onUpdateStatus={handleRequestStatusUpdate}
                onDeleteRequest={handleDeleteRequest}
              />
            </div>
          )}
        </div>
      </main>

      {isModalOpen && currentUser.role === 'admin' && (
        <ShiftModal 
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingShift(undefined); setPrefilledData({}); }}
          onSave={saveShift}
          onDelete={deleteShift}
          onCopy={(shift) => setCopiedShift({ employeeId: shift.employeeId, startTime: shift.startTime, endTime: shift.endTime })}
          employees={employees}
          shifts={shifts}
          editingShift={editingShift}
          prefilledDate={prefilledData.date}
          prefilledStartTime={prefilledData.startTime}
          prefilledEndTime={prefilledData.endTime}
        />
      )}
    </div>
  );
};

export default App;

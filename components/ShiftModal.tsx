
import React, { useState, useEffect } from 'react';
import { Employee, Shift } from '../types';
import { calculateShiftHours, checkOverlap, getFormattedTime, snapTo30Min } from '../utils/helpers';
import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onCopy: (shift: Shift) => void; // New callback for clipboard
  employees: Employee[];
  shifts: Shift[];
  editingShift?: Shift;
  prefilledDate?: string;
  prefilledStartTime?: string;
  prefilledEndTime?: string;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const mins = (i % 2) * 30;
  const value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  const label = getFormattedTime(value);
  return { value, label };
});

const ShiftModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, onCopy, employees, shifts, editingShift, prefilledDate, prefilledStartTime, prefilledEndTime }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingShift) {
        setEmployeeId(editingShift.employeeId);
        setDate(editingShift.date);
        setStartTime(snapTo30Min(editingShift.startTime));
        setEndTime(snapTo30Min(editingShift.endTime));
      } else {
        setEmployeeId(employees[0]?.id || '');
        setDate(prefilledDate || format(new Date(), 'yyyy-MM-dd'));
        setStartTime(snapTo30Min(prefilledStartTime || '09:00'));
        setEndTime(snapTo30Min(prefilledEndTime || '17:00'));
      }
    }
  }, [editingShift, prefilledDate, prefilledStartTime, prefilledEndTime, employees, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError('Please select a staff member.');
      return;
    }

    const hours = calculateShiftHours(startTime, endTime);
    if (hours <= 0) {
      setError('End time must be after start time.');
      return;
    }

    const newShift: Shift = {
      id: editingShift?.id || Date.now().toString(),
      employeeId,
      date,
      startTime,
      endTime,
      hours,
    };

    if (checkOverlap(shifts, newShift)) {
      setError('Schedule Conflict: This employee is already assigned to a shift during this time.');
      return;
    }

    onSave(newShift);
  };

  const selectedEmployee = employees.find(e => e.id === employeeId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 md:px-8 md:py-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">
            {editingShift ? 'Edit Assignment' : 'New Assignment'}
          </h3>
          <div className="flex items-center gap-2">
            {editingShift && (
              <button 
                type="button"
                onClick={() => { onCopy(editingShift); onClose(); }}
                className="bg-white p-2 rounded-xl shadow-sm text-blue-600 hover:text-blue-700 transition-all border border-gray-100 flex items-center gap-2 md:pr-3"
                title="Copy shift pattern to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Copy</span>
              </button>
            )}
            <button onClick={onClose} className="bg-white p-2 rounded-xl shadow-sm text-gray-400 hover:text-gray-900 transition-all border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</label>
              <div className="relative">
                <select
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 md:py-3.5 border border-gray-200 rounded-2xl appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white transition-all text-sm font-black text-gray-800"
                >
                  <option value="" disabled>Choose Staff Member</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name.toUpperCase()}</option>
                  ))}
                </select>
                <div 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-4 ring-white shadow-sm"
                  style={{ backgroundColor: selectedEmployee?.color || '#ccc' }}
                ></div>
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-5 py-3 md:py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-black text-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Starts (12H)</label>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 md:px-5 py-3 md:py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white transition-all text-sm font-black text-gray-800"
                >
                  {TIME_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ends (12H)</label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 md:px-5 py-3 md:py-3.5 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white transition-all text-sm font-black text-gray-800"
                >
                  {TIME_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-600 rounded-[24px] p-5 md:p-6 flex items-center justify-between text-white shadow-xl shadow-blue-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Duration</span>
                <span className="text-xl md:text-2xl font-black">
                  {calculateShiftHours(startTime, endTime)} <span className="text-xs opacity-80 uppercase tracking-tighter">Hours</span>
                </span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="pt-2 md:pt-4 flex flex-col-reverse sm:flex-row gap-3 md:gap-4">
              {editingShift && (
                <button
                  type="button"
                  onClick={() => onDelete(editingShift.id)}
                  className="px-6 py-3.5 md:py-4 text-xs font-black text-red-500 hover:bg-red-50 rounded-2xl transition-colors uppercase tracking-widest"
                >
                  Delete
                </button>
              )}
              <div className="flex-1 flex gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 md:py-4 text-xs font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 md:py-4 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-300 uppercase tracking-widest"
                >
                  {editingShift ? 'Save' : 'Assign'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;

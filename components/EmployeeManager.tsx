
import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { Employee, Shift, Role } from '../types';
import { getFormattedTime } from '../utils/helpers';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  onSave: (emp: Partial<Employee>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEditShift: (shift: Shift) => void; // New prop to handle shift editing from staff tab
}

const ROLES: Role[] = ['Manager', 'Cashier', 'Stock', 'Sales', 'Other'];

const EmployeeManager: React.FC<Props> = ({ employees, shifts, onSave, onDelete, onEditShift }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState<Partial<Employee>>({
    name: '',
    role: 'Cashier' as Role,
    color: '#2563eb'
  });

  const currentWeekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewEmployeeData({
      name: '',
      role: 'Cashier' as Role,
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    });
  };

  const handleSaveNew = async () => {
    if (!newEmployeeData.name?.trim()) {
      alert("Please enter a name for the employee.");
      return;
    }
    await onSave(newEmployeeData);
    setIsAdding(false);
  };

  const handleEditClick = (emp: Employee) => {
    setEditingId(emp.id);
    setFormData(emp);
  };

  const handleFinalSave = async (id: string) => {
    if (!formData.name?.trim()) {
      alert("Name cannot be empty.");
      return;
    }
    await onSave(formData, id);
    setEditingId(null);
  };

  const handleRemove = async (id: string) => {
    if (confirm('Permanently remove this staff member? This will not delete their historical shifts from the record.')) {
      await onDelete(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2 md:py-4">
      <div className="flex justify-between items-center mb-4 md:mb-6 px-3 md:px-0">
        <div>
          <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight uppercase">Team Directory</h2>
          <p className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-0.5">Manage staff roles and schedules</p>
        </div>
        {!isAdding && (
          <button 
            onClick={handleStartAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 md:px-6 md:py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span className="hidden md:inline">Add Staff</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-6 mx-2 md:mx-0 bg-blue-50/50 p-4 md:p-6 rounded-3xl border-2 border-dashed border-blue-200 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
            <div 
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative cursor-pointer"
              style={{ backgroundColor: newEmployeeData.color }}
            >
              <span className="text-white text-3xl font-black">?</span>
              <input 
                type="color" 
                value={newEmployeeData.color} 
                onChange={e => setNewEmployeeData({ ...newEmployeeData, color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
            <div className="flex-1 w-full space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Full Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Enter Name..."
                    className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-black focus:border-blue-500 outline-none uppercase"
                    value={newEmployeeData.name}
                    onChange={e => setNewEmployeeData({ ...newEmployeeData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Assigned Role</label>
                  <select 
                    className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none uppercase"
                    value={newEmployeeData.role}
                    onChange={e => setNewEmployeeData({ ...newEmployeeData, role: e.target.value as Role })}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all"
                >
                  Save Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 px-2 md:px-0">
        {employees.length === 0 && !isAdding && (
          <div className="text-center py-16 bg-white rounded-3xl border-4 border-dashed border-gray-100 flex flex-col items-center">
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No staff members in directory</p>
          </div>
        )}
        {employees.map(emp => {
          const empShifts = shifts.filter(s => s.employeeId === emp.id);
          const weeklyShifts = empShifts.filter(s => currentWeekDays.some(day => isSameDay(day, parseISO(s.date))));
          const weeklyHours = weeklyShifts.reduce((acc, curr) => acc + curr.hours, 0);
          const isEditing = editingId === emp.id;

          return (
            <div key={emp.id} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-blue-200 transition-all">
              <div className="p-3 md:p-5 flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex items-center gap-4 md:gap-6 md:w-1/3 shrink-0">
                  <div 
                    className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm relative"
                    style={{ backgroundColor: isEditing ? formData.color : emp.color }}
                  >
                    <span className="text-white text-lg md:text-xl font-black">
                      {(isEditing ? formData.name : emp.name)?.[0]?.toUpperCase()}
                    </span>
                    {isEditing && (
                      <input 
                        type="color" 
                        value={formData.color} 
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={formData.name} 
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="border-2 border-gray-100 rounded-lg px-2 py-1 text-sm font-black focus:border-blue-500 outline-none uppercase w-full"
                          placeholder="NAME"
                        />
                        <select 
                          value={formData.role} 
                          onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                          className="border-2 border-gray-100 rounded-lg px-2 py-1 text-[10px] font-black outline-none bg-white uppercase tracking-widest w-full"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                        </select>
                        <div className="flex gap-2 mt-1">
                          <button 
                            onClick={() => handleFinalSave(emp.id)} 
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="text-gray-400 text-[9px] font-black uppercase tracking-widest px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-black text-gray-900 truncate text-sm md:text-lg tracking-tight uppercase leading-tight">{emp.name}</h3>
                        <div className="flex justify-between items-center pr-2 md:block md:pr-0">
                            <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block">{emp.role}</span>
                            <div className="flex md:hidden items-center gap-1 opacity-100">
                                <button onClick={() => handleEditClick(emp)} className="p-1 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                <button onClick={() => handleRemove(emp.id)} className="p-1 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        </div>
                        <div className="mt-2 hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => handleEditClick(emp)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-all" title="Edit Staff Member"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                           <button onClick={() => handleRemove(emp.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all" title="Remove Staff Member"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-2 md:mb-4">
                    <div className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Week Workload</div>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${weeklyHours > 40 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white shadow-md'}`}>
                       <span>{weeklyHours} Hrs</span>
                       {weeklyHours > 40 && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-1 md:pb-2 custom-scrollbar">
                    <div className="grid grid-cols-7 gap-1 min-w-[280px]">
                      {currentWeekDays.map(day => {
                        const dayShifts = weeklyShifts.filter(s => isSameDay(parseISO(s.date), day));
                        const isWorkDay = dayShifts.length > 0;
                        return (
                          <div key={day.toString()} className="flex flex-col gap-1">
                            <span className="text-[7px] md:text-[8px] font-black text-gray-300 uppercase text-center">{format(day, 'EEE')}</span>
                            <div className={`h-8 md:h-12 rounded-lg flex flex-col items-center justify-center border transition-all ${isWorkDay ? 'bg-blue-50 border-blue-100' : 'bg-gray-50/50 border-dashed border-gray-100'}`}>
                              {isWorkDay ? (
                                dayShifts.map(s => (
                                  <button 
                                    key={s.id} 
                                    onClick={() => onEditShift(s)}
                                    className="flex flex-col items-center hover:bg-blue-100 rounded p-0.5 transition-colors group/shift w-full"
                                    title="Click to edit shift"
                                  >
                                     <span className="text-[6px] md:text-[7px] font-black text-blue-700 leading-none">{getFormattedTime(s.startTime)}</span>
                                     <span className="text-[6px] md:text-[7px] font-bold text-blue-400 leading-none mt-0.5">{getFormattedTime(s.endTime)}</span>
                                  </button>
                                ))
                              ) : (
                                <span className="text-[6px] md:text-[7px] font-black text-gray-300 uppercase">OFF</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeManager;

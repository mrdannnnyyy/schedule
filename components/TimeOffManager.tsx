
import React, { useState } from 'react';
import { format, parseISO } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { Employee, TimeOffRequest, CurrentUser } from '../types';

interface Props {
  requests: TimeOffRequest[];
  employees: Employee[];
  currentUser: CurrentUser;
  onRequestSubmit: (request: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: 'approved' | 'denied') => void;
  onDeleteRequest: (id: string) => void;
}

const TimeOffManager: React.FC<Props> = ({ requests, employees, currentUser, onRequestSubmit, onUpdateStatus, onDeleteRequest }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const isAdmin = currentUser.role === 'admin';
  
  // Filter requests based on role
  const visibleRequests = isAdmin 
    ? requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : requests.filter(r => r.employeeId === currentUser.employeeId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) return;
    
    onRequestSubmit({
      employeeId: currentUser.employeeId!,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason
    });
    setIsCreating(false);
    setFormData({ startDate: '', endDate: '', reason: '' });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'denied': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Time Off Requests</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {isAdmin ? 'Manage approval queue' : 'Request and track your leave'}
          </p>
        </div>
        {!isAdmin && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Request
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Submit Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</label>
                <input 
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</label>
              <textarea 
                required
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500 resize-none"
                placeholder="Vacation, Appointment, etc..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {visibleRequests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No requests found</p>
          </div>
        )}

        {visibleRequests.map(req => {
          const emp = employees.find(e => e.id === req.employeeId);
          return (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-xl shadow-sm"
                  style={{ backgroundColor: emp?.color || '#ccc' }}
                >
                  {emp?.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-gray-900 uppercase">{emp?.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {format(parseISO(req.startDate), 'MMM d, yyyy')} — {format(parseISO(req.endDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">"{req.reason}"</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-4 md:mt-0">
                  {isAdmin && req.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-1 md:flex-none">
                      <button 
                        onClick={() => onUpdateStatus(req.id, 'denied')}
                        className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Deny
                      </button>
                      <button 
                        onClick={() => onUpdateStatus(req.id, 'approved')}
                        className="flex-1 md:flex-none px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  )}

                  {(isAdmin || req.employeeId === currentUser.employeeId) && (
                      <button 
                        onClick={() => onDeleteRequest(req.id)} 
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete Request"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                      </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeOffManager;

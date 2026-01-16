
import React, { useState } from 'react';
import { Employee, CurrentUser } from '../types';

interface Props {
  employees: Employee[];
  onLogin: (user: CurrentUser) => void;
  adminPassword: string;
}

const LoginScreen: React.FC<Props> = ({ employees, onLogin, adminPassword }) => {
  const [mode, setMode] = useState<'admin' | 'staff'>('staff');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'admin') {
      if (password === adminPassword) {
        onLogin({ role: 'admin' });
      } else {
        setError('Incorrect administrator password');
      }
    } else {
      if (!selectedStaffId) {
        setError('Please select your name');
        return;
      }
      onLogin({ role: 'staff', employeeId: selectedStaffId });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">ShiftMaster Pro</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Secure Schedule Access</p>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => { setMode('staff'); setError(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'staff' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Staff Access
            </button>
            <button 
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Admin Access
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {mode === 'staff' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Your Name</label>
                <div className="relative">
                  <select 
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all"
                  >
                    <option value="" disabled>Who are you?</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Admin Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:font-medium"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

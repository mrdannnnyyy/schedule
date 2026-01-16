
import React, { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  isToday,
  isSameWeek
} from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { Employee, Shift } from '../types';

interface Props {
  currentDate: Date;
  shifts: Shift[];
  employees: Employee[];
  onDayClick: (date: Date) => void;
  onCopyWeek?: (date: Date) => void;
  onPasteWeek?: (date: Date) => void;
  copiedWeekDate?: Date | null;
  currentUserRole?: string;
}

const MonthlyCalendar: React.FC<Props> = ({ 
  currentDate, 
  shifts, 
  employees, 
  onDayClick, 
  onCopyWeek, 
  onPasteWeek,
  copiedWeekDate,
  currentUserRole
}) => {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const chunks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      chunks.push(allDays.slice(i, i + 7));
    }
    return chunks;
  }, [currentDate]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header Grid: 60px control col + 7 day cols */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50/80 backdrop-blur sticky top-0 z-20">
          <div className="py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-r">
            Week
          </div>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Weeks Rows */}
        <div className="divide-y divide-gray-100">
          {weeks.map((weekDays, weekIdx) => {
            const weekStart = weekDays[0];
            const isCopiedWeek = copiedWeekDate && isSameWeek(weekStart, copiedWeekDate, { weekStartsOn: 0 });
            
            return (
              <div key={weekIdx} className="grid grid-cols-[60px_repeat(7,1fr)] group/week relative hover:bg-gray-50/30 transition-colors">
                
                {/* Control Column */}
                <div className="border-r bg-gray-50/20 flex flex-col items-center justify-center p-1 gap-2 sticky left-0 z-10">
                  {currentUserRole === 'admin' && (
                    <>
                      <button 
                        onClick={() => onCopyWeek?.(weekStart)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isCopiedWeek ? 'bg-purple-600 text-white shadow-md cursor-default' : 'bg-white border hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 text-gray-400'}`}
                        title="Copy Week"
                        disabled={!!isCopiedWeek}
                      >
                         {isCopiedWeek ? (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                         ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                         )}
                      </button>

                      {copiedWeekDate && !isCopiedWeek && (
                        <button 
                          onClick={() => onPasteWeek?.(weekStart)}
                          className="w-8 h-8 rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 flex items-center justify-center animate-in zoom-in duration-200"
                          title="Paste Week"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Days */}
                {weekDays.map(day => {
                   const dateStr = format(day, 'yyyy-MM-dd');
                   const dayShifts = shifts.filter(s => s.date === dateStr);
                   const isCurrentMonth = isSameMonth(day, currentDate);
                   
                   return (
                     <div 
                        key={day.toString()}
                        onClick={() => onDayClick(day)}
                        className={`min-h-[120px] p-2 border-r last:border-r-0 cursor-pointer hover:bg-white transition-all group relative ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : 'text-gray-900'}`}
                     >
                        <div className="flex justify-between items-start">
                          <span className={`text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full transition-colors ${isToday(day) ? 'bg-blue-600 text-white' : ''}`}>
                            {format(day, 'd')}
                          </span>
                          {dayShifts.length > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                              {dayShifts.length}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          {dayShifts.slice(0, 4).map(shift => {
                            const emp = employees.find(e => e.id === shift.employeeId);
                            if (!emp) return null;
                            return (
                              <div 
                                key={shift.id} 
                                className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate border shadow-sm bg-white"
                                style={{ 
                                  borderColor: `${emp.color}30`,
                                }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: emp.color }}></div>
                                <span className="truncate text-gray-700">{emp.name}</span>
                              </div>
                            );
                          })}
                          {dayShifts.length > 4 && (
                            <div className="text-[9px] text-gray-400 font-medium pl-1">
                              + {dayShifts.length - 4} more
                            </div>
                          )}
                        </div>
                     </div>
                   );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;

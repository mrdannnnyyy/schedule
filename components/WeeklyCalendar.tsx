
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { format, isSameDay } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { Employee, Shift } from '../types';
import { getWeekDays, getFormattedTime } from '../utils/helpers';

interface Props {
  currentDate: Date;
  shifts: Shift[];
  employees: Employee[];
  onEditShift: (shift: Shift) => void;
  onAddShift: (date: string, startTime?: string, endTime?: string) => void;
  onSaveShift: (shift: Shift) => void;
  onPasteShift: (date: string) => void;
  selectedEmployeeId: string;
  hasCopiedShift: boolean;
  readOnly?: boolean;
}

// Fixed range: 8 AM to 11 PM (23:00)
const START_HOUR = 8;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR); 
const SNAP_MINUTES = 30;

// Reduced padding for tighter density
const VERTICAL_PADDING = 12; 

// Memoized Shift Item Component for Performance
const ShiftItem = React.memo((props: {
  shift: Shift;
  employee: Employee;
  style: React.CSSProperties;
  isInteracting: boolean;
  readOnly: boolean;
  onMouseDown: (e: React.MouseEvent, shift: Shift, type: 'move' | 'resize-top' | 'resize-bottom') => void;
  onEdit: (shift: Shift) => void;
}) => {
  const { shift, employee, style, isInteracting, readOnly, onMouseDown, onEdit } = props;
  const duration = shift.hours;
  const isCompact = duration < 1.5;

  return (
      <div
        className={`shift-block absolute rounded-md shadow-sm transition-shadow overflow-hidden group z-10 select-none border border-white/20 flex flex-col 
          ${isInteracting ? 'opacity-90 shadow-xl scale-[1.01] cursor-grabbing ring-2 ring-blue-400 z-50' : readOnly ? '' : 'cursor-grab hover:shadow-md'}`}
        style={{
          ...style,
          backgroundColor: employee.color,
          margin: '1px',
        }}
        onMouseDown={(e) => onMouseDown(e, shift, 'move')}
        onDoubleClick={(e) => { 
          if (readOnly) return;
          e.stopPropagation(); 
          onEdit(shift); 
        }}
      >
        {/* Resizers */}
        {!readOnly && (
          <>
            <div className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20" onMouseDown={(e) => onMouseDown(e, shift, 'resize-top')} />
            <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20" onMouseDown={(e) => onMouseDown(e, shift, 'resize-bottom')} />
          </>
        )}

        {/* Content */}
        <div className="relative w-full h-full flex flex-col p-0.5 pointer-events-none">
          <div className="flex justify-start">
              <span className="text-[9px] font-black uppercase tracking-tight truncate drop-shadow-sm leading-none bg-black/20 px-1 py-0.5 rounded text-white mb-0.5 max-w-full">
                {employee.name}
              </span>
          </div>
          
          {!isCompact ? (
              <div className="flex flex-col items-start pl-0.5">
                 <div className="bg-white/80 backdrop-blur-sm rounded px-1 py-0.5 text-black shadow-sm flex flex-col gap-0 w-max max-w-full border border-white/40 leading-none">
                     <span className="text-[9px] font-bold tracking-tight">
                        {getFormattedTime(shift.startTime)}
                     </span>
                     <div className="opacity-40 -my-0.5 scale-75 origin-left">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                     </div>
                     <span className="text-[9px] font-bold tracking-tight">
                        {getFormattedTime(shift.endTime)}
                     </span>
                 </div>
              </div>
          ) : (
             <div className="flex items-center gap-1 mt-0 text-[8px] font-bold text-black bg-white/80 backdrop-blur-sm px-1 py-0.5 rounded leading-none w-max max-w-full shadow-sm ml-0.5 border border-white/40">
                <span>{getFormattedTime(shift.startTime)} - {getFormattedTime(shift.endTime)}</span>
             </div>
          )}

          <div className="absolute bottom-0.5 right-0.5">
             <span className="text-[7px] font-black bg-black/20 text-white backdrop-blur-md rounded px-1 py-0.5 uppercase tracking-tighter shadow-sm border border-white/10">
               {shift.hours}H
             </span>
          </div>
        </div>
      </div>
  );
}, (prev, next) => {
    return (
        prev.shift === next.shift && 
        prev.employee === next.employee &&
        prev.isInteracting === next.isInteracting && 
        (prev.style as any).top === (next.style as any).top &&
        (prev.style as any).height === (next.style as any).height &&
        (prev.style as any).left === (next.style as any).left &&
        (prev.style as any).width === (next.style as any).width &&
        prev.readOnly === next.readOnly
    );
});


const WeeklyCalendar: React.FC<Props> = ({ currentDate, shifts, employees, onEditShift, onAddShift, onSaveShift, onPasteShift, selectedEmployeeId, hasCopiedShift, readOnly = false }) => {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  // Interaction State
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragDay, setDragDay] = useState<string | null>(null);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [interactionType, setInteractionType] = useState<'move' | 'resize-top' | 'resize-bottom' | null>(null);
  const [interactionOffset, setInteractionOffset] = useState<number>(0);
  const [interactionInitialHours, setInteractionInitialHours] = useState<{start: number, end: number} | null>(null);
  const [tempShift, setTempShift] = useState<Shift | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredShifts = useMemo(() => {
    let result = selectedEmployeeId === 'all' ? shifts : shifts.filter(s => s.employeeId === selectedEmployeeId);
    if (tempShift) {
      result = result.map(s => s.id === tempShift.id ? tempShift : s);
    }
    return result;
  }, [shifts, selectedEmployeeId, tempShift]);

  const shiftsByDay = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      map[dateStr] = filteredShifts.filter(s => s.date === dateStr);
    });
    return map;
  }, [weekDays, filteredShifts]);

  const getHourFromY = (y: number, height: number) => {
    const usableHeight = height - (VERTICAL_PADDING * 2);
    const relativeY = y - VERTICAL_PADDING;
    const hourFloat = (relativeY / usableHeight) * TOTAL_HOURS + START_HOUR;
    const snapParts = 60 / SNAP_MINUTES;
    const hour = Math.round(hourFloat * snapParts) / snapParts;
    return Math.max(START_HOUR, Math.min(END_HOUR, hour));
  };

  const formatTimeFromHour = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h % 1) * 60);
    const safeHours = Math.min(Math.max(hours, 0), 23);
    const safeMins = Math.min(Math.max(mins, 0), 59);
    return `${safeHours.toString().padStart(2, '0')}:${safeMins.toString().padStart(2, '0')}`;
  };

  const handleMouseDownOnGrid = (dateStr: string, e: React.MouseEvent) => {
    if (readOnly) return;
    if ((e.target as HTMLElement).closest('.shift-block')) return;
    
    const container = gridRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = getHourFromY(y, rect.height);

    setIsSelecting(true);
    setDragDay(dateStr);
    setDragStartHour(hour);
    setDragCurrentHour(hour);
  };

  // useCallback to keep reference stable for memoized child
  const handleMouseDownOnShift = useCallback((e: React.MouseEvent, shift: Shift, type: 'move' | 'resize-top' | 'resize-bottom') => {
    if (readOnly) return;
    e.stopPropagation();
    setActiveShiftId(shift.id);
    setInteractionType(type);
    setTempShift(shift);
    
    // We need to access current ref, so we can't fully depend on empty array, 
    // but ref object itself is stable.
    const container = gridRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    const currentY = e.clientY - rect.top; 
    const currentHour = ((currentY - VERTICAL_PADDING) / (rect.height - VERTICAL_PADDING * 2)) * TOTAL_HOURS + START_HOUR;

    const startParts = shift.startTime.split(':').map(Number);
    const endParts = shift.endTime.split(':').map(Number);
    const startHour = startParts[0] + startParts[1] / 60;
    const endHour = endParts[0] + endParts[1] / 60;

    setInteractionInitialHours({ start: startHour, end: endHour });
    setInteractionOffset(currentHour - startHour);
  }, [readOnly]); // Dependencies

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = gridRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (isSelecting && dragDay) {
      const y = e.clientY - rect.top; 
      setDragCurrentHour(getHourFromY(y, rect.height));
      return;
    }

    if (activeShiftId && interactionType && interactionInitialHours && tempShift) {
      const y = e.clientY - rect.top;
      const currentHour = getHourFromY(y, rect.height);

      let newStart = interactionInitialHours.start;
      let newEnd = interactionInitialHours.end;

      if (interactionType === 'resize-top') {
        newStart = Math.min(currentHour, newEnd - 0.5);
      } else if (interactionType === 'resize-bottom') {
        newEnd = Math.max(currentHour, newStart + 0.5);
      } else if (interactionType === 'move') {
        const duration = interactionInitialHours.end - interactionInitialHours.start;
        newStart = currentHour - interactionOffset;
        newEnd = newStart + duration;
      }

      newStart = Math.max(START_HOUR, Math.min(END_HOUR - 0.5, newStart));
      newEnd = Math.max(newStart + 0.5, Math.min(END_HOUR, newEnd));

      const updatedShift: Shift = {
        ...tempShift,
        startTime: formatTimeFromHour(newStart),
        endTime: formatTimeFromHour(newEnd),
        hours: Number((newEnd - newStart).toFixed(2))
      };

      setTempShift(updatedShift);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isSelecting && dragDay && dragStartHour !== null && dragCurrentHour !== null) {
      const start = Math.min(dragStartHour, dragCurrentHour);
      const end = Math.max(dragStartHour, dragCurrentHour);
      if (end - start >= 0.5) {
        onAddShift(dragDay, formatTimeFromHour(start), formatTimeFromHour(end));
      } else if (dragStartHour === dragCurrentHour) {
        onAddShift(dragDay);
      }
    }
    
    if (activeShiftId && tempShift) {
       const original = shifts.find(s => s.id === tempShift.id);
       if (original) {
         const hasChanged = original.startTime !== tempShift.startTime || original.endTime !== tempShift.endTime;
         if (hasChanged) {
           onSaveShift(tempShift);
         }
       }
    }
    
    setIsSelecting(false);
    setDragDay(null);
    setDragStartHour(null);
    setDragCurrentHour(null);
    setActiveShiftId(null);
    setInteractionType(null);
    setInteractionInitialHours(null);
    setTempShift(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, dragDay, dragStartHour, dragCurrentHour, activeShiftId, interactionType, interactionInitialHours, tempShift, shifts]);

  const renderShiftsForDay = (dateStr: string) => {
    const dayShifts = [...shiftsByDay[dateStr]].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const columns: Shift[][] = [];
    dayShifts.forEach(shift => {
      let placed = false;
      for (const column of columns) {
        const lastInCol = column[column.length - 1];
        if (shift.startTime >= lastInCol.endTime) {
          column.push(shift);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([shift]);
    });

    return columns.map((col, colIdx) => {
      const width = 100 / columns.length;
      const left = colIdx * width;

      return col.map(shift => {
        const employee = employees.find(e => e.id === shift.employeeId);
        if (!employee) return null;

        const startParts = shift.startTime.split(':').map(Number);
        const endParts = shift.endTime.split(':').map(Number);
        const effectiveStart = startParts[0] + startParts[1] / 60;
        const effectiveEnd = endParts[0] + endParts[1] / 60;
        
        const topPercent = ((effectiveStart - START_HOUR) / TOTAL_HOURS) * 100;
        const heightPercent = ((effectiveEnd - effectiveStart) / TOTAL_HOURS) * 100;
        
        const isInteracting = activeShiftId === shift.id;

        return (
          <ShiftItem
            key={shift.id}
            shift={shift}
            employee={employee}
            style={{
              top: `calc((${topPercent} / 100) * (100% - ${VERTICAL_PADDING * 2}px) + ${VERTICAL_PADDING}px)`,
              height: `calc((${heightPercent} / 100) * (100% - ${VERTICAL_PADDING * 2}px))`,
              left: `${left}%`,
              width: `calc(${width}% - 4px)`
            }}
            isInteracting={isInteracting}
            readOnly={readOnly}
            onMouseDown={handleMouseDownOnShift}
            onEdit={onEditShift}
          />
        );
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0 print:border-none print:shadow-none">
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative custom-scrollbar print:overflow-visible"
        onMouseMove={handleMouseMove}
      >
        <div className="min-w-[800px] min-h-[600px] flex flex-col relative print:min-w-0 print:w-full print:min-h-0 print:h-auto">
          
          {/* Header Row (Sticky Top) */}
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b-2 border-gray-200 z-40 sticky top-0 shadow-sm shrink-0 print:static print:shadow-none print:border-b-2 print:border-black bg-white">
            {/* Top-Left Corner */}
            <div className="border-r-2 border-gray-400 bg-white sticky left-0 z-50 flex items-center justify-center print:static print:border-black">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full print:hidden"></div>
            </div>
            
            {weekDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isAlternate = index % 2 === 1;
              return (
                <div 
                  key={day.toString()} 
                  className={`flex flex-col items-center justify-center border-r-2 border-gray-400 last:border-r-0 relative group py-1 print:border-black ${isAlternate ? 'bg-slate-50' : 'bg-white'}`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-400'} print:text-black`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-sm font-black mt-0.5 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'} print:text-black`}>
                    {format(day, 'd')}
                  </span>
                  
                  {!readOnly && hasCopiedShift && (
                    <button 
                      onClick={() => onPasteShift(dateStr)}
                      className="absolute inset-y-1 right-1 px-2 bg-blue-600 text-white rounded-md flex items-center gap-1 hover:bg-blue-700 transition-all shadow-md animate-in fade-in zoom-in duration-200 z-50 print:hidden"
                      title="Paste Copied Shift"
                    >
                      <span className="text-[9px] font-black tracking-tighter">PASTE</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Main Grid Content */}
          <div className="flex-1 relative flex flex-col min-h-0 mb-24">
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] relative grid-container flex-1" ref={gridRef}>
              
              {/* Vertical Time Labels Column (Sticky Left) */}
              <div className="border-r-2 border-gray-400 bg-white sticky left-0 z-30 h-full relative shadow-[4px_0_10px_rgba(0,0,0,0.02)] print:static print:shadow-none print:border-black" style={{ padding: `${VERTICAL_PADDING}px 0` }}>
                <div className="relative h-full flex flex-col items-center">
                  {HOURS.map((hour, idx) => {
                    const topPercent = (idx / TOTAL_HOURS) * 100;
                    return (
                      <div 
                        key={hour} 
                        className="absolute left-0 right-0 flex items-center justify-center" 
                        style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
                      >
                        <span className="text-[9px] font-bold text-gray-400 bg-white/80 px-1 py-0.5 rounded border border-gray-100/50 whitespace-nowrap scale-90 print:border-none print:text-black print:text-[8px]">
                          {hour > 12 ? `${hour - 12}P` : hour === 12 ? '12P' : `${hour}A`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Columns */}
              {weekDays.map((day, index) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isActiveDragDay = isSelecting && dragDay === dateStr;
                const dragStartHourVal = isActiveDragDay && dragStartHour !== null && dragCurrentHour !== null ? Math.min(dragStartHour, dragCurrentHour) : 0;
                const dragEndHourVal = isActiveDragDay && dragStartHour !== null && dragCurrentHour !== null ? Math.max(dragStartHour, dragCurrentHour) : 0;
                
                const dragTopPercent = ((dragStartHourVal - START_HOUR) / TOTAL_HOURS) * 100;
                const dragHeightPercent = ((dragEndHourVal - dragStartHourVal) / TOTAL_HOURS) * 100;

                const isAlternate = index % 2 === 1;

                return (
                  <div 
                    key={dateStr} 
                    className={`relative border-r-2 border-gray-400 last:border-r-0 transition-colors group h-full flex flex-col print:border-black
                      ${readOnly ? '' : 'hover:bg-blue-50/20 cursor-crosshair'}
                      ${isAlternate ? 'bg-slate-50' : 'bg-white'}
                    `}
                    onMouseDown={(e) => handleMouseDownOnGrid(dateStr, e)}
                  >
                    {/* Visual Grid Lines */}
                    <div className="flex-1 relative" style={{ padding: `${VERTICAL_PADDING}px 0` }}>
                      <div className="relative h-full">
                        {HOURS.slice(0, -1).map((_, i) => (
                          <div key={i} className="border-b border-gray-200 pointer-events-none print:border-gray-300" style={{ height: `${100 / TOTAL_HOURS}%` }}></div>
                        ))}
                        <div className="border-b border-gray-200 pointer-events-none absolute bottom-0 left-0 right-0 print:border-gray-300"></div>
                      </div>

                      {/* Drag Indicator */}
                      {isActiveDragDay && dragHeightPercent > 0.1 && (
                        <div 
                          className="absolute left-0 right-0 bg-blue-600/20 border-2 border-blue-600/40 rounded-lg z-20 pointer-events-none flex items-center justify-center shadow-inner"
                          style={{ 
                            top: `calc((${dragTopPercent} / 100) * (100% - ${VERTICAL_PADDING * 2}px) + ${VERTICAL_PADDING}px)`, 
                            height: `calc((${dragHeightPercent} / 100) * (100% - ${VERTICAL_PADDING * 2}px))`
                          }}
                        >
                          <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl shadow-2xl flex flex-col items-center border border-blue-100">
                            <span className="text-[11px] font-black text-blue-700 uppercase tracking-tighter">
                              {getFormattedTime(formatTimeFromHour(dragStartHourVal))} - {getFormattedTime(formatTimeFromHour(dragEndHourVal))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Shifts Layer */}
                    <div className="absolute inset-0 pointer-events-none h-full w-full">
                      <div className="relative h-full w-full pointer-events-auto">
                        {renderShiftsForDay(dateStr)}
                      </div>
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
};

export default WeeklyCalendar;
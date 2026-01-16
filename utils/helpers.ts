
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, differenceInMinutes, parse } from 'https://cdn.jsdelivr.net/npm/date-fns@3.6.0/+esm';
import { Shift } from '../types';

/**
 * Calculates total decimal hours between two HH:mm strings.
 */
export const calculateShiftHours = (start: string, end: string): number => {
  try {
    const startTime = parse(start, 'HH:mm', new Date());
    const endTime = parse(end, 'HH:mm', new Date());
    let diff = differenceInMinutes(endTime, startTime);
    if (diff < 0) diff += 1440; // Handle wraps for midnight shifts
    return parseFloat((diff / 60).toFixed(2));
  } catch (e) {
    return 0;
  }
};

/**
 * Snaps a time string (HH:mm) to the nearest 30-minute increment.
 * Essential for keeping selects in sync with the grid.
 */
export const snapTo30Min = (timeStr: string): string => {
  try {
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    let mins = parseInt(parts[1], 10);
    
    // Simple rounding to nearest 30
    mins = Math.round(mins / 30) * 30;
    if (mins === 60) {
      mins = 0;
      hours += 1;
    }
    if (hours === 24) hours = 23; // Constrain to same day
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  } catch (e) {
    return timeStr;
  }
};

export const normalizeTimeInput = (input: string): string => {
  const clean = input.trim().toLowerCase();
  if (!clean) return "09:00";
  if (/^\d{2}:\d{2}$/.test(clean)) return clean;
  
  const match = clean.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  return "09:00";
};

export const getWeekDays = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
};

export const getFormattedTime = (timeStr: string) => {
  try {
    if (!timeStr) return '';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const date = parse(timeStr, 'HH:mm', new Date());
    return format(date, 'h:mm a');
  } catch (e) {
    return timeStr;
  }
};

export const checkOverlap = (shifts: Shift[], newShift: Partial<Shift>): boolean => {
  if (!newShift.employeeId || !newShift.date || !newShift.startTime || !newShift.endTime) return false;
  const employeeShifts = shifts.filter(s => s.employeeId === newShift.employeeId && s.date === newShift.date && s.id !== newShift.id);
  try {
    const nStart = parse(newShift.startTime, 'HH:mm', new Date()).getTime();
    const nEnd = parse(newShift.endTime, 'HH:mm', new Date()).getTime();
    return employeeShifts.some(s => {
      const sStart = parse(s.startTime, 'HH:mm', new Date()).getTime();
      const sEnd = parse(s.endTime, 'HH:mm', new Date()).getTime();
      return (nStart < sEnd && nEnd > sStart);
    });
  } catch (e) {
    return false;
  }
};

export const getLuminance = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

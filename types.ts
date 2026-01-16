
export type Role = 'Manager' | 'Cashier' | 'Stock' | 'Sales' | 'Other';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  color: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // ISO format YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export type ViewType = 'weekly' | 'monthly' | 'employees' | 'requests';

export type UserRole = 'admin' | 'staff';

export interface CurrentUser {
  role: UserRole;
  employeeId?: string; // If staff
}

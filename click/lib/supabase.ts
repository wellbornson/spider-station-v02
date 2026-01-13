// Define types for dashboard data
export interface UserData {
  serial_no: number;
  cabin_no: string;
  name: string;
  time_in: string;
  time_out: string;
  amount: number;
  date: string;
  is_locked: boolean;
}

export interface DashboardData {
  id?: number;
  date: string; // ISO string for indexing
  data: any; // Serialized dashboard data
  user_data?: UserData[]; // Extracted user data for easier querying
  synced_at?: string; // Timestamp when last synced
  created_at?: string; // Timestamp when created
  updated_at?: string; // Timestamp when last updated
  sync_status?: 'pending' | 'synced' | 'failed' | null; // Sync status (allowing null for force reset)
}

// Function to check if device is online
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};
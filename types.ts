
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface LaunchUpdate {
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'warning';
}

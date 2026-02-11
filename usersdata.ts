
export interface UserRecord {
  id: string;
  name: string;
  progress: number;
  missionName: string;
  status: string;
  // Lightweight metadata (avoid IP / accounts)
  device?: string;
  os?: string;
  browser?: string;
  platform?: string;
  lastActive?: string;
}

const STORAGE_KEY = 'usersdata_file_sim';

const defaultData: UserRecord[] = [
  {
    id: 'default_user',
    name: 'Yash',
    progress: 78,
    missionName: '10th SSC Exam',
    status: 'Final countdown initiated · Revision cycles optimized',
    device: 'Initializing...',
    os: 'Initializing...',
    browser: 'Initializing...',
    platform: 'Initializing...',
    lastActive: new Date().toISOString()
  }
];

export const getUsersData = (): UserRecord[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(saved);
};

export const saveUsersData = (data: UserRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getCurrentUser = (): UserRecord => {
  return getUsersData()[0];
};

export const updateCurrentUser = (updates: Partial<UserRecord>): UserRecord => {
  const data = getUsersData();
  data[0] = { ...data[0], ...updates, lastActive: new Date().toISOString() };
  saveUsersData(data);
  return data[0];
};

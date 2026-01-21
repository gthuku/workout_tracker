import type {
  Exercise,
  Workout,
  WorkoutSet,
  DashboardData,
  ExerciseHistory,
  PersonalRecord,
  MuscleGroupVolume,
  MuscleGroup,
  Equipment,
  User,
  UserProfile,
} from '../types';

// Raw API response types (snake_case from server)
export interface RawWorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration?: number;
  created_at: string;
  exercise_name?: string;
  primaryMuscles?: MuscleGroup[];
  isPR?: boolean; // Server-calculated PR status
}

export interface RawWorkout {
  id: string;
  user_id: string;
  date: string;
  name?: string;
  duration?: number;
  notes?: string;
  is_complete: boolean;
  created_at: string;
  sets?: RawWorkoutSet[];
  isComplete?: boolean; // Sometimes mapped
}

const BASE_URL = '';

// Get current user ID from localStorage
function getCurrentUserId(): string | null {
  return localStorage.getItem('selectedProfileId');
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const userId = getCurrentUserId();
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Profile API
export const profileApi = {
  list: () => fetchJson<User[]>('/api/profiles'),
  create: (username: string, displayName?: string) =>
    fetchJson<User>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ username, displayName }),
    }),
  delete: (id: string) =>
    fetchJson(`/api/profiles/${id}`, { method: 'DELETE' }),
};

// Auth API
export const authApi = {
  register: (data: { username: string; email?: string; password: string; displayName?: string }) =>
    fetchJson<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (username: string, password: string) =>
    fetchJson<User & { needsPassword?: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  setPassword: (userId: string, password: string) =>
    fetchJson<{ success: boolean }>('/api/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
  updateEmail: (email: string) =>
    fetchJson<{ success: boolean }>('/api/auth/email', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchJson<{ success: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// User API
export const userApi = {
  get: () => fetchJson<User>('/api/user'),
  update: (data: Partial<User>) =>
    fetchJson<User>('/api/user', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updateProfile: (data: Partial<UserProfile>) =>
    fetchJson<User>('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Exercise API
export const exerciseApi = {
  list: (params?: { search?: string; muscleGroup?: MuscleGroup; equipment?: Equipment }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.muscleGroup) searchParams.set('muscleGroup', params.muscleGroup);
    if (params?.equipment) searchParams.set('equipment', params.equipment);
    const query = searchParams.toString();
    return fetchJson<Exercise[]>(`/api/exercises${query ? `?${query}` : ''}`);
  },
  create: (data: { name: string; primaryMuscles: MuscleGroup[]; equipment: Equipment }) =>
    fetchJson<Exercise>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHistory: (exerciseId: string, weeks = 8) =>
    fetchJson<ExerciseHistory>(`/api/exercises/${exerciseId}/history?weeks=${weeks}`),
  getPrevious: (exerciseId: string) =>
    fetchJson<{ date?: string; sets: WorkoutSet[] }>(`/api/exercises/${exerciseId}/previous`),
};

// Workout API
export const workoutApi = {
  list: (limit = 10, includeIncomplete = false) =>
    fetchJson<RawWorkout[]>(`/api/workouts?limit=${limit}&includeIncomplete=${includeIncomplete}`),
  getActive: () =>
    fetchJson<(RawWorkout & { sets: RawWorkoutSet[] }) | null>(
      '/api/workouts/active'
    ),
  get: (id: string) =>
    fetchJson<RawWorkout & { sets: RawWorkoutSet[] }>(
      `/api/workouts/${id}`
    ),
  create: (data?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) =>
    fetchJson<Workout & { sets: [] }>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  update: (id: string, data: Partial<{ name: string; notes: string; isComplete: boolean; duration: number }>) =>
    fetchJson<Workout>(`/api/workouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson(`/api/workouts/${id}`, { method: 'DELETE' }),
  clearAll: () =>
    fetchJson('/api/workouts', { method: 'DELETE' }),
};

// Workout Set API
export const setApi = {
  create: (workoutId: string, data: { exerciseId: string; setNumber: number; reps?: number; weight?: number; duration?: number }) =>
    fetchJson<RawWorkoutSet>(`/api/workouts/${workoutId}/sets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { reps: number; weight: number }) =>
    fetchJson<RawWorkoutSet>(`/api/sets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson(`/api/sets/${id}`, { method: 'DELETE' }),
};

// Personal Records API
export const prApi = {
  list: (limit = 5) =>
    fetchJson<(PersonalRecord & { exerciseName: string })[]>(`/personal-records?limit=${limit}`),
};

// Dashboard API
export const dashboardApi = {
  get: () => fetchJson<DashboardData>('/api/dashboard'),
  getMuscleGroups: (period: 'week' | 'month' = 'week') =>
    fetchJson<{ muscleGroups: MuscleGroupVolume[]; imbalances: { warning: string; muscleGroup1: string; muscleGroup2: string }[] }>(
      `/api/stats/muscle-groups?period=${period}`
    ),
};

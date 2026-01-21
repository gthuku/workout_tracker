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
  reps: number;
  weight: number;
  created_at: string;
  exercise_name?: string;
  primaryMuscles?: MuscleGroup[];
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

const BASE_URL = '/api';

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
  list: () => fetchJson<User[]>('/profiles'),
  create: (username: string, displayName?: string) =>
    fetchJson<User>('/profiles', {
      method: 'POST',
      body: JSON.stringify({ username, displayName }),
    }),
  delete: (id: string) =>
    fetchJson(`/profiles/${id}`, { method: 'DELETE' }),
};

// Auth API
export const authApi = {
  register: (data: { username: string; email?: string; password: string; displayName?: string }) =>
    fetchJson<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (username: string, password: string) =>
    fetchJson<User & { needsPassword?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  setPassword: (userId: string, password: string) =>
    fetchJson<{ success: boolean }>('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    }),
  updateEmail: (email: string) =>
    fetchJson<{ success: boolean }>('/auth/email', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchJson<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// User API
export const userApi = {
  get: () => fetchJson<User>('/user'),
  updateUnit: (preferredUnit: 'kg' | 'lbs') =>
    fetchJson('/user', {
      method: 'PATCH',
      body: JSON.stringify({ preferredUnit }),
    }),
  updateProfile: (profile: UserProfile) =>
    fetchJson<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
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
    return fetchJson<Exercise[]>(`/exercises${query ? `?${query}` : ''}`);
  },
  create: (data: { name: string; primaryMuscles: MuscleGroup[]; equipment: Equipment }) =>
    fetchJson<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getHistory: (exerciseId: string, weeks = 8) =>
    fetchJson<ExerciseHistory>(`/exercises/${exerciseId}/history?weeks=${weeks}`),
  getPrevious: (exerciseId: string) =>
    fetchJson<{ date?: string; sets: WorkoutSet[] }>(`/exercises/${exerciseId}/previous`),
};

// Workout API
export const workoutApi = {
  list: (limit = 10, includeIncomplete = false) =>
    fetchJson<RawWorkout[]>(`/workouts?limit=${limit}&includeIncomplete=${includeIncomplete}`),
  getActive: () =>
    fetchJson<(RawWorkout & { sets: RawWorkoutSet[] }) | null>(
      '/workouts/active'
    ),
  get: (id: string) =>
    fetchJson<RawWorkout & { sets: RawWorkoutSet[] }>(
      `/workouts/${id}`
    ),
  create: (data?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) =>
    fetchJson<Workout & { sets: [] }>('/workouts', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  update: (id: string, data: Partial<{ name: string; notes: string; isComplete: boolean; duration: number }>) =>
    fetchJson<Workout>(`/workouts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson(`/workouts/${id}`, { method: 'DELETE' }),
  clearAll: () =>
    fetchJson('/workouts', { method: 'DELETE' }),
};

// Workout Set API
export const setApi = {
  create: (workoutId: string, data: { exerciseId: string; setNumber: number; reps: number; weight: number }) =>
    fetchJson<RawWorkoutSet>(`/workouts/${workoutId}/sets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { reps: number; weight: number }) =>
    fetchJson<RawWorkoutSet>(`/sets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchJson(`/sets/${id}`, { method: 'DELETE' }),
};

// Personal Records API
export const prApi = {
  list: (limit = 5) =>
    fetchJson<(PersonalRecord & { exerciseName: string })[]>(`/personal-records?limit=${limit}`),
};

// Dashboard API
export const dashboardApi = {
  get: () => fetchJson<DashboardData>('/dashboard'),
  getMuscleGroups: (period: 'week' | 'month' = 'week') =>
    fetchJson<{ muscleGroups: MuscleGroupVolume[]; imbalances: { warning: string; muscleGroup1: string; muscleGroup2: string }[] }>(
      `/stats/muscle-groups?period=${period}`
    ),
};

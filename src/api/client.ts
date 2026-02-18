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
  PRTrends,
  PRTrendType,
  Squad,
  SquadDashboard,
  SquadInvite,
  SquadUserSearchResult,
  ReactionType,
  SquadWorkout,
  ProgressCheckin,
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
  equipment?: Equipment;
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
  // Optional camelCase variants (for API response compatibility)
  userId?: string;
  isComplete?: boolean;
  createdAt?: string;
}

// Use empty BASE_URL in dev to leverage Vite's proxy (avoids CORS issues)
const BASE_URL = '';

// Token storage keys
const TOKEN_KEY = 'authToken';
const USER_ID_KEY = 'selectedProfileId';

// Get JWT token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Set JWT token in localStorage
function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Clear JWT token from localStorage
function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Get current user ID from localStorage (backward compatibility)
function getCurrentUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

// Set current user ID (backward compatibility)
function setCurrentUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

// Clear current user ID
function clearCurrentUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

// Clear all auth data (for logout)
function clearAuth(): void {
  clearAuthToken();
  clearCurrentUserId();
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const userId = getCurrentUserId();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Prefer JWT token if available, fall back to X-User-Id for backward compatibility
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  } else if (userId) {
    (headers as Record<string, string>)['X-User-Id'] = userId;
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    // Handle 401 Unauthorized - clear invalid auth
    if (response.status === 401) {
      clearAuth();
      // Don't redirect here - let the calling component handle it
      // This prevents blank screen issues during redirect
    }

    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Most commonly indicates the SPA HTML was served instead of the API response (e.g. misrouting / 403/404 rewrite).
    const text = await response.text().catch(() => '');
    const looksLikeHtml = text.trim().startsWith('<!doctype') || text.trim().startsWith('<html');
    const hint = looksLikeHtml ? ' (received HTML)' : '';
    throw new Error(`Unexpected response format from API${hint}. Please try again.`);
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

// Auth response types
interface AuthResponse extends User {
  token?: string;
  needsPassword?: boolean;
}

interface ResetRequestResponse {
  success: boolean;
  message: string;
  resetToken?: string; // Only in development
  expiresIn?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
  displayName: string;
  token?: string;
}

// Auth API
export const authApi = {
  register: async (data: { username: string; email?: string; password: string; displayName?: string }) => {
    const response = await fetchJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Store token if provided
    if (response.token) {
      setAuthToken(response.token);
      setCurrentUserId(response.id);
    }
    return response;
  },

  login: async (username: string, password: string) => {
    const response = await fetchJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    // Store token if provided
    if (response.token) {
      setAuthToken(response.token);
      setCurrentUserId(response.id);
    }
    return response;
  },

  verify: () =>
    fetchJson<User & { valid: boolean }>('/api/auth/verify'),

  setPassword: async (password: string) => {
    const response = await fetchJson<{ success: boolean; token?: string }>('/api/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    // Update token if provided
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  updateEmail: (email: string | null) =>
    fetchJson<{ success: boolean }>('/api/auth/email', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    }),

  updateUsername: async (username: string) => {
    const response = await fetchJson<{ success: boolean; token?: string }>('/api/auth/username', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await fetchJson<{ success: boolean; token?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    // Update token if provided
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  // Request password reset - returns token in development
  requestReset: (username: string) =>
    fetchJson<ResetRequestResponse>('/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  // Reset password with token
  resetPassword: async (token: string, newPassword: string) => {
    const response = await fetchJson<ResetPasswordResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    // Store token if provided (for immediate login)
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  // Logout - clear all auth data
  logout: () => {
    clearAuth();
  },
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
      method: 'PUT',
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
  delete: (exerciseId: string) =>
    fetchJson<{ success: boolean }>(`/api/exercises/${exerciseId}`, { method: 'DELETE' }),
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
  update: (id: string, data: Partial<{ name: string; date: string; notes: string; isComplete: boolean; duration: number }>) =>
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
    fetchJson<(PersonalRecord & { exerciseName: string })[]>(`/api/personal-records?limit=${limit}`),
  getTrends: (exerciseId: string, type: PRTrendType = 'max_weight', weeks = 52) =>
    fetchJson<PRTrends>(`/api/exercises/${exerciseId}/pr-trends?type=${type}&weeks=${weeks}`),
};

// Dashboard API
export const dashboardApi = {
  get: () => fetchJson<DashboardData>('/api/dashboard'),
  getMuscleGroups: (period: 'week' | 'month' = 'week') =>
    fetchJson<{ muscleGroups: MuscleGroupVolume[]; imbalances: { warning: string; muscleGroup1: string; muscleGroup2: string }[] }>(
      `/api/stats/muscle-groups?period=${period}`
    ),
};

// Progress Check-in API
export const progressApi = {
  list: () => fetchJson<ProgressCheckin[]>('/api/progress-checkins'),
  create: (data: { photos: string[]; weight: number; waist?: number; note?: string }) =>
    fetchJson<ProgressCheckin>('/api/progress-checkins', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }),
};

// Push Notification API
export const pushApi = {
  getPublicKey: () =>
    fetchJson<{ enabled: boolean; publicKey: string | null }>('/api/push/public-key'),
  saveSubscription: (subscription: PushSubscriptionJSON) =>
    fetchJson<{ success: boolean }>('/api/push/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        subscription,
        userAgent: navigator.userAgent,
      }),
    }),
  removeSubscription: (endpoint: string) =>
    fetchJson<{ success: boolean }>('/api/push/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }),
  scheduleRestTimerNotification: (data: { timerId: string; dueAt: number; title?: string; body?: string }) =>
    fetchJson<{ success: boolean; timerId: string }>('/api/push/rest-timers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelRestTimerNotification: (timerId: string) =>
    fetchJson<{ success: boolean }>(`/api/push/rest-timers/${timerId}`, {
      method: 'DELETE',
    }),
};

// Squad API
export const squadApi = {
  list: () => fetchJson<Squad[]>('/api/squads'),
  create: (name: string) =>
    fetchJson<Squad>('/api/squads', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getDashboard: (squadId: string, period?: 'today' | 'week', date?: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const params = new URLSearchParams();
    if (timezone) params.set('timezone', timezone);
    if (period) params.set('period', period);
    if (date) params.set('date', date);
    const query = params.toString();
    return fetchJson<SquadDashboard>(`/api/squads/${squadId}/dashboard${query ? `?${query}` : ''}`);
  },
  getWorkout: (workoutId: string) =>
    fetchJson<SquadWorkout>(`/api/squads/workouts/${workoutId}`),
  leave: (squadId: string) =>
    fetchJson<{ success: boolean; deleted: boolean }>(`/api/squads/${squadId}/leave`, {
      method: 'DELETE',
    }),
  inviteUser: (squadId: string, userId: string) =>
    fetchJson<{ id: string; squadId: string; invitedUserId: string; status: string }>(
      `/api/squads/${squadId}/invite`,
      { method: 'POST', body: JSON.stringify({ userId }) }
    ),
  joinByCode: (code: string) =>
    fetchJson<{ id: string; name: string; inviteCode: string }>('/api/squads/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  listInvites: () => fetchJson<SquadInvite[]>('/api/squads/invites'),
  respondToInvite: (inviteId: string, accept: boolean) =>
    fetchJson<{ success: boolean; accepted: boolean }>(`/api/squads/invites/${inviteId}`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),
  addReaction: (workoutId: string, reactionType: ReactionType, memeUrl?: string) =>
    fetchJson<{ success: boolean }>('/api/squads/reactions', {
      method: 'POST',
      body: JSON.stringify({ workoutId, reactionType, memeUrl }),
    }),
  removeReaction: (workoutId: string, reactionType: ReactionType, memeUrl?: string) =>
    fetchJson<{ success: boolean }>('/api/squads/reactions', {
      method: 'DELETE',
      body: JSON.stringify({ workoutId, reactionType, memeUrl }),
    }),
  searchUsers: (query: string, excludeSquadId?: string) => {
    const params = new URLSearchParams({ q: query });
    if (excludeSquadId) params.set('excludeSquadId', excludeSquadId);
    return fetchJson<SquadUserSearchResult[]>(`/api/squads/users/search?${params}`);
  },
  createChallenge: (squadId: string, data: { exerciseId: string; targetSets: number; targetReps: number; targetWeight?: number; deadline: string }) =>
    fetchJson<{ id: string }>(`/api/squads/${squadId}/challenges`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  completeChallenge: (challengeId: string) =>
    fetchJson<{ success: boolean }>(`/api/squads/challenges/${challengeId}/complete`, {
      method: 'POST',
    }),
  deleteChallenge: (challengeId: string) =>
    fetchJson<{ success: boolean }>(`/api/squads/challenges/${challengeId}`, {
      method: 'DELETE',
    }),
};

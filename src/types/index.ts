export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Cardio';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Bodyweight'
  | 'Cable'
  | 'Cardio';

export type WeightUnit = 'kg' | 'lbs';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type Gender = 'male' | 'female';

export interface User {
  id: string;
  username: string;
  email?: string;
  preferredUnit: WeightUnit;
  createdAt: string;
  // Profile fields
  displayName?: string;
  age?: number;
  heightFeet?: number;
  heightInches?: number;
  bodyWeight?: number;
  fitnessGoal?: string[];
  experienceLevel?: ExperienceLevel;
  gender?: Gender;
  bio?: string;
  avatar?: string;
}

export interface UserProfile {
  displayName?: string;
  age?: number;
  heightFeet?: number;
  heightInches?: number;
  bodyWeight?: number;
  fitnessGoal?: string[];
  experienceLevel?: ExperienceLevel;
  gender?: Gender;
  bio?: string;
  avatar?: string;
  preferredUnit: WeightUnit;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  equipment: Equipment;
  isCustom: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  name?: string;
  duration?: number;
  notes?: string;
  isComplete: boolean;
  createdAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  createdAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  type: 'max_weight' | 'max_volume' | 'max_reps';
  value: number;
  workoutId: string;
  achievedAt: string;
}

// Calculated/derived types
export interface ExerciseWithSets {
  exercise: Exercise;
  sets: WorkoutSet[];
  previousSets?: WorkoutSet[];
  totalVolume: number;
  previousVolume?: number;
}

export interface WorkoutWithExercises extends Workout {
  exercises: ExerciseWithSets[];
}

export interface MuscleGroupVolume {
  muscleGroup: MuscleGroup;
  volume: number;
  sets: number;
  percentage: number;
}

export interface ProgressionIndicator {
  type: 'up' | 'same' | 'down';
  percentage: number;
}

export interface ExerciseHistory {
  exerciseId: string;
  sessions: {
    date: string;
    sets: WorkoutSet[];
    totalVolume: number;
    maxWeight: number;
    totalReps: number;
  }[];
}

export interface WeeklyStats {
  workoutCount: number;
  totalVolume: number;
  muscleGroupVolumes: MuscleGroupVolume[];
  streak: number;
}

export interface DashboardData {
  streak: number;
  weeklyWorkoutCount: number;
  recentWorkouts: Workout[];
  recentPRs: (PersonalRecord & { exerciseName: string })[];
  weeklyMuscleGroups: MuscleGroupVolume[];
}

// Squad types
export type ReactionType = 'fire' | 'clap' | 'eyes';

export interface Squad {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

export interface SquadFeedItem {
  userId: string;
  displayName: string;
  avatar: string | null;
  status: 'done' | 'in_progress' | 'not_started';
  activity: string;
  workoutId: string | null;
  reactions: { fire: number; clap: number; eyes: number };
  hasUserReacted: { fire: boolean; clap: boolean; eyes: boolean };
  timestamp: string;
}

export interface SquadDashboard {
  squad: {
    id: string;
    name: string;
    inviteCode: string;
    createdBy: string;
  };
  dailyProgress: { completed: number; total: number; percentage: number };
  feed: SquadFeedItem[];
}

export interface SquadInvite {
  id: string;
  squadId: string;
  squadName: string;
  invitedBy: string;
  inviterName: string;
  status: string;
  createdAt: string;
}

export interface SquadUserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

export interface SquadWorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  createdAt: string;
  exerciseName: string;
  primaryMuscles: MuscleGroup[];
  equipment: string;
}

export interface SquadWorkout {
  id: string;
  userId: string;
  ownerName: string;
  name: string | null;
  date: string;
  duration: number | null;
  notes: string | null;
  isComplete: boolean;
  createdAt: string;
  sets: SquadWorkoutSet[];
}

export type PRTrendType = 'max_weight' | 'max_volume' | 'max_reps';

export interface PRTrendPoint {
  date: string;
  value: number;
  isNewPR: boolean;
}

export interface PRTrends {
  exerciseId: string;
  type: PRTrendType;
  currentPR: number;
  trends: PRTrendPoint[];
}

import { z } from 'zod';

// Enums
export const EquipmentEnum = z.enum(['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio']);
export const MuscleGroupEnum = z.enum(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio']);
export const ExperienceLevelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
export const WeightUnitEnum = z.enum(['kg', 'lbs']);

// Auth schemas
export const RegisterSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
  email: z.string().email().max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const SetPasswordSchema = z.object({
  password: z.string().min(6).max(100),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const RequestResetSchema = z.object({
  username: z.string().min(1),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const UpdateEmailSchema = z.object({
  email: z.string().email().max(100).nullable().optional(),
});

export const UpdateUsernameSchema = z.object({
  username: z.string().trim().min(2).max(50),
});

// User schemas
export const CreateProfileSchema = z.object({
  username: z.string().min(2).max(50),
  displayName: z.string().min(1).max(100).optional(),
});

export const UpdateUserSchema = z.object({
  preferredUnit: WeightUnitEnum.optional(),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().max(100).nullable().optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  heightFeet: z.number().int().min(3).max(8).nullable().optional(),
  heightInches: z.number().int().min(0).max(11).nullable().optional(),
  bodyWeight: z.number().min(50).max(500).nullable().optional(),
  fitnessGoal: z.array(z.string()).nullable().optional(),
  experienceLevel: ExperienceLevelEnum.nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  preferredUnit: WeightUnitEnum.optional(),
  avatar: z.string().nullable().optional(),
});

// Exercise schemas
export const CreateExerciseSchema = z.object({
  name: z.string().min(2).max(100),
  primaryMuscles: z.array(MuscleGroupEnum).min(1).max(3),
  equipment: EquipmentEnum,
});

export const ExerciseQuerySchema = z.object({
  search: z.string().optional(),
  muscleGroup: MuscleGroupEnum.optional(),
  equipment: EquipmentEnum.optional(),
});

// Workout schemas
export const CreateWorkoutSchema = z.object({
  name: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  duration: z.number().int().min(1).max(600).optional(),
  isComplete: z.boolean().optional(),
});

export const UpdateWorkoutSchema = z.object({
  name: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
  isComplete: z.boolean().optional(),
  duration: z.number().int().min(1).max(600).optional(),
  photos: z.array(z.string().min(1).max(1_500_000)).max(5).optional(),
});

// Workout set schemas
export const CreateSetSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(999).optional(),
  weight: z.number().min(0).max(9999).optional(),
  duration: z.number().int().min(1).max(999).optional(),
});

export const UpdateSetSchema = z.object({
  reps: z.number().int().min(1).max(999),
  weight: z.number().min(0).max(9999),
});

// Query schemas
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const WorkoutQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  includeIncomplete: z.enum(['true', 'false']).default('false'),
});

export const HistoryQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

export const MuscleGroupsQuerySchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
});

export const PRTrendsQuerySchema = z.object({
  type: z.enum(['max_weight', 'max_volume', 'max_reps']).default('max_weight'),
  weeks: z.coerce.number().min(1).max(104).default(52),
});

export const CreateProgressCheckinSchema = z.object({
  photos: z.array(z.string().min(1).max(1_500_000)).min(1).max(3),
  weight: z.number().min(1).max(1000),
  waist: z.number().min(1).max(200).optional(),
  note: z.string().max(1000).optional(),
  timezone: z.string().max(100).optional().refine(
    (value) => value === undefined || isValidIanaTimezone(value),
    { message: 'Invalid timezone' }
  ),
});

export const ProgressCheckinQuerySchema = z.object({
  timezone: z.string().max(100).optional().refine(
    (value) => value === undefined || isValidIanaTimezone(value),
    { message: 'Invalid timezone' }
  ),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const SavePushSubscriptionSchema = z.object({
  subscription: PushSubscriptionSchema,
  userAgent: z.string().max(400).optional(),
});

export const RemovePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export const ScheduleRestTimerNotificationSchema = z.object({
  timerId: z.string().uuid(),
  dueAt: z.number().int().positive(),
  title: z.string().max(120).default('Rest Complete'),
  body: z.string().max(300).default('Time for your next set.'),
});

export const TimerIdParamSchema = z.object({
  timerId: z.string().uuid(),
});

// Squad schemas
export const ReactionTypeEnum = z.enum(['fire', 'clap', 'eyes', 'meme']);

export const CreateSquadSchema = z.object({
  name: z.string().min(2).max(50),
});

export const InviteUserSchema = z.object({
  userId: z.string(),
});

export const RespondInviteSchema = z.object({
  accept: z.boolean(),
});

export const AddReactionSchema = z.object({
  workoutId: z.string(),
  reactionType: ReactionTypeEnum,
  memeUrl: z.string().url().optional(),
});

export const JoinSquadSchema = z.object({
  code: z.string().min(6).max(6),
});

export const UserSearchSchema = z.object({
  q: z.string().max(100).optional().default(''),
});

function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const SquadDashboardQuerySchema = z.object({
  timezone: z.string().max(100).optional().refine(
    (value) => value === undefined || isValidIanaTimezone(value),
    { message: 'Invalid timezone' }
  ),
  period: z.enum(['today', 'week']).default('today'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const CreateChallengeSchema = z.object({
  exerciseId: z.string(),
  targetSets: z.number().int().min(1).max(100),
  targetReps: z.number().int().min(1).max(999),
  targetWeight: z.number().min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Type exports
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type CreateWorkoutInput = z.infer<typeof CreateWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof UpdateWorkoutSchema>;
export type CreateSetInput = z.infer<typeof CreateSetSchema>;
export type UpdateSetInput = z.infer<typeof UpdateSetSchema>;
export type CreateSquadInput = z.infer<typeof CreateSquadSchema>;
export type AddReactionInput = z.infer<typeof AddReactionSchema>;
export type CreateChallengeInput = z.infer<typeof CreateChallengeSchema>;
export type CreateProgressCheckinInput = z.infer<typeof CreateProgressCheckinSchema>;
export type SavePushSubscriptionInput = z.infer<typeof SavePushSubscriptionSchema>;
export type ScheduleRestTimerNotificationInput = z.infer<typeof ScheduleRestTimerNotificationSchema>;

import { create } from 'zustand';
import type { Exercise, Workout, WorkoutSet, MuscleGroup, Equipment } from '../types';
import { workoutApi, setApi, exerciseApi } from '../api/client';

interface WorkoutExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
  previousSets: WorkoutSet[];
}

interface WorkoutStore {
  // Active workout state
  activeWorkout: Workout | null;
  workoutExercises: WorkoutExercise[];
  workoutStartTime: Date | null;
  workoutElapsedSeconds: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  startWorkout: (options?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) => Promise<void>;
  resumeWorkout: () => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (exerciseId: string) => Promise<void>;
  addSet: (exerciseId: string, reps: number, weight: number, duration?: number) => Promise<{ isNewPR: boolean }>;
  updateSet: (setId: string, reps: number, weight: number) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  updateWorkoutName: (name: string) => Promise<void>;
  completeWorkout: (notes?: string, name?: string, duration?: number, photos?: string[]) => Promise<void>;
  discardWorkout: () => Promise<void>;
  updateWorkoutTimer: (elapsedSeconds: number) => void;
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  workoutExercises: [],
  workoutStartTime: null,
  workoutElapsedSeconds: 0,
  isLoading: false,
  error: null,

  startWorkout: async (options?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) => {
    const { activeWorkout } = get();
    if (activeWorkout) {
      throw new Error('A workout is already active');
    }

    set({ isLoading: true, error: null });
    try {
      const workout = await workoutApi.create(options);
      const startTime = new Date();
      set({
        activeWorkout: workout,
        workoutExercises: [],
        workoutStartTime: startTime,
        workoutElapsedSeconds: 0,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  resumeWorkout: async () => {
    set({ isLoading: true, error: null });
    try {
      const workout = await workoutApi.getActive();
      if (workout) {
        // Group sets by exercise
        const exerciseMap = new Map<string, WorkoutSet[]>();
        const exerciseInfo = new Map<string, { name: string; primaryMuscles: MuscleGroup[]; equipment: Equipment }>();

        for (const setData of workout.sets) {
          const exerciseId = setData.exercise_id;
          const existing = exerciseMap.get(exerciseId) || [];
          existing.push({
            id: setData.id,
            workoutId: setData.workout_id,
            exerciseId: exerciseId,
            setNumber: setData.set_number,
            reps: setData.reps,
            weight: setData.weight,
            createdAt: setData.created_at,
          });
          exerciseMap.set(exerciseId, existing);
          exerciseInfo.set(exerciseId, {
            name: setData.exercise_name || '',
            primaryMuscles: setData.primaryMuscles || [],
            equipment: setData.equipment || 'Barbell',
          });
        }

        // Build workout exercises array
        const workoutExercises: WorkoutExercise[] = [];
        for (const [exerciseId, sets] of exerciseMap) {
          const info = exerciseInfo.get(exerciseId)!;
          const previous = await exerciseApi.getPrevious(exerciseId);
          workoutExercises.push({
            exercise: {
              id: exerciseId,
              name: info.name,
              primaryMuscles: info.primaryMuscles,
              equipment: info.equipment,
              isCustom: false,
            },
            sets,
            previousSets: previous.sets,
          });
        }

        set({
          activeWorkout: {
            id: workout.id,
            userId: workout.userId || workout.user_id,
            date: workout.date,
            name: workout.name,
            duration: workout.duration,
            notes: workout.notes,
            isComplete: workout.isComplete || Boolean(workout.is_complete),
            createdAt: workout.createdAt || workout.created_at,
          },
          workoutExercises,
          // Ensure timestamp is treated as UTC if it comes from SQLite (no Z)
          workoutStartTime: new Date((workout.createdAt || workout.created_at).endsWith('Z')
            ? (workout.createdAt || workout.created_at)
            : (workout.createdAt || workout.created_at).replace(' ', 'T') + 'Z'),
          isLoading: false,
        });
      } else {
        set({ activeWorkout: null, workoutExercises: [], isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addExercise: async (exercise: Exercise) => {
    const { activeWorkout, workoutExercises } = get();
    if (!activeWorkout) return;

    // Check if exercise already added
    if (workoutExercises.some((we) => we.exercise.id === exercise.id)) {
      return;
    }

    try {
      // Fetch previous session data
      const previous = await exerciseApi.getPrevious(exercise.id);

      set({
        workoutExercises: [
          ...workoutExercises,
          {
            exercise,
            sets: [],
            previousSets: previous.sets,
          },
        ],
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  removeExercise: async (exerciseId: string) => {
    const { workoutExercises } = get();
    const exerciseData = workoutExercises.find((we) => we.exercise.id === exerciseId);
    if (!exerciseData) return;

    try {
      // Delete all sets for this exercise
      for (const s of exerciseData.sets) {
        await setApi.delete(s.id);
      }

      set({
        workoutExercises: workoutExercises.filter((we) => we.exercise.id !== exerciseId),
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addSet: async (exerciseId: string, reps: number, weight: number, duration?: number) => {
    const { activeWorkout, workoutExercises } = get();
    if (!activeWorkout) return { isNewPR: false };

    const exerciseIndex = workoutExercises.findIndex((we) => we.exercise.id === exerciseId);
    if (exerciseIndex === -1) return { isNewPR: false };

    const currentSets = workoutExercises[exerciseIndex].sets;
    const setNumber = currentSets.length + 1;

    // Store previous state for rollback
    const previousWorkoutExercises = [...workoutExercises];

    try {
      const rawSet = await setApi.create(activeWorkout.id, {
        exerciseId,
        setNumber,
        reps,
        weight,
        duration,
      });

      // Convert raw API response to camelCase
      const newSet: WorkoutSet = {
        id: rawSet.id,
        workoutId: rawSet.workout_id,
        exerciseId: rawSet.exercise_id,
        setNumber: rawSet.set_number,
        reps: rawSet.reps,
        weight: rawSet.weight,
        duration: rawSet.duration,
        createdAt: rawSet.created_at,
      };

      // Optimistic update - update state only after successful API call
      const updatedExercises = [...workoutExercises];
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: [...currentSets, newSet],
      };

      set({ workoutExercises: updatedExercises });

      // Return PR status from server response (if available) or client calculation
      const isNewPR = (rawSet as { isPR?: boolean }).isPR || false;

      return { isNewPR };
    } catch (error) {
      // Rollback to previous state on error
      set({
        workoutExercises: previousWorkoutExercises,
        error: (error as Error).message
      });
      return { isNewPR: false };
    }
  },

  updateSet: async (setId: string, reps: number, weight: number) => {
    const { workoutExercises } = get();

    // Store previous state for rollback
    const previousWorkoutExercises = workoutExercises.map((we) => ({
      ...we,
      sets: [...we.sets],
    }));

    // Optimistic update
    const updatedExercises = workoutExercises.map((we) => ({
      ...we,
      sets: we.sets.map((s) =>
        s.id === setId ? { ...s, reps, weight } : s
      ),
    }));
    set({ workoutExercises: updatedExercises });

    try {
      await setApi.update(setId, { reps, weight });
    } catch (error) {
      // Rollback on error
      set({
        workoutExercises: previousWorkoutExercises,
        error: (error as Error).message
      });
    }
  },

  deleteSet: async (setId: string) => {
    const { workoutExercises } = get();

    // Store previous state for rollback
    const previousWorkoutExercises = workoutExercises.map((we) => ({
      ...we,
      sets: [...we.sets],
    }));

    // Optimistic update
    const updatedExercises = workoutExercises.map((we) => ({
      ...we,
      sets: we.sets.filter((s) => s.id !== setId),
    }));
    set({ workoutExercises: updatedExercises });

    try {
      await setApi.delete(setId);
    } catch (error) {
      // Rollback on error
      set({
        workoutExercises: previousWorkoutExercises,
        error: (error as Error).message
      });
    }
  },

  updateWorkoutName: async (name: string) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    // Store previous state for rollback
    const previousName = activeWorkout.name;

    // Optimistic update
    set({ activeWorkout: { ...activeWorkout, name } });

    try {
      await workoutApi.update(activeWorkout.id, { name });
    } catch (error) {
      // Rollback on error
      set({
        activeWorkout: { ...activeWorkout, name: previousName },
        error: (error as Error).message
      });
    }
  },

  completeWorkout: async (notes?: string, name?: string, duration?: number, photos?: string[]) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      await workoutApi.update(activeWorkout.id, {
        isComplete: true,
        notes,
        name: name || activeWorkout.name,
        duration,
        photos,
      });

      set({
        activeWorkout: null,
        workoutExercises: [],
        workoutStartTime: null,
        workoutElapsedSeconds: 0,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  discardWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      await workoutApi.delete(activeWorkout.id);
      set({
        activeWorkout: null,
        workoutExercises: [],
        workoutStartTime: null,
        workoutElapsedSeconds: 0,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateWorkoutTimer: (elapsedSeconds: number) => {
    set({ workoutElapsedSeconds: elapsedSeconds });
  },

  clearError: () => set({ error: null }),
}));

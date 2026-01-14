import { create } from 'zustand';
import type { Exercise, Workout, WorkoutSet, MuscleGroup } from '../types';
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
  isLoading: boolean;
  error: string | null;

  // Actions
  startWorkout: (options?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) => Promise<void>;
  resumeWorkout: () => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  addSet: (exerciseId: string, reps: number, weight: number) => Promise<{ isNewPR: boolean }>;
  updateSet: (setId: string, reps: number, weight: number) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  updateWorkoutName: (name: string) => Promise<void>;
  completeWorkout: (notes?: string, name?: string, duration?: number) => Promise<void>;
  discardWorkout: () => Promise<void>;
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  workoutExercises: [],
  workoutStartTime: null,
  isLoading: false,
  error: null,

  startWorkout: async (options?: { name?: string; date?: string; duration?: number; isComplete?: boolean }) => {
    set({ isLoading: true, error: null });
    try {
      const workout = await workoutApi.create(options);
      set({
        activeWorkout: workout,
        workoutExercises: [],
        workoutStartTime: new Date(),
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
        const exerciseInfo = new Map<string, { name: string; primaryMuscles: MuscleGroup[] }>();

        for (const setData of workout.sets) {
          const existing = exerciseMap.get(setData.exercise_id) || [];
          existing.push({
            id: setData.id,
            workoutId: setData.workout_id,
            exerciseId: setData.exercise_id,
            setNumber: setData.set_number,
            reps: setData.reps,
            weight: setData.weight,
            createdAt: setData.created_at,
          });
          exerciseMap.set(setData.exercise_id, existing);
          exerciseInfo.set(setData.exercise_id, {
            name: setData.exercise_name,
            primaryMuscles: setData.primaryMuscles,
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
              equipment: 'Barbell', // Default, we don't have this in the join
              isCustom: false,
            },
            sets,
            previousSets: previous.sets,
          });
        }

        set({
          activeWorkout: {
            id: workout.id,
            userId: workout.user_id,
            date: workout.date,
            name: workout.name,
            duration: workout.duration,
            notes: workout.notes,
            isComplete: workout.isComplete,
            createdAt: workout.created_at,
          },
          workoutExercises,
          workoutStartTime: new Date(workout.created_at),
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

  addSet: async (exerciseId: string, reps: number, weight: number) => {
    const { activeWorkout, workoutExercises } = get();
    if (!activeWorkout) return { isNewPR: false };

    const exerciseIndex = workoutExercises.findIndex((we) => we.exercise.id === exerciseId);
    if (exerciseIndex === -1) return { isNewPR: false };

    const currentSets = workoutExercises[exerciseIndex].sets;
    const setNumber = currentSets.length + 1;

    try {
      const newSet = await setApi.create(activeWorkout.id, {
        exerciseId,
        setNumber,
        reps,
        weight,
      });

      const updatedExercises = [...workoutExercises];
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: [...currentSets, newSet],
      };

      set({ workoutExercises: updatedExercises });

      // Check if this might be a PR (simplified check - actual PR check happens on server)
      const previousSets = workoutExercises[exerciseIndex].previousSets;
      const maxPreviousWeight = Math.max(0, ...previousSets.map((s) => s.weight));
      const isNewPR = weight > maxPreviousWeight;

      return { isNewPR };
    } catch (error) {
      set({ error: (error as Error).message });
      return { isNewPR: false };
    }
  },

  updateSet: async (setId: string, reps: number, weight: number) => {
    const { workoutExercises } = get();

    try {
      await setApi.update(setId, { reps, weight });

      const updatedExercises = workoutExercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) =>
          s.id === setId ? { ...s, reps, weight } : s
        ),
      }));

      set({ workoutExercises: updatedExercises });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteSet: async (setId: string) => {
    const { workoutExercises } = get();

    try {
      await setApi.delete(setId);

      const updatedExercises = workoutExercises.map((we) => ({
        ...we,
        sets: we.sets.filter((s) => s.id !== setId),
      }));

      set({ workoutExercises: updatedExercises });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateWorkoutName: async (name: string) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      await workoutApi.update(activeWorkout.id, { name });
      set({
        activeWorkout: { ...activeWorkout, name },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  completeWorkout: async (notes?: string, name?: string, duration?: number) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    try {
      await workoutApi.update(activeWorkout.id, {
        isComplete: true,
        notes,
        name: name || activeWorkout.name,
        duration,
      });

      set({
        activeWorkout: null,
        workoutExercises: [],
        workoutStartTime: null,
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
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));

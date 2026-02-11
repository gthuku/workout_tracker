import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import logger from '../utils/logger.js';
import cache, { CACHE_KEYS, CACHE_TTL } from '../utils/cache.js';
import type { CreateExerciseInput } from '../schemas/index.js';

interface DbExercise {
  id: string;
  name: string;
  primary_muscles: string;
  equipment: string;
  is_custom: number;
  user_id?: string;
}

// Generate cache key for exercise list with filters
function getExerciseListCacheKey(userId: string, filters: { search?: string; muscleGroup?: string; equipment?: string }): string {
  const filterStr = `${filters.search || ''}_${filters.muscleGroup || ''}_${filters.equipment || ''}`;
  return `${CACHE_KEYS.EXERCISES(userId)}:${filterStr}`;
}

export const exerciseService = {
  async verifyOwnership(exerciseId: string, userId: string): Promise<boolean> {
    const exercise = await db.queryOne<DbExercise>(
      'SELECT user_id, is_custom FROM exercises WHERE id = $1',
      [exerciseId]
    );
    if (!exercise) return false;
    if (!exercise.is_custom) return true; // System exercises accessible to all
    return exercise.user_id === userId;
  },

  async list(userId: string, filters: { search?: string; muscleGroup?: string; equipment?: string }) {
    const cacheKey = getExerciseListCacheKey(userId, filters);

    return cache.wrap(
      cacheKey,
      async () => {
        let query = 'SELECT * FROM exercises WHERE (is_custom = 0 OR user_id = $1)';
        const params: unknown[] = [userId];
        let paramIndex = 2;

        if (filters.search) {
          query += ` AND name LIKE $${paramIndex}`;
          params.push(`%${filters.search}%`);
          paramIndex++;
        }

        if (filters.muscleGroup) {
          query += ` AND primary_muscles LIKE $${paramIndex}`;
          params.push(`%${filters.muscleGroup}%`);
          paramIndex++;
        }

        if (filters.equipment) {
          query += ` AND equipment = $${paramIndex}`;
          params.push(filters.equipment);
          paramIndex++;
        }

        query += ' ORDER BY name';

        const exercises = await db.query<DbExercise>(query, params);
        return exercises.map((e) => ({
          id: e.id,
          name: e.name,
          equipment: e.equipment,
          primaryMuscles: JSON.parse(e.primary_muscles),
          isCustom: Boolean(e.is_custom),
        }));
      },
      CACHE_TTL.EXERCISES // 24 hours - exercises rarely change
    );
  },

  async create(userId: string, input: CreateExerciseInput) {
    const { name, primaryMuscles, equipment } = input;
    const id = uuidv4();

    await db.execute(
      `INSERT INTO exercises (id, name, primary_muscles, equipment, is_custom, user_id)
       VALUES ($1, $2, $3, $4, 1, $5)`,
      [id, name, JSON.stringify(primaryMuscles), equipment, userId]
    );

    const exercise = await db.queryOne<DbExercise>('SELECT * FROM exercises WHERE id = $1', [id]);
    if (!exercise) {
      throw new Error('Failed to create exercise');
    }

    // Invalidate exercise list cache for this user
    await cache.delPattern(`exercises:${userId}*`);

    logger.info({ exerciseId: id, userId, name }, 'Custom exercise created');

    return {
      id: exercise.id,
      name: exercise.name,
      equipment: exercise.equipment,
      primaryMuscles: JSON.parse(exercise.primary_muscles),
      isCustom: true,
    };
  },

  async getHistory(userId: string, exerciseId: string, weeks: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const sessions = await db.query(
      `SELECT w.id as workout_id, w.date, ws.set_number, ws.reps, ws.weight
       FROM workouts w
       JOIN workout_sets ws ON w.id = ws.workout_id
       WHERE w.user_id = $1 AND ws.exercise_id = $2 AND w.is_complete = 1 AND w.date >= $3
       ORDER BY w.date DESC, ws.set_number`,
      [userId, exerciseId, startDate.toISOString().split('T')[0]]
    );

    interface SessionRow {
      workout_id: string;
      date: string;
      set_number: number;
      reps: number;
      weight: number;
    }

    const typedSessions = sessions as unknown as SessionRow[];

    const grouped: Record<string, { date: string; sets: { setNumber: number; reps: number; weight: number }[]; totalVolume: number; maxWeight: number; totalReps: number }> = {};
    for (const row of typedSessions) {
      if (!grouped[row.workout_id]) {
        grouped[row.workout_id] = {
          date: row.date,
          sets: [],
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0,
        };
      }
      grouped[row.workout_id].sets.push({
        setNumber: row.set_number,
        reps: row.reps,
        weight: row.weight,
      });
      grouped[row.workout_id].totalVolume += row.reps * row.weight;
      grouped[row.workout_id].maxWeight = Math.max(grouped[row.workout_id].maxWeight, row.weight);
      grouped[row.workout_id].totalReps += row.reps;
    }

    return {
      exerciseId,
      sessions: Object.values(grouped),
    };
  },

  async getPrevious(userId: string, exerciseId: string) {
    // Single query using subquery to get previous workout's sets (optimized from 2 queries)
    // Note: SQLite uses positional ? params, so we need to pass userId/exerciseId twice for the subquery
    const results = await db.query<{ workout_date: string; id: string; workout_id: string; exercise_id: string; set_number: number; reps: number; weight: number; duration: number; created_at: string }>(
      `SELECT w.date as workout_date, ws.*
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE w.user_id = $1
         AND ws.exercise_id = $2
         AND w.is_complete = 1
         AND w.id = (
           SELECT w2.id FROM workouts w2
           JOIN workout_sets ws2 ON w2.id = ws2.workout_id
           WHERE w2.user_id = $3 AND ws2.exercise_id = $4 AND w2.is_complete = 1
           ORDER BY w2.date DESC
           LIMIT 1
         )
       ORDER BY ws.set_number`,
      [userId, exerciseId, userId, exerciseId]
    );

    if (results.length === 0) {
      return { sets: [] };
    }

    return {
      date: results[0].workout_date,
      sets: results.map(r => ({
        id: r.id,
        workout_id: r.workout_id,
        exercise_id: r.exercise_id,
        set_number: r.set_number,
        reps: r.reps,
        weight: r.weight,
        duration: r.duration,
        created_at: r.created_at,
      })),
    };
  },

  async delete(userId: string, exerciseId: string) {
    // Verify the exercise is custom and belongs to the user
    const exercise = await db.queryOne<DbExercise>(
      'SELECT * FROM exercises WHERE id = $1',
      [exerciseId]
    );

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    if (!exercise.is_custom) {
      throw new Error('Cannot delete system exercises');
    }

    if (exercise.user_id !== userId) {
      throw new Error('Not authorized to delete this exercise');
    }

    // Delete associated workout sets first (if any)
    await db.execute('DELETE FROM workout_sets WHERE exercise_id = $1', [exerciseId]);

    // Delete associated personal records (if any)
    await db.execute('DELETE FROM personal_records WHERE exercise_id = $1', [exerciseId]);

    // Delete the exercise
    await db.execute('DELETE FROM exercises WHERE id = $1', [exerciseId]);

    // Invalidate exercise list cache for this user
    await cache.delPattern(`exercises:${userId}*`);

    logger.info({ exerciseId, userId }, 'Custom exercise deleted');

    return { success: true };
  },
};

export default exerciseService;

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import cache, { CACHE_KEYS } from '../utils/cache.js';
import type { CreateWorkoutInput, UpdateWorkoutInput, CreateSetInput, UpdateSetInput } from '../schemas/index.js';

interface DbWorkout {
  id: string;
  user_id: string;
  name?: string;
  date: string;
  duration?: number;
  notes?: string;
  is_complete: number;
  created_at: string;
}

interface DbWorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight?: number;
  duration?: number;
  created_at: string;
}

export const workoutService = {
  async verifyOwnership(workoutId: string, userId: string): Promise<boolean> {
    const workout = await db.queryOne<DbWorkout>('SELECT user_id FROM workouts WHERE id = $1', [workoutId]);
    return workout?.user_id === userId;
  },

  async verifySetOwnership(setId: string, userId: string): Promise<boolean> {
    const set = await db.queryOne<{ user_id: string }>(
      `SELECT w.user_id FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       WHERE ws.id = $1`,
      [setId]
    );
    return set?.user_id === userId;
  },

  async list(userId: string, limit: number, includeIncomplete: boolean) {
    let query = 'SELECT * FROM workouts WHERE user_id = $1';
    if (!includeIncomplete) {
      query += ' AND is_complete = 1';
    }
    query += ' ORDER BY date DESC LIMIT $2';

    const workouts = await db.query<DbWorkout>(query, [userId, limit]);
    return workouts.map((w) => ({
      ...w,
      isComplete: w.is_complete,
    }));
  },

  async getActive(userId: string) {
    // Two-query approach for database compatibility (works with both PostgreSQL and SQLite)
    const workout = await db.queryOne<DbWorkout>(
      `SELECT * FROM workouts
       WHERE user_id = $1 AND is_complete = 0
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!workout) {
      return null;
    }

    // Fetch sets with exercise data in a single JOIN query (no N+1)
    const sets = await db.query<DbWorkoutSet & { name: string; primary_muscles: string; equipment: string }>(
      `SELECT ws.*, e.name, e.primary_muscles, e.equipment
       FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.workout_id = $1
       ORDER BY ws.set_number`,
      [workout.id]
    );

    return {
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      name: workout.name,
      duration: workout.duration,
      notes: workout.notes,
      isComplete: false,
      createdAt: workout.created_at,
      sets: sets.map((s) => ({
        id: s.id,
        workout_id: s.workout_id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
        duration: s.duration,
        created_at: s.created_at,
        exercise_name: s.name,
        primaryMuscles: JSON.parse(s.primary_muscles),
        equipment: s.equipment,
      })),
    };
  },

  async getById(workoutId: string, userId: string) {
    // Single query for workout with ownership check
    const workout = await db.queryOne<DbWorkout>(
      'SELECT * FROM workouts WHERE id = $1',
      [workoutId]
    );

    if (!workout) {
      throw new NotFoundError('Workout');
    }
    if (workout.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Fetch sets with exercise data in a single JOIN query (no N+1)
    const sets = await db.query<DbWorkoutSet & { name: string; primary_muscles: string; equipment: string }>(
      `SELECT ws.*, e.name, e.primary_muscles, e.equipment
       FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.workout_id = $1
       ORDER BY ws.set_number`,
      [workoutId]
    );

    return {
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      name: workout.name,
      duration: workout.duration,
      notes: workout.notes,
      isComplete: workout.is_complete,
      createdAt: workout.created_at,
      sets: sets.map((s) => ({
        id: s.id,
        workout_id: s.workout_id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
        duration: s.duration,
        created_at: s.created_at,
        exercise_name: s.name,
        primaryMuscles: JSON.parse(s.primary_muscles),
        equipment: s.equipment,
      })),
    };
  },

  async create(userId: string, input: CreateWorkoutInput) {
    const { name, date: customDate, duration, isComplete } = input;
    const id = uuidv4();
    const date = customDate || new Date().toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO workouts (id, user_id, name, date, duration, is_complete)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, name || null, date, duration || null, isComplete ? 1 : 0]
    );

    const workout = await db.queryOne<DbWorkout>('SELECT * FROM workouts WHERE id = $1', [id]);
    if (!workout) {
      throw new Error('Failed to create workout');
    }

    // Invalidate workout list and dashboard caches
    await cache.invalidateWorkouts(userId);

    logger.info({ workoutId: id, userId }, 'Workout created');
    return { ...workout, isComplete: workout.is_complete, sets: [] };
  },

  async update(workoutId: string, userId: string, input: UpdateWorkoutInput) {
    const workout = await db.queryOne<DbWorkout>('SELECT * FROM workouts WHERE id = $1', [workoutId]);
    if (!workout) {
      throw new NotFoundError('Workout');
    }
    if (workout.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const { name, date, notes, isComplete, duration } = input;
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }
    if (isComplete !== undefined) {
      updates.push(`is_complete = $${paramIndex}`);
      params.push(isComplete ? 1 : 0);
      paramIndex++;
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex}`);
      params.push(duration);
      paramIndex++;
    }

    if (updates.length > 0) {
      params.push(workoutId);
      await db.execute(
        `UPDATE workouts SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
    }

    const updated = await db.queryOne<DbWorkout>('SELECT * FROM workouts WHERE id = $1', [workoutId]);
    if (!updated) {
      throw new NotFoundError('Workout');
    }

    // Invalidate workout and list caches
    await Promise.all([
      cache.del(CACHE_KEYS.WORKOUT(workoutId)),
      cache.invalidateWorkouts(userId),
    ]);

    logger.info({ workoutId, userId }, 'Workout updated');
    return { ...updated, isComplete: updated.is_complete };
  },

  async delete(workoutId: string, userId: string) {
    const workout = await db.queryOne<DbWorkout>('SELECT user_id FROM workouts WHERE id = $1', [workoutId]);
    if (!workout) {
      throw new NotFoundError('Workout');
    }
    if (workout.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await db.withTransaction(async () => {
      // Manually delete dependencies because ON DELETE CASCADE might be missing in older DBs
      await db.execute('DELETE FROM personal_records WHERE workout_id = $1', [workoutId]);
      await db.execute('DELETE FROM workout_sets WHERE workout_id = $1', [workoutId]);
      await db.execute('DELETE FROM workouts WHERE id = $1', [workoutId]);
    });

    // Invalidate workout and list caches
    await Promise.all([
      cache.del(CACHE_KEYS.WORKOUT(workoutId)),
      cache.invalidateWorkouts(userId),
    ]);

    logger.info({ workoutId, userId }, 'Workout deleted');
    return { success: true };
  },

  async deleteAll(userId: string) {
    await db.execute('DELETE FROM workouts WHERE user_id = $1', [userId]);

    // Invalidate all workout caches for user
    await cache.invalidateWorkouts(userId);

    logger.info({ userId }, 'All workouts deleted');
    return { success: true };
  },

  async deleteIncomplete(userId: string) {
    const result = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = $1 AND is_complete = 0',
      [userId]
    );

    await db.execute('DELETE FROM workouts WHERE user_id = $1 AND is_complete = 0', [userId]);

    const deletedCount = parseInt(result?.count || '0');

    // Invalidate workout caches if any were deleted
    if (deletedCount > 0) {
      await cache.invalidateWorkouts(userId);
    }

    logger.info({ userId, deletedCount }, 'Incomplete workouts deleted');

    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} incomplete workouts`,
    };
  },

  // Set operations
  async createSet(workoutId: string, userId: string, input: CreateSetInput) {
    const isOwner = await this.verifyOwnership(workoutId, userId);
    if (!isOwner) {
      throw new ForbiddenError('Access denied');
    }

    const { exerciseId, setNumber, reps, weight, duration } = input;
    const id = uuidv4();

    await db.withTransaction(async () => {
      await db.execute(
        `INSERT INTO workout_sets (id, workout_id, exercise_id, set_number, reps, weight, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, workoutId, exerciseId, setNumber, reps ?? null, weight ?? null, duration ?? null]
      );

      if (reps && weight) {
        await this.checkAndUpdatePRs(userId, exerciseId, workoutId, weight, reps);
      }
    });

    const set = await db.queryOne<DbWorkoutSet>('SELECT * FROM workout_sets WHERE id = $1', [id]);
    logger.debug({ setId: id, workoutId }, 'Set created');
    return set;
  },

  async updateSet(setId: string, userId: string, input: UpdateSetInput) {
    const isOwner = await this.verifySetOwnership(setId, userId);
    if (!isOwner) {
      throw new ForbiddenError('Access denied');
    }

    const set = await db.queryOne<DbWorkoutSet>('SELECT * FROM workout_sets WHERE id = $1', [setId]);
    if (!set) {
      throw new NotFoundError('Set');
    }

    const { reps, weight } = input;

    await db.withTransaction(async () => {
      await db.execute(
        'UPDATE workout_sets SET reps = $1, weight = $2 WHERE id = $3',
        [reps, weight, setId]
      );

      await this.checkAndUpdatePRs(userId, set.exercise_id, set.workout_id, weight, reps);
    });

    const updated = await db.queryOne<DbWorkoutSet>('SELECT * FROM workout_sets WHERE id = $1', [setId]);
    logger.debug({ setId }, 'Set updated');
    return updated;
  },

  async deleteSet(setId: string, userId: string) {
    const isOwner = await this.verifySetOwnership(setId, userId);
    if (!isOwner) {
      throw new ForbiddenError('Access denied');
    }

    await db.execute('DELETE FROM workout_sets WHERE id = $1', [setId]);
    logger.debug({ setId }, 'Set deleted');
    return { success: true };
  },

  async checkAndUpdatePRs(
    userId: string,
    exerciseId: string,
    workoutId: string,
    weight: number,
    reps: number
  ) {
    const volume = weight * reps;

    // Fetch all current PRs for this user/exercise in ONE query (optimized from 4 queries)
    const currentPRs = await db.query<{ id: string; type: string; value: number }>(
      `SELECT id, type, value FROM personal_records
       WHERE user_id = $1 AND exercise_id = $2`,
      [userId, exerciseId]
    );

    const prMap = new Map(currentPRs.map(pr => [pr.type, pr]));
    const maxWeightPR = prMap.get('max_weight');
    const maxVolumePR = prMap.get('max_volume');

    let prUpdated = false;

    // Update max weight PR if needed
    if (!maxWeightPR || weight > maxWeightPR.value) {
      if (maxWeightPR) {
        await db.execute(
          `UPDATE personal_records SET value = $1, workout_id = $2, achieved_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [weight, workoutId, maxWeightPR.id]
        );
      } else {
        await db.execute(
          `INSERT INTO personal_records (id, user_id, exercise_id, type, value, workout_id)
           VALUES ($1, $2, $3, 'max_weight', $4, $5)`,
          [uuidv4(), userId, exerciseId, weight, workoutId]
        );
      }
      logger.info({ userId, exerciseId, weight }, 'New max weight PR');
      prUpdated = true;
    }

    // Update max volume PR if needed
    if (!maxVolumePR || volume > maxVolumePR.value) {
      if (maxVolumePR) {
        await db.execute(
          `UPDATE personal_records SET value = $1, workout_id = $2, achieved_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [volume, workoutId, maxVolumePR.id]
        );
      } else {
        await db.execute(
          `INSERT INTO personal_records (id, user_id, exercise_id, type, value, workout_id)
           VALUES ($1, $2, $3, 'max_volume', $4, $5)`,
          [uuidv4(), userId, exerciseId, volume, workoutId]
        );
      }
      logger.info({ userId, exerciseId, volume }, 'New max volume PR');
      prUpdated = true;
    }

    // Invalidate PR cache if updated
    if (prUpdated) {
      await cache.del(CACHE_KEYS.PERSONAL_RECORDS(userId));
    }
  },

  async cleanupIncomplete() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const result = await db.queryOne<{ count: string }>(
        "SELECT COUNT(*) as count FROM workouts WHERE is_complete = 0 AND created_at < $1",
        [oneDayAgo]
      );

      if (result && parseInt(result.count) > 0) {
        await db.execute(
          "DELETE FROM workouts WHERE is_complete = 0 AND created_at < $1",
          [oneDayAgo]
        );
        logger.info({ count: result.count }, 'Cleaned up old incomplete workouts');
      }
    } catch (error) {
      logger.error({ error }, 'Error cleaning up incomplete workouts');
    }
  },
};

export default workoutService;

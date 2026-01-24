import { db } from '../database.js';
import cache, { CACHE_KEYS, CACHE_TTL } from '../utils/cache.js';

interface MuscleGroupData {
  primary_muscles: string;
  volume: string;
  sets: string;
}

interface MuscleGroupVolume {
  muscleGroup: string;
  volume: number;
  sets: number;
  percentage: number;
}

interface DbWorkout {
  id: string;
  user_id: string;
  name: string | null;
  date: string;
  duration: number | null;
  notes: string | null;
  is_complete: number;
  created_at: string;
}

interface DbPersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  type: string;
  value: number;
  workout_id: string;
  achieved_at: string;
  exercise_name: string;
}

export const statsService = {
  async getDashboard(userId: string) {
    // Try to get from cache first
    return cache.wrap(
      CACHE_KEYS.DASHBOARD(userId),
      async () => {
        const streak = await this.calculateStreak(userId);

        // Weekly workout count
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weeklyCountResult = await db.queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM workouts
           WHERE user_id = $1 AND is_complete = 1 AND date >= $2`,
          [userId, weekStart.toISOString().split('T')[0]]
        );

        // Recent workouts with exercise data in single query (avoid N+1)
        const recentWorkouts = await db.query<DbWorkout>(
          `SELECT * FROM workouts
           WHERE user_id = $1 AND is_complete = 1
           ORDER BY date DESC LIMIT 3`,
          [userId]
        );

        // Recent PRs with exercise name (single JOIN query)
        const recentPRs = await db.query<DbPersonalRecord>(
          `SELECT pr.*, e.name as exercise_name
           FROM personal_records pr
           JOIN exercises e ON pr.exercise_id = e.id
           WHERE pr.user_id = $1
           ORDER BY pr.achieved_at DESC
           LIMIT 5`,
          [userId]
        );

        // Weekly muscle group distribution (aggregated in single query)
        const weeklyMuscles = await db.query<MuscleGroupData>(
          `SELECT e.primary_muscles, SUM(ws.reps * ws.weight) as volume, COUNT(*) as sets
           FROM workout_sets ws
           JOIN workouts w ON ws.workout_id = w.id
           JOIN exercises e ON ws.exercise_id = e.id
           WHERE w.user_id = $1 AND w.is_complete = 1 AND w.date >= $2
           GROUP BY e.primary_muscles`,
          [userId, weekStart.toISOString().split('T')[0]]
        );

        const muscleGroupVolumes = this.calculateMuscleGroupVolumes(weeklyMuscles);

        return {
          streak,
          weeklyWorkoutCount: parseInt(weeklyCountResult?.count || '0'),
          recentWorkouts: recentWorkouts.map((w) => ({ ...w, isComplete: true })),
          recentPRs: recentPRs.map((pr) => ({ ...pr, exerciseName: pr.exercise_name })),
          weeklyMuscleGroups: muscleGroupVolumes,
        };
      },
      CACHE_TTL.SHORT // Dashboard data cached for 1 minute
    );
  },

  async getMuscleGroups(userId: string, period: 'week' | 'month') {
    return cache.wrap(
      CACHE_KEYS.MUSCLE_GROUPS(userId, period),
      async () => {
        const startDate = new Date();
        if (period === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else {
          startDate.setMonth(startDate.getMonth() - 1);
        }

        const data = await db.query<MuscleGroupData>(
          `SELECT e.primary_muscles, SUM(ws.reps * ws.weight) as volume, COUNT(*) as sets
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.user_id = $1 AND w.is_complete = 1 AND w.date >= $2
       GROUP BY e.primary_muscles`,
      [userId, startDate.toISOString().split('T')[0]]
    );

        const muscleGroupVolumes = this.calculateMuscleGroupVolumes(data);
        const imbalances = this.checkImbalances(muscleGroupVolumes);

        return {
          muscleGroups: muscleGroupVolumes,
          imbalances,
        };
      },
      CACHE_TTL.MEDIUM
    );
  },

  async getPersonalRecords(userId: string, limit: number) {
    return cache.wrap(
      `${CACHE_KEYS.PERSONAL_RECORDS(userId)}:${limit}`,
      async () => {
        const prs = await db.query<DbPersonalRecord>(
          `SELECT pr.*, e.name as exercise_name
           FROM personal_records pr
           JOIN exercises e ON pr.exercise_id = e.id
           WHERE pr.user_id = $1
           ORDER BY pr.achieved_at DESC
           LIMIT $2`,
          [userId, limit]
        );

        return prs.map((pr) => ({
          ...pr,
          exerciseName: pr.exercise_name,
        }));
      },
      CACHE_TTL.MEDIUM
    );
  },

  async calculateStreak(userId: string): Promise<number> {
    const workouts = await db.query<{ date: string }>(
      `SELECT DISTINCT date FROM workouts
       WHERE user_id = $1 AND is_complete = 1
       ORDER BY date DESC`,
      [userId]
    );

    if (workouts.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const workout of workouts) {
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        streak++;
        currentDate = workoutDate;
      } else {
        break;
      }
    }

    return streak;
  },

  calculateMuscleGroupVolumes(data: MuscleGroupData[]): MuscleGroupVolume[] {
    const muscleGroups: Record<string, { volume: number; sets: number }> = {};
    let totalVolume = 0;

    for (const row of data) {
      const muscles = JSON.parse(row.primary_muscles) as string[];
      const volume = parseFloat(row.volume);
      const sets = parseInt(row.sets);
      const volumePerMuscle = volume / muscles.length;
      const setsPerMuscle = sets / muscles.length;

      for (const muscle of muscles) {
        if (!muscleGroups[muscle]) {
          muscleGroups[muscle] = { volume: 0, sets: 0 };
        }
        muscleGroups[muscle].volume += volumePerMuscle;
        muscleGroups[muscle].sets += setsPerMuscle;
        totalVolume += volumePerMuscle;
      }
    }

    return Object.entries(muscleGroups)
      .map(([muscleGroup, data]) => ({
        muscleGroup,
        volume: Math.round(data.volume),
        sets: Math.round(data.sets),
        percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      }))
      .sort((a, b) => b.volume - a.volume);
  },

  checkImbalances(muscleGroups: MuscleGroupVolume[]) {
    const imbalances: { warning: string; muscleGroup1: string; muscleGroup2: string }[] = [];

    const chest = muscleGroups.find((m) => m.muscleGroup === 'Chest');
    const back = muscleGroups.find((m) => m.muscleGroup === 'Back');

    if (chest && back) {
      if (chest.volume > back.volume * 2) {
        imbalances.push({
          warning: 'Chest volume is more than 2x Back volume. Consider more pulling exercises.',
          muscleGroup1: 'Chest',
          muscleGroup2: 'Back',
        });
      } else if (back.volume > chest.volume * 2) {
        imbalances.push({
          warning: 'Back volume is more than 2x Chest volume. Consider more pushing exercises.',
          muscleGroup1: 'Back',
          muscleGroup2: 'Chest',
        });
      }
    }

    const quads = muscleGroups.find((m) => m.muscleGroup === 'Quads');
    const hamstrings = muscleGroups.find((m) => m.muscleGroup === 'Hamstrings');

    if (quads && hamstrings) {
      if (quads.volume > hamstrings.volume * 2) {
        imbalances.push({
          warning: 'Quad volume is more than 2x Hamstring volume. Consider more hip hinge movements.',
          muscleGroup1: 'Quads',
          muscleGroup2: 'Hamstrings',
        });
      }
    }

    return imbalances;
  },

  async getPRTrends(
    userId: string,
    exerciseId: string,
    type: 'max_weight' | 'max_volume' | 'max_reps' = 'max_weight',
    weeks = 52
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    // Query workout_sets grouped by workout date
    const sessions = await db.query<{
      date: string;
      max_weight: string;
      total_volume: string;
      total_reps: string;
    }>(
      `SELECT
        w.date,
        MAX(ws.weight) as max_weight,
        SUM(ws.weight * ws.reps) as total_volume,
        SUM(ws.reps) as total_reps
      FROM workout_sets ws
      JOIN workouts w ON ws.workout_id = w.id
      WHERE w.user_id = $1
        AND ws.exercise_id = $2
        AND w.is_complete = 1
        AND w.date >= $3
      GROUP BY w.date
      ORDER BY w.date ASC`,
      [userId, exerciseId, startDate.toISOString().split('T')[0]]
    );

    // Calculate running max and flag PR moments
    let runningMax = 0;
    const trends: { date: string; value: number; isNewPR: boolean }[] = [];

    for (const session of sessions) {
      let value: number;
      switch (type) {
        case 'max_weight':
          value = parseFloat(session.max_weight) || 0;
          break;
        case 'max_volume':
          value = parseFloat(session.total_volume) || 0;
          break;
        case 'max_reps':
          value = parseInt(session.total_reps) || 0;
          break;
      }

      const isNewPR = value > runningMax;
      if (isNewPR) {
        runningMax = value;
      }

      trends.push({
        date: session.date,
        value,
        isNewPR,
      });
    }

    return {
      exerciseId,
      type,
      currentPR: runningMax,
      trends,
    };
  },
};

export default statsService;

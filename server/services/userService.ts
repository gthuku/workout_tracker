import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import cache, { CACHE_KEYS, CACHE_TTL } from '../utils/cache.js';
import type { CreateProfileInput, UpdateProfileInput } from '../schemas/index.js';

interface DbUser {
  id: string;
  username: string;
  email?: string;
  password_hash?: string;
  preferred_unit: string;
  created_at: string;
  display_name?: string;
  age?: number;
  height_feet?: number;
  height_inches?: number;
  body_weight?: number;
  fitness_goal?: string;
  experience_level?: string;
  gender?: string;
  bio?: string;
  avatar?: string;
}

function formatUser(user: DbUser) {
  return {
    id: user.id,
    username: user.username,
    preferredUnit: user.preferred_unit,
    displayName: user.display_name,
    age: user.age,
    heightFeet: user.height_feet,
    heightInches: user.height_inches,
    bodyWeight: user.body_weight,
    fitnessGoal: user.fitness_goal
      ? user.fitness_goal.startsWith('[')
        ? JSON.parse(user.fitness_goal)
        : [user.fitness_goal]
      : undefined,
    experienceLevel: user.experience_level,
    gender: user.gender,
    bio: user.bio,
    avatar: user.avatar,
    createdAt: user.created_at,
  };
}

export const userService = {
  async listProfiles() {
    const profiles = await db.query<DbUser>('SELECT * FROM users ORDER BY created_at');
    return profiles.map(formatUser);
  },

  async createProfile(input: CreateProfileInput) {
    const { username, displayName } = input;
    const id = uuidv4();

    try {
      await db.execute(
        `INSERT INTO users (id, username, preferred_unit, display_name)
         VALUES ($1, $2, 'lbs', $3)`,
        [id, username, displayName || username]
      );
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError?.code === 'SQLITE_CONSTRAINT_UNIQUE' || dbError?.code === '23505') {
        throw new ConflictError('Username already exists');
      }
      throw error;
    }

    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
    if (!user) {
      throw new Error('Failed to create profile');
    }

    logger.info({ userId: id, username }, 'Profile created');
    return formatUser(user);
  },

  async deleteProfile(profileId: string, requestingUserId: string) {
    if (profileId !== requestingUserId) {
      throw new ConflictError('You can only delete your own profile');
    }

    await db.withTransaction(async () => {
      await db.execute('DELETE FROM password_reset_tokens WHERE user_id = $1', [profileId]);
      await db.execute('DELETE FROM personal_records WHERE user_id = $1', [profileId]);
      await db.execute(
        'DELETE FROM workout_sets WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = $1)',
        [profileId]
      );
      await db.execute('DELETE FROM workouts WHERE user_id = $1', [profileId]);
      await db.execute('DELETE FROM exercises WHERE user_id = $1', [profileId]);
      await db.execute('DELETE FROM users WHERE id = $1', [profileId]);
    });

    // Invalidate all user caches
    await cache.invalidateUser(profileId);

    logger.info({ userId: profileId }, 'Profile deleted');
    return { success: true };
  },

  async getUser(userId: string) {
    return cache.wrap(
      CACHE_KEYS.USER(userId),
      async () => {
        const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
        if (!user) {
          throw new NotFoundError('User');
        }
        return formatUser(user);
      },
      CACHE_TTL.MEDIUM
    );
  },

  async updateUser(userId: string, preferredUnit: string) {
    await db.execute('UPDATE users SET preferred_unit = $1 WHERE id = $2', [preferredUnit, userId]);
    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Invalidate user cache
    await cache.del(CACHE_KEYS.USER(userId));

    logger.info({ userId }, 'User updated');
    return formatUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const {
      displayName,
      age,
      heightFeet,
      heightInches,
      bodyWeight,
      fitnessGoal,
      experienceLevel,
      gender,
      bio,
      preferredUnit,
      avatar,
    } = input;

    await db.execute(
      `UPDATE users SET
        display_name = $1,
        age = $2,
        height_feet = $3,
        height_inches = $4,
        body_weight = $5,
        fitness_goal = $6,
        experience_level = $7,
        gender = $8,
        bio = $9,
        preferred_unit = $10,
        avatar = $11
      WHERE id = $12`,
      [
        displayName ?? null,
        age ?? null,
        heightFeet ?? null,
        heightInches ?? null,
        bodyWeight ?? null,
        fitnessGoal ? JSON.stringify(fitnessGoal) : null,
        experienceLevel ?? null,
        gender ?? null,
        bio ?? null,
        preferredUnit ?? 'lbs',
        avatar ?? null,
        userId,
      ]
    );

    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Invalidate user cache
    await cache.del(CACHE_KEYS.USER(userId));

    logger.info({ userId }, 'Profile updated');
    return formatUser(user);
  },

  async verifyUserExists(userId: string): Promise<{ id: string; username: string } | null> {
    return db.queryOne<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );
  },
};

export default userService;

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import db, { initializeDatabase, closeDatabase } from './database.js';
import { seedExercises, createDefaultUser } from './seed.js';

// Clean up incomplete workouts that are older than 24 hours
function cleanupIncompleteWorkouts(): void {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = db.queryOne(
      "SELECT COUNT(*) as count FROM workouts WHERE is_complete = 0 AND created_at < $1",
      [oneDayAgo]
    );

    if (result && parseInt(result.count) > 0) {
      db.execute(
        "DELETE FROM workouts WHERE is_complete = 0 AND created_at < $1",
        [oneDayAgo]
      );
      console.log(`Cleaned up ${result.count} old incomplete workouts`);
    }
  } catch (error) {
    console.error('Error cleaning up incomplete workouts:', error);
  }
}
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

// ============ VALIDATION HELPERS ============

const VALID_EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio'] as const;
const VALID_MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio'] as const;

function validateNumber(val: unknown, min: number, max: number, fieldName: string): number {
  if (val === undefined || val === null) {
    throw new Error(`${fieldName} is required`);
  }
  const num = Number(val);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

function validateOptionalNumber(val: unknown, min: number, max: number, fieldName: string): number | null {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

function validateString(val: unknown, minLength: number, maxLength: number, fieldName: string): string {
  if (typeof val !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (val.length < minLength || val.length > maxLength) {
    throw new Error(`${fieldName} must be between ${minLength} and ${maxLength} characters`);
  }
  return val;
}

function validateEnum<T extends string>(val: unknown, allowed: readonly T[], fieldName: string): T {
  if (!allowed.includes(val as T)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return val as T;
}

function validateMuscleGroups(val: unknown): string[] {
  if (!Array.isArray(val) || val.length === 0 || val.length > 3) {
    throw new Error('primaryMuscles must be an array of 1-3 muscle groups');
  }
  for (const muscle of val) {
    validateEnum(muscle, VALID_MUSCLE_GROUPS, 'muscle group');
  }
  return val as string[];
}

// Database result types (snake_case from SQLite)
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

interface DbExercise {
  id: string;
  name: string;
  primary_muscles: string;
  equipment: string;
  is_custom: number;
  user_id?: string;
}

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

interface DbPersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  type: string;
  value: number;
  workout_id: string;
  achieved_at: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper to get user ID from header or default
async function getUserId(req: express.Request): Promise<string> {
  const userId = req.headers['x-user-id'] as string;
  if (userId) return userId;
  // Fallback to first user
  const firstUser = await db.queryOne<Pick<DbUser, 'id'>>('SELECT id FROM users ORDER BY created_at LIMIT 1');
  return firstUser?.id || '';
}

// ============ USER ROUTES ============

// List all profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await db.query<DbUser>('SELECT * FROM users ORDER BY created_at');
    res.json(profiles.map((user) => ({
      id: user.id,
      username: user.username,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      age: user.age,
      heightFeet: user.height_feet,
      heightInches: user.height_inches,
      bodyWeight: user.body_weight,
      fitnessGoal: user.fitness_goal ? (user.fitness_goal.startsWith('[') ? JSON.parse(user.fitness_goal) : [user.fitness_goal]) : undefined,
      experienceLevel: user.experience_level,
      bio: user.bio,
      createdAt: user.created_at,
    })));
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Create new profile
app.post('/api/profiles', async (req, res) => {
  const { username, displayName } = req.body;
  const id = uuidv4();

  try {
    await db.execute(
      `INSERT INTO users (id, username, preferred_unit, display_name)
       VALUES ($1, $2, 'lbs', $3)`,
      [id, username, displayName || username]
    );

    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Delete profile
app.delete('/api/profiles/:id', async (req, res) => {
  const profileId = req.params.id;

  try {
    // Use transaction to ensure atomic deletion of all related data
    db.transaction(() => {
      db.execute('DELETE FROM personal_records WHERE user_id = $1', [profileId]);
      db.execute(
        'DELETE FROM workout_sets WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = $1)',
        [profileId]
      );
      db.execute('DELETE FROM workouts WHERE user_id = $1', [profileId]);
      db.execute('DELETE FROM exercises WHERE user_id = $1', [profileId]);
      db.execute('DELETE FROM users WHERE id = $1', [profileId]);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// ============ AUTHENTICATION ROUTES ============

// Register new user with password
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, displayName } = req.body;

  // Validate inputs
  try {
    validateString(username, 2, 50, 'username');
    validateString(password, 6, 100, 'password');
    if (email) validateString(email, 5, 100, 'email');
    if (displayName) validateString(displayName, 1, 100, 'displayName');
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction to prevent race conditions on duplicate check
    const user = db.transaction(() => {
      // Check if username exists
      const existingUser = db.queryOne('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if email exists (if provided)
      if (email) {
        const existingEmail = db.queryOne('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail) {
          throw new Error('Email already registered');
        }
      }

      db.execute(
        `INSERT INTO users (id, username, email, password_hash, preferred_unit, display_name)
         VALUES ($1, $2, $3, $4, 'lbs', $5)`,
        [id, username, email || null, passwordHash, displayName || username]
      );

      return db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Username already exists' || message === 'Email already registered') {
      return res.status(400).json({ error: message });
    }
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await db.queryOne<DbUser>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // If user doesn't have a password set (legacy user), allow login and prompt to set password
    if (!user.password_hash) {
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        preferredUnit: user.preferred_unit,
        displayName: user.display_name,
        createdAt: user.created_at,
        needsPassword: true,
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Set password for existing user (for users who were created before password auth)
app.post('/api/auth/set-password', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and password are required' });
  }

  try {
    const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Reset password (forgot password flow)
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Find user by username or email
    const user = await db.queryOne<DbUser>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (!user) {
      return res.status(404).json({ error: 'No account found with that username' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
      displayName: user.display_name || user.username
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Update user email
app.patch('/api/auth/email', async (req, res) => {
  const userId = await getUserId(req);
  const { email } = req.body;

  try {
    // Check if email is already used
    if (email) {
      const existing = await db.queryOne(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    await db.execute('UPDATE users SET email = $1 WHERE id = $2', [email || null, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Change password
app.post('/api/auth/change-password', async (req, res) => {
  const userId = await getUserId(req);
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    if (user.password_hash) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.get('/api/user', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      age: user.age,
      heightFeet: user.height_feet,
      heightInches: user.height_inches,
      bodyWeight: user.body_weight,
      fitnessGoal: user.fitness_goal ? (user.fitness_goal.startsWith('[') ? JSON.parse(user.fitness_goal) : [user.fitness_goal]) : undefined,
      experienceLevel: user.experience_level,
      gender: user.gender,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.patch('/api/user', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { preferredUnit } = req.body;
    await db.execute('UPDATE users SET preferred_unit = $1 WHERE id = $2', [preferredUnit, userId]);
    const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    res.json(user);
    } catch (error) {
    console.error('Error updating user:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/user/profile', async (req, res) => {
  try {
    const userId = await getUserId(req);
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
    } = req.body;

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
        displayName || null,
        age || null,
        heightFeet || null,
        heightInches || null,
        bodyWeight || null,
        fitnessGoal ? JSON.stringify(fitnessGoal) : null,
        experienceLevel || null,
        gender || null,
        bio || null,
        preferredUnit || 'lbs',
        avatar || null,
        userId,
      ]
    );

    const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    res.json({
      id: user.id,
      username: user.username,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      age: user.age,
      heightFeet: user.height_feet,
      heightInches: user.height_inches,
      bodyWeight: user.body_weight,
      fitnessGoal: user.fitness_goal ? (user.fitness_goal.startsWith('[') ? JSON.parse(user.fitness_goal) : [user.fitness_goal]) : undefined,
      experienceLevel: user.experience_level,
      gender: user.gender,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============ EXERCISE ROUTES ============

app.get('/api/exercises', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { search, muscleGroup, equipment } = req.query;

    let query = 'SELECT * FROM exercises WHERE (is_custom = 0 OR user_id = $1)';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (search) {
      query += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (muscleGroup) {
      query += ` AND primary_muscles ILIKE $${paramIndex}`;
      params.push(`%${muscleGroup}%`);
      paramIndex++;
    }

    if (equipment) {
      query += ` AND equipment = $${paramIndex}`;
      params.push(equipment);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const exercises = await db.query(query, params);
    res.json(exercises.map((e: any) => ({
      ...e,
      primaryMuscles: JSON.parse(e.primary_muscles),
      isCustom: e.is_custom,
    })));
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

app.post('/api/exercises', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { name, primaryMuscles, equipment } = req.body;

    // Validate inputs
    try {
      validateString(name, 2, 100, 'name');
      validateMuscleGroups(primaryMuscles);
      validateEnum(equipment, VALID_EQUIPMENT, 'equipment');
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    const id = uuidv4();

    await db.execute(
      `INSERT INTO exercises (id, name, primary_muscles, equipment, is_custom, user_id)
       VALUES ($1, $2, $3, $4, true, $5)`,
      [id, name, JSON.stringify(primaryMuscles), equipment, userId]
    );

    const exercise = await db.queryOne('SELECT * FROM exercises WHERE id = $1', [id]);
    res.json({
      ...exercise,
      primaryMuscles: JSON.parse(exercise.primary_muscles),
      isCustom: true,
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// ============ WORKOUT ROUTES ============

app.get('/api/workouts', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { limit = 10, includeIncomplete } = req.query;

    let query = 'SELECT * FROM workouts WHERE user_id = $1';
    if (includeIncomplete !== 'true') {
      query += ' AND is_complete = 1';
    }
    query += ' ORDER BY date DESC LIMIT $2';

    const workouts = await db.query(query, [userId, Number(limit)]);
    res.json(workouts.map((w: any) => ({
      ...w,
      isComplete: w.is_complete,
    })));
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

app.get('/api/workouts/active', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const workout = await db.queryOne<DbWorkout & { sets: string }>(
      `SELECT w.*,
              JSON_GROUP_ARRAY(
                JSON_OBJECT(
                  'id', ws.id,
                  'workout_id', ws.workout_id,
                  'exercise_id', ws.exercise_id,
                  'set_number', ws.set_number,
                  'reps', ws.reps,
                  'weight', ws.weight,
                  'created_at', ws.created_at,
                  'exercise_name', e.name,
                  'primary_muscles', e.primary_muscles,
                  'equipment', e.equipment
                )
              ) as sets
       FROM workouts w
       LEFT JOIN workout_sets ws ON w.id = ws.workout_id
       LEFT JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.user_id = $1 AND w.is_complete = 0
       GROUP BY w.id
       ORDER BY w.created_at DESC LIMIT 1`,
      [userId]
    );

    if (!workout) {
      return res.json(null);
    }

    const sets = workout.sets === '[null]' ? [] : JSON.parse(workout.sets);

    res.json({
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      name: workout.name,
      duration: workout.duration,
      notes: workout.notes,
      isComplete: false,
      createdAt: workout.created_at,
      sets: sets.map((s: any) => ({
        ...s,
        primaryMuscles: JSON.parse(s.primary_muscles),
      })),
    });
  } catch (error) {
    console.error('Error fetching active workout:', error);
    res.status(500).json({ error: 'Failed to fetch active workout' });
  }
});

app.post('/api/workouts', async (req, res) => {
  let userId: string;
  try {
    userId = await getUserId(req);
    const { name, date: customDate, duration, isComplete } = req.body;
    const id = uuidv4();
    const date = customDate || new Date().toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO workouts (id, user_id, name, date, duration, is_complete)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, name || null, date, duration || null, isComplete ? 1 : 0]
    );

    const workout = await db.queryOne('SELECT * FROM workouts WHERE id = $1', [id]);
    res.json({ ...workout, isComplete: workout.is_complete, sets: [] });
  } catch (error) {
    console.error('Error creating workout:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body:', req.body);
    console.error('User ID:', userId);
    res.status(500).json({
      error: 'Failed to create workout',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/workouts/:id', async (req, res) => {
  try {
    const workout = await db.queryOne<DbWorkout & { sets: string }>(
      `SELECT w.*,
              JSON_GROUP_ARRAY(
                JSON_OBJECT(
                  'id', ws.id,
                  'workout_id', ws.workout_id,
                  'exercise_id', ws.exercise_id,
                  'set_number', ws.set_number,
                  'reps', ws.reps,
                  'weight', ws.weight,
                  'created_at', ws.created_at,
                  'exercise_name', e.name,
                  'primary_muscles', e.primary_muscles,
                  'equipment', e.equipment
                )
              ) as sets
       FROM workouts w
       LEFT JOIN workout_sets ws ON w.id = ws.workout_id
       LEFT JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.id = $1
       GROUP BY w.id`,
      [req.params.id]
    );

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const sets = workout.sets === '[null]' ? [] : JSON.parse(workout.sets);

    res.json({
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      name: workout.name,
      duration: workout.duration,
      notes: workout.notes,
      isComplete: workout.is_complete,
      createdAt: workout.created_at,
      sets: sets.map((s: any) => ({
        ...s,
        primaryMuscles: JSON.parse(s.primary_muscles),
      })),
    });
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

app.patch('/api/workouts/:id', async (req, res) => {
  try {
    const { name, notes, isComplete, duration } = req.body;
    const workout = await db.queryOne('SELECT * FROM workouts WHERE id = $1', [req.params.id]);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
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
      params.push(req.params.id);
      await db.execute(
        `UPDATE workouts SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
    }

    const updated = await db.queryOne('SELECT * FROM workouts WHERE id = $1', [req.params.id]);
    res.json({ ...updated, isComplete: updated.is_complete });
  } catch (error) {
    console.error('Error updating workout:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body:', req.body);
    console.error('Workout ID:', req.params.id);
    res.status(500).json({
      error: 'Failed to update workout',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear all workouts for the current user - MUST come before :id route
app.delete('/api/workouts', async (req, res) => {
  try {
    const userId = await getUserId(req);
    await db.execute('DELETE FROM workouts WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing workouts:', error);
    res.status(500).json({ error: 'Failed to clear workouts' });
  }
});

app.delete('/api/workouts/incomplete', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const result = db.queryOne(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = $1 AND is_complete = 0',
      [userId]
    );

    await db.execute('DELETE FROM workouts WHERE user_id = $1 AND is_complete = 0', [userId]);

    const deletedCount = parseInt(result?.count || '0');
    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} incomplete workouts`
    });
  } catch (error) {
    console.error('Error cleaning up incomplete workouts:', error);
    res.status(500).json({ error: 'Failed to clean up incomplete workouts' });
  }
});

app.delete('/api/workouts/:id', async (req, res) => {
  try {
    // Use transaction to ensure atomic deletion
    db.transaction(() => {
      db.execute('DELETE FROM workout_sets WHERE workout_id = $1', [req.params.id]);
      db.execute('DELETE FROM workouts WHERE id = $1', [req.params.id]);
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// ============ WORKOUT SET ROUTES ============

app.post('/api/workouts/:workoutId/sets', async (req, res) => {
  let userId: string;
  try {
    userId = await getUserId(req);
    const { exerciseId, setNumber } = req.body;

    // Validate inputs
    try {
      validateString(exerciseId, 1, 100, 'exerciseId');
      validateNumber(setNumber, 1, 100, 'setNumber');
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    // Validate optional numeric fields
    const validatedReps = validateOptionalNumber(req.body.reps, 1, 999, 'reps');
    const validatedWeight = validateOptionalNumber(req.body.weight, 0, 9999, 'weight');
    const validatedDuration = validateOptionalNumber(req.body.duration, 1, 999, 'duration');

    const id = uuidv4();

    await db.withTransaction(async () => {
      await db.execute(
        `INSERT INTO workout_sets (id, workout_id, exercise_id, set_number, reps, weight, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, req.params.workoutId, exerciseId, setNumber, validatedReps, validatedWeight, validatedDuration]
      );

      // Check for PRs (only for strength exercises)
      if (validatedReps && validatedWeight) {
        await checkAndUpdatePRs(userId, exerciseId, req.params.workoutId, validatedWeight, validatedReps);
      }
    });

    const set = await db.queryOne('SELECT * FROM workout_sets WHERE id = $1', [id]);
    res.json(set);
  } catch (error) {
    console.error('Error creating set:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body:', req.body);
    console.error('Workout ID:', req.params.workoutId);
    console.error('User ID:', userId);
    res.status(500).json({
      error: 'Failed to create set',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.patch('/api/sets/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { reps, weight } = req.body;
    const set = await db.queryOne('SELECT * FROM workout_sets WHERE id = $1', [req.params.id]);

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    await db.withTransaction(async () => {
      await db.execute(
        'UPDATE workout_sets SET reps = $1, weight = $2 WHERE id = $3',
        [reps, weight, req.params.id]
      );

      // Check for PRs after update
      await checkAndUpdatePRs(userId, set.exercise_id, set.workout_id, weight, reps);
    });

    const updated = await db.queryOne('SELECT * FROM workout_sets WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

app.delete('/api/sets/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM workout_sets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting set:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

// ============ EXERCISE HISTORY ROUTES ============

app.get('/api/exercises/:exerciseId/history', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { weeks = 8 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(weeks) * 7);

    const sessions = await db.query(
      `SELECT w.id as workout_id, w.date, ws.set_number, ws.reps, ws.weight
       FROM workouts w
       JOIN workout_sets ws ON w.id = ws.workout_id
       WHERE w.user_id = $1 AND ws.exercise_id = $2 AND w.is_complete = 1 AND w.date >= $3
       ORDER BY w.date DESC, ws.set_number`,
      [userId, req.params.exerciseId, startDate.toISOString().split('T')[0]]
    );

    // Group by workout
    const grouped: Record<string, any> = {};
    for (const row of sessions) {
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

    res.json({
      exerciseId: req.params.exerciseId,
      sessions: Object.values(grouped),
    });
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    res.status(500).json({ error: 'Failed to fetch exercise history' });
  }
});

app.get('/api/exercises/:exerciseId/previous', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const previousWorkout = await db.queryOne(
      `SELECT w.id, w.date
       FROM workouts w
       JOIN workout_sets ws ON w.id = ws.workout_id
       WHERE w.user_id = $1 AND ws.exercise_id = $2 AND w.is_complete = 1
       GROUP BY w.id, w.date
       ORDER BY w.date DESC
       LIMIT 1`,
      [userId, req.params.exerciseId]
    );

    if (!previousWorkout) {
      return res.json({ sets: [] });
    }

    const sets = await db.query(
      `SELECT * FROM workout_sets
       WHERE workout_id = $1 AND exercise_id = $2
       ORDER BY set_number`,
      [previousWorkout.id, req.params.exerciseId]
    );

    res.json({
      date: previousWorkout.date,
      sets,
    });
  } catch (error) {
    console.error('Error fetching previous exercise:', error);
    res.status(500).json({ error: 'Failed to fetch previous exercise' });
  }
});

// ============ PERSONAL RECORDS ROUTES ============

app.get('/api/personal-records', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { limit = 5 } = req.query;

    const prs = await db.query(
      `SELECT pr.*, e.name as exercise_name
       FROM personal_records pr
       JOIN exercises e ON pr.exercise_id = e.id
       WHERE pr.user_id = $1
       ORDER BY pr.achieved_at DESC
       LIMIT $2`,
      [userId, Number(limit)]
    );

    res.json(prs.map((pr: any) => ({
      ...pr,
      exerciseName: pr.exercise_name,
    })));
  } catch (error) {
    console.error('Error fetching PRs:', error);
    res.status(500).json({ error: 'Failed to fetch PRs' });
  }
});

async function checkAndUpdatePRs(
  userId: string,
  exerciseId: string,
  workoutId: string,
  weight: number,
  reps: number
) {
  // Check max weight PR
  const currentMaxWeight = await db.queryOne(
    `SELECT value FROM personal_records
     WHERE user_id = $1 AND exercise_id = $2 AND type = 'max_weight'`,
    [userId, exerciseId]
  );

  if (!currentMaxWeight || weight > currentMaxWeight.value) {
    const existingPR = await db.queryOne(
      `SELECT id FROM personal_records WHERE user_id = $1 AND exercise_id = $2 AND type = 'max_weight'`,
      [userId, exerciseId]
    );

    if (existingPR) {
      await db.execute(
        `UPDATE personal_records SET value = $1, workout_id = $2, achieved_at = NOW()
         WHERE id = $3`,
        [weight, workoutId, existingPR.id]
      );
    } else {
      await db.execute(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, value, workout_id)
         VALUES ($1, $2, $3, 'max_weight', $4, $5)`,
        [uuidv4(), userId, exerciseId, weight, workoutId]
      );
    }
  }

  // Check max volume PR
  const volume = weight * reps;
  const currentMaxVolume = await db.queryOne(
    `SELECT value FROM personal_records
     WHERE user_id = $1 AND exercise_id = $2 AND type = 'max_volume'`,
    [userId, exerciseId]
  );

  if (!currentMaxVolume || volume > currentMaxVolume.value) {
    const existingPR = await db.queryOne(
      `SELECT id FROM personal_records WHERE user_id = $1 AND exercise_id = $2 AND type = 'max_volume'`,
      [userId, exerciseId]
    );

    if (existingPR) {
      await db.execute(
        `UPDATE personal_records SET value = $1, workout_id = $2, achieved_at = NOW()
         WHERE id = $3`,
        [volume, workoutId, existingPR.id]
      );
    } else {
      await db.execute(
        `INSERT INTO personal_records (id, user_id, exercise_id, type, value, workout_id)
         VALUES ($1, $2, $3, 'max_volume', $4, $5)`,
        [uuidv4(), userId, exerciseId, volume, workoutId]
      );
    }
  }
}

// ============ DASHBOARD / STATS ROUTES ============

app.get('/api/dashboard', async (req, res) => {
  try {
    const userId = await getUserId(req);

    // Get streak
    const streak = await calculateStreak(userId);

    // Weekly workout count
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weeklyCountResult = await db.queryOne(
      `SELECT COUNT(*) as count FROM workouts
       WHERE user_id = $1 AND is_complete = 1 AND date >= $2`,
      [userId, weekStart.toISOString().split('T')[0]]
    );

    // Recent workouts
    const recentWorkouts = await db.query(
      `SELECT * FROM workouts
       WHERE user_id = $1 AND is_complete = 1
       ORDER BY date DESC LIMIT 3`,
      [userId]
    );

    // Recent PRs
    const recentPRs = await db.query(
      `SELECT pr.*, e.name as exercise_name
       FROM personal_records pr
       JOIN exercises e ON pr.exercise_id = e.id
       WHERE pr.user_id = $1
       ORDER BY pr.achieved_at DESC
       LIMIT 5`,
      [userId]
    );

    // Weekly muscle group distribution
    const weeklyMuscles = await db.query(
      `SELECT e.primary_muscles, SUM(ws.reps * ws.weight) as volume, COUNT(*) as sets
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.user_id = $1 AND w.is_complete = 1 AND w.date >= $2
       GROUP BY e.primary_muscles`,
      [userId, weekStart.toISOString().split('T')[0]]
    );

    const muscleGroupVolumes = calculateMuscleGroupVolumes(weeklyMuscles);

    res.json({
      streak,
      weeklyWorkoutCount: parseInt(weeklyCountResult?.count || '0'),
      recentWorkouts: recentWorkouts.map((w: any) => ({ ...w, isComplete: true })),
      recentPRs: recentPRs.map((pr: any) => ({ ...pr, exerciseName: pr.exercise_name })),
      weeklyMuscleGroups: muscleGroupVolumes,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

app.get('/api/stats/muscle-groups', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const { period = 'week' } = req.query;

    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const data = await db.query(
      `SELECT e.primary_muscles, SUM(ws.reps * ws.weight) as volume, COUNT(*) as sets
       FROM workout_sets ws
       JOIN workouts w ON ws.workout_id = w.id
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE w.user_id = $1 AND w.is_complete = 1 AND w.date >= $2
       GROUP BY e.primary_muscles`,
      [userId, startDate.toISOString().split('T')[0]]
    );

    const muscleGroupVolumes = calculateMuscleGroupVolumes(data);

    // Check for imbalances
    const imbalances = checkImbalances(muscleGroupVolumes);

    res.json({
      muscleGroups: muscleGroupVolumes,
      imbalances,
    });
  } catch (error) {
    console.error('Error fetching muscle groups:', error);
    res.status(500).json({ error: 'Failed to fetch muscle groups' });
  }
});

async function calculateStreak(userId: string): Promise<number> {
  const workouts = await db.query(
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

    const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }

  return streak;
}

function calculateMuscleGroupVolumes(data: { primary_muscles: string; volume: string; sets: string }[]) {
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

  return Object.entries(muscleGroups).map(([muscleGroup, data]) => ({
    muscleGroup,
    volume: Math.round(data.volume),
    sets: Math.round(data.sets),
    percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
  })).sort((a, b) => b.volume - a.volume);
}

function checkImbalances(muscleGroups: { muscleGroup: string; volume: number }[]) {
  const imbalances: { warning: string; muscleGroup1: string; muscleGroup2: string }[] = [];

  // Check push/pull imbalance (Chest vs Back)
  const chest = muscleGroups.find(m => m.muscleGroup === 'Chest');
  const back = muscleGroups.find(m => m.muscleGroup === 'Back');

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

  // Check quads vs hamstrings
  const quads = muscleGroups.find(m => m.muscleGroup === 'Quads');
  const hamstrings = muscleGroups.find(m => m.muscleGroup === 'Hamstrings');

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
}

// Initialize database and start server
function startServer() {
  try {
    initializeDatabase();
    seedExercises();
    createDefaultUser();
    cleanupIncompleteWorkouts();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      closeDatabase();
      process.exit(0);
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

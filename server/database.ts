import pg from 'pg';

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'workout_db',
  user: process.env.PGUSER || process.env.USER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        preferred_unit TEXT DEFAULT 'lbs' CHECK (preferred_unit IN ('kg', 'lbs')),
        created_at TIMESTAMP DEFAULT NOW(),
        display_name TEXT,
        age INTEGER,
        height_feet INTEGER,
        height_inches INTEGER,
        body_weight REAL,
        fitness_goal TEXT,
        experience_level TEXT CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced')),
        gender TEXT,
        bio TEXT
      );

      -- Exercises table (pre-populated + custom)
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_muscles TEXT NOT NULL,
        equipment TEXT NOT NULL CHECK (equipment IN ('Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio')),
        is_custom BOOLEAN DEFAULT FALSE,
        user_id TEXT REFERENCES users(id)
      );

      -- Workouts table
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT,
        date TEXT NOT NULL,
        duration INTEGER,
        notes TEXT,
        is_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Workout sets table
      CREATE TABLE IF NOT EXISTS workout_sets (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Personal records table
      CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        type TEXT NOT NULL CHECK (type IN ('max_weight', 'max_volume', 'max_reps')),
        value REAL NOT NULL,
        workout_id TEXT NOT NULL REFERENCES workouts(id),
        achieved_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
    `);
    console.log('Database schema initialized');
  } finally {
    client.release();
  }
}

// Helper functions to match better-sqlite3 API style
export const db = {
  query: async (text: string, params?: any[]) => {
    const result = await pool.query(text, params);
    return result.rows;
  },

  queryOne: async (text: string, params?: any[]) => {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  },

  execute: async (text: string, params?: any[]) => {
    await pool.query(text, params);
  },

  pool,
};

export default db;

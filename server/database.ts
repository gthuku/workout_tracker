import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use SQLite for simple local development
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'workout.db');
const sqlite = new Database(dbPath);

console.log(`Using SQLite database at: ${dbPath}`);

// Initialize database schema
export function initializeDatabase(): void {
  sqlite.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      preferred_unit TEXT DEFAULT 'lbs' CHECK (preferred_unit IN ('kg', 'lbs')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      is_custom INTEGER DEFAULT 0,
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
      is_complete INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Workout sets table
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Personal records table
    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      type TEXT NOT NULL CHECK (type IN ('max_weight', 'max_volume', 'max_reps')),
      value REAL NOT NULL,
      workout_id TEXT NOT NULL REFERENCES workouts(id),
      achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN email TEXT UNIQUE`);
  } catch {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  } catch {
    // Column already exists
  }

  console.log('Database schema initialized');
}

// Convert PostgreSQL-style parameters ($1, $2, etc.) to SQLite-style (?)
function convertParams(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

// Convert ILIKE to LIKE (SQLite uses LIKE which is case-insensitive by default for ASCII)
function convertSql(sql: string): string {
  let converted = convertParams(sql);
  // SQLite doesn't support ILIKE, but LIKE is case-insensitive for ASCII
  converted = converted.replace(/ILIKE/gi, 'LIKE');
  // SQLite doesn't support NOW(), use CURRENT_TIMESTAMP instead
  converted = converted.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
  return converted;
}

// Helper functions for database operations
export const db = {
  query: (sql: string, params?: any[]): any[] => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    return params ? stmt.all(...params) : stmt.all();
  },

  queryOne: (sql: string, params?: any[]): any | null => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    return params ? stmt.get(...params) : stmt.get();
  },

  execute: (sql: string, params?: any[]): void => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    if (params) {
      stmt.run(...params);
    } else {
      stmt.run();
    }
  },

  // For compatibility with prepared statements
  prepare: (sql: string) => sqlite.prepare(convertSql(sql)),
};

export default db;

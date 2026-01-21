import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use SQLite for simple local development
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'workout.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for concurrent writes and performance optimizations
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA synchronous = NORMAL');
sqlite.exec('PRAGMA cache_size = -64000');
sqlite.exec('PRAGMA foreign_keys = ON');
sqlite.exec('PRAGMA temp_store = MEMORY');

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
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        reps INTEGER CHECK (reps > 0),
        weight REAL CHECK (weight >= 0),
        duration INTEGER CHECK (duration > 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workout_id, exercise_id, set_number)
      );

     -- Personal records table
     CREATE TABLE IF NOT EXISTS personal_records (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
       type TEXT NOT NULL CHECK (type IN ('max_weight', 'max_volume', 'max_reps')),
       value REAL NOT NULL,
       workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
       achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, exercise_id, type)
     );

     -- Create indexes for performance
     CREATE INDEX IF NOT EXISTS idx_workouts_user_complete ON workouts(user_id, is_complete);
     CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise ON workout_sets(workout_id, exercise_id);
     CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
     CREATE INDEX IF NOT EXISTS idx_personal_records_user_type ON personal_records(user_id, type);
     CREATE INDEX IF NOT EXISTS idx_exercises_custom ON exercises(user_id, is_custom) WHERE user_id IS NOT NULL;
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
  query: <T = unknown>(sql: string, params?: unknown[]): T[] => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  },

  queryOne: <T = unknown>(sql: string, params?: unknown[]): T | null => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    return (params ? stmt.get(...params) : stmt.get()) as T | null;
  },

  execute: (sql: string, params?: unknown[]): void => {
    const convertedSql = convertSql(sql);
    const stmt = sqlite.prepare(convertedSql);
    if (params) {
      stmt.run(...params);
    } else {
      stmt.run();
    }
  },

  withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
      const result = await fn();
      sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },

  transaction: <T>(fn: () => T): T => {
    const transaction = sqlite.transaction(fn);
    return transaction();
  },

  // For compatibility with prepared statements
  prepare: (sql: string) => sqlite.prepare(convertSql(sql)),
};

// Graceful database shutdown
export function closeDatabase(): void {
  try {
    sqlite.close();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

export default db;

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

// ============ SQLITE CONFIGURATION ============
const __dirname = typeof import.meta?.url === 'string'
  ? path.dirname(fileURLToPath(import.meta.url))
  : process.cwd();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'workout.db');
let sqlite: Database.Database | null = null;

// ============ DATABASE INTERFACE ============
interface DbInterface {
  query: <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;
  queryOne: <T = unknown>(sql: string, params?: unknown[]) => Promise<T | null>;
  execute: (sql: string, params?: unknown[]) => Promise<void>;
  transaction: <T>(fn: () => T) => T;
  withTransaction: <T>(fn: () => Promise<T>) => Promise<T>;
}

// Convert $1, $2 style params to ? for SQLite
function convertParams(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

function createDb(): DbInterface {
  sqlite = new Database(dbPath);

  // Enable performance optimizations
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA synchronous = NORMAL');
  sqlite.exec('PRAGMA cache_size = -64000');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('PRAGMA temp_store = MEMORY');

  return {
    query: async <T = unknown>(sql: string, params?: unknown[]): Promise<T[]> => {
      const stmt = sqlite!.prepare(convertParams(sql));
      return (params ? stmt.all(...params) : stmt.all()) as T[];
    },

    queryOne: async <T = unknown>(sql: string, params?: unknown[]): Promise<T | null> => {
      const stmt = sqlite!.prepare(convertParams(sql));
      return (params ? stmt.get(...params) : stmt.get()) as T | null;
    },

    execute: async (sql: string, params?: unknown[]): Promise<void> => {
      const stmt = sqlite!.prepare(convertParams(sql));
      if (params) {
        stmt.run(...params);
      } else {
        stmt.run();
      }
    },

    transaction: <T>(fn: () => T): T => {
      const transaction = sqlite!.transaction(fn);
      return transaction();
    },

    withTransaction: async <T>(fn: () => Promise<T>): Promise<T> => {
      try {
        sqlite!.exec('BEGIN IMMEDIATE TRANSACTION');
        const result = await fn();
        sqlite!.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite!.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

// ============ SCHEMA ============
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    preferred_unit TEXT DEFAULT 'lbs' CHECK (preferred_unit IN ('kg', 'lbs')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_name TEXT,
    age INTEGER,
    height_feet INTEGER,
    height_inches INTEGER,
    body_weight REAL,
    fitness_goal TEXT,
    experience_level TEXT CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced')),
    gender TEXT,
    bio TEXT,
    avatar TEXT
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscles TEXT NOT NULL,
    equipment TEXT NOT NULL CHECK (equipment IN ('Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio')),
    is_custom INTEGER DEFAULT 0,
    user_id TEXT REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT,
    date TEXT NOT NULL,
    duration INTEGER,
    notes TEXT,
    is_complete INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER CHECK (reps > 0),
    weight REAL CHECK (weight >= 0),
    duration INTEGER CHECK (duration > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workout_id, exercise_id, set_number)
  );

  CREATE TABLE IF NOT EXISTS personal_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('max_weight', 'max_volume', 'max_reps')),
    value REAL NOT NULL,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id, type)
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_workouts_user_complete ON workouts(user_id, is_complete);
  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise ON workout_sets(workout_id, exercise_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_personal_records_user_type ON personal_records(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
`;

// ============ INITIALIZE DATABASE ============
let db: DbInterface;

export async function initializeDatabase(): Promise<void> {
  logger.info({ path: dbPath }, 'Initializing SQLite database');
  db = createDb();

  // Create schema
  const statements = SCHEMA_SQL.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      await db.execute(stmt);
    }
  }

  // Create indexes
  const indexStatements = INDEXES_SQL.split(';').filter(s => s.trim());
  for (const stmt of indexStatements) {
    if (stmt.trim()) {
      try {
        await db.execute(stmt);
      } catch {
        // Index already exists
      }
    }
  }

  // Add missing columns for existing databases (migrations)
  const alterStatements = [
    'ALTER TABLE users ADD COLUMN email TEXT UNIQUE',
    'ALTER TABLE users ADD COLUMN password_hash TEXT',
    'ALTER TABLE users ADD COLUMN avatar TEXT',
  ];

  for (const stmt of alterStatements) {
    try {
      await db.execute(stmt);
    } catch {
      // Column already exists
    }
  }

  logger.info('Database initialized');
}

export async function closeDatabase(): Promise<void> {
  if (sqlite) {
    sqlite.close();
    logger.info('Database connection closed');
  }
}

export { db };
export default db;

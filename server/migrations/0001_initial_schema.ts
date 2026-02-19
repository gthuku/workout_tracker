import type Database from 'better-sqlite3';

export const name = '0001_initial_schema';

export function up(db: Database.Database): void {
  // Users table
  db.exec(`
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
    )
  `);

  // Exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_muscles TEXT NOT NULL,
      equipment TEXT NOT NULL CHECK (equipment IN ('Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Cardio')),
      is_custom INTEGER DEFAULT 0,
      user_id TEXT REFERENCES users(id)
    )
  `);

  // Workouts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT,
      date TEXT NOT NULL,
      duration INTEGER,
      notes TEXT,
      is_complete INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Workout sets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      performed_at_ms INTEGER,
      reps INTEGER CHECK (reps > 0),
      weight REAL CHECK (weight >= 0),
      duration INTEGER CHECK (duration > 0),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workout_id, exercise_id, set_number)
    )
  `);

  // Personal records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('max_weight', 'max_volume', 'max_reps')),
      value REAL NOT NULL,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, exercise_id, type)
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_workouts_user_complete ON workouts(user_id, is_complete)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise ON workout_sets(workout_id, exercise_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_performed ON workout_sets(workout_id, performed_at_ms, created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_personal_records_user_type ON personal_records(user_id, type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)`);
}

export function down(db: Database.Database): void {
  // Drop indexes
  db.exec(`DROP INDEX IF EXISTS idx_password_reset_tokens_user`);
  db.exec(`DROP INDEX IF EXISTS idx_personal_records_user_type`);
  db.exec(`DROP INDEX IF EXISTS idx_workout_sets_exercise`);
  db.exec(`DROP INDEX IF EXISTS idx_workout_sets_workout_exercise`);
  db.exec(`DROP INDEX IF EXISTS idx_workout_sets_workout_performed`);
  db.exec(`DROP INDEX IF EXISTS idx_workouts_user_date`);
  db.exec(`DROP INDEX IF EXISTS idx_workouts_user_complete`);

  // Drop tables in reverse order of creation (respecting foreign keys)
  db.exec(`DROP TABLE IF EXISTS password_reset_tokens`);
  db.exec(`DROP TABLE IF EXISTS personal_records`);
  db.exec(`DROP TABLE IF EXISTS workout_sets`);
  db.exec(`DROP TABLE IF EXISTS workouts`);
  db.exec(`DROP TABLE IF EXISTS exercises`);
  db.exec(`DROP TABLE IF EXISTS users`);
}

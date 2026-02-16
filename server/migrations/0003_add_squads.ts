import type Database from 'better-sqlite3';

export const name = '0003_add_squads';

export function up(db: Database.Database): void {
  // Squads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Squad members
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_members (
      id TEXT PRIMARY KEY,
      squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(squad_id, user_id)
    )
  `);

  // Squad invites
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_invites (
      id TEXT PRIMARY KEY,
      squad_id TEXT NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
      invited_by TEXT NOT NULL REFERENCES users(id),
      invited_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(squad_id, invited_user_id)
    )
  `);

  // Squad reactions on workouts
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_reactions (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      reactor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'clap', 'eyes')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workout_id, reactor_user_id, reaction_type)
    )
  `);

  // Indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_squad_members_squad ON squad_members(squad_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_squad_members_user ON squad_members(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_squad_invites_user ON squad_invites(invited_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_squad_reactions_workout ON squad_reactions(workout_id)`);
}

export function down(db: Database.Database): void {
  db.exec(`DROP INDEX IF EXISTS idx_squad_reactions_workout`);
  db.exec(`DROP INDEX IF EXISTS idx_squad_invites_user`);
  db.exec(`DROP INDEX IF EXISTS idx_squad_members_user`);
  db.exec(`DROP INDEX IF EXISTS idx_squad_members_squad`);
  db.exec(`DROP TABLE IF EXISTS squad_reactions`);
  db.exec(`DROP TABLE IF EXISTS squad_invites`);
  db.exec(`DROP TABLE IF EXISTS squad_members`);
  db.exec(`DROP TABLE IF EXISTS squads`);
}

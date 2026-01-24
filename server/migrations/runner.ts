import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Migration {
  id: number;
  name: string;
  applied_at: string;
}

interface MigrationFile {
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrationsDir: string;

  constructor(dbPath: string, migrationsDir?: string) {
    this.db = new Database(dbPath);
    this.migrationsDir = migrationsDir || __dirname;
    this.ensureMigrationsTable();
  }

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getAppliedMigrations(): string[] {
    const rows = this.db.prepare('SELECT name FROM migrations ORDER BY id').all() as Migration[];
    return rows.map(r => r.name);
  }

  private async getMigrationFiles(): Promise<string[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.match(/^\d{4}_.*\.ts$/) || f.match(/^\d{4}_.*\.js$/))
      .sort();
    return files;
  }

  async migrate(): Promise<{ applied: string[]; pending: string[] }> {
    const applied = this.getAppliedMigrations();
    const files = await this.getMigrationFiles();
    const pending = files.filter(f => !applied.includes(f.replace(/\.(ts|js)$/, '')));
    const newlyApplied: string[] = [];

    for (const file of pending) {
      const migrationPath = path.join(this.migrationsDir, file);
      const migration: MigrationFile = await import(migrationPath);
      const name = file.replace(/\.(ts|js)$/, '');

      console.log(`Applying migration: ${name}`);

      try {
        this.db.exec('BEGIN TRANSACTION');
        migration.up(this.db);
        this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
        this.db.exec('COMMIT');
        newlyApplied.push(name);
        console.log(`  ✓ Applied: ${name}`);
      } catch (error) {
        this.db.exec('ROLLBACK');
        console.error(`  ✗ Failed: ${name}`, error);
        throw error;
      }
    }

    return { applied: newlyApplied, pending: pending.map(f => f.replace(/\.(ts|js)$/, '')) };
  }

  async rollback(steps: number = 1): Promise<string[]> {
    const applied = this.getAppliedMigrations();
    const toRollback = applied.slice(-steps).reverse();
    const rolledBack: string[] = [];

    for (const name of toRollback) {
      const files = await this.getMigrationFiles();
      const file = files.find(f => f.startsWith(name) || f.replace(/\.(ts|js)$/, '') === name);

      if (!file) {
        console.error(`Migration file not found for: ${name}`);
        continue;
      }

      const migrationPath = path.join(this.migrationsDir, file);
      const migration: MigrationFile = await import(migrationPath);

      console.log(`Rolling back migration: ${name}`);

      try {
        this.db.exec('BEGIN TRANSACTION');
        migration.down(this.db);
        this.db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
        this.db.exec('COMMIT');
        rolledBack.push(name);
        console.log(`  ✓ Rolled back: ${name}`);
      } catch (error) {
        this.db.exec('ROLLBACK');
        console.error(`  ✗ Failed to rollback: ${name}`, error);
        throw error;
      }
    }

    return rolledBack;
  }

  status(): { applied: string[]; pending: string[] } {
    const applied = this.getAppliedMigrations();
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.match(/^\d{4}_.*\.(ts|js)$/))
      .map(f => f.replace(/\.(ts|js)$/, ''))
      .sort();
    const pending = files.filter(f => !applied.includes(f));

    return { applied, pending };
  }

  close(): void {
    this.db.close();
  }
}

// CLI runner
async function main() {
  const command = process.argv[2];
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'workout.db');

  console.log(`Database: ${dbPath}`);
  console.log(`Migrations directory: ${__dirname}`);
  console.log('');

  const runner = new MigrationRunner(dbPath);

  try {
    switch (command) {
      case 'up':
      case 'migrate': {
        const result = await runner.migrate();
        if (result.applied.length === 0) {
          console.log('No pending migrations.');
        } else {
          console.log(`\nApplied ${result.applied.length} migration(s).`);
        }
        break;
      }

      case 'down':
      case 'rollback': {
        const steps = parseInt(process.argv[3] || '1', 10);
        const rolledBack = await runner.rollback(steps);
        if (rolledBack.length === 0) {
          console.log('No migrations to rollback.');
        } else {
          console.log(`\nRolled back ${rolledBack.length} migration(s).`);
        }
        break;
      }

      case 'status': {
        const status = runner.status();
        console.log('Applied migrations:');
        if (status.applied.length === 0) {
          console.log('  (none)');
        } else {
          status.applied.forEach(m => console.log(`  ✓ ${m}`));
        }
        console.log('\nPending migrations:');
        if (status.pending.length === 0) {
          console.log('  (none)');
        } else {
          status.pending.forEach(m => console.log(`  ○ ${m}`));
        }
        break;
      }

      default:
        console.log('Usage: tsx server/migrations/runner.ts <command>');
        console.log('');
        console.log('Commands:');
        console.log('  migrate, up     Apply pending migrations');
        console.log('  rollback, down  Rollback last migration (or specify number)');
        console.log('  status          Show migration status');
        process.exit(1);
    }
  } finally {
    runner.close();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

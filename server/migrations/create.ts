import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getNextMigrationNumber(): string {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.match(/^\d{4}_.*\.(ts|js)$/))
    .sort();

  if (files.length === 0) {
    return '0001';
  }

  const lastFile = files[files.length - 1];
  const lastNumber = parseInt(lastFile.slice(0, 4), 10);
  return String(lastNumber + 1).padStart(4, '0');
}

function createMigration(name: string): void {
  const number = getNextMigrationNumber();
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const fileName = `${number}_${safeName}.ts`;
  const filePath = path.join(__dirname, fileName);

  const template = `import type Database from 'better-sqlite3';

export const name = '${number}_${safeName}';

export function up(db: Database.Database): void {
  // Add your migration SQL here
  // Example:
  // db.exec(\`
  //   ALTER TABLE users ADD COLUMN new_field TEXT
  // \`);
}

export function down(db: Database.Database): void {
  // Add rollback SQL here
  // Example:
  // db.exec(\`
  //   ALTER TABLE users DROP COLUMN new_field
  // \`);
}
`;

  fs.writeFileSync(filePath, template);
  console.log(`Created migration: ${fileName}`);
}

// CLI
const name = process.argv[2];
if (!name) {
  console.log('Usage: tsx server/migrations/create.ts <migration_name>');
  console.log('');
  console.log('Example: tsx server/migrations/create.ts add_user_preferences');
  process.exit(1);
}

createMigration(name);

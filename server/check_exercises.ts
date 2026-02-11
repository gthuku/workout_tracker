
import { db } from './database.js';
import { initializeDatabase } from './database.js';

async function checkExercises() {
    await initializeDatabase();
    const exercises = await db.query('SELECT name FROM exercises LIMIT 10');
    console.log(JSON.stringify(exercises, null, 2));
    process.exit(0);
}

checkExercises().catch(console.error);

import { initializeDatabase, db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

async function seedTestUser() {
  await initializeDatabase();

  // Check if test user already exists
  let userId: string;
  const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE username = $1', ['testuser']);
  if (existing) {
    userId = existing.id;
    console.log('Test user already exists:', userId);

    // Check if they already have workouts
    const workoutCount = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM workouts WHERE user_id = $1', [userId]);
    if (workoutCount && workoutCount.count > 0) {
      console.log(`Test user already has ${workoutCount.count} workouts. Skipping.`);
      process.exit(0);
    }
  } else {
    userId = uuidv4();
    await db.execute(
      `INSERT INTO users (id, username, display_name, preferred_unit, experience_level, bio)
       VALUES ($1, 'testuser', 'Test User', 'lbs', 'intermediate', 'Test account for squad features')`,
      [userId]
    );
    console.log('Created test user:', userId);
  }

  // Get exercises by name
  const getExercise = async (name: string) => {
    const ex = await db.queryOne<{ id: string }>('SELECT id FROM exercises WHERE name = $1', [name]);
    if (!ex) throw new Error(`Exercise not found: ${name}`);
    return ex.id;
  };

  const exercises = {
    benchPress: await getExercise('Bench Press'),
    squat: await getExercise('Squat'),
    deadlift: await getExercise('Deadlift'),
    overheadPress: await getExercise('Overhead Press'),
    barbellRow: await getExercise('Barbell Row'),
    latPulldown: await getExercise('Lat Pulldown'),
    legPress: await getExercise('Leg Press'),
    dumbbellCurl: await getExercise('Dumbbell Curl'),
    tricepPushdown: await getExercise('Tricep Pushdown'),
    lateralRaise: await getExercise('Lateral Raise'),
    romanianDeadlift: await getExercise('Romanian Deadlift'),
    inclineBench: await getExercise('Incline Bench Press'),
    cableFlyes: await getExercise('Cable Flyes'),
    legExtension: await getExercise('Leg Extension'),
    legCurl: await getExercise('Leg Curl'),
  };

  // Define 10 workouts over the past month
  const today = new Date();
  const workouts = [
    {
      name: 'Push Day',
      daysAgo: 1,
      duration: 65,
      exercises: [
        { id: exercises.benchPress, sets: [{ w: 185, r: 8 }, { w: 185, r: 7 }, { w: 175, r: 8 }, { w: 175, r: 7 }] },
        { id: exercises.overheadPress, sets: [{ w: 115, r: 8 }, { w: 115, r: 7 }, { w: 105, r: 8 }] },
        { id: exercises.lateralRaise, sets: [{ w: 25, r: 12 }, { w: 25, r: 12 }, { w: 25, r: 10 }] },
        { id: exercises.tricepPushdown, sets: [{ w: 60, r: 12 }, { w: 60, r: 10 }, { w: 55, r: 12 }] },
      ],
    },
    {
      name: 'Pull Day',
      daysAgo: 3,
      duration: 70,
      exercises: [
        { id: exercises.deadlift, sets: [{ w: 275, r: 5 }, { w: 275, r: 5 }, { w: 275, r: 4 }] },
        { id: exercises.barbellRow, sets: [{ w: 155, r: 8 }, { w: 155, r: 8 }, { w: 145, r: 8 }] },
        { id: exercises.latPulldown, sets: [{ w: 140, r: 10 }, { w: 140, r: 9 }, { w: 130, r: 10 }] },
        { id: exercises.dumbbellCurl, sets: [{ w: 35, r: 10 }, { w: 35, r: 9 }, { w: 30, r: 12 }] },
      ],
    },
    {
      name: 'Leg Day',
      daysAgo: 5,
      duration: 75,
      exercises: [
        { id: exercises.squat, sets: [{ w: 225, r: 6 }, { w: 225, r: 6 }, { w: 215, r: 6 }, { w: 205, r: 8 }] },
        { id: exercises.legPress, sets: [{ w: 360, r: 10 }, { w: 360, r: 10 }, { w: 360, r: 8 }] },
        { id: exercises.romanianDeadlift, sets: [{ w: 185, r: 10 }, { w: 185, r: 10 }, { w: 185, r: 8 }] },
        { id: exercises.legExtension, sets: [{ w: 120, r: 12 }, { w: 120, r: 12 }, { w: 110, r: 12 }] },
      ],
    },
    {
      name: 'Upper Body',
      daysAgo: 7,
      duration: 60,
      exercises: [
        { id: exercises.inclineBench, sets: [{ w: 155, r: 8 }, { w: 155, r: 7 }, { w: 145, r: 8 }] },
        { id: exercises.barbellRow, sets: [{ w: 150, r: 8 }, { w: 150, r: 8 }, { w: 140, r: 9 }] },
        { id: exercises.cableFlyes, sets: [{ w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 10 }] },
        { id: exercises.dumbbellCurl, sets: [{ w: 30, r: 12 }, { w: 30, r: 10 }, { w: 30, r: 10 }] },
      ],
    },
    {
      name: 'Push Day',
      daysAgo: 10,
      duration: 55,
      exercises: [
        { id: exercises.benchPress, sets: [{ w: 180, r: 8 }, { w: 180, r: 8 }, { w: 170, r: 9 }] },
        { id: exercises.overheadPress, sets: [{ w: 110, r: 8 }, { w: 110, r: 7 }, { w: 105, r: 8 }] },
        { id: exercises.tricepPushdown, sets: [{ w: 55, r: 12 }, { w: 55, r: 12 }, { w: 55, r: 10 }] },
      ],
    },
    {
      name: 'Pull Day',
      daysAgo: 12,
      duration: 65,
      exercises: [
        { id: exercises.deadlift, sets: [{ w: 265, r: 5 }, { w: 265, r: 5 }, { w: 255, r: 6 }] },
        { id: exercises.latPulldown, sets: [{ w: 135, r: 10 }, { w: 135, r: 10 }, { w: 125, r: 12 }] },
        { id: exercises.barbellRow, sets: [{ w: 145, r: 8 }, { w: 145, r: 8 }, { w: 135, r: 10 }] },
      ],
    },
    {
      name: 'Leg Day',
      daysAgo: 15,
      duration: 70,
      exercises: [
        { id: exercises.squat, sets: [{ w: 220, r: 6 }, { w: 220, r: 6 }, { w: 210, r: 7 }] },
        { id: exercises.legPress, sets: [{ w: 350, r: 10 }, { w: 350, r: 10 }, { w: 340, r: 10 }] },
        { id: exercises.legCurl, sets: [{ w: 90, r: 12 }, { w: 90, r: 10 }, { w: 85, r: 12 }] },
        { id: exercises.legExtension, sets: [{ w: 115, r: 12 }, { w: 115, r: 12 }, { w: 110, r: 12 }] },
      ],
    },
    {
      name: 'Push Day',
      daysAgo: 18,
      duration: 60,
      exercises: [
        { id: exercises.benchPress, sets: [{ w: 175, r: 8 }, { w: 175, r: 8 }, { w: 165, r: 10 }] },
        { id: exercises.inclineBench, sets: [{ w: 145, r: 8 }, { w: 145, r: 8 }, { w: 135, r: 10 }] },
        { id: exercises.lateralRaise, sets: [{ w: 20, r: 15 }, { w: 20, r: 12 }, { w: 20, r: 12 }] },
      ],
    },
    {
      name: 'Full Body',
      daysAgo: 22,
      duration: 80,
      exercises: [
        { id: exercises.squat, sets: [{ w: 205, r: 8 }, { w: 205, r: 8 }, { w: 195, r: 8 }] },
        { id: exercises.benchPress, sets: [{ w: 170, r: 8 }, { w: 170, r: 8 }, { w: 160, r: 10 }] },
        { id: exercises.barbellRow, sets: [{ w: 140, r: 8 }, { w: 140, r: 8 }, { w: 135, r: 10 }] },
        { id: exercises.overheadPress, sets: [{ w: 105, r: 8 }, { w: 105, r: 7 }, { w: 95, r: 10 }] },
      ],
    },
    {
      name: 'Pull Day',
      daysAgo: 25,
      duration: 55,
      exercises: [
        { id: exercises.deadlift, sets: [{ w: 255, r: 5 }, { w: 255, r: 5 }, { w: 245, r: 6 }] },
        { id: exercises.latPulldown, sets: [{ w: 130, r: 10 }, { w: 130, r: 10 }, { w: 120, r: 12 }] },
        { id: exercises.dumbbellCurl, sets: [{ w: 30, r: 10 }, { w: 30, r: 10 }, { w: 25, r: 12 }] },
      ],
    },
  ];

  // Insert workouts and sets
  for (const workout of workouts) {
    const workoutId = uuidv4();
    const workoutDate = new Date(today);
    workoutDate.setDate(workoutDate.getDate() - workout.daysAgo);
    const dateStr = workoutDate.toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO workouts (id, user_id, name, date, duration, is_complete, created_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6)`,
      [workoutId, userId, workout.name, dateStr, workout.duration, workoutDate.toISOString()]
    );

    let setNumber = 1;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        const setId = uuidv4();
        await db.execute(
          `INSERT INTO workout_sets (id, workout_id, exercise_id, set_number, reps, weight)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [setId, workoutId, exercise.id, setNumber, set.r, set.w]
        );
        setNumber++;
      }
    }

    console.log(`Created workout: ${workout.name} (${dateStr}) - ${setNumber - 1} sets`);
  }

  console.log('\nDone! Test user created:');
  console.log('  Username: testuser');
  console.log('  Display Name: Test User');
  console.log(`  User ID: ${userId}`);
  console.log(`  Workouts: ${workouts.length}`);

  process.exit(0);
}

seedTestUser().catch(err => {
  console.error('Failed to seed test user:', err);
  process.exit(1);
});

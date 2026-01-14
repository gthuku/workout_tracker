import db from './database.js';
import { v4 as uuidv4 } from 'uuid';

interface ExerciseSeed {
  name: string;
  primaryMuscles: string[];
  equipment: string;
}

const exercises: ExerciseSeed[] = [
  // CHEST (10 exercises)
  { name: 'Bench Press', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Barbell' },
  { name: 'Incline Bench Press', primaryMuscles: ['Chest', 'Shoulders'], equipment: 'Barbell' },
  { name: 'Decline Bench Press', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Barbell' },
  { name: 'Dumbbell Press', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Dumbbell' },
  { name: 'Incline Dumbbell Press', primaryMuscles: ['Chest', 'Shoulders'], equipment: 'Dumbbell' },
  { name: 'Dumbbell Flyes', primaryMuscles: ['Chest'], equipment: 'Dumbbell' },
  { name: 'Cable Flyes', primaryMuscles: ['Chest'], equipment: 'Cable' },
  { name: 'Push-ups', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Bodyweight' },
  { name: 'Chest Dips', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Bodyweight' },
  { name: 'Machine Chest Press', primaryMuscles: ['Chest', 'Triceps'], equipment: 'Machine' },

  // BACK (10 exercises)
  { name: 'Deadlift', primaryMuscles: ['Back', 'Hamstrings'], equipment: 'Barbell' },
  { name: 'Barbell Row', primaryMuscles: ['Back', 'Biceps'], equipment: 'Barbell' },
  { name: 'Pendlay Row', primaryMuscles: ['Back', 'Biceps'], equipment: 'Barbell' },
  { name: 'Dumbbell Row', primaryMuscles: ['Back', 'Biceps'], equipment: 'Dumbbell' },
  { name: 'Lat Pulldown', primaryMuscles: ['Back', 'Biceps'], equipment: 'Cable' },
  { name: 'Pull-ups', primaryMuscles: ['Back', 'Biceps'], equipment: 'Bodyweight' },
  { name: 'Chin-ups', primaryMuscles: ['Back', 'Biceps'], equipment: 'Bodyweight' },
  { name: 'Seated Cable Row', primaryMuscles: ['Back', 'Biceps'], equipment: 'Cable' },
  { name: 'T-Bar Row', primaryMuscles: ['Back'], equipment: 'Barbell' },
  { name: 'Machine Row', primaryMuscles: ['Back', 'Biceps'], equipment: 'Machine' },

  // SHOULDERS (8 exercises)
  { name: 'Overhead Press', primaryMuscles: ['Shoulders', 'Triceps'], equipment: 'Barbell' },
  { name: 'Dumbbell Shoulder Press', primaryMuscles: ['Shoulders', 'Triceps'], equipment: 'Dumbbell' },
  { name: 'Arnold Press', primaryMuscles: ['Shoulders'], equipment: 'Dumbbell' },
  { name: 'Lateral Raise', primaryMuscles: ['Shoulders'], equipment: 'Dumbbell' },
  { name: 'Front Raise', primaryMuscles: ['Shoulders'], equipment: 'Dumbbell' },
  { name: 'Face Pull', primaryMuscles: ['Shoulders', 'Back'], equipment: 'Cable' },
  { name: 'Reverse Flyes', primaryMuscles: ['Shoulders', 'Back'], equipment: 'Dumbbell' },
  { name: 'Machine Shoulder Press', primaryMuscles: ['Shoulders', 'Triceps'], equipment: 'Machine' },

  // BICEPS (6 exercises)
  { name: 'Barbell Curl', primaryMuscles: ['Biceps'], equipment: 'Barbell' },
  { name: 'Dumbbell Curl', primaryMuscles: ['Biceps'], equipment: 'Dumbbell' },
  { name: 'Hammer Curl', primaryMuscles: ['Biceps'], equipment: 'Dumbbell' },
  { name: 'Preacher Curl', primaryMuscles: ['Biceps'], equipment: 'Barbell' },
  { name: 'Concentration Curl', primaryMuscles: ['Biceps'], equipment: 'Dumbbell' },
  { name: 'Cable Curl', primaryMuscles: ['Biceps'], equipment: 'Cable' },

  // TRICEPS (6 exercises)
  { name: 'Tricep Pushdown', primaryMuscles: ['Triceps'], equipment: 'Cable' },
  { name: 'Skull Crusher', primaryMuscles: ['Triceps'], equipment: 'Barbell' },
  { name: 'Overhead Tricep Extension', primaryMuscles: ['Triceps'], equipment: 'Dumbbell' },
  { name: 'Tricep Dips', primaryMuscles: ['Triceps', 'Chest'], equipment: 'Bodyweight' },
  { name: 'Close Grip Bench Press', primaryMuscles: ['Triceps', 'Chest'], equipment: 'Barbell' },
  { name: 'Diamond Push-ups', primaryMuscles: ['Triceps', 'Chest'], equipment: 'Bodyweight' },

  // QUADS (6 exercises)
  { name: 'Squat', primaryMuscles: ['Quads', 'Glutes'], equipment: 'Barbell' },
  { name: 'Front Squat', primaryMuscles: ['Quads', 'Core'], equipment: 'Barbell' },
  { name: 'Leg Press', primaryMuscles: ['Quads', 'Glutes'], equipment: 'Machine' },
  { name: 'Leg Extension', primaryMuscles: ['Quads'], equipment: 'Machine' },
  { name: 'Goblet Squat', primaryMuscles: ['Quads', 'Glutes'], equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', primaryMuscles: ['Quads', 'Glutes'], equipment: 'Dumbbell' },

  // HAMSTRINGS (5 exercises)
  { name: 'Romanian Deadlift', primaryMuscles: ['Hamstrings', 'Glutes'], equipment: 'Barbell' },
  { name: 'Leg Curl', primaryMuscles: ['Hamstrings'], equipment: 'Machine' },
  { name: 'Stiff Leg Deadlift', primaryMuscles: ['Hamstrings', 'Back'], equipment: 'Barbell' },
  { name: 'Good Morning', primaryMuscles: ['Hamstrings', 'Back'], equipment: 'Barbell' },
  { name: 'Nordic Curl', primaryMuscles: ['Hamstrings'], equipment: 'Bodyweight' },

  // GLUTES (4 exercises)
  { name: 'Hip Thrust', primaryMuscles: ['Glutes', 'Hamstrings'], equipment: 'Barbell' },
  { name: 'Glute Bridge', primaryMuscles: ['Glutes'], equipment: 'Bodyweight' },
  { name: 'Cable Kickback', primaryMuscles: ['Glutes'], equipment: 'Cable' },
  { name: 'Sumo Deadlift', primaryMuscles: ['Glutes', 'Quads'], equipment: 'Barbell' },

  // CALVES (3 exercises)
  { name: 'Standing Calf Raise', primaryMuscles: ['Calves'], equipment: 'Machine' },
  { name: 'Seated Calf Raise', primaryMuscles: ['Calves'], equipment: 'Machine' },
  { name: 'Donkey Calf Raise', primaryMuscles: ['Calves'], equipment: 'Machine' },

  // CORE (6 exercises)
  { name: 'Plank', primaryMuscles: ['Core'], equipment: 'Bodyweight' },
  { name: 'Crunches', primaryMuscles: ['Core'], equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', primaryMuscles: ['Core'], equipment: 'Bodyweight' },
  { name: 'Russian Twist', primaryMuscles: ['Core'], equipment: 'Bodyweight' },
  { name: 'Cable Crunch', primaryMuscles: ['Core'], equipment: 'Cable' },
  { name: 'Ab Wheel Rollout', primaryMuscles: ['Core'], equipment: 'Bodyweight' },

  // CARDIO (8 exercises)
  { name: 'Treadmill Run', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Treadmill Walk', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Stationary Bike', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Outdoor Run', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Outdoor Bike', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Elliptical', primaryMuscles: ['Cardio'], equipment: 'Cardio' },
  { name: 'Rowing Machine', primaryMuscles: ['Cardio', 'Back'], equipment: 'Cardio' },
  { name: 'Stair Climber', primaryMuscles: ['Cardio', 'Quads'], equipment: 'Cardio' },
];

export async function seedExercises(): Promise<void> {
  const result = await db.queryOne('SELECT COUNT(*) as count FROM exercises WHERE is_custom = false');
  const existingCount = parseInt(result?.count || '0');

  if (existingCount > 0) {
    console.log(`Database already seeded with ${existingCount} exercises`);
    return;
  }

  for (const exercise of exercises) {
    await db.execute(
      `INSERT INTO exercises (id, name, primary_muscles, equipment, is_custom)
       VALUES ($1, $2, $3, $4, false)`,
      [
        uuidv4(),
        exercise.name,
        JSON.stringify(exercise.primaryMuscles),
        exercise.equipment,
      ]
    );
  }

  console.log(`Seeded ${exercises.length} exercises`);
}

export async function createDefaultUser(): Promise<string> {
  const existing = await db.queryOne('SELECT id FROM users WHERE username = $1', ['default']);

  if (existing) {
    return existing.id;
  }

  const userId = uuidv4();
  await db.execute(
    `INSERT INTO users (id, username, preferred_unit) VALUES ($1, 'default', 'lbs')`,
    [userId]
  );

  console.log('Created default user');
  return userId;
}

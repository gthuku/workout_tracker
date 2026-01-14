# Workout Log

A full-stack workout tracking application for logging exercises, tracking personal records, and monitoring fitness progress.

## Features

- **Multi-Profile Support** - Create and switch between multiple user profiles
- **Exercise Library** - 72 pre-loaded exercises across 11 muscle groups + custom exercises
- **Workout Logging** - Track sets, reps, and weight in real-time or log past workouts
- **Personal Records** - Automatic PR detection with celebration animations
- **Progress Analytics** - Training frequency visualization, muscle group distribution, streak tracking
- **Gender-Specific Body Diagrams** - Visual representation of muscle training frequency

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Routing | React Router |
| Charts | Recharts |
| Backend | Express 5 |
| Database | PostgreSQL |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Create the database:

```bash
createdb workout_db
```

The schema and seed data are automatically created on first server start.

### 3. Configure database connection (optional)

Default connection uses localhost. Override with environment variables if needed:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=workout_db
export PGUSER=your_username
export PGPASSWORD=your_password
```

### 4. Start development servers

```bash
npm run dev
```

This starts both the Vite frontend (port 5173) and Express backend (port 3001).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:client` | Start frontend only (Vite) |
| `npm run dev:server` | Start backend only (Express) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── api/client.ts          # API client with typed endpoints
├── store/workoutStore.ts  # Zustand store for workout state
├── types/index.ts         # TypeScript interfaces
├── components/            # Reusable UI components
│   ├── ExerciseSelector.tsx
│   ├── ProfileSelector.tsx
│   └── Layout.tsx
└── pages/                 # Route pages
    ├── Dashboard.tsx
    ├── ActiveWorkout.tsx
    ├── LogPastWorkout.tsx
    ├── ExerciseLibrary.tsx
    ├── WorkoutHistory.tsx
    ├── Stats.tsx
    └── Profile.tsx

server/
├── index.ts               # Express API routes
├── database.ts            # PostgreSQL setup
└── seed.ts                # Exercise seed data
```

## API Endpoints

### Profiles
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create profile
- `DELETE /api/profiles/:id` - Delete profile

### User
- `GET /api/user` - Get current user
- `PUT /api/user/profile` - Update profile

### Exercises
- `GET /api/exercises` - List exercises (supports `?search=`, `?muscleGroup=`, `?equipment=`)
- `POST /api/exercises` - Create custom exercise
- `GET /api/exercises/:id/history` - Exercise history
- `GET /api/exercises/:id/previous` - Previous session data

### Workouts
- `GET /api/workouts` - List completed workouts
- `POST /api/workouts` - Create workout
- `GET /api/workouts/active` - Get active workout
- `GET /api/workouts/:id` - Get workout details
- `PATCH /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout
- `DELETE /api/workouts` - Clear all workouts

### Sets
- `POST /api/workouts/:id/sets` - Add set
- `PATCH /api/sets/:id` - Update set
- `DELETE /api/sets/:id` - Delete set

### Stats
- `GET /api/dashboard` - Dashboard data
- `GET /api/stats/muscle-groups` - Muscle group distribution
- `GET /api/personal-records` - Recent PRs

## License

MIT

# Workout Log

A full-stack workout tracking application with exercise logging, personal records, and progress analytics.

## Tech Stack

**Frontend:** React 19 + TypeScript, Vite, Zustand (state), Tailwind CSS, React Router, Recharts
**Backend:** Express 5, PostgreSQL (pg), UUID for IDs
**Dev:** tsx for TypeScript execution, Concurrently for parallel dev servers

## Project Structure

```
src/
├── api/client.ts          # Centralized API client with namespaced modules
├── store/workoutStore.ts  # Zustand store for active workout state
├── types/index.ts         # All TypeScript interfaces
├── components/            # Reusable UI (ExerciseSelector, ProfileSelector, Layout)
└── pages/                 # Route pages (Dashboard, ActiveWorkout, Stats, etc.)

server/
├── index.ts               # Express routes organized by resource
├── database.ts            # PostgreSQL connection pool and schema
└── seed.ts                # Exercise seed data (72 exercises)
```

## Commands

```bash
# Development (runs frontend + backend concurrently)
npm run dev

# Frontend only (Vite on port 5173)
npm run dev:client

# Backend only (Express on port 3001)
npm run dev:server

# Production build
npm run build

# Type checking
npx tsc --noEmit
```

## Database Setup

Requires PostgreSQL with database `workout_db`:

```bash
createdb workout_db
```

Connection configured via environment variables (defaults to localhost):
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

Schema auto-creates on server start via `server/database.ts:24-98`.

## Key Architecture Decisions

### API Client Pattern
All API calls go through `src/api/client.ts`. User context injected via `X-User-Id` header from localStorage.

### State Management
- **Zustand store** (`src/store/workoutStore.ts`) - Active workout session only
- **localStorage** - Only stores `selectedProfileId`
- **Component state** - Page-specific loading/filters

### Database Conventions
- PostgreSQL uses snake_case columns; API returns camelCase
- Arrays (muscle groups) stored as JSON TEXT
- UUIDs as TEXT primary keys

### Route Organization
Server routes in `server/index.ts` grouped by resource with comment headers. Route order matters - specific routes before parameterized (e.g., `/workouts/active` before `/workouts/:id`).

## Type Definitions

All types in `src/types/index.ts`:
- `User`, `UserProfile` - User data
- `Exercise`, `MuscleGroup`, `Equipment` - Exercise definitions
- `Workout`, `WorkoutSet` - Workout logging
- `WeightUnit`, `ExperienceLevel`, `Gender` - Enums

## API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Profiles | `GET/POST /api/profiles`, `DELETE /api/profiles/:id` |
| User | `GET/PATCH /api/user`, `PUT /api/user/profile` |
| Exercises | `GET/POST /api/exercises`, `GET /api/exercises/:id/history` |
| Workouts | `GET/POST/DELETE /api/workouts`, `GET/PATCH/DELETE /api/workouts/:id` |
| Sets | `POST /api/workouts/:id/sets`, `PATCH/DELETE /api/sets/:id` |
| Stats | `GET /api/dashboard`, `GET /api/stats/muscle-groups` |

## Adding New Features

**New API endpoint:**
1. Add route in appropriate section of `server/index.ts`
2. Add API function to relevant namespace in `src/api/client.ts`
3. Add types to `src/types/index.ts` if needed

**New page:**
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Follow data loading pattern: useState + useEffect + loading state

**New database field:**
1. Add column in `server/database.ts` schema
2. Add to TypeScript interface in `src/types/index.ts`
3. Map snake_case → camelCase in API response handlers

## Additional Documentation

When working on specific areas, consult:

| Topic | File |
|-------|------|
| Design patterns, conventions, code organization | `.claude/docs/architectural_patterns.md` |

## Common Gotchas

- Route order in Express matters: specific routes (`/api/workouts/active`) before parameterized (`/api/workouts/:id`)
- PostgreSQL returns snake_case; always map to camelCase in responses
- `getUserId(req)` helper extracts user from `X-User-Id` header with fallback
- Workout sets have `ON DELETE CASCADE` - deleting workout auto-deletes sets

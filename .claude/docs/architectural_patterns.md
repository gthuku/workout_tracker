# Architectural Patterns

## API Client Layer Pattern

Centralized API client with namespaced modules and automatic user context injection.

**Implementation:** `src/api/client.ts:15-146`

- Single `BASE_URL` constant at line 15
- User ID extracted from localStorage and injected via `X-User-Id` header (lines 18-28)
- Each API namespace (`profileApi`, `userApi`, `exerciseApi`, `workoutApi`, `setApi`, `prApi`, `dashboardApi`) groups related operations
- Generic `fetchJson<T>()` wrapper handles headers, errors, and type safety

**When adding new API calls:** Add to existing namespace or create new namespace following the pattern at lines 45-67.

---

## State Management: Zustand Store

Single store for active workout state with async actions.

**Implementation:** `src/store/workoutStore.ts:1-278`

**Structure:**
- State interface: lines 11-30
- Initial state: lines 32-36
- Each action follows: `set({ isLoading: true }) → try/await → set(newState) → catch → set({ error })`

**Key pattern - Async action wrapper (lines 39-52):**
```
1. Set loading state
2. Make API call
3. Update local state on success
4. Handle errors with error state
```

**When modifying workout logic:** All mutations go through this store to maintain consistency.

---

## Server Route Organization

Routes grouped by resource with consistent CRUD operations.

**Implementation:** `server/index.ts`

**Sections:**
- User routes: lines 22-204
- Exercise routes: lines 206-271
- Workout routes: lines 273-467
- Set routes: lines 469-528
- Exercise history: lines 530-613
- Personal records: lines 615-705
- Dashboard/stats: lines 707-905

**Pattern:** Each section follows REST conventions with GET (list/detail), POST (create), PATCH (update), DELETE.

**Critical:** Route order matters - specific routes (`/api/workouts/active`) must come before parameterized routes (`/api/workouts/:id`). See lines 297 vs 355.

---

## User Context Extraction

Every route extracts user from header with fallback.

**Implementation:** `server/index.ts:14-20`

Used consistently across all route handlers that need user context. Search for `getUserId(req)` to see all usages.

---

## Database Field Mapping

PostgreSQL snake_case columns mapped to JavaScript camelCase.

**Implementation pattern (example):** `server/index.ts:28-41`

```javascript
res.json(profiles.map((user: any) => ({
  id: user.id,
  preferredUnit: user.preferred_unit,  // snake_case → camelCase
  displayName: user.display_name,
})));
```

**Locations:** Lines 28-41, 106-119, 185-198, 238-242, 287-290, 632-635

**When adding new fields:** Add snake_case to database, camelCase to TypeScript types, map in API responses.

---

## Conditional Update Pattern

PATCH endpoints build dynamic SQL for partial updates.

**Implementation:** `server/index.ts:386-426`

```javascript
const updates: string[] = [];
const params: any[] = [];
let paramIndex = 1;

if (field !== undefined) {
  updates.push(`column = $${paramIndex}`);
  params.push(field);
  paramIndex++;
}
// ... repeat for each optional field

if (updates.length > 0) {
  await db.execute(`UPDATE table SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
}
```

**Benefit:** Only updates provided fields, doesn't NULL unchanged fields.

---

## JSON Array Storage

Arrays stored as JSON strings in PostgreSQL TEXT columns.

**Schema:** `server/database.ts:49` - `primary_muscles TEXT NOT NULL`

**Serialize (write):** `JSON.stringify(array)` - `server/index.ts:258`
**Deserialize (read):** `JSON.parse(column)` - `server/index.ts:240, 326, 377, 843`

**When to use:** Small arrays with no need for relational queries (e.g., muscle groups per exercise).

---

## Personal Record Upsert

Check-then-update-or-insert pattern for unique constraint scenarios.

**Implementation:** `server/index.ts:642-705`

```javascript
const existing = await db.queryOne('SELECT id FROM table WHERE unique_fields...');
if (existing) {
  await db.execute('UPDATE ... WHERE id = $1', [existing.id]);
} else {
  await db.execute('INSERT ...', [uuidv4(), ...]);
}
```

Called after every set creation (line 484) and update (line 510).

---

## Component Patterns

### Page Components with Data Loading

**Pattern:** `src/pages/Dashboard.tsx:24-45`

```javascript
function PageComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await api.fetch();
      setData(result);
      setLoading(false);
    }
    load();
  }, []);
}
```

Used in all page components: Dashboard, ExerciseLibrary, WorkoutHistory, Stats, Profile, ExerciseHistory.

### Modal with Callback Pattern

**Pattern:** `src/components/ExerciseSelector.tsx:16-183`

- Parent controls visibility state
- Modal receives `onClose` callback
- Modal calls callback after completing action

### Nested Sub-components

**Pattern:** `src/pages/ActiveWorkout.tsx:293-564`

Complex pages define sub-components in same file:
- Page component (orchestration)
- Card component (data display)
- Row component (inline editing)

---

## Constants at Module Top

Enum-like arrays defined at module level for dropdowns and validation.

**Examples:**
- `src/components/ExerciseSelector.tsx:7-14` - MUSCLE_GROUPS, EQUIPMENT_TYPES
- `src/pages/Profile.tsx:11-25` - FITNESS_GOALS, EXPERIENCE_LEVELS

---

## Cascading Delete Pattern

Delete child records before parent, or rely on ON DELETE CASCADE.

**Implementation:** `server/index.ts:78-91`

Order: personal_records → workout_sets → workouts → exercises → users

**Note:** `workout_sets` has `ON DELETE CASCADE` on `workout_id` foreign key (`server/database.ts:70`).

import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, closeDatabase, healthCheck as dbHealthCheck } from './database.js';
import { seedExercises, createDefaultUser } from './seed.js';
import logger from './utils/logger.js';
import cache from './utils/cache.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, asyncHandler, UnauthorizedError, ForbiddenError } from './middleware/errorHandler.js';
import { authService, userService, workoutService, exerciseService, statsService, squadService } from './services/index.js';
import {
  RegisterSchema,
  LoginSchema,
  SetPasswordSchema,
  ChangePasswordSchema,
  RequestResetSchema,
  ResetPasswordSchema,
  UpdateEmailSchema,
  CreateProfileSchema,
  UpdateUserSchema,
  UpdateProfileSchema,
  CreateExerciseSchema,
  ExerciseQuerySchema,
  CreateWorkoutSchema,
  UpdateWorkoutSchema,
  WorkoutQuerySchema,
  CreateSetSchema,
  UpdateSetSchema,
  HistoryQuerySchema,
  MuscleGroupsQuerySchema,
  PaginationSchema,
  PRTrendsQuerySchema,
  CreateSquadSchema,
  InviteUserSchema,
  RespondInviteSchema,
  AddReactionSchema,
  JoinSquadSchema,
  UserSearchSchema,
} from './schemas/index.js';

// ============ CORS CONFIGURATION ============
function splitOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

const configuredOrigins = [
  ...splitOrigins(process.env.FRONTEND_URL),
  ...splitOrigins(process.env.CORS_ALLOWED_ORIGINS),
].map(normalizeOrigin);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3001',
  ...configuredOrigins,
].map(normalizeOrigin);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = normalizeOrigin(origin);
    // Allow configured origins
    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    // In production, allow CloudFront origins (*.cloudfront.net)
    if (process.env.NODE_ENV === 'production' && normalizedOrigin.endsWith('.cloudfront.net')) {
      return callback(null, true);
    }
    logger.warn({ origin: normalizedOrigin }, 'Blocked by CORS policy');
    callback(new ForbiddenError('Origin not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
};

// ============ RATE LIMITING ============
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ EXPRESS APP SETUP ============
const app = express();
const PORT = process.env.PORT || 3001;
const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production';

app.set('trust proxy', TRUST_PROXY);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(requestIdMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// API Version header
const API_VERSION = '1.0.0';
app.use((req, res, next) => {
  res.setHeader('X-API-Version', API_VERSION);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId,
    }, 'Request completed');
  });
  next();
});

// ============ HEALTH CHECK ============
app.get('/health', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // Check database
  const dbStatus = await dbHealthCheck();

  // Check cache
  const cacheStatus = await cache.healthCheck();

  // Memory usage
  const memUsage = process.memoryUsage();
  const memory = {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  };

  // Overall status
  const isHealthy = dbStatus.status === 'healthy';
  const status = isHealthy ? 'healthy' : 'unhealthy';

  const response = {
    status,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '0.0.0',
    checks: {
      database: dbStatus,
      cache: cacheStatus,
    },
    memory: {
      ...memory,
      unit: 'MB',
    },
    responseTime: `${Date.now() - startTime}ms`,
  };

  res.status(isHealthy ? 200 : 503).json(response);
}));

// ============ AUTHENTICATION MIDDLEWARE ============
async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.username = payload.username;
      req.authMethod = 'jwt';
      return next();
    }
  }

  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = await userService.verifyUserExists(userId);
    if (user) {
      req.userId = user.id;
      req.username = user.username;
      req.authMethod = 'header';
      return next();
    }
  }

  req.userId = null;
  req.username = null;
  req.authMethod = 'none';
  next();
}

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    return next(new UnauthorizedError());
  }
  next();
}

function getUserId(req: Request): string {
  return req.userId || '';
}

app.use(authenticate);

// ============ API ROUTER (v1) ============
const v1Router = Router();

// --- Profiles ---
v1Router.get('/profiles', asyncHandler(async (req, res) => {
  const profiles = await userService.listProfiles();
  res.json(profiles);
}));

v1Router.post('/profiles', asyncHandler(async (req, res) => {
  const input = CreateProfileSchema.parse(req.body);
  const profile = await userService.createProfile(input);
  res.json(profile);
}));

v1Router.delete('/profiles/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await userService.deleteProfile(req.params.id as string, getUserId(req));
  res.json(result);
}));

// --- Auth ---
v1Router.post('/auth/register', authLimiter, asyncHandler(async (req, res) => {
  const input = RegisterSchema.parse(req.body);
  const result = await authService.register(input);
  res.json(result);
}));

v1Router.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const input = LoginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
}));

v1Router.get('/auth/verify', requireAuth, asyncHandler(async (req, res) => {
  const result = await authService.verifyUser(getUserId(req));
  res.json(result);
}));

v1Router.post('/auth/set-password', requireAuth, asyncHandler(async (req, res) => {
  const { password } = SetPasswordSchema.parse(req.body);
  const result = await authService.setPassword(getUserId(req), password);
  res.json(result);
}));

v1Router.post('/auth/request-reset', authLimiter, asyncHandler(async (req, res) => {
  const { username } = RequestResetSchema.parse(req.body);
  const result = await authService.requestReset(username);
  res.json(result);
}));

v1Router.post('/auth/reset-password', authLimiter, asyncHandler(async (req, res) => {
  const { token, newPassword } = ResetPasswordSchema.parse(req.body);
  const result = await authService.resetPassword(token, newPassword);
  res.json(result);
}));

v1Router.patch('/auth/email', requireAuth, asyncHandler(async (req, res) => {
  const { email } = UpdateEmailSchema.parse(req.body);
  const result = await authService.updateEmail(getUserId(req), email ?? null);
  res.json(result);
}));

v1Router.post('/auth/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
  const result = await authService.changePassword(getUserId(req), currentPassword, newPassword);
  res.json(result);
}));

// --- User ---
v1Router.get('/user', requireAuth, asyncHandler(async (req, res) => {
  const user = await userService.getUser(getUserId(req));
  res.json(user);
}));

v1Router.patch('/user', requireAuth, asyncHandler(async (req, res) => {
  const { preferredUnit } = UpdateUserSchema.parse(req.body);
  const user = await userService.updateUser(getUserId(req), preferredUnit!);
  res.json(user);
}));

v1Router.put('/user/profile', requireAuth, asyncHandler(async (req, res) => {
  const input = UpdateProfileSchema.parse(req.body);
  const user = await userService.updateProfile(getUserId(req), input);
  res.json(user);
}));

// --- Exercises ---
v1Router.get('/exercises', requireAuth, asyncHandler(async (req, res) => {
  const filters = ExerciseQuerySchema.parse(req.query);
  const exercises = await exerciseService.list(getUserId(req), filters);
  res.json(exercises);
}));

v1Router.post('/exercises', requireAuth, asyncHandler(async (req, res) => {
  const input = CreateExerciseSchema.parse(req.body);
  const exercise = await exerciseService.create(getUserId(req), input);
  res.json(exercise);
}));

v1Router.delete('/exercises/:exerciseId', requireAuth, asyncHandler(async (req, res) => {
  const result = await exerciseService.delete(getUserId(req), req.params.exerciseId as string);
  res.json(result);
}));

v1Router.get('/exercises/:exerciseId/history', requireAuth, asyncHandler(async (req, res) => {
  const { weeks } = HistoryQuerySchema.parse(req.query);
  const history = await exerciseService.getHistory(getUserId(req), req.params.exerciseId as string, weeks);
  res.json(history);
}));

v1Router.get('/exercises/:exerciseId/previous', requireAuth, asyncHandler(async (req, res) => {
  const previous = await exerciseService.getPrevious(getUserId(req), req.params.exerciseId as string);
  res.json(previous);
}));

v1Router.get('/exercises/:exerciseId/pr-trends', requireAuth, asyncHandler(async (req, res) => {
  const { type, weeks } = PRTrendsQuerySchema.parse(req.query);
  const trends = await statsService.getPRTrends(getUserId(req), req.params.exerciseId as string, type, weeks);
  res.json(trends);
}));

// --- Workouts ---
v1Router.get('/workouts', requireAuth, asyncHandler(async (req, res) => {
  const { limit, includeIncomplete } = WorkoutQuerySchema.parse(req.query);
  const workouts = await workoutService.list(getUserId(req), limit, includeIncomplete === 'true');
  res.json(workouts);
}));

v1Router.get('/workouts/active', requireAuth, asyncHandler(async (req, res) => {
  const workout = await workoutService.getActive(getUserId(req));
  res.json(workout);
}));

v1Router.post('/workouts', requireAuth, asyncHandler(async (req, res) => {
  const input = CreateWorkoutSchema.parse(req.body);
  const workout = await workoutService.create(getUserId(req), input);
  res.json(workout);
}));

v1Router.get('/workouts/:id', requireAuth, asyncHandler(async (req, res) => {
  const workout = await workoutService.getById(req.params.id as string, getUserId(req));
  res.json(workout);
}));

v1Router.patch('/workouts/:id', requireAuth, asyncHandler(async (req, res) => {
  const input = UpdateWorkoutSchema.parse(req.body);
  const workout = await workoutService.update(req.params.id as string, getUserId(req), input);
  res.json(workout);
}));

v1Router.delete('/workouts', requireAuth, asyncHandler(async (req, res) => {
  const result = await workoutService.deleteAll(getUserId(req));
  res.json(result);
}));

v1Router.delete('/workouts/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await workoutService.delete(req.params.id as string, getUserId(req));
  res.json(result);
}));

// --- Workout Sets ---
v1Router.post('/workouts/:workoutId/sets', requireAuth, asyncHandler(async (req, res) => {
  const input = CreateSetSchema.parse(req.body);
  const set = await workoutService.createSet(req.params.workoutId as string, getUserId(req), input);
  res.json(set);
}));

v1Router.patch('/sets/:id', requireAuth, asyncHandler(async (req, res) => {
  const input = UpdateSetSchema.parse(req.body);
  const set = await workoutService.updateSet(req.params.id as string, getUserId(req), input);
  res.json(set);
}));

v1Router.delete('/sets/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await workoutService.deleteSet(req.params.id as string, getUserId(req));
  res.json(result);
}));

// --- Stats & Dashboard ---
v1Router.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const dashboard = await statsService.getDashboard(getUserId(req));
  res.json(dashboard);
}));

v1Router.get('/stats/muscle-groups', requireAuth, asyncHandler(async (req, res) => {
  const { period } = MuscleGroupsQuerySchema.parse(req.query);
  const stats = await statsService.getMuscleGroups(getUserId(req), period);
  res.json(stats);
}));

v1Router.get('/personal-records', requireAuth, asyncHandler(async (req, res) => {
  const { limit } = PaginationSchema.parse(req.query);
  const prs = await statsService.getPersonalRecords(getUserId(req), limit);
  res.json(prs);
}));

// --- Squads ---
v1Router.get('/squads/invites', requireAuth, asyncHandler(async (req, res) => {
  const invites = await squadService.listInvites(getUserId(req));
  res.json(invites);
}));

v1Router.post('/squads/join', requireAuth, asyncHandler(async (req, res) => {
  const { code } = JoinSquadSchema.parse(req.body);
  const squad = await squadService.joinByCode(getUserId(req), code);
  res.json(squad);
}));

v1Router.get('/squads/users/search', requireAuth, asyncHandler(async (req, res) => {
  const { q } = UserSearchSchema.parse(req.query);
  const squadId = req.query.excludeSquadId as string | undefined;
  const users = await squadService.searchUsers(q, squadId);
  res.json(users);
}));

v1Router.post('/squads/reactions', requireAuth, asyncHandler(async (req, res) => {
  const { workoutId, reactionType } = AddReactionSchema.parse(req.body);
  const result = await squadService.addReaction(getUserId(req), workoutId, reactionType);
  res.json(result);
}));

v1Router.delete('/squads/reactions', requireAuth, asyncHandler(async (req, res) => {
  const { workoutId, reactionType } = AddReactionSchema.parse(req.body);
  const result = await squadService.removeReaction(getUserId(req), workoutId, reactionType);
  res.json(result);
}));

v1Router.get('/squads/workouts/:workoutId', requireAuth, asyncHandler(async (req, res) => {
  const result = await squadService.getSquadWorkout(getUserId(req), req.params.workoutId as string);
  res.json(result);
}));

v1Router.post('/squads/invites/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accept } = RespondInviteSchema.parse(req.body);
  const result = await squadService.respondToInvite(getUserId(req), req.params.id as string, accept);
  res.json(result);
}));

v1Router.get('/squads', requireAuth, asyncHandler(async (req, res) => {
  const squads = await squadService.listUserSquads(getUserId(req));
  res.json(squads);
}));

v1Router.post('/squads', requireAuth, asyncHandler(async (req, res) => {
  const input = CreateSquadSchema.parse(req.body);
  const squad = await squadService.create(getUserId(req), input);
  res.json(squad);
}));

v1Router.get('/squads/:id/dashboard', requireAuth, asyncHandler(async (req, res) => {
  const dashboard = await squadService.getSquadDashboard(getUserId(req), req.params.id as string);
  res.json(dashboard);
}));

v1Router.post('/squads/:id/invite', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = InviteUserSchema.parse(req.body);
  const result = await squadService.inviteUser(getUserId(req), req.params.id as string, userId);
  res.json(result);
}));

v1Router.delete('/squads/:id/leave', requireAuth, asyncHandler(async (req, res) => {
  const result = await squadService.leaveSquad(getUserId(req), req.params.id as string);
  res.json(result);
}));

import { serveStatic } from './static.js';

// ... (existing imports)

// ============ MOUNT ROUTERS ============
// Mount v1 router at both /api/v1 and /api (for backward compatibility)
app.use('/api/v1', v1Router);
app.use('/api', v1Router);

// Serve static frontend files (in production)
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
}

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ SERVER STARTUP ============
async function startServer() {
  try {
    // Initialize database (PostgreSQL or SQLite)
    await initializeDatabase();

    // Seed data
    await seedExercises();
    await createDefaultUser();

    // Initialize Redis cache (non-blocking, continues if Redis unavailable)
    await cache.connect();

    // Cleanup old incomplete workouts
    await workoutService.cleanupIncomplete();

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully...');
      await cache.disconnect();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

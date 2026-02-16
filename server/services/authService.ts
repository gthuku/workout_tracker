import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import type { RegisterInput, LoginInput } from '../schemas/index.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'workout-log-dev-secret-change-in-production-' + crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_HOURS = 1;

function shouldExposeResetToken(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.AUTH_EXPOSE_RESET_TOKEN === 'true';
}

interface DbUser {
  id: string;
  username: string;
  email?: string;
  password_hash?: string;
  preferred_unit: string;
  created_at: string;
  display_name?: string;
}

interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export const authService = {
  generateToken(userId: string, username: string): string {
    return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  },

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  async register(input: RegisterInput) {
    const { username, email, password, displayName } = input;
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check for existing username/email before transaction
    const existingUser = await db.queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }

    if (email) {
      const existingEmail = await db.queryOne('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail) {
        throw new ConflictError('Email already registered');
      }
    }

    await db.execute(
      `INSERT INTO users (id, username, email, password_hash, preferred_unit, display_name)
       VALUES ($1, $2, $3, $4, 'lbs', $5)`,
      [id, username, email || null, passwordHash, displayName || username]
    );

    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);

    if (!user) {
      throw new Error('Failed to create user');
    }

    const token = this.generateToken(user.id, user.username);
    logger.info({ userId: user.id, username: user.username }, 'User registered');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
      token,
    };
  },

  async login(input: LoginInput) {
    const { username, password } = input;

    const user = await db.queryOne<DbUser>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Legacy user without password
    if (!user.password_hash) {
      const token = this.generateToken(user.id, user.username);
      logger.info({ userId: user.id }, 'Legacy user login - needs password');
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        preferredUnit: user.preferred_unit,
        displayName: user.display_name,
        createdAt: user.created_at,
        needsPassword: true,
        token,
      };
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.username);
    logger.info({ userId: user.id }, 'User logged in');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
      token,
    };
  },

  async verifyUser(userId: string) {
    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      preferredUnit: user.preferred_unit,
      displayName: user.display_name,
      createdAt: user.created_at,
      valid: true,
    };
  },

  async setPassword(userId: string, password: string) {
    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    const token = this.generateToken(user.id, user.username);
    logger.info({ userId }, 'Password set');

    return { success: true, token };
  },

  async requestReset(username: string) {
    const user = await db.queryOne<DbUser>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (!user) {
      logger.debug({ username }, 'Reset requested for non-existent user');
      return { success: true, message: 'If an account exists, reset instructions have been sent' };
    }

    const resetToken = this.generateResetToken();
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000).toISOString();

    await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE user_id = $1 AND used = 0', [user.id]);
    await db.execute(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), user.id, tokenHash, expiresAt]
    );

    logger.info({ userId: user.id }, 'Password reset token generated');

    const exposeToken = shouldExposeResetToken();

    // Development (or explicitly enabled): return token directly to client.
    if (exposeToken) {
      return {
        success: true,
        message: 'If an account exists, reset instructions have been sent',
        resetToken,
        expiresIn: `${RESET_TOKEN_EXPIRES_HOURS} hour(s)`,
      };
    }

    // Production: deliver via email (do not expose token).
    if (!user.email) {
      logger.warn({ userId: user.id }, 'Password reset requested but user has no email on file');
      return { success: true, message: 'If an account exists, reset instructions have been sent' };
    }

    try {
      await sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        resetToken,
        expiresInHours: RESET_TOKEN_EXPIRES_HOURS,
      });
    } catch (error) {
      // Avoid leaking whether the user exists; log internally.
      logger.error({ userId: user.id, err: error }, 'Failed to send password reset email');
    }

    return { success: true, message: 'If an account exists, reset instructions have been sent' };
  },

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashResetToken(token);

    const resetRecord = await db.queryOne<{
      id: string;
      user_id: string;
      expires_at: string;
    }>(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = 0 AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (!resetRecord) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [resetRecord.user_id]);
    if (!user) {
      throw new NotFoundError('User');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.withTransaction(async () => {
      await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
      await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [resetRecord.id]);
    });

    const jwtToken = this.generateToken(user.id, user.username);
    logger.info({ userId: user.id }, 'Password reset successful');

    return {
      success: true,
      message: 'Password has been reset successfully',
      displayName: user.display_name || user.username,
      token: jwtToken,
    };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.password_hash) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    const token = this.generateToken(user.id, user.username);
    logger.info({ userId }, 'Password changed');

    return { success: true, token };
  },

  async updateEmail(userId: string, email: string | null) {
    if (email) {
      const existing = await db.queryOne(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }

    await db.execute('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    logger.info({ userId }, 'Email updated');

    return { success: true };
  },

  async updateUsername(userId: string, username: string) {
    const normalizedUsername = username.trim();
    const existing = await db.queryOne(
      'SELECT id FROM users WHERE lower(username) = lower($1) AND id != $2',
      [normalizedUsername, userId]
    );
    if (existing) {
      throw new ConflictError('Username already exists');
    }

    await db.execute('UPDATE users SET username = $1 WHERE id = $2', [normalizedUsername, userId]);
    const user = await db.queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      throw new NotFoundError('User');
    }

    const token = this.generateToken(user.id, user.username);
    logger.info({ userId, username: user.username }, 'Username updated');
    return { success: true, token };
  },
};

export default authService;

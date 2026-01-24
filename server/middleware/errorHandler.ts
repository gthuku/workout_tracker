import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger.js';

// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

// Error handler middleware (next param required by Express error handler signature)
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  // Log error
  const logContext = {
    method: req.method,
    path: req.path,
    userId: req.userId,
    error: err.message,
    stack: err.stack,
  };

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues || [];
    const message = issues.map(e => `${e.path.join('.') || 'input'}: ${e.message}`).join(', ');
    logger.warn({ ...logContext, type: 'ValidationError' }, 'Validation failed');
    res.status(400).json({ error: message || 'Validation failed' });
    return;
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(logContext, err.message);
    } else {
      logger.warn({ ...logContext, type: err.constructor.name }, err.message);
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Handle unexpected errors
  logger.error(logContext, 'Unexpected error');
  res.status(500).json({ error: 'Internal server error' });
}

// Async handler wrapper to catch async errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

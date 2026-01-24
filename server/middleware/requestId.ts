import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Async local storage for request context
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Middleware that generates a unique request ID for each incoming request.
 * The ID is attached to the request object and set in response headers.
 * Uses AsyncLocalStorage for propagation through async operations.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Run the rest of the request in async context
  requestContext.run({ requestId }, () => {
    next();
  });
}

/**
 * Get the current request ID from async local storage
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

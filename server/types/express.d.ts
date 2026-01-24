import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      userId: string | null;
      username: string | null;
      authMethod: 'jwt' | 'header' | 'none';
    }
  }
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  username: string;
}

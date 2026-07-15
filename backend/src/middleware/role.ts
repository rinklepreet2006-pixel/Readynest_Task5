import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requireRole(allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }

    next();
  };
}

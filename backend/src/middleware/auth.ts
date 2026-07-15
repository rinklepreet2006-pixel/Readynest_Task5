import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super-secret-key-change-in-production-12345';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: string;
      tenantId: string;
    };

    // Verify tenant exists
    const tenantExists = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
    });

    if (!tenantExists) {
      return res.status(403).json({ error: 'Tenant organization no longer exists' });
    }

    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
}

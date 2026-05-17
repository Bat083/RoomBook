import { Request, Response, NextFunction } from 'express';
import { User, UserType } from '@prisma/client';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      fullName: string;
      userType: UserType;
      rankingScore: number;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

// Middleware to ensure user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Authentication required',
  });
}

// Middleware to ensure user is VIP type
export function isVIP(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  const user = req.user as User;
  if (user.userType === UserType.VIP) {
    return next();
  }

  res.status(403).json({
    error: 'FORBIDDEN',
    message: 'VIP clearance required',
  });
}

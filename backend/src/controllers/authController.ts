import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { UserDTO } from '../types';

// POST /auth/login
export function login(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('local', (err: Error, user: Express.User, info: any) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: info?.message || 'Invalid username or password',
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      const userDTO: UserDTO = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        rankingScore: user.rankingScore,
      };

      res.json({
        user: userDTO,
        message: 'Login successful',
      });
    });
  })(req, res, next);
}

// POST /auth/logout
export function logout(req: Request, res: Response, next: NextFunction): void {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }

      res.json({ message: 'Logout successful' });
    });
  });
}

// GET /auth/me
export function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
    return;
  }

  const userDTO: UserDTO = {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    fullName: req.user.fullName,
    userType: req.user.userType,
    rankingScore: req.user.rankingScore,
    createdAt: req.user.createdAt.toISOString(),
    updatedAt: req.user.updatedAt.toISOString(),
  };

  res.json({ user: userDTO });
}

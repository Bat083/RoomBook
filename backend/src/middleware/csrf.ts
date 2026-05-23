import { Request, Response, NextFunction } from 'express';
import csrf from 'csurf';

// CSRF protection middleware
export const csrfProtection = csrf({
  cookie: false, // Use session-based CSRF tokens
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Middleware to inject CSRF token into response
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add CSRF token to response header
  if (req.csrfToken) {
    res.setHeader('X-CSRF-Token', req.csrfToken());
  }
  next();
}

// Error handler for CSRF validation failures
// @ts-ignore - req parameter required for Express error handler signature
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token',
    });
  } else {
    next(err);
  }
}

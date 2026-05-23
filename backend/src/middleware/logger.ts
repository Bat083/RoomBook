import { Request, Response, NextFunction } from 'express';

interface LogData {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

// Request/response logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const logData: LogData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      userId: req.user?.id,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Log different levels based on status code
    if (res.statusCode >= 500) {
      console.error('[REQUEST ERROR]', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('[REQUEST WARN]', JSON.stringify(logData));
    } else {
      console.log('[REQUEST]', JSON.stringify(logData));
    }
  });

  next();
}

// Error logging middleware (place after routes)
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction): void {
  const logData: LogData = {
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    ip: req.ip || req.socket.remoteAddress,
    error: err.message,
  };

  console.error('[ERROR]', JSON.stringify(logData), err.stack);

  // Pass to next error handler
  next(err);
}

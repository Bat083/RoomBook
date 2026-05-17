import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Resource already exists',
        details: err.meta,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Resource not found',
      });
    }
  }

  // Validation errors
  if (err.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// Create custom error
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { createError } from './errorHandler';

// Middleware to handle validation results
// @ts-ignore - res parameter required for Express middleware signature
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = createError('Validation failed', 400, 'VALIDATION_ERROR', errors.array());
    return next(error);
  }

  next();
}

// Helper to run validation chains
export function runValidations(validations: ValidationChain[]) {
  // @ts-ignore - res parameter required for Express middleware signature
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = createError('Validation failed', 400, 'VALIDATION_ERROR', errors.array());
      return next(error);
    }

    next();
  };
}

import { body, param, query } from 'express-validator';

// Auth validation rules
export const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be a string')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Room query validation
export const roomQueryValidation = [
  query('startTime')
    .optional()
    .isISO8601().withMessage('Start time must be valid ISO 8601 date'),
  query('endTime')
    .optional()
    .isISO8601().withMessage('End time must be valid ISO 8601 date'),
  query('capacity')
    .optional()
    .isInt({ min: 1 }).withMessage('Capacity must be positive integer'),
  query('equipment')
    .optional()
    .isString().withMessage('Equipment must be comma-separated string'),
];

// Booking creation validation
export const createBookingValidation = [
  body('roomId')
    .isUUID(4).withMessage('Room ID must be valid UUID'),
  body('startTime')
    .isISO8601().withMessage('Start time must be valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('duration')
    .isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('purpose')
    .isString().withMessage('Purpose must be a string')
    .isLength({ min: 1, max: 500 }).withMessage('Purpose must be 1-500 characters')
    .trim(),
  body('participantIds')
    .optional()
    .isArray().withMessage('Participant IDs must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) return true;
      if (value.some((id: any) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
        throw new Error('All participant IDs must be valid UUIDs');
      }
      return true;
    }),
];

// Booking ID param validation
export const bookingIdValidation = [
  param('id')
    .isUUID(4).withMessage('Booking ID must be valid UUID'),
];

// Room ID param validation
export const roomIdValidation = [
  param('id')
    .isUUID(4).withMessage('Room ID must be valid UUID'),
];

// Notification query validation
export const notificationQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('unreadOnly')
    .optional()
    .isBoolean().withMessage('UnreadOnly must be boolean'),
];

// Notification ID param validation
export const notificationIdValidation = [
  param('id')
    .isUUID(4).withMessage('Notification ID must be valid UUID'),
];

// Booking query validation
export const bookingQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status must be valid booking status'),
];

// Calendar query validation
export const calendarQueryValidation = [
  query('startDate')
    .isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  query('endDate')
    .isISO8601().withMessage('End date must be valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.startDate as string)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('roomId')
    .optional()
    .isUUID(4).withMessage('Room ID must be valid UUID'),
];

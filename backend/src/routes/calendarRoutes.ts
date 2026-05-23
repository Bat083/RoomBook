import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { isAuthenticated } from '../middleware/auth';
import { runValidations } from '../middleware/validation';
import { calendarQueryValidation } from '../middleware/validationRules';

const router = Router();

// GET /calendar
router.get('/', isAuthenticated, runValidations(calendarQueryValidation), bookingController.getCalendarEvents);

export default router;

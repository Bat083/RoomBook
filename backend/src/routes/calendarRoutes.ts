import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// GET /calendar
router.get('/', isAuthenticated, bookingController.getCalendarEvents);

export default router;

import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { isAuthenticated } from '../middleware/auth';
import { runValidations } from '../middleware/validation';
import { createBookingValidation, bookingIdValidation, bookingQueryValidation } from '../middleware/validationRules';

const router = Router();

// POST /bookings
router.post('/', isAuthenticated, runValidations(createBookingValidation), bookingController.createBooking);

// GET /bookings
router.get('/', isAuthenticated, runValidations(bookingQueryValidation), bookingController.listBookings);

// GET /bookings/:id
router.get('/:id', isAuthenticated, runValidations(bookingIdValidation), bookingController.getBookingById);

// POST /bookings/:id/check-in
router.post('/:id/check-in', isAuthenticated, runValidations(bookingIdValidation), bookingController.checkIn);

// DELETE /bookings/:id
router.delete('/:id', isAuthenticated, runValidations(bookingIdValidation), bookingController.cancelBooking);

export default router;

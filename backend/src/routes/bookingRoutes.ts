import { Router } from 'express';
import * as bookingController from '../controllers/bookingController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// POST /bookings
router.post('/', isAuthenticated, bookingController.createBooking);

// GET /bookings
router.get('/', isAuthenticated, bookingController.listBookings);

// GET /bookings/:id
router.get('/:id', isAuthenticated, bookingController.getBookingById);

// POST /bookings/:id/check-in
router.post('/:id/check-in', isAuthenticated, bookingController.checkIn);

// DELETE /bookings/:id
router.delete('/:id', isAuthenticated, bookingController.cancelBooking);

export default router;

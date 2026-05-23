import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// GET /notifications - Get user notifications with pagination
router.get('/', isAuthenticated, notificationController.getNotifications);

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', isAuthenticated, notificationController.markAsRead);

export default router;

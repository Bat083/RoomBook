import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { isAuthenticated } from '../middleware/auth';
import { runValidations } from '../middleware/validation';
import { notificationQueryValidation, notificationIdValidation } from '../middleware/validationRules';

const router = Router();

// GET /notifications - Get user notifications with pagination
router.get('/', isAuthenticated, runValidations(notificationQueryValidation), notificationController.getNotifications);

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', isAuthenticated, runValidations(notificationIdValidation), notificationController.markAsRead);

export default router;

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';
import { runValidations } from '../middleware/validation';
import { loginValidation } from '../middleware/validationRules';

const router = Router();

// POST /auth/login
router.post('/login', runValidations(loginValidation), authController.login);

// POST /auth/logout
router.post('/logout', authController.logout);

// GET /auth/me
router.get('/me', isAuthenticated, authController.getCurrentUser);

export default router;

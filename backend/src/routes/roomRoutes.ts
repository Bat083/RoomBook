import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { runValidations } from '../middleware/validation';
import { roomQueryValidation, roomIdValidation } from '../middleware/validationRules';

const router = Router();

// GET /rooms
router.get('/', runValidations(roomQueryValidation), roomController.listRooms);

// GET /rooms/:id
router.get('/:id', runValidations(roomIdValidation), roomController.getRoomById);

export default router;

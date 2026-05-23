import { Router } from 'express';
import * as roomController from '../controllers/roomController';

const router = Router();

// GET /rooms
router.get('/', roomController.listRooms);

// GET /rooms/:id
router.get('/:id', roomController.getRoomById);

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createOrUpdateVehicle,
  getVehicle,
  deleteVehicle,
} from '../controllers/vehicleController.js';

const router = express.Router();

router.post('/vehicle', authMiddleware, createOrUpdateVehicle);
router.get('/vehicle', authMiddleware, getVehicle);
router.delete('/vehicle', authMiddleware, deleteVehicle);

export default router;

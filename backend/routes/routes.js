import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createRoute,
  getRoutes,
  searchRoutes,
  addDeparture,
  updateLeavingStatus,
  deleteRoute,
  getRouteById,
} from '../controllers/routeController.js';

const router = express.Router();

router.post('/routes', authMiddleware, createRoute);
router.get('/routes', authMiddleware, getRoutes);
// /search must be before /:id so Express doesn't treat "search" as an ObjectId
router.get('/routes/search', authMiddleware, searchRoutes);
router.get('/routes/:id', authMiddleware, getRouteById);
router.post('/routes/:id/departure', authMiddleware, addDeparture);
router.patch('/routes/:id/leaving', authMiddleware, updateLeavingStatus);
router.delete('/routes/:id', authMiddleware, deleteRoute);

export default router;

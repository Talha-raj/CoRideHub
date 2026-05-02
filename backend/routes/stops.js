import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  searchStops,
  getStopsByRouteId,
} from '../controllers/stopController.js';

const router = express.Router();

router.get('/stops/search', authMiddleware, searchStops);
router.get('/stops/route/:routeId', authMiddleware, getStopsByRouteId);

export default router;

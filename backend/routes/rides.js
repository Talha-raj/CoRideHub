import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createRideRequest,
  getDriverRideRequests,
  getUserRides,
  updateRideRequestStatus,
  updateRideStatus,
  getRideById,
} from '../controllers/rideController.js';

const router = express.Router();

router.post('/', authMiddleware, createRideRequest);
router.get('/requests', authMiddleware, getDriverRideRequests);  // driver
router.get('/user', authMiddleware, getUserRides);               // user
router.get('/:id', authMiddleware, getRideById);
router.patch('/:id/request-status', authMiddleware, updateRideRequestStatus);
router.patch('/:id/ride-status', authMiddleware, updateRideStatus);

export default router;

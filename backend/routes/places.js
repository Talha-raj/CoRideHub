import express from 'express';
import {
  createPlace,
  getPlaces,
  updatePlace,
  deletePlace,
  getPlaceById,
} from '../controllers/placeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create a new place
router.post('/', createPlace);

// Get all places for the authenticated user
router.get('/', getPlaces);

// Get a single place by ID
router.get('/:id', getPlaceById);

// Update a place
router.put('/:id', updatePlace);

// Delete a place
router.delete('/:id', deletePlace);

export default router;

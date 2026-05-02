import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import loginRoutes from './routes/login.js';
import signupRoutes from './routes/signup.js';
import vehicleRoutes from './routes/vechicle.js';
import routeRoutes from './routes/routes.js';
import stopRoutes from './routes/stops.js';
import placeRoutes from './routes/places.js';
import ridesRoutes from './routes/rides.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', loginRoutes);
app.use('/api/auth', signupRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', routeRoutes);
app.use('/api', stopRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/rides', ridesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'CoRideHub API Server',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/auth/login',
      signup: 'POST /api/auth/signup',
      vehicle: 'POST /api/vehicle',
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.log('Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});

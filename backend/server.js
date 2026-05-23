import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { connectDB } from './config/database.js';
import loginRoutes from './routes/login.js';
import signupRoutes from './routes/signup.js';
import vehicleRoutes from './routes/vechicle.js';
import routeRoutes from './routes/routes.js';
import stopRoutes from './routes/stops.js';
import placeRoutes from './routes/places.js';
import ridesRoutes from './routes/rides.js';
import { initSocket } from './socket/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database
connectDB();

// Socket.IO
initSocket(io);

// Health check
app.get('/health', (_req, res) => {
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

// Root
app.get('/', (_req, res) => {
  res.json({
    message: 'CoRideHub API Server',
    version: '1.0.0',
    endpoints: {
      login:  'POST /api/auth/login',
      signup: 'POST /api/auth/signup',
    },
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error
app.use((err, _req, res, _next) => {
  console.log('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});

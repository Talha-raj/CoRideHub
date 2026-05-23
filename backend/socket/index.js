import jwt from 'jsonwebtoken';

let _io = null;
export const getIO = () => _io;

export const initSocket = (io) => {
  _io = io;
  // Verify JWT on every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.userId = String(decoded.id);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join personal room — controllers push ride updates here
    socket.join(`user:${socket.userId}`);

    // Both driver and riders call this to enter the shared route room
    socket.on('join-route', ({ routeId }) => {
      if (!routeId) return;
      socket.join(`route:${routeId}`);
    });

    // Driver emits their GPS; server fans it out to everyone else in the room
    socket.on('driver-location', ({ routeId, latitude, longitude, accuracy, speed, heading, timestamp }) => {
      if (!routeId || latitude == null || longitude == null) return;
      console.log(latitude,longitude)
      socket.to(`route:${routeId}`).emit('driver-location', {
        latitude,
        longitude,
        accuracy:  accuracy  ?? null,
        speed:     speed     ?? null,
        heading:   heading   ?? null,
        timestamp: timestamp ?? Date.now(),
      });
    });

    socket.on('leave-route', ({ routeId }) => {
      if (routeId) socket.leave(`route:${routeId}`);
    });
  });
};

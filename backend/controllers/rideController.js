import Ride from '../models/rideModel.js';
import Route from '../models/routeModel.js';
import { getIO } from '../socket/index.js';


const populateRide = query =>
  query
    .populate('routeId', 'routeName from to stops isLeaving driverLocation')
    .populate('userId', 'name email phone')
    .populate('driverId', 'name phone');

// User: create a ride request
export const createRideRequest = async (req, res) => {
  try {
    const { routeId, pickupStop, dropoffStop } = req.body;
    const userId = req.user.id;

    if (!routeId || !pickupStop || !dropoffStop) {
      return res
        .status(400)
        .json({ message: 'Please provide routeId, pickupStop, and dropoffStop' });
    }

    const route = await Route.findById(routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    // Prevent booking when the user already has any active ride
    const existing = await Ride.findOne({
      userId,
      rideRequestStatus: { $in: ['Pending', 'Approved'] },
      rideStatus: { $ne: 'Completed' },
    });
    if (existing) {
      return res.status(400).json({
        message: 'You already have an active ride',
      });
    }

    const ride = await Ride.create({
      routeId,
      userId,
      driverId: route.providerId,
      pickupStop,
      dropoffStop,
      rideRequestStatus: 'Pending',
      rideStatus: 'OnTheWay',
    });

    const populated = await populateRide(Ride.findById(ride._id));
    res.status(201).json({ success: true, ride: populated });
  } catch (error) {
    console.log('Create ride request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Driver: get all ride requests for their routes
export const getDriverRideRequests = async (req, res) => {
  try {
    const driverId = req.user.id;
    const rides = await populateRide(
      Ride.find({
        driverId,
        rideStatus: { $ne: 'Completed' },
        rideRequestStatus: { $ne: 'Rejected' },
      }).sort({
        createdAt: -1,
      }),
    );
    res.json({ success: true, rides });
  } catch (error) {
    console.log('Get driver requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User: get their own ride requests
export const getUserRides = async (req, res) => {
  try {
    const userId = req.user.id;
    const rides = await populateRide(
      Ride.find({ userId }).sort({ createdAt: -1 }),
    );
    res.json({ success: true, rides });
  } catch (error) {
    console.log('Get user rides error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Driver: accept or reject a request
export const updateRideRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const driverId = req.user.id;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res
        .status(400)
        .json({ message: 'Status must be Approved or Rejected' });
    }

    const ride = await Ride.findOne({ _id: id, driverId });
    if (!ride)
      return res.status(404).json({ message: 'Ride request not found' });

    const oldStatus = ride.rideRequestStatus;

    // Block approval when route is full
    if (status === 'Approved' && oldStatus === 'Pending') {
      const route = await Route.findById(ride.routeId);
      if (route && route.seatsLeft <= 0) {
        return res.status(400).json({ message: 'No seats available on this route' });
      }
      await Route.findByIdAndUpdate(ride.routeId, { $inc: { seatsLeft: -1 } });
    } else if (status === 'Rejected' && oldStatus === 'Approved') {
      // Restore seat when a previously approved ride is rejected
      await Route.findByIdAndUpdate(ride.routeId, { $inc: { seatsLeft: 1 } });
    }

    ride.rideRequestStatus = status;
    await ride.save();

    const updated = await populateRide(Ride.findById(id));
    // Push to the rider's personal room (they are auto-joined on socket connect)
    getIO()?.to(`user:${ride.userId.toString()}`).emit('ride:update', { ride: updated });
    res.json({ success: true, ride: updated });
  } catch (error) {
    console.log('Update request status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Driver: advance ride status (OnTheWay → InProgress → Completed)
export const updateRideStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const driverId = req.user.id;

    if (!['OnTheWay', 'InProgress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid ride status' });
    }

    const ride = await Ride.findOne({ _id: id, driverId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.rideStatus = status;
    await ride.save();

    const updated = await populateRide(Ride.findById(id));
    // Push to the rider's personal room
    getIO()?.to(`user:${ride.userId.toString()}`).emit('ride:update', { ride: updated });
    res.json({ success: true, ride: updated });
  } catch (error) {
    console.log('Update ride status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User: get their current active ride (Pending or Approved, not Completed)
export const getActiveRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const ride = await populateRide(
      Ride.findOne({
        userId,
        rideRequestStatus: { $in: ['Pending', 'Approved'] },
        rideStatus: { $ne: 'Completed' },
      }),
    );
    res.json({ success: true, ride: ride || null });
  } catch (error) {
    console.log('Get active ride error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Shared: get a single ride by ID (accessible to both rider and driver)
export const getRideById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await populateRide(
      Ride.findOne({ _id: id, $or: [{ userId }, { driverId: userId }] }),
    );
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    res.json({ success: true, ride });
  } catch (error) {
    console.log('Get ride error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

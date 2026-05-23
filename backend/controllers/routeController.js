import Route from '../models/routeModel.js';
import Stop from '../models/stopModel.js';
import Vehicle from '../models/vehicleModel.js';
import { getIO } from '../socket/index.js';

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Create a new route with stops
export const createRoute = async (req, res) => {
  try {
    const { routeName, from, to, stops } = req.body;
    const providerId = req.user.id;

    // Validation
    if (!routeName || !from || !to || !from.name || !to.name || !from.coordinates || !to.coordinates) {
      return res.status(400).json({ message: 'Please provide route name, from and to destinations with coordinates' });
    }

    // Derive seat count from driver's vehicle (fall back to 4 if no vehicle found)
    const vehicle = await Vehicle.findOne({ userId: providerId });
    const seatsLeft = vehicle?.capacity ?? 4;

    // Create route
    const route = await Route.create({
      providerId,
      routeName,
      from,
      to,
      isActive: true,
      isLeaving: false,
      seatsLeft,
    });

    // Create stops if provided
    let createdStops = [];
    if (stops && stops.length > 0) {
      console.log('Creating stops:', stops);
      const stopDocuments = stops.map(stopName => ({
        routeId: route._id,
        stopName,
      }));
      createdStops = await Stop.insertMany(stopDocuments);
      console.log('Created stops:', createdStops);
      
      // Update route with stop references
      route.stops = createdStops.map(stop => stop._id);
      await route.save();
      console.log('Updated route with stops:', route.stops);
    }

    // Fetch the route with stops
    const routeWithStops = await Route.findById(route._id).populate('stops');

    res.status(201).json({
      success: true,
      route: routeWithStops,
    });
  } catch (error) {
    console.log('Create route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get routes for a provider
export const getRoutes = async (req, res) => {
  try {
    const providerId = req.user.id;

    const routes = await Route.find({ providerId })
      .populate('stops')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      routes,
    });
  } catch (error) {
    console.log('Get routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update route leaving status
export const updateLeavingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const route = await Route.findOne({ _id: id, providerId });

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    route.isLeaving = !route.isLeaving;
    await route.save();

    res.json({
      success: true,
      route,
    });
  } catch (error) {
    console.log('Update leaving status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a route
export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const route = await Route.findOneAndDelete({ _id: id, providerId });

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Delete associated stops
    await Stop.deleteMany({ routeId: id });

    res.json({
      success: true,
      message: 'Route deleted successfully',
    });
  } catch (error) {
    console.log('Delete route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a scheduled departure to a route
export const addDeparture = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, isLeaving = false } = req.body;
    const providerId = req.user.id;

    if (!date || !time) {
      return res.status(400).json({ message: 'Please provide date and time' });
    }

    const route = await Route.findOne({ _id: id, providerId });
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    route.departures.push({ date, time, isLeaving, isCompleted: false });
    if (isLeaving) route.isLeaving = true;
    await route.save();

    const updated = await Route.findById(id).populate('stops');
    res.json({ success: true, route: updated });
  } catch (error) {
    console.log('Add departure error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark today's active departure as completed and clear driver location
export const completeDeparture = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const route = await Route.findOne({ _id: id, providerId });
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const today = new Date().toISOString().slice(0, 10);
    const dep = route.departures.find(d => d.isLeaving && d.date === today && !d.isCompleted);
    if (dep) {
      dep.isLeaving   = false;
      dep.isCompleted = true;
    }

    route.isLeaving    = false;
    route.driverLocation = undefined;
    await route.save();

    const updated = await Route.findById(id).populate('stops');
    res.json({ success: true, route: updated });
  } catch (error) {
    console.log('Complete departure error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Driver: push live GPS position for an active route
export const updateDriverLocation = async (req, res) => {
  try {
    const { routeId, latitude, longitude, accuracy, speed, heading, timestamp } = req.body;
    const providerId = req.user.id;

    if (!routeId || latitude == null || longitude == null) {
      return res.status(400).json({ message: 'routeId, latitude, and longitude are required' });
    }

    const route = await Route.findOneAndUpdate(
      { _id: routeId, providerId },
      { driverLocation: { latitude, longitude, accuracy, speed, heading, timestamp } },
    );

    if (!route) return res.status(404).json({ message: 'Route not found' });

    // Relay to riders via socket (covers background driver — REST path bypasses JS socket)
    getIO()?.to(`route:${routeId}`).emit('driver-location', {
      latitude, longitude,
      accuracy:  accuracy  ?? null,
      speed:     speed     ?? null,
      heading:   heading   ?? null,
      timestamp: timestamp ?? Date.now(),
    });

    res.json({ success: true });
  } catch (error) {
    console.log('Update driver location error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search active routes by proximity of pickup and dropoff
export const searchRoutes = async (req, res) => {
  try {
    const {
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      radius = 5,
    } = req.query;

    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return res.status(400).json({
        message: 'Please provide pickup_lat, pickup_lng, dropoff_lat, dropoff_lng',
      });
    }

    const pLat = parseFloat(pickup_lat);
    const pLng = parseFloat(pickup_lng);
    const dLat = parseFloat(dropoff_lat);
    const dLng = parseFloat(dropoff_lng);
    const radiusKm = parseFloat(radius);

    const allRoutes = await Route.find({ isActive: true }).populate('stops');

    const matched = allRoutes
      .map(route => {
        const pickupDist = haversineKm(
          pLat, pLng,
          route.from.coordinates.lat, route.from.coordinates.lng,
        );
        const dropoffDist = haversineKm(
          dLat, dLng,
          route.to.coordinates.lat, route.to.coordinates.lng,
        );
        return { route, pickupDist, dropoffDist };
      })
      .filter(({ pickupDist, dropoffDist }) =>
        pickupDist <= radiusKm && dropoffDist <= radiusKm,
      )
      .sort((a, b) => a.pickupDist - b.pickupDist)
      .map(({ route, pickupDist, dropoffDist }) => ({
        ...route.toObject(),
        pickupDistance: Math.round(pickupDist * 10) / 10,
        dropoffDistance: Math.round(dropoffDist * 10) / 10,
      }));

    res.json({ success: true, routes: matched, total: matched.length });
  } catch (error) {
    console.log('Search routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single route by ID
export const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const route = await Route.findOne({ _id: id, providerId }).populate('stops');

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json({
      success: true,
      route,
    });
  } catch (error) {
    console.log('Get route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

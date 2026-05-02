import Stop from '../models/stopModel.js';

// Search stops by query
export const searchStops = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    // Use text search for better matching
    const stops = await Stop.find(
      { stopName: { $regex: query, $options: 'i' } },
      { stopName: 1, _id: 0 }
    ).limit(10);

    // Extract unique stop names
    const uniqueStops = [...new Set(stops.map(stop => stop.stopName))];

    res.json({
      success: true,
      stops: uniqueStops,
    });
  } catch (error) {
    console.log('Search stops error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get stops for a specific route
export const getStopsByRouteId = async (req, res) => {
  try {
    const { routeId } = req.params;

    const stops = await Stop.find({ routeId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      stops,
    });
  } catch (error) {
    console.log('Get stops error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

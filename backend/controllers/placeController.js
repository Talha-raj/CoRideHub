import Place from '../models/placeModel.js';

// Create a new place
export const createPlace = async (req, res) => {
  try {
    const { title, location, streetAddress } = req.body;
    const userId = req.user.id;

    // Validation
    if (!title || !location || !location.name || !location.coordinates) {
      return res.status(400).json({ message: 'Please provide title and location with coordinates' });
    }

    const place = await Place.create({
      userId,
      title,
      location,
      streetAddress,
    });

    res.status(201).json({
      success: true,
      place,
    });
  } catch (error) {
    console.log('Create place error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all places for a user
export const getPlaces = async (req, res) => {
  try {
    const userId = req.user.id;

    const places = await Place.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.log('Get places error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a place
export const updatePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, location, streetAddress } = req.body;

    const place = await Place.findOne({ _id: id, userId });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    if (title) place.title = title;
    if (location) place.location = location;
    if (streetAddress !== undefined) place.streetAddress = streetAddress;

    await place.save();

    res.json({
      success: true,
      place,
    });
  } catch (error) {
    console.log('Update place error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a place
export const deletePlace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const place = await Place.findOneAndDelete({ _id: id, userId });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    res.json({
      success: true,
      message: 'Place deleted successfully',
    });
  } catch (error) {
    console.log('Delete place error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single place by ID
export const getPlaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const place = await Place.findOne({ _id: id, userId });

    if (!place) {
      return res.status(404).json({ message: 'Place not found' });
    }

    res.json({
      success: true,
      place,
    });
  } catch (error) {
    console.log('Get place error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

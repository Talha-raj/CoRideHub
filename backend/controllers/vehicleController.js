import Vehicle from '../models/vehicleModel.js';

// Create or update vehicle for a user
export const createOrUpdateVehicle = async (req, res) => {
  try {
    const { type, model, plateNumber, year, color } = req.body;
    const userId = req.user.id;

    if (!type || !model || !plateNumber) {
      return res.status(400).json({ message: 'Please provide type, model and plate number' });
    }

    // Check if vehicle already exists for this user
    let vehicle = await Vehicle.findOne({ userId });

    if (vehicle) {
      // Update existing vehicle
      vehicle.type = type;
      vehicle.model = model;
      vehicle.plateNumber = plateNumber;
      vehicle.year = year || vehicle.year;
      vehicle.color = color || vehicle.color;
      await vehicle.save();
    } else {
      // Create new vehicle
      vehicle = await Vehicle.create({
        userId,
        type,
        model,
        plateNumber,
        year,
        color,
      });
    }

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.log('Vehicle create/update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get vehicle for authenticated user
export const getVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicle = await Vehicle.findOne({ userId });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ success: true, vehicle });
  } catch (error) {
    console.log('Get vehicle error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete vehicle for authenticated user
export const deleteVehicle = async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicle = await Vehicle.findOneAndDelete({ userId });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.log('Delete vehicle error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

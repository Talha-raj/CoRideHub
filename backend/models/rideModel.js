import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema(
  {
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pickupStop:  { type: String, required: true },
    dropoffStop: { type: String, required: true },
    rideRequestStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    rideStatus: {
      type: String,
      enum: ['OnTheWay', 'InProgress', 'Completed'],
      default: 'OnTheWay',
    },
  },
  { timestamps: true },
);

export default mongoose.model('Ride', rideSchema);

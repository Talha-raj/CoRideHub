import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    model: { type: String, required: true },
    plateNumber: { type: String, required: true },
    year: String,
    color: String,
    capacity: { type: Number, default: 4 },
  },
  { timestamps: true },
);

export default mongoose.model('Vehicle', vehicleSchema);

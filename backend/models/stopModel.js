import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    routeId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Route', 
      required: true 
    },
    stopName: { 
      type: String, 
      required: true 
    },
  },
  { timestamps: true },
);

// Create index for faster stop name searches
stopSchema.index({ stopName: 'text' });

export default mongoose.model('Stop', stopSchema);

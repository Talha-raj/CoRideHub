import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    providerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    routeName: { 
      type: String, 
      required: true 
    },
    from: {
      name: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    to: {
      name: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isLeaving: {
      type: Boolean,
      default: false
    },
    departures: [
      {
        date: { type: String, required: true }, // YYYY-MM-DD
        time: { type: String, required: true }, // HH:MM (24-hour)
      },
    ],
    stops: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Stop' 
      }
    ],
  },
  { timestamps: true },
);

export default mongoose.model('Route', routeSchema);

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: String,
    role: { type: String, enum: ['user', 'provider'], default: 'user' },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);

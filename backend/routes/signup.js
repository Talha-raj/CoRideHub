import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    console.log('Signup request body:', req.body);
    
    const { name, email, password, role, phone, vehicle } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email and password" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashed,
      role: role || 'user',
    };

    if (phone) userData.phone = phone;
    if (vehicle && Object.keys(vehicle).length > 0) {
      userData.vehicle = vehicle;
    }

    console.log('Creating user with data:', userData);
    
    const user = await User.create(userData);
    
    console.log('User created successfully:', user._id);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: '7d' });

    res.status(201).json({ 
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicle: user.vehicle,
      }, 
      token 
    });
  } catch (error) {
    console.log('Signup error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
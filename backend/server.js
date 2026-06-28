const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('@googlemaps/google-maps-services-js');

dotenv.config();
const app = express();
const googleMapsClient = new Client({});

app.use(cors({
  origin: ['https://beamish-madeleine-af20be.netlify.app', 'https://infurnuslogistics.com', 'https://www.infurnuslogistics.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/infurnus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Error:', err));

const bookingSchema = new mongoose.Schema({
  bookingType: { type: String, enum: ['cab', 'logistics', 'rental'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  pickupLocation: { type: String, required: true },
  pickupAddress: { type: String },
  dropLocation: { type: String, required: true },
  dropAddress: { type: String },
  distanceKm: { type: Number },
  distanceText: { type: String },
  durationText: { type: String },
  estimatedFare: { type: Number },
  pickupDate: { type: Date },
  pickupTime: { type: String },
  vehicleType: { type: String },
  passengers: { type: Number },
  specialRequests: { type: String },
  companyName: { type: String },
  cargoType: { type: String },
  cargoWeight: { type: Number },
  vehicleRequired: { type: String },
  cargoDescription: { type: String },
  rentalType: { type: String },
  startDate: { type: Date },
  startTime: { type: String },
  purpose: { type: String },
  assignedDriver: { type: String },
  actualFare: { type: Number },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const driverSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  city: { type: String, required: true },
  experience: { type: String },
  vehicleType: { type: String },
  licenseNumber: { type: String, required: true },
  aadhaarNumber: { type: String },
  licenseFile: { type: String },
  photoFile: { type: String },
  about: { type: String },
  status: { type: String, enum: ['pending', 'reviewing', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);
const Driver = mongoose.model('Driver', driverSchema);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || token !== `Bearer ${process.env.ADMIN_TOKEN || 'infurnus-admin-2026'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    console.log(`New booking: ${booking.bookingType} - ${booking.fullName || booking.companyName}`);
    res.status(201).json({ success: true, message: 'Booking submitted', bookingId: booking._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.bookingType = type;
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(filter);
    res.json({ success: true, bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const { status, assignedDriver, actualFare, notes } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status, assignedDriver, actualFare, notes, updatedAt: new Date() }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/calculate-fare', async (req, res) => {
  try {
    const { origin, destination, vehicleType = 'sedan' } = req.body;
    if (!origin || !destination) return res.status(400).json({ error: 'Origin and destination required' });
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Google Maps API key not configured' });
    const response = await googleMapsClient.distancematrix({
      params: { origins: [origin], destinations: [destination], mode: 'driving', key: apiKey },
      timeout: 10000
    });
    const element = response.data.rows[0].elements[0];
    if (element.status !== 'OK') return res.status(400).json({ error: 'Could not calculate route', details: element.status });
    const distanceKm = (element.distance.value / 1000).toFixed(2);
    const rates = { sedan: 15, suv: 14, pickup: 12, luxury: 18, tempo: 20, truck_1ton: 25, truck_3ton: 30, truck_10ton: 45 };
    const rate = rates[vehicleType] || 15;
    const baseFare = Math.round(distanceKm * rate);
    res.json({ success: true, distanceKm: parseFloat(distanceKm), distanceText: element.distance.text, durationText: element.duration.text, ratePerKm: rate, baseFare, totalFare: baseFare, vehicleType });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const response = await googleMapsClient.geocode({ params: { address, key: apiKey }, timeout: 10000 });
    if (response.data.results.length === 0) return res.status(404).json({ error: 'Address not found' });
    const result = response.data.results[0];
    res.json({ success: true, formattedAddress: result.formatted_address, location: result.geometry.location, placeId: result.place_id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/drivers', async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json({ success: true, message: 'Application submitted', driverId: driver._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/drivers', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, drivers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/drivers/:id', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const todayBookings = await Booking.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    const totalDrivers = await Driver.countDocuments();
    const pendingDrivers = await Driver.countDocuments({ status: 'pending' });
    const revenue = await Booking.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$actualFare' } } }]);
    res.json({ success: true, stats: { totalBookings, pendingBookings, todayBookings, totalDrivers, pendingDrivers, totalRevenue: revenue[0]?.total || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Infurnus Server running on port ${PORT}`);
  console.log(`Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`Website: http://localhost:${PORT}`);
});

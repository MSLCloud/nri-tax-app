const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Import routes
const calculateRoutes = require('./routes/calculate');
const uploadRoutes = require('./routes/upload');
const formRoutes = require('./routes/forms');
const mfRoutes = require('./routes/mf');

// Use routes
app.use('/api/calculate', calculateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/mf', mfRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`✅ Calculate API: http://localhost:${PORT}/api/calculate`);
  console.log(`✅ Upload API: http://localhost:${PORT}/api/upload`);
  console.log(`✅ Forms API: http://localhost:${PORT}/api/forms`);
  console.log(`✅ MF API: http://localhost:${PORT}/api/mf`);
});
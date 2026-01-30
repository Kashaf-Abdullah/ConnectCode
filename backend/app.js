const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow Socket.IO connections
}));
app.use(cors({ origin: '*' }));

// Body parsing middleware - must be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
const { router: pairingRouter } = require('./routes/pairingRoutes');
const adminRouter = require('./routes/adminRoutes');

app.use('/api/pairing', pairingRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Redis health check
app.get('/health/redis', async (req, res) => {
  const redisService = require('./services/redisService..js');
  try {
    // Test Redis connection
    const testKey = 'health:check';
    await redisService.client.setex(testKey, 10, 'test');
    const value = await redisService.client.get(testKey);
    await redisService.client.del(testKey);
    
    // Get all pair keys
    const keys = await redisService.client.keys('pair:*');
    
    res.json({
      status: 'OK',
      redis: {
        connected: true,
        test: value === 'test' ? 'PASS' : 'FAIL',
        activeCodes: keys.length,
        keys: keys.slice(0, 10) // Show first 10 keys
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      redis: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/go', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/go.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

module.exports = app;

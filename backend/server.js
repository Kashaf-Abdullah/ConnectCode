// require('dotenv').config();
// const http = require('http');
// const socketIo = require('socket.io');
// const app = require('./app');
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// // Initialize Socket.IO controller
// const SocketController = require('./controllers/socketController');
// new SocketController(io);

// // Make io available to app for routes
// app.set('io', io);

// // Initialize pairing routes with io
// const { initializePairingRoutes } = require('./routes/pairingRoutes');
// initializePairingRoutes(io);

// const PORT = process.env.PORT || 3000;

// server.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);
//   console.log(`\n📡 Socket.IO server initialized`);
//   console.log(`\n📋 API Endpoints:`);
//   console.log(`   GET  /api/pairing/generate-code`);
//   console.log(`   POST /api/pairing/validate-code`);
//   console.log(`   POST /api/pairing/submit-link`);
//   console.log(`   GET  /api/pairing/active-codes`);
//   console.log(`   GET  /api/admin/dashboard`);
//   console.log(`   POST /api/admin/reset-codes`);
//   console.log(`   GET  /health`);
//   console.log(`   GET  /health/redis\n`);
// });


require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');

const server = http.createServer(app);

// Create io instance with proper CORS configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Explicitly set transports
  allowEIO3: true // For Socket.IO v2 compatibility
});

// Make io available to app
app.set('io', io);

// Initialize Socket.IO controller AFTER io is created
const SocketController = require('./controllers/socketController');
new SocketController(io);

// Initialize pairing routes
const { initializePairingRoutes } = require('./routes/pairingRoutes');
initializePairingRoutes(io);

// Also update the app.js to handle CORS better for Socket.IO
// Add this to your app.js, right after helmet middleware:

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`\n📡 Socket.IO server initialized`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   GET  /api/pairing/generate-code`);
  console.log(`   POST /api/pairing/validate-code`);
  console.log(`   POST /api/pairing/submit-link`);
  console.log(`   GET  /api/pairing/active-codes`);
  console.log(`   GET  /api/admin/dashboard`);
  console.log(`   POST /api/admin/reset-codes`);
  console.log(`   GET  /health`);
  console.log(`   GET  /health/redis\n`);
});
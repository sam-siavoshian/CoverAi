const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { EmergencySoundDetector } = require('./emergency-sound-detector');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize the emergency sound detector
let soundDetector;
let isRunning = false;

// API routes
app.get('/api/start', (req, res) => {
  if (!isRunning) {
    try {
      soundDetector = new EmergencySoundDetector();
      
      // Listen for detections and emit to clients
      soundDetector.on('detection', (detection) => {
        console.log('Emergency sound detected:', detection);
        io.emit('emergency_detection', detection);
      });
      
      soundDetector.start();
      isRunning = true;
      res.json({ status: 'success', message: 'Emergency sound detection started' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  } else {
    res.json({ status: 'success', message: 'Emergency sound detection already running' });
  }
});

app.get('/api/stop', (req, res) => {
  if (isRunning && soundDetector) {
    soundDetector.stop();
    isRunning = false;
    res.json({ status: 'success', message: 'Emergency sound detection stopped' });
  } else {
    res.json({ status: 'success', message: 'Emergency sound detection is not running' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'success', 
    running: isRunning 
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Emergency sound detection server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to view the dashboard`);
}); 
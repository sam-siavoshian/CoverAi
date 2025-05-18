require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.MOCK_911_PORT || 1515;

// Store received emergency calls
let emergencyCalls = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public/911-dashboard')));

// Create directory for the 911 dashboard if it doesn't exist
const dashboardDir = path.join(__dirname, 'public/911-dashboard');
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
}

// API endpoint to receive emergency data
app.post('/api/emergency', (req, res) => {
  try {
    const emergencyData = req.body;
    
    // Add timestamp and ID
    const callData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...emergencyData
    };
    
    // Store the emergency call
    emergencyCalls.push(callData);
    
    // Store only the most recent 50 calls
    if (emergencyCalls.length > 50) {
      emergencyCalls = emergencyCalls.slice(-50);
    }
    
    console.log('Emergency call received:', callData);
    
    // Send response
    res.status(200).json({ 
      success: true, 
      message: 'Emergency call received',
      callId: callData.id
    });
  } catch (error) {
    console.error('Error processing emergency call:', error);
    res.status(500).json({ success: false, error: 'Error processing emergency call' });
  }
});

// API endpoint to get all emergency calls (for the dashboard)
app.get('/api/emergency/calls', (req, res) => {
  res.json(emergencyCalls);
});

// API endpoint to get a specific emergency call by ID
app.get('/api/emergency/calls/:id', (req, res) => {
  const call = emergencyCalls.find(c => c.id === req.params.id);
  if (call) {
    res.json(call);
  } else {
    res.status(404).json({ error: 'Emergency call not found' });
  }
});

// Default route to serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/911-dashboard/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock 911 Emergency Service running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
}); 
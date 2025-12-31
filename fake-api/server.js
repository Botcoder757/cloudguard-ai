const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 5000;
const BACKEND_URL = 'http://localhost:3001';

let callCount = 0;
let startTime = Date.now();

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Main endpoint that simulates image processing
app.post('/api/process', async (req, res) => {
  callCount++;
  const now = new Date();
  console.log(`📨 Call #${callCount} received at ${now.toLocaleTimeString()}`);
  
  try {
    // Forward to CloudGuard backend (CRITICAL: This triggers detection!)
    await axios.post(`${BACKEND_URL}/api/log-call`, {
      function_name: 'image-processor',
      project_id: 'demo-project-001',
      method_name: 'cloudfunctions.googleapis.com/v1.CallFunction',
      is_baseline: false,  // ← CRITICAL: Mark as loop, not baseline!
      timestamp: Date.now()
    });
    
    res.json({ 
      status: 'ok', 
      message: 'Processing complete',
      call_number: callCount
    });
  } catch (error) {
    console.error('❌ Failed to forward to backend:', error.message);
    res.json({ 
      status: 'ok', 
      message: 'Processing complete (backend not reachable)',
      call_number: callCount
    });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = callCount / elapsed;
  
  res.json({
    total_calls: callCount,
    elapsed_seconds: elapsed.toFixed(1),
    calls_per_second: rate.toFixed(2),
    uptime: `${Math.floor(elapsed / 60)}m ${Math.floor(elapsed % 60)}s`
  });
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
  callCount = 0;
  startTime = Date.now();
  console.log('🔄 Stats reset');
  res.json({ status: 'reset' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', calls: callCount });
});

app.listen(PORT, () => {
  console.log('🚀 ' + '═'.repeat(52));
  console.log('   FAKE API SERVER - Running on port 5000');
  console.log('═'.repeat(52));
  console.log('');
  console.log('📍 Available endpoints:');
  console.log('   POST http://localhost:5000/api/process    ← Call this in your loop!');
  console.log('   GET  http://localhost:5000/api/stats');
  console.log('   POST http://localhost:5000/api/reset');
  console.log('   GET  http://localhost:5000/health');
  console.log('');
  console.log('💡 Demo Instructions:');
  console.log('   1. Start this API server');
  console.log('   2. Start your CloudGuard backend');
  console.log('   3. Write a loop that calls /api/process');
  console.log('   4. Watch CloudGuard detect the infinite loop!');
  console.log('');
});
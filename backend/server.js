require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startKafkaConsumer, getRecentEvents } = require('./kafka-consumer');
const { startWebSocketServer, getConnectedClientsCount } = require('./websocket-server');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    project: process.env.GCP_PROJECT_ID,
    connected_clients: getConnectedClientsCount()
  });
});

// API endpoints
app.get('/api/recent-threats', (req, res) => {
  const events = getRecentEvents();
  res.json({ 
    threats: events.threats.slice(0, 20),
    count: events.threats.length 
  });
});

app.get('/api/cost-metrics', (req, res) => {
  const events = getRecentEvents();
  res.json({ 
    metrics: events.costs.slice(0, 10),
    current: events.costs[0] || null
  });
});

app.get('/api/security-events', (req, res) => {
  const events = getRecentEvents();
  res.json({ 
    events: events.security.slice(0, 20),
    count: events.security.length 
  });
});

app.get('/api/anomalies', (req, res) => {
  const events = getRecentEvents();
  res.json({ 
    anomalies: events.anomalies.slice(0, 20),
    count: events.anomalies.length 
  });
});

app.get('/api/developer-activity', (req, res) => {
  const events = getRecentEvents();
  res.json({ 
    activity: events.developers.slice(0, 20),
    count: events.developers.length 
  });
});

app.get('/api/dashboard-summary', (req, res) => {
  const events = getRecentEvents();
  res.json({
    threats: {
      total: events.threats.length,
      critical: events.threats.filter(t => t.confidence_score >= 90).length
    },
    costs: {
      current_rate: events.costs[0]?.current_rate_usd_per_hour || 0,
      budget_used: events.costs[0]?.budget_used_percent || 0,
      alert_level: events.costs[0]?.alert_level || 'LOW'
    },
    security: {
      total: events.security.length,
      critical: events.security.filter(s => s.severity === 'CRITICAL').length
    },
    anomalies: {
      total: events.anomalies.length,
      critical: events.anomalies.filter(a => a.severity === 'CRITICAL').length
    },
    developers: {
      active: new Set(events.developers.map(d => d.developer_email)).size,
      high_risk: events.developers.filter(d => d.risk_score >= 70).length
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 CloudGuard AI Backend Server');
  console.log('='.repeat(60));
  console.log(`📊 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📁 GCP Project: ${process.env.GCP_PROJECT_ID}`);
  console.log(`🌍 GCP Region: ${process.env.GCP_REGION}`);
  console.log(`🧠 AI Model: ${process.env.VERTEX_AI_MODEL}`);
  console.log('='.repeat(60));
});

// Start WebSocket server
startWebSocketServer(server);

// Start Kafka consumer
console.log('🔄 Starting Kafka consumer...');
startKafkaConsumer()
  .then(() => {
    console.log('✅ All systems operational');
  })
  .catch((error) => {
    console.error('❌ Failed to start Kafka consumer:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
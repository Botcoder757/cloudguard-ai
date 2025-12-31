require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const { startKafkaConsumer, getRecentEvents } = require('./kafka-consumer');
const { startWebSocketServer, getConnectedClientsCount } = require('./websocket-server');
const { produceToKafka } = require('./kafka-producer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// VERTEX AI GEMINI INTEGRATION
// ============================================
const { VertexAI } = require('@google-cloud/vertexai');

let vertexAI = null;
const geminiModels = [];

// Get project ID
let projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

if (!projectId) {
  try {
    const result = execSync('gcloud config get-value project', { encoding: 'utf8' });
    projectId = result.trim();
    console.log(`✅ Using GCP project from gcloud: ${projectId}`);
  } catch (error) {
    console.error('❌ Could not determine GCP project ID');
    process.exit(1);
  }
} else {
  console.log(`✅ Using GCP project from env: ${projectId}`);
}

// Initialize Vertex AI
async function initializeVertexAI() {
  try {
    const location = process.env.GCP_REGION || 'us-central1';
    
    vertexAI = new VertexAI({
      project: projectId,
      location: location
    });
    
    const modelConfigs = [
  { name: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { name: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { name: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },

    ];
    
    console.log(`\n🔍 Testing Gemini models in project: ${projectId}`);
    console.log('='.repeat(60));
    
    for (const config of modelConfigs) {
      try {
        const testModel = vertexAI.getGenerativeModel({
          model: config.name,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        });
        
        const testResult = await testModel.generateContent('Test');
        
        if (testResult.response) {
          geminiModels.push({
            model: testModel,
            name: config.name,
            label: config.label
          });
          console.log(`✅ ${config.label} - Available`);
        }
      } catch (error) {
        console.log(`❌ ${config.label} - Not available`);
      }
    }
    
    console.log('='.repeat(60));
    
    if (geminiModels.length > 0) {
      console.log(`\n🎯 Using primary model: ${geminiModels[0].label}\n`);
      return true;
    } else {
      console.log('⚠️  No Gemini models available, using fallback\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Vertex AI:', error.message);
    console.log('⚠️  Using fallback analysis\n');
    return false;
  }
}

// Analyze threat with Gemini
async function analyzeThreatWithGemini(threat) {
  console.log(`🧠 Analyzing threat: ${threat.threat_id}`);
  
  // Fallback analysis if no models available
  if (geminiModels.length === 0) {
    const fallbackAnalysis = {
      analysis: `⚠️ ${threat.threat_type} detected with ${threat.confidence_score}% confidence. ${
        threat.resource_count ? `${threat.resource_count} resources affected.` : ''
      } ${threat.cost_impact_usd ? `Cost impact: $${threat.cost_impact_usd.toFixed(2)}/hour.` : ''}`,
      timestamp: Date.now(),
      type: 'fallback',
      threat_id: threat.threat_id
    };
    console.log(`⚠️  Fallback analysis: ${fallbackAnalysis.analysis}`);
    return fallbackAnalysis;
  }

  const prompt = `You are a cloud security analyst. Analyze this GCP security threat and provide a concise, actionable insight (2-3 sentences max):

Threat Type: ${threat.threat_type}
Confidence: ${threat.confidence_score}%
Resources Affected: ${threat.resource_count || 'Unknown'}
Cost Impact: $${(threat.cost_impact_usd || 0).toFixed(2)}/hour
Signals: ${threat.signals ? threat.signals.join(', ') : 'None'}
Project: ${threat.project_id}
Detected: ${new Date(threat.detected_at).toISOString()}

Provide:
1. Root cause (1 sentence)
2. Immediate action needed (1 sentence)
3. Cost/security impact (1 sentence)

Keep it professional, concise, and actionable.`;

  // Try each model in sequence
  for (let i = 0; i < geminiModels.length; i++) {
    const { model, name, label } = geminiModels[i];
    
    try {
      console.log(`🧠 Attempting analysis with ${label}...`);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.candidates[0].content.parts[0].text;

      console.log(`✅ Analysis successful with ${label}`);
      console.log(`📝 Analysis: ${analysisText.substring(0, 100)}...`);
      
      return {
        analysis: `🧠 ${analysisText.trim()}`,
        timestamp: Date.now(),
        type: 'ai_analysis',
        threat_id: threat.threat_id,
        model: name,
        model_label: label
      };
    } catch (error) {
      console.error(`❌ ${label} failed: ${error.message}`);
      
      if (i === geminiModels.length - 1) {
        console.log('⚠️  All models failed, using fallback');
        return {
          analysis: `⚠️ ${threat.threat_type}: ${threat.confidence_score}% confidence. Manual review recommended.`,
          timestamp: Date.now(),
          type: 'fallback',
          threat_id: threat.threat_id,
          error: 'All AI models unavailable'
        };
      }
      
      console.log(`🔄 Trying next fallback model...`);
    }
  }
}

// ============================================
// ENDPOINTS
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    project: projectId,
    connected_clients: getConnectedClientsCount(),
    vertex_ai_enabled: geminiModels.length > 0,
    available_models: geminiModels.map(m => ({
      name: m.name,
      label: m.label
    }))
  });
});

// Gemini analysis endpoint
app.post('/api/analyze-threat', async (req, res) => {
  try {
    const { threat } = req.body;
    if (!threat) {
      return res.status(400).json({ error: 'Threat data required' });
    }

    console.log(`\n🧠 API: Received threat analysis request for: ${threat.threat_id}`);
    const analysis = await analyzeThreatWithGemini(threat);
    console.log(`✅ API: Analysis complete\n`);
    
    res.json(analysis);
  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log call endpoint for demo script
app.post('/api/log-call', async (req, res) => {
  try {
    const { 
      function_name = 'image-processor',
      project_id = 'demo-project-001',
      method_name = 'cloudfunctions.googleapis.com/v1.CallFunction',
      is_baseline = false,
      timestamp = Date.now()
    } = req.body;
    
    const auditLog = {
      timestamp,
      project_id,
      resource_type: is_baseline ? 'compute_instance' : 'cloud_function',
      method_name: is_baseline ? method_name : 'cloudfunctions.googleapis.com/v1.CallFunction',
      resource_name: is_baseline 
        ? `projects/${project_id}/zones/us-central1-a/instances/${function_name}`
        : `projects/${project_id}/locations/us-central1/functions/${function_name}`,
      principal_email: `app-service@${project_id}.iam.gserviceaccount.com`,
      source_ip: `10.128.0.${Math.floor(Math.random() * 50) + 10}`,
      region: 'us-central1',
      user_agent: is_baseline 
        ? 'Google-Cloud-SDK/1.0'
        : 'Google-Cloud-Functions/2.0',
      success: true
    };
    
    await produceToKafka('simulated.audit.logs', auditLog);
    console.log(`${is_baseline ? '📝 BASELINE' : '🔄 LOOP'}: ${auditLog.method_name}`);
    
    res.json({ 
      status: 'ok',
      message: 'Audit log sent to Kafka',
      is_baseline
    });
    
  } catch (error) {
    console.error('❌ Error in /api/log-call:', error);
    res.status(500).json({ error: error.message });
  }
});

// Data endpoints
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
    metrics: events.costs.slice(0, 50),
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
  
  const latestCost = events.costs[0];
  const predictedHourlyCost = latestCost ? latestCost.current_rate_usd_per_hour : 0;
  
  res.json({
    threats: {
      total: events.threats.length,
      critical: events.threats.filter(t => t.confidence_score >= 90).length,
      by_type: {
        infinite_loop: events.threats.filter(t => t.threat_type === 'INFINITE_LOOP').length,
        breach: events.threats.filter(t => t.threat_type === 'BREACH').length,
        cost_spike: events.threats.filter(t => t.threat_type === 'COST_SPIKE').length
      }
    },
    costs: {
      current_cumulative: latestCost?.cumulative_cost_usd || 0,
      current_rate: predictedHourlyCost,
      predicted_1hr: predictedHourlyCost,
      predicted_24hr: predictedHourlyCost * 24,
      budget_used: latestCost?.budget_used_percent || 0,
      alert_level: latestCost?.alert_level || 'LOW'
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

// ============================================
// START SERVER
// ============================================
const server = app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('🚀 CloudGuard AI Backend Server');
  console.log('='.repeat(60));
  console.log(`📊 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📁 GCP Project: ${projectId}`);
  console.log('='.repeat(60));
  
  // Initialize Vertex AI
  await initializeVertexAI();
});

// Start WebSocket server with AI callback
startWebSocketServer(server, analyzeThreatWithGemini);

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
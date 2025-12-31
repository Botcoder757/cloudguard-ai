const WebSocket = require('ws');

let wss;
let analyzeThreatCallback = null;
const clients = new Set();
const analyzedThreats = new Set();
const MAX_ANALYZED_CACHE = 100;

const SERVER_START_TIME = Date.now();
console.log(`\n🆕 WebSocket Server - New Session`);
console.log(`🕐 Start: ${new Date(SERVER_START_TIME).toISOString()}\n`);

function startWebSocketServer(httpServer, aiAnalysisCallback) {
  analyzeThreatCallback = aiAnalysisCallback;
  
  wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('🔌 Client connected');
    clients.add(ws);

    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to CloudGuard AI',
      timestamp: Date.now(),
      server_start_time: SERVER_START_TIME
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  console.log('✅ WebSocket server started\n');
  return wss;
}

async function broadcastToClients(message) {
  // AI analysis for INFINITE_LOOP threats
  if (message.type === 'threat' && message.data && message.data.threat_type === 'INFINITE_LOOP') {
    const threatId = message.data.threat_id;
    
    if (analyzedThreats.has(threatId)) {
      console.log(`⏭️  Duplicate threat: ${threatId}`);
      sendToAllClients(message);
      return;
    }
    
    analyzedThreats.add(threatId);
    
    if (analyzedThreats.size > MAX_ANALYZED_CACHE) {
      const firstItem = analyzedThreats.values().next().value;
      analyzedThreats.delete(firstItem);
    }
    
    console.log(`🚨 NEW LOOP - triggering AI: ${threatId}`);
    
    if (analyzeThreatCallback) {
      console.log(`🧠 Calling Gemini...`);
      try {
        const aiAnalysis = await analyzeThreatCallback(message.data);
        console.log(`✅ Gemini done`);
        
        sendToAllClients({
          type: 'ai_insight',
          data: aiAnalysis
        });
      } catch (error) {
        console.error(`❌ AI failed:`, error.message);
      }
    } else {
      console.warn('⚠️  No AI callback');
    }
  }

  sendToAllClients(message);
}

function sendToAllClients(message) {
  const payload = JSON.stringify(message);
  
  let count = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        count++;
      } catch (error) {
        console.error('Send error:', error);
        clients.delete(client);
      }
    }
  });

  if (count > 0 && message.type !== 'cost_metric') {
    console.log(`📤 Broadcast: ${message.type} to ${count} client(s)`);
  }
}

function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  startWebSocketServer,
  broadcastToClients,
  getConnectedClientsCount
};
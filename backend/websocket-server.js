const WebSocket = require('ws');

let wss; // WebSocket server instance
const clients = new Set(); // Connected clients

/**
 * Start WebSocket server for real-time updates
 */
function startWebSocketServer(httpServer) {
  wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to CloudGuard AI',
      timestamp: Date.now()
    }));

    // Handle client messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📨 Received from client:', data);
        
        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Error parsing client message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log('🔌 Client disconnected');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  console.log('✅ WebSocket server started');
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending to client:', error);
      }
    }
  });

  if (clients.size > 0) {
    console.log(`📤 Broadcast to ${clients.size} client(s): ${data.type}`);
  }
}

/**
 * Send message to specific client
 */
function sendToClient(client, data) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

/**
 * Get number of connected clients
 */
function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  startWebSocketServer,
  broadcastToClients,
  sendToClient,
  getConnectedClientsCount
};
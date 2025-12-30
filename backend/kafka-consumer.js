const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { analyzeWithVertexAI } = require('./vertex-ai-analyzer');
const { aggregateContext } = require('./context-aggregator');
const { broadcastToClients } = require('./websocket-server');

// Kafka configuration
const kafka = new Kafka({
  kafkaJS: {
    brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: process.env.CONFLUENT_API_KEY,
      password: process.env.CONFLUENT_API_SECRET,
    },
  },
});

// Topics to consume
const TOPICS = [
  'cloudguard.threats.detected',
  'cloudguard.cost.metrics',
  'cloudguard.security.events',
  'cloudguard.anomalies.detected',
  'cloudguard.developer.activity',
];

// In-memory storage for recent events
const recentEvents = {
  threats: [],
  costs: [],
  security: [],
  anomalies: [],
  developers: [],
};

async function startKafkaConsumer() {
  const consumer = kafka.consumer({ 
    kafkaJS: {
      groupId: 'cloudguard-backend-consumer',
      sessionTimeout: 30000,
    }
  });

  await consumer.connect();
  console.log('✅ Kafka consumer connected');

  // Subscribe to all topics
  for (const topic of TOPICS) {
    await consumer.subscribe({ 
      topic, 
      fromBeginning: false // Only new messages
    });
    console.log(`📡 Subscribed to: ${topic}`);
  }

  // Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = JSON.parse(message.value.toString());
        
        console.log(`📨 Received from ${topic}:`, value);

        // Store in appropriate array
        switch(topic) {
          case 'cloudguard.threats.detected':
            recentEvents.threats.unshift(value);
            if (recentEvents.threats.length > 100) recentEvents.threats.pop();
            break;
          case 'cloudguard.cost.metrics':
            recentEvents.costs.unshift(value);
            if (recentEvents.costs.length > 50) recentEvents.costs.pop();
            break;
          case 'cloudguard.security.events':
            recentEvents.security.unshift(value);
            if (recentEvents.security.length > 50) recentEvents.security.pop();
            break;
          case 'cloudguard.anomalies.detected':
            recentEvents.anomalies.unshift(value);
            if (recentEvents.anomalies.length > 50) recentEvents.anomalies.pop();
            break;
          case 'cloudguard.developer.activity':
            recentEvents.developers.unshift(value);
            if (recentEvents.developers.length > 50) recentEvents.developers.pop();
            break;
        }

        // Aggregate context every time for high-severity items
        if (shouldAnalyze(value, topic)) {
          const context = aggregateContext(recentEvents);
          const aiAnalysis = await analyzeWithVertexAI(context, value);
          
          // Broadcast enriched data to dashboard
          broadcastToClients({
            type: 'ai_analysis',
            originalEvent: value,
            analysis: aiAnalysis,
            timestamp: Date.now(),
          });
        } else {
          // Broadcast raw event
          broadcastToClients({
            type: 'raw_event',
            topic,
            data: value,
            timestamp: Date.now(),
          });
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
  });
}

function shouldAnalyze(value, topic) {
  // Always analyze threats and security events
  if (topic === 'cloudguard.threats.detected' || topic === 'cloudguard.security.events') {
    return true;
  }
  
  // Analyze high-severity anomalies
  if (topic === 'cloudguard.anomalies.detected' && value.severity === 'CRITICAL') {
    return true;
  }
  
  // Analyze cost alerts
  if (topic === 'cloudguard.cost.metrics' && value.alert_level === 'CRITICAL') {
    return true;
  }
  
  return false;
}

function getRecentEvents() {
  return recentEvents;
}

module.exports = { 
  startKafkaConsumer,
  getRecentEvents 
};
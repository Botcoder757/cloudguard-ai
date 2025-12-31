const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
const { analyzeWithVertexAI } = require('./vertex-ai');
const { aggregateContext } = require('./context-aggregator');
const { broadcastToClients } = require('./websocket-server');

// Kafka configuration
console.log('🔧 Kafka Configuration:');
console.log('  Bootstrap:', process.env.CONFLUENT_BOOTSTRAP_SERVER);
console.log('  API Key:', process.env.CONFLUENT_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  API Secret:', process.env.CONFLUENT_API_SECRET ? '✅ Set' : '❌ Missing');

// Initialize Kafka client
const kafka = new Kafka({
  clientId: 'cloudguard-backend',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET,
  },
});

// Initialize Schema Registry client
const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL,
  auth: {
    username: process.env.SCHEMA_REGISTRY_API_KEY,
    password: process.env.SCHEMA_REGISTRY_API_SECRET,
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

// Rate limiting for AI analysis
const AI_RATE_LIMIT = {
  maxCallsPerMinute: 4, // Conservative limit
  callTimestamps: [],
  lastAnalysisTime: 0,
  minTimeBetweenCalls: 15000, // 15 seconds minimum between calls
};

function canMakeAICall() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove timestamps older than 1 minute
  AI_RATE_LIMIT.callTimestamps = AI_RATE_LIMIT.callTimestamps.filter(
    t => t > oneMinuteAgo
  );
  
  // Check if we're under the rate limit
  if (AI_RATE_LIMIT.callTimestamps.length >= AI_RATE_LIMIT.maxCallsPerMinute) {
    return false;
  }
  
  // Check minimum time between calls
  if (now - AI_RATE_LIMIT.lastAnalysisTime < AI_RATE_LIMIT.minTimeBetweenCalls) {
    return false;
  }
  
  return true;
}

function recordAICall() {
  const now = Date.now();
  AI_RATE_LIMIT.callTimestamps.push(now);
  AI_RATE_LIMIT.lastAnalysisTime = now;
}

async function startKafkaConsumer() {
  console.log('🔌 Creating Kafka consumer...');
  
  const consumer = kafka.consumer({ 
    groupId: 'cloudguard-backend-consumer',
    sessionTimeout: 30000,
  });

  console.log('🔌 Connecting to Kafka...');
  await consumer.connect();
  console.log('✅ Kafka consumer connected successfully!');

  // Subscribe to all topics
  for (const topic of TOPICS) {
    try {
      await consumer.subscribe({ 
        topic,
        fromBeginning: false // Only get new messages
      });
      console.log(`📡 Subscribed to: ${topic}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${topic}:`, error.message);
      throw error;
    }
  }

  console.log('🎧 Listening for messages...');

  // Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // Decode AVRO message using Schema Registry
        const value = await registry.decode(message.value);
        
        console.log(`📨 Received from ${topic}:`, JSON.stringify(value, null, 2));

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

        // Check if we should analyze with AI
        const shouldAnalyzeWithAI = shouldAnalyze(value, topic);
        const canCallAI = canMakeAICall();

        if (shouldAnalyzeWithAI && canCallAI) {
          console.log('🧠 Triggering AI analysis...');
          recordAICall();
          
          try {
            const context = aggregateContext(recentEvents);
            const aiAnalysis = await analyzeWithVertexAI(context, value);
            
            // Broadcast enriched data to dashboard
            broadcastToClients({
              type: 'ai_analysis',
              originalEvent: value,
              analysis: aiAnalysis,
              timestamp: Date.now(),
            });
          } catch (aiError) {
            console.error('❌ AI analysis failed:', aiError.message);
            // Still broadcast the raw event even if AI fails
            broadcastToClients({
              type: 'raw_event',
              topic,
              data: value,
              timestamp: Date.now(),
            });
          }
        } else {
          if (shouldAnalyzeWithAI && !canCallAI) {
            console.log('⏳ Rate limited - skipping AI analysis for this event');
          }
          
          // Broadcast raw event
          broadcastToClients({
            type: 'raw_event',
            topic,
            data: value,
            timestamp: Date.now(),
          });
        }

      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    },
  });
}

function shouldAnalyze(value, topic) {
  // Only analyze HIGH PRIORITY events
  
  // Always analyze high-confidence threats
  if (topic === 'cloudguard.threats.detected' && value.confidence_score >= 90) {
    return true;
  }
  
  // Only analyze CRITICAL security events
  if (topic === 'cloudguard.security.events' && value.severity === 'CRITICAL') {
    return true;
  }
  
  // Only analyze CRITICAL anomalies
  if (topic === 'cloudguard.anomalies.detected' && value.severity === 'CRITICAL') {
    return true;
  }
  
  // Only analyze cost alerts when budget is exceeded significantly
  if (topic === 'cloudguard.cost.metrics') {
    // Only analyze if budget is exceeded by 50% or more
    if (value.budget_used_percent >= 150 && value.alert_level === 'CRITICAL') {
      return true;
    }
  }
  
  // Don't analyze developer activity by default (too frequent)
  
  return false;
}

function getRecentEvents() {
  return recentEvents;
}

module.exports = { 
  startKafkaConsumer,
  getRecentEvents 
};
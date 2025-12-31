require('dotenv').config();
const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
const { broadcastToClients } = require('./websocket-server');

const bootstrapServers = process.env.KAFKA_BOOTSTRAP_SERVERS || process.env.CONFLUENT_BOOTSTRAP_SERVERS;
const apiKey = process.env.KAFKA_API_KEY || process.env.CONFLUENT_API_KEY;
const apiSecret = process.env.KAFKA_API_SECRET || process.env.CONFLUENT_API_SECRET;

const brokers = bootstrapServers 
  ? bootstrapServers.split(',').map(b => b.trim())
  : [];

if (brokers.length === 0) {
  console.error('❌ KAFKA_BOOTSTRAP_SERVERS not set!');
  process.exit(1);
}

const kafka = new Kafka({
  clientId: 'cloudguard-backend',
  brokers: brokers,
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: apiKey,
    password: apiSecret,
  },
});

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL || process.env.CONFLUENT_SCHEMA_REGISTRY_URL,
  auth: {
    username: process.env.SCHEMA_REGISTRY_API_KEY || process.env.CONFLUENT_SCHEMA_REGISTRY_API_KEY,
    password: process.env.SCHEMA_REGISTRY_API_SECRET || process.env.CONFLUENT_SCHEMA_REGISTRY_API_SECRET,
  },
});

const recentEvents = {
  threats: [],
  costs: [],
  security: [],
  anomalies: [],
  developers: [],
  aiInsights: []
};

const TOPICS = {
  THREATS: 'cloudguard.threats.detected',
  COST_METRICS: 'cloudguard.cost.metrics',
  SECURITY_EVENTS: 'cloudguard.security.events',
  ANOMALIES: 'cloudguard.anomalies.detected',
  DEVELOPER_ACTIVITY: 'cloudguard.developer.activity'
};

const MAX_MESSAGE_AGE_SECONDS = 100;
const SERVER_START_TIME = Date.now();
console.log(`🕐 Server start: ${new Date(SERVER_START_TIME).toISOString()}`);

const processedMessages = new Set();
const MAX_PROCESSED_CACHE = 1000;

async function startKafkaConsumer() {
  const consumer = kafka.consumer({ 
    groupId: 'cloudguard-dashboard-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    fromBeginning: false
  });

  await consumer.connect();
  console.log('✅ Kafka consumer connected');

  await consumer.subscribe({ 
    topics: Object.values(TOPICS),
    fromBeginning: false
  });

  console.log('📊 Subscribed to topics (new messages only)');
  console.log(`⏰ Age filter: < ${MAX_MESSAGE_AGE_SECONDS}s old`);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        await processMessage(topic, message);
      } catch (error) {
        console.error(`❌ Error processing ${topic}:`, error);
      }
    },
  });

  return consumer;
}

async function processMessage(topic, message) {
  let data;
  
  try {
    data = await registry.decode(message.value);
  } catch (avroError) {
    try {
      data = JSON.parse(message.value.toString());
    } catch (jsonError) {
      console.error(`❌ Failed to decode from ${topic}`);
      return;
    }
  }

  let timestamp = data.detected_at || data.window_end || data.timestamp || data.event_time;
  
  if (!timestamp) {
    timestamp = Date.now();
  }

  if (timestamp < 10000000000) {
    timestamp = timestamp * 1000;
  }

  // Filter 1: Server start time
  if (timestamp < SERVER_START_TIME) {
    console.log(`⏭️  SKIPPED: Before server start (${new Date(timestamp).toISOString()})`);
    return;
  }

  const ageSeconds = Math.floor((Date.now() - timestamp) / 1000);
  
  // Filter 2: Age check (but ignore absurdly old messages)
  if (ageSeconds > MAX_MESSAGE_AGE_SECONDS && ageSeconds < 1000000) {
    console.log(`⏭️  SKIPPED: Too old (${ageSeconds}s)`);
    return;
  }

  // Filter 3: Ignore messages with timestamps > 1 year old
  if (Math.abs(ageSeconds) > 31536000) {
    console.log(`⏭️  SKIPPED: Invalid timestamp (${ageSeconds}s old)`);
    return;
  }

  const messageId = `${topic}-${timestamp}-${data.threat_id || data.metric_id || data.event_id || ''}`;
  if (processedMessages.has(messageId)) {
    console.log(`⏭️  SKIPPED duplicate: ${messageId.substring(0, 50)}...`);
    return;
  }

  processedMessages.add(messageId);
  if (processedMessages.size > MAX_PROCESSED_CACHE) {
    const firstItem = processedMessages.values().next().value;
    processedMessages.delete(firstItem);
  }

  console.log(`📨 NEW from ${topic} (${ageSeconds}s old)`);

  switch (topic) {
    case TOPICS.THREATS:
      handleThreat(data);
      break;
    case TOPICS.COST_METRICS:
      handleCostMetric(data);
      break;
    case TOPICS.SECURITY_EVENTS:
      handleSecurityEvent(data);
      break;
    case TOPICS.ANOMALIES:
      handleAnomaly(data);
      break;
    case TOPICS.DEVELOPER_ACTIVITY:
      handleDeveloperActivity(data);
      break;
  }
}

function handleThreat(data) {
  recentEvents.threats.unshift(data);
  recentEvents.threats = recentEvents.threats.slice(0, 50);
  
  console.log(`🚨 THREAT: ${data.threat_type} | Confidence: ${data.confidence_score}%`);
  
  if (data.threat_type === 'INFINITE_LOOP') {
    console.log(`   🔄 INFINITE LOOP!`);
    console.log(`   📊 Calls: ${data.resource_count}`);
    console.log(`   💰 Cost: $${(data.cost_impact_usd || 0).toFixed(2)}/hr`);
  }
  
  broadcastToClients({
    type: 'threat',
    data: data
  });
}

function handleCostMetric(data) {
  recentEvents.costs.unshift(data);
  recentEvents.costs = recentEvents.costs.slice(0, 100);
  
  console.log(`💰 COST: $${(data.cumulative_cost_usd || 0).toFixed(4)} | Rate: $${(data.current_rate_usd_per_hour || 0).toFixed(2)}/hr`);
  
  broadcastToClients({
    type: 'cost_metric',
    data: data
  });
}

function handleSecurityEvent(data) {
  recentEvents.security.unshift(data);
  recentEvents.security = recentEvents.security.slice(0, 50);
  
  console.log(`🔒 SECURITY: ${data.event_type} | ${data.severity}`);
  
  broadcastToClients({
    type: 'security_event',
    data: data
  });
}

function handleAnomaly(data) {
  recentEvents.anomalies.unshift(data);
  recentEvents.anomalies = recentEvents.anomalies.slice(0, 50);
  
  console.log(`⚠️  ANOMALY: ${data.anomaly_type} | ${data.severity}`);
  
  broadcastToClients({
    type: 'anomaly',
    data: data
  });
}

function handleDeveloperActivity(data) {
  recentEvents.developers.unshift(data);
  recentEvents.developers = recentEvents.developers.slice(0, 50);
  
  console.log(`👤 DEV: ${data.developer_email} | Risk: ${data.risk_score}`);
  
  broadcastToClients({
    type: 'developer_activity',
    data: data
  });
}

function getRecentEvents() {
  return recentEvents;
}

module.exports = {
  startKafkaConsumer,
  getRecentEvents
};
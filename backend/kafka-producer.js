require('dotenv').config();
const { Kafka } = require('kafkajs');

// Support both KAFKA_ and CONFLUENT_ prefixes
const bootstrapServers = process.env.KAFKA_BOOTSTRAP_SERVERS || process.env.CONFLUENT_BOOTSTRAP_SERVERS;
const apiKey = process.env.KAFKA_API_KEY || process.env.CONFLUENT_API_KEY;
const apiSecret = process.env.KAFKA_API_SECRET || process.env.CONFLUENT_API_SECRET;

const brokers = bootstrapServers 
  ? bootstrapServers.split(',').map(b => b.trim())
  : [];

if (brokers.length === 0) {
  console.error('❌ Bootstrap servers not set!');
  process.exit(1);
}

// Initialize Kafka Producer
const kafka = new Kafka({
  clientId: 'cloudguard-producer',
  brokers: brokers,
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: apiKey,
    password: apiSecret,
  },
});

const producer = kafka.producer();

let isConnected = false;

// Connect producer
async function connectProducer() {
  if (isConnected) return;
  
  try {
    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka producer connected');
  } catch (error) {
    console.error('❌ Failed to connect Kafka producer:', error.message);
    throw error;
  }
}

// Simple produce - sends JSON (like your original)
async function produceToKafka(topic, data) {
  try {
    if (!isConnected) {
      await connectProducer();
    }

    // Send as JSON (simple, like your original setup)
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(data),
        },
      ],
    });

    console.log(`📤 Sent to ${topic}: ${data.resource_type || data.service_name || data.method_name || 'event'}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to produce to ${topic}:`, error.message);
    return false;
  }
}

// Graceful shutdown
async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('🔌 Kafka producer disconnected');
  }
}

module.exports = {
  produceToKafka,
  connectProducer,
  disconnectProducer,
};
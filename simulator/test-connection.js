require('dotenv').config();
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'test-client',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVERS],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY,
    password: process.env.CONFLUENT_API_SECRET
  }
});

async function test() {
  console.log('Testing connection...');
  console.log('Bootstrap:', process.env.CONFLUENT_BOOTSTRAP_SERVERS);
  console.log('API Key:', process.env.CONFLUENT_API_KEY?.substring(0, 10) + '...');
  
  const admin = kafka.admin();
  
  try {
    await admin.connect();
    console.log('✅ Connected!');
    
    const topics = await admin.listTopics();
    console.log('\n📋 Topics found:', topics);
    
    await admin.disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

test();
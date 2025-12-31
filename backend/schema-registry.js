const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL,
  auth: {
    username: process.env.SCHEMA_REGISTRY_API_KEY,
    password: process.env.SCHEMA_REGISTRY_API_SECRET,
  },
});

async function decodeMessage(message) {
  try {
    // The message value is AVRO-encoded with a schema ID prefix
    const decodedMessage = await registry.decode(message.value);
    return decodedMessage;
  } catch (error) {
    console.error('❌ Schema Registry decode error:', error.message);
    throw error;
  }
}

module.exports = { decodeMessage };
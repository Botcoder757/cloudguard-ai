const { Kafka, CompressionTypes } = require('kafkajs');
const chalk = require('chalk');
require('dotenv').config();

class ConfluentProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'cloudguard-simulator',
      brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVERS],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username: process.env.CONFLUENT_API_KEY,
        password: process.env.CONFLUENT_API_SECRET
      }
    });

    this.producer = this.kafka.producer({
      compression: CompressionTypes.GZIP
    });

    this.isConnected = false;
    this.messagesSent = 0;
  }

  async connect() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log(chalk.green('✅ Connected to Confluent Cloud'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect:'), error.message);
      throw error;
    }
  }

  async sendAuditLog(data) {
    return this.send(process.env.TOPIC_AUDIT_LOGS, data, data.event_id);
  }

  async sendMetric(data) {
    return this.send(process.env.TOPIC_METRICS, data, data.resource_id);
  }

  async sendBilling(data) {
    return this.send(process.env.TOPIC_BILLING, data, data.project_id);
  }

  async sendUserProfile(data) {
    return this.send(process.env.TOPIC_USER_PROFILES, data, data.email);
  }

  async send(topic, data, key) {
    try {
      await this.producer.send({
        topic: topic,
        messages: [{
          key: key,
          value: JSON.stringify(data),
          timestamp: Date.now().toString()
        }]
      });

      this.messagesSent++;
      
      if (this.messagesSent % 50 === 0) {
        console.log(chalk.blue(`📊 Sent ${this.messagesSent} messages`));
      }

      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to send:`), error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      console.log(chalk.yellow(`👋 Disconnected. Total: ${this.messagesSent} messages`));
    }
  }

  getStats() {
    return {
      messagesSent: this.messagesSent,
      isConnected: this.isConnected
    };
  }
}

module.exports = ConfluentProducer;
const { faker } = require('@faker-js/faker');

class BillingGenerator {
  constructor() {
    this.baseCost = 10;
    this.costHistory = [];
  }

  generateNormalBilling(projectId) {
    const cost = this.baseCost + faker.number.float({ min: -2, max: 2, multipleOf: 0.01 });
    
    return {
      timestamp: Date.now(),
      project_id: projectId,
      service_name: faker.helpers.arrayElement([
        'Compute Engine',
        'Cloud Functions',
        'Cloud Storage',
        'BigQuery'
      ]),
      sku_name: 'Standard VM Instance',
      cost_micros: Math.floor(cost * 1000000),
      usage_amount: faker.number.float({ min: 1, max: 10, multipleOf: 0.1 }),
      usage_unit: 'hours',
      region: 'us-central1',
      resource_labels: {
        environment: 'development'
      }
    };
  }

  generateCostSpikeData(projectId, iteration, scenario = 'exponential') {
    let cost;
    
    switch(scenario) {
      case 'exponential':
        cost = this.baseCost * Math.exp(iteration / 10);
        break;
      case 'linear_steep':
        cost = this.baseCost + (iteration * 40);
        break;
      case 'crypto_mining':
        cost = iteration === 0 ? this.baseCost : 150 + faker.number.float({ min: -5, max: 10, multipleOf: 0.01 });
        break;
      default:
        cost = this.baseCost;
    }
    
    this.costHistory.push(cost);
    
    return {
      timestamp: Date.now(),
      project_id: projectId,
      service_name: scenario === 'crypto_mining' ? 'Compute Engine' : 'BigQuery',
      sku_name: scenario === 'crypto_mining' ? 'Nvidia Tesla K80 GPU' : 'Analysis (on-demand)',
      cost_micros: Math.floor(cost * 1000000),
      usage_amount: cost / 2.5,
      usage_unit: scenario === 'crypto_mining' ? 'gpu-hours' : 'TB processed',
      region: faker.helpers.arrayElement(['us-central1', 'us-west1', 'asia-east1']),
      resource_labels: {
        cost_center: 'engineering',
        environment: 'production'
      }
    };
  }

  getCostVelocity() {
    if (this.costHistory.length < 2) return 0;
    const lastTwo = this.costHistory.slice(-2);
    return lastTwo[1] - lastTwo[0];
  }

  getCostAcceleration() {
    if (this.costHistory.length < 3) return 0;
    const lastThree = this.costHistory.slice(-3);
    const velocity1 = lastThree[1] - lastThree[0];
    const velocity2 = lastThree[2] - lastThree[1];
    return velocity2 - velocity1;
  }

  resetHistory() {
    this.costHistory = [];
  }
}

module.exports = BillingGenerator;
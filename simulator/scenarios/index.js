const chalk = require('chalk');
const AuditLogGenerator = require('../generators/auditLogs');
const MetricsGenerator = require('../generators/metrics');
const BillingGenerator = require('../generators/billing');
const UserProfileGenerator = require('../generators/userProfiles');

class ScenarioOrchestrator {
  constructor(producer) {
    this.producer = producer;
    this.auditGen = new AuditLogGenerator();
    this.metricsGen = new MetricsGenerator();
    this.billingGen = new BillingGenerator();
    this.userGen = new UserProfileGenerator();
    
    this.projectId = process.env.SIMULATION_PROJECT_ID || 'demo-project-001';
    this.userEmail = 'devops@company.com';
    this.functionName = 'image-processor';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =================================================================
  // SCENARIO 1: Account Breach (Crypto Mining)
  // =================================================================
  async runBreachScenario() {
    console.log(chalk.red.bold('\n🚨 SCENARIO 1: Account Breach - Crypto Mining Attack'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.blue('📋 Phase 1: Establishing user baseline...'));
    const userProfile = this.userGen.generateUserProfile('normal');
    await this.producer.sendUserProfile(userProfile);
    await this.sleep(2000);

    console.log(chalk.blue('✅ Phase 2: Normal activity (30 seconds)...'));
    for (let i = 0; i < 30; i++) {
      const event = this.auditGen.generateNormalEvent(this.projectId, this.userEmail);
      await this.producer.sendAuditLog(event);
      
      const billing = this.billingGen.generateNormalBilling(this.projectId);
      await this.producer.sendBilling(billing);
      
      await this.sleep(1000);
    }

    console.log(chalk.red.bold('🚨 Phase 3: BREACH DETECTED - Mass GPU creation!'));
    console.log(chalk.yellow('   → Creating 50 GPU VMs across 5 regions...'));
    
    for (let i = 0; i < 50; i++) {
      const breachEvent = this.auditGen.generateBreachEvent(this.projectId, i);
      await this.producer.sendAuditLog(breachEvent);
      
      const costEvent = this.billingGen.generateCostSpikeData(
        this.projectId, 
        Math.floor(i / 10), 
        'crypto_mining'
      );
      await this.producer.sendBilling(costEvent);
      
      if (i % 10 === 0) {
        console.log(chalk.yellow(`   → Created ${i + 1}/50 VMs...`));
      }
      
      await this.sleep(600);
    }

    console.log(chalk.green('✅ Phase 3 complete'));
    console.log(chalk.magenta('\n📊 Expected Detection:'));
    console.log(chalk.white('   • Threat Type: ACCOUNT_BREACH'));
    console.log(chalk.white('   • Confidence: 95%+'));
    console.log(chalk.white('   • Signals: 5 (resource burst, multi-region, GPU, service account, cost spike)'));
    console.log(chalk.white('   • Action: STOP ALL + LOCK ACCOUNT'));
    
    await this.sleep(5000);
  }

  // =================================================================
  // SCENARIO 2: Infinite Loop
  // =================================================================
  async runInfiniteLoopScenario() {
    console.log(chalk.red.bold('\n♾️  SCENARIO 2: Infinite Loop Detection'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.blue('✅ Phase 1: Normal function activity (20 seconds)...'));
    for (let i = 0; i < 20; i++) {
      const normalMetrics = this.metricsGen.generateNormalMetrics(
        this.projectId, 
        this.functionName
      );
      await this.producer.sendMetric(normalMetrics);
      
      const billing = this.billingGen.generateNormalBilling(this.projectId);
      await this.producer.sendBilling(billing);
      
      await this.sleep(1000);
    }

    console.log(chalk.red.bold('🚨 Phase 2: Infinite loop triggered!'));
    console.log(chalk.yellow('   → Invocations growing exponentially...'));
    
    for (let iteration = 0; iteration < 60; iteration++) {
      const loopMetrics = this.metricsGen.generateInfiniteLoopMetrics(
        this.projectId,
        this.functionName,
        iteration
      );
      
      // Send all metrics (invocation count, CPU, errors)
      for (const metric of loopMetrics) {
        await this.producer.sendMetric(metric);
      }
      
      // Send escalating cost
      const costEvent = this.billingGen.generateCostSpikeData(
        this.projectId,
        Math.floor(iteration / 5),
        'linear_steep'
      );
      await this.producer.sendBilling(costEvent);
      
      if (iteration % 10 === 0) {
        const invocations = Math.floor(100 * Math.pow(2, iteration / 10));
        console.log(chalk.yellow(`   → Iteration ${iteration}: ${invocations} invocations/sec`));
      }
      
      await this.sleep(1000);
    }

    console.log(chalk.green('✅ Phase 2 complete'));
    console.log(chalk.magenta('\n📊 Expected Detection:'));
    console.log(chalk.white('   • Threat Type: INFINITE_LOOP'));
    console.log(chalk.white('   • Confidence: 94%+'));
    console.log(chalk.white('   • Signals: Exponential growth, 100% errors, CPU pegged'));
    console.log(chalk.white('   • Action: PAUSE FUNCTION'));
    
    await this.sleep(5000);
  }

  // =================================================================
  // SCENARIO 3: Cost Spike (Expensive Query Loop)
  // =================================================================
  async runCostSpikeScenario() {
    console.log(chalk.red.bold('\n💸 SCENARIO 3: Cost Runaway - Expensive Query Loop'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.blue('✅ Phase 1: Normal BigQuery usage (15 seconds)...'));
    for (let i = 0; i < 15; i++) {
      const billing = this.billingGen.generateNormalBilling(this.projectId);
      await this.producer.sendBilling(billing);
      await this.sleep(1000);
    }

    console.log(chalk.red.bold('🚨 Phase 2: Query loop started - cost exploding!'));
    this.billingGen.resetHistory();
    
    // Cost sequence: $10 → $25 → $60 → $140 → $300 → $600
    const costSteps = [10, 25, 60, 140, 300, 600, 1100, 2000];
    
    for (let i = 0; i < costSteps.length; i++) {
      const costEvent = {
        timestamp: Date.now(),
        project_id: this.projectId,
        service_name: 'BigQuery',
        sku_name: 'Analysis (on-demand)',
        cost_micros: Math.floor(costSteps[i] * 1000000),
        usage_amount: costSteps[i] / 5,
        usage_unit: 'TB processed',
        region: 'us-central1',
        resource_labels: {
          query_id: 'expensive-query-loop',
          cost_center: 'engineering'
        }
      };
      
      await this.producer.sendBilling(costEvent);
      
      const velocity = this.billingGen.getCostVelocity();
      const acceleration = this.billingGen.getCostAcceleration();
      
      console.log(chalk.yellow(`   → Cost: $${costSteps[i]}/5min | Velocity: +$${velocity.toFixed(2)} | Accel: +$${acceleration.toFixed(2)}`));
      
      await this.sleep(5000);
    }

    console.log(chalk.green('✅ Phase 2 complete'));
    console.log(chalk.magenta('\n📊 Expected Detection:'));
    console.log(chalk.white('   • Threat Type: COST_SPIKE'));
    console.log(chalk.white('   • Confidence: 88%+'));
    console.log(chalk.white('   • Signals: Cost acceleration, same query pattern'));
    console.log(chalk.white('   • Action: ALERT + RECOMMEND KILL QUERY'));
    
    await this.sleep(5000);
  }

  // =================================================================
  // SCENARIO 4: Public Database Exposure
  // =================================================================
  async runPublicExposureScenario() {
    console.log(chalk.red.bold('\n🌐 SCENARIO 4: Public Database Exposure'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.blue('✅ Phase 1: Normal IAM activity...'));
    for (let i = 0; i < 10; i++) {
      const event = this.auditGen.generateNormalEvent(this.projectId, 'admin@company.com');
      await this.producer.sendAuditLog(event);
      await this.sleep(1000);
    }

    console.log(chalk.red.bold('🚨 Phase 2: Junior dev makes database public!'));
    const exposureEvent = this.auditGen.generatePublicExposureEvent(
      this.projectId,
      'intern@company.com',
      'sql.databases'
    );
    
    await this.producer.sendAuditLog(exposureEvent);
    
    console.log(chalk.yellow('   → IAM policy changed'));
    console.log(chalk.yellow('   → "allUsers" granted viewer access'));
    console.log(chalk.yellow('   → Resource: prod-database-001 (contains PII!)'));

    console.log(chalk.magenta('\n📊 Expected Detection:'));
    console.log(chalk.white('   • Threat Type: PUBLIC_EXPOSURE'));
    console.log(chalk.white('   • Confidence: 98%+'));
    console.log(chalk.white('   • Signals: allUsers in policy, PII resource, prod environment'));
    console.log(chalk.white('   • Action: REVERT POLICY IMMEDIATELY'));
    
    await this.sleep(5000);
  }

  // =================================================================
  // SCENARIO 5: Multi-Threat (Correlated Signals)
  // =================================================================
  async runMultiThreatScenario() {
    console.log(chalk.red.bold('\n⚡ SCENARIO 5: Multi-Threat Attack (All signals firing)'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.blue('✅ Phase 1: Baseline established...'));
    const userProfile = this.userGen.generateUserProfile('normal');
    await this.producer.sendUserProfile(userProfile);
    await this.sleep(2000);

    console.log(chalk.red.bold('🚨 Phase 2: SIMULTANEOUS THREATS!'));
    
    // Start all threats concurrently
    const promises = [];
    
    // Threat 1: Resource burst
    promises.push((async () => {
      console.log(chalk.yellow('   [1] Resource burst starting...'));
      for (let i = 0; i < 30; i++) {
        const event = this.auditGen.generateBreachEvent(this.projectId, i);
        await this.producer.sendAuditLog(event);
        await this.sleep(500);
      }
    })());
    
    // Threat 2: Cost explosion
    promises.push((async () => {
      console.log(chalk.yellow('   [2] Cost spike starting...'));
      for (let i = 0; i < 10; i++) {
        const cost = this.billingGen.generateCostSpikeData(
          this.projectId, 
          i, 
          'exponential'
        );
        await this.producer.sendBilling(cost);
        await this.sleep(1500);
      }
    })());
    
    // Threat 3: Infinite loop metrics
    promises.push((async () => {
      console.log(chalk.yellow('   [3] Function loop starting...'));
      for (let i = 0; i < 20; i++) {
        const metrics = this.metricsGen.generateInfiniteLoopMetrics(
          this.projectId,
          this.functionName,
          i
        );
        for (const metric of metrics) {
          await this.producer.sendMetric(metric);
        }
        await this.sleep(1000);
      }
    })());

    await Promise.all(promises);

    console.log(chalk.green('✅ All threats sent'));
    console.log(chalk.magenta('\n📊 Expected Detection:'));
    console.log(chalk.white('   • Threat Type: MULTI_THREAT_CORRELATED'));
    console.log(chalk.white('   • Confidence: 99%+ (multiple signals)'));
    console.log(chalk.white('   • Signals: Resource burst + Cost spike + Loop pattern'));
    console.log(chalk.white('   • Action: EMERGENCY SHUTDOWN'));
    
    await this.sleep(5000);
  }

  // =================================================================
  // Run All Scenarios in Sequence
  // =================================================================
  async runAllScenarios() {
    console.log(chalk.cyan.bold('\n' + '='.repeat(60)));
    console.log(chalk.cyan.bold('    CloudGuard AI - Complete Simulation Suite'));
    console.log(chalk.cyan.bold('='.repeat(60)));

    try {
      await this.runBreachScenario();
      await this.sleep(10000);
      
      await this.runInfiniteLoopScenario();
      await this.sleep(10000);
      
      await this.runCostSpikeScenario();
      await this.sleep(10000);
      
      await this.runPublicExposureScenario();
      await this.sleep(10000);
      
      await this.runMultiThreatScenario();
      
      console.log(chalk.green.bold('\n✅ All scenarios completed!'));
      console.log(chalk.cyan('Check Confluent Cloud for processing results.'));
      
    } catch (error) {
      console.error(chalk.red('❌ Scenario failed:'), error);
      throw error;
    }
  }
}

module.exports = ScenarioOrchestrator;
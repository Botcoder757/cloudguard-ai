#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const ConfluentProducer = require('./kafka/producer');
const ScenarioOrchestrator = require('./scenarios');
require('dotenv').config();

// CLI arguments
const argv = yargs(hideBin(process.argv))
  .option('scenario', {
    alias: 's',
    description: 'Scenario to run',
    choices: ['breach', 'infinite-loop', 'cost-spike', 'public-exposure', 'multi-threat', 'all'],
    default: 'breach'
  })
  .help()
  .alias('help', 'h')
  .argv;

async function main() {
  console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     CloudGuard AI - Data Simulator v1.0           ║'));
  console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════╝\n'));

  // Validate environment
  const requiredEnvVars = [
    'CONFLUENT_BOOTSTRAP_SERVERS',
    'CONFLUENT_API_KEY',
    'CONFLUENT_API_SECRET'
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(v => console.error(chalk.red(`   - ${v}`)));
    console.log(chalk.yellow('\n💡 Create a .env file with your Confluent credentials'));
    process.exit(1);
  }

  const producer = new ConfluentProducer();
  const orchestrator = new ScenarioOrchestrator(producer);

  try {
    // Connect to Confluent
    await producer.connect();

    // Run selected scenario
    console.log(chalk.blue(`\n🎯 Running scenario: ${argv.scenario}\n`));

    switch (argv.scenario) {
      case 'breach':
        await orchestrator.runBreachScenario();
        break;
      case 'all':
        await orchestrator.runAllScenarios();
        break;
      default:
        console.log(chalk.yellow('Scenario not implemented yet'));
    }

    // Show stats
    const stats = producer.getStats();
    console.log(chalk.green.bold('\n📊 Simulation Complete!'));
    console.log(chalk.white(`   • Messages sent: ${stats.messagesSent}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Simulation failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await producer.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⚠️  Shutting down gracefully...'));
  process.exit(0);
});

// Run
main().catch(console.error);

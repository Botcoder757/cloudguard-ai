/**
 * BACKGROUND DATA SIMULATOR - FRESH START VERSION
 * 
 * Sends baseline data through your backend API (not directly to Kafka)
 * NOW: Resets state on restart - no old data carried over
 * 
 * Run this: node background-simulator.js
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const SEND_INTERVAL = 60000; // 60 seconds

// ============================================
// FRESH START - STATE RESETS ON EVERY RUN
// ============================================
const state = {
  baselineCost: 0,
  totalCalls: 0,
  startTime: Date.now(), // THIS RUN ONLY
  sessionId: `sim-${Date.now()}` // Unique session ID
};

console.log(`\n🆕 NEW SIMULATION SESSION: ${state.sessionId}`);
console.log(`🕐 Start time: ${new Date(state.startTime).toISOString()}\n`);

/**
 * Send baseline audit log through backend API
 */
async function sendBaselineAuditLog() {
  try {
    const normalOperations = [
      'compute.instances.get',
      'storage.buckets.list', 
      'compute.instances.list',
      'logging.logEntries.list',
      'monitoring.timeSeries.list'
    ];
    
    const operation = normalOperations[Math.floor(Math.random() * normalOperations.length)];
    
    // IMPORTANT: Use current timestamp (not historical)
    const currentTimestamp = Date.now();
    
    // Send through your backend API
    const response = await axios.post(`${BACKEND_URL}/api/log-call`, {
      function_name: `vm-${Math.floor(Math.random() * 5) + 1}`,
      project_id: 'demo-project-001',
      method_name: operation,
      is_baseline: true, // Flag to indicate this is baseline, not loop
      timestamp: currentTimestamp, // Current time only
      session_id: state.sessionId // Track this simulation session
    });
    
    state.totalCalls++;
    
    // Calculate age of this message
    const ageSeconds = Math.floor((Date.now() - currentTimestamp) / 1000);
    console.log(`📝 Baseline: ${operation} (call #${state.totalCalls}, ${ageSeconds}s old)`);
    
  } catch (error) {
    console.error('❌ Error sending audit log:', error.message);
  }
}

/**
 * Send a batch of baseline activities
 */
async function sendBaselineBatch() {
  const batchTime = new Date().toISOString();
  console.log(`\n⏰ [${batchTime}] Sending baseline batch...`);
  
  // Send 2-5 normal operations (simulates light activity)
  const callCount = Math.floor(Math.random() * 4) + 2;
  
  for (let i = 0; i < callCount; i++) {
    await sendBaselineAuditLog();
    await sleep(200); // Small delay between calls
  }
  
  // Update cost (gradual increase from THIS session start)
  const minuteCost = (0.50 / 60) + (Math.random() * 0.002 - 0.001); // ~$0.008/min
  state.baselineCost += minuteCost;
  
  const sessionRuntime = Math.floor((Date.now() - state.startTime) / 60000);
  
  console.log(`💰 Session cost: $${state.baselineCost.toFixed(3)} (+$${minuteCost.toFixed(4)})`);
  console.log(`📊 Session calls: ${state.totalCalls}`);
  console.log(`⏱️  Session runtime: ${sessionRuntime} minutes`);
  console.log(`✅ Batch complete\n`);
}

/**
 * Print summary
 */
function printSummary() {
  const runTimeMinutes = Math.floor((Date.now() - state.startTime) / 60000);
  const avgCallsPerMinute = runTimeMinutes > 0 ? (state.totalCalls / runTimeMinutes).toFixed(1) : 0;
  const burnRate = runTimeMinutes > 0 ? (state.baselineCost / (runTimeMinutes / 60)).toFixed(2) : '0.00';
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 BASELINE SIMULATION SUMMARY (THIS SESSION)');
  console.log('='.repeat(60));
  console.log(`Session ID: ${state.sessionId}`);
  console.log(`Started: ${new Date(state.startTime).toISOString()}`);
  console.log(`Runtime: ${runTimeMinutes} minutes`);
  console.log(`Total Calls: ${state.totalCalls}`);
  console.log(`Average: ${avgCallsPerMinute} calls/minute`);
  console.log(`Total Cost: $${state.baselineCost.toFixed(3)}`);
  console.log(`Burn Rate: $${burnRate}/hour`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main loop
 */
async function startSimulation() {
  console.log('\n' + '='.repeat(60));
  console.log('🎬 CLOUDGUARD BASELINE SIMULATOR (FRESH START)');
  console.log('='.repeat(60));
  console.log(`🆕 Session: ${state.sessionId}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Interval: Every ${SEND_INTERVAL / 1000} seconds`);
  console.log(`🕐 Start: ${new Date(state.startTime).toISOString()}`);
  console.log('📊 Simulating: Normal VM operations');
  console.log('💰 Expected: ~$0.50/hour baseline cost');
  console.log('🆕 Note: All data from THIS run only (no historical data)');
  console.log('='.repeat(60) + '\n');
  
  // Check if backend is running
  try {
    const healthCheck = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend is reachable');
    console.log(`📡 Backend started: ${new Date(healthCheck.data.timestamp).toISOString()}`);
    console.log('');
  } catch (error) {
    console.error('❌ Backend not reachable! Make sure backend is running on port 3001\n');
    process.exit(1);
  }
  
  // Send initial batch immediately
  await sendBaselineBatch();
  
  // Send baseline every 60 seconds
  setInterval(async () => {
    await sendBaselineBatch();
  }, SEND_INTERVAL);
  
  // Print summary every 5 minutes
  setInterval(() => {
    printSummary();
  }, 5 * 60 * 1000);
  
  console.log('🟢 Simulation running... (Press Ctrl+C to stop)\n');
  console.log('💡 TIP: All messages will be < 100 seconds old\n');
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n\n🛑 Shutting down...');
  printSummary();
  console.log('👋 Simulation stopped. Restart to begin new session.\n');
  process.exit(0);
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start
startSimulation().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
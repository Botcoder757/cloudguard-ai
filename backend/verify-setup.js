// verify-setup.js
// Run this to verify your Vertex AI setup before the demo
// Usage: node verify-setup.js

require('dotenv').config();
const { VertexAI } = require('@google-cloud/vertexai');

console.log('🔍 CloudGuard AI - Setup Verification');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log(`   GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID || '❌ NOT SET'}`);
console.log(`   VERTEX_AI_PROJECT: ${process.env.VERTEX_AI_PROJECT || '❌ NOT SET'}`);
console.log(`   VERTEX_AI_LOCATION: ${process.env.VERTEX_AI_LOCATION || '❌ NOT SET (defaulting to us-central1)'}`);
console.log(`   VERTEX_AI_MODEL: ${process.env.VERTEX_AI_MODEL || '❌ NOT SET (defaulting to gemini-1.5-flash)'}`);

// Check Kafka config
console.log('\n📡 Kafka Configuration:');
console.log(`   KAFKA_BOOTSTRAP_SERVERS: ${process.env.KAFKA_BOOTSTRAP_SERVERS ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   KAFKA_API_KEY: ${process.env.KAFKA_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   SCHEMA_REGISTRY_URL: ${process.env.SCHEMA_REGISTRY_URL ? '✅ SET' : '❌ NOT SET'}`);

// Test Vertex AI
console.log('\n🧠 Testing Vertex AI Connection...');

async function testVertexAI() {
  try {
    const vertexAI = new VertexAI({
      project: process.env.VERTEX_AI_PROJECT || process.env.GCP_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1'
    });
    
    const model = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash'
    });
    
    console.log('   ✅ Vertex AI client initialized');
    
    // Test a simple prompt
    console.log('   🧪 Testing Gemini API call...');
    const result = await model.generateContent('Say "Hello from CloudGuard AI" in exactly 5 words.');
    const response = result.response;
    const text = response.candidates[0].content.parts[0].text;
    
    console.log('   ✅ Gemini API call successful!');
    console.log(`   📝 Response: ${text.trim()}`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Vertex AI test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n💡 Fix: Run these commands:');
      console.log('   gcloud auth application-default login');
      console.log('   gcloud config set project YOUR_PROJECT_ID');
    }
    
    if (error.message.includes('403') || error.message.includes('Permission denied')) {
      console.log('\n💡 Fix: Enable Vertex AI API:');
      console.log('   gcloud services enable aiplatform.googleapis.com');
      console.log('   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\');
      console.log('     --member="user:YOUR_EMAIL@gmail.com" \\');
      console.log('     --role="roles/aiplatform.user"');
    }
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      console.log('\n💡 Fix: Check your project ID in .env:');
      console.log('   VERTEX_AI_PROJECT should match: gcloud config get-value project');
    }
    
    return false;
  }
}

async function checkGcloudAuth() {
  console.log('\n🔐 Checking gcloud authentication...');
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    const { stdout: project } = await execPromise('gcloud config get-value project');
    console.log(`   ✅ Active project: ${project.trim()}`);
    
    try {
      const { stdout: token } = await execPromise('gcloud auth application-default print-access-token');
      console.log('   ✅ Application Default Credentials found');
      return true;
    } catch (error) {
      console.log('   ❌ Application Default Credentials not found');
      console.log('\n💡 Fix: Run this command:');
      console.log('   gcloud auth application-default login');
      return false;
    }
  } catch (error) {
    console.log('   ❌ gcloud CLI not configured');
    console.log('\n💡 Fix: Run these commands:');
    console.log('   gcloud auth login');
    console.log('   gcloud config set project YOUR_PROJECT_ID');
    console.log('   gcloud auth application-default login');
    return false;
  }
}

// Run all checks
async function runAllChecks() {
  const authOk = await checkGcloudAuth();
  
  if (authOk) {
    const vertexOk = await testVertexAI();
    
    console.log('\n' + '='.repeat(50));
    
    if (vertexOk) {
      console.log('🎉 SUCCESS! Everything is configured correctly!');
      console.log('\n✅ You can now:');
      console.log('   1. Start backend: node server.js');
      console.log('   2. Start frontend: cd frontend && npm start');
      console.log('   3. Run demo: cd demo-scripts && python infinite-loop.py');
      console.log('\n🚀 Ready to win the hackathon!');
    } else {
      console.log('⚠️  Vertex AI not working, but don\'t worry!');
      console.log('\n✅ You can still demo with fallback mode:');
      console.log('   - Real-time threat detection still works');
      console.log('   - Dashboard will show informative messages');
      console.log('   - Core features are all functional');
      console.log('\n💡 To enable AI insights, follow the fixes above.');
    }
  } else {
    console.log('\n❌ Authentication not configured');
    console.log('Follow the fixes above, then run this script again.');
  }
}

// Check if @google-cloud/vertexai is installed
try {
  require.resolve('@google-cloud/vertexai');
  runAllChecks();
} catch (error) {
  console.log('\n❌ Vertex AI package not installed');
  console.log('\n💡 Fix: Run this command:');
  console.log('   npm install @google-cloud/vertexai');
  console.log('\nThen run this verification script again.');
  process.exit(1);
}
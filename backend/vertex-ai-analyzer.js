const { VertexAI } = require('@google-cloud/vertexai');

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_REGION,
});

const model = vertexAI.getGenerativeModel({
  model: process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-exp',
});

/**
 * Analyze events using Vertex AI (Gemini 2.0 Flash)
 * This is the intelligent pattern recognition engine
 */
async function analyzeWithVertexAI(context, currentEvent) {
  try {
    const prompt = buildAnalysisPrompt(context, currentEvent);
    
    console.log('🧠 Sending context to Vertex AI for analysis...');
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower = more focused analysis
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response;
    const analysisText = response.candidates[0].content.parts[0].text;
    
    // Parse AI response (expecting JSON)
    const analysis = parseAIResponse(analysisText);
    
    console.log('✅ Vertex AI analysis complete:', analysis.summary);
    
    return analysis;

  } catch (error) {
    console.error('❌ Vertex AI analysis error:', error);
    return {
      error: true,
      message: 'AI analysis failed',
      fallback_analysis: basicAnalysis(currentEvent)
    };
  }
}

function buildAnalysisPrompt(context, currentEvent) {
  return `You are CloudGuard AI, an expert cloud security and cost optimization analyst. Analyze the following cloud infrastructure event and provide intelligent insights.

## CURRENT EVENT:
${JSON.stringify(currentEvent, null, 2)}

## COMPREHENSIVE CONTEXT (Last 60 minutes):

### Threat Summary:
- Total threats: ${context.threats_summary.total_count}
- By type: ${JSON.stringify(context.threats_summary.by_type)}
- High confidence: ${context.threats_summary.high_confidence}
- Affected projects: ${context.threats_summary.affected_projects.join(', ')}

### Cost Summary:
- Current rate: $${context.cost_summary.current_rate_usd_per_hour}/hour
- Budget used: ${context.cost_summary.budget_used_percent.toFixed(2)}%
- Alert level: ${context.cost_summary.alert_level}
- Trend: ${context.cost_summary.trend}

### Security Summary:
- Security events: ${context.security_summary.total_count}
- Critical events: ${context.security_summary.critical_events}
- Event types: ${JSON.stringify(context.security_summary.by_type)}

### Anomalies Summary:
- Total anomalies: ${context.anomalies_summary.total_count}
- By severity: ${JSON.stringify(context.anomalies_summary.by_severity)}
- Max deviation: ${context.anomalies_summary.max_deviation.toFixed(2)}%

### Developer Activity:
- Active developers: ${context.developer_summary.active_developers.length}
- Total actions: ${context.developer_summary.total_actions}
- High-risk developers: ${context.developer_summary.high_risk_developers.length}

### Correlations Found:
${JSON.stringify(context.correlations, null, 2)}

### Historical Baseline:
- Average threats/hour: ${context.historical_baseline.average_threats_per_hour.toFixed(2)}
- Average cost rate: $${context.historical_baseline.average_cost_rate_usd.toFixed(2)}/hour
- Typical VM creation: ${context.historical_baseline.typical_vm_creation_rate.toFixed(2)} VMs

## YOUR TASK:

Analyze this event with ADVANCED PATTERN RECOGNITION:

1. **Context-Aware Detection**: Is this legitimate activity or a threat?
   - Consider: timing, metadata, developer patterns, historical baseline
   - Look for: slow-burn attacks, gradual changes, coordinated activities

2. **Cross-Stream Correlation**: Find hidden patterns across:
   - Threats + Costs + Security + Anomalies + Developer actions
   - Temporal correlations (events happening together)
   - Behavioral deviations from baseline

3. **Root Cause Analysis**: What's REALLY happening?
   - Is this a security breach, performance bug, configuration error, or legitimate scaling?
   - What triggered this event?
   - Who or what is responsible?

4. **False Positive Detection**: Distinguish between:
   - Legitimate startup scaling vs crypto mining attack
   - CI/CD retry loop vs infinite recursion bug
   - Authorized IAM change vs compromised credentials

5. **Predictive Insights**: What happens next?
   - Will this escalate?
   - What's the potential impact?
   - How long until critical thresholds?

6. **Actionable Recommendations**: What should be done?
   - Immediate actions (block, pause, notify)
   - Investigation steps
   - Preventive measures

## RESPONSE FORMAT (JSON):

{
  "summary": "One-sentence human-readable explanation",
  "confidence_adjusted": 0-100,
  "pattern_type": "crypto_mining_attack|legitimate_scaling|performance_bug|compromised_credentials|configuration_error|ci_cd_issue|other",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "is_false_positive": true|false,
  "false_positive_probability": 0.0-1.0,
  "evidence": [
    "Specific evidence points supporting the analysis"
  ],
  "cross_stream_insights": [
    "Patterns found across multiple data streams"
  ],
  "root_cause": "Detailed explanation of what's happening",
  "predicted_impact": "What will happen if not addressed",
  "recommended_actions": {
    "immediate": ["Action 1", "Action 2"],
    "investigation": ["Step 1", "Step 2"],
    "preventive": ["Measure 1", "Measure 2"]
  },
  "developer_correlation": {
    "responsible_email": "email or null",
    "action_type": "description or null",
    "confidence": "HIGH|MEDIUM|LOW|NONE"
  },
  "time_to_critical": "Estimated time until critical impact (e.g., '2 hours', 'immediate', 'unknown')"
}

Provide ONLY the JSON response, no additional text.`;
}

function parseAIResponse(responseText) {
  try {
    // Remove markdown code blocks if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', responseText);
    
    // Return a structured fallback
    return {
      summary: "AI response parsing failed",
      confidence_adjusted: 50,
      pattern_type: "other",
      severity: "MEDIUM",
      is_false_positive: false,
      false_positive_probability: 0.5,
      evidence: ["Unable to parse AI analysis"],
      root_cause: "Error in AI response processing",
      recommended_actions: {
        immediate: ["Review event manually"],
        investigation: ["Check AI response format"],
        preventive: []
      },
      raw_response: responseText
    };
  }
}

function basicAnalysis(event) {
  // Fallback analysis if AI fails
  return {
    summary: `Event detected: ${event.threat_type || event.event_type || 'Unknown'}`,
    confidence_adjusted: event.confidence_score || 50,
    pattern_type: "other",
    severity: determineSeverity(event),
    is_false_positive: false,
    false_positive_probability: 0.5,
    evidence: ["Fallback analysis - AI unavailable"],
    root_cause: "AI analysis failed, using rule-based detection",
    recommended_actions: {
      immediate: ["Review event manually"],
      investigation: ["Investigate the event details"],
      preventive: []
    }
  };
}

function determineSeverity(event) {
  if (event.confidence_score >= 90) return 'CRITICAL';
  if (event.confidence_score >= 75) return 'HIGH';
  if (event.confidence_score >= 50) return 'MEDIUM';
  return 'LOW';
}

module.exports = { analyzeWithVertexAI };
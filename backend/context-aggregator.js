/**
 * Context Aggregator
 * Builds comprehensive context from all event streams for AI analysis
 */

function aggregateContext(recentEvents) {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  // Filter events from last hour
  const recentThreats = recentEvents.threats.filter(e => e.detected_at > oneHourAgo);
  const recentCosts = recentEvents.costs.filter(e => e.timestamp > oneHourAgo);
  const recentSecurity = recentEvents.security.filter(e => e.detected_at > oneHourAgo);
  const recentAnomalies = recentEvents.anomalies.filter(e => e.detected_at > oneHourAgo);
  const recentDevActivity = recentEvents.developers.filter(e => e.detected_at > oneHourAgo);

  // Calculate aggregated metrics
  const context = {
    time_window: {
      start: oneHourAgo,
      end: now,
      duration_minutes: 60
    },
    
    threats_summary: {
      total_count: recentThreats.length,
      by_type: countByField(recentThreats, 'threat_type'),
      high_confidence: recentThreats.filter(t => t.confidence_score >= 90).length,
      affected_projects: [...new Set(recentThreats.map(t => t.project_id))],
    },

    cost_summary: {
      total_count: recentCosts.length,
      current_rate_usd_per_hour: recentCosts[0]?.current_rate_usd_per_hour || 0,
      cumulative_cost_usd: recentCosts[0]?.cumulative_cost_usd || 0,
      budget_used_percent: recentCosts[0]?.budget_used_percent || 0,
      alert_level: recentCosts[0]?.alert_level || 'LOW',
      trend: calculateCostTrend(recentCosts),
    },

    security_summary: {
      total_count: recentSecurity.length,
      by_type: countByField(recentSecurity, 'event_type'),
      critical_events: recentSecurity.filter(s => s.severity === 'CRITICAL').length,
      affected_resources: [...new Set(recentSecurity.map(s => s.resource_name))],
    },

    anomalies_summary: {
      total_count: recentAnomalies.length,
      by_severity: countByField(recentAnomalies, 'severity'),
      by_type: countByField(recentAnomalies, 'anomaly_type'),
      max_deviation: Math.max(...recentAnomalies.map(a => a.deviation_percent || 0)),
    },

    developer_summary: {
      total_count: recentDevActivity.length,
      active_developers: [...new Set(recentDevActivity.map(d => d.developer_email))],
      high_risk_developers: recentDevActivity
        .filter(d => d.risk_score >= 70)
        .map(d => ({
          email: d.developer_email,
          risk_score: d.risk_score,
          action_count: d.action_count,
          high_risk_actions: d.high_risk_actions
        })),
      total_actions: recentDevActivity.reduce((sum, d) => sum + d.action_count, 0),
    },

    correlations: findCorrelations(
      recentThreats, 
      recentCosts, 
      recentSecurity, 
      recentAnomalies, 
      recentDevActivity
    ),

    historical_baseline: calculateBaseline(recentEvents),

    recent_events_details: {
      threats: recentThreats.slice(0, 10),
      costs: recentCosts.slice(0, 5),
      security: recentSecurity.slice(0, 10),
      anomalies: recentAnomalies.slice(0, 10),
      developers: recentDevActivity.slice(0, 10),
    }
  };

  return context;
}

function countByField(array, field) {
  return array.reduce((acc, item) => {
    const key = item[field];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function calculateCostTrend(recentCosts) {
  if (recentCosts.length < 2) return 'STABLE';
  
  const latest = recentCosts[0]?.current_rate_usd_per_hour || 0;
  const previous = recentCosts[1]?.current_rate_usd_per_hour || 0;
  
  if (latest > previous * 1.5) return 'RAPIDLY_INCREASING';
  if (latest > previous * 1.2) return 'INCREASING';
  if (latest < previous * 0.8) return 'DECREASING';
  return 'STABLE';
}

function findCorrelations(threats, costs, security, anomalies, developers) {
  const correlations = [];
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  // Find threats correlated with developer activity
  threats.forEach(threat => {
    const relatedDevActivity = developers.filter(dev => 
      Math.abs(dev.detected_at - threat.detected_at) < fiveMinutes &&
      dev.project_id === threat.project_id
    );

    if (relatedDevActivity.length > 0) {
      correlations.push({
        type: 'threat_developer_correlation',
        threat_id: threat.threat_id,
        threat_type: threat.threat_type,
        developer_email: relatedDevActivity[0].developer_email,
        time_difference_seconds: Math.abs(threat.detected_at - relatedDevActivity[0].detected_at) / 1000,
        confidence: 'HIGH'
      });
    }
  });

  // Find security events correlated with cost spikes
  security.forEach(secEvent => {
    const relatedCosts = costs.filter(cost => 
      Math.abs(cost.timestamp - secEvent.detected_at) < fiveMinutes &&
      cost.project_id === secEvent.project_id
    );

    if (relatedCosts.length > 0 && relatedCosts[0].alert_level !== 'LOW') {
      correlations.push({
        type: 'security_cost_correlation',
        security_event_id: secEvent.event_id,
        event_type: secEvent.event_type,
        cost_alert_level: relatedCosts[0].alert_level,
        time_difference_seconds: Math.abs(secEvent.detected_at - relatedCosts[0].timestamp) / 1000,
        confidence: 'MEDIUM'
      });
    }
  });

  return correlations;
}

function calculateBaseline(recentEvents) {
  // Calculate 30-day averages from stored events
  const allThreats = recentEvents.threats;
  const allCosts = recentEvents.costs;
  const allDevelopers = recentEvents.developers;

  return {
    average_threats_per_hour: allThreats.length / 24, // Approximate
    average_cost_rate_usd: 
      allCosts.reduce((sum, c) => sum + (c.current_rate_usd_per_hour || 0), 0) / Math.max(allCosts.length, 1),
    average_developer_actions_per_hour: 
      allDevelopers.reduce((sum, d) => sum + d.action_count, 0) / Math.max(allDevelopers.length, 1),
    typical_vm_creation_rate: calculateVMCreationRate(allThreats),
  };
}

function calculateVMCreationRate(threats) {
  const breachThreats = threats.filter(t => t.threat_type === 'BREACH');
  if (breachThreats.length === 0) return 0;
  
  return breachThreats.reduce((sum, t) => sum + (t.resource_count || 0), 0) / breachThreats.length;
}

module.exports = { aggregateContext };
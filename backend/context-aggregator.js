/**
 * Context Aggregator
 * Safely aggregates recent events for AI analysis
 */

function aggregateContext(recentEvents) {
  // Safely extract arrays with defaults
  const threats = Array.isArray(recentEvents?.threats) ? recentEvents.threats : [];
  const costs = Array.isArray(recentEvents?.costs) ? recentEvents.costs : [];
  const security = Array.isArray(recentEvents?.security) ? recentEvents.security : [];
  const anomalies = Array.isArray(recentEvents?.anomalies) ? recentEvents.anomalies : [];
  const developers = Array.isArray(recentEvents?.developers) ? recentEvents.developers : [];

  return {
    threats,
    costs,
    security,
    anomalies,
    developers,
    
    // Summary statistics
    summary: {
      totalThreats: threats.length,
      criticalThreats: threats.filter(t => (t.confidence_score || 0) >= 90).length,
      
      totalCosts: costs.length,
      currentBurnRate: costs[0]?.current_rate_usd_per_hour || 0,
      
      totalSecurity: security.length,
      criticalSecurity: security.filter(s => s.severity === 'CRITICAL').length,
      
      totalAnomalies: anomalies.length,
      criticalAnomalies: anomalies.filter(a => a.severity === 'CRITICAL').length,
      
      activeDevelopers: new Set(developers.map(d => d.developer_email || 'unknown')).size,
      highRiskDevelopers: developers.filter(d => (d.risk_score || 0) >= 70).length,
    },
    
    // Recent patterns (last 10 of each)
    recentPatterns: {
      threats: threats.slice(0, 10).map(t => ({
        type: t.threat_type,
        project: t.project_id,
        confidence: t.confidence_score,
      })),
      
      costs: costs.slice(0, 10).map(c => ({
        project: c.project_id,
        rate: c.current_rate_usd_per_hour,
        alert: c.alert_level,
      })),
      
      security: security.slice(0, 10).map(s => ({
        type: s.event_type,
        severity: s.severity,
        project: s.project_id,
      })),
      
      anomalies: anomalies.slice(0, 10).map(a => ({
        type: a.anomaly_type,
        severity: a.severity,
        service: a.service_name,
      })),
    },
    
    // Timestamp
    contextTimestamp: new Date().toISOString(),
  };
}

module.exports = { aggregateContext };
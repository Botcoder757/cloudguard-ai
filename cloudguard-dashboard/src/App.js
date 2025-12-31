import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, DollarSign, Activity, AlertTriangle, Brain, Radio, Clock, Bug, Lock, Users } from 'lucide-react';

function App() {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Data streams
  const [threats, setThreats] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [developerActivity, setDeveloperActivity] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  
  // Dashboard stats
  const [currentStats, setCurrentStats] = useState({
    callRate: 0,
    currentCost: 0,
    predictedHourlyCost: 0,
    totalThreats: 0
  });
  
  // Chart data
  const [callRateHistory, setCallRateHistory] = useState([]);
  const [costHistory, setCostHistory] = useState([]);
  
  // Loop detection state
  const [loopDetected, setLoopDetected] = useState(false);
  const [loopMetrics, setLoopMetrics] = useState(null);
  
  // Track analyzed threats to prevent duplicates
  const analyzedThreatsRef = useRef(new Set());
  
  // Graph animation state
  const animationIntervalRef = useRef(null);
  const animationPhaseRef = useRef('baseline'); // 'baseline', 'acceleration', 'spike'
  const animationCounterRef = useRef(0);

  // ============================================
  // WEBSOCKET CONNECTION
  // ============================================
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data.type, data.data);
        
        switch(data.type) {
          case 'threat':
            handleThreatUpdate(data.data);
            break;
          case 'security_event':
            setSecurityEvents(prev => [data.data, ...prev].slice(0, 20));
            break;
          case 'anomaly':
            setAnomalies(prev => [data.data, ...prev].slice(0, 20));
            break;
          case 'developer_activity':
            setDeveloperActivity(prev => [data.data, ...prev].slice(0, 20));
            break;
          case 'ai_insight':
            handleAiInsight(data.data);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        setWs(new WebSocket('ws://localhost:3001'));
      }, 3000);
    };
    
    setWs(websocket);
    
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // ============================================
  // GRAPH ANIMATION ENGINE
  // ============================================
  const startGraphAnimation = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    
    console.log('🎬 Starting graph animation for infinite loop');
    animationPhaseRef.current = 'baseline';
    animationCounterRef.current = 0;
    
    // Simulate realistic 3-phase pattern
    animationIntervalRef.current = setInterval(() => {
      const counter = animationCounterRef.current++;
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      let callRate = 0.5;
      let costRate = 0;
      
      // Phase 1: Baseline (0-20s)
      if (counter < 20) {
        animationPhaseRef.current = 'baseline';
        callRate = 0.5 + Math.random() * 0.3;
      }
      // Phase 2: Acceleration (20-40s)
      else if (counter < 40) {
        animationPhaseRef.current = 'acceleration';
        const progress = (counter - 20) / 20;
        callRate = 0.5 + (progress * 4) + Math.random() * 0.5;
      }
      // Phase 3: Spike (40-60s)
      else if (counter < 60) {
        animationPhaseRef.current = 'spike';
        const progress = (counter - 40) / 20;
        callRate = 5 + (progress * 45) + Math.random() * 10;
      }
      // Phase 4: Sustain high (60+)
      else {
        callRate = 45 + Math.random() * 10;
      }
      
      // Calculate cost (Cloud Functions pricing: $0.0000004/call)
      const costPerCall = 0.0000004;
      costRate = callRate * costPerCall * 3600; // per hour
      const cumulativeCost = (counter * callRate * costPerCall);
      
      // Update stats
      setCurrentStats(prev => ({
        ...prev,
        callRate: callRate,
        currentCost: cumulativeCost,
        predictedHourlyCost: costRate
      }));
      
      // Update call rate history
      setCallRateHistory(prev => {
        const newPoint = {
          time: timeLabel,
          rate: callRate,
          isLoop: animationPhaseRef.current === 'spike',
          timestamp: now.getTime()
        };
        return [...prev, newPoint].slice(-60);
      });
      
      // Update cost history
      setCostHistory(prev => {
        const newPoint = {
          time: timeLabel,
          cost: cumulativeCost,
          rate: costRate,
          timestamp: now.getTime()
        };
        return [...prev, newPoint].slice(-60);
      });
      
      console.log(`📊 Animation [${animationPhaseRef.current}]: ${callRate.toFixed(2)} calls/s, $${cumulativeCost.toFixed(4)}`);
      
    }, 1000); // Update every second
  };

  // ============================================
  // HANDLE AI INSIGHTS
  // ============================================
  const handleAiInsight = (insight) => {
    const threatId = insight.threat_id;
    
    if (analyzedThreatsRef.current.has(threatId)) {
      console.log(`⏭️  Skipping duplicate AI insight for: ${threatId}`);
      return;
    }
    
    analyzedThreatsRef.current.add(threatId);
    setAiInsights(prev => [insight, ...prev].slice(0, 5));
    console.log(`🧠 NEW AI Insight added for: ${threatId}`);
  };

  // ============================================
  // HANDLE THREAT UPDATES
  // ============================================
  const handleThreatUpdate = (threat) => {
    // Add to threats list
    setThreats(prev => {
      const exists = prev.find(t => t.threat_id === threat.threat_id);
      if (exists) return prev;
      return [threat, ...prev].slice(0, 20);
    });
    
    setCurrentStats(prev => ({
      ...prev,
      totalThreats: prev.totalThreats + 1
    }));
    
    // Detect infinite loop and trigger animation
    if (threat.threat_type === 'INFINITE_LOOP' && !loopDetected) {
      setLoopDetected(true);
      
      const signals = threat.signals || [];
      const callsSignal = signals.find(s => s.startsWith('calls_'));
      const growthSignal = signals.find(s => s.startsWith('growth_rate_'));
      
      setLoopMetrics({
        totalCalls: callsSignal ? parseInt(callsSignal.split('_')[1]) : threat.resource_count,
        growthRate: growthSignal ? parseFloat(growthSignal.split('_')[2].replace('x', '')) : 0,
        costImpact: threat.cost_impact_usd || 0,
        resource: signals.find(s => s.startsWith('resource_'))?.replace('resource_', '') || 'Unknown'
      });
      
      // START GRAPH ANIMATION!
      startGraphAnimation();
      
      console.log(`🚨 INFINITE LOOP detected: ${threat.threat_id}`);
      console.log(`🎬 Graph animation started!`);
    }
  };

  // ============================================
  // CLEANUP
  // ============================================
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  // ============================================
  // INITIAL DATA LOAD
  // ============================================
  useEffect(() => {
    fetch('http://localhost:3001/api/dashboard-summary')
      .then(res => res.json())
      .then(data => {
        setCurrentStats(prev => ({
          ...prev,
          totalThreats: data.threats?.total || 0,
          currentCost: data.costs?.current_cumulative || 0,
          predictedHourlyCost: data.costs?.predicted_1hr || 0
        }));
      })
      .catch(err => console.error('Failed to load dashboard summary:', err));
      
    fetch('http://localhost:3001/api/recent-threats')
      .then(res => res.json())
      .then(data => setThreats(data.threats || []))
      .catch(err => console.error('Failed to load threats:', err));
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(4)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  CloudGuard AI
                </h1>
                <p className="text-xs text-gray-400">Real-time Security & Cost Intelligence • Powered by Confluent + Flink + Gemini</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-300">{isConnected ? 'Live' : 'Connecting...'}</span>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
                <span className="text-sm font-medium">🧠 Gemini AI Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Total Threats"
            value={threats.length}
            color="from-red-500 to-pink-600"
            trend={threats.length > 0 ? `${threats.filter(t => t.confidence_score >= 90).length} Critical` : 'Clean'}
            pulse={threats.length > 0}
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Security Events"
            value={securityEvents.length}
            color="from-blue-500 to-cyan-600"
            trend={securityEvents.filter(e => e.severity === 'CRITICAL').length > 0 ? 'Active' : 'Normal'}
            pulse={securityEvents.filter(e => e.severity === 'CRITICAL').length > 0}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Current Cost"
            value={`$${currentStats.currentCost.toFixed(4)}`}
            color="from-yellow-500 to-orange-600"
            trend={`$${currentStats.predictedHourlyCost.toFixed(2)}/hr`}
            pulse={false}
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Call Rate"
            value={`${currentStats.callRate.toFixed(1)}/s`}
            color="from-purple-500 to-pink-600"
            trend={loopDetected ? '⚠️ Spike!' : 'Stable'}
            pulse={loopDetected}
          />
          <StatCard
            icon={<Bug className="w-5 h-5" />}
            label="Anomalies"
            value={anomalies.length}
            color="from-orange-500 to-red-600"
            trend={anomalies.filter(a => a.severity === 'CRITICAL').length > 0 ? 'Critical' : 'Low'}
            pulse={anomalies.filter(a => a.severity === 'CRITICAL').length > 0}
          />
        </div>

        {/* Loop Detection Banner */}
        {loopDetected && loopMetrics && (
          <div className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 p-0.5 rounded-2xl animate-pulse">
            <div className="bg-slate-900 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-4xl animate-spin" style={{ animationDuration: '2s' }}>🔄</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white flex items-center space-x-2">
                      <span>⚠️ INFINITE LOOP DETECTED!</span>
                    </h3>
                    <p className="text-gray-300 mt-1 text-lg">
                      Resource: <strong>{loopMetrics.resource}</strong> • Exponential growth pattern • Immediate action required
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-4xl font-bold text-red-400">{loopMetrics.totalCalls}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Total Calls</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-orange-400">{loopMetrics.growthRate.toFixed(1)}x</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Growth Rate</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-yellow-400">${loopMetrics.costImpact.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Cost Impact/hr</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Call Rate Chart */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Radio className={`w-5 h-5 ${loopDetected ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                  <span>Live Function Call Rate</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {animationPhaseRef.current === 'baseline' && '✅ Baseline activity'}
                  {animationPhaseRef.current === 'acceleration' && '⚠️ Accelerating...'}
                  {animationPhaseRef.current === 'spike' && '🔥 EXPONENTIAL SPIKE!'}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${loopDetected ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                  {currentStats.callRate.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">calls/second</div>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={callRateHistory}>
                <defs>
                  <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={loopDetected ? "#ef4444" : "#10b981"} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={loopDetected ? "#ef4444" : "#10b981"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="time" 
                  stroke="#ffffff30"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#ffffff30"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke={loopDetected ? "#ef4444" : "#10b981"}
                  strokeWidth={2}
                  fill="url(#callGradient)"
                  animationDuration={300}
                  name="Rate (calls/s)"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300">
              📊 <strong>Data Source:</strong> Flink SQL real-time threat detection
            </div>
          </div>

          {/* Cost Chart */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  <span>Live Cost Accumulation</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">Real-time GCP spending tracker</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-yellow-400">
                  ${currentStats.currentCost.toFixed(4)}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Cumulative USD</div>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={costHistory}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="time" 
                  stroke="#ffffff30"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#ffffff30"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#fbbf24" 
                  strokeWidth={2}
                  fill="url(#costGradient)"
                  animationDuration={300}
                  name="Cost ($)"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-xs text-gray-400 uppercase">Predicted/Hour</div>
                <div className="text-xl font-bold text-yellow-400">${currentStats.predictedHourlyCost.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="text-xs text-gray-400 uppercase">Predicted/24hr</div>
                <div className="text-xl font-bold text-orange-400">${(currentStats.predictedHourlyCost * 24).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-xs text-gray-400 uppercase">Budget Left</div>
                <div className="text-xl font-bold text-green-400">$99.{(100 - currentStats.currentCost * 100).toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AI Insights */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <Brain className="w-5 h-5 text-purple-500" />
              <span>AI Insights (Gemini)</span>
              <span className="ml-auto text-xs text-gray-500">{aiInsights.length}/5</span>
            </h2>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {aiInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Waiting for threats to analyze...</p>
                  <p className="text-xs mt-2">Vertex AI Gemini ready</p>
                </div>
              ) : (
                aiInsights.map((insight, i) => (
                  <div 
                    key={insight.threat_id + i} 
                    className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 hover:scale-[1.02] transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 leading-relaxed">{insight.analysis}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(insight.timestamp).toLocaleTimeString()}</span>
                          </div>
                          {insight.model_label && (
                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                              {insight.model_label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Threat Feed */}
          <div className="lg:col-span-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Live Threat Feed</span>
              <span className="ml-auto text-sm font-normal text-gray-400">
                {threats.length} active
              </span>
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {threats.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Shield className="w-20 h-20 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No threats detected</p>
                  <p className="text-sm mt-2">System monitoring active</p>
                </div>
              ) : (
                threats.map((threat, i) => (
                  <ThreatCard key={threat.threat_id} threat={threat} index={i} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Additional Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-blue-500" />
              <span>Security Events</span>
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {securityEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No security events</p>
              ) : (
                securityEvents.map((event, i) => (
                  <div key={i} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{event.event_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        event.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{event.resource_name}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <Bug className="w-5 h-5 text-orange-500" />
              <span>Anomalies</span>
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {anomalies.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No anomalies detected</p>
              ) : (
                anomalies.map((anomaly, i) => (
                  <div key={i} className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{anomaly.anomaly_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        anomaly.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{anomaly.service_name}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-cyan-500" />
              <span>Developer Activity</span>
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {developerActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No activity logged</p>
              ) : (
                developerActivity.map((activity, i) => (
                  <div key={i} className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white truncate">{activity.developer_email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        activity.risk_score >= 70 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        Risk: {activity.risk_score}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{activity.action_count} actions</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Custom Styles */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.7);
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color, trend, pulse }) {
  return (
    <div className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl hover:scale-105 transition-transform ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${
          pulse ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {trend}
        </span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function ThreatCard({ threat, index }) {
  const getThreatColor = (type) => {
    const colors = {
      BREACH: 'from-red-500 to-pink-600',
      INFINITE_LOOP: 'from-orange-500 to-red-600',
      COST_SPIKE: 'from-yellow-500 to-orange-600',
      ANOMALY: 'from-purple-500 to-pink-600'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getThreatIcon = (type) => {
    const icons = {
      BREACH: '🚨',
      INFINITE_LOOP: '🔄',
      COST_SPIKE: '💰',
      ANOMALY: '⚠️'
    };
    return icons[type] || '⚡';
  };

  return (
    <div 
      className={`bg-gradient-to-r ${getThreatColor(threat.threat_type)} p-0.5 rounded-xl hover:scale-[1.02] transition-all cursor-pointer`}
      style={{ animation: `slideIn 0.5s ease-out ${index * 0.1}s both` }}
    >
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="text-3xl">{getThreatIcon(threat.threat_type)}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-bold text-white text-lg">{threat.threat_type}</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{threat.project_id}</span>
              </div>
              
              <p className="text-sm text-gray-400 mb-3">
                {threat.resource_count && `${threat.resource_count} resources affected`}
                {threat.cost_impact_usd && ` • ${threat.cost_impact_usd.toFixed(2)}/hr impact`}
              </p>
              
              {threat.signals && threat.signals.length > 0 && (
                <div className="mt-2 space-y-1">
                  {threat.signals.slice(0, 3).map((signal, idx) => (
                    <div key={idx} className="text-xs text-gray-500 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                      <span>{signal.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Confidence: {threat.confidence_score}%</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(threat.detected_at).toLocaleTimeString()}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
            threat.confidence_score >= 90 ? 'bg-red-500/20 text-red-400' :
            threat.confidence_score >= 75 ? 'bg-orange-500/20 text-orange-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {threat.confidence_score >= 90 ? 'CRITICAL' :
             threat.confidence_score >= 75 ? 'HIGH' : 'MEDIUM'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';

export function useWebSocket(url) {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [threats, setThreats] = useState([]);
  const [costs, setCosts] = useState([]);
  const [security, setSecurity] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [stats, setStats] = useState({
    totalThreats: 0,
    criticalThreats: 0,
    totalCost: 0,
    activeProjects: 1
  });

  useEffect(() => {
    let websocket;
    let reconnectTimeout;

    const connect = () => {
      try {
        console.log('🔌 Connecting to WebSocket:', url);
        websocket = new WebSocket(url);

        websocket.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Received:', data.type, data);

            // AI Analysis
            if (data.type === 'ai_analysis') {
              console.log('🧠 AI Analysis received');
              setAiInsights(prev => [data, ...prev].slice(0, 10));
              
              // Add to appropriate category
              const eventData = data.originalEvent;
              if (eventData && eventData.threat_type) {
                setThreats(prev => {
                  const exists = prev.some(t => t.threat_id === eventData.threat_id);
                  if (exists) return prev;
                  return [eventData, ...prev].slice(0, 50);
                });
                setStats(prev => ({
                  ...prev,
                  totalThreats: prev.totalThreats + 1,
                  criticalThreats: eventData.confidence_score >= 90 ? prev.criticalThreats + 1 : prev.criticalThreats
                }));
              }
            }

            // Raw Events
            if (data.type === 'raw_event') {
              const topic = data.topic || '';
              const eventData = data.data;

              console.log('📦 Raw event from topic:', topic);

              // Handle threats
              if (topic.includes('threats')) {
                console.log('🚨 Threat data:', eventData);
                setThreats(prev => {
                  const exists = prev.some(t => t.threat_id === eventData.threat_id);
                  if (exists) return prev;
                  const newThreats = [eventData, ...prev].slice(0, 50);
                  
                  setStats(prevStats => ({
                    ...prevStats,
                    totalThreats: newThreats.length,
                    criticalThreats: newThreats.filter(t => t.confidence_score >= 90).length
                  }));
                  
                  return newThreats;
                });
              } 
              
              // Handle cost metrics
              else if (topic.includes('cost')) {
                console.log('💰 Cost data:', eventData);
                setCosts(prev => {
                  const newCosts = [{
                    ...eventData,
                    total_cost: eventData.cumulative_cost_usd || eventData.cost_impact_usd || 0
                  }, ...prev].slice(0, 30);
                  
                  // Update total cost in stats
                  const latestCost = eventData.cumulative_cost_usd || eventData.cost_impact_usd || 0;
                  setStats(prevStats => ({
                    ...prevStats,
                    totalCost: latestCost
                  }));
                  
                  return newCosts;
                });
              } 
              
              // Handle security events
              else if (topic.includes('security')) {
                console.log('🔒 Security data:', eventData);
                setSecurity(prev => [eventData, ...prev].slice(0, 30));
              } 
              
              // Handle anomalies
              else if (topic.includes('anomalies')) {
                console.log('⚠️ Anomaly data:', eventData);
                setAnomalies(prev => [eventData, ...prev].slice(0, 30));
              }
            }

          } catch (err) {
            console.error('❌ Failed to parse message:', err);
          }
        };

        websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

        websocket.onclose = () => {
          console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        setWs(websocket);

      } catch (err) {
        console.error('❌ Connection failed:', err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (websocket) {
        websocket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [url]);

  return {
    isConnected,
    threats,
    costs,
    security,
    anomalies,
    aiInsights,
    stats
  };
}
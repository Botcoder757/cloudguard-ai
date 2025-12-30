const { faker } = require('@faker-js/faker');

class MetricsGenerator {
  constructor() {
    this.baselineInvocations = 100;
  }

  generateNormalMetrics(projectId, functionName) {
    return {
      timestamp: Date.now(),
      project_id: projectId,
      resource_type: 'cloud_function',
      resource_id: functionName,
      metric_name: 'function/execution_count',
      metric_value: faker.number.int({ min: 80, max: 120 }),
      labels: {
        function_name: functionName,
        status: 'ok',
        memory: '256MB',
        region: 'us-central1'
      }
    };
  }

  generateInfiniteLoopMetrics(projectId, functionName, iteration) {
    const invocationCount = Math.floor(this.baselineInvocations * Math.pow(2, iteration / 10));
    
    return [
      {
        timestamp: Date.now(),
        project_id: projectId,
        resource_type: 'cloud_function',
        resource_id: functionName,
        metric_name: 'function/execution_count',
        metric_value: invocationCount,
        labels: {
          function_name: functionName,
          status: 'error',
          error_type: 'RecursionError'
        }
      },
      {
        timestamp: Date.now(),
        project_id: projectId,
        resource_type: 'cloud_function',
        resource_id: functionName,
        metric_name: 'function/cpu_utilization',
        metric_value: 0.99,
        labels: {
          function_name: functionName
        }
      },
      {
        timestamp: Date.now(),
        project_id: projectId,
        resource_type: 'cloud_function',
        resource_id: functionName,
        metric_name: 'function/error_rate',
        metric_value: 1.0,
        labels: {
          function_name: functionName,
          error_message: 'Maximum call stack size exceeded'
        }
      }
    ];
  }
}

module.exports = MetricsGenerator;
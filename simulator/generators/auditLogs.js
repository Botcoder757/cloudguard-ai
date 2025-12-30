const { faker } = require('@faker-js/faker');

class AuditLogGenerator {
  constructor() {
    this.eventTypes = {
      normal: {
        methods: ['get', 'list', 'update'],
        resources: ['compute.instances', 'storage.buckets', 'cloudfunctions.function'],
        regions: ['us-central1', 'us-east1'],
        successRate: 0.98
      },
      breach: {
        methods: ['compute.instances.insert', 'compute.instances.start'],
        resources: ['compute.instances'],
        regions: ['asia-east1', 'europe-west1', 'us-west1', 'australia-southeast1', 'southamerica-east1'],
        successRate: 0.95
      }
    };
  }

  generateNormalEvent(projectId, userEmail) {
    const config = this.eventTypes.normal;
    
    return {
      event_id: faker.string.uuid(),
      timestamp: Date.now(),
      project_id: projectId,
      resource_type: faker.helpers.arrayElement(config.resources),
      method_name: faker.helpers.arrayElement(config.methods),
      resource_name: this._generateResourceName(),
      principal_email: userEmail,
      source_ip: faker.internet.ip(),
      region: faker.helpers.arrayElement(config.regions),
      user_agent: 'gcloud-sdk/400.0.0',
      success: Math.random() < config.successRate,
      metadata: {}
    };
  }

  generateBreachEvent(projectId, iteration) {
    const config = this.eventTypes.breach;
    const machineTypes = [
      'n1-standard-8-gpu-nvidia-tesla-k80',
      'n1-highmem-16-gpu-nvidia-tesla-v100',
      'a2-highgpu-1g'
    ];
    
    return {
      event_id: faker.string.uuid(),
      timestamp: Date.now(),
      project_id: projectId,
      resource_type: 'compute.instances',
      method_name: 'compute.instances.insert',
      resource_name: `projects/${projectId}/zones/${faker.helpers.arrayElement(config.regions)}/instances/gpu-miner-${iteration}`,
      principal_email: `service-bot-${faker.string.alphanumeric(8)}@gserviceaccount.com`,
      source_ip: this._generateSuspiciousIP(),
      region: faker.helpers.arrayElement(config.regions),
      user_agent: 'python-requests/2.28.0',
      success: true,
      metadata: {
        machine_type: faker.helpers.arrayElement(machineTypes),
        labels: {
          purpose: 'mining',
          created_by: 'automated',
          priority: 'high'
        },
        disks: [{
          boot: true,
          source_image: 'ubuntu-2004-focal-v20231213'
        }]
      }
    };
  }

  generatePublicExposureEvent(projectId, userEmail, resourceType = 'storage.buckets') {
    return {
      event_id: faker.string.uuid(),
      timestamp: Date.now(),
      project_id: projectId,
      resource_type: resourceType,
      method_name: 'SetIamPolicy',
      resource_name: `projects/${projectId}/${resourceType}/prod-database-001`,
      principal_email: userEmail,
      source_ip: faker.internet.ip(),
      region: 'us-central1',
      user_agent: 'gcloud-sdk/400.0.0',
      success: true,
      metadata: {
        policy_delta: {
          binding_deltas: [{
            action: 'ADD',
            role: 'roles/storage.objectViewer',
            member: 'allUsers'
          }]
        },
        resource_tags: {
          environment: 'production',
          data_classification: 'confidential',
          compliance: 'pci-dss'
        }
      }
    };
  }

  _generateResourceName() {
    const types = ['instance', 'bucket', 'function', 'database'];
    const type = faker.helpers.arrayElement(types);
    return `projects/demo-project/resources/${type}-${faker.string.alphanumeric(8)}`;
  }

  _generateSuspiciousIP() {
    const suspiciousRanges = [
      '185.220.101',
      '45.142.212',
      '94.130.12'
    ];
    const range = faker.helpers.arrayElement(suspiciousRanges);
    return `${range}.${faker.number.int({ min: 1, max: 254 })}`;
  }
}

module.exports = AuditLogGenerator;
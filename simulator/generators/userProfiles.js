const { faker } = require('@faker-js/faker');

class UserProfileGenerator {
  generateUserProfile(userType = 'normal') {
    const profiles = {
      normal: {
        email: 'devops@company.com',
        account_age_days: 365,
        typical_regions: ['us-central1', 'us-east1'],
        avg_resources_per_day: 5,
        has_used_gpu_before: false,
        typical_work_hours: '09:00-17:00',
        timezone: 'America/New_York',
        budget_limit_usd: 1000,
        mfa_enabled: true,
        role: 'developer'
      }
    };
    
    return {
      user_id: faker.string.uuid(),
      timestamp: Date.now(),
      ...profiles[userType]
    };
  }
}

module.exports = UserProfileGenerator;
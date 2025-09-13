// Test setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'skill_swap_test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing';

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Keep errors visible
};

// Global test utilities
global.testHelper = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    subscription_tier: 'free',
    role: 'user',
    verified: true,
    created_at: new Date().toISOString()
  }),
  
  createMockSkill: () => ({
    id: 'test-skill-id',
    title: 'Test Skill',
    description: 'A test skill for testing',
    price_per_hour: 25.00,
    user_id: 'test-user-id',
    category_id: 1,
    created_at: new Date().toISOString()
  })
};
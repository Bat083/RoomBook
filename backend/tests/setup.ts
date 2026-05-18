// Test setup file
// Global test configuration for Jest

import { PrismaClient } from '@prisma/client';

// Set test environment
process.env.NODE_ENV = 'test';

// Use test database URL if not already set
if (!process.env.DATABASE_URL?.includes('_test')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL?.replace(
    /(roombook)(_dev)?/,
    '$1_test'
  ) || 'postgresql://roombook:roombook_dev_password@localhost:5432/roombook_test';
}

// Global Prisma client for test cleanup
const prisma = new PrismaClient();

beforeAll(async () => {
  // Global setup before all tests
  console.log('Test Database URL:', process.env.DATABASE_URL);

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('✓ Test database connected');
  } catch (error) {
    console.error('✗ Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Global cleanup after all tests
  await prisma.$disconnect();
});

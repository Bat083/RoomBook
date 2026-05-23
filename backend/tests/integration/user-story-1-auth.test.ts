import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('User Story 1 - Authentication (T031)', () => {
  // Test user IDs (tracked for potential future use)
  // let standardUserId: string;
  // let vipUserId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_auth_test_' } },
    });

    // Create test standard user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    await prisma.user.create({
      data: {
        username: 'us1_auth_test_standard',
        passwordHash: hashedPassword,
        email: 'us1_auth_standard@example.com',
        fullName: 'US1 Auth Test Standard User',
        userType: 'STANDARD',
        rankingScore: 100,
      },
    });

    // Create test VIP user (simulating superuser credentials)
    const vipHashedPassword = await bcrypt.hash('000000', 12);
    await prisma.user.create({
      data: {
        username: 'us1_auth_test_vip',
        passwordHash: vipHashedPassword,
        email: 'us1_auth_vip@example.com',
        fullName: 'US1 Auth Test VIP User',
        userType: 'VIP',
        rankingScore: 100,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_auth_test_' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully login with valid standard user credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_standard',
          password: 'testpassword123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        username: 'us1_auth_test_standard',
        email: 'us1_auth_standard@example.com',
        fullName: 'US1 Auth Test Standard User',
        userType: 'STANDARD',
        rankingScore: 100,
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should successfully login with valid VIP user credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_vip',
          password: '000000',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        username: 'us1_auth_test_vip',
        userType: 'VIP',
      });
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_standard',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|credentials/i);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_nonexistent',
          password: 'anypassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|credentials/i);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across multiple requests', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_standard',
          password: 'testpassword123',
        })
        .expect(200);

      // Access protected endpoint with session
      const meResponse = await agent.get('/api/v1/auth/me').expect(200);

      expect(meResponse.body).toHaveProperty('user');
      expect(meResponse.body.user.username).toBe('us1_auth_test_standard');
      expect(meResponse.body.user.userType).toBe('STANDARD');
    });

    it('should destroy session on logout', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_auth_test_standard',
          password: 'testpassword123',
        })
        .expect(200);

      // Verify session is active
      await agent.get('/api/v1/auth/me').expect(200);

      // Logout
      await agent.post('/api/v1/auth/logout').expect(200);

      // Verify session is destroyed
      await agent.get('/api/v1/auth/me').expect(401);
    });
  });
});

import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('POST /api/v1/auth/login', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        passwordHash: hashedPassword,
        email: 'testuser@example.com',
        fullName: 'Test User',
        userType: 'STANDARD',
        rankingScore: 100,
      },
    });
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  it('should successfully login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('testuser');
    expect(response.body.user.email).toBe('testuser@example.com');
    expect(response.body.user.userType).toBe('STANDARD');
    expect(response.body).toHaveProperty('message', 'Login successful');

    // Verify session cookie is set
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should return 401 with invalid password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'wrongpassword',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'INVALID_CREDENTIALS');
    expect(response.body).toHaveProperty('message');
  });

  it('should return 401 with non-existent username', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'nonexistentuser',
        password: 'testpassword123',
      })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'INVALID_CREDENTIALS');
  });

  it('should return 400 with missing username', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        password: 'testpassword123',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 with missing password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should maintain session across requests', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword123',
      })
      .expect(200);

    // Access protected endpoint with session
    const meResponse = await agent.get('/api/v1/auth/me').expect(200);

    expect(meResponse.body.user.username).toBe('testuser');
  });

  it('should logout and clear session', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword123',
      })
      .expect(200);

    // Logout
    await agent.post('/api/v1/auth/logout').expect(200);

    // Try to access protected endpoint (should fail)
    await agent.get('/api/v1/auth/me').expect(401);
  });
});

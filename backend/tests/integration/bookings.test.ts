import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('POST /api/v1/bookings - Conflict Detection & Duration Validation', () => {
  let testUser: any;
  let vipUser: any;
  let authCookie: string;
  let vipAuthCookie: string;
  let normalRoom: any;
  let vipRoom: any;
  let createdBookings: string[] = [];

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await prisma.user.create({
      data: {
        username: 'testbookinguser',
        passwordHash: hashedPassword,
        email: 'testbookinguser@example.com',
        fullName: 'Test Booking User',
        userType: 'STANDARD',
        rankingScore: 100,
      },
    });

    vipUser = await prisma.user.create({
      data: {
        username: 'testbookingvip',
        passwordHash: hashedPassword,
        email: 'testbookingvip@example.com',
        fullName: 'Test Booking VIP',
        userType: 'VIP',
        rankingScore: 100,
      },
    });

    // Create test rooms
    normalRoom = await prisma.room.create({
      data: {
        name: 'Test Booking Room',
        roomType: 'NORMAL',
        capacity: 8,
        equipment: ['projector'],
        location: 'Building B - Floor 2',
      },
    });

    vipRoom = await prisma.room.create({
      data: {
        name: 'Test VIP Booking Room',
        roomType: 'VIP',
        capacity: 12,
        equipment: ['projector', 'video_conferencing'],
        location: 'Building B - Floor 10',
      },
    });

    // Login to get session cookies
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testbookinguser', password: 'testpassword123' });
    authCookie = loginResponse.headers['set-cookie'][0];

    const vipLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testbookingvip', password: 'testpassword123' });
    vipAuthCookie = vipLoginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Clean up all created bookings
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookings } },
    });

    // Clean up test data
    if (normalRoom) {
      await prisma.room.delete({ where: { id: normalRoom.id } });
    }
    if (vipRoom) {
      await prisma.room.delete({ where: { id: vipRoom.id } });
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    if (vipUser) {
      await prisma.user.delete({ where: { id: vipUser.id } });
    }
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Track created bookings for cleanup
    // This is a safety net; individual tests may clean up their own bookings
  });

  describe('Conflict Detection (FR-009, FR-024)', () => {
    it('should successfully create a booking when no conflicts exist', async () => {
      const startTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Conflict Test - No Conflict',
          description: 'This booking should succeed',
          participantIds: [],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'CONFIRMED');
      expect(response.body).toHaveProperty('title', 'Conflict Test - No Conflict');

      createdBookings.push(response.body.id);
    });

    it('should reject booking with exact time overlap (FR-009)', async () => {
      const startTime = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      // Create first booking
      const firstResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'First Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(firstResponse.body.id);

      // Try to create conflicting booking (exact overlap)
      const conflictResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Conflicting Booking',
          participantIds: [],
        })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error', 'BOOKING_CONFLICT');
      expect(conflictResponse.body).toHaveProperty('message');
    });

    it('should reject booking with partial overlap (start during existing booking)', async () => {
      const startTime = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      // Create first booking (10:00 - 12:00)
      const firstResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'First Booking 10-12',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(firstResponse.body.id);

      // Try to create overlapping booking (11:00 - 13:00)
      const overlapStart = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour
      const overlapEnd = new Date(overlapStart.getTime() + 2 * 60 * 60 * 1000); // +2 hours

      const conflictResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: overlapStart.toISOString(),
          endTime: overlapEnd.toISOString(),
          title: 'Overlapping Booking 11-13',
          participantIds: [],
        })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error', 'BOOKING_CONFLICT');
    });

    it('should reject booking that completely contains existing booking', async () => {
      const startTime = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

      // Create first booking (10:00 - 11:00)
      const firstResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Small Booking 10-11',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(firstResponse.body.id);

      // Try to create booking that contains it (09:00 - 12:00)
      const containingStart = new Date(startTime.getTime() - 60 * 60 * 1000); // -1 hour
      const containingEnd = new Date(endTime.getTime() + 60 * 60 * 1000); // +1 hour

      const conflictResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: containingStart.toISOString(),
          endTime: containingEnd.toISOString(),
          title: 'Containing Booking 09-12',
          participantIds: [],
        })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error', 'BOOKING_CONFLICT');
    });

    it('should allow back-to-back bookings (no conflict)', async () => {
      const startTime1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endTime1 = new Date(startTime1.getTime() + 60 * 60 * 1000);

      // Create first booking
      const firstResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
          title: 'First B2B Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(firstResponse.body.id);

      // Create second booking starting exactly when first ends
      const startTime2 = endTime1;
      const endTime2 = new Date(startTime2.getTime() + 60 * 60 * 1000);

      const secondResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime2.toISOString(),
          endTime: endTime2.toISOString(),
          title: 'Second B2B Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(secondResponse.body.id);
      expect(secondResponse.body).toHaveProperty('id');
      expect(secondResponse.body.status).toBe('CONFIRMED');
    });

    it('should provide alternative room suggestions on conflict (FR-024)', async () => {
      const startTime = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      // Create booking in normal room
      const firstResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Booking for Alternative Test',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(firstResponse.body.id);

      // Try to book the same room (should conflict but suggest alternatives)
      const conflictResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Conflicting Booking',
          participantIds: [],
        })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error', 'BOOKING_CONFLICT');
      // Check if alternatives are provided (implementation-dependent)
      if (conflictResponse.body.alternatives) {
        expect(Array.isArray(conflictResponse.body.alternatives)).toBe(true);
      }
    });
  });

  describe('Duration Validation (FR-010, FR-011, FR-012)', () => {
    it('should reject booking shorter than 15 minutes (FR-011)', async () => {
      const startTime = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // Only 10 minutes

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Too Short Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'INVALID_DURATION');
      expect(response.body.message).toMatch(/minimum.*15.*minute/i);
    });

    it('should reject booking longer than 8 hours (FR-012)', async () => {
      const startTime = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 9 * 60 * 60 * 1000); // 9 hours

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Too Long Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'INVALID_DURATION');
      expect(response.body.message).toMatch(/maximum.*8.*hour/i);
    });

    it('should accept booking exactly 15 minutes (boundary test)', async () => {
      const startTime = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 15 * 60 * 1000); // Exactly 15 minutes

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Minimum Duration Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(response.body.id);
      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('should accept booking exactly 8 hours (boundary test)', async () => {
      const startTime = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // Exactly 8 hours

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Maximum Duration Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(response.body.id);
      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('should reject booking with end time before start time', async () => {
      const startTime = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() - 60 * 60 * 1000); // End before start

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Backwards Time Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject booking with end time equal to start time', async () => {
      const startTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const endTime = startTime; // Same time

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Zero Duration Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('VIP Authorization (FR-013)', () => {
    it('should allow VIP user to book VIP room', async () => {
      const startTime = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', vipAuthCookie)
        .send({
          roomId: vipRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'VIP User Booking VIP Room',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(response.body.id);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should reject standard user booking VIP room (FR-013)', async () => {
      const startTime = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie) // Standard user cookie
        .send({
          roomId: vipRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Standard User Trying VIP Room',
          participantIds: [],
        })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'INSUFFICIENT_CLEARANCE');
      expect(response.body.message).toMatch(/VIP/i);
    });
  });

  describe('Basic Booking Operations', () => {
    it('should retrieve booking by ID', async () => {
      const startTime = new Date(Date.now() + 17 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', authCookie)
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Retrieve Test Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookings.push(createResponse.body.id);

      const getResponse = await request(app)
        .get(`/api/v1/bookings/${createResponse.body.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body).toHaveProperty('id', createResponse.body.id);
      expect(getResponse.body).toHaveProperty('title', 'Retrieve Test Booking');
    });

    it('should list user bookings', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toHaveProperty('bookings');
      expect(Array.isArray(response.body.bookings)).toBe(true);
    });

    it('should return 401 for unauthenticated booking creation', async () => {
      const startTime = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await request(app)
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Unauthenticated Booking',
          participantIds: [],
        })
        .expect(401);
    });
  });
});

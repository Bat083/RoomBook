import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, RoomType, UserType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addHours, addMinutes, addSeconds } from 'date-fns';

const prisma = new PrismaClient();

describe('User Story 1 - Duration Validation (T034)', () => {
  let standardUserAgent: request.Agent;
  let normalRoomId: string;
  let createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_duration_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_duration_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Duration Room' } },
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    await prisma.user.create({
      data: {
        username: 'us1_duration_test_user',
        passwordHash: hashedPassword,
        email: 'us1_duration@example.com',
        fullName: 'US1 Duration Test User',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: 'US1 Test Duration Room',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['projector'],
        location: 'Test Building',
      },
    });
    normalRoomId = room.id;

    // Create authenticated agent
    standardUserAgent = request.agent(app);
    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'us1_duration_test_user', password: 'testpassword123' })
      .expect(200);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_duration_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_duration_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Duration Room' } },
    });
    await prisma.$disconnect();
  });

  describe('Valid Duration Tests', () => {
    it('should accept minimum valid duration (15 minutes)', async () => {
      const startTime = addDays(new Date(), 5);
      const endTime = addMinutes(startTime, 15); // Exactly 15 minutes

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '15 Minute Booking',
          participantIds: [],
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
      createdBookingIds.push(response.body.id);

      // Verify booking duration
      const duration = new Date(response.body.endTime).getTime() - new Date(response.body.startTime).getTime();
      expect(duration).toBe(15 * 60 * 1000); // 15 minutes in milliseconds
    });

    it('should accept maximum valid duration (8 hours)', async () => {
      const startTime = addDays(new Date(), 6);
      const endTime = addHours(startTime, 8); // Exactly 8 hours

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '8 Hour Booking',
          participantIds: [],
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
      createdBookingIds.push(response.body.id);

      // Verify booking duration
      const duration = new Date(response.body.endTime).getTime() - new Date(response.body.startTime).getTime();
      expect(duration).toBe(8 * 60 * 60 * 1000); // 8 hours in milliseconds
    });

    it('should accept duration just over 15 minutes (boundary test)', async () => {
      const startTime = addDays(new Date(), 7);
      const endTime = addSeconds(addMinutes(startTime, 15), 1); // 15 minutes 1 second

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '15:01 Booking',
          participantIds: [],
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
      createdBookingIds.push(response.body.id);
    });

    it('should accept duration just under 8 hours (boundary test)', async () => {
      const startTime = addDays(new Date(), 8);
      const endTime = addSeconds(addHours(startTime, 8), -1); // 7 hours 59 minutes 59 seconds

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '7:59:59 Booking',
          participantIds: [],
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
      createdBookingIds.push(response.body.id);
    });
  });

  describe('Invalid Duration Tests', () => {
    it('should reject duration less than 15 minutes', async () => {
      const startTime = addDays(new Date(), 9);
      const endTime = addMinutes(startTime, 14); // 14 minutes

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '14 Minute Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/duration|invalid/i);
    });

    it('should reject duration greater than 8 hours', async () => {
      const startTime = addDays(new Date(), 10);
      const endTime = addSeconds(addHours(startTime, 8), 1); // 8 hours 1 second

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: '8:00:01 Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/duration|invalid/i);
    });

    it('should reject zero duration (same start and end time)', async () => {
      const startTime = addDays(new Date(), 11);
      const endTime = startTime; // Same time

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Zero Duration Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/duration|invalid/i);
    });

    it('should reject negative duration (end time before start time)', async () => {
      const startTime = addDays(new Date(), 12);
      const endTime = addHours(startTime, -1); // 1 hour before start

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Negative Duration Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Duration Error Messages', () => {
    it('should provide detailed error message for invalid duration', async () => {
      const startTime = addDays(new Date(), 13);
      const endTime = addMinutes(startTime, 10); // 10 minutes (too short)

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Short Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');

      // Check if message mentions the duration limits
      const message = response.body.message || response.body.error;
      expect(message).toMatch(/15.*minute/i);
      expect(message).toMatch(/8.*hour/i);
    });

    it('should provide detailed error message for duration too long', async () => {
      const startTime = addDays(new Date(), 14);
      const endTime = addHours(startTime, 9); // 9 hours (too long)

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Long Booking',
          participantIds: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');

      // Check if message mentions the duration limits
      const message = response.body.message || response.body.error;
      expect(message).toMatch(/8.*hour/i);
    });
  });
});

import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, RoomType, UserType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

describe('User Story 1 - Booking Creation & Conflict Detection (T033)', () => {
  let standardUserAgent: request.Agent;
  let standardUserId: string;
  let participant1Id: string;
  let participant2Id: string;
  let normalRoomId: string;
  let createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_booking_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_booking_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Booking Room' } },
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', 12);

    const standardUser = await prisma.user.create({
      data: {
        username: 'us1_booking_test_organizer',
        passwordHash: hashedPassword,
        email: 'us1_booking_organizer@example.com',
        fullName: 'US1 Booking Test Organizer',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUserId = standardUser.id;

    const participant1 = await prisma.user.create({
      data: {
        username: 'us1_booking_test_participant1',
        passwordHash: hashedPassword,
        email: 'us1_booking_p1@example.com',
        fullName: 'US1 Booking Participant 1',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    participant1Id = participant1.id;

    const participant2 = await prisma.user.create({
      data: {
        username: 'us1_booking_test_participant2',
        passwordHash: hashedPassword,
        email: 'us1_booking_p2@example.com',
        fullName: 'US1 Booking Participant 2',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    participant2Id = participant2.id;

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: 'US1 Test Booking Room A',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['projector', 'whiteboard'],
        location: 'Test Building - Floor 1',
      },
    });
    normalRoomId = room.id;

    // Create authenticated agent
    standardUserAgent = request.agent(app);
    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'us1_booking_test_organizer', password: 'testpassword123' })
      .expect(200);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_booking_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_booking_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Booking Room' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/bookings - Successful Creation', () => {
    it('should create booking successfully with no conflicts', async () => {
      const startTime = addDays(new Date(), 5);
      const endTime = addHours(startTime, 1);

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Team Standup',
          description: 'Weekly team sync',
          participantIds: [participant1Id, participant2Id],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.organizerId).toBe(standardUserId);
      expect(response.body.roomId).toBe(normalRoomId);
      expect(response.body.title).toBe('Team Standup');

      // Track for cleanup
      createdBookingIds.push(response.body.id);

      // Verify booking in database
      const booking = await prisma.booking.findUnique({
        where: { id: response.body.id },
        include: { participants: true },
      });

      expect(booking).not.toBeNull();
      expect(booking?.status).toBe(BookingStatus.CONFIRMED);
      expect(booking?.participants.length).toBe(2);

      // Verify notifications were created
      const notifications = await prisma.notification.findMany({
        where: { bookingId: response.body.id },
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1); // At least organizer notification
    });
  });

  describe('POST /api/v1/bookings - Conflict Detection', () => {
    it('should detect exact overlap conflict', async () => {
      const startTime = addDays(new Date(), 6);
      const endTime = addHours(startTime, 1);

      // Create first booking
      const firstBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'First Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(firstBooking.body.id);

      // Attempt second booking with exact same time
      const conflictResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Conflicting Booking',
          participantIds: [],
        })
        .expect(409);

      expect(conflictResponse.body).toHaveProperty('error');
      expect(conflictResponse.body.error).toMatch(/conflict/i);

      // Verify alternatives might be suggested (if implemented)
      if (conflictResponse.body.details) {
        expect(conflictResponse.body.details).toHaveProperty('conflictingBooking');
      }
    });

    it('should detect partial overlap conflict (start time inside existing booking)', async () => {
      const startTime = addDays(new Date(), 7);
      const endTime = addHours(startTime, 2);

      // Create first booking (2:00 PM - 4:00 PM)
      const firstBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Base Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(firstBooking.body.id);

      // Attempt overlapping booking (3:00 PM - 5:00 PM)
      const conflictStart = addHours(startTime, 1);
      const conflictEnd = addHours(startTime, 3);

      await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: conflictStart.toISOString(),
          endTime: conflictEnd.toISOString(),
          title: 'Overlapping Booking',
          participantIds: [],
        })
        .expect(409);
    });

    it('should detect partial overlap conflict (end time inside existing booking)', async () => {
      const startTime = addDays(new Date(), 8);
      const endTime = addHours(startTime, 2);

      // Create first booking (2:00 PM - 4:00 PM)
      const firstBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Base Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(firstBooking.body.id);

      // Attempt overlapping booking (1:00 PM - 3:00 PM)
      const conflictStart = addHours(startTime, -1);
      const conflictEnd = addHours(startTime, 1);

      await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: conflictStart.toISOString(),
          endTime: conflictEnd.toISOString(),
          title: 'Overlapping Booking',
          participantIds: [],
        })
        .expect(409);
    });

    it('should detect conflict when new booking encompasses existing booking', async () => {
      const startTime = addDays(new Date(), 9);
      const endTime = addHours(startTime, 1);

      // Create first booking (2:00 PM - 3:00 PM)
      const firstBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Small Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(firstBooking.body.id);

      // Attempt larger booking (1:00 PM - 4:00 PM)
      const conflictStart = addHours(startTime, -1);
      const conflictEnd = addHours(startTime, 2);

      await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: conflictStart.toISOString(),
          endTime: conflictEnd.toISOString(),
          title: 'Encompassing Booking',
          participantIds: [],
        })
        .expect(409);
    });

    it('should allow back-to-back bookings (exclusive end time)', async () => {
      const startTime1 = addDays(new Date(), 10);
      const endTime1 = addHours(startTime1, 1);
      const startTime2 = endTime1; // Start exactly when first one ends
      const endTime2 = addHours(startTime2, 1);

      // Create first booking
      const firstBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
          title: 'First Slot',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(firstBooking.body.id);

      // Create second booking starting exactly when first ends
      const secondBooking = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime2.toISOString(),
          endTime: endTime2.toISOString(),
          title: 'Second Slot',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(secondBooking.body.id);

      expect(secondBooking.body.status).toBe('CONFIRMED');
    });

    it('should handle first-write-wins concurrency (EC-001)', async () => {
      const startTime = addDays(new Date(), 11);
      const endTime = addHours(startTime, 1);

      // Simulate concurrent requests
      const booking1Promise = standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Concurrent Booking 1',
          participantIds: [],
        });

      const booking2Promise = standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Concurrent Booking 2',
          participantIds: [],
        });

      const [response1, response2] = await Promise.all([booking1Promise, booking2Promise]);

      // One should succeed, one should fail
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Verify only one booking was created in database
      const bookings = await prisma.booking.findMany({
        where: {
          roomId: normalRoomId,
          startTime,
          endTime,
        },
      });

      expect(bookings.length).toBe(1);

      if (response1.status === 201) {
        createdBookingIds.push(response1.body.id);
      } else {
        createdBookingIds.push(response2.body.id);
      }
    });

    it('should not conflict with CANCELLED booking', async () => {
      const startTime = addDays(new Date(), 12);
      const endTime = addHours(startTime, 1);

      // Create and then cancel a booking
      await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CANCELLED,
          title: 'Cancelled Booking',
        },
      });

      // Attempt new booking in same time slot
      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'New Booking',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(response.body.id);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should not conflict with REJECTED booking', async () => {
      const startTime = addDays(new Date(), 13);
      const endTime = addHours(startTime, 1);

      // Create a rejected booking
      await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.REJECTED,
          title: 'Rejected Booking',
          rejectionReason: 'Test rejection',
        },
      });

      // Attempt new booking in same time slot
      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'New Booking After Rejection',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(response.body.id);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should not conflict with NO_SHOW booking', async () => {
      const startTime = addDays(new Date(), 14);
      const endTime = addHours(startTime, 1);

      // Create a no-show booking
      await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.NO_SHOW,
          title: 'No Show Booking',
        },
      });

      // Attempt new booking in same time slot
      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'New Booking After No-Show',
          participantIds: [],
        })
        .expect(201);

      createdBookingIds.push(response.body.id);
      expect(response.body.status).toBe('CONFIRMED');
    });
  });
});

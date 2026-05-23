import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserType, RoomType, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('T083: Check-in Integration Tests (FR-018)', () => {
  let standardUserAgent: request.Agent;
  let standardUserId: string;
  let normalRoomId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'checkin_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'checkin_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'CheckIn Test Room' } } });

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'checkin_test_user',
        email: 'checkin_test@example.com',
        passwordHash: '$2b$10$dummyhash',
        fullName: 'CheckIn Test User',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUserId = testUser.id;

    // Create test room
    const testRoom = await prisma.room.create({
      data: {
        name: 'CheckIn Test Room 1',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['Projector', 'Whiteboard'],
        location: 'Building A, Floor 2, Room 201',
      },
    });
    normalRoomId = testRoom.id;

    // Log in
    standardUserAgent = request.agent(app);
    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'checkin_test_user', password: 'password123' });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'checkin_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'checkin_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'CheckIn Test Room' } } });
    await prisma.$disconnect();
  });

  describe('Successful Check-in', () => {
    it('should allow organizer to check in within 10-minute grace period', async () => {
      // Create a booking that starts now
      const startTime = new Date(Date.now() + 1000); // 1 second from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Check-in Test Booking',
          participantEmails: [],
        })
        .expect(201);

      bookingId = createResponse.body.booking.id;

      // Wait for start time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check in
      const response = await standardUserAgent
        .post(`/api/v1/bookings/${bookingId}/check-in`)
        .expect(200);

      expect(response.body).toMatchObject({
        booking: {
          id: bookingId,
          status: BookingStatus.IN_PROGRESS,
        },
        message: 'Checked in successfully',
      });

      expect(response.body.booking.checkedInAt).toBeDefined();

      // Verify booking status in database
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.status).toBe(BookingStatus.IN_PROGRESS);
      expect(booking?.checkedInAt).not.toBeNull();
    });
  });

  describe('Check-in Validation', () => {
    it('should reject check-in if user is not the organizer', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          username: 'checkin_test_other_user',
          email: 'checkin_other@example.com',
          passwordHash: '$2b$10$dummyhash',
          fullName: 'Other User',
          userType: UserType.STANDARD,
          rankingScore: 100,
        },
      });

      // Create a booking that starts now
      const startTime = new Date(Date.now() + 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Check-in Auth Test',
          participantEmails: [],
        })
        .expect(201);

      const newBookingId = createResponse.body.booking.id;

      // Wait for start time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Log in as other user
      const otherUserAgent = request.agent(app);
      await otherUserAgent
        .post('/api/v1/auth/login')
        .send({ username: 'checkin_test_other_user', password: 'password123' });

      // Try to check in as non-organizer
      const response = await otherUserAgent
        .post(`/api/v1/bookings/${newBookingId}/check-in`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'FORBIDDEN',
        message: 'Only the booking organizer can check in',
      });

      // Clean up
      await prisma.booking.delete({ where: { id: newBookingId } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject check-in if booking status is not CONFIRMED', async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Invalid Status Test',
          participantEmails: [],
        })
        .expect(201);

      const newBookingId = createResponse.body.booking.id;

      // Wait for start time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check in first time
      await standardUserAgent.post(`/api/v1/bookings/${newBookingId}/check-in`).expect(200);

      // Try to check in again (status is now IN_PROGRESS)
      const response = await standardUserAgent
        .post(`/api/v1/bookings/${newBookingId}/check-in`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'INVALID_STATE_TRANSITION',
        message: expect.stringContaining('Cannot check in to booking with status IN_PROGRESS'),
      });

      // Clean up
      await prisma.booking.delete({ where: { id: newBookingId } });
    });

    it('should reject check-in if grace period has expired (>10 minutes past start)', async () => {
      // Create a booking that started more than 10 minutes ago
      const startTime = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const endTime = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes from now

      // Directly create booking in database (bypassing validation)
      const expiredBooking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'Expired Check-in Test',
        },
      });

      // Try to check in (should fail)
      const response = await standardUserAgent
        .post(`/api/v1/bookings/${expiredBooking.id}/check-in`)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'CHECK_IN_WINDOW_CLOSED',
        message: 'Check-in window has expired (more than 10 minutes past start time)',
      });

      // Clean up
      await prisma.booking.delete({ where: { id: expiredBooking.id } });
    });

    it('should reject check-in if booking does not exist', async () => {
      const fakeBookingId = '00000000-0000-0000-0000-000000000000';

      const response = await standardUserAgent
        .post(`/api/v1/bookings/${fakeBookingId}/check-in`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'BOOKING_NOT_FOUND',
        message: 'Booking not found',
      });
    });
  });

  describe('State Transition', () => {
    it('should transition booking from CONFIRMED to IN_PROGRESS on successful check-in', async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'State Transition Test',
          participantEmails: [],
        })
        .expect(201);

      const newBookingId = createResponse.body.booking.id;

      // Verify initial status
      let booking = await prisma.booking.findUnique({ where: { id: newBookingId } });
      expect(booking?.status).toBe(BookingStatus.CONFIRMED);
      expect(booking?.checkedInAt).toBeNull();

      // Wait for start time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check in
      await standardUserAgent.post(`/api/v1/bookings/${newBookingId}/check-in`).expect(200);

      // Verify status changed
      booking = await prisma.booking.findUnique({ where: { id: newBookingId } });
      expect(booking?.status).toBe(BookingStatus.IN_PROGRESS);
      expect(booking?.checkedInAt).not.toBeNull();

      // Clean up
      await prisma.booking.delete({ where: { id: newBookingId } });
    });
  });
});

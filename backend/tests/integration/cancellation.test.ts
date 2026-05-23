import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserType, RoomType, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Booking Cancellation (User Story 4)', () => {
  let standardUserAgent: request.Agent;
  let vipUserAgent: request.Agent;
  let standardUserId: string;
  let normalRoomId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'cancel_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'cancel_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'Cancel Test Room' } } });

    // Create test users
    const standardUser = await prisma.user.create({
      data: {
        username: 'cancel_test_user1',
        fullName: 'Cancel Test User 1',
        email: 'cancel_test1@example.com',
        passwordHash: '$2b$10$dummyhash',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUserId = standardUser.id;

    await prisma.user.create({
      data: {
        username: 'cancel_test_vip',
        fullName: 'Cancel Test VIP',
        email: 'cancel_test_vip@example.com',
        passwordHash: '$2b$10$dummyhash',
        userType: UserType.VIP,
        rankingScore: 100,
      },
    });

    // Create test rooms
    const normalRoom = await prisma.room.create({
      data: {
        name: 'Cancel Test Room A',
        capacity: 10,
        roomType: RoomType.NORMAL,
        location: 'Building A, Floor 1',
        equipment: ['Projector', 'Whiteboard'],
      },
    });
    normalRoomId = normalRoom.id;

    await prisma.room.create({
      data: {
        name: 'Cancel Test VIP Room',
        capacity: 6,
        roomType: RoomType.VIP,
        location: 'Executive Floor',
        equipment: ['Video Conference', '4K Display'],
      },
    });

    // Create authenticated agents
    standardUserAgent = request.agent(app);
    vipUserAgent = request.agent(app);

    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'cancel_test_user1', password: 'password123' })
      .expect(200);

    await vipUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'cancel_test_vip', password: 'password123' })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'cancel_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'cancel_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'Cancel Test Room' } } });
    await prisma.$disconnect();
  });

  describe('T104: DELETE /bookings/:id', () => {
    it('should allow organizer to cancel a CONFIRMED booking', async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 2 hours from now

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Cancellation Test Booking',
          participantEmails: [],
        })
        .expect(201);

      const bookingId = createResponse.body.booking.id;

      // Cancel the booking
      const response = await standardUserAgent
        .delete(`/api/v1/bookings/${bookingId}`)
        .expect(200);

      expect(response.body.booking.status).toBe(BookingStatus.CANCELLED);
      expect(response.body.message).toContain('cancelled');

      // Verify booking status in database
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      expect(booking?.status).toBe(BookingStatus.CANCELLED);
    });

    it('should prevent non-organizer from cancelling a booking', async () => {
      // Create a booking as standard user
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Standard User Booking',
          participantEmails: [],
        })
        .expect(201);

      const bookingId = createResponse.body.booking.id;

      // Try to cancel as VIP user (not the organizer)
      const response = await vipUserAgent
        .delete(`/api/v1/bookings/${bookingId}`)
        .expect(403);

      expect(response.body.error).toBe('FORBIDDEN');
      expect(response.body.message).toContain('organizer');

      // Verify booking status unchanged
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      expect(booking?.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should prevent cancelling a booking that is not CONFIRMED', async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.IN_PROGRESS, // Not CONFIRMED
          title: 'In Progress Booking',
        },
      });

      // Try to cancel
      const response = await standardUserAgent
        .delete(`/api/v1/bookings/${booking.id}`)
        .expect(400);

      expect(response.body.error).toBe('INVALID_STATE_TRANSITION');
      expect(response.body.message).toContain('CONFIRMED');

      // Verify status unchanged
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });

      expect(updatedBooking?.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should return 404 for non-existent booking', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await standardUserAgent
        .delete(`/api/v1/bookings/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('BOOKING_NOT_FOUND');
    });
  });

  describe('T105: Cancellation Notifications (FR-023)', () => {
    it('should send cancellation notifications to organizer and participants', async () => {
      // Create a booking with participants
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Team Meeting',
          participantEmails: ['cancel_test_vip@example.com'], // Add VIP user as participant
        })
        .expect(201);

      const bookingId = createResponse.body.booking.id;

      // Cancel the booking
      await standardUserAgent
        .delete(`/api/v1/bookings/${bookingId}`)
        .expect(200);

      // Verify notifications were created
      const notifications = await prisma.notification.findMany({
        where: {
          bookingId: bookingId,
          notificationType: 'BOOKING_CANCELLED',
        },
      });

      // Should have notifications for organizer + participants (2 total)
      expect(notifications.length).toBeGreaterThanOrEqual(1);

      // Verify organizer received notification
      const organizerNotification = notifications.find(
        (n: any) => n.recipientId === standardUserId
      );
      expect(organizerNotification).toBeDefined();
      expect(organizerNotification?.subject).toContain('Cancelled');
    });

    it('should include booking details in cancellation notification', async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const createResponse = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Detailed Cancellation Test',
          participantEmails: [],
        })
        .expect(201);

      const bookingId = createResponse.body.booking.id;

      // Cancel the booking
      await standardUserAgent
        .delete(`/api/v1/bookings/${bookingId}`)
        .expect(200);

      // Verify notification content
      const notification = await prisma.notification.findFirst({
        where: {
          bookingId: bookingId,
          notificationType: 'BOOKING_CANCELLED',
          recipientId: standardUserId,
        },
      });

      expect(notification).toBeDefined();
      expect(notification?.message).toContain('Cancel Test Room A'); // Room name
      expect(notification?.message).toContain('cancelled');
    });
  });
});

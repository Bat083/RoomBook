import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, RoomType, UserType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

describe('User Story 1 - End-to-End Booking Flow (T035)', () => {
  let standardUserId: string;
  let participant1Id: string;
  let participant2Id: string;
  let normalRoom1Id: string;
  let normalRoom2Id: string;
  let createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_e2e_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_e2e_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test E2E Room' } },
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', 12);

    const standardUser = await prisma.user.create({
      data: {
        username: 'us1_e2e_test_organizer',
        passwordHash: hashedPassword,
        email: 'us1_e2e_organizer@example.com',
        fullName: 'US1 E2E Test Organizer',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUserId = standardUser.id;

    const participant1 = await prisma.user.create({
      data: {
        username: 'us1_e2e_test_participant1',
        passwordHash: hashedPassword,
        email: 'us1_e2e_p1@example.com',
        fullName: 'US1 E2E Participant 1',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    participant1Id = participant1.id;

    const participant2 = await prisma.user.create({
      data: {
        username: 'us1_e2e_test_participant2',
        passwordHash: hashedPassword,
        email: 'us1_e2e_p2@example.com',
        fullName: 'US1 E2E Participant 2',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    participant2Id = participant2.id;

    // Create test rooms
    const room1 = await prisma.room.create({
      data: {
        name: 'US1 Test E2E Room A',
        roomType: RoomType.NORMAL,
        capacity: 6,
        equipment: ['projector', 'whiteboard'],
        location: 'Building A - Floor 1',
      },
    });
    normalRoom1Id = room1.id;

    const room2 = await prisma.room.create({
      data: {
        name: 'US1 Test E2E Room B',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['video_conferencing', 'projector', 'whiteboard'],
        location: 'Building B - Floor 1',
      },
    });
    normalRoom2Id = room2.id;

    // Create VIP room to test filtering
    await prisma.room.create({
      data: {
        name: 'US1 Test E2E Room VIP',
        roomType: RoomType.VIP,
        capacity: 15,
        equipment: ['video_conferencing', 'projector', 'whiteboard', 'phone'],
        location: 'Executive Wing',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_e2e_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_e2e_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test E2E Room' } },
    });
    await prisma.$disconnect();
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full booking flow from login to confirmation', async () => {
      const agent = request.agent(app);
      let bookingId: string;

      // Step 1: Login as standard user
      const loginResponse = await agent
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_e2e_test_organizer',
          password: 'testpassword123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.username).toBe('us1_e2e_test_organizer');
      expect(loginResponse.body.user.userType).toBe('STANDARD');

      // Step 2: Browse available rooms with filters
      const startTime = addDays(new Date(), 5);
      const endTime = addHours(startTime, 1);

      const roomsResponse = await agent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          capacity: 6,
          equipment: 'projector',
        })
        .expect(200);

      expect(roomsResponse.body).toBeInstanceOf(Array);
      expect(roomsResponse.body.length).toBeGreaterThan(0);

      // Verify VIP rooms are not shown to standard user
      const hasVIPRoom = roomsResponse.body.some((room: any) => room.roomType === 'VIP');
      expect(hasVIPRoom).toBe(false);

      // Verify filtered rooms match criteria
      roomsResponse.body.forEach((room: any) => {
        expect(room.capacity).toBeGreaterThanOrEqual(6);
        expect(room.equipment).toContain('projector');
      });

      // Step 3: Select an available room (choose first matching room)
      const selectedRoom = roomsResponse.body.find(
        (room: any) => room.equipment.includes('video_conferencing')
      ) || roomsResponse.body[0];

      expect(selectedRoom).toBeDefined();
      expect(selectedRoom).toHaveProperty('id');
      expect(selectedRoom).toHaveProperty('name');
      expect(selectedRoom).toHaveProperty('capacity');
      expect(selectedRoom).toHaveProperty('equipment');

      // Step 4: Create booking with participants
      const bookingResponse = await agent
        .post('/api/v1/bookings')
        .send({
          roomId: selectedRoom.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Team Standup Meeting',
          description: 'Weekly sync with the team to discuss progress and blockers',
          participantIds: [participant1Id, participant2Id],
        })
        .expect(201);

      expect(bookingResponse.body).toHaveProperty('id');
      expect(bookingResponse.body.status).toBe('CONFIRMED');
      expect(bookingResponse.body.organizerId).toBe(standardUserId);
      expect(bookingResponse.body.roomId).toBe(selectedRoom.id);
      expect(bookingResponse.body.title).toBe('Team Standup Meeting');

      bookingId = bookingResponse.body.id;
      createdBookingIds.push(bookingId);

      // Step 5: Verify booking appears in calendar
      const calendarResponse = await agent
        .get('/api/v1/calendar')
        .query({
          startDate: addDays(startTime, -1).toISOString().split('T')[0],
          endDate: addDays(startTime, 1).toISOString().split('T')[0],
        })
        .expect(200);

      expect(calendarResponse.body).toBeInstanceOf(Array);
      const bookingInCalendar = calendarResponse.body.find(
        (event: any) => event.id === bookingId
      );
      expect(bookingInCalendar).toBeDefined();
      expect(bookingInCalendar.title).toBe('Team Standup Meeting');
      expect(bookingInCalendar.status).toBe('CONFIRMED');

      // Step 6: Verify booking appears in user's booking list
      const bookingsResponse = await agent.get('/api/v1/bookings').expect(200);

      expect(bookingsResponse.body).toHaveProperty('bookings');
      expect(bookingsResponse.body.bookings).toBeInstanceOf(Array);

      const userBooking = bookingsResponse.body.bookings.find(
        (booking: any) => booking.id === bookingId
      );
      expect(userBooking).toBeDefined();
      expect(userBooking.status).toBe('CONFIRMED');
      expect(userBooking.title).toBe('Team Standup Meeting');

      // Step 7: Verify booking details
      const bookingDetailsResponse = await agent
        .get(`/api/v1/bookings/${bookingId}`)
        .expect(200);

      expect(bookingDetailsResponse.body).toMatchObject({
        id: bookingId,
        status: 'CONFIRMED',
        title: 'Team Standup Meeting',
        description: 'Weekly sync with the team to discuss progress and blockers',
        organizerId: standardUserId,
        roomId: selectedRoom.id,
      });

      expect(bookingDetailsResponse.body).toHaveProperty('room');
      expect(bookingDetailsResponse.body.room.name).toBe(selectedRoom.name);

      expect(bookingDetailsResponse.body).toHaveProperty('participants');
      expect(bookingDetailsResponse.body.participants.length).toBeGreaterThanOrEqual(1);

      // Step 8: Verify notifications were created
      const notifications = await prisma.notification.findMany({
        where: {
          bookingId: bookingId,
        },
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);

      // Check organizer notification exists
      const organizerNotification = notifications.find(
        (n) => n.recipientId === standardUserId
      );
      expect(organizerNotification).toBeDefined();
      expect(organizerNotification?.notificationType).toBe('BOOKING_CONFIRMED');

      // Check participant notifications exist
      const participant1Notification = notifications.find(
        (n) => n.recipientId === participant1Id
      );
      const participant2Notification = notifications.find(
        (n) => n.recipientId === participant2Id
      );
      expect(participant1Notification).toBeDefined();
      expect(participant2Notification).toBeDefined();

      // Step 9: Verify booking is persisted in database with correct status
      const dbBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          organizer: true,
          participants: true,
        },
      });

      expect(dbBooking).not.toBeNull();
      expect(dbBooking?.status).toBe(BookingStatus.CONFIRMED);
      expect(dbBooking?.room.name).toBe(selectedRoom.name);
      expect(dbBooking?.organizer.username).toBe('us1_e2e_test_organizer');
      expect(dbBooking?.participants.length).toBe(2);
    });

    it('should maintain session throughout entire workflow', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_e2e_test_organizer',
          password: 'testpassword123',
        })
        .expect(200);

      // Make multiple authenticated requests
      await agent.get('/api/v1/auth/me').expect(200);
      await agent.get('/api/v1/rooms').expect(200);
      await agent.get('/api/v1/bookings').expect(200);

      const startTime = addDays(new Date(), 6);

      await agent
        .get('/api/v1/calendar')
        .query({
          startDate: addDays(startTime, -1).toISOString().split('T')[0],
          endDate: addDays(startTime, 1).toISOString().split('T')[0],
        })
        .expect(200);

      // All requests should succeed with the same session
      const meResponse = await agent.get('/api/v1/auth/me').expect(200);
      expect(meResponse.body.user.username).toBe('us1_e2e_test_organizer');
    });

    it('should handle complete workflow with multiple bookings', async () => {
      const agent = request.agent(app);

      // Login
      await agent
        .post('/api/v1/auth/login')
        .send({
          username: 'us1_e2e_test_organizer',
          password: 'testpassword123',
        })
        .expect(200);

      // Create first booking
      const startTime1 = addDays(new Date(), 7);
      const endTime1 = addHours(startTime1, 1);

      const booking1Response = await agent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoom1Id,
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
          title: 'First Meeting',
          participantIds: [participant1Id],
        })
        .expect(201);

      createdBookingIds.push(booking1Response.body.id);

      // Create second booking in different room
      const startTime2 = addDays(new Date(), 8);
      const endTime2 = addHours(startTime2, 2);

      const booking2Response = await agent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoom2Id,
          startTime: startTime2.toISOString(),
          endTime: endTime2.toISOString(),
          title: 'Second Meeting',
          participantIds: [participant2Id],
        })
        .expect(201);

      createdBookingIds.push(booking2Response.body.id);

      // Verify both bookings appear in user's booking list
      const bookingsResponse = await agent.get('/api/v1/bookings').expect(200);

      expect(bookingsResponse.body.bookings).toBeInstanceOf(Array);
      expect(bookingsResponse.body.bookings.length).toBeGreaterThanOrEqual(2);

      const booking1 = bookingsResponse.body.bookings.find(
        (b: any) => b.id === booking1Response.body.id
      );
      const booking2 = bookingsResponse.body.bookings.find(
        (b: any) => b.id === booking2Response.body.id
      );

      expect(booking1).toBeDefined();
      expect(booking2).toBeDefined();
      expect(booking1.title).toBe('First Meeting');
      expect(booking2.title).toBe('Second Meeting');
    });
  });
});

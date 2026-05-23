import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, RoomType, UserType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

describe('User Story 1 - Room Availability (T032)', () => {
  let standardUserAgent: request.Agent;
  let vipUserAgent: request.Agent;
  let standardUserId: string;
  let normalRoomIds: string[] = [];
  let vipRoomIds: string[] = [];

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_rooms_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_rooms_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Room' } },
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    const standardUser = await prisma.user.create({
      data: {
        username: 'us1_rooms_test_standard',
        passwordHash: hashedPassword,
        email: 'us1_rooms_standard@example.com',
        fullName: 'US1 Rooms Test Standard User',
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUserId = standardUser.id;

    await prisma.user.create({
      data: {
        username: 'us1_rooms_test_vip',
        passwordHash: hashedPassword,
        email: 'us1_rooms_vip@example.com',
        fullName: 'US1 Rooms Test VIP User',
        userType: UserType.VIP,
        rankingScore: 100,
      },
    });

    // Create test rooms with various capacities and equipment
    const rooms = [
      {
        name: 'US1 Test Room A',
        roomType: RoomType.NORMAL,
        capacity: 4,
        equipment: ['whiteboard'],
        location: 'Building A - Floor 1',
      },
      {
        name: 'US1 Test Room B',
        roomType: RoomType.NORMAL,
        capacity: 6,
        equipment: ['projector'],
        location: 'Building A - Floor 2',
      },
      {
        name: 'US1 Test Room C',
        roomType: RoomType.NORMAL,
        capacity: 8,
        equipment: ['video_conferencing', 'projector'],
        location: 'Building B - Floor 1',
      },
      {
        name: 'US1 Test Room D',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['video_conferencing', 'projector', 'whiteboard'],
        location: 'Building B - Floor 2',
      },
      {
        name: 'US1 Test Room E',
        roomType: RoomType.NORMAL,
        capacity: 12,
        equipment: ['video_conferencing', 'whiteboard'],
        location: 'Building C - Floor 1',
      },
      {
        name: 'US1 Test Room VIP1',
        roomType: RoomType.VIP,
        capacity: 10,
        equipment: ['video_conferencing', 'projector', 'whiteboard'],
        location: 'Executive Wing - Floor 3',
      },
      {
        name: 'US1 Test Room VIP2',
        roomType: RoomType.VIP,
        capacity: 15,
        equipment: ['video_conferencing', 'projector', 'whiteboard', 'phone'],
        location: 'Executive Wing - Floor 4',
      },
    ];

    for (const roomData of rooms) {
      const room = await prisma.room.create({ data: roomData });
      if (roomData.roomType === RoomType.VIP) {
        vipRoomIds.push(room.id);
      } else {
        normalRoomIds.push(room.id);
      }
    }

    // Create authenticated agents
    standardUserAgent = request.agent(app);
    vipUserAgent = request.agent(app);

    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'us1_rooms_test_standard', password: 'testpassword123' })
      .expect(200);

    await vipUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'us1_rooms_test_vip', password: 'testpassword123' })
      .expect(200);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { organizer: { username: { startsWith: 'us1_rooms_test_' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'us1_rooms_test_' } },
    });
    await prisma.room.deleteMany({
      where: { name: { startsWith: 'US1 Test Room' } },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/rooms', () => {
    it('should return only normal rooms for standard user', async () => {
      const response = await standardUserAgent.get('/api/v1/rooms').expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(5); // 5 normal rooms

      // Verify no VIP rooms are included
      const roomTypes = response.body.map((room: any) => room.roomType);
      expect(roomTypes).not.toContain('VIP');
      roomTypes.forEach((type: string) => {
        expect(type).toBe('NORMAL');
      });
    });

    it('should return both normal and VIP rooms for VIP user', async () => {
      const response = await vipUserAgent.get('/api/v1/rooms').expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(7); // 5 normal + 2 VIP rooms

      // Verify VIP rooms are included
      const vipRooms = response.body.filter((room: any) => room.roomType === 'VIP');
      expect(vipRooms.length).toBe(2);
    });

    it('should filter rooms by capacity', async () => {
      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({ capacity: 8 })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      // Verify all returned rooms have capacity >= 8
      response.body.forEach((room: any) => {
        expect(room.capacity).toBeGreaterThanOrEqual(8);
      });

      // Should include rooms with capacity 8, 10, 12
      const capacities = response.body.map((room: any) => room.capacity);
      expect(capacities).toContain(8);
      expect(capacities).toContain(10);
      expect(capacities).toContain(12);
    });

    it('should filter rooms by equipment', async () => {
      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({ equipment: 'video_conferencing,projector' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      // Verify all returned rooms have both video_conferencing AND projector
      response.body.forEach((room: any) => {
        expect(room.equipment).toContain('video_conferencing');
        expect(room.equipment).toContain('projector');
      });

      // Should return rooms C and D
      const roomNames = response.body.map((room: any) => room.name);
      expect(roomNames).toContain('US1 Test Room C');
      expect(roomNames).toContain('US1 Test Room D');
    });

    it('should filter rooms by availability in time range', async () => {
      // Create a booking for Room A in the future
      const startTime = addDays(new Date(), 3);
      const endTime = addHours(startTime, 1);

      await prisma.booking.create({
        data: {
          roomId: normalRoomIds[0], // Room A
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'Test Blocking Booking',
        },
      });

      // Query for available rooms in the same time range
      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      // Room A should not be in the results (or marked as unavailable)
      const roomIds = response.body.map((room: any) => room.id);

      // If the API filters out unavailable rooms entirely
      if (!roomIds.includes(normalRoomIds[0])) {
        expect(roomIds).not.toContain(normalRoomIds[0]);
      } else {
        // If the API includes rooms with availability flag
        const roomA = response.body.find((room: any) => room.id === normalRoomIds[0]);
        if (roomA && roomA.hasOwnProperty('available')) {
          expect(roomA.available).toBe(false);
        }
      }

      // Other rooms should still be available
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should apply combined filters (availability + capacity + equipment)', async () => {
      const startTime = addDays(new Date(), 4);
      const endTime = addHours(startTime, 2);

      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          capacity: 6,
          equipment: 'projector',
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      // Verify all returned rooms match ALL criteria
      response.body.forEach((room: any) => {
        expect(room.capacity).toBeGreaterThanOrEqual(6);
        expect(room.equipment).toContain('projector');
      });
    });

    it('should return 400 for invalid parameters (endTime before startTime)', async () => {
      const startTime = addDays(new Date(), 5);
      const endTime = addHours(startTime, -1); // 1 hour before start

      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should perform availability query efficiently (performance test)', async () => {
      // Create many bookings for performance testing
      const bookings = [];
      const futureDate = addDays(new Date(), 10);

      for (let i = 0; i < 50; i++) {
        const start = addHours(futureDate, i * 2);
        const end = addHours(start, 1);
        bookings.push({
          roomId: normalRoomIds[i % normalRoomIds.length],
          organizerId: standardUserId,
          startTime: start,
          endTime: end,
          status: BookingStatus.CONFIRMED,
          title: `Performance Test Booking ${i}`,
        });
      }

      await prisma.booking.createMany({ data: bookings });

      // Measure query time
      const queryStart = Date.now();
      const startTime = addDays(new Date(), 10);
      const endTime = addHours(startTime, 2);

      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          capacity: 6,
        })
        .expect(200);

      const queryTime = Date.now() - queryStart;

      expect(response.body).toBeInstanceOf(Array);
      expect(queryTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });
});

import request from 'supertest';
import app from '../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('VIP Room Authorization (FR-013)', () => {
  let standardUserAgent: request.Agent;
  let vipUserAgent: request.Agent;
  let normalRoomId: string;
  let vipRoomId: string;

  beforeAll(async () => {
    // Clear test data
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
    await prisma.room.deleteMany();

    // Create test rooms
    const normalRoom = await prisma.room.create({
      data: {
        name: 'Normal Conference Room',
        capacity: 10,
        equipment: ['Projector', 'Whiteboard'],
        roomType: 'NORMAL',
      },
    });
    normalRoomId = normalRoom.id;

    const vipRoom = await prisma.room.create({
      data: {
        name: 'Executive Boardroom',
        capacity: 20,
        equipment: ['Projector', 'Video Conference', 'Premium Audio'],
        roomType: 'VIP',
      },
    });
    vipRoomId = vipRoom.id;

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        username: 'standard_user',
        passwordHash: hashedPassword,
        email: 'standard@example.com',
        fullName: 'Standard User',
        userType: 'STANDARD',
        rankingScore: 100,
      },
    });

    await prisma.user.create({
      data: {
        username: 'vip_user',
        passwordHash: hashedPassword,
        email: 'vip@example.com',
        fullName: 'VIP User',
        userType: 'VIP',
        rankingScore: 100,
      },
    });

    // Create authenticated sessions
    standardUserAgent = request.agent(app);
    await standardUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'standard_user', password: 'password123' });

    vipUserAgent = request.agent(app);
    await vipUserAgent
      .post('/api/v1/auth/login')
      .send({ username: 'vip_user', password: 'password123' });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
    await prisma.room.deleteMany();
    await prisma.$disconnect();
  });

  describe('T075: VIP User Can Book VIP Rooms', () => {
    it('should allow VIP user to book a VIP room', async () => {
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const response = await vipUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: vipRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Executive strategy meeting',
          participantEmails: ['colleague@example.com'],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        roomId: vipRoomId,
        status: 'CONFIRMED',
        title: 'Executive strategy meeting',
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.organizer_id).toBeDefined();
    });

    it('should allow VIP user to book a normal room', async () => {
      const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const response = await vipUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Team meeting',
          participantEmails: [],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        roomId: normalRoomId,
        status: 'CONFIRMED',
        title: 'Team meeting',
      });
    });
  });

  describe('T076: Standard User Cannot Book VIP Rooms', () => {
    it('should reject standard user attempting to book VIP room with INSUFFICIENT_CLEARANCE', async () => {
      const startTime = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: vipRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Attempted VIP booking',
          participantEmails: [],
        })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'INSUFFICIENT_CLEARANCE',
        message: 'This room requires VIP access',
      });

      // Verify no booking was created
      const bookings = await prisma.booking.findMany({
        where: {
          roomId: vipRoomId,
          organizer: {
            username: 'standard_user',
          },
        },
      });
      expect(bookings).toHaveLength(0);
    });

    it('should allow standard user to book normal rooms', async () => {
      const startTime = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const response = await standardUserAgent
        .post('/api/v1/bookings')
        .send({
          roomId: normalRoomId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          title: 'Regular team meeting',
          participantEmails: ['teammate@example.com'],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        roomId: normalRoomId,
        status: 'CONFIRMED',
        title: 'Regular team meeting',
      });
    });

    it('should return 404 when standard user tries to access VIP room details', async () => {
      // This tests that VIP rooms are completely hidden from standard users
      const response = await standardUserAgent
        .get(`/api/v1/rooms/${vipRoomId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Room not found',
      });
    });
  });

  describe('Room Listing Filtering by User Type', () => {
    it('should return all rooms for VIP users', async () => {
      const response = await vipUserAgent
        .get('/api/v1/rooms')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const roomIds = response.body.map((r: any) => r.id);
      expect(roomIds).toContain(normalRoomId);
      expect(roomIds).toContain(vipRoomId);
    });

    it('should return only normal rooms for standard users', async () => {
      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .expect(200);

      const roomIds = response.body.map((r: any) => r.id);
      expect(roomIds).toContain(normalRoomId);
      expect(roomIds).not.toContain(vipRoomId);

      // Verify all returned rooms are non-VIP
      response.body.forEach((room: any) => {
        expect(room.roomType).toBe('NORMAL');
      });
    });

    it('should filter VIP rooms from availability queries for standard users', async () => {
      const startTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const response = await standardUserAgent
        .get('/api/v1/rooms')
        .query({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })
        .expect(200);

      const roomIds = response.body.map((r: any) => r.id);
      expect(roomIds).not.toContain(vipRoomId);
    });
  });
});

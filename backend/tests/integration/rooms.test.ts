import request from 'supertest';
import { app } from '../../src/app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('GET /api/v1/rooms', () => {
  let testUser: any;
  let authCookie: string;
  let vipUser: any;
  let vipAuthCookie: string;
  let normalRoom: any;
  let vipRoom: any;
  let testBooking: any;

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    testUser = await prisma.user.create({
      data: {
        username: 'testroomuser',
        passwordHash: hashedPassword,
        email: 'testroomuser@example.com',
        fullName: 'Test Room User',
        userType: 'STANDARD',
        rankingScore: 100,
      },
    });

    vipUser = await prisma.user.create({
      data: {
        username: 'testvipuser',
        passwordHash: hashedPassword,
        email: 'testvipuser@example.com',
        fullName: 'Test VIP User',
        userType: 'VIP',
        rankingScore: 100,
      },
    });

    // Create test rooms
    normalRoom = await prisma.room.create({
      data: {
        name: 'Test Normal Room',
        roomType: 'NORMAL',
        capacity: 10,
        equipment: ['projector', 'whiteboard'],
        location: 'Building A - Floor 1',
      },
    });

    vipRoom = await prisma.room.create({
      data: {
        name: 'Test VIP Room',
        roomType: 'VIP',
        capacity: 15,
        equipment: ['projector', 'whiteboard', 'video_conferencing'],
        location: 'Building A - Floor 5',
      },
    });

    // Login to get session cookies
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testroomuser', password: 'testpassword123' });
    authCookie = loginResponse.headers['set-cookie'][0];

    const vipLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'testvipuser', password: 'testpassword123' });
    vipAuthCookie = vipLoginResponse.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Clean up test data
    if (testBooking) {
      await prisma.booking.delete({ where: { id: testBooking.id } });
    }
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

  it('should list all rooms without filters', async () => {
    const response = await request(app)
      .get('/api/v1/rooms')
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body).toHaveProperty('rooms');
    expect(Array.isArray(response.body.rooms)).toBe(true);
    expect(response.body.rooms.length).toBeGreaterThanOrEqual(2);

    const normalRoomResult = response.body.rooms.find((r: any) => r.id === normalRoom.id);
    expect(normalRoomResult).toBeDefined();
    expect(normalRoomResult.name).toBe('Test Normal Room');
    expect(normalRoomResult.capacity).toBe(10);
    expect(normalRoomResult.roomType).toBe('NORMAL');
  });

  it('should filter rooms by capacity', async () => {
    const response = await request(app)
      .get('/api/v1/rooms?capacity=12')
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body.rooms.every((r: any) => r.capacity >= 12)).toBe(true);
    const vipRoomResult = response.body.rooms.find((r: any) => r.id === vipRoom.id);
    expect(vipRoomResult).toBeDefined(); // VIP room has capacity 15
  });

  it('should filter rooms by equipment', async () => {
    const response = await request(app)
      .get('/api/v1/rooms?equipment=video_conferencing')
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body.rooms.every((r: any) =>
      r.equipment.includes('video_conferencing')
    )).toBe(true);
  });

  it('should filter rooms by availability (no conflicts)', async () => {
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

    const response = await request(app)
      .get(`/api/v1/rooms?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body.rooms.every((r: any) => r.available === true)).toBe(true);
  });

  it('should exclude unavailable rooms when booking exists', async () => {
    // Create a booking for the normal room
    const startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

    testBooking = await prisma.booking.create({
      data: {
        roomId: normalRoom.id,
        organizerId: testUser.id,
        startTime,
        endTime,
        status: 'CONFIRMED',
        title: 'Test Booking for Availability',
      },
    });

    // Query for rooms at the same time
    const response = await request(app)
      .get(`/api/v1/rooms?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`)
      .set('Cookie', authCookie)
      .expect(200);

    const normalRoomResult = response.body.rooms.find((r: any) => r.id === normalRoom.id);

    // Normal room should either be marked as unavailable or not included (depending on implementation)
    if (normalRoomResult) {
      expect(normalRoomResult.available).toBe(false);
    }

    // VIP room should still be available
    const vipRoomResult = response.body.rooms.find((r: any) => r.id === vipRoom.id);
    if (vipRoomResult) {
      expect(vipRoomResult.available).toBe(true);
    }
  });

  it('should return 400 for invalid time range (endTime before startTime)', async () => {
    const startTime = new Date(Date.now() + 60 * 60 * 1000);
    const endTime = new Date(Date.now());

    const response = await request(app)
      .get(`/api/v1/rooms?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`)
      .set('Cookie', authCookie)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should include VIP rooms for VIP users', async () => {
    const response = await request(app)
      .get('/api/v1/rooms')
      .set('Cookie', vipAuthCookie)
      .expect(200);

    const vipRoomResult = response.body.rooms.find((r: any) => r.id === vipRoom.id);
    expect(vipRoomResult).toBeDefined();
    expect(vipRoomResult.roomType).toBe('VIP');
  });

  it('should return room by ID', async () => {
    const response = await request(app)
      .get(`/api/v1/rooms/${normalRoom.id}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body).toHaveProperty('id', normalRoom.id);
    expect(response.body).toHaveProperty('name', 'Test Normal Room');
    expect(response.body).toHaveProperty('capacity', 10);
    expect(response.body.equipment).toEqual(['projector', 'whiteboard']);
  });

  it('should return 404 for non-existent room', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await request(app)
      .get(`/api/v1/rooms/${fakeId}`)
      .set('Cookie', authCookie)
      .expect(404);
  });
});

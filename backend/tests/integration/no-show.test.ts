import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserType, RoomType, BookingStatus } from '@prisma/client';
import { BookingService } from '../../src/services/bookingService';

const prisma = new PrismaClient();
const bookingService = new BookingService();

describe('T084 & T085: No-Show Detection and Ranking Score Reduction Integration Tests (FR-019, FR-020)', () => {
  let standardUserId: string;
  let normalRoomId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'noshow_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'noshow_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'NoShow Test Room' } } });

    // Create test user with initial ranking score
    const testUser = await prisma.user.create({
      data: {
        username: 'noshow_test_user',
        email: 'noshow_test@example.com',
        passwordHash: '$2b$10$dummyhash',
        fullName: 'NoShow Test User',
        userType: UserType.STANDARD,
        rankingScore: 100, // Starting score
      },
    });
    standardUserId = testUser.id;

    // Create test room
    const testRoom = await prisma.room.create({
      data: {
        name: 'NoShow Test Room 1',
        roomType: RoomType.NORMAL,
        capacity: 10,
        equipment: ['Projector', 'Whiteboard'],
        location: 'Building A, Floor 2, Room 201',
      },
    });
    normalRoomId = testRoom.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizer: { username: { startsWith: 'noshow_test_' } } } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'noshow_test_' } } });
    await prisma.room.deleteMany({ where: { name: { startsWith: 'NoShow Test Room' } } });
    await prisma.$disconnect();
  });

  describe('T084: No-Show Detection', () => {
    it('should detect and mark booking as NO_SHOW when check-in grace period expires', async () => {
      // Create a booking that started more than 10 minutes ago (no check-in)
      const startTime = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const endTime = new Date(Date.now() + 50 * 60 * 1000); // 50 minutes from now

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'No-Show Detection Test',
        },
      });

      // Run no-show detection
      const processedCount = await bookingService.processNoShows();

      // Should have processed at least 1 booking
      expect(processedCount).toBeGreaterThanOrEqual(1);

      // Verify booking was marked as NO_SHOW
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should NOT mark booking as NO_SHOW if within grace period (<10 minutes)', async () => {
      // Create a booking that started 5 minutes ago (within grace period)
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const endTime = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes from now

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'Within Grace Period Test',
        },
      });

      // Run no-show detection
      await bookingService.processNoShows();

      // Booking should still be CONFIRMED
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe(BookingStatus.CONFIRMED);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should NOT mark booking as NO_SHOW if already checked in', async () => {
      // Create a booking that started more than 10 minutes ago but was checked in
      const startTime = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const endTime = new Date(Date.now() + 50 * 60 * 1000);
      const checkedInAt = new Date(Date.now() - 8 * 60 * 1000); // Checked in 8 minutes ago

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.IN_PROGRESS, // Already in progress
          checkedInAt,
          title: 'Already Checked In Test',
        },
      });

      // Run no-show detection
      await bookingService.processNoShows();

      // Booking should still be IN_PROGRESS
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe(BookingStatus.IN_PROGRESS);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should NOT process bookings that are already NO_SHOW, CANCELLED, or COMPLETED', async () => {
      // Create bookings with various statuses
      const startTime = new Date(Date.now() - 11 * 60 * 1000);
      const endTime = new Date(Date.now() + 50 * 60 * 1000);

      const cancelledBooking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CANCELLED,
          title: 'Cancelled Booking',
        },
      });

      const completedBooking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          status: BookingStatus.COMPLETED,
          title: 'Completed Booking',
        },
      });

      // Run no-show detection
      await bookingService.processNoShows();

      // Both should retain their original status
      const updatedCancelled = await prisma.booking.findUnique({
        where: { id: cancelledBooking.id },
      });
      const updatedCompleted = await prisma.booking.findUnique({
        where: { id: completedBooking.id },
      });

      expect(updatedCancelled?.status).toBe(BookingStatus.CANCELLED);
      expect(updatedCompleted?.status).toBe(BookingStatus.COMPLETED);

      // Clean up
      await prisma.booking.deleteMany({
        where: { id: { in: [cancelledBooking.id, completedBooking.id] } },
      });
    });
  });

  describe('T085: Ranking Score Reduction (FR-020)', () => {
    it('should reduce organizer ranking score by 2 points on no-show', async () => {
      // Get initial ranking score
      const userBefore = await prisma.user.findUnique({ where: { id: standardUserId } });
      const initialScore = userBefore?.rankingScore || 100;

      // Create a booking that will trigger no-show
      const startTime = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const endTime = new Date(Date.now() + 50 * 60 * 1000);

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'Ranking Reduction Test',
        },
      });

      // Run no-show detection
      await bookingService.processNoShows();

      // Verify booking was marked as NO_SHOW
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

      // Verify ranking score was reduced by 2
      const userAfter = await prisma.user.findUnique({ where: { id: standardUserId } });
      expect(userAfter?.rankingScore).toBe(initialScore - 2);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should handle multiple no-shows and accumulate ranking penalties', async () => {
      // Get initial ranking score
      const userBefore = await prisma.user.findUnique({ where: { id: standardUserId } });
      const initialScore = userBefore?.rankingScore || 100;

      // Create multiple bookings that will trigger no-shows
      const startTime = new Date(Date.now() - 11 * 60 * 1000);

      const booking1 = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime: new Date(Date.now() + 50 * 60 * 1000),
          status: BookingStatus.CONFIRMED,
          title: 'Multiple No-Show Test 1',
        },
      });

      const booking2 = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago (different time)
          endTime: new Date(Date.now() + 48 * 60 * 1000),
          status: BookingStatus.CONFIRMED,
          title: 'Multiple No-Show Test 2',
        },
      });

      // Run no-show detection
      const processedCount = await bookingService.processNoShows();
      expect(processedCount).toBeGreaterThanOrEqual(2);

      // Verify both bookings were marked as NO_SHOW
      const updatedBooking1 = await prisma.booking.findUnique({ where: { id: booking1.id } });
      const updatedBooking2 = await prisma.booking.findUnique({ where: { id: booking2.id } });
      expect(updatedBooking1?.status).toBe(BookingStatus.NO_SHOW);
      expect(updatedBooking2?.status).toBe(BookingStatus.NO_SHOW);

      // Verify ranking score was reduced by 4 (2 per no-show)
      const userAfter = await prisma.user.findUnique({ where: { id: standardUserId } });
      expect(userAfter?.rankingScore).toBe(initialScore - 4);

      // Clean up
      await prisma.booking.deleteMany({ where: { id: { in: [booking1.id, booking2.id] } } });
    });

    it('should not reduce ranking score if booking status is not NO_SHOW', async () => {
      // Get initial ranking score
      const userBefore = await prisma.user.findUnique({ where: { id: standardUserId } });
      const initialScore = userBefore?.rankingScore || 100;

      // Create a booking within grace period (will not be marked NO_SHOW)
      const startTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const endTime = new Date(Date.now() + 55 * 60 * 1000);

      const booking = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime,
          endTime,
          status: BookingStatus.CONFIRMED,
          title: 'No Penalty Test',
        },
      });

      // Run no-show detection
      await bookingService.processNoShows();

      // Verify booking is still CONFIRMED
      const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(updatedBooking?.status).toBe(BookingStatus.CONFIRMED);

      // Verify ranking score was NOT reduced
      const userAfter = await prisma.user.findUnique({ where: { id: standardUserId } });
      expect(userAfter?.rankingScore).toBe(initialScore);

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });

  describe('No-Show Repository Method', () => {
    it('should correctly identify pending check-ins past grace period', async () => {
      // Create test bookings
      const withinGrace = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          endTime: new Date(Date.now() + 55 * 60 * 1000),
          status: BookingStatus.CONFIRMED,
          title: 'Within Grace',
        },
      });

      const pastGrace = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime: new Date(Date.now() - 11 * 60 * 1000), // 11 min ago
          endTime: new Date(Date.now() + 49 * 60 * 1000),
          status: BookingStatus.CONFIRMED,
          title: 'Past Grace',
        },
      });

      const alreadyCheckedIn = await prisma.booking.create({
        data: {
          roomId: normalRoomId,
          organizerId: standardUserId,
          startTime: new Date(Date.now() - 11 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 1000),
          status: BookingStatus.IN_PROGRESS,
          checkedInAt: new Date(Date.now() - 9 * 60 * 1000),
          title: 'Already Checked In',
        },
      });

      // Query pending check-ins
      const { BookingRepository } = await import('../../src/repositories/bookingRepository');
      const bookingRepo = new BookingRepository();
      const pendingBookings = await bookingRepo.findPendingCheckIn(10);

      // Should include pastGrace but not withinGrace or alreadyCheckedIn
      const pendingIds = pendingBookings.map((b) => b.id);
      expect(pendingIds).toContain(pastGrace.id);
      expect(pendingIds).not.toContain(withinGrace.id);
      expect(pendingIds).not.toContain(alreadyCheckedIn.id);

      // Clean up
      await prisma.booking.deleteMany({
        where: { id: { in: [withinGrace.id, pastGrace.id, alreadyCheckedIn.id] } },
      });
    });
  });
});

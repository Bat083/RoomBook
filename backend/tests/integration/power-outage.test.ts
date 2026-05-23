import { PrismaClient, BookingStatus } from '@prisma/client';
import { NoShowDetectionService } from '../../src/services/noShowDetectionService';
import { MonitoringService, DowntimeIncident } from '../../src/services/monitoringService';

const prisma = new PrismaClient();

// Mock the MonitoringService
jest.mock('../../src/services/monitoringService');

describe('Power Outage Grace Period Extension (EC-002)', () => {
  let testUserId: string;
  let testRoomId: string;
  let noShowService: NoShowDetectionService;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'power-outage-test@example.com',
        passwordHash: 'hash',
        name: 'Power Outage Test User',
        isVIP: false,
        rankingScore: 10,
      },
    });
    testUserId = user.id;

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: 'Power Outage Test Room',
        capacity: 10,
        isVIP: false,
        equipment: [],
      },
    });
    testRoomId = room.id;

    noShowService = new NoShowDetectionService(10); // 10-minute grace period
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({ where: { organizerId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.room.delete({ where: { id: testRoomId } });
    await prisma.$disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extend grace period when downtime is detected', async () => {
    // Create a booking that started 15 minutes ago (past standard 10-minute grace period)
    const bookingStartTime = new Date(Date.now() - 15 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        roomId: testRoomId,
        organizerId: testUserId,
        startTime: bookingStartTime,
        endTime: new Date(bookingStartTime.getTime() + 60 * 60 * 1000), // 1 hour later
        duration: 60,
        purpose: 'Power outage test booking',
        status: BookingStatus.CONFIRMED,
      },
    });

    // Mock monitoring service to report 10 minutes of downtime
    const mockMonitoringService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getDowntimeAffectingWindow: jest.fn().mockResolvedValue(10 * 60), // 10 minutes = 600 seconds
    };

    const MonitoringServiceMock = MonitoringService as jest.MockedClass<typeof MonitoringService>;
    MonitoringServiceMock.prototype.isConfigured = mockMonitoringService.isConfigured;
    MonitoringServiceMock.prototype.getDowntimeAffectingWindow =
      mockMonitoringService.getDowntimeAffectingWindow;

    // Mock getMonitoringService to return our mock
    const monitoringModule = require('../../src/services/monitoringService');
    monitoringModule.getMonitoringService = jest.fn().mockReturnValue(mockMonitoringService);

    // Run no-show detection
    const processedCount = await noShowService.detectNoShows();

    // Booking should NOT be marked as no-show because:
    // - Standard grace period: 10 minutes
    // - Downtime: 10 minutes
    // - Extended grace period: 20 minutes
    // - Time since start: 15 minutes
    // - 15 < 20, so still within grace period
    expect(processedCount).toBe(0);

    // Verify booking is still CONFIRMED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.CONFIRMED);

    // Clean up
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it('should mark as NO_SHOW when past extended grace period', async () => {
    // Create a booking that started 25 minutes ago
    const bookingStartTime = new Date(Date.now() - 25 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        roomId: testRoomId,
        organizerId: testUserId,
        startTime: bookingStartTime,
        endTime: new Date(bookingStartTime.getTime() + 60 * 60 * 1000),
        duration: 60,
        purpose: 'Power outage test booking - past extended grace',
        status: BookingStatus.CONFIRMED,
      },
    });

    // Mock monitoring service to report 10 minutes of downtime
    const mockMonitoringService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getDowntimeAffectingWindow: jest.fn().mockResolvedValue(10 * 60), // 10 minutes
    };

    const MonitoringServiceMock = MonitoringService as jest.MockedClass<typeof MonitoringService>;
    MonitoringServiceMock.prototype.isConfigured = mockMonitoringService.isConfigured;
    MonitoringServiceMock.prototype.getDowntimeAffectingWindow =
      mockMonitoringService.getDowntimeAffectingWindow;

    const monitoringModule = require('../../src/services/monitoringService');
    monitoringModule.getMonitoringService = jest.fn().mockReturnValue(mockMonitoringService);

    // Get initial ranking score
    const userBefore = await prisma.user.findUnique({ where: { id: testUserId } });
    const initialRanking = userBefore!.rankingScore;

    // Run no-show detection
    const processedCount = await noShowService.detectNoShows();

    // Booking SHOULD be marked as no-show because:
    // - Standard grace period: 10 minutes
    // - Downtime: 10 minutes
    // - Extended grace period: 20 minutes
    // - Time since start: 25 minutes
    // - 25 > 20, so past extended grace period
    expect(processedCount).toBe(1);

    // Verify booking is now NO_SHOW
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

    // Verify ranking was reduced by 2 points
    const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(userAfter!.rankingScore).toBe(initialRanking - 2);

    // Clean up
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it('should use standard grace period when monitoring not configured', async () => {
    // Create a booking that started 12 minutes ago
    const bookingStartTime = new Date(Date.now() - 12 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        roomId: testRoomId,
        organizerId: testUserId,
        startTime: bookingStartTime,
        endTime: new Date(bookingStartTime.getTime() + 60 * 60 * 1000),
        duration: 60,
        purpose: 'Power outage test booking - no monitoring',
        status: BookingStatus.CONFIRMED,
      },
    });

    // Mock monitoring service as not configured
    const mockMonitoringService = {
      isConfigured: jest.fn().mockReturnValue(false),
      getDowntimeAffectingWindow: jest.fn(),
    };

    const MonitoringServiceMock = MonitoringService as jest.MockedClass<typeof MonitoringService>;
    MonitoringServiceMock.prototype.isConfigured = mockMonitoringService.isConfigured;
    MonitoringServiceMock.prototype.getDowntimeAffectingWindow =
      mockMonitoringService.getDowntimeAffectingWindow;

    const monitoringModule = require('../../src/services/monitoringService');
    monitoringModule.getMonitoringService = jest.fn().mockReturnValue(mockMonitoringService);

    // Run no-show detection
    const processedCount = await noShowService.detectNoShows();

    // Booking SHOULD be marked as no-show because:
    // - Standard grace period: 10 minutes (no extension)
    // - Time since start: 12 minutes
    // - 12 > 10, so past grace period
    expect(processedCount).toBe(1);

    // Verify monitoring service was never queried for downtime
    expect(mockMonitoringService.getDowntimeAffectingWindow).not.toHaveBeenCalled();

    // Verify booking is now NO_SHOW
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

    // Clean up
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it('should handle monitoring service errors gracefully', async () => {
    // Create a booking that started 12 minutes ago
    const bookingStartTime = new Date(Date.now() - 12 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        roomId: testRoomId,
        organizerId: testUserId,
        startTime: bookingStartTime,
        endTime: new Date(bookingStartTime.getTime() + 60 * 60 * 1000),
        duration: 60,
        purpose: 'Power outage test booking - monitoring error',
        status: BookingStatus.CONFIRMED,
      },
    });

    // Mock monitoring service to throw an error
    const mockMonitoringService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getDowntimeAffectingWindow: jest.fn().mockRejectedValue(new Error('Monitoring API error')),
    };

    const MonitoringServiceMock = MonitoringService as jest.MockedClass<typeof MonitoringService>;
    MonitoringServiceMock.prototype.isConfigured = mockMonitoringService.isConfigured;
    MonitoringServiceMock.prototype.getDowntimeAffectingWindow =
      mockMonitoringService.getDowntimeAffectingWindow;

    const monitoringModule = require('../../src/services/monitoringService');
    monitoringModule.getMonitoringService = jest.fn().mockReturnValue(mockMonitoringService);

    // Run no-show detection
    const processedCount = await noShowService.detectNoShows();

    // Should fall back to standard grace period and mark as NO_SHOW
    // - Standard grace period: 10 minutes
    // - Time since start: 12 minutes
    // - 12 > 10, so past grace period
    expect(processedCount).toBe(1);

    // Verify booking is now NO_SHOW
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

    // Clean up
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

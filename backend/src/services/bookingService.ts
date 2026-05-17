import { PrismaClient, Booking, BookingStatus, RoomType, UserType } from '@prisma/client';
import { BookingRepository } from '../repositories/bookingRepository';
import { RoomRepository } from '../repositories/roomRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from './notificationService';
import { createError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class BookingService {
  private bookingRepo: BookingRepository;
  private roomRepo: RoomRepository;
  private userRepo: UserRepository;
  private notificationService: NotificationService;

  constructor() {
    this.bookingRepo = new BookingRepository();
    this.roomRepo = new RoomRepository();
    this.userRepo = new UserRepository();
    this.notificationService = new NotificationService();
  }

  // Create a new booking with validation and conflict detection (FR-009, FR-024)
  async createBooking(data: {
    roomId: string;
    organizerId: string;
    startTime: Date;
    endTime: Date;
    title?: string;
    description?: string;
    participantIds?: string[];
  }): Promise<Booking> {
    // Validate duration (FR-010, FR-011, FR-012)
    this.validateDuration(data.startTime, data.endTime);

    // Get room details
    const room = await this.roomRepo.findById(data.roomId);
    if (!room) {
      throw createError('Room not found', 404, 'ROOM_NOT_FOUND');
    }

    // Check VIP authorization (FR-013)
    if (room.roomType === RoomType.VIP) {
      const isVIP = await this.userRepo.isVIP(data.organizerId);
      if (!isVIP) {
        throw createError('VIP rooms require superuser clearance', 403, 'INSUFFICIENT_CLEARANCE', {
          roomType: 'VIP',
          userType: 'STANDARD',
        });
      }
    }

    // Use SERIALIZABLE transaction to prevent race conditions (SC-002, FR-024)
    return await prisma.$transaction(
      async (tx) => {
        // Check for conflicts
        const conflicts = await this.bookingRepo.findConflicts(
          data.roomId,
          data.startTime,
          data.endTime
        );

        if (conflicts.length > 0) {
          // Find alternative rooms
          const alternatives = await this.findAlternatives(data.startTime, data.endTime, room);

          throw createError('Room is not available during requested time', 409, 'CONFLICT', {
            conflictingBooking: {
              id: conflicts[0].id,
              startTime: conflicts[0].startTime.toISOString(),
              endTime: conflicts[0].endTime.toISOString(),
            },
            alternatives,
          });
        }

        // Create booking
        const booking = await this.bookingRepo.create(data);

        // Send notifications asynchronously (FR-015)
        this.notificationService.sendBookingConfirmation(booking).catch((error) => {
          console.error('Failed to send booking confirmation:', error);
        });

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      }
    );
  }

  // Validate booking duration
  private validateDuration(startTime: Date, endTime: Date): void {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    // FR-010: Minimum 15 minutes
    if (durationMinutes < 15) {
      throw createError(
        'Booking duration must be between 15 minutes and 8 hours',
        400,
        'INVALID_DURATION',
        {
          minDuration: '15 minutes',
          maxDuration: '8 hours',
          requestedDuration: `${durationMinutes} minutes`,
        }
      );
    }

    // FR-011: Maximum 8 hours
    if (durationMinutes > 480) {
      throw createError(
        'Booking duration must be between 15 minutes and 8 hours',
        400,
        'INVALID_DURATION',
        {
          minDuration: '15 minutes',
          maxDuration: '8 hours',
          requestedDuration: `${durationMinutes} minutes`,
        }
      );
    }

    // Ensure start time is in the future
    if (startTime < new Date()) {
      throw createError('Start time must be in the future', 400, 'INVALID_START_TIME');
    }

    // Ensure end time is after start time
    if (endTime <= startTime) {
      throw createError('End time must be after start time', 400, 'INVALID_TIME_RANGE');
    }
  }

  // Find alternative available rooms
  private async findAlternatives(
    startTime: Date,
    endTime: Date,
    currentRoom: any
  ): Promise<any[]> {
    const availableRooms = await this.roomRepo.findAvailable(startTime, endTime, {
      capacity: currentRoom.capacity,
      roomType: currentRoom.roomType,
    });

    return availableRooms.slice(0, 3).map((room) => ({
      roomId: room.id,
      roomName: room.name,
      availableSlots: [
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      ],
    }));
  }

  // Check in to a booking (FR-018)
  async checkIn(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId, false);

    if (!booking) {
      throw createError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    // Verify user is the organizer
    if (booking.organizerId !== userId) {
      throw createError('Only the booking organizer can check in', 403, 'FORBIDDEN');
    }

    // Verify booking status
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw createError(
        `Cannot check in to booking with status ${booking.status}. Must be CONFIRMED.`,
        400,
        'INVALID_STATE_TRANSITION',
        {
          currentStatus: booking.status,
          requiredStatus: 'CONFIRMED',
        }
      );
    }

    // Verify within check-in window (within 10 minutes after start time)
    const now = new Date();
    const gracePeriodMs = 10 * 60 * 1000;
    const checkInDeadline = new Date(booking.startTime.getTime() + gracePeriodMs);

    if (now > checkInDeadline) {
      throw createError(
        'Check-in window has expired (more than 10 minutes past start time)',
        409,
        'CHECK_IN_WINDOW_CLOSED',
        {
          startTime: booking.startTime.toISOString(),
          currentTime: now.toISOString(),
          graceMinutes: 10,
        }
      );
    }

    // Update booking status
    return this.bookingRepo.updateStatus(bookingId, BookingStatus.IN_PROGRESS, {
      checkedInAt: now,
    });
  }

  // Cancel a booking (FR-021)
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw createError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    // Verify user is the organizer
    if (booking.organizerId !== userId) {
      throw createError('Only the booking organizer can cancel this booking', 403, 'FORBIDDEN');
    }

    // Verify booking status
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw createError(
        `Cannot cancel booking with status ${booking.status}. Must be CONFIRMED.`,
        400,
        'INVALID_STATE_TRANSITION',
        {
          currentStatus: booking.status,
          allowedStatuses: ['CONFIRMED'],
        }
      );
    }

    // Update booking status
    const cancelledBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CANCELLED
    );

    // Send cancellation notifications (FR-023)
    this.notificationService.sendBookingCancellation(cancelledBooking).catch((error) => {
      console.error('Failed to send cancellation notification:', error);
    });

    return cancelledBooking;
  }

  // Process no-shows (FR-019, FR-020)
  async processNoShows(): Promise<number> {
    const pendingBookings = await this.bookingRepo.findPendingCheckIn(10);
    let processedCount = 0;

    for (const booking of pendingBookings) {
      try {
        // Mark as no-show
        await this.bookingRepo.updateStatus(booking.id, BookingStatus.NO_SHOW);

        // Reduce organizer ranking by 2 (FR-020)
        await this.userRepo.updateRankingScore(booking.organizerId, -2);

        // Send penalty notification
        this.notificationService.sendNoShowPenalty(booking).catch((error) => {
          console.error('Failed to send no-show notification:', error);
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to process no-show for booking ${booking.id}:`, error);
      }
    }

    return processedCount;
  }

  // Get booking by ID
  async getBookingById(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw createError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    // Check if user has access to this booking
    const isOrganizer = booking.organizerId === userId;
    const isParticipant = booking.participants?.some((p: any) => p.userId === userId);

    if (!isOrganizer && !isParticipant) {
      throw createError('You are not authorized to view this booking', 403, 'FORBIDDEN');
    }

    return booking;
  }

  // Get bookings for user
  async getUserBookings(
    userId: string,
    filters?: {
      status?: string[];
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ) {
    const statusFilter = filters?.status?.map(
      (s) => BookingStatus[s as keyof typeof BookingStatus]
    );

    return this.bookingRepo.findByUser(
      userId,
      {
        status: statusFilter,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      },
      pagination
    );
  }
}

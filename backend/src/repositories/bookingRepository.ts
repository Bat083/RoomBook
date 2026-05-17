import { PrismaClient, Booking, BookingStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class BookingRepository {
  // Find booking by ID with relations
  async findById(
    id: string,
    includeRelations: boolean = true
  ): Promise<
    | (Booking & {
        room?: any;
        organizer?: any;
        participants?: any[];
      })
    | null
  > {
    return prisma.booking.findUnique({
      where: { id },
      include: includeRelations
        ? {
            room: true,
            organizer: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                userType: true,
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                  },
                },
              },
            },
          }
        : undefined,
    });
  }

  // Find bookings for a user
  async findByUser(
    userId: string,
    filters?: {
      status?: BookingStatus[];
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<{ bookings: Booking[]; total: number }> {
    const where: Prisma.BookingWhereInput = {
      OR: [{ organizerId: userId }, { participants: { some: { userId } } }],
    };

    if (filters?.status) {
      where.status = { in: filters.status };
    }

    if (filters?.startDate) {
      where.startTime = { gte: filters.startDate };
    }

    if (filters?.endDate) {
      where.startTime = { lt: filters.endDate };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              roomType: true,
            },
          },
          organizer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          participants: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
        skip: pagination ? (pagination.page - 1) * pagination.limit : undefined,
        take: pagination?.limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total };
  }

  // Create booking with participants
  async create(data: {
    roomId: string;
    organizerId: string;
    startTime: Date;
    endTime: Date;
    title?: string;
    description?: string;
    participantIds?: string[];
  }): Promise<Booking> {
    return prisma.booking.create({
      data: {
        roomId: data.roomId,
        organizerId: data.organizerId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: BookingStatus.CONFIRMED,
        title: data.title,
        description: data.description,
        participants: {
          create: [
            // Add organizer as participant
            { userId: data.organizerId },
            // Add other participants
            ...(data.participantIds?.map((userId) => ({ userId })) || []),
          ],
        },
      },
      include: {
        room: true,
        organizer: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  // Check for conflicts within a transaction
  async findConflicts(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    const where: Prisma.BookingWhereInput = {
      roomId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    return prisma.booking.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Update booking status
  async updateStatus(
    id: string,
    status: BookingStatus,
    additionalData?: {
      checkedInAt?: Date;
      rejectionReason?: string;
    }
  ): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  // Find bookings for no-show detection
  async findPendingCheckIn(graceMinutes: number = 10): Promise<Booking[]> {
    const cutoffTime = new Date(Date.now() - graceMinutes * 60 * 1000);

    return prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startTime: { lt: cutoffTime },
        checkedInAt: null,
      },
      include: {
        organizer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Get calendar events for date range
  async findCalendarEvents(
    startDate: Date,
    endDate: Date,
    userId?: string,
    roomId?: string
  ): Promise<any[]> {
    const where: Prisma.BookingWhereInput = {
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
      startTime: { gte: startDate, lt: endDate },
    };

    if (roomId) {
      where.roomId = roomId;
    }

    return prisma.booking.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        organizer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        participants: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}

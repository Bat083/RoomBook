import { PrismaClient, Room, RoomType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class RoomRepository {
  // Find room by ID
  async findById(id: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id, isActive: true },
    });
  }

  // Find all active rooms
  async findAll(): Promise<Room[]> {
    return prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // Find available rooms for a time slot
  async findAvailable(
    startTime: Date,
    endTime: Date,
    filters?: {
      capacity?: number;
      equipment?: string[];
      roomType?: RoomType;
    }
  ): Promise<Room[]> {
    const where: Prisma.RoomWhereInput = {
      isActive: true,
    };

    // Apply filters
    if (filters?.capacity) {
      where.capacity = { gte: filters.capacity };
    }

    if (filters?.roomType) {
      where.roomType = filters.roomType;
    }

    if (filters?.equipment && filters.equipment.length > 0) {
      where.equipment = {
        path: '$',
        array_contains: filters.equipment,
      } as Prisma.JsonFilter;
    }

    // Get all rooms matching criteria
    const rooms = await prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Filter out rooms with conflicting bookings
    const availableRooms: Room[] = [];

    for (const room of rooms) {
      const hasConflict = await this.hasConflictingBooking(room.id, startTime, endTime);
      if (!hasConflict) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  }

  // Check if room has conflicting bookings
  async hasConflictingBooking(
    roomId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const where: Prisma.BookingWhereInput = {
      roomId,
      status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      OR: [
        {
          // Existing booking overlaps with requested time
          AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
        },
      ],
    };

    if (excludeBookingId) {
      where.id = { not: excludeBookingId };
    }

    const conflictCount = await prisma.booking.count({ where });
    return conflictCount > 0;
  }

  // Find rooms by type
  async findByType(roomType: RoomType): Promise<Room[]> {
    return prisma.room.findMany({
      where: { roomType, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

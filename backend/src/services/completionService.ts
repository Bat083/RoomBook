import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * CompletionService handles automatic completion of bookings
 * that have passed their end time (FR-027)
 */
export class CompletionService {
  /**
   * Auto-complete bookings that are IN_PROGRESS and have passed end time
   * @returns Number of bookings marked as completed
   */
  async completeFinishedBookings(): Promise<number> {
    const now = new Date();

    try {
      // Find all IN_PROGRESS bookings where end_time has passed
      const finishedBookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.IN_PROGRESS,
          endTime: {
            lt: now,
          },
        },
        select: {
          id: true,
          endTime: true,
          room: {
            select: {
              name: true,
            },
          },
          organizer: {
            select: {
              fullName: true,
            },
          },
        },
      });

      if (finishedBookings.length === 0) {
        return 0;
      }

      console.log(
        `[CompletionService] Found ${finishedBookings.length} booking(s) to auto-complete`
      );

      // Update all finished bookings to COMPLETED status
      const result = await prisma.booking.updateMany({
        where: {
          id: {
            in: finishedBookings.map((b) => b.id),
          },
        },
        data: {
          status: BookingStatus.COMPLETED,
          updatedAt: now,
        },
      });

      console.log(
        `[CompletionService] Successfully auto-completed ${result.count} booking(s) at ${now.toISOString()}`
      );

      // Log each completed booking for audit trail
      finishedBookings.forEach((booking) => {
        console.log(
          `[CompletionService] Completed booking ${booking.id} (${booking.room.name}, Organizer: ${booking.organizer.fullName}, End: ${booking.endTime.toISOString()})`
        );
      });

      return result.count;
    } catch (error) {
      console.error('[CompletionService] Error during auto-completion:', error);
      throw error;
    }
  }

  /**
   * Get statistics about completed bookings
   * @returns Statistics object
   */
  async getCompletionStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCompleted: number;
    averageDuration: number;
  }> {
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.COMPLETED,
        updatedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const totalCompleted = completedBookings.length;

    if (totalCompleted === 0) {
      return {
        totalCompleted: 0,
        averageDuration: 0,
      };
    }

    const totalDurationMs = completedBookings.reduce((sum, booking) => {
      const duration = booking.endTime.getTime() - booking.startTime.getTime();
      return sum + duration;
    }, 0);

    const averageDuration = totalDurationMs / totalCompleted / (1000 * 60); // in minutes

    return {
      totalCompleted,
      averageDuration: Math.round(averageDuration),
    };
  }
}

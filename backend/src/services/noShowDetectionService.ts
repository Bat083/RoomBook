import { BookingRepository } from '../repositories/bookingRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from './notificationService';
import { BookingStatus } from '@prisma/client';

/**
 * NoShowDetectionService handles automatic no-show detection for bookings
 * where users fail to check in within the grace period (FR-019, FR-020)
 */
export class NoShowDetectionService {
  private bookingRepo: BookingRepository;
  private userRepo: UserRepository;
  private notificationService: NotificationService;
  private gracePeriodMinutes: number;

  constructor(gracePeriodMinutes: number = 10) {
    this.bookingRepo = new BookingRepository();
    this.userRepo = new UserRepository();
    this.notificationService = new NotificationService();
    this.gracePeriodMinutes = gracePeriodMinutes;
  }

  /**
   * Detect and process no-shows for bookings past grace period
   * @returns Number of bookings marked as no-show
   */
  async detectNoShows(): Promise<number> {
    const pendingBookings = await this.bookingRepo.findPendingCheckIn(this.gracePeriodMinutes);
    let processedCount = 0;

    console.log(
      `[NoShowDetection] Found ${pendingBookings.length} booking(s) pending check-in past grace period`
    );

    for (const booking of pendingBookings) {
      try {
        // Mark booking as NO_SHOW
        await this.bookingRepo.updateStatus(booking.id, BookingStatus.NO_SHOW);

        // Reduce organizer ranking by 2 points (FR-020)
        await this.userRepo.updateRankingScore(booking.organizerId, -2);

        console.log(
          `[NoShowDetection] Marked booking ${booking.id} as NO_SHOW. Reduced ranking for user ${booking.organizerId}`
        );

        // Send penalty notification (FR-020)
        this.notificationService
          .sendNoShowPenalty(booking)
          .catch((error) => {
            console.error(
              `[NoShowDetection] Failed to send no-show penalty notification for booking ${booking.id}:`,
              error
            );
          });

        processedCount++;
      } catch (error) {
        console.error(`[NoShowDetection] Failed to process no-show for booking ${booking.id}:`, error);
      }
    }

    if (processedCount > 0) {
      console.log(`[NoShowDetection] Successfully processed ${processedCount} no-show(s)`);
    }

    return processedCount;
  }

  /**
   * Get statistics about no-show detection
   * @returns Statistics object
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalNoShows: number;
    uniqueUsers: number;
    totalPenaltyPoints: number;
  }> {
    // This would be implemented if we need reporting/analytics
    // For now, return placeholder values
    return {
      totalNoShows: 0,
      uniqueUsers: 0,
      totalPenaltyPoints: 0,
    };
  }
}

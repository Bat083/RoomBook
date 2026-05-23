import { BookingRepository } from '../repositories/bookingRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from './notificationService';
import { getMonitoringService } from './monitoringService';
import { BookingStatus } from '@prisma/client';

/**
 * NoShowDetectionService handles automatic no-show detection for bookings
 * where users fail to check in within the grace period (FR-019, FR-020, EC-002)
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
   * Calculate effective grace period for a booking, accounting for power outages (EC-002)
   * @param booking - The booking to check
   * @returns Extended grace period in minutes
   */
  private async calculateEffectiveGracePeriod(booking: any): Promise<number> {
    const monitoringService = getMonitoringService();

    if (!monitoringService.isConfigured()) {
      // No external monitoring configured, use standard grace period
      return this.gracePeriodMinutes;
    }

    try {
      // Check for downtime affecting the booking's check-in window
      const bookingStartTime = new Date(booking.startTime);
      const downtimeSeconds = await monitoringService.getDowntimeAffectingWindow(
        bookingStartTime,
        this.gracePeriodMinutes
      );

      if (downtimeSeconds > 0) {
        const downtimeMinutes = Math.ceil(downtimeSeconds / 60);
        const extendedGracePeriod = this.gracePeriodMinutes + downtimeMinutes;

        console.log(
          `[NoShowDetection] Extended grace period for booking ${booking.id} by ${downtimeMinutes} minutes due to power outage`
        );

        return extendedGracePeriod;
      }
    } catch (error) {
      console.error(
        `[NoShowDetection] Failed to check downtime for booking ${booking.id}, using standard grace period:`,
        error
      );
    }

    return this.gracePeriodMinutes;
  }

  /**
   * Detect and process no-shows for bookings past grace period (with power outage handling)
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
        // Calculate effective grace period accounting for power outages (EC-002)
        const effectiveGracePeriod = await this.calculateEffectiveGracePeriod(booking);

        // Check if booking is truly past the extended grace period
        const bookingStartTime = new Date(booking.startTime);
        const graceEndTime = new Date(bookingStartTime.getTime() + effectiveGracePeriod * 60 * 1000);
        const now = new Date();

        if (now < graceEndTime) {
          // Still within extended grace period, skip
          console.log(
            `[NoShowDetection] Booking ${booking.id} is within extended grace period (${effectiveGracePeriod} minutes), skipping`
          );
          continue;
        }

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
  async getStatistics(_startDate: Date, _endDate: Date): Promise<{
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

import cron from 'node-cron';
import { NoShowDetectionService } from '../services/noShowDetectionService';

const noShowService = new NoShowDetectionService(10); // 10-minute grace period

/**
 * No-Show Detection Cron Job (FR-019, FR-020)
 *
 * Runs every 1 minute to detect bookings that have passed the check-in
 * grace period without being checked in.
 *
 * Schedule: Every minute (* * * * *)
 */
export function startNoShowCron(): void {
  // Run every 1 minute
  const task = cron.schedule('* * * * *', async () => {
    try {
      const processedCount = await noShowService.detectNoShows();

      if (processedCount > 0) {
        console.log(
          `[NoShowCron] Processed ${processedCount} no-show(s) at ${new Date().toISOString()}`
        );
      }
    } catch (error) {
      console.error('[NoShowCron] Error during no-show detection:', error);
    }
  });

  task.start();
  console.log('[NoShowCron] No-show detection cron job started (runs every 1 minute)');
}

/**
 * Stop the no-show cron job
 * Used for testing or graceful shutdown
 */
export function stopNoShowCron(): void {
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log('[NoShowCron] No-show detection cron job stopped');
}

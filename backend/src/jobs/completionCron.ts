import cron from 'node-cron';
import { CompletionService } from '../services/completionService';

const completionService = new CompletionService();

/**
 * Automatic Booking Completion Cron Job (FR-027)
 *
 * Runs every 5 minutes to detect IN_PROGRESS bookings that have passed
 * their end time and automatically marks them as COMPLETED.
 *
 * Schedule: Every 5 minutes (* /5 * * * *)
 */
export function startCompletionCron(): void {
  // Run every 5 minutes
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      const completedCount = await completionService.completeFinishedBookings();

      if (completedCount > 0) {
        console.log(
          `[CompletionCron] Auto-completed ${completedCount} booking(s) at ${new Date().toISOString()}`
        );
      }
    } catch (error) {
      console.error('[CompletionCron] Error during auto-completion:', error);
    }
  });

  task.start();
  console.log('[CompletionCron] Auto-completion cron job started (runs every 5 minutes)');
}

/**
 * Stop the completion cron job
 * Used for testing or graceful shutdown
 */
export function stopCompletionCron(): void {
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log('[CompletionCron] Auto-completion cron job stopped');
}

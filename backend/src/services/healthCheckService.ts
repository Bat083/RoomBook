import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * HealthCheckService tracks system uptime and provides health status
 * Used for power outage detection (EC-002)
 */
export class HealthCheckService {
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Get system uptime in seconds
   */
  getUptimeSeconds(): number {
    return process.uptime();
  }

  /**
   * Get the time when this service was initialized (app started)
   */
  getStartTime(): Date {
    return this.startTime;
  }

  /**
   * Check if database is accessible
   */
  async isDatabaseConnected(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('[HealthCheck] Database connection failed:', error);
      return false;
    }
  }

  /**
   * Get last database write timestamp
   * This helps detect if the system was truly operational
   */
  async getLastDatabaseWrite(): Promise<Date | null> {
    try {
      // Query the most recent booking update/creation
      const lastBooking = await prisma.booking.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      if (lastBooking) {
        return lastBooking.updatedAt;
      }

      // Fallback to most recent notification
      const lastNotification = await prisma.notification.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return lastNotification ? lastNotification.createdAt : null;
    } catch (error) {
      console.error('[HealthCheck] Failed to get last database write:', error);
      return null;
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<{
    status: 'ok' | 'degraded' | 'error';
    timestamp: Date;
    uptime: number;
    startTime: Date;
    database: {
      connected: boolean;
      lastWrite: Date | null;
    };
  }> {
    const dbConnected = await this.isDatabaseConnected();
    const lastWrite = dbConnected ? await this.getLastDatabaseWrite() : null;

    let status: 'ok' | 'degraded' | 'error' = 'ok';
    if (!dbConnected) {
      status = 'error';
    } else if (!lastWrite) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: this.getUptimeSeconds(),
      startTime: this.startTime,
      database: {
        connected: dbConnected,
        lastWrite,
      },
    };
  }
}

// Singleton instance
let healthCheckService: HealthCheckService | null = null;

export function getHealthCheckService(): HealthCheckService {
  if (!healthCheckService) {
    healthCheckService = new HealthCheckService();
  }
  return healthCheckService;
}

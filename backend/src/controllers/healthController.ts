import { Request, Response } from 'express';
import { getHealthCheckService } from '../services/healthCheckService';

// Health check endpoint for power outage detection (EC-002)
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const healthService = getHealthCheckService();
    const health = await healthService.getHealthStatus();

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp.toISOString(),
      uptime: health.uptime,
      startTime: health.startTime.toISOString(),
      database: {
        connected: health.database.connected,
        lastWrite: health.database.lastWrite?.toISOString() || null,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

import axios, { AxiosInstance } from 'axios';

/**
 * Downtime incident from external monitor
 */
export interface DowntimeIncident {
  startTime: Date;
  endTime: Date | null; // null if ongoing
  durationSeconds: number;
}

/**
 * MonitoringService integrates with external monitoring services
 * (e.g., UptimeRobot) to detect system downtime for power outage handling (EC-002)
 */
export class MonitoringService {
  private apiKey: string | null;
  private monitorId: string | null;
  private client: AxiosInstance;

  constructor() {
    // Load from environment variables
    this.apiKey = process.env.UPTIME_ROBOT_API_KEY || null;
    this.monitorId = process.env.UPTIME_ROBOT_MONITOR_ID || null;

    this.client = axios.create({
      baseURL: 'https://api.uptimerobot.com/v2',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if monitoring is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.monitorId !== null;
  }

  /**
   * Get recent downtime incidents from external monitor
   * @param sinceDate - Get incidents since this date
   * @returns Array of downtime incidents
   */
  async getRecentDowntime(sinceDate: Date): Promise<DowntimeIncident[]> {
    if (!this.isConfigured()) {
      console.warn(
        '[MonitoringService] External monitoring not configured. Set UPTIME_ROBOT_API_KEY and UPTIME_ROBOT_MONITOR_ID.'
      );
      return [];
    }

    try {
      const response = await this.client.post('/getMonitors', {
        api_key: this.apiKey,
        monitors: this.monitorId,
        logs: 1,
        log_types: '1', // Only downtime events
        log_start_date: Math.floor(sinceDate.getTime() / 1000), // Unix timestamp
      });

      if (response.data.stat !== 'ok') {
        console.error('[MonitoringService] UptimeRobot API error:', response.data);
        return [];
      }

      const monitor = response.data.monitors?.[0];
      if (!monitor || !monitor.logs) {
        return [];
      }

      // Parse log entries into downtime incidents
      const incidents: DowntimeIncident[] = [];
      const logs = monitor.logs;

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Type 1 = Down, Type 2 = Up
        if (log.type === 1) {
          const startTime = new Date(log.datetime * 1000);

          // Find corresponding "up" event
          let endTime: Date | null = null;
          let durationSeconds = log.duration || 0;

          // Look for next "up" event
          for (let j = i + 1; j < logs.length; j++) {
            if (logs[j].type === 2) {
              endTime = new Date(logs[j].datetime * 1000);
              durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
              break;
            }
          }

          incidents.push({
            startTime,
            endTime,
            durationSeconds,
          });
        }
      }

      console.log(
        `[MonitoringService] Found ${incidents.length} downtime incident(s) since ${sinceDate.toISOString()}`
      );

      return incidents;
    } catch (error) {
      console.error('[MonitoringService] Failed to fetch downtime data:', error);
      return [];
    }
  }

  /**
   * Calculate total downtime in seconds within a time range
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @returns Total downtime in seconds
   */
  async getTotalDowntime(startTime: Date, endTime: Date): Promise<number> {
    const incidents = await this.getRecentDowntime(startTime);

    let totalSeconds = 0;

    for (const incident of incidents) {
      const incidentStart = incident.startTime;
      const incidentEnd = incident.endTime || new Date(); // Use now if still ongoing

      // Check if incident overlaps with our time range
      if (incidentEnd < startTime || incidentStart > endTime) {
        continue; // No overlap
      }

      // Calculate overlap duration
      const overlapStart = incidentStart > startTime ? incidentStart : startTime;
      const overlapEnd = incidentEnd < endTime ? incidentEnd : endTime;
      const overlapSeconds = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000);

      if (overlapSeconds > 0) {
        totalSeconds += overlapSeconds;
      }
    }

    return totalSeconds;
  }

  /**
   * Check if there was any downtime affecting a specific time window
   * @param targetTime - The time to check
   * @param windowMinutes - Window around targetTime to check (before and after)
   * @returns Downtime in seconds affecting the window
   */
  async getDowntimeAffectingWindow(targetTime: Date, windowMinutes: number): Promise<number> {
    const windowStart = new Date(targetTime.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + windowMinutes * 60 * 1000);

    return await this.getTotalDowntime(windowStart, windowEnd);
  }
}

// Singleton instance
let monitoringService: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringService) {
    monitoringService = new MonitoringService();
  }
  return monitoringService;
}

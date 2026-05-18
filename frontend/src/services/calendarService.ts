import { apiClient } from './api';
import { CalendarEvent } from '../types';

export interface GetCalendarEventsParams {
  startDate: string;
  endDate: string;
  roomId?: string;
}

export const calendarService = {
  /**
   * Get calendar events for a date range
   */
  async getCalendarEvents(params: GetCalendarEventsParams): Promise<CalendarEvent[]> {
    const response = await apiClient.get<CalendarEvent[]>('/calendar/events', { params });
    return response.data;
  },
};

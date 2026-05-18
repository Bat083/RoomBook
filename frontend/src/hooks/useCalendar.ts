import { useQuery } from '@tanstack/react-query';
import { calendarService, GetCalendarEventsParams } from '../services/calendarService';

export const useCalendarEvents = (params: GetCalendarEventsParams) => {
  return useQuery({
    queryKey: ['calendar', params],
    queryFn: () => calendarService.getCalendarEvents(params),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!(params.startDate && params.endDate),
  });
};

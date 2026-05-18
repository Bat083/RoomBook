import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService, GetBookingsParams } from '../services/bookingService';
import { CreateBookingRequest } from '../types';

export const useBookings = (params?: GetBookingsParams) => {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingService.getBookings(params),
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useBooking = (id: string | undefined) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getBookingById(id!),
    enabled: !!id,
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.createBooking(data),
    onSuccess: () => {
      // Invalidate bookings and rooms queries to refetch
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingService.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingService.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

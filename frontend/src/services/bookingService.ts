import { apiClient } from './api';
import { Booking, CreateBookingRequest, PaginatedResponse } from '../types';

export interface GetBookingsParams {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
}

export const bookingService = {
  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<Booking>('/bookings', data);
    return response.data;
  },

  /**
   * Get bookings with pagination and filters
   */
  async getBookings(params?: GetBookingsParams): Promise<PaginatedResponse<Booking>> {
    const response = await apiClient.get<PaginatedResponse<Booking>>('/bookings', { params });
    return response.data;
  },

  /**
   * Get a booking by ID
   */
  async getBookingById(id: string): Promise<Booking> {
    const response = await apiClient.get<Booking>(`/bookings/${id}`);
    return response.data;
  },

  /**
   * Check in to a booking
   */
  async checkIn(id: string): Promise<Booking> {
    const response = await apiClient.post<Booking>(`/bookings/${id}/check-in`);
    return response.data;
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string): Promise<void> {
    await apiClient.delete(`/bookings/${id}`);
  },
};

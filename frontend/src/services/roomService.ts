import { apiClient } from './api';
import { Room, RoomType } from '../types';

export interface GetRoomsParams {
  capacity?: number;
  equipment?: string[];
  startTime?: string;
  endTime?: string;
  type?: RoomType;
}

export const roomService = {
  /**
   * Get all rooms with optional filters
   */
  async getRooms(params?: GetRoomsParams): Promise<Room[]> {
    const response = await apiClient.get<Room[]>('/rooms', { params });
    return response.data;
  },

  /**
   * Get a room by ID
   */
  async getRoomById(id: string): Promise<Room> {
    const response = await apiClient.get<Room>(`/rooms/${id}`);
    return response.data;
  },
};

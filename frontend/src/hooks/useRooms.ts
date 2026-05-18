import { useQuery } from '@tanstack/react-query';
import { roomService, GetRoomsParams } from '../services/roomService';

export const useRooms = (params?: GetRoomsParams) => {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => roomService.getRooms(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRoom = (id: string | undefined) => {
  return useQuery({
    queryKey: ['room', id],
    queryFn: () => roomService.getRoomById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

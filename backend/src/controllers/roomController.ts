import { Request, Response, NextFunction } from 'express';
import { RoomRepository } from '../repositories/roomRepository';
import { RoomType } from '@prisma/client';
import { RoomDTO } from '../types';
import { createError } from '../middleware/errorHandler';

const roomRepo = new RoomRepository();

// GET /rooms
export async function listRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startTime, endTime, capacity, equipment, roomType } = req.query;

    let rooms;

    // If time range provided, get available rooms
    if (startTime && endTime) {
      const start = new Date(startTime as string);
      const end = new Date(endTime as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createError('Invalid date format', 400, 'INVALID_PARAMETERS');
      }

      if (end <= start) {
        throw createError('endTime must be after startTime', 400, 'INVALID_PARAMETERS');
      }

      const filters: any = {};

      if (capacity) {
        filters.capacity = parseInt(capacity as string, 10);
      }

      if (equipment) {
        filters.equipment = (equipment as string).split(',');
      }

      if (roomType) {
        filters.roomType = roomType as RoomType;
      }

      rooms = await roomRepo.findAvailable(start, end, filters);
    } else {
      // Get all rooms
      rooms = await roomRepo.findAll();
    }

    // Map to DTOs
    const roomDTOs: RoomDTO[] = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      roomType: room.roomType as any,
      capacity: room.capacity,
      equipment: room.equipment as string[],
      location: room.location,
      available: true, // If in available list, it's available
    }));

    res.json({
      rooms: roomDTOs,
      total: roomDTOs.length,
    });
  } catch (error) {
    next(error);
  }
}

// GET /rooms/:id
export async function getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const room = await roomRepo.findById(id);

    if (!room) {
      throw createError(`Room with ID ${id} does not exist`, 404, 'ROOM_NOT_FOUND');
    }

    const roomDTO: RoomDTO = {
      id: room.id,
      name: room.name,
      roomType: room.roomType as any,
      capacity: room.capacity,
      equipment: room.equipment as string[],
      location: room.location,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };

    res.json({ room: roomDTO });
  } catch (error) {
    next(error);
  }
}

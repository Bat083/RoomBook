import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService';
import { BookingRepository } from '../repositories/bookingRepository';
import { BookingDTO, CreateBookingRequest } from '../types';
import { createError } from '../middleware/errorHandler';

const bookingService = new BookingService();
const bookingRepo = new BookingRepository();

// POST /bookings
export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const data: CreateBookingRequest = req.body;

    // Validate required fields
    if (!data.roomId || !data.startTime || !data.endTime) {
      throw createError('Missing required fields', 400, 'INVALID_PARAMETERS');
    }

    const booking = await bookingService.createBooking({
      roomId: data.roomId,
      organizerId: req.user.id,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      title: data.title,
      description: data.description,
      participantIds: data.participantIds,
    });

    // Map to DTO
    const bookingDTO: BookingDTO = {
      id: booking.id,
      roomId: booking.roomId,
      organizerId: booking.organizerId,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status as any,
      title: booking.title,
      description: booking.description,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      room: booking.room
        ? {
            id: booking.room.id,
            name: booking.room.name,
            roomType: booking.room.roomType as any,
            capacity: booking.room.capacity,
            equipment: booking.room.equipment as string[],
            location: booking.room.location,
          }
        : undefined,
      organizer: booking.organizer
        ? {
            id: booking.organizer.id,
            username: booking.organizer.username,
            email: booking.organizer.email,
            fullName: booking.organizer.fullName,
            userType: booking.organizer.userType as any,
            rankingScore: 100,
          }
        : undefined,
      participants: booking.participants?.map((p: any) => ({
        id: p.user.id,
        username: p.user.username,
        email: p.user.email,
        fullName: p.user.fullName,
        userType: 'STANDARD' as any,
        rankingScore: 100,
      })),
    };

    res.status(201).json({
      booking: bookingDTO,
      message: 'Booking confirmed. Notifications sent to all participants.',
    });
  } catch (error) {
    next(error);
  }
}

// GET /bookings
export async function listBookings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const filters: any = {};

    if (status) {
      filters.status = (status as string).split(',');
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const pagination = {
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 100),
    };

    const result = await bookingService.getUserBookings(req.user.id, filters, pagination);

    // Map to DTOs
    const bookingDTOs: BookingDTO[] = result.bookings.map((booking: any) => ({
      id: booking.id,
      roomId: booking.roomId,
      organizerId: booking.organizerId,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status as any,
      title: booking.title,
      description: booking.description,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      room: booking.room
        ? {
            id: booking.room.id,
            name: booking.room.name,
            roomType: booking.room.roomType as any,
            capacity: 0,
            equipment: [],
          }
        : undefined,
      organizer: booking.organizer
        ? {
            id: booking.organizer.id,
            username: '',
            email: '',
            fullName: booking.organizer.fullName,
            userType: 'STANDARD' as any,
            rankingScore: 100,
          }
        : undefined,
      participantCount: booking.participants?.length || 0,
    }));

    res.json({
      bookings: bookingDTOs,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /bookings/:id
export async function getBookingById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const booking = await bookingService.getBookingById(id, req.user.id);

    // Map to DTO
    const bookingDTO: BookingDTO = {
      id: booking.id,
      roomId: booking.roomId,
      organizerId: booking.organizerId,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status as any,
      title: booking.title,
      description: booking.description,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      checkedInAt: booking.checkedInAt?.toISOString() || null,
      room: (booking as any).room
        ? {
            id: (booking as any).room.id,
            name: (booking as any).room.name,
            roomType: (booking as any).room.roomType as any,
            capacity: (booking as any).room.capacity,
            equipment: (booking as any).room.equipment as string[],
            location: (booking as any).room.location,
          }
        : undefined,
      organizer: (booking as any).organizer
        ? {
            id: (booking as any).organizer.id,
            username: (booking as any).organizer.username,
            email: (booking as any).organizer.email,
            fullName: (booking as any).organizer.fullName,
            userType: (booking as any).organizer.userType as any,
            rankingScore: 100,
          }
        : undefined,
      participants: (booking as any).participants?.map((p: any) => ({
        id: p.user.id,
        username: p.user.username,
        email: p.user.email,
        fullName: p.user.fullName,
        userType: 'STANDARD' as any,
        rankingScore: 100,
      })),
    };

    res.json({ booking: bookingDTO });
  } catch (error) {
    next(error);
  }
}

// POST /bookings/:id/check-in
export async function checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const booking = await bookingService.checkIn(id, req.user.id);

    res.json({
      booking: {
        id: booking.id,
        status: booking.status,
        checkedInAt: booking.checkedInAt?.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
      message: 'Checked in successfully',
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /bookings/:id
export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const booking = await bookingService.cancelBooking(id, req.user.id);

    res.json({
      booking: {
        id: booking.id,
        status: booking.status,
        updatedAt: booking.updatedAt.toISOString(),
      },
      message: 'Booking cancelled. Notifications sent to all participants.',
    });
  } catch (error) {
    next(error);
  }
}

// GET /calendar
export async function getCalendarEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { startDate, endDate, roomId } = req.query;

    if (!startDate || !endDate) {
      throw createError('startDate and endDate are required', 400, 'INVALID_PARAMETERS');
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw createError('Invalid date format', 400, 'INVALID_DATE_RANGE');
    }

    if (end <= start) {
      throw createError('endDate must be after startDate', 400, 'INVALID_DATE_RANGE');
    }

    const events = await bookingRepo.findCalendarEvents(
      start,
      end,
      req.user.id,
      roomId as string
    );

    // Map to calendar event DTOs
    const calendarEvents = events.map((booking: any) => ({
      id: booking.id,
      roomId: booking.roomId,
      roomName: booking.room.name,
      organizerName: booking.organizer.fullName,
      title: booking.title || booking.room.name,
      start: booking.startTime.toISOString(),
      end: booking.endTime.toISOString(),
      status: booking.status,
      participantCount: booking.participants.length,
      isOrganizer: booking.organizerId === req.user!.id,
      isParticipant: booking.participants.some((p: any) => p.userId === req.user!.id),
    }));

    res.json({
      events: calendarEvents,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

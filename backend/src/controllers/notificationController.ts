import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { createError } from '../utils/errors';

const notificationService = new NotificationService();

export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const offset = (page - 1) * limit;

    const result = await notificationService.getUserNotifications(
      userId,
      limit,
      offset,
      unreadOnly
    );

    res.json({
      notifications: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const userId = req.user.id;
    const { id } = req.params;

    await notificationService.markAsRead(id, userId);

    res.json({
      message: 'Notification marked as read',
      notificationId: id,
    });
  } catch (error) {
    next(error);
  }
}

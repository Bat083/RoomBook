import apiClient from './api';
import { Notification } from '../types';

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class NotificationService {
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<NotificationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString(),
    });

    const response = await apiClient.get<NotificationsResponse>(
      `/notifications?${params.toString()}`
    );
    return response.data;
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.getNotifications(1, 1, true);
    return response.pagination.total;
  }
}

export const notificationService = new NotificationService();

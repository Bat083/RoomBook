import React from 'react';
import { Notification } from '../types';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
        }}
      >
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
        }}
      >
        <p style={{ margin: 0, fontSize: '16px' }}>No notifications yet</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
          You'll receive notifications for booking confirmations, cancellations, and reminders
        </p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
};

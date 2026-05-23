import React from 'react';
import { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return '✅';
      case 'BOOKING_REJECTED':
        return '❌';
      case 'BOOKING_CANCELLED':
        return '🚫';
      case 'NO_SHOW_PENALTY':
        return '⚠️';
      case 'CHECK_IN_REMINDER':
        return '🔔';
      default:
        return '📩';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return '#d4edda';
      case 'BOOKING_REJECTED':
        return '#f8d7da';
      case 'BOOKING_CANCELLED':
        return '#fff3cd';
      case 'NO_SHOW_PENALTY':
        return '#f8d7da';
      case 'CHECK_IN_REMINDER':
        return '#cce5ff';
      default:
        return '#e2e3e5';
    }
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: notification.isRead ? '#ffffff' : getNotificationColor(notification.notificationType),
        border: `1px solid ${notification.isRead ? '#dee2e6' : '#ced4da'}`,
        borderRadius: '8px',
        cursor: notification.isRead ? 'default' : 'pointer',
        opacity: notification.isRead ? 0.7 : 1,
        transition: 'all 0.2s',
        boxShadow: notification.isRead ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={(e) => {
        if (!notification.isRead) {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!notification.isRead) {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>
          {getNotificationIcon(notification.notificationType)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: notification.isRead ? 'normal' : 'bold',
                color: '#333',
              }}
            >
              {notification.subject}
            </h4>
            {!notification.isRead && (
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  fontSize: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                }}
              >
                NEW
              </span>
            )}
          </div>

          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              color: '#666',
              lineHeight: 1.5,
            }}
          >
            {notification.message}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#999' }}>
              {new Date(notification.createdAt).toLocaleString()}
            </span>

            {notification.readAt && (
              <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                Read on {new Date(notification.readAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

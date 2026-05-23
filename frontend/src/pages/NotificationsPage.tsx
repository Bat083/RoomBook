import React, { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import { NotificationList } from '../components/NotificationList';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [page, unreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getNotifications(page, 20, unreadOnly);
      setNotifications(response.notifications);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
      alert(err.response?.data?.message || 'Failed to update notification');
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleToggleFilter = () => {
    setUnreadOnly(!unreadOnly);
    setPage(1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '28px', color: '#333' }}>Notifications</h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleToggleFilter}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: unreadOnly ? '#007bff' : '#fff',
              color: unreadOnly ? '#fff' : '#333',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {unreadOnly ? 'Show All' : 'Show Unread Only'}
          </button>

          <button
            onClick={loadNotifications}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <NotificationList
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        loading={loading}
        error={error}
      />

      {!loading && notifications.length > 0 && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <button
            onClick={handlePreviousPage}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: page === 1 ? '#e9ecef' : '#007bff',
              color: page === 1 ? '#6c757d' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>

          <span style={{ fontSize: '14px', color: '#666' }}>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: page === totalPages ? '#e9ecef' : '#007bff',
              color: page === totalPages ? '#6c757d' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notificationService } from '../services/notificationService';

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const getButtonStyle = (path: string) => ({
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: isActive(path) ? '#007bff' : '#fff',
    color: isActive(path) ? '#fff' : '#333',
    border: '1px solid #007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: isActive(path) ? 'bold' : 'normal',
  });

  return (
    <nav
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <button onClick={() => navigate('/rooms')} style={getButtonStyle('/rooms')}>
        Book a Room
      </button>

      <button onClick={() => navigate('/calendar')} style={getButtonStyle('/calendar')}>
        Calendar
      </button>

      <button onClick={() => navigate('/bookings')} style={getButtonStyle('/bookings')}>
        My Bookings
      </button>

      <button
        onClick={() => {
          navigate('/notifications');
          setTimeout(loadUnreadCount, 500);
        }}
        style={{
          ...getButtonStyle('/notifications'),
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        Notifications
        {unreadCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              backgroundColor: '#dc3545',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              borderRadius: '10px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <button onClick={() => navigate('/profile')} style={getButtonStyle('/profile')}>
        Profile
      </button>
    </nav>
  );
};

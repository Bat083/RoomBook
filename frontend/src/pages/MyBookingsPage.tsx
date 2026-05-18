import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBookings } from '../hooks/useBookings';
import { format } from 'date-fns';

export const MyBookingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: bookingsData, isLoading } = useBookings({
    userId: user?.id,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#28a745';
      case 'IN_PROGRESS':
        return '#007bff';
      case 'COMPLETED':
        return '#6c757d';
      case 'CANCELLED':
        return '#dc3545';
      case 'NO_SHOW':
        return '#fd7e14';
      default:
        return '#667eea';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <div className="bookings-page">
      <header className="page-header">
        <h1>Room Booking System</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user?.username}</strong></span>
          {user?.type === 'VIP' && <span className="vip-badge-small">VIP</span>}
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <nav className="nav-bar">
        <button onClick={() => navigate('/rooms')} className="nav-btn">Book a Room</button>
        <button onClick={() => navigate('/calendar')} className="nav-btn">Calendar</button>
        <button onClick={() => navigate('/bookings')} className="nav-btn active">My Bookings</button>
      </nav>

      <div className="content-container">
        <h2>My Bookings</h2>

        {isLoading && <p>Loading bookings...</p>}

        {!isLoading && bookingsData && bookingsData.data.length === 0 && (
          <div className="no-bookings">
            <p>You don't have any bookings yet.</p>
            <button onClick={() => navigate('/rooms')} className="btn-book">
              Book a Room
            </button>
          </div>
        )}

        {!isLoading && bookingsData && bookingsData.data.length > 0 && (
          <div className="bookings-list">
            {bookingsData.data.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <h3>{booking.title}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <strong>Room:</strong> {booking.room.name}
                  </div>
                  <div className="detail-row">
                    <strong>Date:</strong> {format(new Date(booking.startTime), 'PPP')}
                  </div>
                  <div className="detail-row">
                    <strong>Time:</strong> {format(new Date(booking.startTime), 'p')} - {format(new Date(booking.endTime), 'p')}
                  </div>
                  {booking.description && (
                    <div className="detail-row">
                      <strong>Description:</strong> {booking.description}
                    </div>
                  )}
                </div>

                {booking.status === 'CONFIRMED' && (
                  <div className="booking-actions">
                    <button className="btn-action">Check In</button>
                    <button className="btn-cancel-booking">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .bookings-page {
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .page-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          margin: 0;
          font-size: 24px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .vip-badge-small {
          background-color: #ffd700;
          color: #333;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .btn-logout {
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .btn-logout:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }

        .nav-bar {
          background-color: white;
          padding: 0 40px;
          display: flex;
          gap: 5px;
          border-bottom: 1px solid #e0e0e0;
        }

        .nav-btn {
          background: none;
          border: none;
          padding: 15px 20px;
          cursor: pointer;
          font-size: 14px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }

        .nav-btn:hover {
          color: #667eea;
        }

        .nav-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .content-container h2 {
          margin: 0 0 30px 0;
          font-size: 24px;
          color: #333;
        }

        .no-bookings {
          background: white;
          padding: 60px 40px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .no-bookings p {
          font-size: 18px;
          color: #666;
          margin-bottom: 20px;
        }

        .btn-book {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 5px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .btn-book:hover {
          opacity: 0.9;
        }

        .bookings-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .booking-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .booking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .booking-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .status-badge {
          color: white;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .booking-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .detail-row {
          font-size: 14px;
          color: #666;
        }

        .detail-row strong {
          color: #333;
          margin-right: 8px;
        }

        .booking-actions {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .btn-action:hover {
          opacity: 0.9;
        }

        .btn-cancel-booking {
          background-color: #fff;
          color: #dc3545;
          border: 1px solid #dc3545;
          padding: 10px 20px;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-cancel-booking:hover {
          background-color: #dc3545;
          color: white;
        }
      `}</style>
    </div>
  );
};

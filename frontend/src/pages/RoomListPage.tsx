import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';
import { BookingForm } from '../components/BookingForm';
import { Room } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const RoomListPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Date and time selection
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Room selection and booking
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Build query parameters for available rooms
  const startDateTime = new Date(`${selectedDate}T${startTime}`);
  const endDateTime = new Date(`${selectedDate}T${endTime}`);

  const { data: rooms, isLoading, error } = useRooms({
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
  });

  // Filter VIP rooms for standard users
  const filteredRooms = rooms?.filter(room => {
    if (room.type === 'VIP' && user?.type !== 'VIP') {
      return false;
    }
    return true;
  });

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    setSelectedRoom(null);
    alert('Booking created successfully! Check your email for confirmation.');
    navigate('/calendar');
  };

  const handleBookingCancel = () => {
    setShowBookingForm(false);
    setSelectedRoom(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="room-list-page">
      <header className="page-header">
        <h1>Room Booking System</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user?.username}</strong></span>
          {user?.type === 'VIP' && <span className="vip-badge-small">VIP</span>}
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <nav className="nav-bar">
        <button onClick={() => navigate('/rooms')} className="nav-btn active">Book a Room</button>
        <button onClick={() => navigate('/calendar')} className="nav-btn">Calendar</button>
        <button onClick={() => navigate('/bookings')} className="nav-btn">My Bookings</button>
      </nav>

      <div className="content-container">
        <div className="filters-section">
          <h2>Select Date & Time</h2>
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endTime">End Time</label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <p className="time-hint">Duration: {Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))} minutes</p>
        </div>

        <div className="rooms-section">
          <h2>Available Rooms</h2>

          {isLoading && <p>Loading available rooms...</p>}

          {error && (
            <div className="error-box">
              Failed to load rooms. Please try again.
            </div>
          )}

          {!isLoading && !error && filteredRooms && filteredRooms.length === 0 && (
            <div className="no-rooms">
              No rooms available for the selected time. Please try a different time slot.
            </div>
          )}

          {!isLoading && !error && filteredRooms && filteredRooms.length > 0 && (
            <div className="rooms-grid">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onSelect={handleRoomSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showBookingForm && selectedRoom && (
        <BookingForm
          room={selectedRoom}
          startTime={startDateTime}
          endTime={endDateTime}
          onSuccess={handleBookingSuccess}
          onCancel={handleBookingCancel}
        />
      )}

      <style>{`
        .room-list-page {
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

        .filters-section {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .filters-section h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #333;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        .filter-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }

        .filter-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .time-hint {
          margin-top: 15px;
          color: #666;
          font-size: 14px;
        }

        .rooms-section h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #333;
        }

        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .error-box {
          background-color: #fee;
          color: #c33;
          padding: 15px;
          border-radius: 5px;
          border: 1px solid #fcc;
        }

        .no-rooms {
          background-color: #fff9e6;
          color: #856404;
          padding: 20px;
          border-radius: 5px;
          border: 1px solid #ffc107;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

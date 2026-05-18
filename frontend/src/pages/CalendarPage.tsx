import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCalendarEvents } from '../hooks/useCalendar';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export const CalendarPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range for API query
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(addMonths(currentDate, 1));

  const { data: calendarEvents, isLoading } = useCalendarEvents({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Transform API events to react-big-calendar format
  const events: Event[] = useMemo(() => {
    if (!calendarEvents) return [];

    return calendarEvents.map((event) => ({
      title: `${event.roomName} - ${event.title}`,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: {
        id: event.id,
        status: event.status,
        roomName: event.roomName,
        organizerName: event.organizerName,
      },
    }));
  }, [calendarEvents]);

  // Style events based on status
  const eventStyleGetter = (event: Event) => {
    const status = event.resource?.status;
    let backgroundColor = '#667eea';

    switch (status) {
      case 'CONFIRMED':
        backgroundColor = '#28a745';
        break;
      case 'IN_PROGRESS':
        backgroundColor = '#007bff';
        break;
      case 'COMPLETED':
        backgroundColor = '#6c757d';
        break;
      case 'CANCELLED':
        backgroundColor = '#dc3545';
        break;
      case 'NO_SHOW':
        backgroundColor = '#fd7e14';
        break;
      default:
        backgroundColor = '#667eea';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
      },
    };
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="calendar-page">
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
        <button onClick={() => navigate('/calendar')} className="nav-btn active">Calendar</button>
        <button onClick={() => navigate('/bookings')} className="nav-btn">My Bookings</button>
      </nav>

      <div className="content-container">
        <div className="calendar-header">
          <h2>Booking Calendar</h2>
          <div className="legend">
            <div className="legend-item"><span className="legend-box confirmed"></span> Confirmed</div>
            <div className="legend-item"><span className="legend-box in-progress"></span> In Progress</div>
            <div className="legend-item"><span className="legend-box completed"></span> Completed</div>
            <div className="legend-item"><span className="legend-box cancelled"></span> Cancelled</div>
            <div className="legend-item"><span className="legend-box no-show"></span> No Show</div>
          </div>
        </div>

        {isLoading && <p>Loading calendar events...</p>}

        {!isLoading && (
          <div className="calendar-wrapper">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              onNavigate={(date) => setCurrentDate(date)}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day']}
              defaultView="week"
            />
          </div>
        )}
      </div>

      <style>{`
        .calendar-page {
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
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .calendar-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .legend {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #666;
        }

        .legend-box {
          width: 16px;
          height: 16px;
          border-radius: 3px;
        }

        .legend-box.confirmed {
          background-color: #28a745;
        }

        .legend-box.in-progress {
          background-color: #007bff;
        }

        .legend-box.completed {
          background-color: #6c757d;
        }

        .legend-box.cancelled {
          background-color: #dc3545;
        }

        .legend-box.no-show {
          background-color: #fd7e14;
        }

        .calendar-wrapper {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .rbc-calendar {
          font-family: inherit;
        }

        .rbc-header {
          padding: 10px 3px;
          font-weight: 600;
          color: #333;
        }

        .rbc-today {
          background-color: #f5f7ff;
        }

        .rbc-event {
          padding: 2px 5px;
          font-size: 12px;
        }

        .rbc-event-label {
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};

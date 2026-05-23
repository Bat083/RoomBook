import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { Booking } from '../types';
import { CheckInButton } from '../components/CheckInButton';
import { CancelBookingButton } from '../components/CancelBookingButton';
import { useAuth } from '../contexts/AuthContext';

export const BookingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  const loadBooking = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getBookingById(id);
      setBooking(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Booking not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this booking');
      } else {
        setError('Failed to load booking details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = (updatedBooking: Booking) => {
    setBooking(updatedBooking);
    alert('Successfully checked in!');
  };

  const handleCancelSuccess = () => {
    alert('Booking cancelled successfully');
    navigate('/bookings');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading booking details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
          }}
        >
          {error}
        </div>
        <button
          onClick={() => navigate('/my-bookings')}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to My Bookings
        </button>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const isOrganizer = user?.id === booking.organizerId;
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const canShowCheckIn = isOrganizer && booking.status === 'CONFIRMED';
  const canShowCancel = isOrganizer && booking.status === 'CONFIRMED';

  // Status badge styles
  const getStatusStyle = (status: string) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: 'bold' as const,
    };

    switch (status) {
      case 'CONFIRMED':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
      case 'IN_PROGRESS':
        return { ...baseStyle, backgroundColor: '#cce5ff', color: '#004085' };
      case 'COMPLETED':
        return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
      case 'NO_SHOW':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      case 'CANCELLED':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      default:
        return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/my-bookings')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← Back to My Bookings
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>
            {booking.title || booking.room?.name || 'Booking Details'}
          </h1>
          <span style={getStatusStyle(booking.status)}>{booking.status}</span>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Room
            </h3>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              {booking.room?.name}
              {booking.room?.type === 'VIP' && (
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    backgroundColor: '#ffd700',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                  }}
                >
                  VIP
                </span>
              )}
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
              {booking.room?.location || 'Location not specified'}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Time
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              <strong>Start:</strong> {startTime.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '16px' }}>
              <strong>End:</strong> {endTime.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
              Duration: {Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))} minutes
            </p>
          </div>

          {booking.description && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
                Description
              </h3>
              <p style={{ margin: 0, fontSize: '16px', whiteSpace: 'pre-wrap' }}>{booking.description}</p>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Organizer
            </h3>
            <p style={{ margin: 0, fontSize: '16px' }}>
              {booking.organizer?.fullName || 'Unknown'}
              {isOrganizer && (
                <span style={{ marginLeft: '8px', color: '#007bff', fontSize: '14px' }}>(You)</span>
              )}
            </p>
          </div>

          {booking.participants && booking.participants.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
                Participants ({booking.participants.length})
              </h3>
              <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                {booking.participants.map((participant) => (
                  <li key={participant.id} style={{ fontSize: '16px', marginBottom: '4px' }}>
                    {participant.fullName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {booking.checkedInAt && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
                Checked In
              </h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                {new Date(booking.checkedInAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
          {canShowCheckIn && (
            <CheckInButton booking={booking} onCheckInSuccess={handleCheckInSuccess} />
          )}

          {canShowCancel && (
            <div style={{ marginTop: '12px' }}>
              <CancelBookingButton booking={booking} onCancelSuccess={handleCancelSuccess} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

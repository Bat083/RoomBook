import React, { useState } from 'react';
import { Room, CreateBookingRequest } from '../types';
import { useCreateBooking } from '../hooks/useBookings';
import { useAuth } from '../contexts/AuthContext';

interface BookingFormProps {
  room: Room;
  startTime: Date;
  endTime: Date;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  room,
  startTime,
  endTime,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [alternativeRooms, setAlternativeRooms] = useState<Room[] | null>(null);

  const createBookingMutation = useCreateBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlternativeRooms(null);

    if (!user) {
      setError('You must be logged in to create a booking');
      return;
    }

    const bookingData: CreateBookingRequest = {
      roomId: room.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      title,
      description,
      participantIds: [], // For MVP, just the organizer
    };

    try {
      await createBookingMutation.mutateAsync(bookingData);
      onSuccess();
    } catch (err: any) {
      const errorData = err.response?.data;

      if (errorData?.error === 'BOOKING_CONFLICT') {
        setError('This room is not available for the selected time.');
        if (errorData.alternatives && errorData.alternatives.length > 0) {
          setAlternativeRooms(errorData.alternatives);
        }
      } else if (errorData?.error === 'INSUFFICIENT_CLEARANCE') {
        setError('You do not have permission to book VIP rooms. Please contact an administrator.');
      } else if (errorData?.error === 'INVALID_DURATION') {
        setError(errorData.message || 'Invalid booking duration. Please check the time range.');
      } else {
        setError(err.message || 'Failed to create booking. Please try again.');
      }
    }
  };

  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  return (
    <div className="booking-form-container">
      <div className="booking-form-card">
        <h2>Book {room.name}</h2>

        <div className="booking-summary">
          <div className="summary-item">
            <strong>Date:</strong> {startTime.toLocaleDateString()}
          </div>
          <div className="summary-item">
            <strong>Time:</strong> {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="summary-item">
            <strong>Duration:</strong> {duration} minutes
          </div>
          <div className="summary-item">
            <strong>Capacity:</strong> {room.capacity} people
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Meeting Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Standup"
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details about the meeting..."
              rows={3}
              maxLength={500}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {alternativeRooms && alternativeRooms.length > 0 && (
            <div className="alternatives">
              <h4>Alternative Rooms Available:</h4>
              <ul>
                {alternativeRooms.map((alt) => (
                  <li key={alt.id}>
                    <strong>{alt.name}</strong> - Capacity: {alt.capacity}, Location: {alt.location}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={createBookingMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .booking-form-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 20px;
        }

        .booking-form-card {
          background: white;
          border-radius: 10px;
          padding: 30px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .booking-form-card h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .booking-summary {
          background-color: #f5f7ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .summary-item {
          margin: 8px 0;
          font-size: 14px;
          color: #666;
        }

        .summary-item strong {
          color: #333;
          margin-right: 8px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group textarea {
          resize: vertical;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alternatives {
          background-color: #fff9e6;
          border: 1px solid #ffc107;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }

        .alternatives h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 14px;
        }

        .alternatives ul {
          margin: 0;
          padding-left: 20px;
        }

        .alternatives li {
          margin: 5px 0;
          font-size: 13px;
          color: #666;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn-cancel,
        .btn-submit {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .btn-cancel {
          background-color: #f5f5f5;
          color: #666;
        }

        .btn-cancel:hover:not(:disabled) {
          background-color: #e0e0e0;
        }

        .btn-submit {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-submit:hover:not(:disabled) {
          opacity: 0.9;
        }

        .btn-cancel:disabled,
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

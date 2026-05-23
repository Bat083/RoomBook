import React, { useState } from 'react';
import { bookingService } from '../services/bookingService';
import { Booking } from '../types';

interface CheckInButtonProps {
  booking: Booking;
  onCheckInSuccess: (updatedBooking: Booking) => void;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({ booking, onCheckInSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if check-in is allowed (within 10-minute window)
  const canCheckIn = (): { allowed: boolean; message?: string } => {
    if (booking.status !== 'CONFIRMED') {
      return {
        allowed: false,
        message: `Cannot check in: booking status is ${booking.status}`,
      };
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const gracePeriodMs = 10 * 60 * 1000; // 10 minutes
    const checkInDeadline = new Date(startTime.getTime() + gracePeriodMs);

    // Check if before start time
    if (now < startTime) {
      const minutesUntilStart = Math.ceil((startTime.getTime() - now.getTime()) / (60 * 1000));
      return {
        allowed: false,
        message: `Check-in opens at booking start time (in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''})`,
      };
    }

    // Check if past grace period
    if (now > checkInDeadline) {
      return {
        allowed: false,
        message: 'Check-in window has expired (more than 10 minutes past start time)',
      };
    }

    return { allowed: true };
  };

  const handleCheckIn = async () => {
    const validation = canCheckIn();

    if (!validation.allowed) {
      setError(validation.message || 'Cannot check in at this time');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await bookingService.checkIn(booking.id);
      onCheckInSuccess(response);
    } catch (err: any) {
      if (err.response?.data?.error) {
        const errorCode = err.response.data.error;
        const errorMessage = err.response.data.message;

        if (errorCode === 'CHECK_IN_WINDOW_CLOSED') {
          setError('Check-in window has expired. This booking will be marked as a no-show.');
        } else if (errorCode === 'INVALID_STATE_TRANSITION') {
          setError('Cannot check in: booking is not in CONFIRMED status.');
        } else if (errorCode === 'FORBIDDEN') {
          setError('Only the organizer can check in to this booking.');
        } else {
          setError(errorMessage || 'Failed to check in. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validation = canCheckIn();

  return (
    <div style={{ marginTop: '16px' }}>
      <button
        onClick={handleCheckIn}
        disabled={!validation.allowed || isLoading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: validation.allowed ? '#4CAF50' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: validation.allowed && !isLoading ? 'pointer' : 'not-allowed',
          opacity: validation.allowed && !isLoading ? 1 : 0.6,
        }}
      >
        {isLoading ? 'Checking in...' : 'Check In'}
      </button>

      {!validation.allowed && validation.message && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404',
            fontSize: '14px',
          }}
        >
          {validation.message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

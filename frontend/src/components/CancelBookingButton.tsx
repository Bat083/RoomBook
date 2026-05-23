import React, { useState } from 'react';
import { Booking } from '../types';
import { bookingService } from '../services/bookingService';

interface CancelBookingButtonProps {
  booking: Booking;
  onCancelSuccess?: () => void;
}

export const CancelBookingButton: React.FC<CancelBookingButtonProps> = ({
  booking,
  onCancelSuccess,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = (): { allowed: boolean; message?: string } => {
    if (booking.status !== 'CONFIRMED') {
      return {
        allowed: false,
        message: `Cannot cancel: booking status is ${booking.status}. Only CONFIRMED bookings can be cancelled.`,
      };
    }

    return { allowed: true };
  };

  const handleCancelClick = () => {
    const { allowed, message } = canCancel();

    if (!allowed) {
      alert(message);
      return;
    }

    setShowModal(true);
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      await bookingService.cancelBooking(booking.id);
      setShowModal(false);

      if (onCancelSuccess) {
        onCancelSuccess();
      } else {
        alert('Booking cancelled successfully');
        window.location.reload();
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel booking';

      setError(errorMessage);

      // If state transition error, show specific message
      if (err.response?.data?.error === 'INVALID_STATE_TRANSITION') {
        setError(
          'Cannot cancel: booking is not in CONFIRMED status. Only confirmed bookings can be cancelled.'
        );
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCloseModal = () => {
    if (!isCancelling) {
      setShowModal(false);
      setError(null);
    }
  };

  const { allowed } = canCancel();

  return (
    <>
      <button
        onClick={handleCancelClick}
        disabled={!allowed}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: allowed ? '#dc3545' : '#cccccc',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: allowed ? 'pointer' : 'not-allowed',
          opacity: allowed ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          if (allowed) {
            e.currentTarget.style.opacity = '0.9';
          }
        }}
        onMouseLeave={(e) => {
          if (allowed) {
            e.currentTarget.style.opacity = '1';
          }
        }}
      >
        Cancel Booking
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '20px',
                color: '#333',
              }}
            >
              Cancel Booking?
            </h2>

            <p style={{ margin: '0 0 24px 0', color: '#666', lineHeight: 1.5 }}>
              Are you sure you want to cancel this booking? This action cannot be undone.
              <br />
              <br />
              <strong>Booking Details:</strong>
              <br />
              <strong>Title:</strong> {booking.title}
              <br />
              <strong>Room:</strong> {booking.room.name}
              <br />
              <strong>Time:</strong> {new Date(booking.startTime).toLocaleString()} -{' '}
              {new Date(booking.endTime).toLocaleTimeString()}
            </p>

            {error && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  color: '#721c24',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCloseModal}
                disabled={isCancelling}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.6 : 1,
                }}
              >
                Keep Booking
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.6 : 1,
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <header
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>Room Booking System</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>Welcome, <strong>{user.username}</strong></span>
          {user.type === 'VIP' && (
            <span
              style={{
                backgroundColor: '#ffd700',
                color: '#333',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              VIP
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <nav
        style={{
          backgroundColor: 'white',
          padding: '0 40px',
          display: 'flex',
          gap: '5px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <button
          onClick={() => navigate('/rooms')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            borderBottom: '3px solid transparent',
          }}
        >
          Book a Room
        </button>
        <button
          onClick={() => navigate('/calendar')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            borderBottom: '3px solid transparent',
          }}
        >
          Calendar
        </button>
        <button
          onClick={() => navigate('/bookings')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            borderBottom: '3px solid transparent',
          }}
        >
          My Bookings
        </button>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none',
            border: 'none',
            padding: '15px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#667eea',
            borderBottom: '3px solid #667eea',
          }}
        >
          Profile
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ margin: '0 0 30px 0', fontSize: '24px', color: '#333' }}>My Profile</h2>

        <div
          style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Username
            </h3>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{user.username}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Full Name
            </h3>
            <p style={{ margin: 0, fontSize: '18px' }}>{user.fullName}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Email
            </h3>
            <p style={{ margin: 0, fontSize: '18px' }}>{user.email}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              User Type
            </h3>
            <p style={{ margin: 0, fontSize: '18px' }}>
              {user.type}
              {user.type === 'VIP' && (
                <span
                  style={{
                    marginLeft: '8px',
                    backgroundColor: '#ffd700',
                    color: '#333',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  VIP Access
                </span>
              )}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px', textTransform: 'uppercase' }}>
              Ranking Score
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>
                {user.rankingScore || 100}
              </p>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <p style={{ margin: 0 }}>Points</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  -2 points per no-show
                </p>
              </div>
            </div>
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#666',
              }}
            >
              <strong>Note:</strong> Your ranking score is reduced by 2 points each time you fail to check in
              to a confirmed booking within 10 minutes of the start time (no-show penalty).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

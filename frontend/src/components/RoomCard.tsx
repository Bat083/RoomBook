import React from 'react';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onSelect: (room: Room) => void;
  selected?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onSelect, selected }) => {
  const isVip = room.type === 'VIP';

  return (
    <div
      className={`room-card ${selected ? 'selected' : ''} ${isVip ? 'vip' : ''}`}
      onClick={() => onSelect(room)}
    >
      <div className="room-header">
        <h3>{room.name}</h3>
        {isVip && <span className="vip-badge">VIP</span>}
      </div>

      <div className="room-info">
        <div className="room-detail">
          <strong>Capacity:</strong> {room.capacity} people
        </div>
        <div className="room-detail">
          <strong>Location:</strong> {room.location}
        </div>
        {room.equipment && room.equipment.length > 0 && (
          <div className="room-detail">
            <strong>Equipment:</strong>
            <div className="equipment-tags">
              {room.equipment.map((item, index) => (
                <span key={index} className="equipment-tag">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .room-card {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
        }

        .room-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .room-card.selected {
          border-color: #667eea;
          background-color: #f5f7ff;
        }

        .room-card.vip {
          border-color: #ffc107;
        }

        .room-card.vip.selected {
          background-color: #fff9e6;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .room-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .vip-badge {
          background: linear-gradient(135deg, #ffd700, #ffb700);
          color: #333;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .room-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .room-detail {
          font-size: 14px;
          color: #666;
        }

        .room-detail strong {
          color: #333;
          margin-right: 5px;
        }

        .equipment-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .equipment-tag {
          background-color: #e8eaf6;
          color: #5c6bc0;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

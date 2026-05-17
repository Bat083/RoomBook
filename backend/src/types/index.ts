// Shared TypeScript types for Room Booking System
// These DTOs match the API contracts from contracts/api-endpoints.md

export enum UserType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
}

export enum RoomType {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
}

export enum BookingStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  NO_SHOW_PENALTY = 'NO_SHOW_PENALTY',
  CHECK_IN_REMINDER = 'CHECK_IN_REMINDER',
}

// User DTO
export interface UserDTO {
  id: string;
  username: string;
  email: string;
  fullName: string;
  userType: UserType;
  rankingScore: number;
  createdAt?: string;
  updatedAt?: string;
}

// Room DTO
export interface RoomDTO {
  id: string;
  name: string;
  roomType: RoomType;
  capacity: number;
  equipment: string[];
  location?: string | null;
  available?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Booking DTO
export interface BookingDTO {
  id: string;
  roomId: string;
  organizerId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  title?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  room?: RoomDTO;
  organizer?: UserDTO;
  participants?: UserDTO[];
  participantCount?: number;
}

// Notification DTO
export interface NotificationDTO {
  id: string;
  bookingId?: string | null;
  notificationType: NotificationType;
  subject: string;
  message: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

// API Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserDTO;
  message: string;
}

export interface CreateBookingRequest {
  roomId: string;
  startTime: string;
  endTime: string;
  title?: string;
  description?: string;
  participantIds?: string[];
}

export interface CreateBookingResponse {
  booking: BookingDTO;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Calendar event
export interface CalendarEvent {
  id: string;
  roomId: string;
  roomName: string;
  organizerName: string;
  title: string;
  start: string;
  end: string;
  status: BookingStatus;
  participantCount: number;
  isOrganizer: boolean;
  isParticipant: boolean;
}

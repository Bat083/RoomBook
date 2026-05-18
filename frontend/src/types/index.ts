// Frontend types - import shared types from backend
// In a real application, these would be shared via a common package

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

export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export interface CalendarEvent {
  id: string;
  roomId: string;
  roomName: string;
  organizerName: string;
  title: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  participantCount: number;
  isOrganizer: boolean;
  isParticipant: boolean;
}

// Additional types for frontend use
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  type: UserType;
  rankingScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  location: string;
  available?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  organizerId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string | null;
  room: Room;
  organizer: User;
  participants?: User[];
  participantCount?: number;
}

export interface CreateBookingRequest {
  roomId: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  participantIds: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

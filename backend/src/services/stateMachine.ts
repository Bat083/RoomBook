import { BookingStatus } from '@prisma/client';
import { createError } from '../middleware/errorHandler';

/**
 * State Machine for Booking Status Transitions
 *
 * Valid state transitions:
 * - CONFIRMED → IN_PROGRESS (via check-in)
 * - CONFIRMED → NO_SHOW (via no-show detection)
 * - CONFIRMED → CANCELLED (via user cancellation)
 * - IN_PROGRESS → COMPLETED (via automatic completion after end time)
 */

type StateTransition = {
  from: BookingStatus;
  to: BookingStatus;
  action: string;
  validationRules?: string[];
};

const VALID_TRANSITIONS: StateTransition[] = [
  {
    from: BookingStatus.CONFIRMED,
    to: BookingStatus.IN_PROGRESS,
    action: 'check-in',
    validationRules: [
      'Must be within 10-minute grace period after start time',
      'Only organizer can check in',
    ],
  },
  {
    from: BookingStatus.CONFIRMED,
    to: BookingStatus.NO_SHOW,
    action: 'no-show-detection',
    validationRules: ['More than 10 minutes past start time without check-in'],
  },
  {
    from: BookingStatus.CONFIRMED,
    to: BookingStatus.CANCELLED,
    action: 'cancellation',
    validationRules: ['Only organizer can cancel', 'Must be before start time or within grace period'],
  },
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.COMPLETED,
    action: 'auto-completion',
    validationRules: ['Current time must be past end time'],
  },
];

/**
 * Validates if a state transition is allowed
 * @param currentStatus Current booking status
 * @param newStatus Desired booking status
 * @param action The action triggering the transition
 * @returns True if transition is valid
 * @throws Error if transition is invalid
 */
export function validateStateTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  action: string
): boolean {
  // If status is not changing, allow it (idempotent updates)
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if transition exists in valid transitions
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === newStatus && t.action === action
  );

  if (!transition) {
    throw createError(
      `Invalid state transition from ${currentStatus} to ${newStatus} via ${action}`,
      400,
      'INVALID_STATE_TRANSITION',
      {
        currentStatus,
        requestedStatus: newStatus,
        action,
        allowedTransitions: getValidTransitions(currentStatus),
      }
    );
  }

  return true;
}

/**
 * Get all valid transitions from a given status
 * @param currentStatus Current booking status
 * @returns Array of valid transitions
 */
export function getValidTransitions(currentStatus: BookingStatus): StateTransition[] {
  return VALID_TRANSITIONS.filter((t) => t.from === currentStatus);
}

/**
 * Check if a specific transition is valid
 * @param currentStatus Current booking status
 * @param newStatus Desired booking status
 * @returns True if transition is valid, false otherwise
 */
export function isValidTransition(currentStatus: BookingStatus, newStatus: BookingStatus): boolean {
  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }

  return VALID_TRANSITIONS.some((t) => t.from === currentStatus && t.to === newStatus);
}

/**
 * Get the action required for a transition
 * @param currentStatus Current booking status
 * @param newStatus Desired booking status
 * @returns Action name or null if no valid transition exists
 */
export function getTransitionAction(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): string | null {
  const transition = VALID_TRANSITIONS.find((t) => t.from === currentStatus && t.to === newStatus);
  return transition?.action || null;
}

/**
 * Get validation rules for a transition
 * @param currentStatus Current booking status
 * @param newStatus Desired booking status
 * @returns Array of validation rule descriptions
 */
export function getTransitionRules(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): string[] {
  const transition = VALID_TRANSITIONS.find((t) => t.from === currentStatus && t.to === newStatus);
  return transition?.validationRules || [];
}

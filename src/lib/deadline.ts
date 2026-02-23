import { addHours, isAfter, isPast } from 'date-fns';

/**
 * Build a Date object in the browser's LOCAL timezone from a "YYYY-MM-DD" date
 * and an "HH:MM" time string.  Using the (year, month, day, …) constructor
 * guarantees local interpretation – no UTC surprises.
 */
export function toLocalDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0);
}

/**
 * Check if an appointment is at least `hours` in the future.
 * Returns true if the appointment can still be confirmed/accepted.
 */
export function isWithinDeadline(date: string, timeSlot: string, hours: number = 12): boolean {
  const appointmentDateTime = toLocalDateTime(date, timeSlot);
  const deadline = addHours(new Date(), hours);
  return isAfter(appointmentDateTime, deadline);
}

/** True when the class start time is already in the past (local). */
export function isSlotExpired(date: string, timeSlot: string): boolean {
  return isPast(toLocalDateTime(date, timeSlot));
}

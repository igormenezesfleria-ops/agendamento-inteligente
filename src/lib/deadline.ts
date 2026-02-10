import { parseISO, addHours, isAfter } from 'date-fns';

/**
 * Check if an appointment is at least `hours` in the future.
 * Returns true if the appointment can still be confirmed/accepted.
 */
export function isWithinDeadline(date: string, timeSlot: string, hours: number = 12): boolean {
  const appointmentDateTime = parseISO(date + 'T' + timeSlot + ':00');
  const deadline = addHours(new Date(), hours);
  return isAfter(appointmentDateTime, deadline);
}

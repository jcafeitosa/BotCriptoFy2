/**
 * Business Hours Utility
 * Calculate time considering business hours only (9am-6pm, Mon-Fri)
 */

/**
 * Business hours configuration
 */
export const BUSINESS_HOURS = {
  startHour: 9, // 9 AM
  endHour: 18, // 6 PM
  workDays: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday, 6 = Saturday)
};

/**
 * Check if a given date/time is within business hours
 *
 * @param date - Date to check
 * @returns True if within business hours
 */
export function isBusinessHour(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  // Check if it's a work day
  if (!BUSINESS_HOURS.workDays.includes(day)) {
    return false;
  }

  // Check if it's within work hours
  return hour >= BUSINESS_HOURS.startHour && hour < BUSINESS_HOURS.endHour;
}

/**
 * Get the next business hour from a given date
 *
 * @param date - Starting date
 * @returns Next business hour
 */
export function nextBusinessHour(date: Date): Date {
  const result = new Date(date);

  // Move to next hour
  result.setHours(result.getHours() + 1);
  result.setMinutes(0);
  result.setSeconds(0);
  result.setMilliseconds(0);

  // If we're past business hours today, move to next day
  if (result.getHours() >= BUSINESS_HOURS.endHour) {
    result.setDate(result.getDate() + 1);
    result.setHours(BUSINESS_HOURS.startHour);
  }

  // Skip weekends
  while (!BUSINESS_HOURS.workDays.includes(result.getDay())) {
    result.setDate(result.getDate() + 1);
    result.setHours(BUSINESS_HOURS.startHour);
  }

  // If we're before business hours, move to start of business day
  if (result.getHours() < BUSINESS_HOURS.startHour) {
    result.setHours(BUSINESS_HOURS.startHour);
  }

  return result;
}

/**
 * Add minutes to a date considering business hours only
 *
 * @param startDate - Starting date
 * @param minutes - Minutes to add
 * @returns Resulting date
 */
export function addBusinessMinutes(startDate: Date, minutes: number): Date {
  let remaining = minutes;
  let current = new Date(startDate);

  while (remaining > 0) {
    if (isBusinessHour(current)) {
      current = new Date(current.getTime() + 60000); // Add 1 minute
      remaining--;
    } else {
      current = nextBusinessHour(current);
    }
  }

  return current;
}

/**
 * Calculate business minutes between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Business minutes between dates
 */
export function calculateBusinessMinutes(startDate: Date, endDate: Date): number {
  let minutes = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    if (isBusinessHour(current)) {
      minutes++;
    }

    current = new Date(current.getTime() + 60000); // Add 1 minute
  }

  return minutes;
}

/**
 * Calculate business hours between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Business hours between dates
 */
export function calculateBusinessHours(startDate: Date, endDate: Date): number {
  return calculateBusinessMinutes(startDate, endDate) / 60;
}

/**
 * Get start of next business day
 *
 * @param date - Reference date
 * @returns Start of next business day
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  result.setHours(BUSINESS_HOURS.startHour);
  result.setMinutes(0);
  result.setSeconds(0);
  result.setMilliseconds(0);

  // Skip weekends
  while (!BUSINESS_HOURS.workDays.includes(result.getDay())) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Check if two dates are on the same business day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same business day
 */
export function isSameBusinessDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate() &&
    BUSINESS_HOURS.workDays.includes(date1.getDay())
  );
}

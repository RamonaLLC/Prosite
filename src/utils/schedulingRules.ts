/**
 * Scheduling Rules & Constraints for ProSite:
 * 1. 2-Hour Rescheduling Cutoff: Jobs cannot be rescheduled within 2 hours of scheduled start time.
 * 2. 30-Minute Travel/Prep Buffer between jobs.
 * 3. Standard 12-Hour Time Format (8:00 AM – 5:00 PM), never 24-hour/military.
 */

/**
 * Converts any time string (e.g. "14:30", "09:00", "2:00 PM") into standard 12-hour format: "02:30 PM".
 */
export function formatTo12Hour(timeStr: string | undefined | null): string {
  if (!timeStr) return '08:00 AM';
  const trimmed = timeStr.trim();
  
  // Already in 12-hour format with AM/PM
  if (/(AM|PM)/i.test(trimmed)) {
    return trimmed;
  }

  // Parse 24-hour time HH:MM
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0').slice(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  return trimmed;
}

/**
 * Checks if a job or inspection is within 2 hours of its scheduled start.
 * If true, ProSite policy strictly blocks rescheduling via UI.
 */
export function isWithin2HoursOfStart(scheduledDateStr?: string, scheduledTimeStr?: string): boolean {
  if (!scheduledDateStr) return false;

  try {
    const time12 = formatTo12Hour(scheduledTimeStr || '08:00 AM');
    let [timePart, ampm] = time12.split(' ');
    if (!ampm) ampm = 'AM';
    const [hStr, mStr] = timePart.split(':');
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr || '0', 10);

    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const dateOnly = scheduledDateStr.split('T')[0];
    const [y, m, d] = dateOnly.split('-').map(Number);
    if (!y || !m || !d) return false;

    const scheduledDate = new Date(y, m - 1, d, hours, minutes, 0);
    
    // In ProSite simulated environment, today is evaluated against either simulated or real time
    const now = new Date();
    const diffMs = scheduledDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If start is within 2 hours in the future, or started within the past 12 hours
    return diffHours >= -12 && diffHours <= 2;
  } catch (e) {
    return false;
  }
}

/**
 * Standard ProSite Reschedule Block Message
 */
export function getRescheduleBlockedMessage(companyOrCustomerName?: string): string {
  const party = companyOrCustomerName ? companyOrCustomerName : 'the company or customer';
  return `Jobs cannot be rescheduled within 2 hours of the scheduled start time. Please contact ${party} directly.`;
}

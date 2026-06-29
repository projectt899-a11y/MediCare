/**
 * Availability Validation Utilities
 * Validates doctor availability slots
 */

export interface AvailabilitySlot {
  id?: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status?: 'new' | 'modified' | 'unchanged' | 'deleted';
  errors?: Record<string, string>;
}

/**
 * Validate a single availability slot
 * @param slot - The availability slot to validate
 * @returns Object with error messages (empty if valid)
 */
export const validateAvailabilitySlot = (
  slot: AvailabilitySlot
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate day of week
  if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
    errors.dayOfWeek = 'Please select a valid day of the week';
  }

  // Validate start time format
  if (!isValidTimeFormat(slot.startTime)) {
    errors.startTime = 'Invalid time format. Use HH:MM';
  }

  // Validate end time format
  if (!isValidTimeFormat(slot.endTime)) {
    errors.endTime = 'Invalid time format. Use HH:MM';
  }

  // Validate time range (only if both times are valid)
  if (isValidTimeFormat(slot.startTime) && isValidTimeFormat(slot.endTime)) {
    if (!isTimeRangeValid(slot.startTime, slot.endTime)) {
      errors.endTime = 'End time must be after start time';
    }
  }

  return errors;
};

/**
 * Validate time format (HH:MM)
 * @param time - Time string in HH:MM format
 * @returns True if valid, false otherwise
 */
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validate time range (end time > start time)
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns True if valid, false otherwise
 */
export const isTimeRangeValid = (startTime: string, endTime: string): boolean => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  return endTotalMin > startTotalMin;
};

/**
 * Validate day of week
 * @param dayOfWeek - Day of week (0-6)
 * @returns True if valid, false otherwise
 */
export const isValidDayOfWeek = (dayOfWeek: number): boolean => {
  return dayOfWeek >= 0 && dayOfWeek <= 6;
};

/**
 * Check for duplicate slots
 * @param slots - Array of availability slots
 * @returns Array of duplicate slot indices
 */
export const findDuplicateSlots = (slots: AvailabilitySlot[]): number[] => {
  const seen = new Set<string>();
  const duplicates: number[] = [];

  slots.forEach((slot, index) => {
    if (slot.status === 'deleted') return;

    const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`;
    if (seen.has(key)) {
      duplicates.push(index);
    } else {
      seen.add(key);
    }
  });

  return duplicates;
};

/**
 * Validate all slots in a collection
 * @param slots - Array of availability slots
 * @returns Object with validation results
 */
export const validateAllSlots = (
  slots: AvailabilitySlot[]
): {
  isValid: boolean;
  errors: Record<number, Record<string, string>>;
  duplicates: number[];
} => {
  const errors: Record<number, Record<string, string>> = {};
  let isValid = true;

  slots.forEach((slot, index) => {
    if (slot.status === 'deleted') return;

    const slotErrors = validateAvailabilitySlot(slot);
    if (Object.keys(slotErrors).length > 0) {
      errors[index] = slotErrors;
      isValid = false;
    }
  });

  const duplicates = findDuplicateSlots(slots);
  if (duplicates.length > 0) {
    isValid = false;
    duplicates.forEach(index => {
      if (!errors[index]) {
        errors[index] = {};
      }
      errors[index].duplicate = 'This time slot already exists for this day';
    });
  }

  return { isValid, errors, duplicates };
};

/**
 * Check if slot limit is exceeded
 * @param slots - Array of availability slots
 * @param maxSlots - Maximum allowed slots (default 14)
 * @returns True if limit exceeded, false otherwise
 */
export const isSlotLimitExceeded = (
  slots: AvailabilitySlot[],
  maxSlots: number = 14
): boolean => {
  const activeSlots = slots.filter(s => s.status !== 'deleted');
  return activeSlots.length > maxSlots;
};

/**
 * Format time for display
 * @param time - Time in HH:MM format
 * @returns Formatted time (e.g., "9:00 AM")
 */
export const formatTimeForDisplay = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get day name from day of week number
 * @param dayOfWeek - Day of week (0-6)
 * @returns Day name
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dayOfWeek] || 'Unknown';
};

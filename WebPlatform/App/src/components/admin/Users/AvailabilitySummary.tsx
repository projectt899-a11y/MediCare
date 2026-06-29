import React from 'react';
import type { AvailabilitySlot } from './availabilityTypes';
import { formatTimeForDisplay, getDayName } from '../../../lib/availabilityValidation';

interface AvailabilitySummaryProps {
  slots: AvailabilitySlot[];
}

const AvailabilitySummary: React.FC<AvailabilitySummaryProps> = ({ slots }) => {
  // Group slots by day of week
  const scheduleByDay: Record<number, AvailabilitySlot[]> = {};
  
  slots.forEach(slot => {
    if (!scheduleByDay[slot.dayOfWeek]) {
      scheduleByDay[slot.dayOfWeek] = [];
    }
    scheduleByDay[slot.dayOfWeek].push(slot);
  });

  // Sort slots by time within each day
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[parseInt(day)].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  });

  return (
    <div className="availability-summary" role="region" aria-label="Weekly schedule preview">
      <h4>Weekly Schedule Preview</h4>
      <div className="schedule-grid">
        {Array.from({ length: 7 }, (_, i) => i).map(dayOfWeek => {
          const daySlots = scheduleByDay[dayOfWeek] || [];
          const dayName = getDayName(dayOfWeek);

          return (
            <div key={dayOfWeek} className="day-schedule">
              <div className="day-name">{dayName}</div>
              <div className="day-times">
                {daySlots.length === 0 ? (
                  <span className="not-available">Not available</span>
                ) : (
                  daySlots.map((slot, index) => (
                    <div key={index} className="time-range">
                      {formatTimeForDisplay(slot.startTime)} -{' '}
                      {formatTimeForDisplay(slot.endTime)}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilitySummary;

import React, { useState } from 'react';
import type { AvailabilitySlot as AvailabilitySlotType } from './availabilityTypes';
import { validateAvailabilitySlot } from '../../../lib/availabilityValidation';

interface AvailabilitySlotProps {
  slot: AvailabilitySlotType;
  onChange: (slot: AvailabilitySlotType) => void;
  onDelete: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const AvailabilitySlot: React.FC<AvailabilitySlotProps> = ({
  slot,
  onChange,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = {
      ...slot,
      dayOfWeek: parseInt(e.target.value),
    };
    const errors = validateAvailabilitySlot(updated);
    updated.errors = errors;
    onChange(updated);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = {
      ...slot,
      startTime: e.target.value,
    };
    const errors = validateAvailabilitySlot(updated);
    updated.errors = errors;
    onChange(updated);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = {
      ...slot,
      endTime: e.target.value,
    };
    const errors = validateAvailabilitySlot(updated);
    updated.errors = errors;
    onChange(updated);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDeleteConfirm) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelDelete();
      }
    }
  };

  return (
    <div className={`availability-slot ${slot.status}`}>
      <div className="slot-content">
        <div className="form-group">
          <label htmlFor={`day-${slot.id}`}>Day of Week</label>
          <select
            id={`day-${slot.id}`}
            value={slot.dayOfWeek}
            onChange={handleDayChange}
            aria-describedby={slot.errors?.dayOfWeek ? `error-day-${slot.id}` : undefined}
          >
            {DAYS_OF_WEEK.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </select>
          {slot.errors?.dayOfWeek && (
            <span id={`error-day-${slot.id}`} className="error-text" role="alert">
              {slot.errors.dayOfWeek}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={`start-${slot.id}`}>Start Time</label>
          <input
            id={`start-${slot.id}`}
            type="time"
            value={slot.startTime}
            onChange={handleStartTimeChange}
            aria-describedby={slot.errors?.startTime ? `error-start-${slot.id}` : undefined}
          />
          {slot.errors?.startTime && (
            <span id={`error-start-${slot.id}`} className="error-text" role="alert">
              {slot.errors.startTime}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={`end-${slot.id}`}>End Time</label>
          <input
            id={`end-${slot.id}`}
            type="time"
            value={slot.endTime}
            onChange={handleEndTimeChange}
            aria-describedby={slot.errors?.endTime ? `error-end-${slot.id}` : undefined}
          />
          {slot.errors?.endTime && (
            <span id={`error-end-${slot.id}`} className="error-text" role="alert">
              {slot.errors.endTime}
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn-delete"
          onClick={handleDeleteClick}
          aria-label={`Delete ${DAYS_OF_WEEK[slot.dayOfWeek]} availability`}
          title="Delete this availability slot"
        >
          🗑️
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirmation" role="alertdialog" aria-labelledby={`confirm-title-${slot.id}`} onKeyDown={handleKeyDown}>
          <p id={`confirm-title-${slot.id}`}>Are you sure you want to delete this availability slot?</p>
          <div className="confirmation-actions">
            <button
              type="button"
              className="btn-confirm"
              onClick={handleConfirmDelete}
              aria-label="Confirm delete"
            >
              Delete
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancelDelete}
              aria-label="Cancel delete"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilitySlot;

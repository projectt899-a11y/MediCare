import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import AvailabilitySlotComponent from './AvailabilitySlot.tsx';
import AvailabilitySummary from './AvailabilitySummary.tsx';
import type { AvailabilitySlot } from './availabilityTypes';
import '../../../styles/adminAvailability.css';

export type { AvailabilitySlot };

interface AvailabilityManagementProps {
  doctorId: string;
  onAvailabilityChange?: (hasChanges: boolean) => void;
}

export interface AvailabilityManagementHandle {
  getAvailabilityData: () => { create: AvailabilitySlot[]; update: AvailabilitySlot[]; delete: string[] };
  resetAvailability: () => void;
}

const AvailabilityManagement = forwardRef<AvailabilityManagementHandle, AvailabilityManagementProps>(
  ({ doctorId, onAvailabilityChange }, ref) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [originalSlots, setOriginalSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Don't render if no doctorId
  if (!doctorId) {
    return null;
  }

  // Load availability on mount
  useEffect(() => {
    loadAvailability();
  }, [doctorId]);

  // Track changes
  useEffect(() => {
    const changes = slots.some(slot => slot.status !== 'unchanged');
    setHasChanges(changes);
    onAvailabilityChange?.(changes);
  }, [slots, onAvailabilityChange]);

  const loadAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminApi = (await import('../../../services/adminApi')).default;
      try {
        const data = await adminApi.getDoctorAvailability(doctorId);
        const slotsWithStatus = (data || []).map((slot: any) => ({
          ...slot,
          status: 'unchanged' as const,
        }));
        setSlots(slotsWithStatus);
        setOriginalSlots(slotsWithStatus);
      } catch (apiErr: any) {
        // If 404 or endpoint not found, start with empty slots (admin will add them)
        // This is expected behavior when no availability data exists yet
        setSlots([]);
        setOriginalSlots([]);
      }
    } catch (err: any) {
      // Silently fail - start with empty slots
      setSlots([]);
      setOriginalSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMore = () => {
    const newSlot: AvailabilitySlot = {
      id: `temp-${Date.now()}`,
      doctorId,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
      status: 'new',
      errors: {},
    };
    setSlots([...slots, newSlot]);
  };

  const handleSlotChange = (index: number, updatedSlot: AvailabilitySlot) => {
    const newSlots = [...slots];
    const originalSlot = originalSlots.find(s => s.id === updatedSlot.id);
    
    // Determine status
    if (updatedSlot.status === 'new') {
      updatedSlot.status = 'new';
    } else if (JSON.stringify(updatedSlot) !== JSON.stringify(originalSlot)) {
      updatedSlot.status = 'modified';
    } else {
      updatedSlot.status = 'unchanged';
    }
    
    newSlots[index] = updatedSlot;
    setSlots(newSlots);
  };

  const handleSlotDelete = (index: number) => {
    const slot = slots[index];
    if (slot.status === 'new') {
      // Remove new slots immediately
      setSlots(slots.filter((_, i) => i !== index));
    } else {
      // Mark existing slots as deleted
      const newSlots = [...slots];
      newSlots[index].status = 'deleted';
      setSlots(newSlots);
    }
  };

  const handleRevert = () => {
    if (window.confirm('Are you sure you want to revert all changes?')) {
      const revertedSlots = originalSlots.map(slot => ({
        ...slot,
        status: 'unchanged' as const,
      }));
      setSlots(revertedSlots);
    }
  };

  const getAvailabilityData = () => {
    const create = slots.filter(s => s.status === 'new');
    const update = slots.filter(s => s.status === 'modified');
    const deleted = slots.filter(s => s.status === 'deleted').map(s => s.id!);
    
    return { create, update, delete: deleted };
  };

  const resetAvailability = () => {
    const revertedSlots = originalSlots.map(slot => ({
      ...slot,
      status: 'unchanged' as const,
    }));
    setSlots(revertedSlots);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getAvailabilityData,
    resetAvailability,
  }));

  const visibleSlots = slots.filter(s => s.status !== 'deleted');

  return (
    <div className="availability-management">
      <h3>Doctor Availability</h3>
      
      {error && (
        <div className="error-message" role="alert" aria-live="polite">
          {error}
          <button onClick={loadAvailability} className="retry-btn">Retry</button>
        </div>
      )}

      {loading && <div className="loading-message" aria-live="polite">Loading availability...</div>}

      {!loading && (
        <>
          <AvailabilitySummary slots={visibleSlots} />

          <div className="availability-slots">
            {visibleSlots.length === 0 ? (
              <p className="empty-state">No availability slots added yet.</p>
            ) : (
              visibleSlots.map((slot, index) => (
                <AvailabilitySlotComponent
                  key={slot.id}
                  slot={slot}
                  onChange={(updated) => handleSlotChange(index, updated)}
                  onDelete={() => handleSlotDelete(index)}
                />
              ))
            )}
          </div>

          <div className="availability-actions">
            <button
              type="button"
              className="btn-add-more"
              onClick={handleAddMore}
              aria-label="Add more availability slots"
            >
              + Add More
            </button>
            {hasChanges && (
              <button
                type="button"
                className="btn-revert"
                onClick={handleRevert}
                aria-label="Revert all changes to availability"
              >
                ↶ Revert Changes
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});

AvailabilityManagement.displayName = 'AvailabilityManagement';

export default AvailabilityManagement;

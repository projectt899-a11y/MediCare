export interface AvailabilitySlot {
  id?: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: 'new' | 'modified' | 'unchanged' | 'deleted';
  errors?: Record<string, string>;
}

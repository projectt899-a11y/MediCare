import React, { useState } from 'react';

interface AppointmentRecord {
  id: string;
  userId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: Date;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  totalCount?: number;
  isPatientName?: boolean;
}

interface AppointmentHistoryTableProps {
  appointments: AppointmentRecord[];
  userType?: 'doctor' | 'patient';
}

const AppointmentHistoryTable: React.FC<AppointmentHistoryTableProps> = ({ appointments, userType = 'patient' }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');

  const filteredAppointments = statusFilter === 'all'
    ? appointments
    : appointments.filter(apt => apt.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const statusClass = status.toLowerCase();
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'Invalid Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeStr: any) => {
    if (!timeStr) return '—';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const totalCount = appointments.length > 0 ? appointments[0].totalCount || appointments.length : 0;

  return (
    <div className="appointment-history-table-container">
      <div className="appointment-header">
        <div className="appointment-count">
          <strong>Total Appointments:</strong> {totalCount}
        </div>
        <div className="appointment-filter">
          <label>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="status-filter-select"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="activity-log-empty">
          {statusFilter === 'all' ? 'No appointments found' : `No ${statusFilter} appointments found`}
        </div>
      ) : (
        <table className="appointment-history-table">
          <thead>
            <tr>
              <th>{userType === 'doctor' ? 'Patient' : 'Doctor'}</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((appointment) => (
              <tr key={appointment.id}>
                <td>{appointment.doctorName || 'Unknown Doctor'}</td>
                <td>{formatDate(appointment.appointmentDate)}</td>
                <td>{formatTime(appointment.appointmentTime)}</td>
                <td>{getStatusBadge(appointment.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AppointmentHistoryTable;

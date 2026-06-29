import React, { useState, useEffect } from 'react';
import Icon from '../sub-components/Icon';
import api from '../../../lib/api';
import '../../../styles/patientDashboard.css';

interface Appointment {
  id: string;
  doctor: string;
  specialization: string;
  date: string;
  time: string;
  status: string;
  doctor_id?: string;
  appointment_time?: string;
}

const AppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<{ upcoming: Appointment[]; confirmed: Appointment[]; completed: Appointment[]; cancelled: Appointment[] }>({
    upcoming: [],
    confirmed: [],
    completed: [],
    cancelled: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ show: boolean; appointmentId: string | null; newDate: string; newTime: string }>({
    show: false,
    appointmentId: null,
    newDate: '',
    newTime: ''
  });

  useEffect(() => {
    fetchAppointments();
    
    // Check if we should auto-select confirmed tab (from notification click)
    const scrollToTab = sessionStorage.getItem('scrollToTab');
    if (scrollToTab) {
      setActiveTab(scrollToTab);
      sessionStorage.removeItem('scrollToTab');
    }
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/patient/appointments');
      
      // Organize appointments by status (case-insensitive)
      const organized = {
        upcoming: res.data.filter((apt: any) => apt.status?.toLowerCase() === 'pending'),
        confirmed: res.data.filter((apt: any) => apt.status?.toLowerCase() === 'confirmed'),
        completed: res.data.filter((apt: any) => apt.status?.toLowerCase() === 'completed'),
        cancelled: res.data.filter((apt: any) => apt.status?.toLowerCase() === 'cancelled')
      };   
      
      setAppointments(organized);
    } catch (err: any) {
      console.error('Failed to fetch appointments:', err);
      setError(err.response?.data?.error || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleClick = (appointmentId: string) => {
    setRescheduleModal({
      show: true,
      appointmentId,
      newDate: '',
      newTime: ''
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleModal.appointmentId || !rescheduleModal.newDate || !rescheduleModal.newTime) {
      alert('Please select both date and time');
      return;
    }

    try {
      const newDateTime = `${rescheduleModal.newDate}T${rescheduleModal.newTime}`;
      await api.put(`/patient/appointments/${rescheduleModal.appointmentId}`, {
        appointment_time: newDateTime
      });
      
      alert('Appointment rescheduled successfully');
      setRescheduleModal({ show: false, appointmentId: null, newDate: '', newTime: '' });
      fetchAppointments();
    } catch (err: any) {
      console.error('Failed to reschedule:', err);
      alert(err.response?.data?.error || 'Failed to reschedule appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      await api.delete(`/patient/appointments/${appointmentId}`);
      alert('Appointment cancelled successfully');
      fetchAppointments();
    } catch (err: any) {
      console.error('Failed to cancel:', err);
      alert(err.response?.data?.error || 'Failed to cancel appointment');
    }
  };

  const renderTable = (data: Appointment[]) => {
    const safeData = data ?? [];
    return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Doctor</th>
          <th>Specialization</th>
          <th>Date & Time</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {safeData.length === 0 ? (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
              No appointments found
            </td>
          </tr>
        ) : (
          safeData.map(apt => (
            <tr key={apt.id}>
              <td>{apt.doctor}</td>
              <td>{apt.specialization}</td>
              <td>{apt.date} at {apt.time}</td>
              <td>
                <span 
                  className={`badge badge-${apt.status?.toLowerCase() === 'confirmed' ? 'success' : apt.status?.toLowerCase() === 'pending' ? 'warning' : apt.status?.toLowerCase() === 'completed' ? 'info' : 'danger'}`} 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {apt.status?.toLowerCase() === 'confirmed' && <Icon name="check-circle" />}
                  {apt.status?.toLowerCase() === 'pending' && <Icon name="clock" />}
                  {apt.status?.toLowerCase() === 'completed' && <Icon name="check-circle" />}
                  {apt.status?.toLowerCase() === 'cancelled' && <Icon name="x-circle" />}
                  {apt.status}
                </span>
              </td>
              <td>
                {(apt.status?.toLowerCase() === 'confirmed' || apt.status?.toLowerCase() === 'pending') && (
                  <>
                    <button 
                      onClick={() => handleRescheduleClick(apt.id)}
                      className="btn btn-outline" 
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginRight: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#1976d2' }}
                      title="Reschedule appointment"
                    >
                      <Icon name="edit" />
                    </button>
                    <button 
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="btn btn-outline" 
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#d32f2f', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      title="Cancel appointment"
                    >
                      <Icon name="trash" />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading appointments...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>My Appointments</h1>
        <p>Manage your upcoming and past appointments.</p>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="tabs">
          {['upcoming', 'confirmed', 'completed', 'cancelled'].map(tab => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>
        {renderTable(appointments[activeTab as keyof typeof appointments] ?? [])}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2>Reschedule Appointment</h2>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="newDate">New Date</label>
              <input
                type="date"
                id="newDate"
                value={rescheduleModal.newDate}
                onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="newTime">New Time</label>
              <select
                id="newTime"
                value={rescheduleModal.newTime}
                onChange={(e) => setRescheduleModal({ ...rescheduleModal, newTime: e.target.value })}
              >
                <option value="">Select time</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setRescheduleModal({ show: false, appointmentId: null, newDate: '', newTime: '' })}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleSubmit}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentsPage;
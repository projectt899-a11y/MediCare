import React, { useState, useEffect, useCallback } from 'react';
import DoctorCard from '../sub-components/DoctorCard';
import api from '../../../lib/api'; 
import '../../../styles/patientDashboard.css';


const FindDoctor: React.FC = () => {
  const [filters, setFilters] = useState({ name: '', specialization: '', rating: '' });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState({
    show: false,
    doctorId: '',
    doctorName: '',
    selectedDay: '',
    selectedTime: '',
    bookingSuccess: false,
    appointmentType: '',
    availabilitySlots: [] as any[]
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  // Debounced fetch function
  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.name.trim()) params.append('name', filters.name.trim());
      if (filters.specialization) params.append('specialization', filters.specialization);
      if (filters.rating) params.append('rating', filters.rating);

      const res = await api.get(`/doctor/search?${params.toString()}`);
      setDoctors(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch doctors:', err);
      setError(err.response?.data?.error || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce the name filter (wait 500ms after user stops typing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDoctors();
    }, filters.name ? 500 : 0); // Only debounce name search, instant for dropdowns

    return () => clearTimeout(timeoutId);
  }, [filters, fetchDoctors]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleClearFilters = () => {
    setFilters({ name: '', specialization: '', rating: '' });
  };

  const handleBookAppointment = async (doctorId: string, doctorName: string) => {
    try {
      // Fetch doctor's availability
      const res = await api.get(`/doctor/${doctorId}/availability`);
      console.log('Availability data received:', res.data);
      setBookingModal({
        show: true,
        doctorId,
        doctorName,
        selectedDay: '',
        selectedTime: '',
        bookingSuccess: false,
        appointmentType: '',
        availabilitySlots: res.data || []
      });
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      alert('Failed to load doctor availability');
    }
  };

  const handleBookingSubmit = async () => {
    if (!bookingModal.selectedDay || !bookingModal.selectedTime) {
      alert('Please select both day and time');
      return;
    }
    if (!bookingModal.appointmentType) {
      alert('Please select an appointment type');
      return;
    }

    try {
      setBookingLoading(true);
      
      // Find the selected slot to get the actual date
      const selectedSlot = bookingModal.availabilitySlots.find(
        slot => String(slot.day_of_week) === bookingModal.selectedDay
      );

      if (!selectedSlot) {
        alert('Invalid day selected');
        return;
      }

      // Calculate the actual date for this day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDayIndex = parseInt(bookingModal.selectedDay);
      const today = new Date();
      const currentDayIndex = today.getDay();
      
      let daysToAdd = targetDayIndex - currentDayIndex;
      
      // If same day, check if time is in the future
      if (daysToAdd === 0) {
        const [hours, minutes] = bookingModal.selectedTime.split(':').map(Number);
        const appointmentHour = new Date();
        appointmentHour.setHours(hours, minutes, 0, 0);
        
        // If time has passed, schedule for next week
        if (appointmentHour <= today) {
          daysToAdd = 7;
        }
      } else if (daysToAdd < 0) {
        // If day hasn't come yet this week, move to next occurrence
        daysToAdd += 7;
      }
      
      const appointmentDate = new Date(today);
      appointmentDate.setDate(appointmentDate.getDate() + daysToAdd);
      
      const appointmentDateTime = `${appointmentDate.toISOString().split('T')[0]}T${bookingModal.selectedTime}:00`;
      
      console.log('📅 Booking Details:', {
        today: today.toISOString(),
        selectedDay: bookingModal.selectedDay,
        targetDayIndex,
        currentDayIndex,
        daysToAdd,
        appointmentDate: appointmentDate.toISOString(),
        appointmentDateTime,
        selectedTime: bookingModal.selectedTime
      });
      
      await api.post('/patient/appointments', {
        doctor_id: bookingModal.doctorId,
        appointment_time: appointmentDateTime,
        appointment_type: bookingModal.appointmentType
      });

      setBookingModal({
        show: false,
        doctorId: '',
        doctorName: '',
        selectedDay: '',
        selectedTime: '',
        bookingSuccess: true,
        appointmentType: '',
        availabilitySlots: []
      });
    } catch (err: any) {
      console.error('Failed to book appointment:', err);
      alert(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const getAvailableTimes = () => {
    return [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <>
      <div className="page-header">
        <h1>Find a Doctor</h1>
        <p>Search for specialists by name, field, or availability.</p>
      </div>

      <div className="find-doctor-layout">
        <aside className="filter-panel">
          <h3>Filters</h3>
          <div className="form-group">
            <label htmlFor="name">Doctor Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={filters.name} 
              onChange={handleFilterChange}
              placeholder="Search by name..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="specialization">Specialization</label>
            <select id="specialization" name="specialization" value={filters.specialization} onChange={handleFilterChange}>
              <option value="">All Specializations</option>
              <option value="cardiology">Cardiology</option>
              <option value="dermatology">Dermatology</option>
              <option value="neurology">Neurology</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="psychiatry">Psychiatry</option>
              <option value="oncology">Oncology</option>
              <option value="radiology">Radiology</option>
              <option value="ent">ENT</option>
              <option value="ophthalmology">Ophthalmology</option>
              <option value="urology">Urology</option>
              <option value="gynecology">Gynecology</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rating">Minimum Rating</label>
            <select id="rating" name="rating" value={filters.rating} onChange={handleFilterChange}>
              <option value="">Any Rating</option>
              <option value="3.0">3.0+</option>
              <option value="3.5">3.5+</option>
              <option value="4.0">4.0+</option>
              <option value="4.5">4.5+</option>
              <option value="4.7">4.7+</option>
              <option value="4.9">4.9+</option>
            </select>
          </div>
          {(filters.name || filters.specialization || filters.rating) && (
            <button 
              onClick={handleClearFilters} 
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Clear Filters
            </button>
          )}
        </aside>

        <main className="doctor-results-grid">
          {loading ? (
            <div className="loading">Loading doctors...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : doctors.length === 0 ? (
            <div className="no-results">
              <p>No doctors found matching your filters</p>
              {(filters.name || filters.specialization || filters.rating) && (
                <button onClick={handleClearFilters} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ gridColumn: '1 / -1', marginBottom: '1rem', color: '#666' }}>
                Found {doctors.length} doctor{doctors.length !== 1 ? 's' : ''}
              </div>
              {doctors.map(doctor => (
                <DoctorCard 
                  key={doctor.id} 
                  doctor={doctor}
                  onBookAppointment={handleBookAppointment}
                />
              ))}
            </>
          )}
        </main>
      </div>

      {/* Booking Modal */}
      {bookingModal.show && (
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
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2>Book Appointment</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              with <strong>{bookingModal.doctorName}</strong>
            </p>

            {bookingModal.bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ color: '#2e7d32', marginBottom: '0.5rem' }}>Appointment Request Sent!</h3>
                <p style={{ color: '#555', marginBottom: '0.5rem' }}>
                  Your appointment request is currently <strong style={{ color: '#f59e0b' }}>Pending</strong>.
                </p>
                <p style={{ color: '#777', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  The doctor will review your request and confirm or update the status. You can track it in <strong>My Appointments</strong>.
                </p>
                <button
                  onClick={() => setBookingModal({ show: false, doctorId: '', doctorName: '', selectedDay: '', selectedTime: '', bookingSuccess: false, appointmentType: '', availabilitySlots: [] })}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  OK
                </button>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="appointmentType">Appointment Type</label>
                  <select
                    id="appointmentType"
                    value={bookingModal.appointmentType}
                    onChange={(e) => setBookingModal({ ...bookingModal, appointmentType: e.target.value })}
                  >
                    <option value="">Select type</option>
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Check-up">Check-up</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Procedure">Procedure</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="appointmentDay">Select Day</label>
                  <select
                    id="appointmentDay"
                    value={bookingModal.selectedDay}
                    onChange={(e) => setBookingModal({ ...bookingModal, selectedDay: e.target.value, selectedTime: '' })}
                  >
                    <option value="">Choose a day</option>
                    {bookingModal.availabilitySlots.map((slot, index) => {
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const dayName = dayNames[parseInt(slot.day_of_week)];
                      return (
                        <option key={index} value={slot.day_of_week}>
                          {dayName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="appointmentTime">Select Time</label>
                  <select
                    id="appointmentTime"
                    value={bookingModal.selectedTime}
                    onChange={(e) => setBookingModal({ ...bookingModal, selectedTime: e.target.value })}
                    disabled={!bookingModal.selectedDay}
                  >
                    <option value="">Choose a time slot</option>
                    {bookingModal.selectedDay && (() => {
                      const selectedSlot = bookingModal.availabilitySlots.find(
                        slot => String(slot.day_of_week) === bookingModal.selectedDay
                      );
                      
                      if (!selectedSlot) {
                        console.log('No slot found for day:', bookingModal.selectedDay);
                        console.log('Available slots:', bookingModal.availabilitySlots);
                        return null;
                      }

                      // Remove seconds from time format (HH:MM:SS -> HH:MM)
                      const startTimeStr = selectedSlot.start_time.substring(0, 5);
                      const endTimeStr = selectedSlot.end_time.substring(0, 5);
                      
                      const [startHour, startMin] = startTimeStr.split(':').map(Number);
                      const [endHour, endMin] = endTimeStr.split(':').map(Number);
                      const timeSlots = [];

                      let currentHour = startHour;
                      let currentMin = startMin;

                      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
                        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
                        const displayHour = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
                        const ampm = currentHour >= 12 ? 'PM' : 'AM';
                        timeSlots.push(
                          <option key={timeStr} value={timeStr}>
                            {displayHour}:{String(currentMin).padStart(2, '0')} {ampm}
                          </option>
                        );

                        currentMin += 30;
                        if (currentMin >= 60) {
                          currentMin = 0;
                          currentHour += 1;
                        }
                      }

                      console.log('Generated time slots:', timeSlots.length);
                      return timeSlots;
                    })()}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => setBookingModal({ show: false, doctorId: '', doctorName: '', selectedDay: '', selectedTime: '', bookingSuccess: false, appointmentType: '', availabilitySlots: [] })}
                    className="btn btn-outline"
                    style={{ flex: 1, backgroundColor: 'red', color: 'white' }}
                    disabled={bookingLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookingSubmit}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FindDoctor;
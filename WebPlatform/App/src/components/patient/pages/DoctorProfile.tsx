import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import '../../../styles/patientDashboard.css';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  yearsOfExperience: number;
  clinicName: string;
  profilePicture: string | null;
  rating: string;
  certificates: Array<{
    id: number;
    name: string;
    issue_date: string;
    file: string;
  }>;
}

const TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMinDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalDateStr(tomorrow);
};

const getMaxDate = () => {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  return toLocalDateStr(maxDate);
};

const DoctorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating] = useState(3);

  // Calendar state
  const [calendarOffset, setCalendarOffset] = useState(0); // weeks offset
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  // Booking modal state
  const [bookingModal, setBookingModal] = useState({
    show: false,
    selectedDay: '',
    selectedTime: '',
    appointmentType: '',
    availabilitySlots: [] as any[]
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!id) {
        setError('Doctor ID is missing');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/doctor/${id}`);
        setDoctor(response.data);
      } catch (err: any) {
        console.error('Failed to fetch doctor profile:', err);
        setError(err.response?.data?.error || 'Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctorProfile();
  }, [id]);

  // Fetch booked appointments for this doctor to mark booked days
  useEffect(() => {
    if (!id) return;
    const fetchBooked = async () => {
      try {
        const res = await api.get(`/patient/appointments`);
        const appointments: any[] = res.data || [];
        const dates = appointments
          .filter((a: any) => a.doctor_id === id || a.doctor?.id === id)
          .map((a: any) => a.appointment_time?.split('T')[0]);
        setBookedDates(dates.filter(Boolean));
      } catch {
        // silently ignore — booked markers are optional
      }
    };
    fetchBooked();
  }, [id]);

  const handleViewCertificate = (filePath: string) => {
    if (!filePath) { alert('No file available'); return; }
    window.open(filePath, '_blank');
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
      
      await api.post('/patient/appointments', {
        doctor_id: id,
        appointment_time: appointmentDateTime,
        appointment_type: bookingModal.appointmentType
      });
      alert('Appointment booked successfully!');
      setBookedDates(prev => [...prev, appointmentDateTime.split('T')[0]]);
      setBookingModal({ show: false, selectedDay: '', selectedTime: '', appointmentType: '', availabilitySlots: [] });
    } catch (err: any) {
      console.error('Failed to book appointment:', err);
      alert(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  // Calendar: build 7 days starting from today + offset*7
  const renderCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = new Date(today);
    startDay.setDate(today.getDate() + calendarOffset * 7);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      return d;
    });

    // Build YYYY-MM-DD without UTC conversion to avoid timezone shift
    const toDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    return (
      <div className="card doctor-profile-slots">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Available Slots</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {calendarOffset > 0 && (
              <button className="btn-nav-arrow" onClick={() => setCalendarOffset(o => o - 1)}>‹ Prev</button>
            )}
            <button className="btn-nav-arrow" onClick={() => setCalendarOffset(o => o + 1)}>Next ›</button>
          </div>
        </div>
        <div className="calendar-grid">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {days.map(date => {
            const dateStr = toDateStr(date);
            const isBooked = bookedDates.includes(dateStr);
            const isPast = date < today;
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => !isPast && !isBooked && setSelectedDate(dateStr)}
                disabled={isPast || isBooked}
                className={`calendar-date ${isSelected ? 'active' : ''} ${isBooked ? 'booked' : ''} ${isPast ? 'past' : ''}`}
                title={isBooked ? 'Already booked' : isPast ? 'Past date' : ''}
              >
                <div className="date-number">{date.getDate()}</div>
                {isBooked && <div style={{ fontSize: '0.55rem', color: '#e53e3e', lineHeight: 1 }}>Booked</div>}
              </button>
            );
          })}
          
        </div>
        {selectedDate && (
          <div className="time-slots-grid" style={{ marginTop: '1rem' }}>
            {TIMES.map(time => (
              <button
                key={time}
                className="time-slot"
                onClick={() => setBookingModal({ show: true, selectedDate, selectedTime: time, appointmentType: '' })}
              >
                {formatTime(time)}
              </button>
            ))}
          </div>
        )}
        {!selectedDate && (
          <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '1rem' }}>Select a date to see available time slots.</p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}><p>Loading doctor profile...</p></div>;
  }

  if (error || !doctor) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}><p>{error || 'Doctor not found'}</p></div>;
  }

  return (
    <div className="doctor-profile-page">
      {/* Hero Header Card */}
      <div className="doctor-profile-hero card">
        <div className="doctor-profile-hero-left">
          <img
            src={
              doctor.profilePicture
                ? doctor.profilePicture
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4F46E5&color=fff&size=120`
            }
            alt={doctor.name}
            className="doctor-profile-avatar"
          />
          <div className="doctor-profile-info">
            <h1 className="doctor-profile-name">{doctor.name}</h1>
            <p className="doctor-profile-meta">
              <span className="doctor-profile-specialization">{doctor.specialization}</span>
              {doctor.yearsOfExperience && (
                <span className="doctor-profile-exp"> · {doctor.yearsOfExperience} Years Experience</span>
              )}
            </p>
            {doctor.clinicName && (
              <p className="doctor-profile-clinic">
                {doctor.clinicName}
                <span className="doctor-profile-rating">
                  <span className="star">★</span> {rating} Stars
                </span>
              </p>
            )}
          </div>
        </div>
        <button
          className="btn btn-book-appointment"
          onClick={async () => {
            try {
              const res = await api.get(`/doctor/${id}/availability`);
              console.log('Availability data received:', res.data);
              setBookingModal({ show: true, selectedDay: '', selectedTime: '', appointmentType: '', availabilitySlots: res.data || [] });
            } catch (err) {
              console.error('Failed to fetch availability:', err);
              alert('Failed to load doctor availability');
            }
          }}
        >
          Book Appointment
        </button>
      </div>

      {/* Two-column section */}
      <div className="doctor-profile-two-col">
        <div className="doctor-profile-left-col">
          <div className="card doctor-profile-about">
            <h3>About Me</h3>
            <p>{doctor.bio || 'No biography available.'}</p>
          </div>
          {renderCalendar()}
        </div>

        <div className="doctor-profile-right-col">
          {doctor.certificates && doctor.certificates.length > 0 && (
            <div className="card doctor-profile-certs">
              <h3>Certificates</h3>
              <div className="cert-list">
                {doctor.certificates.map((cert) => (
                  <div key={cert.id} className="cert-item">
                    <div className="cert-item-info">
                      <span className="cert-name">{cert.name}</span>
                      {cert.issue_date && (
                        <span className="cert-year">{new Date(cert.issue_date).getFullYear()}</span>
                      )}
                    </div>
                    {cert.issue_date && (
                      <p className="cert-date">Issue Date: {new Date(cert.issue_date).toLocaleDateString()}</p>
                    )}
                    <button onClick={() => handleViewCertificate(cert.file)} className="btn btn-view-cert">
                      View Certificate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px',
            maxWidth: '450px', width: '90%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2>Book Appointment</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              with <strong>{doctor.name}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="appointmentType">Appointment Type</label>
              <select
                id="appointmentType"
                value={bookingModal.appointmentType}
                onChange={(e) => setBookingModal(m => ({ ...m, appointmentType: e.target.value }))}
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
                onChange={(e) => setBookingModal(m => ({ ...m, selectedDay: e.target.value, selectedTime: '' }))}
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
                onChange={(e) => setBookingModal(m => ({ ...m, selectedTime: e.target.value }))}
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
                onClick={() => setBookingModal({ show: false, selectedDay: '', selectedTime: '', appointmentType: '', availabilitySlots: [] })}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;

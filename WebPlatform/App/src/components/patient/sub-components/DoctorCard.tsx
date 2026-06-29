import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import '../../../styles/patientDashboard.css';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  availability: string;
  profilePicture?: string | null;
}

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment: (doctorId: string, doctorName: string) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBookAppointment }) => {
  // Use profile picture if available, otherwise use a default avatar with doctor's initials
  const avatarUrl = doctor.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=4F46E5&color=fff&size=150`;
  
  // Split availability days and assign colors
  const availabilityDays = doctor.availability === 'Not Available' 
    ? [] 
    : doctor.availability.split(', ');
  
  const dayColors = ['#d4edda', '#d1ecf1', '#fff3cd', '#f8d7da', '#e2e3e5', '#d4edda', '#d1ecf1'];
  const dayTextColors = ['#155724', '#0c5460', '#856404', '#721c24', '#383d41', '#155724', '#0c5460'];
  
  return (
    <div className="doctor-card">
      <div className="doctor-card-header">
        <img src={avatarUrl} alt={doctor.name} />
        <div>
          <h3>{doctor.name}</h3>
          <p>{doctor.specialization}</p>
        </div>
      </div>
      <div className="doctor-card-body">
        <p><strong>Experience:</strong> {doctor.experience}</p>
        <p>
        <strong>Rating:</strong> 
        <Icon name="star" className='icon-star-rating'/> 
        {doctor.rating}
        </p>
        <p>
          <strong>Availability:</strong>
        </p>
        <div className="availability-days">
          {availabilityDays.length > 0 ? (
            availabilityDays.map((day, index) => (
              <span 
                key={index}
                className="day-badge"
                style={{
                  backgroundColor: dayColors[index % dayColors.length],
                  color: dayTextColors[index % dayTextColors.length]
                }}
              >
                {day}
              </span>
            ))
          ) : (
            <span className="badge badge-warning">Not Available</span>
          )}
        </div>
      </div>
      <div className="doctor-card-footer">
        <Link to={`/patient/doctor/${doctor.id}`} className="btn btn-outline">View Profile</Link>
        <button 
          onClick={() => onBookAppointment(doctor.id, doctor.name)}
          className="btn btn-primary"
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
};

export default DoctorCard;
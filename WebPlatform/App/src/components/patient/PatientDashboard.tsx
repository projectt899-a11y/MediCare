import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardOverview from './pages/DashboardOverview';
import FindDoctor from './pages/FindDoctor';
import DoctorProfile from './pages/DoctorProfile';
import AppointmentsPage from './pages/AppointmentsPage';
import MedicalRecord from './pages/MedicalRecord';
import LabResultsPage from './pages/LabResultsPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import FollowUpQuestionsPage from './FollowUpQuestionsPage';
import '../../styles/patientDashboard.css';

const PatientDashboard: React.FC = () => {
  return (
    <div className="patient-dashboard-layout">
      <Sidebar />
      <main className="Patient_main-content">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="find-doctor" element={<FindDoctor />} />
          <Route path="doctor/:id" element={<DoctorProfile />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="medical-record" element={<MedicalRecord />} />
          <Route path="lab-results" element={<LabResultsPage />} />
          <Route path="follow-up-requests" element={<FollowUpQuestionsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default PatientDashboard;
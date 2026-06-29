import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import Registration from './components/Registration';
import LabRegistration from './components/LabRegistration';
import OtpVerification from './components/OtpVerification';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import DashboardOverview from './components/doctor/DashboardOverview';
import Patients from './components/doctor/Patients';
import PatientCaseDetail from './components/doctor/PatientCaseDetails';
import Appointments from './components/doctor/Appointments';
import DoctorLab from './components/doctor/Lab';
import Messages from './components/doctor/Messages';
import DoctorProfile from './components/doctor/DoctorProfile';
import PatientDashboard from './components/patient/PatientDashboard';
import LabModule from './components/lab/LabModule';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard/Dashboard';
import UserList from './components/admin/Users/UserList';
import UserEditForm from './components/admin/Users/UserEditForm';
import SpecializationList from './components/admin/Specializations/SpecializationList';
import TestTypeList from './components/admin/TestTypes/TestTypeList';
import AuditLogViewer from './components/admin/AuditLogs/AuditLogViewer';
import Settings from './components/admin/Settings/Settings';
import NurseManagementPage from './components/admin/Nurses/NurseManagementPage';
import NurseLayout from './components/nurse/NurseLayout';
import NurseDashboard from './components/nurse/NurseDashboard';
import NurseProfile from './components/nurse/NurseProfile';
import PatientListPage from './components/nurse/PatientListPage';
import FollowUpMonitoringPage from './components/nurse/FollowUpMonitoringPage';
import './app.css';

// Admin Route Protection Component
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// General Route Protection Component
const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role: string }) => {
  const userRole = localStorage.getItem('userRole');
  if (!userRole) return <Navigate to="/login" replace />;
  if (userRole !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'why-choose-us', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Layout scrollToSection={scrollToSection} activeSection={activeSection}>
            <HomePage scrollToSection={scrollToSection} />
          </Layout>
        } />
        <Route path="/landing" element={
          <Layout isLandingPage={true}>
            <LandingPage />
          </Layout>
        } />
        <Route path="/register" element={<Registration />} />
        <Route path="/register-lab" element={<LabRegistration />} />
        <Route path="/verify-otp" element={<OtpVerification/>}/>
        <Route path="/verify-email" element={<OtpVerification/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
         
        {/* Doctor Module*/}
        <Route path='/doctor' element={
          <ProtectedRoute role="doctor">
            <DoctorDashboard/>
          </ProtectedRoute>
        }>
          <Route index element={<DashboardOverview/>}/>
          <Route path='dashboard' element={<DashboardOverview/>}/>
          <Route path='patients' element={<Patients/>}/>
          <Route path='patients/:patientId' element={<PatientCaseDetail/>}/>
          <Route path='appointments' element={<Appointments/>}/>
          <Route path='lab' element={<DoctorLab/>}/>
          <Route path='messages' element={<Messages/>}/>
          <Route path='profile' element={<DoctorProfile/>}/>
        </Route>

        <Route path='/patient/*' element={
          <ProtectedRoute role="patient">
            <PatientDashboard/>
          </ProtectedRoute>
        }/>

        {/* Nurse Module */}
        <Route path='/nurse' element={
          <ProtectedRoute role="nurse">
            <NurseLayout />
          </ProtectedRoute>
        }>
          <Route index element={<NurseDashboard />} />
          <Route path='dashboard' element={<NurseDashboard />} />
          <Route path='patients' element={<PatientListPage />} />
          <Route path='follow-ups' element={<FollowUpMonitoringPage />} />
          <Route path='profile' element={<NurseProfile />} />
        </Route>

        {/* Lab Module */}
        <Route path='/lab/*' element={<LabModule/>}/>

        {/* Admin Module */}
        <Route path='/admin' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/dashboard' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/users' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <UserList />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/users/:userId' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <UserEditForm />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/users/:userId/:role' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <UserEditForm />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/specializations' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <SpecializationList />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/test-types' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <TestTypeList />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/audit-logs' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <AuditLogViewer />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/settings' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <Settings />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
        <Route path='/admin/nurses' element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <NurseManagementPage />
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
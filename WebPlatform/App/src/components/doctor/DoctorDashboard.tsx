import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {useAuthStore} from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationDropdown from './NotificationDropdown';
import api from "../../lib/api";
import "../../styles/doctorDashboard.css";

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {user, logout, accessToken} = useAuthStore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const { unreadCount, setUnreadCount, triggerFlash, flash } = useNotificationStore();

  useEffect(() => {
    if (accessToken) {
      const fetchCount = () => {
        api.get('/doctor/notifications')
          .then(res => setUnreadCount(res.data.filter((n: any) => !n.is_read).length))
          .catch(() => {});
      };
      fetchCount();
      // Poll every 30 seconds so new notifications appear without a page refresh
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, [accessToken, setUnreadCount]);

  useEffect(()=> {
    // Add a small delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => {
      if (!accessToken || !user){
        console.warn('No auth token or user found, redirecting to login');
        navigate("/login");
      } else {
        setIsLoading(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [accessToken, user, navigate]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!notificationDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationDropdownOpen]);

  const handleLogout = async() => {
    try{
      await api.post("/auth/logout");
    } catch (err){
      console.warn('Logout API failed (non-critical):', err);
    }
    await logout();
    navigate("/login");
  };

  const handleMenuClick = (id: string) => {
    setActiveTab(id);
    navigate(`/doctor/${id}`);
  };

  // Update active tab when navigating from notification
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/doctor/appointments')) {
      setActiveTab('appointments');
    } else if (path.includes('/doctor/messages')) {
      setActiveTab('messages');
    } else if (path.includes('/doctor/patients')) {
      setActiveTab('patients');
    } else if (path.includes('/doctor/lab')) {
      setActiveTab('lab');
    } else if (path.includes('/doctor/profile')) {
      setActiveTab('profile');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);


  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "patients", label: "Patients", icon: "people" },
    { id: "appointments", label: "Appointments", icon: "calender" },
    { id: "lab", label: "Lab Requests & Results", icon: "science" },
    { id: "messages", label: "Messages", icon: "chat" },
    { id: "profile", label: "Profile", icon: "person" },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "dashboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        );
      case "people":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      case "calender":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        );
      case "science":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 2v6"></path>
            <path d="M15 2v6"></path>
            <path d="M12 2v6"></path>
            <path d="M5 9h14l-1 12H6L5 9z"></path>
            <path d="M8 9v5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path>
          </svg>
        );
      case "chat":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        );
      case "person":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading || !user){
    return <div className="loading">Loading doctor data...</div>;
  }
  
    return (
    <div className="doctor-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>MediCare</h2>
          <p>Dr. {user.fullName || "Doctor"}</p>
        </div>
        
        <div className="sidebar-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="menu-icon">{getIcon(item.icon)}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </div>
        
        <button className="logout-button" onClick={handleLogout}>
          <span className="menu-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </span>
          <span className="menu-label">Logout</span>
        </button>
      </div>
      
      <div className="dashboard-main">
        <div className="dashboard-header" ref={headerRef}>
          <h1>Welcome, Dr. {user.fullName || "Doctor"}</h1>
          <div className="header-actions">
            <div style={{ position: 'relative' }}>
              <button 
                className="notification-button" 
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                aria-label="Notifications"
                aria-expanded={notificationDropdownOpen}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className={`notification-badge ${flash ? 'flash' : ''}`}>{unreadCount}</span>}
              </button>
              <NotificationDropdown 
                isOpen={notificationDropdownOpen}
                onClose={() => setNotificationDropdownOpen(false)}
                unreadCount={unreadCount}
              />
            </div>
          </div>
        </div>
        
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
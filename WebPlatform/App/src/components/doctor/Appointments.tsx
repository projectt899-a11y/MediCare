import { useState, useEffect } from "react";
import api from "../../lib/api";
import "../../styles/appointments.css";

const Appointments = () => {
  const [currentView, setCurrentView] = useState<"calendar" | "list">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Fetch appointments from backend
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await api.get("/doctor/appointments");
        setAppointments(res.data || []);
      } catch (err: any) {
        console.error("Fetch appointments error:", err);
        setError(err.response?.data?.error || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Filter appointments based on status and date
  const getFilteredAppointments = () => {
    let filtered = [...appointments];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => 
        apt.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(apt => apt.date === dateFilter);
    }

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  // باقي الدوال زي ما هي (getDaysInMonth, handlePrevMonth, handleNextMonth, getAppointmentsForDay)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedDate(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1)
    );
  };

  // Handle status change
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await api.put(`/doctor/appointments/${appointmentId}`, { status: newStatus });
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
    } catch (err: any) {
      console.error('Update appointment error:', err);
      alert('Failed to update appointment status');
    }
  };

  // Handle delete appointment
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    try {
      await api.delete(`/doctor/appointments/${appointmentId}`);
      
      // Remove from local state
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
    } catch (err: any) {
      console.error('Delete appointment error:', err);
      alert('Failed to delete appointment');
    }
  };

  const getAppointmentsForDay = (day: number) => {
    if (!day) return [];
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((apt) => apt.date === dateStr);
  };

  if (loading) return <div className="loading">Loading appointments...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="Dappointments">
      <div className="Dappointment-header">
        <h1>Appointments</h1>
        <div className="view-toggle">
          <button
            className={`toggle-button ${currentView === "list" ? "active" : ""}`}
            onClick={() => setCurrentView("list")}
          >
            List View
          </button>
          <button
            className={`toggle-button ${currentView === "calendar" ? "active" : ""}`}
            onClick={() => setCurrentView("calendar")}
          >
            Calendar View
          </button>
        </div>
      </div>

      {currentView === "list" ? (
        <div className="Dappointments-list-container">
          <div className="filter-options">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input 
              type="date" 
              className="date-filter" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="Dappointments-table">
            <table>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                      {statusFilter !== "all" || dateFilter 
                        ? "No appointments match the selected filters" 
                        : "No appointments found"}
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.patient}</td>
                      <td>
                        {appointment.date} at {appointment.time}
                      </td>
                      <td>{appointment.type}</td>
                      <td>
                        <select 
                          value={appointment.status?.toLowerCase() || 'pending'}
                          onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                          className={`status-select status-${appointment.status?.toLowerCase()}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          title="Delete appointment"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="calendar-container">
          <div className="calendar-header">
            <button className="nav-button" onClick={handlePrevMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h2>{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</h2>
            <button className="nav-button" onClick={handleNextMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <div className="calendar-grid">
            <div className="day-header">Sun</div>
            <div className="day-header">Mon</div>
            <div className="day-header">Tue</div>
            <div className="day-header">Wed</div>
            <div className="day-header">Thu</div>
            <div className="day-header">Fri</div>
            <div className="day-header">Sat</div>

            {getDaysInMonth(selectedDate).map((day, index) => {
              const dayAppointments = day ? getAppointmentsForDay(day) : [];
              const isToday =
                day === new Date().getDate() &&
                selectedDate.getMonth() === new Date().getMonth() &&
                selectedDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={`calendar-day ${!day ? "empty" : ""} ${isToday ? "today" : ""}`}
                >
                  {day && (
                    <>
                      <div className="day-number">{day}</div>
                      <div className="day-appointments">
                        {dayAppointments.slice(0, 2).map((apt, i) => (
                          <div key={i} className="appointment-dot"></div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="more-appointments">
                            +{dayAppointments.length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

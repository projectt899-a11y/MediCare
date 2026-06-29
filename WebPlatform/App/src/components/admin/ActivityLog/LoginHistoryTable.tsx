import React from 'react';

interface LoginSession {
  id: string;
  userId: string;
  loginTime: Date;
  logoutTime?: Date;
  duration?: number;
  ipAddress: string;
  userAgent?: string;
  isActive: boolean;
}

interface LoginHistoryTableProps {
  sessions: LoginSession[];
  currentSessionId?: string;
}

const LoginHistoryTable: React.FC<LoginHistoryTableProps> = ({ sessions, currentSessionId }) => {
  const calculateDuration = (loginTime: Date, logoutTime?: Date): string => {
    if (!logoutTime) return '—';
    
    const login = new Date(loginTime).getTime();
    const logout = new Date(logoutTime).getTime();
    const durationMs = logout - login;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="login-history-table-container">
      {sessions.length === 0 ? (
        <div className="activity-log-empty">No login history found</div>
      ) : (
        <table className="login-history-table">
          <thead>
            <tr>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>Duration</th>
              <th>IP Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className={session.isActive ? 'active-session' : ''}>
                <td>{new Date(session.loginTime).toLocaleString()}</td>
                <td>
                  {session.logoutTime
                    ? new Date(session.logoutTime).toLocaleString()
                    : '—'}
                </td>
                <td>{calculateDuration(session.loginTime, session.logoutTime ? new Date(session.logoutTime) : undefined)}</td>
                <td className="ip-address">{session.ipAddress}</td>
                <td>
                  {session.isActive ? (
                    <span className="status-badge active">
                      <i className="fa-solid fa-circle"></i> Currently Logged In
                    </span>
                  ) : (
                    <span className="status-badge inactive">Logged Out</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LoginHistoryTable;

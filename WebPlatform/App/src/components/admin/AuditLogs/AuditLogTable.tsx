import React from 'react';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, any>;
  status: string;
  created_at: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'badge-create';
      case 'UPDATE':
        return 'badge-update';
      case 'DELETE':
        return 'badge-delete';
      case 'APPROVE':
        return 'badge-approve';
      case 'REJECT':
        return 'badge-reject';
      case 'ACTIVATE':
        return 'badge-activate';
      case 'DEACTIVATE':
        return 'badge-deactivate';
      default:
        return 'badge-default';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    return status === 'success' ? 'status-success' : 'status-failed';
  };

  return (
    <div className="audit-log-table-container">
      <table className="audit-log-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Resource ID</th>
            <th>Changes</th>
            <th>Status</th>
            <th>Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="no-data">
                No audit logs found
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td className="admin-name">{log.admin_name}</td>
                <td>
                  <span className={`badge ${getActionBadgeClass(log.action_type)}`}>
                    {log.action_type}
                  </span>
                </td>
                <td>{log.resource_type}</td>
                <td className="resource-id">{log.resource_id}</td>
                <td className="changes-cell">
                  <details>
                    <summary>View Changes</summary>
                    <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                  </details>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="timestamp">{formatDate(log.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogTable;

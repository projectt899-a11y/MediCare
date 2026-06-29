import React, { useEffect, useState } from "react";
import api from '../../../lib/api';
import AuditLogTable from "./AuditLogTable";
import PaginationControls from "./PaginationControls";
import "../../../styles/adminAuditLogs.css";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action_type: "",
    resource_type: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, pagination.page]);

  useEffect(() => {
    // Auto-clear cache every 10 days
    const lastClearTime = localStorage.getItem("auditLogsLastClear");
    const now = Date.now();
    const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

    if (!lastClearTime || now - parseInt(lastClearTime) > TEN_DAYS_MS) {
      localStorage.removeItem("auditLogsCache");
      localStorage.setItem("auditLogsLastClear", now.toString());
    }
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(filters.resource_type && { resource_type: filters.resource_type }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });

      const response = await api.get(`/admin/audit-logs?${params}`);
      // Backend returns { success: true, data: { logs: [...], pagination: {...} } }
      const data = response.data.data || response.data;
      setLogs(data.logs || []);
      setDisplayedLogs(data.logs || []);
      setPagination(data.pagination || pagination);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
    // Reset scroll position
    const tableContainer = document.querySelector(".audit-log-page");
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear the displayed logs? This will only clear the frontend display, not the database.")) {
      setDisplayedLogs([]);
      setLogs([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      });
    }
  };

  const handleExportCSV = () => {
    if (displayedLogs.length === 0) {
      alert("No logs to export");
      return;
    }

    const headers = [
      "ID",
      "Admin Name",
      "Action Type",
      "Resource Type",
      "Resource ID",
      "Status",
      "Date & Time",
      "Changes",
    ];

    const rows = displayedLogs.map((log) => [
      log.id,
      log.admin_name,
      log.action_type,
      log.resource_type,
      log.resource_id,
      log.status,
      log.created_at,
      JSON.stringify(log.changes),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            return cellStr.includes(",") || cellStr.includes('"')
              ? `"${cellStr.replace(/"/g, '""')}"`
              : cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h2>Audit Logs</h2>
        <p className="page-subtitle">Track all admin actions and changes</p>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="filter-group">
          <label>Action Type:</label>
          <select
            value={filters.action_type}
            onChange={(e) =>
              handleFilterChange({ ...filters, action_type: e.target.value })
            }
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="ACTIVATE">Activate</option>
            <option value="DEACTIVATE">Deactivate</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Resource Type:</label>
          <select
            value={filters.resource_type}
            onChange={(e) =>
              handleFilterChange({ ...filters, resource_type: e.target.value })
            }
          >
            <option value="">All Resources</option>
            <option value="User">User</option>
            <option value="Doctor">Doctor</option>
            <option value="Specialization">Specialization</option>
            <option value="Schedule">Schedule</option>
            <option value="Account">Account</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              handleFilterChange({ ...filters, start_date: e.target.value })
            }
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) =>
              handleFilterChange({ ...filters, end_date: e.target.value })
            }
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading audit logs...</div>
      ) : (
        <>
          <div className="audit-actions">
            <button className="btn-export" onClick={handleExportCSV}>
              📥 Export as CSV
            </button>
            <button className="btn-clear" onClick={handleClearLogs}>
              🗑️ Clear Display
            </button>
          </div>

          {displayedLogs.length === 0 ? (
            <div className="no-logs-message">No audit logs found</div>
          ) : (
            <>
              <AuditLogTable logs={displayedLogs} />

              {/* Pagination */}
              <PaginationControls
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalRecords={pagination.total}
                onPageChange={handlePageChange}
                isLoading={loading}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogViewer;

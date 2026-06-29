import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import './HistoryArchive.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface HistoryRequest {
  id: string;
  patient_name: string;
  test_type: string;
  status: 'Completed' | 'Rejected';
  created_at: string;
  rejection_reason?: string | null;
}

const HistoryArchive: React.FC = () => {
  const { accessToken } = useAuthStore();

  // Data state
  const [requests, setRequests] = useState<HistoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);

  // Sort state
  const [sortField, setSortField] = useState<'patient_name' | 'test_type' | 'status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<HistoryRequest | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Fetch history from backend ──────────────────────────────────────────────
  const fetchHistory = useCallback(async (page = currentPage) => {
    const labId = localStorage.getItem('labId');
    if (!labId) {
      setError('Lab ID not found. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('labId', labId);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      // Status filter — default to both Completed and Rejected
      const statuses = statusFilter.length > 0 ? statusFilter : ['Completed', 'Rejected'];
      params.set('status', statuses.join(','));

      if (searchTerm.trim()) {
        params.set('searchTerm', searchTerm.trim());
        params.set('searchField', 'patient_name');
      }
      if (dateRange[0]) params.set('startDate', dateRange[0]);
      if (dateRange[1]) params.set('endDate', dateRange[1]);

      const res = await fetch(`${API_BASE_URL}/labs/requests/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken || ''}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed: ${res.statusText}`);
      }

      const json = await res.json();
      const raw: any[] = Array.isArray(json.data) ? json.data : (json.data?.requests || json.data || []);
      const total: number = json.pagination?.total ?? raw.length;

      const mapped: HistoryRequest[] = raw.map((r: any) => ({
        id: r.id,
        patient_name: r.patientName || r.patient_name || '—',
        test_type: r.testTypeName || r.test_type || '—',
        status: r.status,
        created_at: r.createdAt || r.created_at || '',
        rejection_reason: r.rejectionReason || r.rejection_reason || null,
      }));

      setRequests(mapped);
      setTotalCount(total);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
      setRequests([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, searchTerm, statusFilter, dateRange, currentPage, pageSize]);

  // Re-fetch whenever filters, search, date range, or page changes
  useEffect(() => {
    fetchHistory(currentPage);
  }, [fetchHistory]);

  // ── Client-side sort of current page ───────────────────────────────────────
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'patient_name': aVal = a.patient_name; bVal = b.patient_name; break;
        case 'test_type':    aVal = a.test_type;    bVal = b.test_type;    break;
        case 'status':       aVal = a.status;       bVal = b.status;       break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.toLowerCase().localeCompare((bVal as string).toLowerCase())
          : (bVal as string).toLowerCase().localeCompare(aVal.toLowerCase());
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [requests, sortField, sortDirection]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setDateRange(['', '']);
    setCurrentPage(1);
  };

  const handleViewResult = (item: HistoryRequest) => {
    setSelectedRequest(item);
    setShowResultModal(true);
  };

  // ── CSV export helpers ──────────────────────────────────────────────────────
  const buildCSV = (rows: HistoryRequest[]) => {
    const headers = ['Patient Name', 'Test Type', 'Status', 'Date'];
    const data = rows.map(r => [
      r.patient_name,
      r.test_type,
      r.status,
      r.created_at ? new Date(r.created_at).toLocaleDateString('en-US') : '—',
    ]);
    return [headers, ...data].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCurrentPage = () => {
    setShowExportMenu(false);
    downloadCSV(buildCSV(sortedRequests), `lab_history_page${currentPage}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportAllPages = async () => {
    setShowExportMenu(false);
    const labId = localStorage.getItem('labId');
    if (!labId) return;

    try {
      const params = new URLSearchParams();
      params.set('labId', labId);
      params.set('page', '1');
      params.set('limit', String(totalCount || 1000));
      const statuses = statusFilter.length > 0 ? statusFilter : ['Completed', 'Rejected'];
      params.set('status', statuses.join(','));
      if (searchTerm.trim()) { params.set('searchTerm', searchTerm.trim()); params.set('searchField', 'patient_name'); }
      if (dateRange[0]) params.set('startDate', dateRange[0]);
      if (dateRange[1]) params.set('endDate', dateRange[1]);

      const res = await fetch(`${API_BASE_URL}/labs/requests/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken || ''}` },
      });
      const json = await res.json();
      const raw: any[] = Array.isArray(json.data) ? json.data : (json.data?.requests || json.data || []);
      const allRows: HistoryRequest[] = raw.map((r: any) => ({
        id: r.id,
        patient_name: r.patientName || r.patient_name || '—',
        test_type: r.testTypeName || r.test_type || '—',
        status: r.status,
        created_at: r.createdAt || r.created_at || '',
        rejection_reason: r.rejectionReason || r.rejection_reason || null,
      }));
      downloadCSV(buildCSV(allRows), `lab_history_all_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Export all pages failed:', err);
    }
  };

  const getSortIndicator = (field: typeof sortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'lab-badge-success';
      case 'Rejected':  return 'lab-badge-danger';
      default:          return 'lab-badge-primary';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const hasActiveFilters = searchTerm || statusFilter.length > 0 || dateRange[0] || dateRange[1];

  return (
    <div className="lab-history-archive">
      <div className="lab-history-header">
        <h1>History & Archive</h1>

        {/* Export CSV with scope dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="lab-btn lab-btn-secondary"
            onClick={() => setShowExportMenu(prev => !prev)}
            aria-label="Export to CSV"
          >
            📥 Export CSV ▾
          </button>
          {showExportMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', background: '#fff',
              border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              zIndex: 100, minWidth: '180px', overflow: 'hidden',
            }}>
              <button
                onClick={handleExportCurrentPage}
                style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Export Current Page
              </button>
              <button
                onClick={handleExportAllPages}
                style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Export All Pages
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="lab-history-filters">
        <div className="lab-filter-group">
          <label htmlFor="searchInput">Search</label>
          <input
            id="searchInput"
            type="text"
            placeholder="Search by Patient Name or Test Type..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="lab-search-input"
          />
        </div>

        <div className="lab-filter-group">
          <label>Status</label>
          <div className="lab-filter-checkboxes">
            <label className="lab-checkbox-label">
              <input
                type="checkbox"
                checked={statusFilter.includes('Completed')}
                onChange={() => handleStatusFilterChange('Completed')}
              />
              <span>Completed</span>
            </label>
            <label className="lab-checkbox-label">
              <input
                type="checkbox"
                checked={statusFilter.includes('Rejected')}
                onChange={() => handleStatusFilterChange('Rejected')}
              />
              <span>Rejected</span>
            </label>
          </div>
        </div>

        <div className="lab-filter-group">
          <label>Date Range</label>
          <div className="lab-date-range">
            <input
              type="date"
              value={dateRange[0]}
              onChange={e => { setDateRange([e.target.value, dateRange[1]]); setCurrentPage(1); }}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange[1]}
              onChange={e => { setDateRange([dateRange[0], e.target.value]); setCurrentPage(1); }}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button className="lab-btn lab-btn-secondary" onClick={handleClearFilters} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap', width: 'fit-content' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Results Info */}
      <div className="lab-results-info">
        {isLoading ? 'Loading…' : (
          <>
            Showing {totalCount > 0 ? startIndex + 1 : 0} to{' '}
            {Math.min(startIndex + sortedRequests.length, totalCount)} of {totalCount} results
          </>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '1rem', color: '#c0392b', background: '#fdf0ef', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* History Table */}
      <div className="lab-history-table-container">
        <table className="lab-history-table">
          <thead>
            <tr>
              <th>
                <button className="lab-sort-header" onClick={() => handleSort('patient_name')}>
                  Patient Name{getSortIndicator('patient_name')}
                </button>
              </th>
              <th>
                <button className="lab-sort-header" onClick={() => handleSort('test_type')}>
                  Test Type{getSortIndicator('test_type')}
                </button>
              </th>
              <th>
                <button className="lab-sort-header" onClick={() => handleSort('status')}>
                  Status{getSortIndicator('status')}
                </button>
              </th>
              <th>
                <button className="lab-sort-header" onClick={() => handleSort('created_at')}>
                  Date{getSortIndicator('created_at')}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="lab-empty-state">Loading…</td>
              </tr>
            ) : sortedRequests.length > 0 ? (
              sortedRequests.map(item => (
                <tr key={item.id}>
                  <td>{item.patient_name}</td>
                  <td>{item.test_type}</td>
                  <td>
                    <span className={`lab-badge ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    {item.status === 'Completed' && (
                      <button
                        className="lab-action-btn"
                        onClick={() => handleViewResult(item)}
                        aria-label={`View result for ${item.patient_name}`}
                      >
                        View Result
                      </button>
                    )}
                    {item.status === 'Rejected' && item.rejection_reason && (
                      <button
                        className="lab-action-btn"
                        onClick={() => handleViewResult(item)}
                        aria-label={`View rejection reason for ${item.patient_name}`}
                      >
                        View Reason
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="lab-empty-state">No results found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="lab-pagination">
          <button
            className="lab-pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            // Show pages around current page
            const page = totalPages <= 10 ? i + 1 : Math.max(1, currentPage - 4) + i;
            if (page > totalPages) return null;
            return (
              <button
                key={page}
                className={`lab-pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            );
          })}
          <button
            className="lab-pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <span className="lab-pagination-info">Page {currentPage} of {totalPages}</span>
        </div>
      )}

      {/* Result / Rejection Modal */}
      {showResultModal && selectedRequest && (
        <div className="lab-modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="lab-modal" onClick={e => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h2>
                {selectedRequest.status === 'Completed' ? 'Result Details' : 'Rejection Reason'}
                {' — '}{selectedRequest.patient_name}
              </h2>
              <button className="lab-modal-close" onClick={() => setShowResultModal(false)} aria-label="Close modal">×</button>
            </div>
            <div className="lab-modal-body">
              <div className="lab-result-info">
                <div className="lab-result-row">
                  <span className="lab-result-label">Patient:</span>
                  <span className="lab-result-value">{selectedRequest.patient_name}</span>
                </div>
                <div className="lab-result-row">
                  <span className="lab-result-label">Test Type:</span>
                  <span className="lab-result-value">{selectedRequest.test_type}</span>
                </div>
                <div className="lab-result-row">
                  <span className="lab-result-label">Status:</span>
                  <span className={`lab-badge ${getStatusBadgeClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="lab-result-row">
                  <span className="lab-result-label">Date:</span>
                  <span className="lab-result-value">{formatDate(selectedRequest.created_at)}</span>
                </div>
                {selectedRequest.status === 'Rejected' && selectedRequest.rejection_reason && (
                  <div className="lab-result-row">
                    <span className="lab-result-label">Rejection Reason:</span>
                    <span className="lab-result-value">{selectedRequest.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setShowResultModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryArchive;

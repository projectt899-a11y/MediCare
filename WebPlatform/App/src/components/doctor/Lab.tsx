import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSearchParams } from 'react-router-dom';
import '../../styles/labModule.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LabRequest {
  id: string;
  patient_name: string;
  test_type: string;
  lab_name: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  priority: 'Normal' | 'Urgent';
  doctor_notes: string | null;
  created_at: string;
}

interface LabResult {
  id: string;
  lab_request_id: string;
  patient_name: string;
  test_type: string;
  lab_name: string;
  result_type: 'File Upload' | 'Manual Entry';
  file_path: string | null;
  file_name: string | null;
  result_values: Record<string, any> | null;
  doctor_visible_notes: string | null;
  submitted_at: string;
}

const DoctorLab = () => {
  const { accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'requests' | 'results' | null;
  const [activeTab, setActiveTab] = useState<'requests' | 'results'>(tabParam || 'requests');

  // Requests state
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Results state
  const [results, setResults] = useState<LabResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/labs/doctor/requests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch requests');
      // Backend returns { success, data: [...], pagination }
      const raw = data.data || [];
      const mapped = raw.map((r: any) => ({
        id: r.id,
        patient_name: r.patientName || r.patient_name || '—',
        test_type: r.testTypeName || r.test_type || '—',
        lab_name: r.labName || r.lab_name || '—',
        status: r.status,
        priority: r.priority,
        doctor_notes: r.doctorNotes || r.doctor_notes || null,
        created_at: r.createdAt || r.created_at,
      }));
      setRequests(mapped);
    } catch (err: any) {
      setRequestsError(err.message);
    } finally {
      setRequestsLoading(false);
    }
  }, [accessToken]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    setResultsError('');
    try {
      const res = await fetch(`${API_BASE}/labs/doctor/results`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
      setResults(data.data?.results || []);
    } catch (err: any) {
      setResultsError(err.message);
    } finally {
      setResultsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (activeTab === 'results') fetchResults();
  }, [activeTab, fetchResults]);

  const handleDownloadResult = async (resultId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_BASE}/labs/results/${resultId}/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get download link');
      window.open(data.data?.signedUrl, '_blank');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRequest = async (requestId: string, patientName: string) => {
    if (!window.confirm(`Delete lab request for ${patientName}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/labs/requests/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete request');
      
      // Remove from UI
      setRequests(prev => prev.filter(r => r.id !== requestId));
      alert('Request deleted successfully');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status.toLowerCase() === statusFilter);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending':    return 'pending';
      case 'Processing': return 'processing';
      case 'Completed':  return 'completed';
      case 'Rejected':   return 'rejected';
      default:           return '';
    }
  };

  return (
    <div className="lab-module">
      <div className="module-header">
        <h1>Lab Requests & Results</h1>
        <button className="request-button" onClick={fetchRequests}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh
        </button>
      </div>

      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Lab Requests
        </button>
        <button
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Lab Results
        </button>
      </div>

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'requests' && (
        <div className="lab-requests-container">
          <div className="filter-options">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {requestsLoading ? (
            <div className="lab-loading">Loading requests...</div>
          ) : requestsError ? (
            <div className="lab-error">{requestsError}</div>
          ) : (
            <div className="lab-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test Type</th>
                    <th>Lab Name</th>
                    <th>Priority</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length > 0 ? filteredRequests.map(request => (
                    <tr key={request.id}>
                      <td>{request.patient_name}</td>
                      <td>{request.test_type}</td>
                      <td>{request.lab_name}</td>
                      <td>
                        <span className={`status-badge ${request.priority === 'Urgent' ? 'urgent' : 'normal'}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td>{formatDate(request.created_at)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteRequest(request.id, request.patient_name)}
                          title="Delete request"
                          aria-label="Delete lab request"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#d32f2f',
                            fontSize: '18px',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ffebee';
                            e.currentTarget.style.borderRadius = '4px';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                        No requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {activeTab === 'results' && (
        <div className="lab-results-container">
          {resultsLoading ? (
            <div className="lab-loading">Loading results...</div>
          ) : resultsError ? (
            <div className="lab-error">{resultsError}</div>
          ) : (
            <div className="lab-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test Type</th>
                    <th>Lab Name</th>
                    <th>Result Date</th>
                    <th>Type</th>
                    <th>Lab Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map(result => (
                    <tr key={result.id}>
                      <td>{result.patient_name}</td>
                      <td>{result.test_type}</td>
                      <td>{result.lab_name}</td>
                      <td>{formatDate(result.submitted_at)}</td>
                      <td>
                        {result.result_type === 'File Upload' ? (
                          <span className="file-indicator">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            File
                          </span>
                        ) : (
                          <span className="file-indicator">Manual</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '200px', color: '#555', fontSize: '0.875rem' }}>
                        {result.doctor_visible_notes || '—'}
                      </td>
                      <td>
                        {result.result_type === 'File Upload' && result.file_path ? (
                          <button
                            className="view-button"
                            title="View result"
                            onClick={() => handleDownloadResult(result.id, result.file_name || 'result')}
                            aria-label="View result file"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        ) : result.result_type === 'Manual Entry' && result.result_values ? (
                          <button
                            className="view-button"
                            title="View values"
                            onClick={() => alert(JSON.stringify(result.result_values, null, 2))}
                            aria-label="View manual entry values"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                        No results found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorLab;

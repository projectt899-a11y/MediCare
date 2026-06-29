import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import CreateFollowUpModal from './CreateFollowUpModal';
import Icon from '../admin/Icon';
import type { AssignedPatient } from '../../types/nurse';
import '../../styles/nursePatientList.css';

interface Filters {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const PatientListPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sortBy: 'assignment_date',
    sortOrder: 'desc'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AssignedPatient | null>(null);

  useEffect(() => {
    // Add delay to ensure store is hydrated from localStorage
    const timer = setTimeout(() => {
      if (user?.id && accessToken) {
        fetchPatients();
      } else if (!accessToken) {
        setError('Authentication information not found. Please log in again.');
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.id, accessToken]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [patients, filters]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!accessToken || !user?.id) {
        setError('Authentication information not found. Please log in again.');
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/nurses/${user.id}/patients`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch patients';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view patients');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to fetch patients. Please try again.');
          }
        }
      }

      const data = await response.json();
      setPatients(data.data || []);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to load patients');
      }
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...patients];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.full_name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'full_name':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'assignment_date':
          aValue = new Date(a.assignment_date).getTime();
          bValue = new Date(b.assignment_date).getTime();
          break;
        case 'assignment_status':
          aValue = a.assignment_status;
          bValue = b.assignment_status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPatients(result);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilters(prev => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        sortBy: column,
        sortOrder: 'asc'
      }));
    }
  };

  const getSortIndicator = (column: string) => {
    if (filters.sortBy !== column) return '';
    return filters.sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleCreateFollowUp = (patient: AssignedPatient) => {
    setSelectedPatient(patient);
    setShowCreateModal(true);
  };

  const handleFollowUpSuccess = () => {
    // Refresh patients list after successful follow-up creation
    fetchPatients();
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'pending follow-up':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'in-progress':
        return 'status-in-progress';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="patient-list-page">
        <div className="loading-message">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="patient-list-page">
      <div className="page-header">
        <h1>My Patients</h1>
        <p className="page-subtitle">Manage all patients assigned to you</p>
      </div>

      {error && (
        <div className="error-message-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchPatients} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="search-input">Search:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <button onClick={fetchPatients} className="refresh-btn">
          <Icon name="refresh-cw" className="icon-svg" />
          Refresh
        </button>
      </div>

      {/* Patient Count */}
      <div className="patient-count">
        Total Patients: <strong>{filteredPatients.length}</strong>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="patients-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('full_name')} className="sortable">
                Patient Name {getSortIndicator('full_name')}
              </th>
              <th>Email</th>
              <th onClick={() => handleSort('assignment_date')} className="sortable">
                Assignment Date {getSortIndicator('assignment_date')}
              </th>
              <th onClick={() => handleSort('assignment_status')} className="sortable">
                Status {getSortIndicator('assignment_status')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  {patients.length === 0 ? 'No patients assigned yet' : 'No patients match your filters'}
                </td>
              </tr>
            ) : (
              filteredPatients.map(patient => (
                <tr key={patient.id}>
                  <td className="patient-name">{patient.full_name}</td>
                  <td>{patient.email}</td>
                  <td>{new Date(patient.assignment_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(patient.assignment_status)}`}>
                      {patient.assignment_status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleCreateFollowUp(patient)}
                    >
                      Create Follow-up
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Follow-up Modal */}
      {selectedPatient && (
        <CreateFollowUpModal
          patientId={selectedPatient.id}
          patientName={selectedPatient.full_name}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedPatient(null);
          }}
          onSuccess={handleFollowUpSuccess}
        />
      )}
    </div>
  );
};

export default PatientListPage;

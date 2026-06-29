import React, { useEffect, useState } from 'react';
import type { Nurse, Pagination } from '../../../types/nurse';
import { useAuthStore } from '../../../store/authStore';
import NurseDetailModal from './NurseDetailModal';
import '../../../styles/nurseAdmin.css';

interface NurseManagementListProps {
  onRefresh?: () => void;
}

const NurseManagementList: React.FC<NurseManagementListProps> = ({ onRefresh }) => {
  const { accessToken } = useAuthStore();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchNurses();
  }, [pagination.page, statusFilter, searchTerm, sortBy, sortOrder]);

  const fetchNurses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!accessToken) {
        setError('Not authenticated. Please log in again.');
        return;
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`http://localhost:5000/api/nurses?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || errorData.error || 'Failed to fetch nurses';
          throw new Error(errorMessage);
        } catch (parseError) {
          // Handle non-JSON error responses
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view nurses');
          } else if (response.status === 500) {
            throw new Error('Server error. Please try again later.');
          } else {
            throw new Error('Failed to fetch nurses. Please try again.');
          }
        }
      }

      const data = await response.json();
      const responseData = data.data || data;
      
      setNurses(responseData.nurses || []);
      setPagination(responseData.pagination || pagination);
    } catch (err: any) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred while fetching nurses');
      }
      console.error('Error fetching nurses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleNurseClick = (nurse: Nurse) => {
    setSelectedNurse(nurse);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedNurse(null);
  };

  const handleNurseUpdated = () => {
    fetchNurses();
    handleDetailModalClose();
  };

  const getSortIndicator = (column: string) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="nurse-management-list">
      <div className="list-header">
        <h3>Nurse Management</h3>
        <p className="subtitle">Manage all nurses in the system</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search-input">Search:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <button onClick={fetchNurses} className="refresh-btn">
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message-container">
          <div className="error-message">{error}</div>
          <button onClick={fetchNurses} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-message">Loading nurses...</div>
      ) : (
        <>
          {/* Table */}
          <div className="table-container">
            <table className="nurses-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('full_name')} className="sortable">
                    Name {getSortIndicator('full_name')}
                  </th>
                  <th onClick={() => handleSort('email')} className="sortable">
                    Email {getSortIndicator('email')}
                  </th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th onClick={() => handleSort('account_status')} className="sortable">
                    Status {getSortIndicator('account_status')}
                  </th>
                  <th onClick={() => handleSort('created_at')} className="sortable">
                    Registration Date {getSortIndicator('created_at')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nurses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No nurses found
                    </td>
                  </tr>
                ) : (
                  nurses.map(nurse => (
                    <tr key={nurse.id}>
                      <td>{nurse.full_name}</td>
                      <td>{nurse.email}</td>
                      <td>{nurse.phone_number}</td>
                      <td className="capitalize">{nurse.gender}</td>
                      <td>
                        <span className={`status-badge status-${nurse.account_status}`}>
                          {nurse.account_status}
                        </span>
                      </td>
                      <td>{new Date(nurse.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleNurseClick(nurse)}
                        >
                          View/Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              ← Previous
            </button>

            <span className="page-info">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>

            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedNurse && (
        <NurseDetailModal
          nurse={selectedNurse}
          onClose={handleDetailModalClose}
          onUpdate={handleNurseUpdated}
        />
      )}
    </div>
  );
};

export default NurseManagementList;

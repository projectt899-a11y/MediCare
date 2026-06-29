import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabRequestsStore } from '../../store/labRequestsStore';
import '../../styles/labResponsive.css';
import './RequestsInbox.css';

const RequestsInbox: React.FC = () => {
  const navigate = useNavigate();
  const {
    filters,
    sortField,
    sortDirection,
    pagination,
    isLoading,
    fetchRequests,
    setFilters,
    setSortField,
    clearFilters,
    setPagination,
    acceptRequest,
    getDisplayedRequests,
  } = useLabRequestsStore();

  const [showFilters, setShowFilters] = useState(false);
  const displayedRequests = getDisplayedRequests();
  const totalPages = Math.ceil(pagination.totalResults / pagination.pageSize);

  // Fetch requests on component mount
  useEffect(() => {
    const labId = localStorage.getItem('labId');
    if (labId) {
      useLabRequestsStore.getState().setLabId(labId);
    }
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusFilterChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    setFilters({ status: newStatuses });
  };

  const handlePriorityFilterChange = (priority: string) => {
    const newPriorities = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    setFilters({ priority: newPriorities });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchTerm: e.target.value });
  };

  const handleSortClick = (field: typeof sortField) => {
    setSortField(field);
  };

  const handleAcceptRequest = async (requestId: string) => {
    await acceptRequest(requestId);
  };

  const handlePageChange = (page: number) => {
    setPagination(page, pagination.pageSize);
  };

  const getSortIndicator = (field: typeof sortField): string => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Pending':
        return 'lab-badge-warning';
      case 'Processing':
        return 'lab-badge-primary';
      case 'Completed':
        return 'lab-badge-success';
      case 'Rejected':
        return 'lab-badge-danger';
      default:
        return 'lab-badge-primary';
    }
  };

  const getPriorityBadgeClass = (priority: string): string => {
    return priority === 'Urgent' ? 'lab-badge-danger' : 'lab-badge-primary';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 || filters.priority.length > 0 || filters.searchTerm !== '';

  return (
    <div className="lab-requests-inbox">
      <div className="lab-inbox-header">
        <h1>Requests Inbox</h1>
        <div className="lab-inbox-controls">
          <button
            className="lab-btn lab-btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <span className="lab-icon">⚙️</span>
            Filters
          </button>
          {hasActiveFilters && (
            <button
              className="lab-btn lab-btn-tertiary"
              onClick={clearFilters}
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="lab-filter-section">
          <div className="lab-filter-group">
            <label className="lab-filter-label">Search</label>
            <input
              type="text"
              className="lab-form-input"
              placeholder="Search by Patient Name, Doctor Name, or Request ID..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
              aria-label="Search requests"
            />
          </div>

          <div className="lab-filter-row">
            <div className="lab-filter-group">
              <label className="lab-filter-label">Status</label>
              <div className="lab-filter-checkboxes">
                {['Pending', 'Processing', 'Completed', 'Rejected'].map((status) => (
                  <label key={status} className="lab-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => handleStatusFilterChange(status)}
                      aria-label={`Filter by ${status} status`}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="lab-filter-group">
              <label className="lab-filter-label">Priority</label>
              <div className="lab-filter-checkboxes">
                {['Normal', 'Urgent'].map((priority) => (
                  <label key={priority} className="lab-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority)}
                      onChange={() => handlePriorityFilterChange(priority)}
                      aria-label={`Filter by ${priority} priority`}
                    />
                    <span>{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lab-filter-results">
            <p>
              Showing <strong>{displayedRequests.length}</strong> of{' '}
              <strong>{pagination.totalResults}</strong> results
            </p>
          </div>
        </div>
      )}

      {/* Results Info */}
      {!showFilters && (
        <div className="lab-results-info">
          <p>
            Showing <strong>{displayedRequests.length}</strong> of{' '}
            <strong>{pagination.totalResults}</strong> results
          </p>
        </div>
      )}

      {/* Requests Table */}
      <div className="lab-card">
        <div className="lab-table-container">
          {displayedRequests.length > 0 ? (
            <table className="lab-table lab-requests-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('patient_name')}
                      aria-label="Sort by Patient Name"
                    >
                      Patient Name
                      {getSortIndicator('patient_name')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('doctor_name')}
                      aria-label="Sort by Doctor Name"
                    >
                      Doctor Name
                      {getSortIndicator('doctor_name')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('test_type')}
                      aria-label="Sort by Test Type"
                    >
                      Test Type
                      {getSortIndicator('test_type')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('status')}
                      aria-label="Sort by Status"
                    >
                      Status
                      {getSortIndicator('status')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('priority')}
                      aria-label="Sort by Priority"
                    >
                      Priority
                      {getSortIndicator('priority')}
                    </button>
                  </th>
                  <th>
                    <button
                      className="lab-sort-header"
                      onClick={() => handleSortClick('created_at')}
                      aria-label="Sort by Date"
                    >
                      Date
                      {getSortIndicator('created_at')}
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.patient_name}</td>
                    <td>{request.doctor_name}</td>
                    <td>{request.test_type}</td>
                    <td>
                      <span
                        className={`lab-badge ${getStatusBadgeClass(request.status)}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`lab-badge ${getPriorityBadgeClass(request.priority)}`}
                      >
                        {request.priority}
                      </span>
                    </td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>
                      <div className="lab-actions">
                        <button
                          className="lab-btn lab-btn-sm"
                          onClick={() => navigate(`/lab/request/${request.id}`)}
                          aria-label={`View request for ${request.patient_name}`}
                        >
                          View
                        </button>
                        {request.status === 'Pending' && (
                          <button
                            className="lab-btn lab-btn-sm lab-btn-success"
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={isLoading}
                            aria-label={`Accept request for ${request.patient_name}`}
                          >
                            {isLoading ? 'Accepting...' : 'Accept'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="lab-empty-state">
              <p>No requests found matching your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="lab-pagination">
          <button
            className="lab-pagination-btn"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            aria-label="Previous page"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`lab-pagination-btn ${
                pagination.currentPage === page ? 'active' : ''
              }`}
              onClick={() => handlePageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={pagination.currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ))}

          <button
            className="lab-pagination-btn"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === totalPages}
            aria-label="Next page"
          >
            Next
          </button>

          <span className="lab-pagination-info">
            Page {pagination.currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
};

export default RequestsInbox;

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import './LabProfile.css';

interface LabStaffMember {
  id: string;
  full_name: string;
  email: string;
  role: 'Lab Technician' | 'Lab Manager' | 'Lab Admin';
  status: 'Active' | 'Inactive' | 'Suspended';
}

interface LabInfo {
  name: string;
  address: string;
  phone_number: string;
  email: string;
  license_number: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected' | 'Inactive';
  lab_type: string;
}

const LabProfile: React.FC = () => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authUser = useAuthStore((state) => state.user);

  // Real data from API
  const [labInfo, setLabInfo] = useState<LabInfo>({
    name: '',
    address: '',
    phone_number: '',
    email: '',
    license_number: '',
    status: 'Pending Approval',
    lab_type: '',
  });

  const [editedInfo, setEditedInfo] = useState(labInfo);

  const [staffMembers, setStaffMembers] = useState<LabStaffMember[]>([]);

  const [newStaff, setNewStaff] = useState<{
    name: string;
    email: string;
    role: 'Lab Technician' | 'Lab Manager' | 'Lab Admin';
  }>({
    name: '',
    email: '',
    role: 'Lab Technician',
  });

  // Fetch lab data on component mount
  useEffect(() => {
    fetchLabData();
  }, [authUser?.id]);

  const fetchLabData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the lab ID from localStorage
      const labId = localStorage.getItem('labId');
      
      if (!labId) {
        setError('Lab ID not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Get lab info using the correct endpoint
      const labResponse = await api.get(`/labs/${labId}`);
      const lab = labResponse.data?.data || labResponse.data;

      if (lab) {
        const labData: LabInfo = {
          name: lab.name || '',
          address: lab.address || '',
          phone_number: lab.phone_number || '',
          email: lab.email || '',
          license_number: lab.license_number || '',
          status: lab.status || 'Pending Approval',
          lab_type: lab.lab_type || '',
        };
        setLabInfo(labData);
        setEditedInfo(labData);
      }

      // Get lab staff using the correct endpoint
      const staffResponse = await api.get(`/labs/${labId}/staff`);
      const staffData = staffResponse.data?.data || staffResponse.data;
      
      // Handle both array and object responses
      let staff = [];
      if (Array.isArray(staffData)) {
        staff = staffData;
      } else if (staffData?.staff && Array.isArray(staffData.staff)) {
        staff = staffData.staff;
      }
      
      setStaffMembers(
        staff.map((member: any) => ({
          id: member.id || member.user_id,
          full_name: member.full_name,
          email: member.email,
          role: member.role || 'Lab Technician',
          status: member.status || 'Active',
        }))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load lab profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    try {
      setLoading(true);
      const labId = localStorage.getItem('labId');
      if (!labId) {
        alert('Lab ID not found');
        return;
      }
      
      const updateData: any = {
        name: editedInfo.name,
        address: editedInfo.address,
        phone_number: editedInfo.phone_number,
        email: editedInfo.email,
        license_number: editedInfo.license_number,
      };
      
      const response = await api.put(`/labs/${labId}`, updateData);
      
      setLabInfo(editedInfo);
      setIsEditingInfo(false);
      alert('Lab information updated successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to save lab information');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const labId = localStorage.getItem('labId');
      if (!labId) {
        alert('Lab ID not found');
        return;
      }
      const response = await api.post(`/labs/${labId}/staff`, {
        full_name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
      });

      const addedMember = response.data?.data || response.data;
      const newMember: LabStaffMember = {
        id: addedMember.id || String(staffMembers.length + 1),
        full_name: addedMember.full_name || newStaff.name,
        email: addedMember.email || newStaff.email,
        role: addedMember.role || newStaff.role,
        status: addedMember.status || 'Active',
      };

      setStaffMembers([...staffMembers, newMember]);
      setNewStaff({ name: '', email: '', role: 'Lab Technician' });
      setShowAddStaffModal(false);
      alert('Staff member added successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      setLoading(true);
      const labId = localStorage.getItem('labId');
      if (!labId) {
        alert('Lab ID not found');
        return;
      }
      await api.delete(`/labs/${labId}/staff/${staffId}`);
      setStaffMembers(staffMembers.filter((member) => member.id !== staffId));
      setShowRemoveConfirm(null);
      alert('Staff member removed successfully');
    } catch (err: any) {
      console.error('Error removing staff:', err);
      alert(err.response?.data?.message || 'Failed to remove staff member');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'lab-badge-success';
      case 'Pending Approval':
        return 'lab-badge-warning';
      case 'Rejected':
        return 'lab-badge-danger';
      case 'Inactive':
        return 'lab-badge-secondary';
      case 'Active':
        return 'lab-badge-success';
      case 'Suspended':
        return 'lab-badge-danger';
      default:
        return 'lab-badge-primary';
    }
  };

  return (
    <div className="lab-profile">
      <div className="lab-profile-header">
        <h1>Lab Profile</h1>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="lab-loading-state">
          <div className="lab-spinner"></div>
          <p>Loading lab profile...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="lab-error-state">
          <p>⚠️ {error}</p>
          <button className="lab-btn lab-btn-primary" onClick={fetchLabData}>
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Lab Information Section */}
          <div className="lab-profile-section">
        <div className="lab-section-header">
          <h2>Lab Information</h2>
          {!isEditingInfo && (
            <button
              className="lab-btn lab-btn-secondary"
              onClick={() => {
                setEditedInfo(labInfo);
                setIsEditingInfo(true);
              }}
            >
              Edit
            </button>
          )}
        </div>

        {!isEditingInfo ? (
          <div className="lab-info-display">
            <div className="lab-info-grid">
              <div className="lab-info-item">
                <label>Lab Name</label>
                <p>{labInfo.name}</p>
              </div>
              <div className="lab-info-item">
                <label>Status</label>
                <span className={`lab-badge ${getStatusBadgeClass(labInfo.status)}`}>
                  {labInfo.status}
                </span>
              </div>
              <div className="lab-info-item lab-full-width">
                <label>Address</label>
                <p>{labInfo.address}</p>
              </div>
              <div className="lab-info-item">
                <label>Phone</label>
                <p>{labInfo.phone_number}</p>
              </div>
              <div className="lab-info-item">
                <label>Email</label>
                <p>{labInfo.email}</p>
              </div>
              <div className="lab-info-item">
                <label>Lab Type</label>
                <p>{labInfo.lab_type}</p>
              </div>
              <div className="lab-info-item">
                <label>License Number</label>
                <p>{labInfo.license_number}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="lab-info-edit">
            <div className="lab-form-fields">
              <div className="lab-form-field">
                <label htmlFor="labName">Lab Name</label>
                <input
                  id="labName"
                  type="text"
                  value={editedInfo.name}
                  onChange={(e) =>
                    setEditedInfo({ ...editedInfo, name: e.target.value })
                  }
                />
              </div>
              <div className="lab-form-field">
                <label htmlFor="labPhone">Phone</label>
                <input
                  id="labPhone"
                  type="tel"
                  value={editedInfo.phone_number}
                  onChange={(e) =>
                    setEditedInfo({ ...editedInfo, phone_number: e.target.value })
                  }
                />
              </div>
              <div className="lab-form-field">
                <label htmlFor="labEmail">Email</label>
                <input
                  id="labEmail"
                  type="email"
                  value={editedInfo.email}
                  onChange={(e) =>
                    setEditedInfo({ ...editedInfo, email: e.target.value })
                  }
                />
              </div>
              <div className="lab-form-field lab-full-width">
                <label htmlFor="labAddress">Address</label>
                <textarea
                  id="labAddress"
                  value={editedInfo.address}
                  onChange={(e) =>
                    setEditedInfo({ ...editedInfo, address: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="lab-edit-actions">
              <button
                className="lab-btn lab-btn-secondary"
                onClick={() => setIsEditingInfo(false)}
              >
                Cancel
              </button>
              <button
                className="lab-btn lab-btn-primary"
                onClick={handleSaveInfo}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

          {/* Lab Staff Section */}
          <div className="lab-profile-section">
        <div className="lab-section-header">
          <h2>Lab Staff</h2>
          <button
            className="lab-btn lab-btn-primary"
            onClick={() => setShowAddStaffModal(true)}
          >
            + Add Staff Member
          </button>
        </div>

        <div className="lab-staff-list">
          {staffMembers.length > 0 ? (
            <div className="lab-staff-table-container">
              <table className="lab-staff-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.full_name}</td>
                      <td>{member.email}</td>
                      <td>{member.role}</td>
                      <td>
                        <span className={`lab-badge ${getStatusBadgeClass(member.status)}`}>
                          {member.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="lab-action-btn lab-action-btn-danger"
                          onClick={() => setShowRemoveConfirm(member.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="lab-empty-state">
              No staff members added yet
            </div>
          )}
        </div>
      </div>

          {/* Add Staff Modal */}
          {showAddStaffModal && (
        <div className="lab-modal-overlay" onClick={() => setShowAddStaffModal(false)}>
          <div className="lab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h2>Add Staff Member</h2>
              <button
                className="lab-modal-close"
                onClick={() => setShowAddStaffModal(false)}
              >
                ×
              </button>
            </div>
            <div className="lab-modal-body">
              <div className="lab-form-fields">
                <div className="lab-form-field">
                  <label htmlFor="staffName">Full Name *</label>
                  <input
                    id="staffName"
                    type="text"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="lab-form-field">
                  <label htmlFor="staffEmail">Email *</label>
                  <input
                    id="staffEmail"
                    type="email"
                    value={newStaff.email}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div className="lab-form-field">
                  <label htmlFor="staffRole">Role *</label>
                  <select
                    id="staffRole"
                    value={newStaff.role}
                    onChange={(e) =>
                      setNewStaff({
                        ...newStaff,
                        role: e.target.value as 'Lab Technician' | 'Lab Manager' | 'Lab Admin',
                      })
                    }
                  >
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Lab Manager">Lab Manager</option>
                    <option value="Lab Admin">Lab Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="lab-modal-footer">
              <button
                className="lab-btn lab-btn-secondary"
                onClick={() => setShowAddStaffModal(false)}
              >
                Cancel
              </button>
              <button
                className="lab-btn lab-btn-primary"
                onClick={handleAddStaff}
              >
                Add Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Remove Confirmation Modal */}
          {showRemoveConfirm && (
        <div className="lab-modal-overlay" onClick={() => setShowRemoveConfirm(null)}>
          <div className="lab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h2>Confirm Removal</h2>
              <button
                className="lab-modal-close"
                onClick={() => setShowRemoveConfirm(null)}
              >
                ×
              </button>
            </div>
            <div className="lab-modal-body">
              <p>Are you sure you want to remove this staff member?</p>
            </div>
            <div className="lab-modal-footer">
              <button
                className="lab-btn lab-btn-secondary"
                onClick={() => setShowRemoveConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="lab-btn lab-btn-danger"
                onClick={() => handleRemoveStaff(showRemoveConfirm)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default LabProfile;

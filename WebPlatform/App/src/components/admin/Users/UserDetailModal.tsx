import React, { useState, useEffect } from "react";
import ActivityLogViewer from "../ActivityLog/ActivityLogViewer";
import "../../../styles/adminActivityLog.css";
import api from "../../../lib/api";

interface User {
  id: string;
  email: string;
  role: string;
  account_status: string;
  registration_date: string;
  specialization?: {
    id: string;
    name: string;
  };
  full_name?: string;
  phone_number?: string;
  specialty?: string;
}

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose }) => {
  const [fullUserData, setFullUserData] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await api.get(`/admin/users/${user.id}`);
        console.log('Fetched user details:', response.data);
        // Extract the actual user data from the response
        setFullUserData(response.data.data);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setFullUserData(user);
      }
    };

    fetchUserDetails();
  }, [user.id]);

  const displayUser = fullUserData || user;

  if (!displayUser) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>User Details</h3>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p>Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>User Details</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-row">
            <label>Email:</label>
            <span>{displayUser.email || '—'}</span>
          </div>

          <div className="detail-row">
            <label>Role:</label>
            <span className={`role-badge ${(displayUser.role || '').toLowerCase()}`}>
              {displayUser.role || '—'}
            </span>
          </div>
          <div className="detail-row">
            <label>Status:</label>
            <span
              className={`status-badge ${(displayUser.account_status || '').toLowerCase().replace(" ", "-")}`}
            >
              {displayUser.account_status || '—'}
            </span>
          </div>

          <div className="detail-row">
            <label>Registration Date:</label>
            <span>{displayUser.registration_date ? new Date(displayUser.registration_date).toLocaleString() : '—'}</span>
          </div>

          {(displayUser.role === 'Doctor' || displayUser.role === 'doctor') && displayUser.specialization && (
            <div className="detail-row">
              <label>Specialization:</label>
              <span>{displayUser.specialization.name}</span>
            </div>
          )}

          {displayUser.full_name && (
            <div className="detail-row">
              <label>Full Name:</label>
              <span>{displayUser.full_name}</span>
            </div>
          )}

          {displayUser.phone_number && (
            <div className="detail-row">
              <label>Phone:</label>
              <span>{displayUser.phone_number}</span>
            </div>
          )}

          <div className="detail-row">
            <label>User ID:</label>
            <span className="user-id">{displayUser.id}</span>
          </div>

          <ActivityLogViewer userId={displayUser.id} />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;

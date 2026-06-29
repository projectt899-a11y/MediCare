import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserDetailModal from "./UserDetailModal";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_status: string;
  registration_date: string;
  created_at: string;
}

interface UserTableProps {
  users: User[];
  onRefresh: () => void;
  selectedUserIds?: Set<string>;
  onSelectionChange?: (userId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const UserTable: React.FC<UserTableProps> = ({ 
  users, 
  onRefresh,
  selectedUserIds = new Set(),
  onSelectionChange,
  onSelectAll,
  onDeselectAll
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const allSelected = users.length > 0 && users.every(user => selectedUserIds.has(user.id));
  const someSelected = users.some(user => selectedUserIds.has(user.id)) && !allSelected;

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectAll?.();
    } else {
      onDeselectAll?.();
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    onRefresh();
  };

  const getStatusBadge = (status: string) => {
    const statusClass = status.toLowerCase().replace(" ", "-");
    return <span className={`status-badge ${statusClass}`}>{status}</span>;
  };
  const getRoleBadge = (role: string) => {
    const roleClass = role.toLowerCase();
    return <span className={`role-badge ${roleClass}`}>{role}</span>;
  };

  return (
    <>
      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAllChange}
                  title={allSelected ? "Deselect all" : "Select all"}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={selectedUserIds.has(user.id) ? 'selected-row' : ''}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={(e) => onSelectionChange?.(user.id, e.target.checked)}
                  />
                </td>
                <td>{user.full_name || '—'}</td>
                <td className="email-cell">{user.email || '—'}</td>
                <td>{getRoleBadge(user.role)}</td>
                <td>{getStatusBadge(user.account_status)}</td>
                <td>{user.registration_date || user.created_at ? new Date(user.registration_date || user.created_at).toLocaleDateString() : '—'}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn view-btn"
                    onClick={() => handleViewDetails(user)}
                    title="View details"
                  >
                    <i className="fa-regular fa-eye" style={{color: "rgb(238, 239, 240)"}}></i> View
                  </button>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => navigate(`/admin/users/${user.id}/${user.role}`)}
                    title="Edit user"
                  >
                    <i className="fa-solid fa-pen-to-square" style={{ color: "rgb(15, 16, 16)"}}></i> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedUser && (
        <UserDetailModal user={selectedUser} onClose={handleCloseModal} />
      )}
    </>
  );
};

export default UserTable;

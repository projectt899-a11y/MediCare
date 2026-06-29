import React, { useState } from 'react';
import api from '../../../lib/api';

interface BulkSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onDeselectAll: () => void;
  onRefresh: () => void;
  selectedUserIds: Set<string>;
}

interface ConfirmDialogState {
  isOpen: boolean;
  action: 'delete' | 'disable' | 'enable' | 'change_role' | null;
  selectedRole?: string;
}

const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  onDeselectAll,
  onRefresh,
  selectedUserIds
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/admin/users/bulk-delete', {
        userIds: Array.from(selectedUserIds)
      });

      showMessage('success', `Successfully deleted ${response.data.data.deletedCount} user(s)`);
      onDeselectAll();
      onRefresh();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to delete users');
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    setIsLoading(true);
    try {
      const response = await api.patch('/admin/users/bulk-status', {
        userIds: Array.from(selectedUserIds),
        status
      });

      const action = status === 'active' ? 'enabled' : 'disabled';
      showMessage('success', `Successfully ${action} ${response.data.data.updatedCount} user(s)`);
      onDeselectAll();
      onRefresh();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to update user status');
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  const handleBulkRoleChange = async (role: string) => {
    setIsLoading(true);
    try {
      const response = await api.patch('/admin/users/bulk-role', {
        userIds: Array.from(selectedUserIds),
        role
      });

      showMessage('success', `Successfully changed role for ${response.data.data.updatedCount} user(s)`);
      onDeselectAll();
      onRefresh();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to change user roles');
    } finally {
      setIsLoading(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  const openConfirmDialog = (action: 'delete' | 'disable' | 'enable' | 'change_role', role?: string) => {
    setConfirmDialog({ isOpen: true, action, selectedRole: role });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, action: null });
  };

  return (
    <>
      <div className="bulk-selection-toolbar">
        <div className="toolbar-info">
          <span className="selection-count">{selectedCount} selected</span>
        </div>

        <div className="toolbar-actions">
          <button
            className="toolbar-btn btn-enable"
            onClick={() => openConfirmDialog('enable')}
            disabled={isLoading}
            title="Enable selected users"
          >
            <i className="fa-solid fa-check"></i> Enable
          </button>

          <button
            className="toolbar-btn btn-disable"
            onClick={() => openConfirmDialog('disable')}
            disabled={isLoading}
            title="Disable selected users"
          >
            <i className="fa-solid fa-ban"></i> Disable
          </button>

          <button
            className="toolbar-btn btn-role"
            onClick={() => openConfirmDialog('change_role')}
            disabled={isLoading}
            title="Change role for selected users"
          >
            <i className="fa-solid fa-user-tag"></i> Change Role
          </button>

          <button
            className="toolbar-btn btn-delete"
            onClick={() => openConfirmDialog('delete')}
            disabled={isLoading}
            title="Delete selected users"
          >
            <i className="fa-solid fa-trash"></i> Delete
          </button>

          <button
            className="toolbar-btn btn-cancel"
            onClick={onDeselectAll}
            disabled={isLoading}
            title="Deselect all"
          >
            <i className="fa-solid fa-times"></i> Cancel
          </button>
        </div>
      </div>

      {message && (
        <div className={`toolbar-message message-${message.type}`}>
          {message.type === 'success' ? (
            <i className="fa-solid fa-check-circle"></i>
          ) : (
            <i className="fa-solid fa-exclamation-circle"></i>
          )}
          <span>{message.text}</span>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="confirm-dialog-overlay" onClick={closeConfirmDialog}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            {confirmDialog.action === 'delete' && (
              <>
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete {selectedCount} user(s)? This action cannot be undone.</p>
                <div className="dialog-actions">
                  <button
                    className="btn-cancel-dialog"
                    onClick={closeConfirmDialog}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm-delete"
                    onClick={handleBulkDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}

            {confirmDialog.action === 'enable' && (
              <>
                <h3>Confirm Enable</h3>
                <p>Enable {selectedCount} user(s)?</p>
                <div className="dialog-actions">
                  <button
                    className="btn-cancel-dialog"
                    onClick={closeConfirmDialog}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={() => handleBulkStatusUpdate('active')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enabling...' : 'Enable'}
                  </button>
                </div>
              </>
            )}

            {confirmDialog.action === 'disable' && (
              <>
                <h3>Confirm Disable</h3>
                <p>Disable {selectedCount} user(s)?</p>
                <div className="dialog-actions">
                  <button
                    className="btn-cancel-dialog"
                    onClick={closeConfirmDialog}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={() => handleBulkStatusUpdate('inactive')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Disabling...' : 'Disable'}
                  </button>
                </div>
              </>
            )}

            {confirmDialog.action === 'change_role' && (
              <>
                <h3>Change Role</h3>
                <p>Select a new role for {selectedCount} user(s):</p>
                <div className="role-selection">
                  <select
                    className="role-select"
                    value={confirmDialog.selectedRole || ''}
                    onChange={(e) => setConfirmDialog({ ...confirmDialog, selectedRole: e.target.value })}
                  >
                    <option value="">Select a role...</option>
                    <option value="doctor">Doctor</option>
                    <option value="patient">Patient</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <div className="dialog-actions">
                  <button
                    className="btn-cancel-dialog"
                    onClick={closeConfirmDialog}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={() => {
                      if (confirmDialog.selectedRole) {
                        handleBulkRoleChange(confirmDialog.selectedRole);
                      }
                    }}
                    disabled={isLoading || !confirmDialog.selectedRole}
                  >
                    {isLoading ? 'Changing...' : 'Change Role'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BulkSelectionToolbar;

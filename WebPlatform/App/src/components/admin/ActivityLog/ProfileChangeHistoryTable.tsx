import React from 'react';

interface ProfileChange {
  id: string;
  userId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  isSensitive: boolean;
  changedBy: string;
  changedByName: string;
  changedAt: Date;
}

interface ProfileChangeHistoryTableProps {
  changes: ProfileChange[];
}

const ProfileChangeHistoryTable: React.FC<ProfileChangeHistoryTableProps> = ({ changes }) => {
  const sensitiveFields = ['email', 'phone', 'role'];

  return (
    <div className="profile-change-history-table-container">
      {changes.length === 0 ? (
        <div className="activity-log-empty">No profile changes found</div>
      ) : (
        <table className="profile-change-history-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Changed By</th>
              <th>Changed At</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <tr
                key={change.id}
                className={change.isSensitive ? 'sensitive-change' : ''}
              >
                <td>
                  <div className="field-name">
                    {change.isSensitive && (
                      <i className="fa-solid fa-lock" title="Sensitive field"></i>
                    )}
                    <span>{change.fieldName}</span>
                  </div>
                </td>
                <td className="old-value">{change.oldValue || '—'}</td>
                <td className="new-value">{change.newValue || '—'}</td>
                <td>
                  <span className="changed-by">
                    {change.changedByName}
                    {change.changedBy === change.userId && (
                      <span className="self-change"> (self)</span>
                    )}
                  </span>
                </td>
                <td>{new Date(change.changedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProfileChangeHistoryTable;

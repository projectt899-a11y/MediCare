import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import '../../../styles/adminSettings.css';

interface SettingsForm {
  siteName: string;
  siteDescription: string;
  adminEmail: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsForm>({
    siteName: 'Healthcare Management System',
    siteDescription: 'A comprehensive healthcare management platform',
    adminEmail: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const authUser = useAuthStore((state) => state.user);

  // Load admin email from authStore and set initial site name
  useEffect(() => {
    const adminEmail = authUser?.email || '';
    const savedSiteName = localStorage.getItem('siteName') || 'Healthcare Management System';
    
    setSettings(prev => ({
      ...prev,
      adminEmail,
      siteName: savedSiteName,
    }));

    // Set page title
    document.title = savedSiteName;
  }, [authUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));

    // Update page title in real-time if site name changes
    if (name === 'siteName') {
      document.title = value || 'Healthcare Management System';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Save site name to localStorage
      localStorage.setItem('siteName', settings.siteName);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage({
        type: 'success',
        text: 'Settings saved successfully!'
      });
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSiteName = 'Healthcare Management System';
      setSettings({
        siteName: defaultSiteName,
        siteDescription: 'A comprehensive healthcare management platform',
        adminEmail: settings.adminEmail,
      });
      localStorage.setItem('siteName', defaultSiteName);
      document.title = defaultSiteName;
      setSaveMessage({
        type: 'success',
        text: 'Settings reset to default values.'
      });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <p className="page-subtitle">Manage system configuration and preferences</p>
      </div>

      {saveMessage && (
        <div className={`message ${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="settings-form">
        {/* General Settings Section */}
        <div className="settings-section">
          <h3>General Settings</h3>
          
          <div className="form-group">
            <label htmlFor="siteName">Site Name</label>
            <input
              type="text"
              id="siteName"
              name="siteName"
              value={settings.siteName}
              onChange={handleInputChange}
              placeholder="Enter site name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="siteDescription">Site Description</label>
            <textarea
              id="siteDescription"
              name="siteDescription"
              value={settings.siteDescription}
              onChange={handleInputChange}
              placeholder="Enter site description"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminEmail">Admin Email</label>
            <input
              type="email"
              id="adminEmail"
              name="adminEmail"
              value={settings.adminEmail}
              onChange={handleInputChange}
              placeholder="Enter admin email"
              disabled
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-save"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : '💾 Save Settings'}
          </button>
          <button
            type="button"
            className="btn-reset"
            onClick={handleResetSettings}
            disabled={isSaving}
          >
            🔄 Reset to Default
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;

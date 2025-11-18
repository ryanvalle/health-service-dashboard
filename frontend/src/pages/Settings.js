import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

function Settings() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Get API docs URL based on environment
  const getAPIDocsURL = () => {
    // Check if running in Electron
    if (window.electron && window.electron.isElectron) {
      return 'http://localhost:3001/api-docs';
    }
    // In web mode, use relative path or full URL
    return window.location.origin + '/api-docs';
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      setRetentionDays(parseInt(response.data.retention_days) || 30);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await settingsAPI.updateRetention(retentionDays);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="form-container">
      <h1 className="form-title">Settings</h1>

      {message && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'} style={{
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Data Retention Period (days)</label>
          <input
            type="number"
            className="form-input"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value))}
            min="1"
            max="365"
            required
          />
          <span className="form-hint">
            Check history older than this will be automatically deleted. 
            Endpoint configurations are never deleted.
          </span>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#2c3e50' }}>About</h2>
        <p style={{ marginBottom: '0.5rem', color: '#7f8c8d' }}>
          <strong>Health Check Dashboard</strong> v1.0.0
        </p>
        <p style={{ marginBottom: '0.5rem', color: '#7f8c8d' }}>
          Monitor your services with automated health checks and detailed reporting.
        </p>
        {/* Hide API Documentation link in Electron builds */}
        {!(window.electron && window.electron.isElectron) && (
          <p style={{ color: '#7f8c8d' }}>
            API Documentation available at: <a href={getAPIDocsURL()} target="_blank" rel="noopener noreferrer">Open API Docs</a>
          </p>
        )}
      </div>
    </div>
  );
}

export default Settings;

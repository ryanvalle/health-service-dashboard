import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';
import { getTimezoneOptions, getSystemTimezone } from '../utils/dateUtils';

function Settings() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { timezone, setTimezone } = useTimezone();
  const timezoneOptions = getTimezoneOptions();

  // OpenAI settings
  const [openAIEnabled, setOpenAIEnabled] = useState(false);
  const [openAIApiKey, setOpenAIApiKey] = useState('');
  const [openAIResponseLimit, setOpenAIResponseLimit] = useState(1000);
  const [openAICustomPrompt, setOpenAICustomPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);

  // Notification settings
  const [resendEnabled, setResendEnabled] = useState(false);
  const [resendApiKey, setResendApiKey] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savingNotifications, setSavingNotifications] = useState(false);

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
    fetchDefaultPrompt();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      setRetentionDays(parseInt(response.data.retention_days) || 30);
      setOpenAIEnabled(response.data.openai_enabled === 'true');
      setOpenAIApiKey(response.data.openai_api_key || '');
      setOpenAIResponseLimit(parseInt(response.data.openai_response_limit) || 1000);
      setOpenAICustomPrompt(response.data.openai_custom_prompt || '');
      setResendEnabled(response.data.resend_enabled === 'true');
      setResendApiKey(response.data.resend_api_key || '');
      setNotificationEmail(response.data.notification_email || '');
      setLoading(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoading(false);
    }
  };

  const fetchDefaultPrompt = async () => {
    try {
      const response = await settingsAPI.getDefaultPrompt();
      setDefaultPrompt(response.data.default_prompt);
    } catch (err) {
      console.error('Failed to load default prompt:', err);
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

  const handleOpenAISubmit = async (e) => {
    e.preventDefault();
    setSavingOpenAI(true);
    setMessage(null);

    try {
      await settingsAPI.updateOpenAI({
        openai_enabled: openAIEnabled,
        openai_api_key: openAIApiKey,
        openai_response_limit: openAIResponseLimit,
        openai_custom_prompt: openAICustomPrompt
      });
      setMessage({ type: 'success', text: 'OpenAI settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update OpenAI settings' });
    } finally {
      setSavingOpenAI(false);
    }
  };

  const handleNotificationsSubmit = async (e) => {
    e.preventDefault();
    setSavingNotifications(true);
    setMessage(null);

    try {
      await settingsAPI.updateNotifications({
        resend_enabled: resendEnabled,
        resend_api_key: resendApiKey,
        notification_email: notificationEmail
      });
      setMessage({ type: 'success', text: 'Notification settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update notification settings' });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleTimezoneChange = (e) => {
    setTimezone(e.target.value);
    setMessage({ type: 'success', text: 'Timezone preference saved!' });
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
          <label className="form-label">Timezone Preference</label>
          <select
            className="form-input"
            value={timezone}
            onChange={handleTimezoneChange}
          >
            {timezoneOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="form-hint">
            Select your preferred timezone for displaying timestamps. 
            Currently using: <strong>{timezone === 'auto' ? getSystemTimezone() : timezone}</strong>
          </span>
        </div>

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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#2c3e50' }}>OpenAI Analysis</h2>
        <p style={{ marginBottom: '1.5rem', color: '#7f8c8d' }}>
          Enable AI-powered analysis of failed health checks. When a check fails, you can request an analysis 
          that provides insights into the failure and suggests potential solutions.
        </p>

        <form onSubmit={handleOpenAISubmit}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={openAIEnabled}
                onChange={(e) => setOpenAIEnabled(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>Enable OpenAI Analysis</span>
            </label>
            <span className="form-hint">
              Turn on AI-powered analysis for failed health checks
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">OpenAI API Key</label>
            <input
              type="password"
              className="form-input"
              value={openAIApiKey}
              onChange={(e) => setOpenAIApiKey(e.target.value)}
              placeholder="sk-..."
              disabled={!openAIEnabled}
            />
            <span className="form-hint">
              Your OpenAI API key. Get one from <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (window.electron && window.electron.isElectron) {
                    e.preventDefault();
                    window.electron.openExternal('https://platform.openai.com/api-keys');
                  }
                }}
              >OpenAI Platform</a>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Response Size Limit (tokens/words)</label>
            <input
              type="number"
              className="form-input"
              value={openAIResponseLimit}
              onChange={(e) => setOpenAIResponseLimit(parseInt(e.target.value))}
              min="100"
              max="4000"
              disabled={!openAIEnabled}
            />
            <span className="form-hint">
              Maximum length of AI analysis response (100-4000 tokens)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Default AI Prompt</label>
            <button
              type="button"
              className="btn"
              onClick={() => setShowDefaultPrompt(!showDefaultPrompt)}
              style={{ 
                marginBottom: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                background: '#e9ecef',
                color: '#495057'
              }}
            >
              {showDefaultPrompt ? '▼ Hide' : '▶ Show'} Default Prompt
            </button>
            {showDefaultPrompt && (
              <pre style={{ 
                padding: '1rem', 
                background: '#fff', 
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {defaultPrompt}
              </pre>
            )}
            <span className="form-hint">
              This is the default prompt used by the AI. You can override it below.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Custom Prompt Override (optional)</label>
            <textarea
              className="form-input"
              value={openAICustomPrompt}
              onChange={(e) => setOpenAICustomPrompt(e.target.value)}
              rows="6"
              placeholder="Leave empty to use the default prompt"
              disabled={!openAIEnabled}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <span className="form-hint">
              Override the default prompt with your own custom instructions for the AI
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingOpenAI}>
              {savingOpenAI ? 'Saving...' : 'Save OpenAI Settings'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#2c3e50' }}>Email Notifications</h2>
        <p style={{ marginBottom: '1.5rem', color: '#7f8c8d' }}>
          Get email notifications when health checks fail. Powered by <a 
            href="https://resend.com" 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => {
              if (window.electron && window.electron.isElectron) {
                e.preventDefault();
                window.electron.openExternal('https://resend.com');
              }
            }}
          >Resend</a>.
        </p>

        <form onSubmit={handleNotificationsSubmit}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={resendEnabled}
                onChange={(e) => setResendEnabled(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>Enable Email Notifications</span>
            </label>
            <span className="form-hint">
              Send email notifications when health checks fail
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Resend API Key</label>
            <input
              type="password"
              className="form-input"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              placeholder="re_..."
              disabled={!resendEnabled}
            />
            <span className="form-hint">
              Your Resend API key. Get one from <a 
                href="https://resend.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (window.electron && window.electron.isElectron) {
                    e.preventDefault();
                    window.electron.openExternal('https://resend.com/api-keys');
                  }
                }}
              >Resend Dashboard</a>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Notification Email</label>
            <input
              type="email"
              className="form-input"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="alerts@example.com"
              disabled={!resendEnabled}
            />
            <span className="form-hint">
              Email address to receive failure notifications
            </span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={savingNotifications}>
              {savingNotifications ? 'Saving...' : 'Save Notification Settings'}
            </button>
          </div>
        </form>
      </div>

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

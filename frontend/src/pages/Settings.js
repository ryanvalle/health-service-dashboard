import React, { useState, useEffect } from 'react';
import { settingsAPI, endpointsAPI } from '../services/api';
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

  // Data Management state
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [importSummary, setImportSummary] = useState(null);
  const [dataManagementLoading, setDataManagementLoading] = useState(false);

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
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      const response = await endpointsAPI.getAll();
      setEndpoints(response.data);
    } catch (err) {
      console.error('Failed to load endpoints:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      setRetentionDays(parseInt(response.data.retention_days) || 30);
      setOpenAIEnabled(response.data.openai_enabled === 'true');
      setOpenAIApiKey(response.data.openai_api_key || '');
      setOpenAIResponseLimit(parseInt(response.data.openai_response_limit) || 1000);
      setOpenAICustomPrompt(response.data.openai_custom_prompt || '');
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

  const handleTimezoneChange = (e) => {
    setTimezone(e.target.value);
    setMessage({ type: 'success', text: 'Timezone preference saved!' });
  };

  const handleExportClick = () => {
    setShowExportModal(true);
    setSelectedEndpoints([]);
  };

  const handleSelectAllEndpoints = (e) => {
    if (e.target.checked) {
      setSelectedEndpoints(endpoints.map(ep => ep.id));
    } else {
      setSelectedEndpoints([]);
    }
  };

  const handleEndpointSelection = (endpointId) => {
    setSelectedEndpoints(prev => {
      if (prev.includes(endpointId)) {
        return prev.filter(id => id !== endpointId);
      } else {
        return [...prev, endpointId];
      }
    });
  };

  const handleExport = async () => {
    setDataManagementLoading(true);
    try {
      const ids = selectedEndpoints.length > 0 ? selectedEndpoints : null;
      const response = await endpointsAPI.export(ids);
      const jsonString = JSON.stringify(response.data, null, 2);
      setExportData(jsonString);
      setMessage({ type: 'success', text: `Exported ${response.data.endpoints.length} endpoint(s)` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export endpoints' });
    } finally {
      setDataManagementLoading(false);
    }
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endpoints-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportData);
    setMessage({ type: 'success', text: 'Export data copied to clipboard!' });
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    setImportData('');
    setImportSummary(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportData(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    setDataManagementLoading(true);
    setImportSummary(null);
    try {
      const data = JSON.parse(importData);
      const response = await endpointsAPI.import(data);
      setImportSummary(response.data);
      setMessage({ type: 'success', text: 'Import completed successfully!' });
      // Refresh endpoints list
      await fetchEndpoints();
    } catch (err) {
      if (err.response?.data) {
        setMessage({ 
          type: 'error', 
          text: err.response.data.error + (err.response.data.details ? ': ' + err.response.data.details.join(', ') : '')
        });
      } else if (err instanceof SyntaxError) {
        setMessage({ type: 'error', text: 'Invalid JSON format' });
      } else {
        setMessage({ type: 'error', text: 'Failed to import endpoints' });
      }
    } finally {
      setDataManagementLoading(false);
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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#2c3e50' }}>Data Management</h2>
        <p style={{ marginBottom: '1.5rem', color: '#7f8c8d' }}>
          Export and import endpoint configurations to backup or migrate your health check setup.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleExportClick}
          >
            Export Endpoints
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleImportClick}
          >
            Import Endpoints
          </button>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Export Endpoints</h3>
              
              {!exportData ? (
                <>
                  <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
                    Select endpoints to export, or export all endpoints if none are selected.
                  </p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedEndpoints.length === endpoints.length && endpoints.length > 0}
                        onChange={handleSelectAllEndpoints}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <strong>Select All ({endpoints.length})</strong>
                    </label>
                  </div>

                  <div style={{ 
                    maxHeight: '300px', 
                    overflow: 'auto', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '4px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {endpoints.length === 0 ? (
                      <p style={{ color: '#7f8c8d', textAlign: 'center' }}>No endpoints available to export</p>
                    ) : (
                      endpoints.map(endpoint => (
                        <label 
                          key={endpoint.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '0.5rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEndpoints.includes(endpoint.id)}
                            onChange={() => handleEndpointSelection(endpoint.id)}
                            style={{ marginRight: '0.5rem' }}
                          />
                          <span>{endpoint.name} - {endpoint.url}</span>
                        </label>
                      ))
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn"
                      onClick={() => setShowExportModal(false)}
                      style={{ background: '#e9ecef', color: '#495057' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleExport}
                      disabled={dataManagementLoading || endpoints.length === 0}
                    >
                      {dataManagementLoading ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
                    Export completed. You can download the JSON file or copy it to clipboard.
                  </p>
                  
                  <textarea
                    value={exportData}
                    readOnly
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      padding: '1rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      marginBottom: '1rem'
                    }}
                  />

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn"
                      onClick={() => {
                        setShowExportModal(false);
                        setExportData('');
                        setSelectedEndpoints([]);
                      }}
                      style={{ background: '#e9ecef', color: '#495057' }}
                    >
                      Close
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleCopyExport}
                    >
                      Copy to Clipboard
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleDownloadExport}
                    >
                      Download JSON
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Import Endpoints</h3>
              
              {!importSummary ? (
                <>
                  <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
                    Upload a JSON file or paste the exported JSON data to import endpoints.
                  </p>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Upload File</label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Or Paste JSON Data</label>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      placeholder='{"schema_version": "1.0", "endpoints": [...]}'
                      style={{
                        width: '100%',
                        minHeight: '300px',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        padding: '1rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn"
                      onClick={() => setShowImportModal(false)}
                      style={{ background: '#e9ecef', color: '#495057' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleImport}
                      disabled={dataManagementLoading || !importData.trim()}
                    >
                      {dataManagementLoading ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    border: '1px solid #c3e6cb'
                  }}>
                    <strong>Import Summary</strong>
                    <p style={{ margin: '0.5rem 0 0 0' }}>
                      Total: {importSummary.summary.total} | 
                      Successful: {importSummary.summary.successful} | 
                      Failed: {importSummary.summary.failed}
                    </p>
                  </div>

                  {importSummary.results.successful.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ color: '#155724', marginBottom: '0.5rem' }}>
                        Successfully Imported ({importSummary.results.successful.length})
                      </h4>
                      <ul style={{ 
                        maxHeight: '200px', 
                        overflow: 'auto',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                      }}>
                        {importSummary.results.successful.map((endpoint, index) => (
                          <li key={index}>
                            <strong>{endpoint.name}</strong> - {endpoint.url}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importSummary.results.failed.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ color: '#721c24', marginBottom: '0.5rem' }}>
                        Failed to Import ({importSummary.results.failed.length})
                      </h4>
                      <ul style={{ 
                        maxHeight: '200px', 
                        overflow: 'auto',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f8d7da',
                        borderRadius: '4px'
                      }}>
                        {importSummary.results.failed.map((endpoint, index) => (
                          <li key={index}>
                            <strong>{endpoint.name}</strong> - {endpoint.url}
                            <br />
                            <small>Error: {endpoint.error}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => {
                        setShowImportModal(false);
                        setImportData('');
                        setImportSummary(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

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

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { endpointsAPI, analysisAPI, settingsAPI, checkResultsAPI } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';
import { formatTimestamp, formatRelativeTime, calculateNextCheckTime, formatChartTimestamp } from '../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

function EndpointDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [analyzingCheckId, setAnalyzingCheckId] = useState(null);
  const [openAIEnabled, setOpenAIEnabled] = useState(false);
  const [healthFilter, setHealthFilter] = useState('all'); // 'all', 'healthy', 'unhealthy'
  const [expandedResponseId, setExpandedResponseId] = useState(null);
  const { effectiveTimezone } = useTimezone();
  
  // Comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  useEffect(() => {
    fetchEndpoint();
    fetchHistory();
    fetchOpenAISettings();
    const interval = setInterval(() => {
      fetchEndpoint();
      fetchHistory();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEndpoint = async () => {
    try {
      const response = await endpointsAPI.getById(id);
      setEndpoint(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load endpoint details');
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await endpointsAPI.getHistory(id, 50);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const fetchOpenAISettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      setOpenAIEnabled(response.data.openai_enabled === 'true');
    } catch (err) {
      console.error('Failed to load OpenAI settings:', err);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await endpointsAPI.triggerCheck(id);
      // Wait a bit for the check to complete
      setTimeout(() => {
        fetchEndpoint();
        fetchHistory();
        setChecking(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to trigger check:', err);
      setChecking(false);
    }
  };

  const handleAnalyze = async (checkId) => {
    setAnalyzingCheckId(checkId);
    try {
      const response = await analysisAPI.analyzeCheckResult(id, checkId);
      // Update the history with the new analysis
      setHistory(prevHistory =>
        prevHistory.map(check =>
          check.id === checkId
            ? { ...check, ai_analysis: response.data.analysis, analyzed_at: response.data.analyzed_at }
            : check
        )
      );
    } catch (err) {
      console.error('Failed to analyze check result:', err);
      alert(err.response?.data?.error || 'Failed to analyze check result. Make sure OpenAI is configured in Settings.');
    } finally {
      setAnalyzingCheckId(null);
    }
  };

  const handleDeleteCheckResult = async (checkId) => {
    if (window.confirm('Are you sure you want to delete this check result? This will also update the uptime and response time statistics.')) {
      try {
        await checkResultsAPI.delete(checkId);
        // Refresh the endpoint and history to update statistics
        await fetchEndpoint();
        await fetchHistory();
      } catch (err) {
        console.error('Failed to delete check result:', err);
        alert('Failed to delete check result');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this endpoint?')) {
      try {
        await endpointsAPI.delete(id);
        navigate('/');
      } catch (err) {
        alert('Failed to delete endpoint');
      }
    }
  };

  // Comparison handlers
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
    setComparisonResult(null);
  };

  const handleSelectForCompare = (checkId) => {
    if (selectedForCompare.includes(checkId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== checkId));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, checkId]);
    }
  };

  const handleCompare = async () => {
    if (selectedForCompare.length !== 2) return;
    
    setComparing(true);
    try {
      const response = await analysisAPI.compareResponses(id, selectedForCompare[0], selectedForCompare[1]);
      setComparisonResult(response.data);
    } catch (err) {
      console.error('Failed to compare responses:', err);
      alert(err.response?.data?.error || 'Failed to compare responses. Make sure OpenAI is configured in Settings.');
    } finally {
      setComparing(false);
    }
  };

  const clearComparison = () => {
    setSelectedForCompare([]);
    setComparisonResult(null);
  };

  if (loading) {
    return <div className="loading">Loading endpoint details...</div>;
  }

  if (error || !endpoint) {
    return <div className="error-message">{error || 'Endpoint not found'}</div>;
  }

  const statusText = endpoint.latest_check?.is_healthy ? 'healthy' : 
                     endpoint.latest_check ? 'unhealthy' : 'unknown';

  // Prepare data for charts with formatted timestamps
  const responseTimeData = history.slice().reverse().map((check) => ({
    time: check.response_time || 0,
    timestamp: check.timestamp,
    label: formatChartTimestamp(check.timestamp, { timezone: effectiveTimezone })
  }));

  // Calculate uptime data over time (rolling calculation)
  const uptimeData = [];
  let healthyCount = 0;
  history.slice().reverse().forEach((check) => {
    if (check.is_healthy) healthyCount++;
    const uptimePercent = ((healthyCount / (uptimeData.length + 1)) * 100).toFixed(1);
    uptimeData.push({
      uptime: parseFloat(uptimePercent),
      timestamp: check.timestamp,
      label: formatChartTimestamp(check.timestamp, { timezone: effectiveTimezone })
    });
  });

  // Filter history based on health filter
  const filteredHistory = history.filter(check => {
    if (healthFilter === 'healthy') return check.is_healthy;
    if (healthFilter === 'unhealthy') return !check.is_healthy;
    return true; // 'all'
  });

  // Calculate next check time
  const nextCheckTime = calculateNextCheckTime(endpoint);
  const lastCheckTime = endpoint.latest_check?.timestamp;
  
  // Determine uptime color based on threshold
  const uptimePercent = parseFloat(endpoint.stats_30d?.uptime_percentage) || 0;
  const uptimeThreshold = endpoint.uptime_threshold || 90;
  const uptimeColor = uptimePercent >= uptimeThreshold ? '#2ecc71' : '#e74c3c';

  return (
    <div className="detail-container">
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{endpoint.name}</h1>
          <p className="endpoint-url">{endpoint.method} {endpoint.url}</p>
          {endpoint.tags && endpoint.tags.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {endpoint.tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    display: 'inline-block',
                    backgroundColor: '#e0e7ff',
                    color: '#4c51bf',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    marginRight: '0.25rem',
                    marginBottom: '0.25rem'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <span className={`status-badge status-${statusText}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
            {statusText}
          </span>
        </div>
        <div className="detail-actions">
          <button 
            className="btn btn-success" 
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? 'Checking...' : '🔄 Check Now'}
          </button>
          <Link to={`/endpoints/${id}/edit`} className="btn btn-primary">
            ✏️ Edit
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="detail-info">
        <div className="info-card">
          <div className="info-label">Uptime (30 days)</div>
          <div className="info-value" style={{ color: uptimeColor, fontWeight: 'bold' }}>
            {endpoint.stats_30d?.uptime_percentage || 0}%
          </div>
        </div>
        <div className="info-card">
          <div className="info-label">Average Response Time</div>
          <div className="info-value">{endpoint.stats_30d?.avg_response_time || 0}ms</div>
        </div>
        <div className="info-card">
          <div className="info-label">Total Checks (30d)</div>
          <div className="info-value">{endpoint.stats_30d?.total_checks || 0}</div>
        </div>
        <div className="info-card">
          <div className="info-label">Last Check</div>
          <div className="info-value">
            {lastCheckTime ? (
              <>
                <div>{formatTimestamp(lastCheckTime, { timezone: effectiveTimezone, format: 'full' })}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                  {formatRelativeTime(lastCheckTime)}
                </div>
              </>
            ) : 'Never'}
          </div>
        </div>
        <div className="info-card">
          <div className="info-label">Next Check</div>
          <div className="info-value">
            {nextCheckTime ? (
              <>
                <div>{formatTimestamp(nextCheckTime, { timezone: effectiveTimezone, format: 'full' })}</div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                  {formatRelativeTime(nextCheckTime)}
                </div>
              </>
            ) : endpoint.cron_schedule ? (
              <div style={{ fontSize: '0.85rem' }}>
                Cron: {endpoint.cron_schedule}
              </div>
            ) : 'Not scheduled'}
          </div>
        </div>
      </div>

      {Object.keys(endpoint.headers || {}).length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div className="info-card">
            <div className="info-label">Custom Headers</div>
            <div className="info-value">
              <pre style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
                {JSON.stringify(endpoint.headers, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="charts-section" style={{ marginTop: '2rem' }}>
          <h2 className="history-title">Performance Trends</h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Response Time Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}ms`, 'Response Time']}
                  labelFormatter={(label) => label}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#3498db" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Uptime Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={uptimeData} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="label" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Uptime (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Uptime']}
                  labelFormatter={(label) => label}
                />
                <Line 
                  type="monotone" 
                  dataKey="uptime" 
                  stroke="#2ecc71" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparison Result Modal */}
      {comparisonResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#2c3e50' }}>🔍 Response Comparison Analysis</h2>
              <button
                onClick={clearComparison}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div style={{ flex: 1 }}>
                <strong>Response 1:</strong>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {formatTimestamp(comparisonResult.checkResult1.timestamp, { timezone: effectiveTimezone, format: 'full' })}
                </div>
                <span className={`status-badge status-${comparisonResult.checkResult1.is_healthy ? 'healthy' : 'unhealthy'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  {comparisonResult.checkResult1.status_code || 'N/A'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <strong>Response 2:</strong>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {formatTimestamp(comparisonResult.checkResult2.timestamp, { timezone: effectiveTimezone, format: 'full' })}
                </div>
                <span className={`status-badge status-${comparisonResult.checkResult2.is_healthy ? 'healthy' : 'unhealthy'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  {comparisonResult.checkResult2.status_code || 'N/A'}
                </span>
              </div>
            </div>
            <div 
              style={{ 
                background: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#495057',
                lineHeight: '1.6'
              }}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(marked(comparisonResult.comparison)) 
              }}
            />
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '1rem' }}>
              Compared at {formatTimestamp(comparisonResult.compared_at, { timezone: effectiveTimezone, format: 'full' })}
            </div>
          </div>
        </div>
      )}

      <div className="history-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="history-title" style={{ margin: 0 }}>Check History</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Compare Mode Toggle */}
            {openAIEnabled && history.length >= 2 && (
              <button
                className={`btn ${compareMode ? 'btn-warning' : 'btn-secondary'}`}
                onClick={toggleCompareMode}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {compareMode ? '✕ Exit Compare' : '🔍 Compare Responses'}
              </button>
            )}
            <button
              className={`btn ${healthFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHealthFilter('all')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              All ({history.length})
            </button>
            <button
              className={`btn ${healthFilter === 'healthy' ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => setHealthFilter('healthy')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Healthy ({history.filter(c => c.is_healthy).length})
            </button>
            <button
              className={`btn ${healthFilter === 'unhealthy' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => setHealthFilter('unhealthy')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Unhealthy ({history.filter(c => !c.is_healthy).length})
            </button>
          </div>
        </div>

        {/* Compare Mode Instructions */}
        {compareMode && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Compare Mode:</strong> Select 2 responses to compare their differences using AI analysis.
              {selectedForCompare.length > 0 && (
                <span style={{ marginLeft: '1rem', color: '#856404' }}>
                  Selected: {selectedForCompare.length}/2
                </span>
              )}
            </div>
            {selectedForCompare.length === 2 && (
              <button
                className="btn btn-success"
                onClick={handleCompare}
                disabled={comparing}
                style={{ padding: '0.5rem 1rem' }}
              >
                {comparing ? '🔄 Comparing...' : '🔍 Compare Selected'}
              </button>
            )}
          </div>
        )}

        <div className="history-list">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <p className="empty-message">
                {history.length === 0 
                  ? 'No check history available yet'
                  : `No ${healthFilter} check results found`
                }
              </p>
            </div>
          ) : (
            filteredHistory.map(check => (
              <div 
                key={check.id} 
                className={`history-item ${check.is_healthy ? 'healthy' : 'unhealthy'}`}
                style={{
                  border: selectedForCompare.includes(check.id) ? '2px solid #ffc107' : undefined,
                  backgroundColor: selectedForCompare.includes(check.id) ? '#fffef0' : undefined
                }}
              >
                <div className="history-meta">
                  {/* Compare checkbox */}
                  {compareMode && (
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginRight: '1rem',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(check.id)}
                        onChange={() => handleSelectForCompare(check.id)}
                        disabled={!selectedForCompare.includes(check.id) && selectedForCompare.length >= 2}
                        style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        {selectedForCompare.indexOf(check.id) === 0 ? '1st' : 
                         selectedForCompare.indexOf(check.id) === 1 ? '2nd' : 'Select'}
                      </span>
                    </label>
                  )}
                  <span className="history-timestamp">
                    {formatTimestamp(check.timestamp, { 
                      timezone: effectiveTimezone, 
                      format: 'full' 
                    })}
                  </span>
                  <span className={`status-badge status-${check.is_healthy ? 'healthy' : 'unhealthy'}`}>
                    {check.is_healthy ? 'healthy' : 'unhealthy'}
                  </span>
                </div>
                <div className="history-details">
                  <div>
                    <strong>Status Code:</strong> {check.status_code || 'N/A'}
                  </div>
                  <div>
                    <strong>Response Time:</strong> {check.response_time}ms
                  </div>
                  {check.error_message && (
                    <div style={{ gridColumn: '1 / -1', color: '#e74c3c' }}>
                      <strong>Error:</strong> {check.error_message}
                    </div>
                  )}
                </div>
                {check.response_body && (
                  <div className="history-response">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Response Body:</strong>
                      {check.response_body.length > 500 && (
                        <button
                          onClick={() => setExpandedResponseId(expandedResponseId === check.id ? null : check.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          {expandedResponseId === check.id ? 'Show Less' : 'Show Full Response'}
                        </button>
                      )}
                    </div>
                    <div className="response-body" style={{ marginTop: '0.5rem' }}>
                      {expandedResponseId === check.id 
                        ? check.response_body 
                        : check.response_body.substring(0, 500) + (check.response_body.length > 500 ? '...' : '')
                      }
                    </div>
                  </div>
                )}
                
                {/* Action buttons */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDeleteCheckResult(check.id)}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
                
                {/* AI Analysis Section - Only show for unhealthy checks and when OpenAI is enabled */}
                {!check.is_healthy && openAIEnabled && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                    {check.ai_analysis ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#2c3e50' }}>🤖 Health-AI Analysis:</strong>
                          <button
                            onClick={() => handleAnalyze(check.id)}
                            disabled={analyzingCheckId === check.id}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.85rem'
                            }}
                          >
                            {analyzingCheckId === check.id ? '🔄 Re-analyzing...' : '🔄 Re-analyze'}
                          </button>
                        </div>
                        <div 
                          style={{ 
                            background: '#f8f9fa', 
                            padding: '1rem', 
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            color: '#495057',
                            lineHeight: '1.6'
                          }}
                          dangerouslySetInnerHTML={{ 
                            __html: DOMPurify.sanitize(marked(check.ai_analysis)) 
                          }}
                        />
                        {check.analyzed_at && (
                          <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                            Analyzed {formatRelativeTime(check.analyzed_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAnalyze(check.id)}
                        disabled={analyzingCheckId === check.id}
                        className="btn btn-primary"
                        style={{ 
                          padding: '0.5rem 1rem',
                          fontSize: '0.9rem',
                          width: '100%'
                        }}
                      >
                        {analyzingCheckId === check.id ? '🔄 Analyzing...' : '🤖 Why is it unhealth-AI?'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default EndpointDetail;

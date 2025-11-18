import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { endpointsAPI, analysisAPI } from '../services/api';
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
  const { effectiveTimezone } = useTimezone();

  useEffect(() => {
    fetchEndpoint();
    fetchHistory();
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

      <div className="history-section">
        <h2 className="history-title">Check History</h2>
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <p className="empty-message">No check history available yet</p>
            </div>
          ) : (
            history.map(check => (
              <div 
                key={check.id} 
                className={`history-item ${check.is_healthy ? 'healthy' : 'unhealthy'}`}
              >
                <div className="history-meta">
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
                    <strong>Response Body:</strong>
                    <div className="response-body">
                      {check.response_body.substring(0, 500)}
                      {check.response_body.length > 500 && '...'}
                    </div>
                  </div>
                )}
                
                {/* AI Analysis Section - Only show for unhealthy checks */}
                {!check.is_healthy && (
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

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { endpointsAPI } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';
import { formatTimestamp, formatRelativeTime, calculateNextCheckTime } from '../utils/dateUtils';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EndpointDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
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

  // Prepare data for charts
  const responseTimeData = history.slice().reverse().map((check, index) => ({
    name: index + 1,
    time: check.response_time || 0,
    timestamp: check.timestamp
  }));

  // Calculate uptime data over time (rolling calculation)
  const uptimeData = [];
  let healthyCount = 0;
  history.slice().reverse().forEach((check, index) => {
    if (check.is_healthy) healthyCount++;
    const uptimePercent = ((healthyCount / (index + 1)) * 100).toFixed(1);
    uptimeData.push({
      name: index + 1,
      uptime: parseFloat(uptimePercent),
      timestamp: check.timestamp
    });
  });

  // Pie chart data for uptime
  const uptimePercent = parseFloat(endpoint.stats_30d?.uptime_percentage) || 0;
  const downtimePercent = 100 - uptimePercent;
  const pieData = [
    { name: 'Uptime', value: parseFloat(uptimePercent.toFixed(2)) },
    { name: 'Downtime', value: parseFloat(downtimePercent.toFixed(2)) }
  ];
  const COLORS = ['#2ecc71', '#e74c3c'];

  // Calculate next check time
  const nextCheckTime = calculateNextCheckTime(endpoint);
  const lastCheckTime = endpoint.latest_check?.timestamp;

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
          <div className="info-value">{endpoint.stats_30d?.uptime_percentage || 0}%</div>
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
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  label={{ value: 'Check Number', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}ms`, 'Response Time']}
                  labelFormatter={(label) => `Check #${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#3498db" 
                  strokeWidth={2}
                  name="Response Time"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Uptime Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={uptimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  label={{ value: 'Check Number', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Uptime (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Uptime']}
                  labelFormatter={(label) => `Check #${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="uptime" 
                  stroke="#2ecc71" 
                  strokeWidth={2}
                  name="Uptime"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#555' }}>Uptime Distribution (30 days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default EndpointDetail;

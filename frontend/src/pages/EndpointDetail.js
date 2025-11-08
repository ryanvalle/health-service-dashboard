import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { endpointsAPI } from '../services/api';
import { format } from 'date-fns';

function EndpointDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchEndpoint();
    fetchHistory();
    const interval = setInterval(() => {
      fetchEndpoint();
      fetchHistory();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
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
          <div className="info-label">Check Frequency</div>
          <div className="info-value">
            {endpoint.cron_schedule || `${endpoint.check_frequency} min`}
          </div>
        </div>
      </div>

      <div className="detail-info">
        <div className="info-card">
          <div className="info-label">Expected Status Codes</div>
          <div className="info-value">{endpoint.expected_status_codes.join(', ')}</div>
        </div>
        <div className="info-card">
          <div className="info-label">Timeout</div>
          <div className="info-value">{endpoint.timeout}ms</div>
        </div>
        <div className="info-card">
          <div className="info-label">Response Time Threshold</div>
          <div className="info-value">
            {endpoint.response_time_threshold ? `${endpoint.response_time_threshold}ms` : 'None'}
          </div>
        </div>
        <div className="info-card">
          <div className="info-label">Status</div>
          <div className="info-value">{endpoint.is_active ? 'Active' : 'Inactive'}</div>
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
                    {format(new Date(check.timestamp), 'PPpp')}
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

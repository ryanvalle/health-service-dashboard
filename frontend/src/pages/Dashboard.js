import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { endpointsAPI } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';
import { formatTimestamp } from '../utils/dateUtils';

function Dashboard() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const { effectiveTimezone } = useTimezone();

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEndpoints = async () => {
    try {
      const response = await endpointsAPI.getAll();
      setEndpoints(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load endpoints');
      setLoading(false);
    }
  };

  const getStatusText = (endpoint) => {
    if (!endpoint.latest_check) return 'unknown';
    
    // Determine status based on uptime threshold
    const uptimePercent = parseFloat(endpoint.stats_7d?.uptime_percentage) || 0;
    const uptimeThreshold = endpoint.uptime_threshold || 90;
    
    return uptimePercent >= uptimeThreshold ? 'healthy' : 'unhealthy';
  };

  const getAllTags = () => {
    const tagsSet = new Set();
    endpoints.forEach(endpoint => {
      if (endpoint.tags && Array.isArray(endpoint.tags)) {
        endpoint.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || (endpoint.tags && endpoint.tags.includes(selectedTag));
    
    if (filter === 'all') return matchesSearch && matchesTag;
    return matchesSearch && matchesTag && getStatusText(endpoint) === filter;
  });

  if (loading) {
    return <div className="loading">Loading endpoints...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Service Health Dashboard</h1>
        <div className="dashboard-actions">
          <input
            type="text"
            className="search-box"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="form-select" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="unknown">Unknown</option>
          </select>
          <select 
            className="form-select" 
            value={selectedTag} 
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value="">All Tags</option>
            {getAllTags().map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <Link to="/endpoints/new" className="btn btn-primary">
            + Add Endpoint
          </Link>
        </div>
      </div>

      {filteredEndpoints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h2 className="empty-title">No endpoints found</h2>
          <p className="empty-message">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Get started by adding your first health check endpoint'}
          </p>
          {!searchTerm && filter === 'all' && (
            <Link to="/endpoints/new" className="btn btn-primary">
              Add Your First Endpoint
            </Link>
          )}
        </div>
      ) : (
        <div className="endpoints-grid">
          {filteredEndpoints.map(endpoint => (
            <Link 
              key={endpoint.id} 
              to={`/endpoints/${endpoint.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="endpoint-card">
                <div className="endpoint-header">
                  <div className="endpoint-info">
                    <h3>{endpoint.name}</h3>
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
                  </div>
                  <span className={`status-badge status-${getStatusText(endpoint)}`}>
                    {getStatusText(endpoint)}
                  </span>
                </div>

                <div className="endpoint-stats">
                  <div className="stat-item">
                    <span className="stat-label">Uptime (7d)</span>
                    <span 
                      className="stat-value"
                      style={{ 
                        color: (endpoint.stats_7d?.uptime_percentage || 0) >= (endpoint.uptime_threshold || 90) 
                          ? '#2ecc71' 
                          : '#e74c3c',
                        fontWeight: 'bold'
                      }}
                    >
                      {endpoint.stats_7d?.uptime_percentage || 0}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Response</span>
                    <span className="stat-value">
                      {endpoint.stats_7d?.avg_response_time || 0}ms
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Checks</span>
                    <span className="stat-value">
                      {endpoint.stats_7d?.total_checks || 0}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Last Check</span>
                    <span className="stat-value">
                      {endpoint.latest_check 
                        ? formatTimestamp(endpoint.latest_check.timestamp, { 
                            timezone: effectiveTimezone, 
                            format: 'time' 
                          })
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;

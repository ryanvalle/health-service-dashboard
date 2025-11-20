import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { endpointsAPI } from '../services/api';
import { useTimezone } from '../context/TimezoneContext';
import { formatTimestamp } from '../utils/dateUtils';
import { exportDashboardToPDF } from '../utils/pdfExport';

function Dashboard() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState(['healthy', 'unhealthy', 'unknown']);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [exportingPDF, setExportingPDF] = useState(false);
  const tagDropdownRef = useRef(null);
  const { effectiveTimezone } = useTimezone();

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagDropdownOpen(false);
      }
    };

    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagDropdownOpen]);

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
    
    // Determine status based on the most recent test
    return endpoint.latest_check.is_healthy ? 'healthy' : 'unhealthy';
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

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSelectAllTags = () => {
    setSelectedTags(getAllTags());
  };

  const handleDeselectAllTags = () => {
    setSelectedTags([]);
  };

  const toggleStatusFilter = (status) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const getStatusCounts = () => {
    const counts = {
      healthy: 0,
      unhealthy: 0,
      unknown: 0
    };
    
    endpoints.forEach(endpoint => {
      const status = getStatusText(endpoint);
      counts[status]++;
    });
    
    return counts;
  };

  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const groupEndpointsByFolder = (endpoints) => {
    const grouped = {};
    const NO_FOLDER = '__no_folder__';
    
    endpoints.forEach(endpoint => {
      const folder = endpoint.folder || NO_FOLDER;
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
      grouped[folder].push(endpoint);
    });
    
    return grouped;
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endpoint.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = selectedTags.length === 0 || 
                      (endpoint.tags && endpoint.tags.some(tag => selectedTags.includes(tag)));
    
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(getStatusText(endpoint));
    
    return matchesSearch && matchesTag && matchesStatus;
  });

  const groupedEndpoints = groupEndpointsByFolder(filteredEndpoints);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportDashboardToPDF('health-dashboard.pdf');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

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
          <div className="dashboard-actions-row">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="btn btn-primary pdf-hide"
              style={{ 
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {exportingPDF ? '📄 Generating PDF...' : '📄 Export to PDF'}
            </button>
            <input
              type="text"
              className="search-box pdf-hide"
              placeholder="Search endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={{ position: 'relative' }} ref={tagDropdownRef} className="pdf-hide">
            <button
              className="form-select"
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              style={{ 
                width: 'auto', 
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>
                {selectedTags.length === 0 
                  ? 'All Tags' 
                  : `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`}
              </span>
              <span style={{ marginLeft: '0.5rem' }}>▼</span>
            </button>
            {isTagDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '200px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                <div style={{ 
                  padding: '0.5rem',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={handleSelectAllTags}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAllTags}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Deselect All
                  </button>
                </div>
                {getAllTags().length === 0 ? (
                  <div style={{ padding: '0.75rem', color: '#999', fontSize: '0.875rem' }}>
                    No tags available
                  </div>
                ) : (
                  getAllTags().map(tag => (
                    <label
                      key={tag}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                      />
                      <span>{tag}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          </div>
          <div className="status-filter-buttons pdf-hide">
            {(() => {
              const statusCounts = getStatusCounts();
              const totalEndpoints = endpoints.length;
              
              return (
                <>
                  <button
                    onClick={() => toggleStatusFilter('healthy')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: selectedStatuses.includes('healthy') ? '2px solid #155724' : '2px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#d4edda',
                      color: '#155724',
                      fontWeight: selectedStatuses.includes('healthy') ? '600' : '500',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      opacity: selectedStatuses.includes('healthy') ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedStatuses.includes('healthy')) {
                        e.currentTarget.style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedStatuses.includes('healthy')) {
                        e.currentTarget.style.opacity = '0.6';
                      }
                    }}
                  >
                    <span>Healthy</span>
                    <span style={{ 
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      ({statusCounts.healthy} / {totalEndpoints})
                    </span>
                  </button>
                  <button
                    onClick={() => toggleStatusFilter('unhealthy')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: selectedStatuses.includes('unhealthy') ? '2px solid #721c24' : '2px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      fontWeight: selectedStatuses.includes('unhealthy') ? '600' : '500',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      opacity: selectedStatuses.includes('unhealthy') ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedStatuses.includes('unhealthy')) {
                        e.currentTarget.style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedStatuses.includes('unhealthy')) {
                        e.currentTarget.style.opacity = '0.6';
                      }
                    }}
                  >
                    <span>Unhealthy</span>
                    <span style={{ 
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      ({statusCounts.unhealthy} / {totalEndpoints})
                    </span>
                  </button>
                  <button
                    onClick={() => toggleStatusFilter('unknown')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: selectedStatuses.includes('unknown') ? '2px solid #856404' : '2px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#fff3cd',
                      color: '#856404',
                      fontWeight: selectedStatuses.includes('unknown') ? '600' : '500',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      opacity: selectedStatuses.includes('unknown') ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedStatuses.includes('unknown')) {
                        e.currentTarget.style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedStatuses.includes('unknown')) {
                        e.currentTarget.style.opacity = '0.6';
                      }
                    }}
                  >
                    <span>Unknown</span>
                    <span style={{ 
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      ({statusCounts.unknown} / {totalEndpoints})
                    </span>
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {filteredEndpoints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h2 className="empty-title">No endpoints found</h2>
          <p className="empty-message">
            {searchTerm || selectedStatuses.length < 3 || selectedTags.length > 0
              ? 'Try adjusting your search or filter' 
              : 'Get started by adding your first health check endpoint'}
          </p>
          {!searchTerm && selectedStatuses.length === 3 && selectedTags.length === 0 && (
            <Link to="/endpoints/new" className="btn btn-primary">
              Add Your First Endpoint
            </Link>
          )}
        </div>
      ) : (
        <div>
          {Object.entries(groupedEndpoints)
            .sort(([folderA], [folderB]) => {
              const NO_FOLDER = '__no_folder__';
              // Keep "Ungrouped Endpoints" at the end
              if (folderA === NO_FOLDER) return 1;
              if (folderB === NO_FOLDER) return -1;
              // Sort other folders alphabetically
              return folderA.localeCompare(folderB);
            })
            .map(([folderName, folderEndpoints]) => {
            const NO_FOLDER = '__no_folder__';
            const isNoFolder = folderName === NO_FOLDER;
            const displayName = isNoFolder ? 'Ungrouped Endpoints' : folderName;
            const isExpanded = expandedFolders[folderName] !== false; // Default to expanded
            
            return (
              <div key={folderName} style={{ marginBottom: '1.5rem' }}>
                <div 
                  onClick={() => toggleFolder(folderName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    transition: 'background-color 0.2s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                >
                  <span style={{ 
                    marginRight: '0.75rem', 
                    fontSize: '1.2rem',
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}>
                    ▶
                  </span>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.25rem', 
                    color: '#2c3e50',
                    flex: 1
                  }}>
                    {displayName}
                  </h2>
                  <span style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {folderEndpoints.length}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="endpoints-grid">
                    {folderEndpoints.map(endpoint => (
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
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;

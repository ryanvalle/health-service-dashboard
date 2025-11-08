import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { endpointsAPI } from '../services/api';

function EndpointForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    headers: '',
    expected_status_codes: '200',
    json_path_assertions: '',
    response_time_threshold: '',
    check_frequency: '5',
    cron_schedule: '',
    timeout: '30000',
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchEndpoint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEndpoint = async () => {
    try {
      const response = await endpointsAPI.getById(id);
      const endpoint = response.data;
      setFormData({
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        headers: JSON.stringify(endpoint.headers, null, 2),
        expected_status_codes: endpoint.expected_status_codes.join(','),
        json_path_assertions: JSON.stringify(endpoint.json_path_assertions, null, 2),
        response_time_threshold: endpoint.response_time_threshold || '',
        check_frequency: endpoint.check_frequency || '',
        cron_schedule: endpoint.cron_schedule || '',
        timeout: endpoint.timeout,
        is_active: endpoint.is_active
      });
    } catch (err) {
      setError('Failed to load endpoint');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse and prepare data
      const data = {
        name: formData.name,
        url: formData.url,
        method: formData.method,
        timeout: parseInt(formData.timeout),
        is_active: formData.is_active ? 1 : 0
      };

      // Parse headers
      if (formData.headers.trim()) {
        try {
          data.headers = JSON.parse(formData.headers);
        } catch (err) {
          throw new Error('Invalid JSON in headers');
        }
      }

      // Parse status codes
      if (formData.expected_status_codes.trim()) {
        data.expected_status_codes = formData.expected_status_codes
          .split(',')
          .map(code => parseInt(code.trim()))
          .filter(code => !isNaN(code));
      }

      // Parse JSON path assertions
      if (formData.json_path_assertions.trim()) {
        try {
          data.json_path_assertions = JSON.parse(formData.json_path_assertions);
        } catch (err) {
          throw new Error('Invalid JSON in assertions');
        }
      }

      // Response time threshold
      if (formData.response_time_threshold) {
        data.response_time_threshold = parseInt(formData.response_time_threshold);
      }

      // Scheduling
      if (formData.cron_schedule.trim()) {
        data.cron_schedule = formData.cron_schedule;
      } else if (formData.check_frequency) {
        data.check_frequency = parseInt(formData.check_frequency);
      }

      if (isEdit) {
        await endpointsAPI.update(id, data);
      } else {
        await endpointsAPI.create(data);
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to save endpoint');
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1 className="form-title">{isEdit ? 'Edit Endpoint' : 'Add New Endpoint'}</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            type="text"
            name="name"
            className="form-input"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="My API Service"
          />
        </div>

        <div className="form-group">
          <label className="form-label">URL *</label>
          <input
            type="url"
            name="url"
            className="form-input"
            value={formData.url}
            onChange={handleChange}
            required
            placeholder="https://api.example.com/health"
          />
        </div>

        <div className="form-group">
          <label className="form-label">HTTP Method</label>
          <select
            name="method"
            className="form-select"
            value={formData.method}
            onChange={handleChange}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Custom Headers (JSON)</label>
          <textarea
            name="headers"
            className="form-textarea"
            value={formData.headers}
            onChange={handleChange}
            placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
          />
          <span className="form-hint">Optional: Custom HTTP headers as JSON object</span>
        </div>

        <div className="form-group">
          <label className="form-label">Expected Status Codes</label>
          <input
            type="text"
            name="expected_status_codes"
            className="form-input"
            value={formData.expected_status_codes}
            onChange={handleChange}
            placeholder="200, 201, 204"
          />
          <span className="form-hint">Comma-separated list of acceptable status codes</span>
        </div>

        <div className="form-group">
          <label className="form-label">JSON Path Assertions (JSON Array)</label>
          <textarea
            name="json_path_assertions"
            className="form-textarea"
            value={formData.json_path_assertions}
            onChange={handleChange}
            placeholder='[{"path": "data.status", "operator": "equals", "value": "ok"}]'
          />
          <span className="form-hint">
            Optional: Array of assertions to validate response body. 
            Operators: equals, notEquals, contains, exists
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Response Time Threshold (ms)</label>
          <input
            type="number"
            name="response_time_threshold"
            className="form-input"
            value={formData.response_time_threshold}
            onChange={handleChange}
            placeholder="5000"
          />
          <span className="form-hint">Optional: Maximum acceptable response time in milliseconds</span>
        </div>

        <div className="form-group">
          <label className="form-label">Check Frequency (minutes)</label>
          <input
            type="number"
            name="check_frequency"
            className="form-input"
            value={formData.check_frequency}
            onChange={handleChange}
            placeholder="5"
            min="1"
          />
          <span className="form-hint">How often to run the health check (in minutes)</span>
        </div>

        <div className="form-group">
          <label className="form-label">Cron Schedule (Advanced)</label>
          <input
            type="text"
            name="cron_schedule"
            className="form-input"
            value={formData.cron_schedule}
            onChange={handleChange}
            placeholder="*/5 * * * *"
          />
          <span className="form-hint">
            Optional: Use cron expression for specific timing (overrides frequency). 
            Example: "*/5 * * * *" for every 5 minutes
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Timeout (ms)</label>
          <input
            type="number"
            name="timeout"
            className="form-input"
            value={formData.timeout}
            onChange={handleChange}
            min="1000"
            max="300000"
          />
          <span className="form-hint">Request timeout in milliseconds (1000-300000)</span>
        </div>

        <div className="form-group">
          <div className="checkbox-group">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <label htmlFor="is_active" className="form-label" style={{ marginBottom: 0 }}>
              Active (enable health checks)
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Endpoint' : 'Create Endpoint'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EndpointForm;

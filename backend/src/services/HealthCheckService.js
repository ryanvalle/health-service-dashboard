const axios = require('axios');
const CheckResult = require('../models/CheckResult');
const NotificationService = require('./NotificationService');
const db = require('../config/database');

class HealthCheckService {
  /**
   * Execute a health check for an endpoint
   */
  static async executeCheck(endpoint) {
    const startTime = Date.now();
    let result = {
      endpoint_id: endpoint.id,
      is_healthy: false,
      status_code: null,
      response_body: null,
      response_time: null,
      error_message: null
    };

    try {
      // Prepare axios config
      const config = {
        method: endpoint.method.toLowerCase(),
        url: endpoint.url,
        timeout: endpoint.timeout,
        headers: endpoint.headers || {},
        validateStatus: () => true // Don't throw on any status code
      };

      // Execute request
      const response = await axios(config);
      const endTime = Date.now();
      result.response_time = endTime - startTime;
      result.status_code = response.status;

      // Store response body (limit size to prevent database bloat)
      const responseBody = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      result.response_body = responseBody.substring(0, 10000); // Limit to 10KB

      // Validate status code
      const statusValid = endpoint.expected_status_codes.includes(response.status);

      // Validate response time
      const responseTimeValid = !endpoint.response_time_threshold 
        || result.response_time <= endpoint.response_time_threshold;

      // Validate JSON path assertions
      let jsonPathValid = true;
      if (endpoint.json_path_assertions && endpoint.json_path_assertions.length > 0) {
        jsonPathValid = this.validateJsonPathAssertions(
          response.data,
          endpoint.json_path_assertions
        );
      }

      // Determine overall health
      result.is_healthy = statusValid && responseTimeValid && jsonPathValid;

      if (!result.is_healthy) {
        const errors = [];
        if (!statusValid) {
          errors.push(`Expected status ${endpoint.expected_status_codes.join(' or ')}, got ${response.status}`);
        }
        if (!responseTimeValid) {
          errors.push(`Response time ${result.response_time}ms exceeded threshold ${endpoint.response_time_threshold}ms`);
        }
        if (!jsonPathValid) {
          errors.push('JSON path assertions failed');
        }
        result.error_message = errors.join('; ');
      }

    } catch (error) {
      const endTime = Date.now();
      result.response_time = endTime - startTime;
      result.is_healthy = false;
      
      if (error.code === 'ECONNABORTED') {
        result.error_message = `Request timeout after ${endpoint.timeout}ms`;
      } else if (error.code === 'ENOTFOUND') {
        result.error_message = `DNS lookup failed: ${error.message}`;
      } else if (error.code === 'ECONNREFUSED') {
        result.error_message = 'Connection refused';
      } else {
        result.error_message = error.message;
      }
    }

    // Save result to database
    await CheckResult.create(result);

    // Send notification if check failed
    if (!result.is_healthy) {
      try {
        const settings = await db.all('SELECT * FROM settings');
        const settingsObj = settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {});
        
        await NotificationService.sendFailureEmail(endpoint, result, settingsObj);
      } catch (error) {
        console.error('Error sending failure notification:', error);
        // Don't fail the health check if notification fails
      }
    }

    return result;
  }

  /**
   * Validate JSON path assertions
   */
  static validateJsonPathAssertions(data, assertions) {
    try {
      for (const assertion of assertions) {
        const { path, operator, value } = assertion;
        const actualValue = this.getValueByPath(data, path);

        switch (operator) {
          case 'equals':
            if (actualValue !== value) return false;
            break;
          case 'notEquals':
            if (actualValue === value) return false;
            break;
          case 'contains':
            if (!String(actualValue).includes(value)) return false;
            break;
          case 'exists':
            if (actualValue === undefined) return false;
            break;
          default:
            return false;
        }
      }
      return true;
    } catch (error) {
      console.error('JSON path assertion validation error:', error);
      return false;
    }
  }

  /**
   * Get value from object by path (e.g., 'data.status')
   */
  static getValueByPath(obj, path) {
    return path.split('.').reduce((current, prop) => {
      return current?.[prop];
    }, obj);
  }

  /**
   * Execute checks for all active endpoints
   */
  static async executeAllChecks(endpoints) {
    const results = [];
    for (const endpoint of endpoints) {
      if (endpoint.is_active) {
        try {
          const result = await this.executeCheck(endpoint);
          results.push({ endpoint: endpoint.name, result });
        } catch (error) {
          console.error(`Error checking endpoint ${endpoint.name}:`, error);
        }
      }
    }
    return results;
  }
}

module.exports = HealthCheckService;

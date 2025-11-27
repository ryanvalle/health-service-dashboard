const axios = require('axios');
const db = require('../config/database');
const { DEFAULT_PROMPT, DEFAULT_RESPONSE_LIMIT, COMPARISON_PROMPT } = require('../config/openai-config');

class OpenAIService {
  /**
   * Get OpenAI settings from database
   */
  static async getSettings() {
    const settings = await db.all('SELECT * FROM settings WHERE key LIKE "openai_%"');
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return {
      enabled: settingsObj.openai_enabled === 'true',
      apiKey: settingsObj.openai_api_key || '',
      responseLimit: parseInt(settingsObj.openai_response_limit) || DEFAULT_RESPONSE_LIMIT,
      customPrompt: settingsObj.openai_custom_prompt || ''
    };
  }

  /**
   * Check if OpenAI is enabled and configured
   */
  static async isConfigured() {
    const settings = await this.getSettings();
    return Boolean(settings.enabled && settings.apiKey && settings.apiKey.length > 0);
  }

  /**
   * Analyze a failed health check using OpenAI
   */
  static async analyzeCheckResult(endpoint, checkResult) {
    const settings = await this.getSettings();
    
    if (!settings.enabled) {
      throw new Error('OpenAI analysis is not enabled');
    }

    if (!settings.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Prepare the context for analysis
    const context = this.prepareAnalysisContext(endpoint, checkResult);
    const prompt = settings.customPrompt || DEFAULT_PROMPT;

    try {
      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: context }
          ],
          max_tokens: settings.responseLimit,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.response?.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OpenAI API request timeout');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  /**
   * Prepare analysis context from endpoint and check result
   */
  static prepareAnalysisContext(endpoint, checkResult) {
    const lines = [];
    
    lines.push('=== Health Check Failure Details ===\n');
    
    // Endpoint information
    lines.push(`Endpoint: ${endpoint.name}`);
    lines.push(`URL: ${endpoint.url}`);
    lines.push(`HTTP Method: ${endpoint.method}`);
    
    // Headers
    if (endpoint.headers && Object.keys(endpoint.headers).length > 0) {
      lines.push(`\nCustom Headers:`);
      for (const [key, value] of Object.entries(endpoint.headers)) {
        // Mask sensitive headers
        const maskedValue = this.maskSensitiveHeader(key, value);
        lines.push(`  ${key}: ${maskedValue}`);
      }
    }
    
    // Check result details
    lines.push(`\n=== Check Result ===`);
    lines.push(`Timestamp: ${checkResult.timestamp}`);
    
    if (checkResult.status_code) {
      lines.push(`HTTP Status Code: ${checkResult.status_code}`);
    }
    
    if (checkResult.response_time) {
      lines.push(`Response Time: ${checkResult.response_time}ms`);
    }
    
    if (checkResult.error_message) {
      lines.push(`\nError Message: ${checkResult.error_message}`);
    }
    
    if (checkResult.response_body) {
      lines.push(`\nResponse Body:`);
      // Limit response body to prevent token overuse
      const body = checkResult.response_body.substring(0, 2000);
      lines.push(body);
      if (checkResult.response_body.length > 2000) {
        lines.push('... (truncated)');
      }
    }
    
    // Expected behavior
    lines.push(`\n=== Expected Behavior ===`);
    lines.push(`Expected Status Codes: ${endpoint.expected_status_codes.join(', ')}`);
    
    if (endpoint.response_time_threshold) {
      lines.push(`Response Time Threshold: ${endpoint.response_time_threshold}ms`);
    }
    
    if (endpoint.json_path_assertions && endpoint.json_path_assertions.length > 0) {
      lines.push(`\nJSON Path Assertions:`);
      endpoint.json_path_assertions.forEach(assertion => {
        lines.push(`  ${assertion.path} ${assertion.operator} ${assertion.value}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Mask sensitive header values
   */
  static maskSensitiveHeader(key, value) {
    const sensitiveKeys = ['authorization', 'api-key', 'apikey', 'x-api-key', 'password', 'secret'];
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      if (value.length > 8) {
        return value.substring(0, 4) + '****' + value.substring(value.length - 4);
      }
      return '****';
    }
    
    return value;
  }

  /**
   * Store analysis result for a check
   */
  static async storeAnalysis(checkResultId, analysis) {
    await db.run(
      `UPDATE check_results 
       SET ai_analysis = ?, analyzed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [analysis, checkResultId]
    );
  }

  /**
   * Compare two response bodies using OpenAI
   */
  static async compareResponses(endpoint, checkResult1, checkResult2) {
    const settings = await this.getSettings();
    
    if (!settings.enabled) {
      throw new Error('OpenAI analysis is not enabled');
    }

    if (!settings.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Prepare the context for comparison
    const context = this.prepareComparisonContext(endpoint, checkResult1, checkResult2);

    try {
      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: COMPARISON_PROMPT },
            { role: 'user', content: context }
          ],
          max_tokens: settings.responseLimit,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // Longer timeout for potentially large comparisons
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.response?.status === 429) {
        throw new Error('OpenAI API rate limit exceeded');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OpenAI API request timeout');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  /**
   * Prepare comparison context from two check results
   */
  static prepareComparisonContext(endpoint, checkResult1, checkResult2) {
    const lines = [];
    
    lines.push('=== Response Comparison Request ===\n');
    
    // Endpoint information
    lines.push(`Endpoint: ${endpoint.name}`);
    lines.push(`URL: ${endpoint.url}`);
    lines.push(`HTTP Method: ${endpoint.method}`);
    
    // Response 1 details
    lines.push(`\n=== Response 1 (${checkResult1.timestamp}) ===`);
    lines.push(`Status Code: ${checkResult1.status_code || 'N/A'}`);
    lines.push(`Response Time: ${checkResult1.response_time || 'N/A'}ms`);
    lines.push(`Health Status: ${checkResult1.is_healthy ? 'Healthy' : 'Unhealthy'}`);
    if (checkResult1.error_message) {
      lines.push(`Error: ${checkResult1.error_message}`);
    }
    lines.push(`\nResponse Body 1:`);
    // Limit response body to prevent token overuse (8KB per response)
    const body1 = (checkResult1.response_body || '').substring(0, 8000);
    lines.push(body1);
    if ((checkResult1.response_body || '').length > 8000) {
      lines.push('... (truncated)');
    }

    // Response 2 details
    lines.push(`\n=== Response 2 (${checkResult2.timestamp}) ===`);
    lines.push(`Status Code: ${checkResult2.status_code || 'N/A'}`);
    lines.push(`Response Time: ${checkResult2.response_time || 'N/A'}ms`);
    lines.push(`Health Status: ${checkResult2.is_healthy ? 'Healthy' : 'Unhealthy'}`);
    if (checkResult2.error_message) {
      lines.push(`Error: ${checkResult2.error_message}`);
    }
    lines.push(`\nResponse Body 2:`);
    // Limit response body to prevent token overuse (8KB per response)
    const body2 = (checkResult2.response_body || '').substring(0, 8000);
    lines.push(body2);
    if ((checkResult2.response_body || '').length > 8000) {
      lines.push('... (truncated)');
    }
    
    return lines.join('\n');
  }
}

module.exports = OpenAIService;

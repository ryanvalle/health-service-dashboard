const db = require('../config/database');
const crypto = require('crypto');

class Endpoint {
  static async create(data) {
    const {
      name,
      url,
      method = 'GET',
      headers = {},
      expected_status_codes = [200],
      json_path_assertions = [],
      response_time_threshold,
      check_frequency,
      cron_schedule,
      timeout = 30000,
      uptime_threshold = 90,
      is_active = 1
    } = data;

    // Generate UUID for the endpoint
    const id = crypto.randomUUID();

    await db.run(
      `INSERT INTO endpoints (
        id, name, url, method, headers, expected_status_codes, 
        json_path_assertions, response_time_threshold, check_frequency, 
        cron_schedule, timeout, uptime_threshold, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        url,
        method,
        JSON.stringify(headers),
        JSON.stringify(expected_status_codes),
        JSON.stringify(json_path_assertions),
        response_time_threshold,
        check_frequency,
        cron_schedule,
        timeout,
        uptime_threshold,
        is_active
      ]
    );

    return this.findById(id);
  }

  static async findById(id) {
    const endpoint = await db.get('SELECT * FROM endpoints WHERE id = ?', [id]);
    if (endpoint) {
      return this.parse(endpoint);
    }
    return null;
  }

  static async findAll() {
    const endpoints = await db.all('SELECT * FROM endpoints ORDER BY created_at DESC');
    return endpoints.map(this.parse);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const updateFields = [
      'name', 'url', 'method', 'timeout', 'is_active',
      'response_time_threshold', 'check_frequency', 'cron_schedule', 'uptime_threshold'
    ];

    updateFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    // Handle JSON fields
    if (data.headers !== undefined) {
      fields.push('headers = ?');
      values.push(JSON.stringify(data.headers));
    }
    if (data.expected_status_codes !== undefined) {
      fields.push('expected_status_codes = ?');
      values.push(JSON.stringify(data.expected_status_codes));
    }
    if (data.json_path_assertions !== undefined) {
      fields.push('json_path_assertions = ?');
      values.push(JSON.stringify(data.json_path_assertions));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(
      `UPDATE endpoints SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  static async delete(id) {
    const result = await db.run('DELETE FROM endpoints WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static parse(endpoint) {
    if (!endpoint) return null;

    return {
      ...endpoint,
      headers: endpoint.headers ? JSON.parse(endpoint.headers) : {},
      expected_status_codes: endpoint.expected_status_codes 
        ? JSON.parse(endpoint.expected_status_codes) 
        : [200],
      json_path_assertions: endpoint.json_path_assertions 
        ? JSON.parse(endpoint.json_path_assertions) 
        : [],
      is_active: Boolean(endpoint.is_active)
    };
  }
}

module.exports = Endpoint;

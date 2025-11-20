const db = require('../config/database');

class CheckResult {
  static async create(data) {
    const {
      endpoint_id,
      is_healthy,
      status_code,
      response_body,
      response_time,
      error_message
    } = data;

    const result = await db.run(
      `INSERT INTO check_results (
        endpoint_id, is_healthy, status_code, response_body, 
        response_time, error_message
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        endpoint_id,
        is_healthy ? 1 : 0,
        status_code,
        response_body,
        response_time,
        error_message
      ]
    );

    return this.findById(result.lastID);
  }

  static async findById(id) {
    const result = await db.get('SELECT * FROM check_results WHERE id = ?', [id]);
    if (result) {
      return this.parse(result);
    }
    return null;
  }

  static async findByEndpointId(endpointId, limit = 100) {
    const results = await db.all(
      `SELECT * FROM check_results 
       WHERE endpoint_id = ? 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [endpointId, limit]
    );
    return results.map(this.parse);
  }

  static async getLatestByEndpointId(endpointId) {
    const result = await db.get(
      `SELECT * FROM check_results 
       WHERE endpoint_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [endpointId]
    );
    return result ? this.parse(result) : null;
  }

  static async getStats(endpointId, days = 7) {
    const stats = await db.get(
      `SELECT 
        COUNT(*) as total_checks,
        SUM(is_healthy) as healthy_checks,
        AVG(response_time) as avg_response_time,
        MIN(response_time) as min_response_time,
        MAX(response_time) as max_response_time
       FROM check_results 
       WHERE endpoint_id = ? 
         AND timestamp >= datetime('now', '-' || ? || ' days')`,
      [endpointId, days]
    );

    if (stats && stats.total_checks > 0) {
      return {
        total_checks: stats.total_checks,
        healthy_checks: stats.healthy_checks,
        uptime_percentage: ((stats.healthy_checks / stats.total_checks) * 100).toFixed(2),
        avg_response_time: stats.avg_response_time ? Math.round(stats.avg_response_time) : 0,
        min_response_time: stats.min_response_time || 0,
        max_response_time: stats.max_response_time || 0
      };
    }

    return {
      total_checks: 0,
      healthy_checks: 0,
      uptime_percentage: 0,
      avg_response_time: 0,
      min_response_time: 0,
      max_response_time: 0
    };
  }

  static async deleteOlderThan(days) {
    const result = await db.run(
      `DELETE FROM check_results 
       WHERE timestamp < datetime('now', '-' || ? || ' days')`,
      [days]
    );
    return result.changes;
  }

  static async delete(id) {
    const result = await db.run(
      'DELETE FROM check_results WHERE id = ?',
      [id]
    );
    return result.changes > 0;
  }

  static parse(result) {
    if (!result) return null;

    return {
      ...result,
      is_healthy: Boolean(result.is_healthy)
    };
  }
}

module.exports = CheckResult;

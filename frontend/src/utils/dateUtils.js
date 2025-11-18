// Utility functions for handling dates and timezones

/**
 * Parse a timestamp from the backend and convert it to a Date object.
 * Backend timestamps are in UTC format: "YYYY-MM-DD HH:MM:SS"
 * 
 * @param {string} timestamp - Timestamp string from backend
 * @returns {Date} Date object in local timezone
 */
export function parseTimestamp(timestamp) {
  if (!timestamp) return null;
  
  // If timestamp doesn't include timezone info, treat it as UTC
  // Backend stores as "YYYY-MM-DD HH:MM:SS" which should be interpreted as UTC
  if (!timestamp.includes('T') && !timestamp.includes('Z')) {
    // Convert to ISO format and append Z to indicate UTC
    const isoString = timestamp.replace(' ', 'T') + 'Z';
    return new Date(isoString);
  }
  
  return new Date(timestamp);
}

/**
 * Format a timestamp for display using user's locale and optionally a specific timezone
 * 
 * @param {string|Date} timestamp - Timestamp to format
 * @param {Object} options - Formatting options
 * @param {string} options.timezone - Optional timezone (e.g., 'America/New_York', 'UTC')
 * @param {string} options.format - Format type: 'full', 'date', 'time', 'relative'
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(timestamp, options = {}) {
  const date = timestamp instanceof Date ? timestamp : parseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'Invalid date';
  
  const { timezone, format = 'full' } = options;
  
  // Build options for Intl.DateTimeFormat
  const formatOptions = {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  if (format === 'full') {
    formatOptions.year = 'numeric';
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.second = '2-digit';
  } else if (format === 'date') {
    formatOptions.year = 'numeric';
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  } else if (format === 'time') {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.second = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
}

/**
 * Get a list of common timezones for the settings dropdown
 */
export function getTimezoneOptions() {
  return [
    { value: 'auto', label: 'Auto (Use System Timezone)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Europe/Athens', label: 'Eastern European Time' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { value: 'Pacific/Auckland', label: 'New Zealand (NZDT/NZST)' },
  ];
}

/**
 * Get the current system timezone
 */
export function getSystemTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a timestamp as relative time (e.g., "4 minutes ago", "in 2 minutes")
 * 
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  const date = timestamp instanceof Date ? timestamp : parseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.abs(Math.floor(diffMs / 1000));
  const isFuture = diffMs > 0;
  
  let value, unit;
  
  if (diffSec < 60) {
    value = diffSec;
    unit = 'second';
  } else if (diffSec < 3600) {
    value = Math.floor(diffSec / 60);
    unit = 'minute';
  } else if (diffSec < 86400) {
    value = Math.floor(diffSec / 3600);
    unit = 'hour';
  } else if (diffSec < 2592000) {
    value = Math.floor(diffSec / 86400);
    unit = 'day';
  } else if (diffSec < 31536000) {
    value = Math.floor(diffSec / 2592000);
    unit = 'month';
  } else {
    value = Math.floor(diffSec / 31536000);
    unit = 'year';
  }
  
  const plural = value !== 1 ? 's' : '';
  
  if (isFuture) {
    return `in ${value} ${unit}${plural}`;
  } else {
    return `${value} ${unit}${plural} ago`;
  }
}

/**
 * Calculate the next check time for an endpoint
 * 
 * @param {Object} endpoint - Endpoint object with latest_check and check_frequency
 * @returns {Date|null} Next check time or null if cannot be determined
 */
export function calculateNextCheckTime(endpoint) {
  if (!endpoint.is_active) return null;
  
  // For interval-based checks
  if (endpoint.check_frequency && endpoint.latest_check?.timestamp) {
    const lastCheck = parseTimestamp(endpoint.latest_check.timestamp);
    const intervalMs = endpoint.check_frequency * 60 * 1000;
    return new Date(lastCheck.getTime() + intervalMs);
  }
  
  // For cron-based checks, we can't easily calculate the next run time
  // without the node-cron library, so return null
  if (endpoint.cron_schedule) {
    return null;
  }
  
  return null;
}

/**
 * Format a timestamp for chart axis labels (e.g., "11/17 @ 7:04p")
 * 
 * @param {string|Date} timestamp - Timestamp to format
 * @param {Object} options - Formatting options
 * @param {string} options.timezone - Optional timezone
 * @returns {string} Formatted timestamp for chart axis
 */
export function formatChartTimestamp(timestamp, options = {}) {
  const date = timestamp instanceof Date ? timestamp : parseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  
  const { timezone } = options;
  
  const formatOptions = {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const formatted = new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  // Convert "11/17, 7:04 PM" to "11/17 @ 7:04p"
  return formatted
    .replace(', ', ' @ ')
    .replace(' AM', 'a')
    .replace(' PM', 'p');
}

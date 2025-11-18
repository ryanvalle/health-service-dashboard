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

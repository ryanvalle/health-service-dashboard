import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSystemTimezone } from '../utils/dateUtils';

const TimezoneContext = createContext();

export function TimezoneProvider({ children }) {
  // Load timezone preference from localStorage, default to 'auto'
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem('userTimezone');
    return saved || 'auto';
  });

  // Save timezone preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);

  // Get the effective timezone (resolve 'auto' to system timezone)
  const getEffectiveTimezone = () => {
    if (timezone === 'auto') {
      return getSystemTimezone();
    }
    return timezone;
  };

  const value = {
    timezone,
    setTimezone,
    effectiveTimezone: getEffectiveTimezone(),
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}

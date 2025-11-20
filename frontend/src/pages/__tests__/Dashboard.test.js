import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { endpointsAPI } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  endpointsAPI: {
    getAll: jest.fn()
  }
}));

// Mock the TimezoneContext
jest.mock('../../context/TimezoneContext', () => ({
  useTimezone: () => ({ effectiveTimezone: 'UTC' })
}));

// Mock the PDF export utilities
jest.mock('../../utils/pdfExport', () => ({
  exportDashboardToPDF: jest.fn()
}));

describe('Dashboard - Health Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display "healthy" status when latest check is healthy', async () => {
    const mockEndpoints = [
      {
        id: '1',
        name: 'Test Endpoint',
        url: 'https://api.example.com',
        method: 'GET',
        uptime_threshold: 90,
        latest_check: {
          id: 1,
          is_healthy: true,
          status_code: 200,
          timestamp: '2024-01-01T00:00:00Z'
        },
        stats_7d: {
          uptime_percentage: 50, // Below threshold, but should still show as healthy
          avg_response_time: 100,
          total_checks: 10
        }
      }
    ];

    endpointsAPI.getAll.mockResolvedValue({ data: mockEndpoints });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Endpoint')).toBeInTheDocument();
    });

    // Should show healthy status based on latest check, not uptime percentage
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('should display "unhealthy" status when latest check is unhealthy', async () => {
    const mockEndpoints = [
      {
        id: '2',
        name: 'Failing Endpoint',
        url: 'https://api.example.com',
        method: 'GET',
        uptime_threshold: 90,
        latest_check: {
          id: 2,
          is_healthy: false,
          status_code: 500,
          timestamp: '2024-01-01T00:00:00Z'
        },
        stats_7d: {
          uptime_percentage: 95, // Above threshold, but should still show as unhealthy
          avg_response_time: 100,
          total_checks: 10
        }
      }
    ];

    endpointsAPI.getAll.mockResolvedValue({ data: mockEndpoints });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failing Endpoint')).toBeInTheDocument();
    });

    // Should show unhealthy status based on latest check, not uptime percentage
    expect(screen.getByText('unhealthy')).toBeInTheDocument();
  });

  it('should display "unknown" status when no latest check exists', async () => {
    const mockEndpoints = [
      {
        id: '3',
        name: 'New Endpoint',
        url: 'https://api.example.com',
        method: 'GET',
        uptime_threshold: 90,
        latest_check: null,
        stats_7d: {
          uptime_percentage: 0,
          avg_response_time: 0,
          total_checks: 0
        }
      }
    ];

    endpointsAPI.getAll.mockResolvedValue({ data: mockEndpoints });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Endpoint')).toBeInTheDocument();
    });

    // Should show unknown status when no checks have run
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('should display healthy status even with low uptime percentage', async () => {
    const mockEndpoints = [
      {
        id: '4',
        name: 'Recently Fixed Endpoint',
        url: 'https://api.example.com',
        method: 'GET',
        uptime_threshold: 90,
        latest_check: {
          id: 4,
          is_healthy: true,
          status_code: 200,
          timestamp: '2024-01-01T00:00:00Z'
        },
        stats_7d: {
          uptime_percentage: 30, // Well below threshold
          avg_response_time: 100,
          total_checks: 10
        }
      }
    ];

    endpointsAPI.getAll.mockResolvedValue({ data: mockEndpoints });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recently Fixed Endpoint')).toBeInTheDocument();
    });

    // Should show healthy status based on latest check regardless of historical uptime
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('should display unhealthy status even with high uptime percentage', async () => {
    const mockEndpoints = [
      {
        id: '5',
        name: 'Recently Broken Endpoint',
        url: 'https://api.example.com',
        method: 'GET',
        uptime_threshold: 90,
        latest_check: {
          id: 5,
          is_healthy: false,
          status_code: 503,
          timestamp: '2024-01-01T00:00:00Z'
        },
        stats_7d: {
          uptime_percentage: 99, // Well above threshold
          avg_response_time: 100,
          total_checks: 10
        }
      }
    ];

    endpointsAPI.getAll.mockResolvedValue({ data: mockEndpoints });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recently Broken Endpoint')).toBeInTheDocument();
    });

    // Should show unhealthy status based on latest check regardless of historical uptime
    expect(screen.getByText('unhealthy')).toBeInTheDocument();
  });
});

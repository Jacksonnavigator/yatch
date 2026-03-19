import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OwnerDashboard from '../pages/OwnerDashboard';
import { AuthProvider } from '../context/AuthContext';
import { YachtProvider } from '../context/YachtContext';

// Mock bookingApi to avoid real network calls
jest.mock('../api/client', () => {
  const original = jest.requireActual('../api/client');
  return {
    ...original,
    bookingApi: {
      ...original.bookingApi,
      stats: jest.fn().mockResolvedValue({
        data: {
          total: 2,
          confirmed: 1,
          pending: 1,
          cancelled: 0,
          total_revenue: 5000,
          pending_revenue: 2500,
        },
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            reference: 'YB-123456',
            guest_name: 'Test Guest',
            guest_email: 'guest@example.com',
            charter_type: 'full_day',
            start_date: '2026-03-01',
            total_price: 2500,
            status: 'pending',
          },
        ],
      }),
    },
  };
});

function renderOwnerDashboard() {
  return render(
    <AuthProvider>
      <YachtProvider>
        <BrowserRouter>
          <OwnerDashboard />
        </BrowserRouter>
      </YachtProvider>
    </AuthProvider>
  );
}

test('owner dashboard shows revenue and recent bookings after load', async () => {
  renderOwnerDashboard();
  // Initial skeleton text
  expect(screen.getByText(/confirmed revenue/i)).toBeInTheDocument();

  // Wait for mocked data to appear
  const recentHeading = await screen.findByText(/recent bookings/i);
  expect(recentHeading).toBeInTheDocument();
  expect(screen.getByText(/YB-123456/)).toBeInTheDocument();
  expect(screen.getByText(/Test Guest/)).toBeInTheDocument();
});


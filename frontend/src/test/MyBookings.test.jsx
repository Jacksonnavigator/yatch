import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyBookings from '../pages/MyBookings';

jest.mock('../api/client', () => {
  const original = jest.requireActual('../api/client');
  return {
    ...original,
    bookingApi: {
      ...original.bookingApi,
      myBookings: jest.fn().mockResolvedValue({ data: [] }),
    },
  };
});

test('MyBookings shows empty state when no bookings', async () => {
  render(
    <BrowserRouter>
      <MyBookings />
    </BrowserRouter>
  );

  const title = await screen.findByText(/my bookings/i);
  expect(title).toBeInTheDocument();
  expect(await screen.findByText(/no bookings yet/i)).toBeInTheDocument();
});


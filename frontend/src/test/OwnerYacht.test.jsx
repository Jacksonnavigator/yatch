import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OwnerYacht from '../pages/OwnerYacht';
import { YachtProvider } from '../context/YachtContext';

jest.mock('../api/client', () => {
  const original = jest.requireActual('../api/client');
  return {
    ...original,
    yachtApi: {
      ...original.yachtApi,
      get: jest.fn().mockResolvedValue({
        data: {
          id: 1,
          name: 'Rock The Yatch',
          model: 'Sunseeker Predator 58',
          length_ft: 58,
          max_guests: 12,
          description: 'Test yacht',
          location: 'Mediterranean',
          amenities: [],
          images: [],
          videos: [],
          pricing: { full_day: 3200, half_day: 1800, hourly: 450, daily_multi: 2800 },
          blocked_dates: [],
        },
      }),
      getExtras: jest.fn().mockResolvedValue({ data: [] }),
    },
  };
});

test('OwnerYacht renders tabs and header', async () => {
  render(
    <YachtProvider>
      <BrowserRouter>
        <OwnerYacht />
      </BrowserRouter>
    </YachtProvider>
  );

  expect(await screen.findByText(/yacht management/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /images/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /pricing/i })).toBeInTheDocument();
});


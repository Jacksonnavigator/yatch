import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';

function renderWithProviders() {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    </AuthProvider>
  );
}

test('navbar shows guest links when not authenticated', () => {
  renderWithProviders();
  expect(screen.getByRole('link', { name: /book charter/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});


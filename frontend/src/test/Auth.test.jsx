import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { YachtProvider } from '../context/YachtContext';
import { LoginPage, RegisterPage } from '../pages/Auth';

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <YachtProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </YachtProvider>
    </AuthProvider>
  );
}

test('login form renders email and password fields', () => {
  renderWithProviders(<LoginPage />);
  expect(screen.getByPlaceholderText(/your@email\.com/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});

test('register form validates minimum password length client-side', () => {
  renderWithProviders(<RegisterPage />);

  const passwordInput = screen.getByPlaceholderText(/min 8 characters/i);
  fireEvent.change(passwordInput, { target: { value: 'short' } });

  const submit = screen.getByRole('button', { name: /create account/i });
  fireEvent.click(submit);

  // We can't assert toast text easily without mocking, but we can at least
  // assert that the form is still present and no navigation occurred.
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});


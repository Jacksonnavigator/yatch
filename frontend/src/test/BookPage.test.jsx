import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BookPage from '../pages/BookPage';
import { AuthProvider } from '../context/AuthContext';
import { YachtProvider } from '../context/YachtContext';

function renderBook() {
  return render(
    <AuthProvider>
      <YachtProvider>
        <BrowserRouter>
          <BookPage />
        </BrowserRouter>
      </YachtProvider>
    </AuthProvider>
  );
}

test('book page shows charter type step', () => {
  renderBook();
  expect(screen.getByText(/charter type/i)).toBeInTheDocument();
  expect(screen.getByText(/full-day charter/i)).toBeInTheDocument();
});

test('book page prevents advancing without date', () => {
  renderBook();
  // Go to step 2
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  const continueBtn = screen.getByRole('button', { name: /continue/i });
  expect(continueBtn).toBeDisabled();
});


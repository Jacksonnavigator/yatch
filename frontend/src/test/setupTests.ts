import '@testing-library/jest-dom';

// Mock window.scrollTo used in some components / router behaviour
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Prevent real network calls via axios/xhr from failing tests; jsdom's
// XMLHttpRequest will fail anyway, and components already handle errors.
// We rely on that behaviour instead of explicit mocks to keep setup minimal.



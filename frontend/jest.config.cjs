module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/styleMock.js',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  testMatch: ['**/src/**/*.test.(js|jsx|ts|tsx)'],
};


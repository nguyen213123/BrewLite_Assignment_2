const path = require('node:path');

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-with-at-least-32-characters-long-1234567890';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/../../tests/api'],
  testRegex: '.*\\.(e2e|integration)-spec\\.ts$',
  // The suites live outside this package but use its dependencies and TypeScript settings.
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: path.resolve(__dirname, '../../tests/api/tsconfig.json'),
    }],
  },
  setupFiles: ['<rootDir>/../../tests/api/setup.ts'],
};

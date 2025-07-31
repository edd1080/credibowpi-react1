module.exports = {
  displayName: 'Authentication Integration Tests',
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/stores/**/*.ts',
    'src/hooks/**/*.ts',
    '!src/services/**/*.test.ts',
    '!src/__tests__/**',
    '!src/services/bowpi/__tests__/**',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 15000, // 15 seconds for integration tests
  maxWorkers: 1, // Run integration tests sequentially to avoid conflicts
  verbose: true
};
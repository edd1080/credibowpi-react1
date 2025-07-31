module.exports = {
  displayName: 'Bowpi Services Tests',
  testMatch: ['<rootDir>/src/services/bowpi/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/services/bowpi/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/services/bowpi/**/*.ts',
    '!src/services/bowpi/**/*.test.ts',
    '!src/services/bowpi/__tests__/**',
    '!src/services/bowpi/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
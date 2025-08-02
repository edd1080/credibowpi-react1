module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/dual-auth-setup.js'],
  testMatch: [
    '**/src/services/auth/**/*.test.{js,ts,tsx}',
    '**/src/__tests__/dual-auth/**/*.test.{js,ts,tsx}',
    '**/src/__tests__/integration/DualAuthSystem.test.{js,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/services/auth/**/*.{js,ts,tsx}',
    '!src/services/auth/**/*.d.ts',
    '!src/services/auth/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  verbose: true,
};
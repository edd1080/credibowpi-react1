// Test setup for deployment verification tests

import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
}));

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
  digestStringAsync: jest.fn(() => Promise.resolve('mocked-hash')),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({
      success: true,
      code: '200',
      message: 'Success',
      data: 'mocked-data',
    }),
    text: () => Promise.resolve('mocked-text'),
    headers: new Map([['content-type', 'application/json']]),
  })
) as jest.Mock;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for actual test failures
};

// Mock __DEV__ for production testing
Object.defineProperty(global, '__DEV__', {
  writable: true,
  value: false, // Set to false for production deployment tests
});

// Mock environment variables for testing
process.env.EXPO_PUBLIC_BOWPI_BASE_URL = 'https://bowpi.credibowpi.com';
process.env.EXPO_PUBLIC_BOWPI_AUTH_URL = 'https://bowpi.credibowpi.com/micro-auth-service';
process.env.EXPO_PUBLIC_BOWPI_SESSION_URL = 'https://bowpi.credibowpi.com/management';
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.credibowpi.com';
process.env.EXPO_PUBLIC_ENCRYPTION_KEY = 'test-encryption-key-for-deployment-verification';
process.env.EXPO_PUBLIC_BUILD_TYPE = 'production';
process.env.EXPO_PUBLIC_APP_VERSION = '1.0.0';
process.env.EXPO_PUBLIC_METRICS_ENDPOINT = 'https://metrics.credibowpi.com/auth';
process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT = 'https://errors.credibowpi.com/report';
process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT = 'https://performance.credibowpi.com/metrics';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock Zustand store
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      isAuthenticated: false,
      user: null,
      bowpiToken: null,
      bowpiUserData: null,
      isOfflineMode: false,
      setBowpiAuth: jest.fn(),
      clearBowpiAuth: jest.fn(),
      setAuthenticated: jest.fn(),
      setUser: jest.fn(),
      setOfflineMode: jest.fn(),
    })),
  },
}));

// Setup test timeout
jest.setTimeout(30000);
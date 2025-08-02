// Dual Authentication Test Setup
// Specific setup for dual authentication system tests

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Date.now()),
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32))),
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash-' + Date.now())),
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  default: {
    SHA256: jest.fn(() => ({ toString: () => 'mock-hash' })),
    AES: {
      encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
      decrypt: jest.fn(() => ({ toString: () => 'decrypted-data' })),
    },
    enc: {
      Utf8: {
        parse: jest.fn(),
        stringify: jest.fn(() => 'utf8-string'),
      },
      Hex: {
        parse: jest.fn(),
        stringify: jest.fn(() => 'hex-string'),
      },
    },
    lib: {
      WordArray: {
        random: jest.fn(() => ({ toString: () => 'random-bytes' })),
      },
    },
  },
  SHA256: jest.fn(() => ({ toString: () => 'mock-hash' })),
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({ toString: () => 'decrypted-data' })),
  },
  enc: {
    Utf8: {
      parse: jest.fn(),
      stringify: jest.fn(() => 'utf8-string'),
    },
    Hex: {
      parse: jest.fn(),
      stringify: jest.fn(() => 'hex-string'),
    },
  },
  lib: {
    WordArray: {
      random: jest.fn(() => ({ toString: () => 'random-bytes' })),
    },
  },
}));

// Mock network info
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Bowpi services
jest.mock('../../services/BowpiAuthService', () => ({
  bowpiAuthService: {
    initialize: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentSessionId: jest.fn(),
    getNetworkStatus: jest.fn(() => ({
      isConnected: true,
      connectionType: 'wifi',
      isInternetReachable: true,
    })),
    canPerformAuthOperations: jest.fn(() => Promise.resolve({
      canLogin: true,
      canLogout: true,
      canRefresh: true,
      reason: 'All operations available',
    })),
    getDebugInfo: jest.fn(() => ({
      serviceState: {
        hasAdapter: true,
        isInitialized: true,
        lastActivity: Date.now(),
      },
      networkStatus: {
        isConnected: true,
        connectionType: 'wifi',
      },
      configuration: {
        baseUrl: 'http://localhost:7161',
      },
    })),
  },
}));

jest.mock('../../services/BowpiSecureStorageService', () => ({
  bowpiSecureStorageService: {
    initialize: jest.fn(),
    secureStore: jest.fn(),
    secureRetrieve: jest.fn(),
  },
}));

jest.mock('../../services/SecurityLoggingService', () => ({
  securityLoggingService: {
    logSecurityEvent: jest.fn(),
    logAuthEvent: jest.fn(),
  },
}));

jest.mock('../../services/BowpiErrorManager', () => ({
  bowpiErrorManager: {
    handleError: jest.fn(),
  },
}));

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});
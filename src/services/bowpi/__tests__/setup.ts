// Test setup for Bowpi services
import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
}));

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

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA512: 'SHA512',
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(() => ({
    toString: jest.fn(() => 'mocked-hmac-hash'),
  })),
  enc: {
    Hex: 'hex',
    Base64: 'base64',
  },
  AES: {
    encrypt: jest.fn(() => ({
      toString: jest.fn(() => 'encrypted-data'),
    })),
    decrypt: jest.fn(() => ({
      toString: jest.fn(() => 'decrypted-data'),
    })),
  },
}));

// Setup global mocks
global.fetch = jest.fn();
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString());

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      importKey: jest.fn(() => Promise.resolve({})),
      sign: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      verify: jest.fn(() => Promise.resolve(true)),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    },
  },
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Setup test timeouts
jest.setTimeout(10000); // 10 seconds

// Mock timers
beforeEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock responses
  createMockResponse: (data: any, status = 200, ok = true) => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map(),
  }),

  // Helper to create mock Bowpi response
  createMockBowpiResponse: (data: any, success = true, code = '200') => ({
    code,
    message: success ? 'Success' : 'Error',
    success,
    data,
  }),

  // Helper to create mock user data
  createMockUserData: (overrides = {}) => ({
    iss: 'bowpi-auth',
    aud: 'credibowpi-mobile',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub: 'user123',
    jti: 'token-id-123',
    userId: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    userProfile: {
      names: 'John',
      lastNames: 'Doe',
      documentType: 'CC',
      documentNumber: '12345678',
      phone: '1234567890',
      address: 'Test Address',
    },
    permissions: ['read', 'write'],
    roles: ['user'],
    ...overrides,
  }),

  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock credentials
  createMockCredentials: (overrides = {}) => ({
    username: 'testuser',
    password: 'testpassword',
    ...overrides,
  }),
};

// Type definitions for test utilities
declare global {
  var testUtils: {
    createMockResponse: (data: any, status?: number, ok?: boolean) => any;
    createMockBowpiResponse: (data: any, success?: boolean, code?: string) => any;
    createMockUserData: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    createMockCredentials: (overrides?: any) => any;
  };
}
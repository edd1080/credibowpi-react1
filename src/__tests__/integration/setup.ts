// Integration Test Setup
import 'react-native-gesture-handler/jestSetup';
import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Expo SecureStore
const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
};

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock NetInfo with controllable state
let mockNetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

const mockNetInfo = {
  fetch: jest.fn(() => Promise.resolve(mockNetworkState)),
  addEventListener: jest.fn(() => jest.fn()),
  configure: jest.fn(),
};

jest.mock('@react-native-community/netinfo', () => mockNetInfo);

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA512: 'SHA512',
  },
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

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  NavigationContainer: ({ children }: any) => children,
}));

// Mock React Navigation Stack
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Setup global fetch mock
global.fetch = jest.fn();

// Setup global crypto
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

// Setup base64 functions
global.btoa = jest.fn((str) => Buffer.from(str).toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString());

// Integration test utilities
export const integrationTestUtils = {
  // Network state control
  setNetworkState: (state: Partial<typeof mockNetworkState>) => {
    mockNetworkState = { ...mockNetworkState, ...state };
  },

  getNetworkState: () => mockNetworkState,

  // Storage utilities
  clearAllStorage: async () => {
    mockAsyncStorage.getItem.mockClear();
    mockAsyncStorage.setItem.mockClear();
    mockAsyncStorage.removeItem.mockClear();
    mockSecureStore.getItemAsync.mockClear();
    mockSecureStore.setItemAsync.mockClear();
    mockSecureStore.deleteItemAsync.mockClear();
  },

  // Mock storage data
  setStorageData: (key: string, value: any, secure = false) => {
    if (secure) {
      mockSecureStore.getItemAsync.mockImplementation((k) => 
        k === key ? Promise.resolve(JSON.stringify(value)) : Promise.resolve(null)
      );
    } else {
      mockAsyncStorage.getItem.mockImplementation((k) => 
        k === key ? Promise.resolve(JSON.stringify(value)) : Promise.resolve(null)
      );
    }
  },

  // Mock server responses
  mockServerResponse: (response: any, status = 200, ok = true) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: jest.fn().mockResolvedValue(response),
      text: jest.fn().mockResolvedValue(JSON.stringify(response)),
      headers: new Map(),
    });
  },

  // Mock server error
  mockServerError: (status: number, message: string) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      statusText: message,
      json: jest.fn().mockResolvedValue({
        code: status.toString(),
        message,
        success: false,
        data: null,
      }),
    });
  },

  // Mock network error
  mockNetworkError: (error: string) => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
  },

  // Create mock user data
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

  // Create mock Bowpi response
  createMockBowpiResponse: (data: any, success = true, code = '200') => ({
    code,
    message: success ? 'Success' : 'Error',
    success,
    data,
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Simulate network state change
  simulateNetworkChange: (newState: Partial<typeof mockNetworkState>) => {
    const oldState = { ...mockNetworkState };
    mockNetworkState = { ...mockNetworkState, ...newState };
    
    // Trigger network listeners if any
    const listeners = (mockNetInfo.addEventListener as jest.Mock).mock.calls;
    listeners.forEach(([, callback]) => {
      if (callback) callback(mockNetworkState);
    });

    return oldState;
  },

  // Reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    mockNetworkState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    };
  },
};

// Global setup
beforeEach(() => {
  integrationTestUtils.resetAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(15000);

export { mockAsyncStorage, mockSecureStore, mockNetInfo };
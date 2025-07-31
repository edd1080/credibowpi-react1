// Security & Performance Test Setup
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

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  addEventListener: jest.fn(() => jest.fn()),
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

// Setup global fetch mock
global.fetch = jest.fn();

// Setup global crypto with enhanced security testing capabilities
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      // Simulate cryptographically secure random values
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

// Performance monitoring utilities
export const performanceTestUtils = {
  // Measure execution time
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  },

  // Measure memory usage
  measureMemory: () => {
    if (process.memoryUsage) {
      return process.memoryUsage();
    }
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0
    };
  },

  // Create memory pressure
  createMemoryPressure: (sizeMB: number = 10) => {
    const arrays: any[] = [];
    const arraySize = 1024 * 1024; // 1MB
    
    for (let i = 0; i < sizeMB; i++) {
      arrays.push(new Array(arraySize).fill(Math.random()));
    }
    
    return () => {
      arrays.length = 0; // Cleanup
    };
  },

  // Simulate CPU intensive task
  simulateCPULoad: (durationMs: number) => {
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      // CPU intensive loop
      Math.random() * Math.random();
    }
  },

  // Wait for specified time
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate large data
  generateLargeData: (sizeKB: number) => {
    return 'x'.repeat(sizeKB * 1024);
  },

  // Performance benchmarks
  benchmarks: {
    FAST_OPERATION: 50, // < 50ms
    MEDIUM_OPERATION: 200, // < 200ms
    SLOW_OPERATION: 1000, // < 1000ms
    NETWORK_OPERATION: 3000, // < 3000ms
  }
};

// Security testing utilities
export const securityTestUtils = {
  // Generate test credentials
  generateCredentials: (options: { weak?: boolean; strong?: boolean } = {}) => {
    if (options.weak) {
      return {
        username: 'admin',
        password: '123456'
      };
    }
    
    if (options.strong) {
      return {
        username: 'user_' + Math.random().toString(36).substring(7),
        password: 'StrongP@ssw0rd!' + Math.random().toString(36).substring(7)
      };
    }
    
    return {
      username: 'testuser',
      password: 'testpassword'
    };
  },

  // Generate malicious payloads
  generateMaliciousPayloads: () => ({
    sqlInjection: "'; DROP TABLE users; --",
    xss: '<script>alert("XSS")</script>',
    pathTraversal: '../../../etc/passwd',
    commandInjection: '; rm -rf /',
    ldapInjection: '*)(uid=*',
    xmlBomb: '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">]><lolz>&lol;</lolz>',
    longString: 'A'.repeat(10000),
    nullBytes: 'test\x00.txt',
    unicodeOverlong: '\uFEFF\u202E',
  }),

  // Test for timing attacks
  measureTimingAttack: async (correctValue: string, testValue: string, compareFunction: (a: string, b: string) => Promise<boolean>) => {
    const iterations = 100;
    const correctTimes: number[] = [];
    const incorrectTimes: number[] = [];

    // Measure correct value timing
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await compareFunction(correctValue, correctValue);
      const end = process.hrtime.bigint();
      correctTimes.push(Number(end - start));
    }

    // Measure incorrect value timing
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await compareFunction(correctValue, testValue);
      const end = process.hrtime.bigint();
      incorrectTimes.push(Number(end - start));
    }

    const correctAvg = correctTimes.reduce((a, b) => a + b) / correctTimes.length;
    const incorrectAvg = incorrectTimes.reduce((a, b) => a + b) / incorrectTimes.length;
    
    return {
      correctAverage: correctAvg,
      incorrectAverage: incorrectAvg,
      timingDifference: Math.abs(correctAvg - incorrectAvg),
      isVulnerable: Math.abs(correctAvg - incorrectAvg) > correctAvg * 0.1 // 10% difference threshold
    };
  },

  // Test for sensitive data exposure
  checkSensitiveDataExposure: (data: any, sensitiveFields: string[] = ['password', 'token', 'secret', 'key']) => {
    const dataString = JSON.stringify(data).toLowerCase();
    const exposedFields: string[] = [];

    sensitiveFields.forEach(field => {
      if (dataString.includes(field.toLowerCase())) {
        exposedFields.push(field);
      }
    });

    return {
      isExposed: exposedFields.length > 0,
      exposedFields,
      dataString: dataString.substring(0, 200) + '...' // Truncated for safety
    };
  },

  // Generate entropy test data
  generateEntropyTestData: (length: number = 1000) => {
    const data: number[] = [];
    for (let i = 0; i < length; i++) {
      data.push(Math.floor(Math.random() * 256));
    }
    return data;
  },

  // Calculate entropy
  calculateEntropy: (data: number[]) => {
    const frequency: { [key: number]: number } = {};
    
    // Count frequencies
    data.forEach(byte => {
      frequency[byte] = (frequency[byte] || 0) + 1;
    });

    // Calculate entropy
    let entropy = 0;
    const length = data.length;
    
    Object.values(frequency).forEach(count => {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
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
};

// Global setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for security and performance tests
jest.setTimeout(30000); // 30 seconds

export { mockAsyncStorage, mockSecureStore };
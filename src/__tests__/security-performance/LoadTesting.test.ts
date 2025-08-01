/**
 * Load Testing for Authentication System
 * 
 * This test suite validates system performance under various load conditions:
 * - Concurrent user authentication
 * - High-volume data processing
 * - Memory and resource stress testing
 * - Network stress scenarios
 * - Long-running performance tests
 */

import { bowpiAuthService } from '../../services/BowpiAuthService';
import { BowpiCryptoService } from '../../Authentication/BowpiCryptoService';
import { BowpiHMACService } from '../../Authentication/BowpiHMACService';
import { BowpiOTPService } from '../../Authentication/BowpiOTPService';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorage';

// Test utilities
const performanceTestUtils = {
  measureTime: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  },

  measureMemory: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
  },

  generateLargeData: (sizeKB: number): string => {
    return 'x'.repeat(sizeKB * 1024);
  },

  waitFor: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  createMemoryPressure: (sizeMB: number) => {
    const data: string[] = [];
    const chunkSize = 1024 * 1024; // 1MB chunks
    for (let i = 0; i < sizeMB; i++) {
      data.push('x'.repeat(chunkSize));
    }
    return () => {
      data.length = 0;
    };
  },

  simulateCPULoad: (durationMs: number) => {
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      Math.random();
    }
  },

  benchmarks: {
    FAST_OPERATION: 50,      // 50ms
    MEDIUM_OPERATION: 200,   // 200ms
    SLOW_OPERATION: 1000,    // 1s
    NETWORK_OPERATION: 2000, // 2s
  }
};

const securityTestUtils = {
  generateCredentials: () => ({
    username: `testuser_${Date.now()}`,
    password: 'testpassword123'
  }),

  createMockUserData: (overrides = {}) => ({
    id: 'test-user-id',
    username: 'testuser',
    userProfile: {
      names: 'Test',
      lastNames: 'User',
      documentType: 'CC',
      documentNumber: '12345678',
      phone: '1234567890',
      address: 'Test Address',
      ...overrides
    }
  }),

  createMockBowpiResponse: (token: string | null) => ({
    success: true,
    data: token ? { token } : null,
    message: 'Success'
  }),

  mockServerResponse: (response: any) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response)
    });
  }
};

// Mock services
jest.mock('../../services/BowpiAuthService');
jest.mock('../../Authentication/BowpiCryptoService');
jest.mock('../../Authentication/BowpiHMACService');
jest.mock('../../Authentication/BowpiOTPService');
jest.mock('../../services/BowpiSecureStorage');

const authService = bowpiAuthService as jest.Mocked<typeof bowpiAuthService>;
const cryptoService = new BowpiCryptoService() as jest.Mocked<BowpiCryptoService>;
const hmacService = new BowpiHMACService() as jest.Mocked<BowpiHMACService>;
const otpService = new BowpiOTPService() as jest.Mocked<BowpiOTPService>;

// Mock global fetch
global.fetch = jest.fn();

describe('Load Testing - Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Concurrent Operations', () => {
    it('should handle mixed concurrent operations', async () => {
      const operationsPerType = 25;
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock responses for all operations
      for (let i = 0; i < operationsPerType * 4; i++) {
        securityTestUtils.mockServerResponse(mockResponse);
      }
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const operations = [];

        // Login operations
        for (let i = 0; i < operationsPerType; i++) {
          operations.push(
            authService.login({
              username: `user_${i}`,
              password: 'testpassword'
            })
          );
        }

        // Token validation operations
        for (let i = 0; i < operationsPerType; i++) {
          operations.push(authService.isAuthenticated());
        }

        // OTP generation operations
        for (let i = 0; i < operationsPerType; i++) {
          operations.push(otpService.generateOTPToken());
        }

        // HMAC operations
        for (let i = 0; i < operationsPerType; i++) {
          operations.push(
            hmacService.generateDigest(`test-data-${i}`, 'test-secret')
          );
        }

        return Promise.all(operations);
      });

      // Should handle mixed load efficiently
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 3);
    });

    it('should maintain performance with increasing concurrent users', async () => {
      const userCounts = [10, 25, 50, 75, 100];
      const results: { users: number; duration: number; avgPerUser: number }[] = [];

      for (const userCount of userCounts) {
        const credentials = securityTestUtils.generateCredentials();
        const mockUserData = securityTestUtils.createMockUserData();
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

        // Mock responses for current user count
        for (let i = 0; i < userCount; i++) {
          securityTestUtils.mockServerResponse(mockResponse);
        }
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { duration } = await performanceTestUtils.measureTime(async () => {
          const loginPromises = Array(userCount).fill(0).map((_, index) => 
            authService.login({
              ...credentials,
              username: `${credentials.username}_${index}`
            })
          );
          return Promise.all(loginPromises);
        });

        const avgPerUser = duration / userCount;
        results.push({ users: userCount, duration, avgPerUser });

        // Performance should not degrade significantly
        expect(avgPerUser).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
      }

      // Check that performance scales reasonably
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        
        // Average time per user should not increase dramatically
        const performanceRatio = current.avgPerUser / previous.avgPerUser;
        expect(performanceRatio).toBeLessThan(2); // Should not double
      }
    });
  });

  describe('High-Volume Data Processing', () => {
    it('should handle large token payloads efficiently', async () => {
      const payloadSizes = [1, 5, 10, 25, 50]; // KB
      const results: { size: number; duration: number }[] = [];

      for (const sizeKB of payloadSizes) {
        const largeProfile = {
          names: 'John',
          lastNames: 'Doe',
          documentType: 'CC',
          documentNumber: '12345678',
          phone: '1234567890',
          address: 'Test Address',
          largeData: performanceTestUtils.generateLargeData(sizeKB)
        };

        const mockUserData = securityTestUtils.createMockUserData({
          userProfile: largeProfile
        });

        const credentials = securityTestUtils.generateCredentials();
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');
        
        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        results.push({ size: sizeKB, duration });

        // Should handle large payloads within reasonable time
        const expectedMaxTime = performanceTestUtils.benchmarks.NETWORK_OPERATION + (sizeKB * 20);
        expect(duration).toBeLessThan(expectedMaxTime);
      }

      // Performance should scale reasonably with payload size
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        
        // Duration should not increase exponentially
        const scalingFactor = current.duration / previous.duration;
        expect(scalingFactor).toBeLessThan(3);
      }
    });

    it('should process high-volume HMAC operations', async () => {
      const operationCounts = [100, 500, 1000, 2000];
      const testData = 'test data for HMAC performance';
      const secret = 'test-secret-key';

      for (const operationCount of operationCounts) {
        const { duration } = await performanceTestUtils.measureTime(async () => {
          const promises = Array(operationCount).fill(0).map((_, index) =>
            hmacService.generateDigest(`${testData}-${index}`, secret)
          );
          await Promise.all(promises);
        });

        const averagePerOperation = duration / operationCount;
        expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.FAST_OPERATION);

        // Total time should scale reasonably
        const expectedMaxTime = operationCount * 10; // 10ms per operation max
        expect(duration).toBeLessThan(expectedMaxTime);
      }
    });
  });

  describe('Memory and Resource Stress Testing', () => {
    it('should handle memory-intensive authentication operations', async () => {
      const startMemory = performanceTestUtils.measureMemory();
      const operationCount = 50; // Reduced for test performance
      const credentials = securityTestUtils.generateCredentials();
      
      // Create large user profiles to stress memory
      const largeProfile = {
        names: 'John',
        lastNames: 'Doe',
        documentType: 'CC',
        documentNumber: '12345678',
        phone: '1234567890',
        address: 'Test Address',
        largeData: performanceTestUtils.generateLargeData(10) // 10KB per user
      };

      const mockUserData = securityTestUtils.createMockUserData({
        userProfile: largeProfile
      });

      // Perform many authentication operations
      for (let i = 0; i < operationCount; i++) {
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');
        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const result = await authService.login({
          ...credentials,
          username: `${credentials.username}_${i}`
        });
        expect(result.success).toBe(true);

        // Logout to clean up
        const logoutResponse = securityTestUtils.createMockBowpiResponse(null);
        securityTestUtils.mockServerResponse(logoutResponse);
        await authService.logout();
      }

      const endMemory = performanceTestUtils.measureMemory();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle resource exhaustion gracefully', async () => {
      const cleanup = performanceTestUtils.createMemoryPressure(50); // Reduced memory pressure
      
      try {
        const credentials = securityTestUtils.generateCredentials();
        const mockUserData = securityTestUtils.createMockUserData();
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        // Should still be able to authenticate under memory pressure
        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        expect(result.success).toBe(true);
        // May be slower under pressure but should still complete
        expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 5);
      } finally {
        cleanup();
      }
    });
  });

  describe('Network Stress Testing', () => {
    it('should handle network latency variations', async () => {
      const latencies = [100, 500, 1000]; // Reduced latencies for faster tests
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      for (const latency of latencies) {
        // Mock network response with specific latency
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
          new Promise(resolve =>
            setTimeout(() => resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(mockResponse)
            }), latency)
          )
        );

        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        expect(result.success).toBe(true);
        // Should wait for network response plus processing time
        expect(duration).toBeGreaterThan(latency * 0.9); // Allow 10% variance
        expect(duration).toBeLessThan(latency + performanceTestUtils.benchmarks.MEDIUM_OPERATION);
      }
    });

    it('should handle concurrent network requests efficiently', async () => {
      const concurrentRequests = 20; // Reduced for test performance
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock responses for all concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        securityTestUtils.mockServerResponse(mockResponse);
      }
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(concurrentRequests).fill(0).map((_, index) =>
          authService.login({
            ...credentials,
            username: `${credentials.username}_${index}`
          })
        );
        return Promise.all(promises);
      });

      // All requests should succeed
      expect(result.every(r => r.success)).toBe(true);
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 3);
      
      const averageTimePerRequest = duration / concurrentRequests;
      expect(averageTimePerRequest).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });
  });
});
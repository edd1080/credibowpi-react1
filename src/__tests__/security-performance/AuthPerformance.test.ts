// Performance Test: Authentication Operations Performance
import { securityTestUtils, performanceTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { BowpiOTPService } from '../../services/bowpi/BowpiOTPService';
import { BowpiHMACService } from '../../services/bowpi/BowpiHMACService';
import { BowpiCryptoService } from '../../services/bowpi/BowpiCryptoService';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';

describe('Authentication Performance Tests', () => {
  let authService: BowpiAuthService;
  let otpService: BowpiOTPService;
  let hmacService: BowpiHMACService;
  let cryptoService: BowpiCryptoService;

  beforeEach(() => {
    authService = new BowpiAuthService();
    otpService = new BowpiOTPService();
    hmacService = new BowpiHMACService();
    cryptoService = new BowpiCryptoService();
  });

  describe('Login Performance', () => {
    it('should complete login within performance benchmarks', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      securityTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION);
    });

    it('should handle concurrent login attempts efficiently', async () => {
      const concurrentLogins = 10;
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock multiple responses
      for (let i = 0; i < concurrentLogins; i++) {
        securityTestUtils.mockServerResponse(mockResponse);
      }
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(concurrentLogins).fill(0).map(() =>
          authService.login(credentials)
        );
        return Promise.all(promises);
      });

      expect(result.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 2);
    });

    it('should scale login performance with payload size', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const payloadSizes = [1, 10, 50, 100]; // KB

      for (const sizeKB of payloadSizes) {
        const largeProfile = {
          ...securityTestUtils.createMockUserData().userProfile,
          additionalData: performanceTestUtils.generateLargeData(sizeKB)
        };

        const mockUserData = securityTestUtils.createMockUserData({
          userProfile: largeProfile
        });

        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');
        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        expect(result.success).toBe(true);
        
        // Performance should scale reasonably with payload size
        const expectedMaxTime = performanceTestUtils.benchmarks.NETWORK_OPERATION + (sizeKB * 10);
        expect(duration).toBeLessThan(expectedMaxTime);
      }
    });

    it('should maintain performance under memory pressure', async () => {
      const cleanup = performanceTestUtils.createMemoryPressure(50); // 50MB pressure
      
      try {
        const credentials = securityTestUtils.generateCredentials();
        const mockUserData = securityTestUtils.createMockUserData();
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 1.5);
      } finally {
        cleanup();
      }
    });

    it('should handle login retries efficiently', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock first two calls to fail, third to succeed
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue(mockResponse)
        });

      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      expect(result.success).toBe(true);
      // Should complete within reasonable time even with retries
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 3);
    });
  });

  describe('Token Operations Performance', () => {
    it('should generate OTP tokens efficiently', async () => {
      const iterations = 100;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await performanceTestUtils.measureTime(() =>
          otpService.generateOTPToken()
        );
        durations.push(duration);
      }

      const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(averageDuration).toBeLessThan(performanceTestUtils.benchmarks.FAST_OPERATION);
      expect(maxDuration).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should generate HMAC digests efficiently', async () => {
      const testData = 'test data for HMAC performance';
      const secret = 'test-secret-key';
      const iterations = 100;

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(iterations).fill(0).map(() =>
          hmacService.generateDigest(testData, secret)
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / iterations;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.FAST_OPERATION);
    });

    it('should handle large HMAC payloads efficiently', async () => {
      const secret = 'test-secret-key';
      const payloadSizes = [1, 10, 100, 1000]; // KB

      for (const sizeKB of payloadSizes) {
        const largeData = performanceTestUtils.generateLargeData(sizeKB);
        
        const { duration } = await performanceTestUtils.measureTime(() =>
          hmacService.generateDigest(largeData, secret)
        );

        // Should scale reasonably with data size
        const expectedMaxTime = Math.min(sizeKB * 5, performanceTestUtils.benchmarks.SLOW_OPERATION);
        expect(duration).toBeLessThan(expectedMaxTime);
      }
    });

    it('should decrypt tokens efficiently', async () => {
      const mockUserData = securityTestUtils.createMockUserData();
      jest.spyOn(cryptoService as any, 'performDecryption').mockResolvedValue(mockUserData);

      const iterations = 50;
      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(iterations).fill(0).map(() =>
          cryptoService.decryptToken('mock-encrypted-token')
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / iterations;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should validate tokens efficiently', async () => {
      const validToken = securityTestUtils.createMockUserData();
      const iterations = 100;

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(iterations).fill(0).map(() =>
          cryptoService.validateTokenStructure(validToken)
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / iterations;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.FAST_OPERATION);
    });
  });

  describe('Storage Performance', () => {
    it('should store data efficiently', async () => {
      const testData = 'performance test data';
      const iterations = 100;

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(iterations).fill(0).map((_, i) =>
          bowpiSecureStorage.secureStore(`perf-test-${i}`, `${testData}-${i}`)
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / iterations;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should retrieve data efficiently', async () => {
      const testData = 'performance test data';
      const keys: string[] = [];

      // Setup test data
      for (let i = 0; i < 50; i++) {
        const key = `perf-retrieve-${i}`;
        keys.push(key);
        await bowpiSecureStorage.secureStore(key, `${testData}-${i}`);
      }

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = keys.map(key =>
          bowpiSecureStorage.secureRetrieve(key)
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / keys.length;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should handle large data storage efficiently', async () => {
      const dataSizes = [1, 10, 100, 500]; // KB

      for (const sizeKB of dataSizes) {
        const largeData = performanceTestUtils.generateLargeData(sizeKB);
        const key = `large-data-${sizeKB}kb`;

        const { duration: storeTime } = await performanceTestUtils.measureTime(() =>
          bowpiSecureStorage.secureStore(key, largeData)
        );

        const { duration: retrieveTime } = await performanceTestUtils.measureTime(() =>
          bowpiSecureStorage.secureRetrieve(key)
        );

        // Performance should scale reasonably with data size
        const expectedMaxTime = Math.min(sizeKB * 2, performanceTestUtils.benchmarks.SLOW_OPERATION);
        expect(storeTime).toBeLessThan(expectedMaxTime);
        expect(retrieveTime).toBeLessThan(expectedMaxTime);
      }
    });

    it('should handle concurrent storage operations', async () => {
      const concurrentOps = 20;
      const testData = 'concurrent test data';

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const storePromises = Array(concurrentOps).fill(0).map((_, i) =>
          bowpiSecureStorage.secureStore(`concurrent-${i}`, `${testData}-${i}`)
        );

        const retrievePromises = Array(concurrentOps).fill(0).map((_, i) =>
          bowpiSecureStorage.secureRetrieve(`concurrent-${i}`)
        );

        await Promise.all([...storePromises, ...retrievePromises]);
      });

      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
    });
  });

  describe('Session Management Performance', () => {
    it('should validate sessions efficiently', async () => {
      // Setup authenticated session
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      securityTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      await authService.login(credentials);

      const iterations = 50;
      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(iterations).fill(0).map(() =>
          authService.isAuthenticated()
        );
        await Promise.all(promises);
      });

      const averagePerOperation = duration / iterations;
      expect(averagePerOperation).toBeLessThan(performanceTestUtils.benchmarks.FAST_OPERATION);
    });

    it('should refresh tokens efficiently', async () => {
      const mockResponse = securityTestUtils.createMockBowpiResponse('new-refreshed-token');
      securityTestUtils.mockServerResponse(mockResponse);

      const mockUserData = securityTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.refreshToken()
      );

      expect(result).toBe(true);
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION);
    });

    it('should logout efficiently', async () => {
      // Setup authenticated session
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const loginResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      securityTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Test logout performance
      const logoutResponse = securityTestUtils.createMockBowpiResponse(null);
      securityTestUtils.mockServerResponse(logoutResponse);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.logout()
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION);
    });

    it('should handle session cleanup efficiently', async () => {
      const sessionCount = 100;
      
      // Create multiple sessions
      for (let i = 0; i < sessionCount; i++) {
        await bowpiSecureStorage.secureStore(`session-${i}`, `session-data-${i}`);
      }

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const deletePromises = Array(sessionCount).fill(0).map((_, i) =>
          bowpiSecureStorage.secureDelete(`session-${i}`)
        );
        await Promise.all(deletePromises);
      });

      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during authentication operations', async () => {
      const startMemory = performanceTestUtils.measureMemory();
      const iterations = 50;

      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      for (let i = 0; i < iterations; i++) {
        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const result = await authService.login(credentials);
        expect(result.success).toBe(true);

        // Logout to clean up
        const logoutResponse = securityTestUtils.createMockBowpiResponse(null);
        securityTestUtils.mockServerResponse(logoutResponse);
        await authService.logout();
      }

      const endMemory = performanceTestUtils.measureMemory();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Should not have significant memory leaks
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });

    it('should handle large user profiles efficiently', async () => {
      const profileSizes = [1, 10, 50, 100]; // KB

      for (const sizeKB of profileSizes) {
        const startMemory = performanceTestUtils.measureMemory();

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

        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 1.5);

        const endMemory = performanceTestUtils.measureMemory();
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

        // Memory usage should be reasonable relative to data size
        expect(memoryUsed).toBeLessThan(sizeKB * 1024 * 5); // Max 5x the data size
      }
    });

    it('should garbage collect efficiently', async () => {
      const startMemory = performanceTestUtils.measureMemory();

      // Create temporary large objects
      const largeObjects = Array(100).fill(0).map(() => ({
        data: performanceTestUtils.generateLargeData(10), // 10KB each
        timestamp: Date.now()
      }));

      const peakMemory = performanceTestUtils.measureMemory();

      // Clear references
      largeObjects.length = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for potential GC
      await performanceTestUtils.waitFor(100);

      const endMemory = performanceTestUtils.measureMemory();

      // Memory should be reclaimed
      const memoryReclaimed = peakMemory.heapUsed - endMemory.heapUsed;
      expect(memoryReclaimed).toBeGreaterThan(0);
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock slow network response
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), 2000) // 2 second delay
        )
      );

      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(1900); // Should wait for slow response
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 2);
    });

    it('should timeout appropriately on very slow networks', async () => {
      const credentials = securityTestUtils.generateCredentials();

      // Mock extremely slow response (longer than timeout)
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({})
          }), 10000) // 10 second delay
        )
      );

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      expect(result.success).toBe(false);
      expect(duration).toBeLessThan(10000); // Should timeout before 10 seconds
    });

    it('should handle network interruptions gracefully', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock network interruption then recovery
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        });
      });

      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { result, duration } = await performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      expect(result.success).toBe(true);
      expect(callCount).toBeGreaterThan(2); // Should have retried
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 3);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency authentication requests', async () => {
      const requestCount = 100;
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock responses for all requests
      for (let i = 0; i < requestCount; i++) {
        securityTestUtils.mockServerResponse(mockResponse);
      }
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(requestCount).fill(0).map(() =>
          authService.login(credentials)
        );
        await Promise.all(promises);
      });

      const averagePerRequest = duration / requestCount;
      expect(averagePerRequest).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should maintain performance under CPU load', async () => {
      const credentials = securityTestUtils.generateCredentials();
      const mockUserData = securityTestUtils.createMockUserData();
      const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      securityTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

      // Simulate CPU load
      const cpuLoadPromise = new Promise<void>(resolve => {
        setTimeout(() => {
          performanceTestUtils.simulateCPULoad(1000); // 1 second of CPU load
          resolve();
        }, 100);
      });

      const authPromise = performanceTestUtils.measureTime(() =>
        authService.login(credentials)
      );

      const [{ result, duration }] = await Promise.all([authPromise, cpuLoadPromise]);

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 2);
    });

    it('should handle resource exhaustion gracefully', async () => {
      const cleanup = performanceTestUtils.createMemoryPressure(100); // 100MB pressure
      
      try {
        const credentials = securityTestUtils.generateCredentials();
        const mockUserData = securityTestUtils.createMockUserData();
        const mockResponse = securityTestUtils.createMockBowpiResponse('encrypted-jwt-token');

        securityTestUtils.mockServerResponse(mockResponse);
        jest.spyOn(cryptoService, 'decryptToken').mockResolvedValue(mockUserData);

        const { result, duration } = await performanceTestUtils.measureTime(() =>
          authService.login(credentials)
        );

        // Should still work under memory pressure, though potentially slower
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(performanceTestUtils.benchmarks.NETWORK_OPERATION * 3);
      } finally {
        cleanup();
      }
    });
  });
});
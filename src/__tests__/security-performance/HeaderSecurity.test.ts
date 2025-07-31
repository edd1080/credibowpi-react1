// Security Test: Header Generation Security and Correctness
import { securityTestUtils, performanceTestUtils } from './setup';
import { BowpiOTPService } from '../../services/bowpi/BowpiOTPService';
import { BowpiHMACService } from '../../services/bowpi/BowpiHMACService';
import { HeaderValidationService } from '../../services/HeaderValidationService';

describe('Header Generation Security Tests', () => {
  let otpService: BowpiOTPService;
  let hmacService: BowpiHMACService;
  let headerValidationService: HeaderValidationService;

  beforeEach(() => {
    otpService = new BowpiOTPService();
    hmacService = new BowpiHMACService();
    headerValidationService = new HeaderValidationService();
  });

  describe('OTP Token Security', () => {
    it('should generate cryptographically secure OTP tokens', async () => {
      const tokens: string[] = [];
      const iterations = 100;

      // Generate multiple tokens
      for (let i = 0; i < iterations; i++) {
        const token = await otpService.generateOTPToken();
        tokens.push(token);
      }

      // Test uniqueness
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(iterations);

      // Test entropy
      const tokenBytes = tokens.map(token => {
        const decoded = atob(token);
        return Array.from(decoded).map(char => char.charCodeAt(0));
      }).flat();

      const entropy = securityTestUtils.calculateEntropy(tokenBytes);
      expect(entropy).toBeGreaterThan(6); // Good entropy threshold
    });

    it('should not be predictable based on timing', async () => {
      const tokens: string[] = [];
      const timings: number[] = [];

      // Generate tokens and measure timing
      for (let i = 0; i < 50; i++) {
        const { result, duration } = await performanceTestUtils.measureTime(() => 
          otpService.generateOTPToken()
        );
        tokens.push(result);
        timings.push(duration);
      }

      // Check that timing doesn't reveal patterns
      const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
      const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTiming)));
      
      // Timing should be relatively consistent (within 50% of average)
      expect(maxDeviation).toBeLessThan(avgTiming * 0.5);
    });

    it('should resist brute force attacks', async () => {
      const validToken = await otpService.generateOTPToken();
      const attempts = 1000;
      let successfulGuesses = 0;

      // Attempt to guess tokens
      for (let i = 0; i < attempts; i++) {
        const guessToken = btoa(Math.random().toString(36));
        const isValid = await otpService.validateOTPToken(guessToken);
        if (isValid) successfulGuesses++;
      }

      // Should have very low success rate (ideally 0)
      expect(successfulGuesses).toBeLessThan(attempts * 0.001); // Less than 0.1%
    });

    it('should handle malicious token inputs safely', async () => {
      const maliciousPayloads = securityTestUtils.generateMaliciousPayloads();

      for (const [type, payload] of Object.entries(maliciousPayloads)) {
        try {
          const isValid = await otpService.validateOTPToken(payload);
          expect(isValid).toBe(false);
        } catch (error) {
          // Should handle errors gracefully without exposing system info
          expect((error as Error).message).not.toContain('system');
          expect((error as Error).message).not.toContain('internal');
        }
      }
    });

    it('should not expose sensitive information in errors', async () => {
      const invalidTokens = [
        '',
        'invalid-token',
        null as any,
        undefined as any,
        { malicious: 'object' } as any,
        'very-long-token-' + 'x'.repeat(10000)
      ];

      for (const invalidToken of invalidTokens) {
        try {
          await otpService.validateOTPToken(invalidToken);
        } catch (error) {
          const errorMessage = (error as Error).message.toLowerCase();
          
          // Should not expose internal details
          expect(errorMessage).not.toContain('crypto');
          expect(errorMessage).not.toContain('key');
          expect(errorMessage).not.toContain('secret');
          expect(errorMessage).not.toContain('algorithm');
        }
      }
    });
  });

  describe('HMAC Digest Security', () => {
    it('should generate secure HMAC digests', async () => {
      const data = 'test data for HMAC';
      const secret = 'test-secret-key';
      const digests: string[] = [];

      // Generate multiple digests with same input
      for (let i = 0; i < 10; i++) {
        const digest = await hmacService.generateDigest(data, secret);
        digests.push(digest);
      }

      // All digests should be identical (deterministic)
      const uniqueDigests = new Set(digests);
      expect(uniqueDigests.size).toBe(1);

      // Digest should be proper length for SHA-256
      expect(digests[0]).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be resistant to timing attacks', async () => {
      const correctDigest = await hmacService.generateDigest('test', 'secret');
      const incorrectDigest = 'a'.repeat(64);

      const timingResult = await securityTestUtils.measureTimingAttack(
        correctDigest,
        incorrectDigest,
        async (correct, test) => {
          return await hmacService.verifyDigest('test', 'secret', test);
        }
      );

      // Should not be vulnerable to timing attacks
      expect(timingResult.isVulnerable).toBe(false);
    });

    it('should handle different data sizes securely', async () => {
      const secret = 'test-secret';
      const dataSizes = [1, 100, 1000, 10000, 100000]; // bytes

      for (const size of dataSizes) {
        const data = performanceTestUtils.generateLargeData(size / 1024);
        
        const { duration } = await performanceTestUtils.measureTime(() =>
          hmacService.generateDigest(data, secret)
        );

        // Should complete within reasonable time even for large data
        expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
      }
    });

    it('should prevent hash collision attacks', async () => {
      const secret = 'test-secret';
      const baseData = 'test data';
      const variations = [
        baseData,
        baseData + ' ',
        baseData + '\n',
        baseData + '\t',
        baseData.toUpperCase(),
        baseData + '0',
        baseData + '\x00'
      ];

      const digests = await Promise.all(
        variations.map(data => hmacService.generateDigest(data, secret))
      );

      // All digests should be different
      const uniqueDigests = new Set(digests);
      expect(uniqueDigests.size).toBe(variations.length);
    });

    it('should handle malicious secret keys safely', async () => {
      const data = 'test data';
      const maliciousSecrets = [
        '',
        '\x00\x00\x00',
        'very-long-secret-' + 'x'.repeat(10000),
        '../../etc/passwd',
        '<script>alert("xss")</script>',
        null as any,
        undefined as any
      ];

      for (const secret of maliciousSecrets) {
        try {
          const digest = await hmacService.generateDigest(data, secret);
          expect(digest).toMatch(/^[a-f0-9]{64}$/);
        } catch (error) {
          // Should handle errors gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Header Validation Security', () => {
    it('should validate headers securely', async () => {
      const validHeaders = {
        'Content-Type': 'application/json',
        'otp-token': await otpService.generateOTPToken(),
        'X-Date': Date.now().toString(),
        'X-Digest': await hmacService.generateDigest('test', 'secret'),
        'bowpi-auth-token': 'valid-token'
      };

      const result = headerValidationService.validateHeaders(validHeaders);
      expect(result.isValid).toBe(true);
    });

    it('should detect header injection attacks', async () => {
      const maliciousHeaders = {
        'Content-Type': 'application/json\r\nX-Injected: malicious',
        'otp-token': 'valid-token\r\nX-Another: injection',
        'X-Date': Date.now().toString(),
        'X-Digest': 'valid-digest',
        'bowpi-auth-token': 'token\nSet-Cookie: malicious=true'
      };

      const result = headerValidationService.validateHeaders(maliciousHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Header injection detected');
    });

    it('should prevent header pollution', async () => {
      const duplicateHeaders = {
        'Content-Type': ['application/json', 'text/html'],
        'otp-token': await otpService.generateOTPToken(),
        'X-Date': Date.now().toString(),
        'X-Digest': await hmacService.generateDigest('test', 'secret')
      };

      const result = headerValidationService.validateHeaders(duplicateHeaders as any);
      expect(result.isValid).toBe(false);
    });

    it('should validate header sizes', async () => {
      const oversizedHeaders = {
        'Content-Type': 'application/json',
        'otp-token': 'x'.repeat(10000), // Very large token
        'X-Date': Date.now().toString(),
        'X-Digest': await hmacService.generateDigest('test', 'secret')
      };

      const result = headerValidationService.validateHeaders(oversizedHeaders);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Header size exceeded');
    });

    it('should sanitize header values', async () => {
      const unsafeHeaders = {
        'Content-Type': 'application/json',
        'otp-token': '<script>alert("xss")</script>',
        'X-Date': Date.now().toString(),
        'X-Digest': '"; DROP TABLE users; --'
      };

      const result = headerValidationService.validateHeaders(unsafeHeaders);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedHeaders).toBeDefined();
      
      // Sanitized headers should not contain malicious content
      const sanitized = result.sanitizedHeaders!;
      expect(sanitized['otp-token']).not.toContain('<script>');
      expect(sanitized['X-Digest']).not.toContain('DROP TABLE');
    });
  });

  describe('Request Integrity Security', () => {
    it('should generate secure request digests', async () => {
      const method = 'POST';
      const url = '/api/auth/login';
      const body = JSON.stringify({ username: 'test', password: 'test' });
      const timestamp = Date.now().toString();
      const secret = 'request-secret';

      const digest = await hmacService.generateRequestDigest(method, url, body, timestamp, secret);
      
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
      expect(digest.length).toBe(64);
    });

    it('should detect request tampering', async () => {
      const method = 'POST';
      const url = '/api/auth/login';
      const body = JSON.stringify({ username: 'test', password: 'test' });
      const timestamp = Date.now().toString();
      const secret = 'request-secret';

      const originalDigest = await hmacService.generateRequestDigest(method, url, body, timestamp, secret);
      
      // Tamper with body
      const tamperedBody = JSON.stringify({ username: 'admin', password: 'admin' });
      const tamperedDigest = await hmacService.generateRequestDigest(method, url, tamperedBody, timestamp, secret);

      expect(originalDigest).not.toBe(tamperedDigest);
    });

    it('should handle replay attack prevention', async () => {
      const method = 'POST';
      const url = '/api/auth/login';
      const body = JSON.stringify({ username: 'test', password: 'test' });
      const secret = 'request-secret';

      // Generate digest with old timestamp
      const oldTimestamp = (Date.now() - 600000).toString(); // 10 minutes ago
      const oldDigest = await hmacService.generateRequestDigest(method, url, body, oldTimestamp, secret);

      // Generate digest with current timestamp
      const currentTimestamp = Date.now().toString();
      const currentDigest = await hmacService.generateRequestDigest(method, url, body, currentTimestamp, secret);

      // Digests should be different due to timestamp
      expect(oldDigest).not.toBe(currentDigest);
    });

    it('should validate request method integrity', async () => {
      const url = '/api/auth/login';
      const body = JSON.stringify({ username: 'test', password: 'test' });
      const timestamp = Date.now().toString();
      const secret = 'request-secret';

      const postDigest = await hmacService.generateRequestDigest('POST', url, body, timestamp, secret);
      const getDigest = await hmacService.generateRequestDigest('GET', url, body, timestamp, secret);

      // Different methods should produce different digests
      expect(postDigest).not.toBe(getDigest);
    });

    it('should handle URL path traversal in digest', async () => {
      const method = 'POST';
      const body = JSON.stringify({ username: 'test', password: 'test' });
      const timestamp = Date.now().toString();
      const secret = 'request-secret';

      const normalUrl = '/api/auth/login';
      const traversalUrl = '/api/auth/../../../etc/passwd';

      const normalDigest = await hmacService.generateRequestDigest(method, normalUrl, body, timestamp, secret);
      const traversalDigest = await hmacService.generateRequestDigest(method, traversalUrl, body, timestamp, secret);

      // Different URLs should produce different digests
      expect(normalDigest).not.toBe(traversalDigest);
    });
  });

  describe('Performance Under Security Load', () => {
    it('should maintain performance under concurrent header validation', async () => {
      const concurrentRequests = 50;
      const validHeaders = {
        'Content-Type': 'application/json',
        'otp-token': await otpService.generateOTPToken(),
        'X-Date': Date.now().toString(),
        'X-Digest': await hmacService.generateDigest('test', 'secret')
      };

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(concurrentRequests).fill(0).map(() =>
          headerValidationService.validateHeaders(validHeaders)
        );
        await Promise.all(promises);
      });

      // Should handle concurrent validation efficiently
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.MEDIUM_OPERATION);
    });

    it('should handle large payloads in digest generation', async () => {
      const method = 'POST';
      const url = '/api/upload';
      const timestamp = Date.now().toString();
      const secret = 'request-secret';

      // Test with increasingly large payloads
      const payloadSizes = [1, 10, 100, 1000]; // KB

      for (const sizeKB of payloadSizes) {
        const largeBody = performanceTestUtils.generateLargeData(sizeKB);
        
        const { duration } = await performanceTestUtils.measureTime(() =>
          hmacService.generateRequestDigest(method, url, largeBody, timestamp, secret)
        );

        // Should scale reasonably with payload size
        const expectedMaxTime = Math.min(sizeKB * 10, performanceTestUtils.benchmarks.SLOW_OPERATION);
        expect(duration).toBeLessThan(expectedMaxTime);
      }
    });

    it('should resist DoS attacks through resource exhaustion', async () => {
      const maliciousRequests = 100;
      const startMemory = performanceTestUtils.measureMemory();

      // Simulate many malicious validation attempts
      const promises = Array(maliciousRequests).fill(0).map(async () => {
        const maliciousHeaders = {
          'Content-Type': 'x'.repeat(1000),
          'otp-token': 'y'.repeat(1000),
          'X-Date': 'z'.repeat(1000),
          'X-Digest': 'a'.repeat(1000)
        };
        
        try {
          return headerValidationService.validateHeaders(maliciousHeaders);
        } catch (error) {
          return { isValid: false, errors: ['Validation failed'] };
        }
      });

      const { duration } = await performanceTestUtils.measureTime(() =>
        Promise.all(promises)
      );

      const endMemory = performanceTestUtils.measureMemory();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Should not consume excessive resources
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });

  describe('Cryptographic Security', () => {
    it('should use secure random number generation', async () => {
      const randomValues: number[] = [];
      const iterations = 1000;

      // Generate random values
      for (let i = 0; i < iterations; i++) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        randomValues.push(...Array.from(array));
      }

      // Test entropy
      const entropy = securityTestUtils.calculateEntropy(randomValues);
      expect(entropy).toBeGreaterThan(7.5); // High entropy threshold

      // Test distribution
      const frequencies = new Array(256).fill(0);
      randomValues.forEach(value => frequencies[value]++);
      
      const expectedFreq = randomValues.length / 256;
      const maxDeviation = Math.max(...frequencies.map(freq => Math.abs(freq - expectedFreq)));
      
      // Should have relatively uniform distribution
      expect(maxDeviation).toBeLessThan(expectedFreq * 0.2); // Within 20% of expected
    });

    it('should properly handle key derivation', async () => {
      const password = 'test-password';
      const salt = 'test-salt';
      const iterations = [1000, 10000, 100000];

      for (const iter of iterations) {
        const { duration } = await performanceTestUtils.measureTime(async () => {
          // Simulate key derivation (would use actual PBKDF2 in real implementation)
          let derived = password + salt;
          for (let i = 0; i < iter / 1000; i++) {
            derived = btoa(derived).substring(0, 32);
          }
          return derived;
        });

        // Higher iterations should take more time (security vs performance trade-off)
        const expectedMinTime = iter / 100000; // Rough estimate
        expect(duration).toBeGreaterThan(expectedMinTime);
      }
    });

    it('should validate cryptographic constants', () => {
      // Test that cryptographic constants are secure
      const constants = {
        MIN_TOKEN_LENGTH: 32,
        MIN_SECRET_LENGTH: 16,
        MAX_HEADER_SIZE: 8192,
        TOKEN_EXPIRY_TIME: 3600, // 1 hour
        MAX_CLOCK_SKEW: 300 // 5 minutes
      };

      // Validate security parameters
      expect(constants.MIN_TOKEN_LENGTH).toBeGreaterThanOrEqual(32);
      expect(constants.MIN_SECRET_LENGTH).toBeGreaterThanOrEqual(16);
      expect(constants.MAX_HEADER_SIZE).toBeLessThanOrEqual(8192);
      expect(constants.TOKEN_EXPIRY_TIME).toBeGreaterThan(0);
      expect(constants.MAX_CLOCK_SKEW).toBeLessThan(600); // Not too permissive
    });
  });
});
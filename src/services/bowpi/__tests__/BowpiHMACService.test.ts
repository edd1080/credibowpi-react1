import { BowpiHMACService } from '../BowpiHMACService';

describe('BowpiHMACService', () => {
  let hmacService: BowpiHMACService;

  beforeEach(() => {
    hmacService = new BowpiHMACService();
  });

  describe('generateDigest', () => {
    const testData = 'test data for HMAC';
    const testSecret = 'test-secret-key';

    it('should generate a valid HMAC digest', async () => {
      const digest = await hmacService.generateDigest(testData, testSecret);

      expect(digest).toBeDefined();
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(0);
      
      // HMAC-SHA256 should produce a 64-character hex string
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate consistent digests for same input', async () => {
      const digest1 = await hmacService.generateDigest(testData, testSecret);
      const digest2 = await hmacService.generateDigest(testData, testSecret);

      expect(digest1).toBe(digest2);
    });

    it('should generate different digests for different data', async () => {
      const digest1 = await hmacService.generateDigest('data1', testSecret);
      const digest2 = await hmacService.generateDigest('data2', testSecret);

      expect(digest1).not.toBe(digest2);
    });

    it('should generate different digests for different secrets', async () => {
      const digest1 = await hmacService.generateDigest(testData, 'secret1');
      const digest2 = await hmacService.generateDigest(testData, 'secret2');

      expect(digest1).not.toBe(digest2);
    });

    it('should handle empty data', async () => {
      const digest = await hmacService.generateDigest('', testSecret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle empty secret', async () => {
      const digest = await hmacService.generateDigest(testData, '');

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters in data', async () => {
      const specialData = 'test data with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const digest = await hmacService.generateDigest(specialData, testSecret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle Unicode characters', async () => {
      const unicodeData = 'test data with unicode: 你好世界 🌍 émojis';
      const digest = await hmacService.generateDigest(unicodeData, testSecret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle very long data', async () => {
      const longData = 'a'.repeat(10000);
      const digest = await hmacService.generateDigest(longData, testSecret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyDigest', () => {
    const testData = 'test data for verification';
    const testSecret = 'verification-secret';

    it('should verify correct digest', async () => {
      const digest = await hmacService.generateDigest(testData, testSecret);
      const isValid = await hmacService.verifyDigest(testData, testSecret, digest);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect digest', async () => {
      const correctDigest = await hmacService.generateDigest(testData, testSecret);
      const incorrectDigest = correctDigest.slice(0, -1) + '0'; // Change last character
      
      const isValid = await hmacService.verifyDigest(testData, testSecret, incorrectDigest);

      expect(isValid).toBe(false);
    });

    it('should reject digest with wrong data', async () => {
      const digest = await hmacService.generateDigest(testData, testSecret);
      const isValid = await hmacService.verifyDigest('wrong data', testSecret, digest);

      expect(isValid).toBe(false);
    });

    it('should reject digest with wrong secret', async () => {
      const digest = await hmacService.generateDigest(testData, testSecret);
      const isValid = await hmacService.verifyDigest(testData, 'wrong-secret', digest);

      expect(isValid).toBe(false);
    });

    it('should handle invalid digest format', async () => {
      const invalidDigests = [
        '',
        'invalid',
        '123',
        'not-hex-format',
        'too-short-hex',
        'g'.repeat(64), // Invalid hex characters
      ];

      for (const invalidDigest of invalidDigests) {
        const isValid = await hmacService.verifyDigest(testData, testSecret, invalidDigest);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('generateRequestDigest', () => {
    const method = 'POST';
    const url = '/api/test';
    const body = JSON.stringify({ test: 'data' });
    const timestamp = '1640995200000';
    const secret = 'request-secret';

    it('should generate digest for HTTP request', async () => {
      const digest = await hmacService.generateRequestDigest(method, url, body, timestamp, secret);

      expect(digest).toBeDefined();
      expect(typeof digest).toBe('string');
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate consistent digests for same request', async () => {
      const digest1 = await hmacService.generateRequestDigest(method, url, body, timestamp, secret);
      const digest2 = await hmacService.generateRequestDigest(method, url, body, timestamp, secret);

      expect(digest1).toBe(digest2);
    });

    it('should generate different digests for different methods', async () => {
      const digest1 = await hmacService.generateRequestDigest('GET', url, body, timestamp, secret);
      const digest2 = await hmacService.generateRequestDigest('POST', url, body, timestamp, secret);

      expect(digest1).not.toBe(digest2);
    });

    it('should generate different digests for different URLs', async () => {
      const digest1 = await hmacService.generateRequestDigest(method, '/api/test1', body, timestamp, secret);
      const digest2 = await hmacService.generateRequestDigest(method, '/api/test2', body, timestamp, secret);

      expect(digest1).not.toBe(digest2);
    });

    it('should generate different digests for different bodies', async () => {
      const body1 = JSON.stringify({ test: 'data1' });
      const body2 = JSON.stringify({ test: 'data2' });
      
      const digest1 = await hmacService.generateRequestDigest(method, url, body1, timestamp, secret);
      const digest2 = await hmacService.generateRequestDigest(method, url, body2, timestamp, secret);

      expect(digest1).not.toBe(digest2);
    });

    it('should generate different digests for different timestamps', async () => {
      const digest1 = await hmacService.generateRequestDigest(method, url, body, '1640995200000', secret);
      const digest2 = await hmacService.generateRequestDigest(method, url, body, '1640995201000', secret);

      expect(digest1).not.toBe(digest2);
    });

    it('should handle empty body', async () => {
      const digest = await hmacService.generateRequestDigest(method, url, '', timestamp, secret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle query parameters in URL', async () => {
      const urlWithQuery = '/api/test?param1=value1&param2=value2';
      const digest = await hmacService.generateRequestDigest(method, urlWithQuery, body, timestamp, secret);

      expect(digest).toBeDefined();
      expect(digest).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('error handling', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      const testCases = [
        [null, 'secret'],
        ['data', null],
        [undefined, 'secret'],
        ['data', undefined],
      ];

      for (const [data, secret] of testCases) {
        await expect(hmacService.generateDigest(data as any, secret as any))
          .rejects.toThrow();
      }
    });

    it('should handle crypto errors gracefully', async () => {
      // Mock crypto to throw error
      const originalSubtle = global.crypto?.subtle;
      if (global.crypto) {
        global.crypto.subtle = {
          ...originalSubtle,
          importKey: jest.fn().mockRejectedValue(new Error('Crypto error'))
        } as any;
      }

      await expect(hmacService.generateDigest('test', 'secret'))
        .rejects.toThrow();

      // Restore crypto
      if (global.crypto && originalSubtle) {
        global.crypto.subtle = originalSubtle;
      }
    });
  });

  describe('performance', () => {
    it('should generate digests within reasonable time', async () => {
      const startTime = Date.now();
      
      await hmacService.generateDigest('test data', 'secret');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent digest generation', async () => {
      const concurrentCount = 20;
      const promises = Array(concurrentCount).fill(0).map((_, i) => 
        hmacService.generateDigest(`test data ${i}`, 'secret')
      );

      const digests = await Promise.all(promises);
      
      // All digests should be unique (since data is different)
      const uniqueDigests = new Set(digests);
      expect(uniqueDigests.size).toBe(concurrentCount);
    });

    it('should handle large data efficiently', async () => {
      const largeData = 'x'.repeat(100000); // 100KB of data
      
      const startTime = Date.now();
      await hmacService.generateDigest(largeData, 'secret');
      const endTime = Date.now();
      
      // Should complete within 500ms even for large data
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('security', () => {
    it('should produce different digests for similar inputs', async () => {
      const digests = await Promise.all([
        hmacService.generateDigest('test', 'secret'),
        hmacService.generateDigest('test ', 'secret'), // Extra space
        hmacService.generateDigest('Test', 'secret'), // Different case
        hmacService.generateDigest('test', 'Secret'), // Different case in secret
      ]);

      // All should be different
      const uniqueDigests = new Set(digests);
      expect(uniqueDigests.size).toBe(digests.length);
    });

    it('should be resistant to timing attacks', async () => {
      const correctDigest = await hmacService.generateDigest('test', 'secret');
      const incorrectDigest = 'a'.repeat(64);

      // Measure verification times
      const times = [];
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        await hmacService.verifyDigest('test', 'secret', i % 2 === 0 ? correctDigest : incorrectDigest);
        const end = process.hrtime.bigint();
        times.push(Number(end - start));
      }

      // Times should be relatively consistent (within an order of magnitude)
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      expect(maxTime / minTime).toBeLessThan(10); // Less than 10x difference
    });
  });
});
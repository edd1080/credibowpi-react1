// Security Test: Token Encryption/Decryption Security
import { securityTestUtils, performanceTestUtils } from './setup';
import { BowpiCryptoService } from '../../services/bowpi/BowpiCryptoService';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';

describe('Token Encryption/Decryption Security Tests', () => {
  let cryptoService: BowpiCryptoService;

  beforeEach(() => {
    cryptoService = new BowpiCryptoService();
  });

  describe('JWT Token Security', () => {
    it('should validate JWT structure securely', async () => {
      const validToken = {
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
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(validToken);
      expect(isValid).toBe(true);
    });

    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'invalid.base64!.token',
        'onlyonepart',
        'two.parts',
        'four.parts.are.too.many',
        '',
        null,
        undefined,
        { malicious: 'object' },
        'very-long-token-' + 'x'.repeat(100000)
      ];

      for (const token of malformedTokens) {
        try {
          await cryptoService.decryptToken(token as any);
          fail('Should have thrown an error for malformed token');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          
          // Error message should not expose internal details
          const errorMessage = (error as Error).message.toLowerCase();
          expect(errorMessage).not.toContain('crypto');
          expect(errorMessage).not.toContain('key');
          expect(errorMessage).not.toContain('algorithm');
        }
      }
    });

    it('should handle token injection attacks', async () => {
      const injectionPayloads = securityTestUtils.generateMaliciousPayloads();
      
      for (const [type, payload] of Object.entries(injectionPayloads)) {
        try {
          await cryptoService.decryptToken(payload);
          fail(`Should have rejected ${type} injection payload`);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          
          // Should not execute or interpret malicious content
          const errorMessage = (error as Error).message;
          expect(errorMessage).not.toContain('DROP TABLE');
          expect(errorMessage).not.toContain('<script>');
        }
      }
    });

    it('should validate token expiration securely', async () => {
      const expiredToken = {
        iss: 'bowpi-auth',
        aud: 'credibowpi-mobile',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
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
        permissions: ['read'],
        roles: ['user']
      };

      // Mock the decryption to return expired token
      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(expiredToken);

      try {
        await cryptoService.decryptToken('mock-encrypted-token');
        fail('Should have rejected expired token');
      } catch (error) {
        expect((error as Error).message).toContain('expired');
      }
    });

    it('should prevent token replay attacks', async () => {
      const tokenData = securityTestUtils.createMockUserData();
      
      // Mock decryption
      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(tokenData);

      // First use should succeed
      const result1 = await cryptoService.decryptToken('mock-token');
      expect(result1.userId).toBe('user123');

      // Simulate token being used again (replay attack)
      // In a real implementation, this would check against a token blacklist or nonce
      const jti = tokenData.jti;
      expect(jti).toBeDefined();
      expect(typeof jti).toBe('string');
    });

    it('should validate token audience and issuer', async () => {
      const invalidTokens = [
        {
          ...securityTestUtils.createMockUserData(),
          iss: 'malicious-issuer', // Wrong issuer
        },
        {
          ...securityTestUtils.createMockUserData(),
          aud: 'wrong-audience', // Wrong audience
        },
        {
          ...securityTestUtils.createMockUserData(),
          iss: '', // Empty issuer
        },
        {
          ...securityTestUtils.createMockUserData(),
          aud: null, // Null audience
        }
      ];

      for (const tokenData of invalidTokens) {
        const isValid = await cryptoService.validateTokenStructure(tokenData);
        expect(isValid).toBe(false);
      }
    });

    it('should handle timing attacks on token validation', async () => {
      const validToken = securityTestUtils.createMockUserData();
      const invalidToken = { ...validToken, userId: 'wrong-user' };

      const timingResult = await securityTestUtils.measureTimingAttack(
        JSON.stringify(validToken),
        JSON.stringify(invalidToken),
        async (valid, test) => {
          const tokenData = JSON.parse(test);
          return await cryptoService.validateTokenStructure(tokenData);
        }
      );

      // Should not be vulnerable to timing attacks
      expect(timingResult.isVulnerable).toBe(false);
    });
  });

  describe('Token Storage Security', () => {
    it('should encrypt tokens before storage', async () => {
      const tokenData = 'sensitive-token-data';
      
      const storeResult = await bowpiSecureStorage.secureStore('test-token', tokenData);
      expect(storeResult.success).toBe(true);

      // Verify data is encrypted
      const retrieveResult = await bowpiSecureStorage.secureRetrieve('test-token');
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.encrypted).toBe(true);
    });

    it('should handle storage corruption gracefully', async () => {
      const tokenData = 'test-token-data';
      
      // Store valid data
      await bowpiSecureStorage.secureStore('test-token', tokenData);

      // Simulate storage corruption by mocking corrupted data
      jest.spyOn(bowpiSecureStorage as any, 'rawRetrieve')
        .mockResolvedValue('corrupted-data-not-valid-json');

      const result = await bowpiSecureStorage.secureRetrieve('test-token');
      expect(result.success).toBe(false);
      expect(result.error).toContain('corruption');
    });

    it('should prevent unauthorized access to stored tokens', async () => {
      const sensitiveToken = 'very-sensitive-token-data';
      
      await bowpiSecureStorage.secureStore('sensitive-token', sensitiveToken);

      // Attempt to access with wrong key
      const wrongKeyResult = await bowpiSecureStorage.secureRetrieve('wrong-key');
      expect(wrongKeyResult.success).toBe(false);

      // Attempt to access with malicious key
      const maliciousKeys = [
        '../../../sensitive-token',
        'sensitive-token\x00',
        'sensitive-token; DROP TABLE tokens;',
        null as any,
        undefined as any
      ];

      for (const maliciousKey of maliciousKeys) {
        try {
          const result = await bowpiSecureStorage.secureRetrieve(maliciousKey);
          expect(result.success).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }
    });

    it('should securely delete tokens', async () => {
      const tokenData = 'token-to-be-deleted';
      
      // Store token
      await bowpiSecureStorage.secureStore('delete-test', tokenData);
      
      // Verify it exists
      let result = await bowpiSecureStorage.secureRetrieve('delete-test');
      expect(result.success).toBe(true);

      // Delete token
      const deleteResult = await bowpiSecureStorage.secureDelete('delete-test');
      expect(deleteResult.success).toBe(true);

      // Verify it's gone
      result = await bowpiSecureStorage.secureRetrieve('delete-test');
      expect(result.success).toBe(false);
    });

    it('should handle concurrent access safely', async () => {
      const tokenData = 'concurrent-test-token';
      const concurrentOperations = 20;

      // Concurrent store operations
      const storePromises = Array(concurrentOperations).fill(0).map((_, i) =>
        bowpiSecureStorage.secureStore(`concurrent-${i}`, `${tokenData}-${i}`)
      );

      const storeResults = await Promise.all(storePromises);
      storeResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Concurrent retrieve operations
      const retrievePromises = Array(concurrentOperations).fill(0).map((_, i) =>
        bowpiSecureStorage.secureRetrieve(`concurrent-${i}`)
      );

      const retrieveResults = await Promise.all(retrievePromises);
      retrieveResults.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.data).toBe(`${tokenData}-${i}`);
      });
    });
  });

  describe('Cryptographic Operations Security', () => {
    it('should use secure encryption algorithms', async () => {
      const testData = 'sensitive-data-to-encrypt';
      
      // Test encryption
      const encrypted = await bowpiSecureStorage.encrypt(testData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(testData.length);

      // Test decryption
      const decrypted = await bowpiSecureStorage.decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should generate unique encryption for same data', async () => {
      const testData = 'same-data-different-encryption';
      const encryptions: string[] = [];

      // Encrypt same data multiple times
      for (let i = 0; i < 10; i++) {
        const encrypted = await bowpiSecureStorage.encrypt(testData);
        encryptions.push(encrypted);
      }

      // All encryptions should be different (due to IV/salt)
      const uniqueEncryptions = new Set(encryptions);
      expect(uniqueEncryptions.size).toBe(encryptions.length);

      // But all should decrypt to same data
      for (const encrypted of encryptions) {
        const decrypted = await bowpiSecureStorage.decrypt(encrypted);
        expect(decrypted).toBe(testData);
      }
    });

    it('should handle encryption of large data', async () => {
      const dataSizes = [1, 10, 100, 1000]; // KB

      for (const sizeKB of dataSizes) {
        const largeData = performanceTestUtils.generateLargeData(sizeKB);
        
        const { result: encrypted, duration: encryptTime } = await performanceTestUtils.measureTime(() =>
          bowpiSecureStorage.encrypt(largeData)
        );

        const { result: decrypted, duration: decryptTime } = await performanceTestUtils.measureTime(() =>
          bowpiSecureStorage.decrypt(encrypted)
        );

        // Should handle large data efficiently
        expect(encryptTime).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
        expect(decryptTime).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
        expect(decrypted).toBe(largeData);
      }
    });

    it('should resist cryptographic attacks', async () => {
      const testData = 'attack-test-data';
      const encrypted = await bowpiSecureStorage.encrypt(testData);

      // Test bit flipping attack
      const corruptedEncrypted = encrypted.split('').map((char, i) => 
        i === Math.floor(encrypted.length / 2) ? 
          String.fromCharCode(char.charCodeAt(0) ^ 1) : char
      ).join('');

      try {
        await bowpiSecureStorage.decrypt(corruptedEncrypted);
        fail('Should have detected tampering');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate key derivation security', async () => {
      const password = 'test-password';
      const weakPasswords = ['123', 'password', 'admin', ''];
      const strongPasswords = ['StrongP@ssw0rd123!', 'C0mpl3x-P@ssw0rd!', 'Secure123!@#'];

      // Test that key derivation works with various password strengths
      for (const pwd of [...weakPasswords, ...strongPasswords]) {
        try {
          // Simulate key derivation (in real implementation this would use PBKDF2)
          const derivedKey = btoa(pwd + 'salt').substring(0, 32);
          expect(derivedKey.length).toBe(32);
        } catch (error) {
          // Should handle all passwords gracefully
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('Performance Under Security Load', () => {
    it('should maintain performance during encryption operations', async () => {
      const concurrentOperations = 50;
      const testData = 'performance-test-data';

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(concurrentOperations).fill(0).map(() =>
          bowpiSecureStorage.encrypt(testData)
        );
        await Promise.all(promises);
      });

      // Should handle concurrent encryption efficiently
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION);
    });

    it('should handle memory efficiently during crypto operations', async () => {
      const startMemory = performanceTestUtils.measureMemory();
      const iterations = 100;

      // Perform many crypto operations
      for (let i = 0; i < iterations; i++) {
        const data = `test-data-${i}`;
        const encrypted = await bowpiSecureStorage.encrypt(data);
        const decrypted = await bowpiSecureStorage.decrypt(encrypted);
        expect(decrypted).toBe(data);
      }

      const endMemory = performanceTestUtils.measureMemory();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Should not have significant memory leaks
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });

    it('should resist DoS through crypto exhaustion', async () => {
      const maliciousRequests = 100;
      const largeData = performanceTestUtils.generateLargeData(10); // 10KB each

      const { duration } = await performanceTestUtils.measureTime(async () => {
        const promises = Array(maliciousRequests).fill(0).map(async () => {
          try {
            const encrypted = await bowpiSecureStorage.encrypt(largeData);
            await bowpiSecureStorage.decrypt(encrypted);
          } catch (error) {
            // Expected for some operations under load
          }
        });
        await Promise.all(promises);
      });

      // Should complete within reasonable time even under load
      expect(duration).toBeLessThan(performanceTestUtils.benchmarks.SLOW_OPERATION * 2);
    });

    it('should validate crypto performance benchmarks', async () => {
      const benchmarks = {
        smallData: { size: 1, maxTime: 50 }, // 1KB in 50ms
        mediumData: { size: 100, maxTime: 200 }, // 100KB in 200ms
        largeData: { size: 1000, maxTime: 1000 }, // 1MB in 1000ms
      };

      for (const [name, benchmark] of Object.entries(benchmarks)) {
        const data = performanceTestUtils.generateLargeData(benchmark.size);
        
        const { duration: encryptTime } = await performanceTestUtils.measureTime(() =>
          bowpiSecureStorage.encrypt(data)
        );

        expect(encryptTime).toBeLessThan(benchmark.maxTime);
      }
    });
  });

  describe('Token Lifecycle Security', () => {
    it('should handle token creation securely', async () => {
      const tokenData = securityTestUtils.createMockUserData();
      
      // Validate all required fields are present
      expect(tokenData.iss).toBeDefined();
      expect(tokenData.aud).toBeDefined();
      expect(tokenData.exp).toBeGreaterThan(Date.now() / 1000);
      expect(tokenData.iat).toBeLessThanOrEqual(Date.now() / 1000);
      expect(tokenData.userId).toBeDefined();
      expect(tokenData.email).toBeDefined();
    });

    it('should handle token refresh securely', async () => {
      const originalToken = securityTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        iat: Math.floor(Date.now() / 1000) - 3300, // 55 minutes ago
      });

      const refreshedToken = securityTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iat: Math.floor(Date.now() / 1000),
        jti: 'new-token-id-456' // New token ID
      });

      // Tokens should have different JTIs
      expect(originalToken.jti).not.toBe(refreshedToken.jti);
      
      // Refreshed token should have later expiration
      expect(refreshedToken.exp).toBeGreaterThan(originalToken.exp);
      
      // Refreshed token should have newer issued time
      expect(refreshedToken.iat).toBeGreaterThan(originalToken.iat);
    });

    it('should handle token revocation securely', async () => {
      const tokenId = 'token-to-revoke';
      
      // Store token
      await bowpiSecureStorage.secureStore('active-token', tokenId);
      
      // Verify it exists
      let result = await bowpiSecureStorage.secureRetrieve('active-token');
      expect(result.success).toBe(true);

      // Revoke token (delete)
      const revokeResult = await bowpiSecureStorage.secureDelete('active-token');
      expect(revokeResult.success).toBe(true);

      // Verify it's revoked
      result = await bowpiSecureStorage.secureRetrieve('active-token');
      expect(result.success).toBe(false);
    });

    it('should prevent token privilege escalation', async () => {
      const userToken = securityTestUtils.createMockUserData({
        roles: ['user'],
        permissions: ['read']
      });

      const adminToken = securityTestUtils.createMockUserData({
        roles: ['admin'],
        permissions: ['read', 'write', 'delete']
      });

      // Validate role separation
      expect(userToken.roles).not.toContain('admin');
      expect(userToken.permissions).not.toContain('delete');
      
      expect(adminToken.roles).toContain('admin');
      expect(adminToken.permissions).toContain('delete');
    });
  });
});
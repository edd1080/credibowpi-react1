import { BowpiCryptoService } from '../BowpiCryptoService';

describe('BowpiCryptoService', () => {
  let cryptoService: BowpiCryptoService;

  beforeEach(() => {
    cryptoService = new BowpiCryptoService();
  });

  describe('decryptToken', () => {
    // Mock encrypted token (this would normally come from the server)
    const mockEncryptedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    it('should decrypt a valid encrypted token', async () => {
      // Mock the decryption process
      const mockDecryptedData = {
        iss: 'bowpi-auth',
        aud: 'credibowpi-mobile',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
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
          address: 'Test Address'
        },
        permissions: ['read', 'write'],
        roles: ['user']
      };

      // Mock the internal decryption method
      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(mockDecryptedData);

      const result = await cryptoService.decryptToken(mockEncryptedToken);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.email).toBe('test@example.com');
      expect(result.userProfile).toBeDefined();
      expect(result.userProfile.names).toBe('John');
    });

    it('should handle invalid token format', async () => {
      const invalidTokens = [
        '',
        'invalid-token',
        'not.a.jwt',
        'invalid.base64.token',
        null as any,
        undefined as any
      ];

      for (const invalidToken of invalidTokens) {
        await expect(cryptoService.decryptToken(invalidToken))
          .rejects.toThrow();
      }
    });

    it('should handle malformed JWT structure', async () => {
      const malformedTokens = [
        'onlyonepart',
        'two.parts',
        'four.parts.are.invalid',
        'invalid.base64!.content',
      ];

      for (const malformedToken of malformedTokens) {
        await expect(cryptoService.decryptToken(malformedToken))
          .rejects.toThrow();
      }
    });

    it('should validate token expiration', async () => {
      const expiredTokenData = {
        iss: 'bowpi-auth',
        aud: 'credibowpi-mobile',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(expiredTokenData);

      await expect(cryptoService.decryptToken(mockEncryptedToken))
        .rejects.toThrow('Token has expired');
    });

    it('should validate required token fields', async () => {
      const incompleteTokenData = {
        iss: 'bowpi-auth',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        // Missing required fields: userId, email, userProfile
      };

      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(incompleteTokenData);

      await expect(cryptoService.decryptToken(mockEncryptedToken))
        .rejects.toThrow();
    });

    it('should validate user profile structure', async () => {
      const invalidProfileData = {
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
          // Missing required fields
          names: 'John'
          // Missing: lastNames, documentType, documentNumber, etc.
        },
        permissions: ['read'],
        roles: ['user']
      };

      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(invalidProfileData);

      await expect(cryptoService.decryptToken(mockEncryptedToken))
        .rejects.toThrow();
    });
  });

  describe('validateTokenStructure', () => {
    it('should validate correct token structure', async () => {
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
          address: 'Test Address'
        },
        permissions: ['read', 'write'],
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(validToken);
      expect(isValid).toBe(true);
    });

    it('should reject tokens missing required fields', async () => {
      const requiredFields = ['iss', 'exp', 'iat', 'userId', 'email', 'userProfile'];
      
      for (const field of requiredFields) {
        const invalidToken = {
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
            address: 'Test Address'
          },
          permissions: ['read'],
          roles: ['user']
        };

        delete (invalidToken as any)[field];

        const isValid = await cryptoService.validateTokenStructure(invalidToken);
        expect(isValid).toBe(false);
      }
    });

    it('should validate userProfile structure', async () => {
      const tokenWithInvalidProfile = {
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
          names: 'John'
          // Missing required profile fields
        },
        permissions: ['read'],
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(tokenWithInvalidProfile);
      expect(isValid).toBe(false);
    });

    it('should validate field types', async () => {
      const tokenWithWrongTypes = {
        iss: 'bowpi-auth',
        aud: 'credibowpi-mobile',
        exp: 'not-a-number', // Should be number
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(tokenWithWrongTypes);
      expect(isValid).toBe(false);
    });
  });

  describe('extractTokenPayload', () => {
    it('should extract payload from valid JWT', async () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const payload = await cryptoService.extractTokenPayload(validJWT);
      
      expect(payload).toBeDefined();
      expect(payload.sub).toBe('1234567890');
      expect(payload.name).toBe('John Doe');
      expect(payload.iat).toBe(1516239022);
    });

    it('should handle invalid JWT format', async () => {
      const invalidJWTs = [
        'invalid',
        'not.a.jwt',
        'only.two.parts',
        'four.parts.are.too.many',
        ''
      ];

      for (const invalidJWT of invalidJWTs) {
        await expect(cryptoService.extractTokenPayload(invalidJWT))
          .rejects.toThrow();
      }
    });

    it('should handle invalid base64 in payload', async () => {
      const jwtWithInvalidPayload = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-base64!.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      await expect(cryptoService.extractTokenPayload(jwtWithInvalidPayload))
        .rejects.toThrow();
    });

    it('should handle invalid JSON in payload', async () => {
      // Create a JWT with invalid JSON payload
      const invalidJsonPayload = btoa('{"invalid": json}'); // Missing quotes around json
      const jwtWithInvalidJson = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${invalidJsonPayload}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;
      
      await expect(cryptoService.extractTokenPayload(jwtWithInvalidJson))
        .rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle crypto API errors', async () => {
      // Mock crypto API to throw error
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        subtle: {
          ...originalCrypto?.subtle,
          decrypt: jest.fn().mockRejectedValue(new Error('Crypto API error'))
        }
      } as any;

      await expect(cryptoService.decryptToken('valid.jwt.token'))
        .rejects.toThrow();

      // Restore crypto
      global.crypto = originalCrypto;
    });

    it('should handle base64 decoding errors', async () => {
      // Mock atob to throw error
      const originalAtob = global.atob;
      global.atob = jest.fn().mockImplementation(() => {
        throw new Error('Base64 decoding error');
      });

      await expect(cryptoService.extractTokenPayload('valid.jwt.token'))
        .rejects.toThrow();

      // Restore atob
      global.atob = originalAtob;
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const malformedJsonPayload = btoa('{"malformed": json without closing brace');
      const jwtWithMalformedJson = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${malformedJsonPayload}.signature`;
      
      await expect(cryptoService.extractTokenPayload(jwtWithMalformedJson))
        .rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should decrypt tokens within reasonable time', async () => {
      const mockDecryptedData = {
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(mockDecryptedData);

      const startTime = Date.now();
      await cryptoService.decryptToken('mock.jwt.token');
      const endTime = Date.now();

      // Should complete within 200ms
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should handle concurrent decryption requests', async () => {
      const mockDecryptedData = {
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      jest.spyOn(cryptoService as any, 'performDecryption')
        .mockResolvedValue(mockDecryptedData);

      const concurrentCount = 10;
      const promises = Array(concurrentCount).fill(0).map(() => 
        cryptoService.decryptToken('mock.jwt.token')
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results).toHaveLength(concurrentCount);
      results.forEach(result => {
        expect(result.userId).toBe('user123');
      });
    });
  });

  describe('security', () => {
    it('should not expose sensitive information in error messages', async () => {
      try {
        await cryptoService.decryptToken('invalid.token.format');
      } catch (error) {
        const errorMessage = (error as Error).message.toLowerCase();
        
        // Error message should not contain sensitive information
        expect(errorMessage).not.toContain('password');
        expect(errorMessage).not.toContain('secret');
        expect(errorMessage).not.toContain('key');
        expect(errorMessage).not.toContain('private');
      }
    });

    it('should validate token issuer', async () => {
      const tokenWithWrongIssuer = {
        iss: 'malicious-issuer', // Wrong issuer
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(tokenWithWrongIssuer);
      expect(isValid).toBe(false);
    });

    it('should validate token audience', async () => {
      const tokenWithWrongAudience = {
        iss: 'bowpi-auth',
        aud: 'wrong-audience', // Wrong audience
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
          address: 'Test Address'
        },
        permissions: ['read'],
        roles: ['user']
      };

      const isValid = await cryptoService.validateTokenStructure(tokenWithWrongAudience);
      expect(isValid).toBe(false);
    });
  });
});
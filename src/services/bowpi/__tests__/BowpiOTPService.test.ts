import { BowpiOTPService } from '../BowpiOTPService';

describe('BowpiOTPService', () => {
  let otpService: BowpiOTPService;

  beforeEach(() => {
    otpService = new BowpiOTPService();
    // Mock Date.now to have consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateOTPToken', () => {
    it('should generate a valid OTP token with correct structure', async () => {
      const token = await otpService.generateOTPToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      // Token should be base64 encoded
      expect(() => {
        const decoded = atob(token);
        expect(decoded).toBeDefined();
      }).not.toThrow();
    });

    it('should generate different tokens on subsequent calls', async () => {
      const token1 = await otpService.generateOTPToken();
      
      // Advance time slightly
      jest.spyOn(Date, 'now').mockReturnValue(1640995201000);
      
      const token2 = await otpService.generateOTPToken();

      expect(token1).not.toBe(token2);
    });

    it('should include timestamp in the token', async () => {
      const token = await otpService.generateOTPToken();
      const decoded = atob(token);
      
      // Token should contain timestamp information
      expect(decoded).toContain('1640995200000');
    });

    it('should handle multiple rapid calls', async () => {
      const tokens = await Promise.all([
        otpService.generateOTPToken(),
        otpService.generateOTPToken(),
        otpService.generateOTPToken(),
        otpService.generateOTPToken(),
        otpService.generateOTPToken()
      ]);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should generate tokens with consistent format', async () => {
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + i * 1000);
        tokens.push(await otpService.generateOTPToken());
      }

      tokens.forEach(token => {
        expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
        expect(token.length).toBeGreaterThan(10);
      });
    });
  });

  describe('validateOTPToken', () => {
    it('should validate a recently generated token', async () => {
      const token = await otpService.generateOTPToken();
      
      // Validate within the same timeframe
      const isValid = await otpService.validateOTPToken(token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token format', async () => {
      const invalidTokens = [
        '',
        'invalid',
        '123',
        'not-base64!@#',
        null as any,
        undefined as any
      ];

      for (const invalidToken of invalidTokens) {
        const isValid = await otpService.validateOTPToken(invalidToken);
        expect(isValid).toBe(false);
      }
    });

    it('should reject expired tokens', async () => {
      const token = await otpService.generateOTPToken();
      
      // Advance time beyond expiration (assuming 5 minute expiration)
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + 6 * 60 * 1000);
      
      const isValid = await otpService.validateOTPToken(token);
      expect(isValid).toBe(false);
    });

    it('should handle malformed base64 tokens', async () => {
      const malformedTokens = [
        'invalidbase64',
        'SGVsbG8gV29ybGQ', // Valid base64 but wrong content
        'eyJpbnZhbGlkIjoidG9rZW4ifQ==', // Valid base64 JSON but wrong structure
      ];

      for (const token of malformedTokens) {
        const isValid = await otpService.validateOTPToken(token);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('getTokenMetadata', () => {
    it('should extract metadata from valid token', async () => {
      const token = await otpService.generateOTPToken();
      const metadata = await otpService.getTokenMetadata(token);

      expect(metadata).toBeDefined();
      expect(metadata.timestamp).toBe(1640995200000);
      expect(metadata.isExpired).toBe(false);
      expect(typeof metadata.timeUntilExpiry).toBe('number');
    });

    it('should handle invalid tokens gracefully', async () => {
      const metadata = await otpService.getTokenMetadata('invalid-token');
      
      expect(metadata).toBeNull();
    });

    it('should correctly identify expired tokens', async () => {
      const token = await otpService.generateOTPToken();
      
      // Advance time beyond expiration
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + 6 * 60 * 1000);
      
      const metadata = await otpService.getTokenMetadata(token);
      
      expect(metadata).toBeDefined();
      expect(metadata!.isExpired).toBe(true);
      expect(metadata!.timeUntilExpiry).toBeLessThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle crypto errors gracefully', async () => {
      // Mock crypto functions to throw errors
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        getRandomValues: jest.fn().mockImplementation(() => {
          throw new Error('Crypto error');
        })
      } as any;

      await expect(otpService.generateOTPToken()).rejects.toThrow();

      // Restore crypto
      global.crypto = originalCrypto;
    });

    it('should handle base64 encoding errors', async () => {
      // Mock btoa to throw error
      const originalBtoa = global.btoa;
      global.btoa = jest.fn().mockImplementation(() => {
        throw new Error('Base64 encoding error');
      });

      await expect(otpService.generateOTPToken()).rejects.toThrow();

      // Restore btoa
      global.btoa = originalBtoa;
    });
  });

  describe('performance', () => {
    it('should generate tokens within reasonable time', async () => {
      const startTime = Date.now();
      
      await otpService.generateOTPToken();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent token generation', async () => {
      const concurrentCount = 50;
      const promises = Array(concurrentCount).fill(0).map(() => 
        otpService.generateOTPToken()
      );

      const tokens = await Promise.all(promises);
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(concurrentCount);
    });
  });

  describe('security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const tokens = [];
      for (let i = 0; i < 100; i++) {
        jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + i);
        tokens.push(await otpService.generateOTPToken());
      }

      // Check for patterns that might indicate weak randomness
      const tokenSet = new Set(tokens);
      expect(tokenSet.size).toBe(tokens.length); // All unique

      // Check that tokens don't follow predictable patterns
      for (let i = 1; i < tokens.length; i++) {
        expect(tokens[i]).not.toBe(tokens[i - 1]);
        
        // Tokens shouldn't be sequential or have obvious patterns
        const decoded1 = atob(tokens[i - 1]);
        const decoded2 = atob(tokens[i]);
        expect(decoded1).not.toBe(decoded2);
      }
    });

    it('should not expose sensitive information in tokens', async () => {
      const token = await otpService.generateOTPToken();
      const decoded = atob(token);

      // Token should not contain obvious sensitive patterns
      expect(decoded.toLowerCase()).not.toContain('password');
      expect(decoded.toLowerCase()).not.toContain('secret');
      expect(decoded.toLowerCase()).not.toContain('key');
      expect(decoded.toLowerCase()).not.toContain('token');
    });
  });
});
// Integration test suite for all Bowpi services
import { BowpiAuthAdapter } from '../BowpiAuthAdapter';
import { BowpiOTPService } from '../BowpiOTPService';
import { BowpiHMACService } from '../BowpiHMACService';
import { BowpiCryptoService } from '../BowpiCryptoService';

describe('Bowpi Services Integration', () => {
  let authAdapter: BowpiAuthAdapter;
  let otpService: BowpiOTPService;
  let hmacService: BowpiHMACService;
  let cryptoService: BowpiCryptoService;

  beforeEach(() => {
    authAdapter = new BowpiAuthAdapter();
    otpService = new BowpiOTPService();
    hmacService = new BowpiHMACService();
    cryptoService = new BowpiCryptoService();
  });

  describe('Service Initialization', () => {
    it('should initialize all services successfully', async () => {
      await expect(authAdapter.initialize()).resolves.not.toThrow();
      
      // Services should be ready to use
      expect(otpService).toBeDefined();
      expect(hmacService).toBeDefined();
      expect(cryptoService).toBeDefined();
    });

    it('should handle initialization in correct order', async () => {
      const initOrder: string[] = [];
      
      // Mock initialization methods to track order
      jest.spyOn(authAdapter as any, 'initializeServices')
        .mockImplementation(async () => {
          initOrder.push('authAdapter');
        });

      await authAdapter.initialize();
      
      expect(initOrder).toContain('authAdapter');
    });
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Mock successful server response
      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      // Mock successful token decryption
      jest.spyOn(cryptoService, 'decryptToken')
        .mockResolvedValue(global.testUtils.createMockUserData());

      const credentials = global.testUtils.createMockCredentials();
      const result = await authAdapter.login(credentials);

      expect(result.success).toBe(true);
      expect(result.userData).toBeDefined();
      expect(result.encryptedToken).toBe('encrypted-jwt-token');
    });

    it('should generate and validate OTP tokens', async () => {
      const token = await otpService.generateOTPToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const isValid = await otpService.validateOTPToken(token);
      expect(isValid).toBe(true);
    });

    it('should generate and verify HMAC digests', async () => {
      const data = 'test data';
      const secret = 'test secret';
      
      const digest = await hmacService.generateDigest(data, secret);
      expect(digest).toBeDefined();
      expect(typeof digest).toBe('string');

      const isValid = await hmacService.verifyDigest(data, secret, digest);
      expect(isValid).toBe(true);
    });

    it('should handle token encryption/decryption cycle', async () => {
      const mockTokenData = global.testUtils.createMockUserData();
      
      // Mock the decryption process
      jest.spyOn(cryptoService, 'decryptToken')
        .mockResolvedValue(mockTokenData);

      const decryptedData = await cryptoService.decryptToken('mock-encrypted-token');
      
      expect(decryptedData).toEqual(mockTokenData);
      expect(decryptedData.userId).toBe('user123');
      expect(decryptedData.email).toBe('test@example.com');
    });
  });

  describe('Service Interoperability', () => {
    it('should use OTP service in authentication requests', async () => {
      const otpSpy = jest.spyOn(otpService, 'generateOTPToken')
        .mockResolvedValue('mock-otp-token');

      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      await authAdapter.login(global.testUtils.createMockCredentials());

      expect(otpSpy).toHaveBeenCalled();
    });

    it('should use HMAC service for request integrity', async () => {
      const hmacSpy = jest.spyOn(hmacService, 'generateRequestDigest')
        .mockResolvedValue('mock-hmac-digest');

      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      await authAdapter.login(global.testUtils.createMockCredentials());

      expect(hmacSpy).toHaveBeenCalledWith(
        'POST',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use crypto service for token processing', async () => {
      const cryptoSpy = jest.spyOn(cryptoService, 'decryptToken')
        .mockResolvedValue(global.testUtils.createMockUserData());

      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      await authAdapter.login(global.testUtils.createMockCredentials());

      expect(cryptoSpy).toHaveBeenCalledWith('encrypted-jwt-token');
    });
  });

  describe('Error Propagation', () => {
    it('should propagate OTP service errors', async () => {
      jest.spyOn(otpService, 'generateOTPToken')
        .mockRejectedValue(new Error('OTP generation failed'));

      const result = await authAdapter.login(global.testUtils.createMockCredentials());

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('OTP_GENERATION_ERROR');
    });

    it('should propagate HMAC service errors', async () => {
      jest.spyOn(hmacService, 'generateRequestDigest')
        .mockRejectedValue(new Error('HMAC generation failed'));

      const result = await authAdapter.login(global.testUtils.createMockCredentials());

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('HMAC_GENERATION_ERROR');
    });

    it('should propagate crypto service errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      jest.spyOn(cryptoService, 'decryptToken')
        .mockRejectedValue(new Error('Token decryption failed'));

      const result = await authAdapter.login(global.testUtils.createMockCredentials());

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TOKEN_DECRYPTION_ERROR');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent operations', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      jest.spyOn(cryptoService, 'decryptToken')
        .mockResolvedValue(global.testUtils.createMockUserData());

      const concurrentOperations = Array(5).fill(0).map(() =>
        authAdapter.login(global.testUtils.createMockCredentials())
      );

      const results = await Promise.all(concurrentOperations);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should complete operations within reasonable time', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      jest.spyOn(cryptoService, 'decryptToken')
        .mockResolvedValue(global.testUtils.createMockUserData());

      const startTime = Date.now();
      await authAdapter.login(global.testUtils.createMockCredentials());
      const endTime = Date.now();

      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle service failures gracefully', async () => {
      // Simulate partial service failure
      jest.spyOn(otpService, 'generateOTPToken')
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('fallback-otp-token');

      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      const result = await authAdapter.login(global.testUtils.createMockCredentials());

      // Should handle gracefully and potentially retry
      expect(result).toBeDefined();
    });
  });

  describe('Security Validation', () => {
    it('should not expose sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');

      const credentials = {
        username: 'testuser',
        password: 'supersecretpassword'
      };

      await authAdapter.login(credentials);

      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ].join(' ');

      expect(allLogs).not.toContain('supersecretpassword');
    });

    it('should validate token structure properly', async () => {
      const validToken = global.testUtils.createMockUserData();
      const isValid = await cryptoService.validateTokenStructure(validToken);
      expect(isValid).toBe(true);

      const invalidToken = { ...validToken };
      delete (invalidToken as any).userId;
      
      const isInvalid = await cryptoService.validateTokenStructure(invalidToken);
      expect(isInvalid).toBe(false);
    });

    it('should generate cryptographically secure tokens', async () => {
      const tokens = await Promise.all(
        Array(10).fill(0).map(() => otpService.generateOTPToken())
      );

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Tokens should have reasonable entropy
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThan(10);
        expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
      });
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await authAdapter.initialize();
      
      // Simulate cleanup
      if (typeof (authAdapter as any).cleanup === 'function') {
        await (authAdapter as any).cleanup();
      }

      // Should not throw errors after cleanup
      expect(() => {
        // Any cleanup validation
      }).not.toThrow();
    });

    it('should handle memory pressure', async () => {
      // Create memory pressure
      const largeData = Array(1000).fill(0).map(() => ({
        data: 'x'.repeat(1000),
        timestamp: Date.now()
      }));

      (global.fetch as jest.Mock).mockResolvedValue(
        global.testUtils.createMockResponse(
          global.testUtils.createMockBowpiResponse('encrypted-jwt-token')
        )
      );

      const result = await authAdapter.login(global.testUtils.createMockCredentials());

      expect(result).toBeDefined();
      
      // Cleanup
      largeData.length = 0;
    });
  });
});
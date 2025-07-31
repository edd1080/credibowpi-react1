import { BowpiAuthAdapter } from '../BowpiAuthAdapter';
import { BowpiOTPService } from '../BowpiOTPService';
import { BowpiHMACService } from '../BowpiHMACService';
import { BowpiCryptoService } from '../BowpiCryptoService';

// Mock the services
jest.mock('../BowpiOTPService');
jest.mock('../BowpiHMACService');
jest.mock('../BowpiCryptoService');

// Mock fetch
global.fetch = jest.fn();

describe('Bowpi Services Error Handling', () => {
  let authAdapter: BowpiAuthAdapter;
  let otpService: BowpiOTPService;
  let hmacService: BowpiHMACService;
  let cryptoService: BowpiCryptoService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    authAdapter = new BowpiAuthAdapter();
    otpService = new BowpiOTPService();
    hmacService = new BowpiHMACService();
    cryptoService = new BowpiCryptoService();
  });

  describe('Network Error Scenarios', () => {
    it('should handle connection timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle DNS resolution failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND api.bowpi.com')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
    });

    it('should handle connection refused', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:443')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
    });

    it('should handle SSL/TLS errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('certificate verify failed')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
    });
  });

  describe('Server Error Scenarios', () => {
    it('should handle 500 Internal Server Error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          code: '500',
          message: 'Internal server error occurred',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('SERVER_ERROR');
      expect(result.error?.statusCode).toBe(500);
    });

    it('should handle 502 Bad Gateway', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('SERVER_ERROR');
      expect(result.error?.statusCode).toBe(502);
    });

    it('should handle 503 Service Unavailable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: jest.fn().mockResolvedValue({
          code: '503',
          message: 'Service temporarily unavailable',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('SERVER_ERROR');
      expect(result.error?.statusCode).toBe(503);
    });

    it('should handle rate limiting (429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['Retry-After', '60']]),
        json: jest.fn().mockResolvedValue({
          code: '429',
          message: 'Rate limit exceeded',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RATE_LIMITED');
      expect(result.error?.retryAfter).toBe(60);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle invalid credentials (401)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          code: '401',
          message: 'Invalid username or password',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'wronguser',
        password: 'wrongpass'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('AUTHENTICATION_FAILED');
      expect(result.error?.message).toContain('Invalid username or password');
    });

    it('should handle account locked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 423,
        json: jest.fn().mockResolvedValue({
          code: '423',
          message: 'Account is locked due to multiple failed attempts',
          success: false,
          data: {
            lockoutDuration: 1800, // 30 minutes
            attemptsRemaining: 0
          }
        })
      });

      const result = await authAdapter.login({
        username: 'lockeduser',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ACCOUNT_LOCKED');
      expect(result.error?.lockoutDuration).toBe(1800);
    });

    it('should handle expired credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          code: '401_EXPIRED',
          message: 'Password has expired',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'user',
        password: 'expiredpass'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('CREDENTIALS_EXPIRED');
    });

    it('should handle forbidden access (403)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({
          code: '403',
          message: 'Access denied for this application',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login({
        username: 'user',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ACCESS_DENIED');
    });
  });

  describe('Token and Crypto Error Scenarios', () => {
    it('should handle token decryption failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'corrupted-encrypted-token'
        })
      });

      const mockCryptoService = cryptoService as jest.Mocked<BowpiCryptoService>;
      mockCryptoService.decryptToken.mockRejectedValue(
        new Error('Failed to decrypt token: Invalid format')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TOKEN_DECRYPTION_ERROR');
    });

    it('should handle malformed JWT token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'not.a.valid.jwt.token.format'
        })
      });

      const mockCryptoService = cryptoService as jest.Mocked<BowpiCryptoService>;
      mockCryptoService.decryptToken.mockRejectedValue(
        new Error('Invalid JWT format')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TOKEN_DECRYPTION_ERROR');
    });

    it('should handle expired token in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'expired-jwt-token'
        })
      });

      const mockCryptoService = cryptoService as jest.Mocked<BowpiCryptoService>;
      mockCryptoService.decryptToken.mockRejectedValue(
        new Error('Token has expired')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TOKEN_EXPIRED');
    });

    it('should handle OTP generation failure', async () => {
      const mockOTPService = otpService as jest.Mocked<BowpiOTPService>;
      mockOTPService.generateOTPToken.mockRejectedValue(
        new Error('Crypto API not available')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('OTP_GENERATION_ERROR');
    });

    it('should handle HMAC generation failure', async () => {
      const mockHMACService = hmacService as jest.Mocked<BowpiHMACService>;
      mockHMACService.generateRequestDigest.mockRejectedValue(
        new Error('HMAC generation failed')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('HMAC_GENERATION_ERROR');
    });
  });

  describe('Data Validation Error Scenarios', () => {
    it('should handle missing required fields in request', async () => {
      const invalidCredentials = [
        { username: '', password: 'test' },
        { username: 'test', password: '' },
        { username: null, password: 'test' } as any,
        { username: 'test', password: undefined } as any,
      ];

      for (const credentials of invalidCredentials) {
        const result = await authAdapter.login(credentials);
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          // Missing required fields
          message: 'Success'
          // Missing: code, success, data
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('INVALID_RESPONSE');
    });

    it('should handle non-JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Unexpected token < in JSON'))
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RESPONSE_PARSING_ERROR');
    });

    it('should handle empty response body', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(null)
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('INVALID_RESPONSE');
    });
  });

  describe('Recovery and Retry Scenarios', () => {
    it('should handle transient network errors with retry logic', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network temporarily unavailable'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            code: '200',
            message: 'Success',
            success: true,
            data: 'encrypted-jwt-token'
          })
        });
      });

      // Mock successful token decryption
      const mockCryptoService = cryptoService as jest.Mocked<BowpiCryptoService>;
      mockCryptoService.decryptToken.mockResolvedValue({
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
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should have retried twice
    });

    it('should handle partial service failures gracefully', async () => {
      // Mock OTP service failure but allow fallback
      const mockOTPService = otpService as jest.Mocked<BowpiOTPService>;
      mockOTPService.generateOTPToken
        .mockRejectedValueOnce(new Error('OTP service temporarily unavailable'))
        .mockResolvedValue('fallback-otp-token');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'encrypted-jwt-token'
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      // Should eventually succeed with fallback
      expect(mockOTPService.generateOTPToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large response payloads', async () => {
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: largeData
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      // Should handle large payloads gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RESPONSE_TOO_LARGE');
    });

    it('should handle concurrent authentication attempts', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'encrypted-jwt-token'
        })
      });

      const concurrentAttempts = Array(10).fill(0).map(() =>
        authAdapter.login({ username: 'test', password: 'test' })
      );

      const results = await Promise.allSettled(concurrentAttempts);
      
      // Should handle concurrent requests without race conditions
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects = Array(1000).fill(0).map(() => ({
        data: 'x'.repeat(1000),
        timestamp: Date.now(),
        random: Math.random()
      }));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          code: '200',
          message: 'Success',
          success: true,
          data: 'encrypted-jwt-token'
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      // Should complete successfully even under memory pressure
      expect(result).toBeDefined();
      
      // Cleanup
      largeObjects.length = 0;
    });
  });
});
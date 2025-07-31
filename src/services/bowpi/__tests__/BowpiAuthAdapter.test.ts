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

describe('BowpiAuthAdapter', () => {
  let authAdapter: BowpiAuthAdapter;
  let mockOTPService: jest.Mocked<BowpiOTPService>;
  let mockHMACService: jest.Mocked<BowpiHMACService>;
  let mockCryptoService: jest.Mocked<BowpiCryptoService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockOTPService = new BowpiOTPService() as jest.Mocked<BowpiOTPService>;
    mockHMACService = new BowpiHMACService() as jest.Mocked<BowpiHMACService>;
    mockCryptoService = new BowpiCryptoService() as jest.Mocked<BowpiCryptoService>;

    // Setup default mock implementations
    mockOTPService.generateOTPToken.mockResolvedValue('mock-otp-token');
    mockHMACService.generateRequestDigest.mockResolvedValue('mock-hmac-digest');
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
      permissions: ['read', 'write'],
      roles: ['user']
    });

    authAdapter = new BowpiAuthAdapter();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(authAdapter.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock service initialization to throw error
      mockOTPService.generateOTPToken.mockRejectedValueOnce(new Error('Initialization error'));

      // Should not throw, but handle gracefully
      await expect(authAdapter.initialize()).resolves.not.toThrow();
    });
  });

  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'testpassword'
    };

    const mockSuccessResponse = {
      code: '200',
      message: 'Success',
      success: true,
      data: 'encrypted-jwt-token'
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockSuccessResponse)
      });
    });

    it('should login successfully with valid credentials', async () => {
      const result = await authAdapter.login(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.userData).toBeDefined();
      expect(result.userData?.userId).toBe('user123');
      expect(result.userData?.email).toBe('test@example.com');
      expect(result.encryptedToken).toBe('encrypted-jwt-token');
    });

    it('should generate OTP token for request', async () => {
      await authAdapter.login(mockCredentials);

      expect(mockOTPService.generateOTPToken).toHaveBeenCalled();
    });

    it('should generate HMAC digest for request', async () => {
      await authAdapter.login(mockCredentials);

      expect(mockHMACService.generateRequestDigest).toHaveBeenCalledWith(
        'POST',
        expect.stringContaining('/auth/login'),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should decrypt received token', async () => {
      await authAdapter.login(mockCredentials);

      expect(mockCryptoService.decryptToken).toHaveBeenCalledWith('encrypted-jwt-token');
    });

    it('should handle invalid credentials', async () => {
      const errorResponse = {
        code: '401',
        message: 'Invalid credentials',
        success: false,
        data: null
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue(errorResponse)
      });

      const result = await authAdapter.login(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('AUTHENTICATION_FAILED');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authAdapter.login(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('NETWORK_ERROR');
    });

    it('should handle server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          code: '500',
          message: 'Internal server error',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.login(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('SERVER_ERROR');
    });

    it('should handle token decryption errors', async () => {
      mockCryptoService.decryptToken.mockRejectedValue(new Error('Decryption failed'));

      const result = await authAdapter.login(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('TOKEN_DECRYPTION_ERROR');
    });

    it('should validate required credential fields', async () => {
      const invalidCredentials = [
        { username: '', password: 'password' },
        { username: 'user', password: '' },
        { username: null, password: 'password' } as any,
        { username: 'user', password: null } as any,
        {} as any,
      ];

      for (const credentials of invalidCredentials) {
        const result = await authAdapter.login(credentials);
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should include proper headers in request', async () => {
      await authAdapter.login(mockCredentials);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'otp-token': 'mock-otp-token',
            'X-Date': expect.any(String),
            'X-Digest': 'mock-hmac-digest'
          })
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        code: '200',
        message: 'Token refreshed',
        success: true,
        data: 'new-encrypted-jwt-token'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockRefreshResponse)
      });

      const result = await authAdapter.refreshToken();

      expect(result).toBe(true);
      expect(mockCryptoService.decryptToken).toHaveBeenCalledWith('new-encrypted-jwt-token');
    });

    it('should handle refresh token failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          code: '401',
          message: 'Token refresh failed',
          success: false,
          data: null
        })
      });

      const result = await authAdapter.refreshToken();

      expect(result).toBe(false);
    });

    it('should handle network errors during refresh', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authAdapter.refreshToken();

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockLogoutResponse = {
        code: '200',
        message: 'Logged out successfully',
        success: true,
        data: null
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockLogoutResponse)
      });

      const result = await authAdapter.logout();

      expect(result.success).toBe(true);
    });

    it('should handle logout errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authAdapter.logout();

      // Logout should succeed locally even if server call fails
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
    });

    it('should include proper headers in logout request', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      await authAdapter.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'otp-token': 'mock-otp-token'
          })
        })
      );
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      // Mock that we have an active session
      jest.spyOn(authAdapter as any, 'hasActiveSession').mockReturnValue(true);
      jest.spyOn(authAdapter as any, 'isTokenExpired').mockReturnValue(false);

      const isValid = await authAdapter.validateSession();

      expect(isValid).toBe(true);
    });

    it('should invalidate expired session', async () => {
      jest.spyOn(authAdapter as any, 'hasActiveSession').mockReturnValue(true);
      jest.spyOn(authAdapter as any, 'isTokenExpired').mockReturnValue(true);

      const isValid = await authAdapter.validateSession();

      expect(isValid).toBe(false);
    });

    it('should invalidate when no session exists', async () => {
      jest.spyOn(authAdapter as any, 'hasActiveSession').mockReturnValue(false);

      const isValid = await authAdapter.validateSession();

      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle OTP generation errors', async () => {
      mockOTPService.generateOTPToken.mockRejectedValue(new Error('OTP generation failed'));

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('OTP_GENERATION_ERROR');
    });

    it('should handle HMAC generation errors', async () => {
      mockHMACService.generateRequestDigest.mockRejectedValue(new Error('HMAC generation failed'));

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('HMAC_GENERATION_ERROR');
    });

    it('should handle malformed server responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          // Missing required fields
          code: '200'
          // Missing: message, success, data
        })
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('INVALID_RESPONSE');
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RESPONSE_PARSING_ERROR');
    });
  });

  describe('performance', () => {
    it('should complete login within reasonable time', async () => {
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

      const startTime = Date.now();
      await authAdapter.login({ username: 'test', password: 'test' });
      const endTime = Date.now();

      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle concurrent login attempts', async () => {
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

      const concurrentLogins = Array(5).fill(0).map(() =>
        authAdapter.login({ username: 'test', password: 'test' })
      );

      const results = await Promise.all(concurrentLogins);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('security', () => {
    it('should not log sensitive information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await authAdapter.login({
        username: 'testuser',
        password: 'secretpassword'
      });

      // Check that password is not logged
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ].join(' ');

      expect(allLogs).not.toContain('secretpassword');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should sanitize error messages', async () => {
      mockCryptoService.decryptToken.mockRejectedValue(
        new Error('Decryption failed with secret key: abc123')
      );

      const result = await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      expect(result.error?.message).not.toContain('abc123');
      expect(result.error?.message).not.toContain('secret key');
    });

    it('should validate request integrity', async () => {
      await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      // Verify that HMAC was generated with proper parameters
      expect(mockHMACService.generateRequestDigest).toHaveBeenCalledWith(
        'POST',
        expect.any(String),
        expect.stringContaining('username'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use secure headers', async () => {
      await authAdapter.login({
        username: 'test',
        password: 'test'
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers).toHaveProperty('otp-token');
      expect(headers).toHaveProperty('X-Date');
      expect(headers).toHaveProperty('X-Digest');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
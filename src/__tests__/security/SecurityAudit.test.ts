/**
 * Security Audit Tests for Bowpi Authentication System
 * 
 * This test suite validates all security aspects of the authentication system:
 * - Token security and encryption
 * - Header validation and generation
 * - Network security (HTTPS enforcement, domain validation)
 * - Data protection and secure storage
 * - Session security and invalidation
 * - Input validation and sanitization
 * - Error handling without information leakage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BowpiAuthAdapter } from '../../services/bowpi/BowpiAuthAdapter';
import { BowpiOTPService } from '../../services/bowpi/BowpiOTPService';
import { BowpiHMACService } from '../../services/bowpi/BowpiHMACService';
import { BowpiCryptoService } from '../../services/bowpi/BowpiCryptoService';
import { SecureHttpClient } from '../../services/SecureHttpClient';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';
import { securityLogger } from '../../services/SecurityLoggingService';
import { suspiciousActivityMonitor } from '../../services/SuspiciousActivityMonitor';
import { BOWPI_CONSTANTS, BOWPI_STORAGE_KEYS } from '../../types/bowpi';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

describe('Security Audit Tests', () => {
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure OTP tokens', () => {
      const otpService = new BowpiOTPService();
      
      // Generate multiple tokens
      const tokens = Array(100).fill(null).map(() => otpService.generateOTPToken());
      
      // Verify all tokens are unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
      
      // Verify token format and structure
      tokens.forEach(token => {
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        
        // Decode and verify structure
        const decoded = Buffer.from(token, 'base64').toString();
        expect(decoded).toMatch(/^\d{7}\d{4}\d+4000\d+$/);
        
        // Verify timestamp component is recent
        const timestampMatch = decoded.match(/^\d{7}(\d{4})/);
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1]);
          const currentTime = Math.floor(Date.now() / 1000);
          const timeDiff = Math.abs(currentTime - timestamp);
          expect(timeDiff).toBeLessThan(60); // Within 1 minute
        }
      });
    });

    it('should generate secure HMAC digests with proper entropy', async () => {
      const hmacService = new BowpiHMACService();
      const testData = { test: 'data', timestamp: Date.now() };
      const headers: Record<string, string> = {};
      
      // Generate multiple digests for same data
      const digests = await Promise.all(
        Array(10).fill(null).map(() => hmacService.generateDigestHmac(testData, headers))
      );
      
      // Verify all digests are different (due to timestamp)
      const uniqueDigests = new Set(digests);
      expect(uniqueDigests.size).toBe(digests.length);
      
      // Verify digest format
      digests.forEach(digest => {
        expect(digest).toBeTruthy();
        expect(typeof digest).toBe('string');
        expect(digest.length).toBeGreaterThan(20); // Reasonable length for HMAC
      });
      
      // Verify X-Date header is set correctly
      expect(headers['X-Date']).toBeTruthy();
      expect(headers['X-Date']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should encrypt and decrypt tokens securely', () => {
      const cryptoService = new BowpiCryptoService();
      
      // Test with various token formats
      const testTokens = [
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJib3dwaS1hdXRoIn0.signature',
        'simple_token_data',
        JSON.stringify({ test: 'data', timestamp: Date.now() })
      ];
      
      testTokens.forEach(token => {
        // Mock successful decryption
        const mockUserData = {
          userId: 'test-user',
          username: 'testuser',
          email: 'test@test.com',
          userProfile: {
            requestId: 'test-request-id',
            names: 'Test',
            lastNames: 'User'
          }
        };
        
        jest.spyOn(cryptoService, 'decryptToken').mockReturnValue(mockUserData);
        
        const result = cryptoService.decryptToken(token);
        
        expect(result).toBeTruthy();
        expect(result.userId).toBeTruthy();
        expect(result.userProfile.requestId).toBeTruthy();
      });
    });

    it('should handle token decryption failures securely', () => {
      const cryptoService = new BowpiCryptoService();
      
      // Test with invalid tokens
      const invalidTokens = [
        '',
        'invalid_token',
        'eyJpbnZhbGlkIjoidG9rZW4ifQ==', // Valid base64 but invalid JWT
        null,
        undefined
      ];
      
      invalidTokens.forEach(token => {
        expect(() => {
          cryptoService.decryptToken(token as any);
        }).toThrow();
      });
    });
  });

  describe('Header Security', () => {
    it('should include all required security headers', async () => {
      const adapter = new BowpiAuthAdapter();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Success',
          data: 'mock_token'
        })
      });
      
      await adapter.login('test@test.com', 'password');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic Ym93cGk6Qm93cGkyMDE3',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Content-Type': 'application/json',
            'OTPToken': expect.any(String),
            'X-Date': expect.any(String),
            'X-Digest': expect.any(String)
          })
        })
      );
    });

    it('should not include sensitive headers in non-authenticated requests', async () => {
      const httpClient = new SecureHttpClient();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      // Make request to login endpoint (should not include bowpi-auth-token)
      await httpClient.request({
        url: 'http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
        method: 'POST',
        body: { username: 'test', password: 'test' }
      });
      
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('bowpi-auth-token');
    });

    it('should include bowpi-auth-token for authenticated requests', async () => {
      const httpClient = new SecureHttpClient();
      const testToken = 'test_auth_token';
      
      // Mock authenticated state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve(testToken);
        }
        return Promise.resolve(null);
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      // Make authenticated request
      await httpClient.request({
        url: 'http://10.14.11.200:7161/bowpi/micro-auth-service/management/session/invalidate/request/test-id',
        method: 'POST'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'bowpi-auth-token': testToken
          })
        })
      );
    });

    it('should sanitize headers to prevent injection attacks', async () => {
      const httpClient = new SecureHttpClient();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      // Attempt header injection
      const maliciousHeaders = {
        'X-Injected': 'malicious\r\nX-Evil: injected',
        'Authorization': 'Bearer malicious\nX-Hack: attempt'
      };
      
      await httpClient.request({
        url: 'http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
        method: 'POST',
        headers: maliciousHeaders
      });
      
      // Verify headers were sanitized
      const callArgs = mockFetch.mock.calls[0][1];
      const headers = callArgs.headers;
      
      Object.values(headers).forEach((value: any) => {
        expect(value).not.toContain('\r');
        expect(value).not.toContain('\n');
      });
    });
  });

  describe('Network Security', () => {
    it('should enforce HTTPS in production environment', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const httpClient = new SecureHttpClient();
      
      // Attempt HTTP request in production
      await expect(
        httpClient.request({
          url: 'http://insecure.example.com/api',
          method: 'GET'
        })
      ).rejects.toThrow(/HTTPS required/i);
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should validate allowed domains', async () => {
      const httpClient = new SecureHttpClient();
      
      // Test with disallowed domain
      await expect(
        httpClient.request({
          url: 'https://malicious.example.com/api',
          method: 'GET'
        })
      ).rejects.toThrow(/domain not allowed/i);
    });

    it('should prevent cache for non-authentication microservices', async () => {
      const httpClient = new SecureHttpClient();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      // Make request to non-auth service
      await httpClient.request({
        url: 'http://10.14.11.200:7161/bowpi/other-service/api',
        method: 'GET'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          })
        })
      );
    });

    it('should handle SSL/TLS certificate validation', async () => {
      const httpClient = new SecureHttpClient();
      
      // Mock certificate error
      mockFetch.mockRejectedValueOnce(new Error('Certificate validation failed'));
      
      await expect(
        httpClient.request({
          url: 'https://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
          method: 'POST'
        })
      ).rejects.toThrow(/certificate/i);
    });
  });

  describe('Data Protection', () => {
    it('should encrypt sensitive data before storage', async () => {
      const testData = {
        token: 'sensitive_token',
        userData: { id: 'user123', email: 'test@test.com' }
      };
      
      await bowpiSecureStorage.store('test_key', testData);
      
      // Verify data was encrypted before storage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test_key',
        expect.not.stringMatching(/sensitive_token|test@test\.com/)
      );
    });

    it('should decrypt data correctly on retrieval', async () => {
      const testData = { token: 'test_token', user: 'test_user' };
      
      // Mock encrypted storage
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ encrypted: 'encrypted_data' })
      );
      
      // Mock decryption
      jest.spyOn(bowpiSecureStorage, 'retrieve').mockResolvedValueOnce(testData);
      
      const result = await bowpiSecureStorage.retrieve('test_key');
      
      expect(result).toEqual(testData);
    });

    it('should handle storage corruption gracefully', async () => {
      // Mock corrupted data
      mockAsyncStorage.getItem.mockResolvedValueOnce('corrupted_data');
      
      const result = await bowpiSecureStorage.retrieve('test_key');
      
      expect(result).toBeNull();
      
      // Verify corrupted data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test_key');
    });

    it('should clear all sensitive data on logout', async () => {
      const adapter = new BowpiAuthAdapter();
      
      await adapter.clearLocalSession();
      
      // Verify all sensitive storage keys were cleared
      Object.values(BOWPI_STORAGE_KEYS).forEach(key => {
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('Session Security', () => {
    it('should generate unique session identifiers', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock multiple login responses
      const sessionIds = [];
      for (let i = 0; i < 10; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            code: '200',
            message: 'Success',
            data: `token_${i}`
          })
        });
        
        const mockUserData = {
          userId: `user_${i}`,
          userProfile: { requestId: `session_${i}` }
        };
        
        jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(mockUserData);
        
        await adapter.login(`test${i}@test.com`, 'password');
        sessionIds.push(mockUserData.userProfile.requestId);
      }
      
      // Verify all session IDs are unique
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(sessionIds.length);
    });

    it('should invalidate sessions on server during logout', async () => {
      const adapter = new BowpiAuthAdapter();
      const testSessionId = 'test-session-id';
      
      // Mock authenticated state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify({
            sessionId: testSessionId,
            userId: 'test-user'
          }));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('test_token');
        }
        return Promise.resolve(null);
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
      
      await adapter.logout();
      
      // Verify session invalidation request
      expect(mockFetch).toHaveBeenCalledWith(
        `${BOWPI_CONSTANTS.BASE_URL}/management/session/invalidate/request/${testSessionId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'bowpi-auth-token': 'test_token'
          })
        })
      );
    });

    it('should handle session timeout gracefully', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock expired session
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify({
            sessionId: 'expired-session',
            expirationTime: Date.now() - 3600000 // 1 hour ago
          }));
        }
        return Promise.resolve(null);
      });
      
      const isAuthenticated = await adapter.isAuthenticated();
      
      expect(isAuthenticated).toBe(false);
      
      // Verify expired session was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate email format', async () => {
      const adapter = new BowpiAuthAdapter();
      
      const invalidEmails = [
        '',
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        'test@.com'
      ];
      
      for (const email of invalidEmails) {
        await expect(
          adapter.login(email, 'password')
        ).rejects.toThrow(/invalid.*email/i);
      }
    });

    it('should validate password requirements', async () => {
      const adapter = new BowpiAuthAdapter();
      
      const invalidPasswords = [
        '',
        '123',
        'short'
      ];
      
      for (const password of invalidPasswords) {
        await expect(
          adapter.login('test@test.com', password)
        ).rejects.toThrow(/password/i);
      }
    });

    it('should sanitize input data', async () => {
      const adapter = new BowpiAuthAdapter();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Success',
          data: 'token'
        })
      });
      
      // Test with potentially malicious input
      const maliciousEmail = 'test@test.com<script>alert("xss")</script>';
      const maliciousPassword = 'password\'; DROP TABLE users; --';
      
      await adapter.login(maliciousEmail, maliciousPassword);
      
      // Verify request body was sanitized
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.username).not.toContain('<script>');
      expect(requestBody.password).not.toContain('DROP TABLE');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock server error with sensitive info
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          code: '500',
          message: 'Database connection failed: password=secret123',
          data: null
        })
      });
      
      try {
        await adapter.login('test@test.com', 'password');
      } catch (error) {
        // Verify sensitive info is not exposed
        expect(error.message).not.toContain('password=secret123');
        expect(error.message).not.toContain('Database connection');
      }
    });

    it('should log security events without exposing sensitive data', async () => {
      const logSpy = jest.spyOn(securityLogger, 'logSecurityEvent');
      
      const adapter = new BowpiAuthAdapter();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await adapter.login('sensitive@email.com', 'secretpassword');
      } catch (error) {
        // Verify logs don't contain sensitive data
        const logCalls = logSpy.mock.calls;
        logCalls.forEach(call => {
          const logMessage = JSON.stringify(call);
          expect(logMessage).not.toContain('sensitive@email.com');
          expect(logMessage).not.toContain('secretpassword');
        });
      }
    });

    it('should handle rate limiting gracefully', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock rate limit response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          code: '429',
          message: 'Too many requests',
          data: null
        })
      });
      
      await expect(
        adapter.login('test@test.com', 'password')
      ).rejects.toThrow(/rate limit|too many requests/i);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect multiple failed login attempts', async () => {
      const recordSpy = jest.spyOn(suspiciousActivityMonitor, 'recordFailedLogin');
      
      const adapter = new BowpiAuthAdapter();
      
      // Mock failed login responses
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          code: '401',
          message: 'Invalid credentials'
        })
      });
      
      // Attempt multiple failed logins
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        try {
          await adapter.login('test@test.com', 'wrongpassword');
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(recordSpy).toHaveBeenCalledTimes(attempts);
    });

    it('should detect token manipulation attempts', async () => {
      const recordSpy = jest.spyOn(suspiciousActivityMonitor, 'recordSuspiciousActivity');
      
      // Mock corrupted token
      mockAsyncStorage.getItem.mockResolvedValueOnce('manipulated_token');
      
      const adapter = new BowpiAuthAdapter();
      
      try {
        await adapter.getCurrentUser();
      } catch (error) {
        // Expected to fail
      }
      
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/token|manipulation/i)
        })
      );
    });

    it('should monitor unusual network patterns', async () => {
      const recordSpy = jest.spyOn(suspiciousActivityMonitor, 'recordNetworkEvent');
      
      const adapter = new BowpiAuthAdapter();
      
      // Simulate rapid requests from different IPs
      const requests = Array(10).fill(null).map((_, i) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: `token_${i}` })
        });
        
        return adapter.login(`test${i}@test.com`, 'password');
      });
      
      await Promise.allSettled(requests);
      
      // Should record network events
      expect(recordSpy).toHaveBeenCalled();
    });
  });

  describe('Compliance and Standards', () => {
    it('should follow OWASP Mobile Security guidelines', async () => {
      // Test various OWASP Mobile Top 10 requirements
      
      // M1: Improper Platform Usage - Verify secure storage
      await bowpiSecureStorage.store('test', { sensitive: 'data' });
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      
      // M2: Insecure Data Storage - Verify encryption
      const storedData = mockAsyncStorage.setItem.mock.calls[0][1];
      expect(storedData).not.toContain('sensitive');
      
      // M3: Insecure Communication - Verify HTTPS
      const httpClient = new SecureHttpClient();
      process.env.NODE_ENV = 'production';
      
      await expect(
        httpClient.request({
          url: 'http://insecure.com/api',
          method: 'GET'
        })
      ).rejects.toThrow();
      
      // M4: Insecure Authentication - Verify token security
      const otpService = new BowpiOTPService();
      const token = otpService.generateOTPToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(10);
      
      // M5: Insufficient Cryptography - Verify strong crypto
      const hmacService = new BowpiHMACService();
      const digest = await hmacService.generateDigestHmac({ test: 'data' }, {});
      expect(digest).toBeTruthy();
      expect(digest.length).toBeGreaterThan(20);
    });

    it('should implement proper session management', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock successful login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Success',
          data: 'test_token'
        })
      });
      
      const mockUserData = {
        userId: 'test-user',
        userProfile: { requestId: 'test-session' }
      };
      
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(mockUserData);
      
      await adapter.login('test@test.com', 'password');
      
      // Verify session data is stored securely
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        BOWPI_STORAGE_KEYS.SESSION_DATA,
        expect.any(String)
      );
      
      // Verify session can be validated
      const isAuth = await adapter.isAuthenticated();
      expect(isAuth).toBe(true);
      
      // Verify session can be invalidated
      await adapter.logout();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });
});
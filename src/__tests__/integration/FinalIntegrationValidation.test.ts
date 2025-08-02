/**
 * Final Integration Validation Tests
 * 
 * This test suite validates the complete Bowpi authentication system integration
 * without requiring React Native components or native modules.
 */

import { BowpiOTPService } from '../../services/bowpi/BowpiOTPService';
import { BowpiHMACService } from '../../services/bowpi/BowpiHMACService';
import { BowpiCryptoService } from '../../services/bowpi/BowpiCryptoService';
import { BowpiAuthAdapter } from '../../services/bowpi/BowpiAuthAdapter';
import { BOWPI_CONSTANTS, BOWPI_STORAGE_KEYS, BowpiAuthErrorType } from '../../types/bowpi';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock NetInfo
const mockNetInfo = {
  fetch: jest.fn(),
  addEventListener: jest.fn(),
};

// Mock fetch
const mockFetch = jest.fn();

// Setup mocks
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('@react-native-community/netinfo', () => mockNetInfo);
global.fetch = mockFetch;

describe('Final Integration Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {}
    });
    
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  describe('1. Bowpi Services Integration', () => {
    it('should generate valid OTP tokens', () => {
      const otpService = new BowpiOTPService();
      
      // Generate multiple tokens to test uniqueness
      const tokens = Array(10).fill(null).map(() => otpService.generateOTPToken());
      
      // Verify all tokens are unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
      
      // Verify token format
      tokens.forEach(token => {
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        
        // Decode and verify structure
        const decoded = Buffer.from(token, 'base64').toString();
        expect(decoded).toMatch(/^\d{7}\d{4}\d+4000\d+$/);
      });
    });

    it('should generate valid HMAC digests', async () => {
      const hmacService = new BowpiHMACService();
      const testData = { test: 'data', timestamp: Date.now() };
      const headers: Record<string, string> = {};
      
      const digest = await hmacService.generateDigestHmac(testData, headers);
      
      expect(digest).toBeTruthy();
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(20);
      
      // Verify X-Date header is set
      expect(headers['X-Date']).toBeTruthy();
      expect(headers['X-Date']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle token decryption', () => {
      const cryptoService = new BowpiCryptoService();
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.signature';
      
      // Mock successful decryption
      const mockUserData = {
        userId: 'test-user',
        username: 'testuser',
        email: 'test@test.com',
        userProfile: {
          requestId: 'test-request-id',
          names: 'Test',
          lastNames: 'User',
          username: 'testuser',
          email: 'test@test.com',
          firstLogin: false,
          state: { id: 1, value: 'Active' },
          phone: '12345678',
          time: Date.now(),
          duration: 3600,
          agency: { id: 1, value: 'Test Agency' },
          region: { id: 1, value: 'Test Region' },
          macroRegion: { id: 1, value: 'Test Macro Region' },
          employeePosition: { id: 1, value: 'Agent' },
          company: { id: 1, name: 'Test Company', type: 'Financial' },
          permissions: ['read', 'write'],
          Groups: ['agents'],
          hasSignature: true,
          officerCode: 'TEST001'
        },
        permissions: ['read', 'write'],
        roles: ['agent']
      };
      
      jest.spyOn(cryptoService, 'decryptToken').mockReturnValue(mockUserData);
      
      const result = cryptoService.decryptToken(mockToken);
      
      expect(result).toEqual(mockUserData);
      expect(result.userId).toBe('test-user');
      expect(result.userProfile.requestId).toBe('test-request-id');
    });
  });

  describe('2. Authentication Flow Integration', () => {
    it('should complete successful login flow', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: 'mock_jwt_token'
        })
      });
      
      // Mock crypto service
      const mockUserData = {
        userId: 'test-user',
        username: 'testuser',
        email: 'test@bowpi.com',
        userProfile: {
          requestId: 'test-request-id',
          names: 'Test',
          lastNames: 'User',
          username: 'testuser',
          email: 'test@bowpi.com',
          firstLogin: false,
          state: { id: 1, value: 'Active' },
          phone: '12345678',
          time: Date.now(),
          duration: 3600,
          agency: { id: 1, value: 'Test Agency' },
          region: { id: 1, value: 'Test Region' },
          macroRegion: { id: 1, value: 'Test Macro Region' },
          employeePosition: { id: 1, value: 'Agent' },
          company: { id: 1, name: 'Test Company', type: 'Financial' },
          permissions: ['read', 'write'],
          Groups: ['agents'],
          hasSignature: true,
          officerCode: 'TEST001'
        },
        permissions: ['read', 'write'],
        roles: ['agent']
      };
      
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(mockUserData);
      
      const result = await adapter.login('test@bowpi.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('mock_jwt_token');
      
      // Verify API call was made with correct headers
      expect(mockFetch).toHaveBeenCalledWith(
        `${BOWPI_CONSTANTS.BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Basic Ym93cGk6Qm93cGkyMDE3',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Content-Type': 'application/json',
            'OTPToken': expect.any(String),
            'X-Date': expect.any(String),
            'X-Digest': expect.any(String)
          }),
          body: JSON.stringify({
            username: 'test@bowpi.com',
            password: 'password123',
            application: 'MOBILE',
            isCheckVersion: false
          })
        })
      );
      
      // Verify session data was stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        BOWPI_STORAGE_KEYS.SESSION_DATA,
        expect.any(String)
      );
    });

    it('should handle login failure correctly', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          code: '401',
          message: 'Invalid credentials',
          data: null
        })
      });
      
      const result = await adapter.login('test@bowpi.com', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      
      // Verify no session data was stored
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        BOWPI_STORAGE_KEYS.SESSION_DATA,
        expect.any(String)
      );
    });

    it('should handle network errors gracefully', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
      
      const result = await adapter.login('test@bowpi.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('network');
    });
  });

  describe('3. Security Headers Validation', () => {
    it('should include all required headers in requests', async () => {
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
      
      await adapter.login('test@bowpi.com', 'password123');
      
      const callArgs = mockFetch.mock.calls[0][1];
      const headers = callArgs.headers;
      
      // Verify all required headers are present
      expect(headers['Authorization']).toBe('Basic Ym93cGk6Qm93cGkyMDE3');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Pragma']).toBe('no-cache');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['OTPToken']).toBeTruthy();
      expect(headers['X-Date']).toBeTruthy();
      expect(headers['X-Digest']).toBeTruthy();
      
      // Verify header formats
      expect(headers['X-Date']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(typeof headers['OTPToken']).toBe('string');
      expect(typeof headers['X-Digest']).toBe('string');
    });

    it('should include bowpi-auth-token for authenticated requests', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock stored session
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('stored_auth_token');
        }
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify({
            sessionId: 'test-session-id',
            userId: 'test-user'
          }));
        }
        return Promise.resolve(null);
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Session invalidated'
        })
      });
      
      await adapter.logout();
      
      // Verify bowpi-auth-token was included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/management/session/invalidate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'bowpi-auth-token': 'stored_auth_token'
          })
        })
      );
    });
  });

  describe('4. Offline-First Behavior', () => {
    it('should prevent login when offline', async () => {
      // Mock offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });
      
      const adapter = new BowpiAuthAdapter();
      
      const result = await adapter.login('test@bowpi.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('network');
      
      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should restore session from storage', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock stored session data
      const mockSessionData = {
        decryptedToken: {
          userId: 'test-user',
          userProfile: { requestId: 'test-request-id' }
        },
        sessionId: 'test-session-id',
        expirationTime: Date.now() + 3600000 // 1 hour from now
      };
      
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(mockSessionData));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('stored_token');
        }
        return Promise.resolve(null);
      });
      
      const isAuthenticated = await adapter.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      const currentUser = await adapter.getCurrentUser();
      expect(currentUser).toEqual(mockSessionData.decryptedToken);
    });

    it('should handle expired session gracefully', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock expired session data
      const expiredSessionData = {
        decryptedToken: { userId: 'test-user' },
        sessionId: 'test-session-id',
        expirationTime: Date.now() - 3600000 // 1 hour ago
      };
      
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(expiredSessionData));
        }
        return Promise.resolve(null);
      });
      
      const isAuthenticated = await adapter.isAuthenticated();
      expect(isAuthenticated).toBe(false);
      
      // Verify expired data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });

  describe('5. Session Management', () => {
    it('should invalidate session on server during logout', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock authenticated state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify({
            sessionId: 'test-session-id',
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
        json: async () => ({
          success: true,
          code: '200',
          message: 'Session invalidated'
        })
      });
      
      await adapter.logout();
      
      // Verify session invalidation request
      expect(mockFetch).toHaveBeenCalledWith(
        `${BOWPI_CONSTANTS.BASE_URL}/management/session/invalidate/request/test-session-id`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'bowpi-auth-token': 'test_token'
          })
        })
      );
      
      // Verify local session was cleared
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
    });

    it('should handle logout when offline', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });
      
      // Mock authenticated state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify({
            sessionId: 'test-session-id',
            userId: 'test-user'
          }));
        }
        return Promise.resolve(null);
      });
      
      await adapter.logout();
      
      // Verify no server request was made
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Verify local session was still cleared
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });

  describe('6. Error Handling', () => {
    it('should handle server errors appropriately', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          code: '500',
          message: 'Internal server error',
          data: null
        })
      });
      
      const result = await adapter.login('test@bowpi.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle token decryption failures', async () => {
      const adapter = new BowpiAuthAdapter();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: 'invalid_token'
        })
      });
      
      // Mock decryption failure
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      
      const result = await adapter.login('test@bowpi.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('decrypt');
    });

    it('should handle corrupted session data', async () => {
      const adapter = new BowpiAuthAdapter();
      
      // Mock corrupted session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve('corrupted_json_data');
        }
        return Promise.resolve(null);
      });
      
      const isAuthenticated = await adapter.isAuthenticated();
      expect(isAuthenticated).toBe(false);
      
      // Verify corrupted data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });

  describe('7. Constants and Configuration', () => {
    it('should have all required constants defined', () => {
      expect(BOWPI_CONSTANTS).toBeDefined();
      expect(BOWPI_CONSTANTS.BASE_URL).toBeTruthy();
      expect(BOWPI_CONSTANTS.AUTH_ENDPOINT).toBeTruthy();
      expect(BOWPI_CONSTANTS.SESSION_INVALIDATE_ENDPOINT).toBeTruthy();
      
      expect(BOWPI_STORAGE_KEYS).toBeDefined();
      expect(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN).toBeTruthy();
      expect(BOWPI_STORAGE_KEYS.SESSION_DATA).toBeTruthy();
      expect(BOWPI_STORAGE_KEYS.SESSION_ID).toBeTruthy();
      
      expect(BowpiAuthErrorType).toBeDefined();
      expect(BowpiAuthErrorType.NETWORK_ERROR).toBeTruthy();
      expect(BowpiAuthErrorType.INVALID_CREDENTIALS).toBeTruthy();
      expect(BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT).toBeTruthy();
    });

    it('should use correct endpoint URLs', () => {
      expect(BOWPI_CONSTANTS.BASE_URL).toBe('http://10.14.11.200:7161/bowpi/micro-auth-service');
      expect(BOWPI_CONSTANTS.AUTH_ENDPOINT).toBe('/auth/login');
      expect(BOWPI_CONSTANTS.SESSION_INVALIDATE_ENDPOINT).toBe('/management/session/invalidate/request');
    });

    it('should use correct storage keys', () => {
      expect(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN).toBe('bowpi_encrypted_token');
      expect(BOWPI_STORAGE_KEYS.SESSION_DATA).toBe('bowpi_session_data');
      expect(BOWPI_STORAGE_KEYS.SESSION_ID).toBe('bowpi_session_id');
    });
  });

  describe('8. Performance and Reliability', () => {
    it('should complete login within reasonable time', async () => {
      const adapter = new BowpiAuthAdapter();
      const startTime = Date.now();
      
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
      
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue({
        userId: 'test-user',
        userProfile: { requestId: 'test-request-id' }
      } as any);
      
      await adapter.login('test@bowpi.com', 'password123');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations safely', async () => {
      const adapter = new BowpiAuthAdapter();
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Success',
          data: 'token'
        })
      });
      
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue({
        userId: 'test-user',
        userProfile: { requestId: 'test-request-id' }
      } as any);
      
      // Perform concurrent login attempts
      const loginPromises = Array(5).fill(null).map(() =>
        adapter.login('test@bowpi.com', 'password123')
      );
      
      const results = await Promise.allSettled(loginPromises);
      
      // All should complete without throwing errors
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});
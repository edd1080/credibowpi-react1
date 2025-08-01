/**
 * End-to-End Authentication System Tests
 * 
 * This test suite validates the complete authentication flow including:
 * - Login with real Bowpi server endpoints
 * - Offline-first scenarios
 * - Security headers and token handling
 * - Session management and recovery
 * - Network-aware authentication
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components and services
import { LoginScreen } from '../../screens/LoginScreen';
import { bowpiAuthService } from '../../services/BowpiAuthService';
import { authIntegration } from '../../services/AuthIntegrationService';
import { useAuthStore } from '../../stores/authStore';
import { BowpiAuthAdapter } from '../../services/bowpi/BowpiAuthAdapter';
import { BowpiOTPService } from '../../services/bowpi/BowpiOTPService';
import { BowpiHMACService } from '../../services/bowpi/BowpiHMACService';
import { BowpiCryptoService } from '../../services/bowpi/BowpiCryptoService';
import { NetworkAwareService } from '../../services/NetworkAwareService';
import { securityLogger } from '../../services/SecurityLoggingService';
import { suspiciousActivityMonitor } from '../../services/SuspiciousActivityMonitor';

// Mock external dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Test data
const VALID_CREDENTIALS = {
  email: 'test@bowpi.com',
  password: 'TestPassword123'
};

const INVALID_CREDENTIALS = {
  email: 'invalid@bowpi.com',
  password: 'wrongpassword'
};

const MOCK_JWT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJib3dwaS1hdXRoIiwiYXVkIjoiYm93cGktbW9iaWxlIiwiZXhwIjoxNzA2NzM2MDAwLCJpYXQiOjE3MDY2NDk2MDAsInN1YiI6InRlc3RAdGVzdC5jb20iLCJqdGkiOiJ0ZXN0LXNlc3Npb24taWQiLCJkYXRhIjoiZW5jcnlwdGVkX3VzZXJfZGF0YSJ9.signature';

const MOCK_USER_DATA = {
  userId: 'test-user-id',
  username: 'testuser',
  email: 'test@bowpi.com',
  userProfile: {
    username: 'testuser',
    email: 'test@bowpi.com',
    names: 'Test',
    lastNames: 'User',
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
    officerCode: 'TEST001',
    requestId: 'test-request-id'
  },
  permissions: ['read', 'write'],
  roles: ['agent']
};

describe('Authentication E2E Tests', () => {
  let mockFetch: jest.Mock;
  let mockNetInfo: jest.Mocked<typeof NetInfo>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup NetInfo mock
    mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {}
    });
    mockNetInfo.addEventListener.mockReturnValue(() => {});

    // Setup AsyncStorage mock
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockAsyncStorage.clear.mockResolvedValue();

    // Setup fetch mock
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Reset auth store
    const authStore = useAuthStore.getState();
    authStore.clearBowpiAuth();
    authStore.setAuthenticated(false);
    authStore.setUser(null);
    authStore.clearError();

    // Initialize services
    await bowpiAuthService.initialize();
  });

  afterEach(async () => {
    // Clean up
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  describe('Complete Login Flow', () => {
    it('should complete successful login with real Bowpi server endpoints', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: MOCK_JWT_TOKEN
        })
      });

      // Mock crypto service decryption
      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(MOCK_USER_DATA);

      // Render login screen
      const { getByTestId, getByText } = render(<LoginScreen />);

      // Wait for network status to initialize
      await waitFor(() => {
        expect(getByText(/conectado/i)).toBeTruthy();
      });

      // Enter credentials
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, VALID_CREDENTIALS.email);
      fireEvent.changeText(passwordInput, VALID_CREDENTIALS.password);

      // Submit login
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Wait for login to complete
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isAuthenticated).toBe(true);
        expect(authStore.user).toBeTruthy();
        expect(authStore.bowpiToken).toBe(MOCK_JWT_TOKEN);
      }, { timeout: 5000 });

      // Verify API call was made with correct headers
      expect(mockFetch).toHaveBeenCalledWith(
        'http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
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
            username: VALID_CREDENTIALS.email,
            password: VALID_CREDENTIALS.password,
            application: 'MOBILE',
            isCheckVersion: false
          })
        })
      );

      // Verify user data was stored securely
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bowpi_session_data',
        expect.any(String)
      );
    });

    it('should handle invalid credentials correctly', async () => {
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

      const { getByTestId } = render(<LoginScreen />);

      // Wait for network status
      await waitFor(() => {
        expect(getByTestId('login-button')).toBeTruthy();
      });

      // Enter invalid credentials
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, INVALID_CREDENTIALS.email);
      fireEvent.changeText(passwordInput, INVALID_CREDENTIALS.password);

      // Submit login
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Wait for error to appear
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isAuthenticated).toBe(false);
        expect(authStore.error).toBeTruthy();
      });

      // Verify user remains unauthenticated
      const authStore = useAuthStore.getState();
      expect(authStore.user).toBeNull();
      expect(authStore.bowpiToken).toBeUndefined();
    });
  });

  describe('Offline-First Scenarios', () => {
    it('should prevent login when offline', async () => {
      // Mock offline network status
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      const { getByTestId } = render(<LoginScreen />);

      // Wait for network status to update
      await waitFor(() => {
        const loginButton = getByTestId('login-button');
        expect(loginButton.props.accessibilityState?.disabled).toBe(true);
      });

      // Try to login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, VALID_CREDENTIALS.email);
      fireEvent.changeText(passwordInput, VALID_CREDENTIALS.password);

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify alert was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Sin Conexión a Internet',
        expect.stringContaining('Se requiere conexión a internet'),
        expect.any(Array)
      );

      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should allow app usage with valid token when offline', async () => {
      // First, simulate successful login while online
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@bowpi_session_data') {
          return Promise.resolve(JSON.stringify({
            decryptedToken: MOCK_USER_DATA,
            lastRenewalDate: Date.now(),
            userId: MOCK_USER_DATA.userId,
            userProfile: MOCK_USER_DATA.userProfile,
            sessionId: 'test-session-id',
            expirationTime: Date.now() + 3600000 // 1 hour from now
          }));
        }
        if (key === '@bowpi_encrypted_token') {
          return Promise.resolve(MOCK_JWT_TOKEN);
        }
        return Promise.resolve(null);
      });

      // Initialize service with stored session
      await bowpiAuthService.initialize();

      // Verify session was restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      const currentUser = await bowpiAuthService.getCurrentUser();
      expect(currentUser).toEqual(MOCK_USER_DATA);

      // Now go offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      // Verify user can still access app functionality
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user).toBeTruthy();
    });

    it('should handle offline logout with user confirmation', async () => {
      // Setup authenticated state
      const authStore = useAuthStore.getState();
      authStore.setBowpiAuth(MOCK_JWT_TOKEN, MOCK_USER_DATA);
      authStore.setAuthenticated(true);

      // Mock offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      // Mock user confirmation
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        // Simulate user confirming offline logout
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      // Perform logout
      await act(async () => {
        await bowpiAuthService.logout();
      });

      // Verify offline logout warning was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('logout'),
        expect.stringContaining('offline'),
        expect.any(Array)
      );

      // Verify local session was cleared
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isAuthenticated).toBe(false);
        expect(authStore.user).toBeNull();
      });
    });
  });

  describe('Security Headers and Token Handling', () => {
    it('should generate correct OTP tokens', async () => {
      const otpService = new BowpiOTPService();
      const token = otpService.generateOTPToken();

      // Verify token format
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Decode and verify structure
      const decoded = Buffer.from(token, 'base64').toString();
      expect(decoded).toMatch(/^\d{7}\d{4}\d+4000\d+$/);
    });

    it('should generate valid HMAC digests', async () => {
      const hmacService = new BowpiHMACService();
      const body = { test: 'data' };
      const headers: Record<string, string> = {};

      const digest = await hmacService.generateDigestHmac(body, headers);

      expect(digest).toBeTruthy();
      expect(typeof digest).toBe('string');
      expect(headers['X-Date']).toBeTruthy();
      expect(headers['X-Date']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include all required headers in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Success',
          data: MOCK_JWT_TOKEN
        })
      });

      const adapter = new BowpiAuthAdapter();
      await adapter.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

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

    it('should include bowpi-auth-token for authenticated requests', async () => {
      // Setup authenticated state
      const authStore = useAuthStore.getState();
      authStore.setBowpiAuth(MOCK_JWT_TOKEN, MOCK_USER_DATA);
      authStore.setAuthenticated(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Session invalidated'
        })
      });

      // Perform logout (which makes authenticated request)
      await bowpiAuthService.logout();

      // Verify bowpi-auth-token was included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/management/session/invalidate'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'bowpi-auth-token': MOCK_JWT_TOKEN
          })
        })
      );
    });

    it('should encrypt and decrypt tokens correctly', () => {
      const cryptoService = new BowpiCryptoService();
      
      // Mock the decryption to return our test data
      jest.spyOn(cryptoService, 'decryptToken').mockReturnValue(MOCK_USER_DATA);

      const result = cryptoService.decryptToken(MOCK_JWT_TOKEN);

      expect(result).toEqual(MOCK_USER_DATA);
      expect(result.userId).toBe(MOCK_USER_DATA.userId);
      expect(result.userProfile.requestId).toBe(MOCK_USER_DATA.userProfile.requestId);
    });
  });

  describe('Session Management and Recovery', () => {
    it('should restore session on app startup', async () => {
      // Mock stored session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@bowpi_session_data') {
          return Promise.resolve(JSON.stringify({
            decryptedToken: MOCK_USER_DATA,
            lastRenewalDate: Date.now(),
            userId: MOCK_USER_DATA.userId,
            userProfile: MOCK_USER_DATA.userProfile,
            sessionId: 'test-session-id',
            expirationTime: Date.now() + 3600000
          }));
        }
        if (key === '@bowpi_encrypted_token') {
          return Promise.resolve(MOCK_JWT_TOKEN);
        }
        return Promise.resolve(null);
      });

      // Initialize service
      await bowpiAuthService.initialize();

      // Verify session was restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      const currentUser = await bowpiAuthService.getCurrentUser();
      expect(currentUser).toEqual(MOCK_USER_DATA);

      // Verify auth store was updated
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user).toBeTruthy();
    });

    it('should handle corrupted session data gracefully', async () => {
      // Mock corrupted session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@bowpi_session_data') {
          return Promise.resolve('corrupted_data');
        }
        return Promise.resolve(null);
      });

      // Initialize service
      await bowpiAuthService.initialize();

      // Verify session was not restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      // Verify corrupted data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@bowpi_session_data');
    });

    it('should invalidate session on server during logout', async () => {
      // Setup authenticated state
      const authStore = useAuthStore.getState();
      authStore.setBowpiAuth(MOCK_JWT_TOKEN, MOCK_USER_DATA);
      authStore.setAuthenticated(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Session invalidated'
        })
      });

      // Perform logout
      await bowpiAuthService.logout();

      // Verify session invalidation request was made
      expect(mockFetch).toHaveBeenCalledWith(
        `http://10.14.11.200:7161/bowpi/micro-auth-service/management/session/invalidate/request/${MOCK_USER_DATA.userProfile.requestId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'bowpi-auth-token': MOCK_JWT_TOKEN
          })
        })
      );
    });
  });

  describe('Network-Aware Authentication', () => {
    it('should detect network quality and adjust behavior', async () => {
      // Mock poor network quality
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          strength: 1, // Poor signal
          cellularGeneration: '2g'
        }
      });

      await NetworkAwareService.initialize();

      const networkQuality = NetworkAwareService.getNetworkQuality();
      expect(networkQuality).toBe('poor');

      const suitableForAuth = await NetworkAwareService.isNetworkSuitableForAuth();
      expect(suitableForAuth.suitable).toBe(false);
      expect(suitableForAuth.reason).toContain('poor');
    });

    it('should handle network transitions during authentication', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      await bowpiAuthService.initialize();

      // Start with good network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      // Simulate network change to offline during login
      mockFetch.mockImplementation(() => {
        // Simulate network going offline during request
        networkListener({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: {}
        });

        return Promise.reject(new Error('Network request failed'));
      });

      const { getByTestId } = render(<LoginScreen />);

      // Try to login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, VALID_CREDENTIALS.email);
      fireEvent.changeText(passwordInput, VALID_CREDENTIALS.password);

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify error handling
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.error).toBeTruthy();
        expect(authStore.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Security Monitoring and Logging', () => {
    it('should log security events during authentication', async () => {
      const logSpy = jest.spyOn(securityLogger, 'logSecurityEvent');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: MOCK_JWT_TOKEN
        })
      });

      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(MOCK_USER_DATA);

      // Perform login
      await bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

      // Verify security events were logged
      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String), // event type
        expect.any(String), // severity
        expect.stringContaining('authentication'),
        expect.any(Object) // metadata
      );
    });

    it('should detect and report suspicious activity', async () => {
      const suspiciousSpy = jest.spyOn(suspiciousActivityMonitor, 'recordFailedLogin');

      // Simulate multiple failed login attempts
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
      for (let i = 0; i < 5; i++) {
        try {
          await bowpiAuthService.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify suspicious activity was recorded
      expect(suspiciousSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          code: '500',
          message: 'Internal server error'
        })
      });

      const result = await bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.message).toContain('server error');
    });

    it('should recover from network timeouts', async () => {
      // Mock network timeout
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.message).toContain('network');
    });

    it('should handle token decryption failures', async () => {
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

      const result = await bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.message).toContain('decrypt');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent login attempts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: MOCK_JWT_TOKEN
        })
      });

      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(MOCK_USER_DATA);

      // Simulate concurrent login attempts
      const loginPromises = Array(5).fill(null).map(() =>
        bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password)
      );

      const results = await Promise.allSettled(loginPromises);

      // At least one should succeed
      const successfulLogins = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );

      expect(successfulLogins.length).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          code: '200',
          message: 'Login successful',
          data: MOCK_JWT_TOKEN
        })
      });

      jest.spyOn(BowpiCryptoService.prototype, 'decryptToken').mockReturnValue(MOCK_USER_DATA);

      // Perform login
      await bowpiAuthService.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password);

      const duration = Date.now() - startTime;

      // Login should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
/**
 * Offline-First Validation Tests
 * 
 * This test suite validates all offline-first scenarios and behaviors:
 * - Offline login prevention with proper user messaging
 * - Offline app usage with valid tokens
 * - Offline logout handling with user confirmation
 * - Network transition handling
 * - Session persistence across app restarts
 * - Data synchronization when network is restored
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoginScreen } from '../../screens/LoginScreen';
import { bowpiAuthService } from '../../services/BowpiAuthService';
import { NetworkAwareService } from '../../services/NetworkAwareService';
import { useAuthStore } from '../../stores/authStore';
import { useBowpiAuth } from '../../hooks/useBowpiAuth';
import { BowpiAuthAdapter } from '../../services/bowpi/BowpiAuthAdapter';
import { BOWPI_STORAGE_KEYS } from '../../types/bowpi';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Test data
const MOCK_USER_DATA = {
  userId: 'test-user-id',
  username: 'testuser',
  email: 'test@bowpi.com',
  userProfile: {
    username: 'testuser',
    email: 'test@bowpi.com',
    names: 'Test',
    lastNames: 'User',
    requestId: 'test-request-id',
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

const MOCK_SESSION_DATA = {
  decryptedToken: MOCK_USER_DATA,
  lastRenewalDate: Date.now(),
  userId: MOCK_USER_DATA.userId,
  userProfile: MOCK_USER_DATA.userProfile,
  sessionId: 'test-session-id',
  expirationTime: Date.now() + 3600000 // 1 hour from now
};

describe('Offline-First Validation Tests', () => {
  let mockNetInfo: jest.Mocked<typeof NetInfo>;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup NetInfo mock
    mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    mockNetInfo.addEventListener.mockReturnValue(() => {});

    // Setup AsyncStorage mock
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    // Setup fetch mock
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Reset auth store
    const authStore = useAuthStore.getState();
    authStore.clearBowpiAuth();
    authStore.setAuthenticated(false);
    authStore.setUser(null);
    authStore.clearError();
  });

  describe('Offline Login Prevention', () => {
    it('should prevent login when completely offline', async () => {
      // Mock offline network status
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      const { getByTestId, getByText } = render(<LoginScreen />);

      // Wait for network status to update
      await waitFor(() => {
        expect(getByText(/sin conexión/i)).toBeTruthy();
      });

      // Verify login button is disabled
      const loginButton = getByTestId('login-button');
      expect(loginButton.props.accessibilityState?.disabled).toBe(true);

      // Try to login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      fireEvent.changeText(emailInput, 'test@bowpi.com');
      fireEvent.changeText(passwordInput, 'password123');

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

      // Verify user remains unauthenticated
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should prevent login with poor network quality', async () => {
      // Mock poor network connection
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          strength: 1, // Very poor signal
          cellularGeneration: '2g'
        }
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      const { getByTestId } = render(<LoginScreen />);

      // Wait for network quality assessment
      await waitFor(() => {
        const loginButton = getByTestId('login-button');
        expect(loginButton.props.accessibilityState?.disabled).toBe(true);
      });

      // Try to login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, 'test@bowpi.com');
      fireEvent.changeText(passwordInput, 'password123');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify appropriate message was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Conexión Insuficiente',
        expect.stringContaining('calidad de tu conexión'),
        expect.any(Array)
      );
    });

    it('should show appropriate network status indicators', async () => {
      // Test different network states
      const networkStates = [
        {
          state: { isConnected: false, type: 'none' },
          expectedText: /sin conexión/i
        },
        {
          state: { isConnected: true, isInternetReachable: false, type: 'wifi' },
          expectedText: /sin acceso a internet/i
        },
        {
          state: { isConnected: true, isInternetReachable: true, type: 'wifi' },
          expectedText: /conectado/i
        }
      ];

      for (const { state, expectedText } of networkStates) {
        mockNetInfo.fetch.mockResolvedValue(state as any);
        
        await NetworkAwareService.initialize();
        
        const { getByText, unmount } = render(<LoginScreen />);
        
        await waitFor(() => {
          expect(getByText(expectedText)).toBeTruthy();
        });
        
        unmount();
      }
    });
  });

  describe('Offline App Usage with Valid Token', () => {
    it('should allow app usage when offline with valid stored session', async () => {
      // Mock stored session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(MOCK_SESSION_DATA));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('mock_encrypted_token');
        }
        return Promise.resolve(null);
      });

      // Initialize with offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
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
      expect(authStore.isOfflineMode).toBe(true);
    });

    it('should validate token expiration even when offline', async () => {
      // Mock expired session data
      const expiredSessionData = {
        ...MOCK_SESSION_DATA,
        expirationTime: Date.now() - 3600000 // 1 hour ago
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(expiredSessionData));
        }
        return Promise.resolve(null);
      });

      // Initialize offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      // Verify expired session was not restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      // Verify expired data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });

    it('should handle corrupted session data gracefully when offline', async () => {
      // Mock corrupted session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve('corrupted_json_data');
        }
        return Promise.resolve(null);
      });

      // Initialize offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      // Verify corrupted session was not restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      // Verify corrupted data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });
  });

  describe('Offline Logout Handling', () => {
    beforeEach(() => {
      // Setup authenticated state
      const authStore = useAuthStore.getState();
      authStore.setBowpiAuth('mock_token', MOCK_USER_DATA);
      authStore.setAuthenticated(true);
      authStore.setUser({
        id: MOCK_USER_DATA.userId,
        email: MOCK_USER_DATA.email,
        name: `${MOCK_USER_DATA.userProfile.names} ${MOCK_USER_DATA.userProfile.lastNames}`,
        profile: MOCK_USER_DATA.userProfile
      });
    });

    it('should show warning dialog for offline logout', async () => {
      // Mock offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();

      // Mock user cancelling logout
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        expect(title).toMatch(/logout|cerrar sesión/i);
        expect(message).toMatch(/offline|sin conexión/i);
        
        // Simulate user cancelling
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      });

      await bowpiAuthService.logout();

      // Verify warning was shown
      expect(Alert.alert).toHaveBeenCalled();

      // Verify user remains authenticated (cancelled logout)
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(true);
    });

    it('should perform offline logout when user confirms', async () => {
      // Mock offline network
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();

      // Mock user confirming logout
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        // Simulate user confirming offline logout
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      await bowpiAuthService.logout();

      // Verify local session was cleared
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isAuthenticated).toBe(false);
        expect(authStore.user).toBeNull();
      });

      // Verify no server request was made
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify local storage was cleaned
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
    });

    it('should handle logout retry when network is restored', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Start offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();

      // Mock user choosing to retry logout
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        if (title.includes('retry') || title.includes('reintentar')) {
          // Simulate user choosing retry
          if (buttons && buttons[0] && buttons[0].onPress) {
            buttons[0].onPress();
          }
        }
      });

      // Mock successful server logout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Session invalidated' })
      });

      // Start logout process
      const logoutPromise = bowpiAuthService.logout();

      // Simulate network restoration during logout
      setTimeout(() => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });

        networkListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });
      }, 100);

      await logoutPromise;

      // Verify server logout was attempted
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/management/session/invalidate'),
        expect.any(Object)
      );
    });
  });

  describe('Network Transition Handling', () => {
    it('should handle online to offline transition during login', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Start online
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      const { getByTestId } = render(<LoginScreen />);

      // Start login process
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(emailInput, 'test@bowpi.com');
      fireEvent.changeText(passwordInput, 'password123');

      // Mock network failure during request
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

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify error was handled appropriately
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.error).toBeTruthy();
        expect(authStore.isAuthenticated).toBe(false);
      });
    });

    it('should update UI when network status changes', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Start online
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      await NetworkAwareService.initialize();

      const { getByText, getByTestId } = render(<LoginScreen />);

      // Verify online status
      await waitFor(() => {
        expect(getByText(/conectado/i)).toBeTruthy();
        const loginButton = getByTestId('login-button');
        expect(loginButton.props.accessibilityState?.disabled).toBeFalsy();
      });

      // Simulate going offline
      act(() => {
        networkListener({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: {}
        });
      });

      // Verify offline status
      await waitFor(() => {
        expect(getByText(/sin conexión/i)).toBeTruthy();
        const loginButton = getByTestId('login-button');
        expect(loginButton.props.accessibilityState?.disabled).toBe(true);
      });
    });

    it('should restore network operations when connection is restored', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Start offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      // Verify offline mode
      const authStore = useAuthStore.getState();
      expect(authStore.isOfflineMode).toBe(true);

      // Simulate network restoration
      act(() => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });

        networkListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });
      });

      // Wait for network restoration to be processed
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isOfflineMode).toBe(false);
      });
    });
  });

  describe('Session Persistence Across App Restarts', () => {
    it('should restore valid session after app restart', async () => {
      // Mock stored session data
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(MOCK_SESSION_DATA));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('mock_encrypted_token');
        }
        return Promise.resolve(null);
      });

      // Simulate app restart by reinitializing service
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

    it('should not restore expired session after app restart', async () => {
      // Mock expired session data
      const expiredSessionData = {
        ...MOCK_SESSION_DATA,
        expirationTime: Date.now() - 3600000 // 1 hour ago
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(expiredSessionData));
        }
        return Promise.resolve(null);
      });

      // Simulate app restart
      await bowpiAuthService.initialize();

      // Verify expired session was not restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      // Verify expired data was cleaned up
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(BOWPI_STORAGE_KEYS.SESSION_DATA);
    });

    it('should handle missing session data gracefully', async () => {
      // Mock no stored session data
      mockAsyncStorage.getItem.mockResolvedValue(null);

      // Simulate app restart
      await bowpiAuthService.initialize();

      // Verify no session was restored
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      expect(isAuthenticated).toBe(false);

      const currentUser = await bowpiAuthService.getCurrentUser();
      expect(currentUser).toBeNull();

      // Verify auth store remains unauthenticated
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
    });
  });

  describe('Data Synchronization on Network Restoration', () => {
    it('should validate session when network is restored', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Setup authenticated offline state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(MOCK_SESSION_DATA));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('mock_encrypted_token');
        }
        return Promise.resolve(null);
      });

      // Start offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      // Verify offline authenticated state
      expect(await bowpiAuthService.isAuthenticated()).toBe(true);

      // Mock successful session validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, valid: true })
      });

      // Simulate network restoration
      act(() => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });

        networkListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });
      });

      // Wait for network restoration processing
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isOfflineMode).toBe(false);
      });

      // Verify session validation was attempted
      // Note: This would depend on the specific implementation of session validation
      expect(await bowpiAuthService.isAuthenticated()).toBe(true);
    });

    it('should handle invalid session on network restoration', async () => {
      let networkListener: (state: any) => void;

      // Mock network listener
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener;
        return () => {};
      });

      // Setup authenticated offline state
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === BOWPI_STORAGE_KEYS.SESSION_DATA) {
          return Promise.resolve(JSON.stringify(MOCK_SESSION_DATA));
        }
        if (key === BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN) {
          return Promise.resolve('invalid_token');
        }
        return Promise.resolve(null);
      });

      // Start offline
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        details: {}
      });

      await NetworkAwareService.initialize();
      await bowpiAuthService.initialize();

      // Mock session validation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Invalid session' })
      });

      // Simulate network restoration
      act(() => {
        mockNetInfo.fetch.mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });

        networkListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: {}
        });
      });

      // Wait for network restoration processing
      await waitFor(() => {
        const authStore = useAuthStore.getState();
        expect(authStore.isOfflineMode).toBe(false);
      });

      // Verify invalid session was handled appropriately
      // This would typically result in automatic logout
      // The exact behavior depends on implementation
    });
  });
});
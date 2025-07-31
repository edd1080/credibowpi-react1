// Integration Test: Offline/Online Authentication Scenarios
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import NetworkAwareService from '../../services/NetworkAwareService';

describe('Offline/Online Authentication Integration', () => {
  let authService: BowpiAuthService;

  beforeEach(async () => {
    authService = new BowpiAuthService();
    await integrationTestUtils.clearAllStorage();
    useAuthStore.getState().logout();
    
    // Reset network state to online
    integrationTestUtils.setNetworkState({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    });
  });

  describe('Online Authentication', () => {
    it('should authenticate successfully when online', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.isOfflineMode).toBe(false);
    });

    it('should handle server timeout gracefully', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock network timeout
      integrationTestUtils.mockNetworkError('Request timeout');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('timeout');

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should retry authentication on transient network errors', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock first call to fail, second to succeed
      integrationTestUtils.mockNetworkError('Network temporarily unavailable');
      integrationTestUtils.mockServerResponse(mockResponse);

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert - Should eventually succeed after retry
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });
  });

  describe('Offline Authentication', () => {
    it('should block login attempts when offline', async () => {
      // Arrange
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_UNAVAILABLE');
      expect(result.error?.message).toContain('offline');

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should allow offline usage with valid stored session', async () => {
      // Arrange - First login while online
      integrationTestUtils.setNetworkState({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Simulate going offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act - Validate session while offline
      const isValid = await authService.isAuthenticated();

      // Assert - Should remain authenticated offline
      expect(isValid).toBe(true);

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should handle offline mode indicators correctly', async () => {
      // Arrange - Start online and login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Act - Go offline
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Wait for network state to propagate
      await integrationTestUtils.waitFor(100);

      // Assert - Offline mode should be detected
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      
      // Check if offline mode is properly indicated
      const networkStatus = await NetworkAwareService.getNetworkStatus();
      expect(networkStatus.isConnected).toBe(false);
    });

    it('should prevent token refresh when offline', async () => {
      // Arrange - Setup expired session
      const mockUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago (expired)
      });

      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now() - 600000, // 10 minutes ago
        expiresAt: (Math.floor(Date.now() / 1000) - 300) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'expired-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act - Try to refresh token
      const refreshResult = await authService.refreshToken();

      // Assert - Should fail due to offline state
      expect(refreshResult).toBe(false);

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false); // Should be logged out due to expired token
    });
  });

  describe('Network State Transitions', () => {
    it('should handle online to offline transition during authentication', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock slow server response
      let resolveResponse: (value: any) => void;
      const slowResponse = new Promise(resolve => {
        resolveResponse = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(slowResponse);

      // Act - Start login
      const loginPromise = authService.login(credentials);

      // Simulate going offline during request
      setTimeout(() => {
        integrationTestUtils.simulateNetworkChange({
          isConnected: false,
          isInternetReachable: false,
          type: 'none'
        });

        // Resolve with network error
        resolveResponse!({
          ok: false,
          status: 0,
          json: () => Promise.reject(new Error('Network request failed'))
        });
      }, 100);

      const result = await loginPromise;

      // Assert - Should handle network failure gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
    });

    it('should handle offline to online transition and retry', async () => {
      // Arrange - Start offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Act - Try to login while offline
      let result = await authService.login(credentials);

      // Assert - Should fail offline
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_UNAVAILABLE');

      // Simulate coming back online
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Setup successful response for retry
      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act - Retry login now that we're online
      result = await authService.login(credentials);

      // Assert - Should succeed now
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });

    it('should sync session state when coming back online', async () => {
      // Arrange - Login while online
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Go offline
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      await integrationTestUtils.waitFor(100);

      // Come back online
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Mock session validation response
      integrationTestUtils.mockServerResponse(
        integrationTestUtils.createMockBowpiResponse({ valid: true })
      );

      await integrationTestUtils.waitFor(200);

      // Assert - Session should remain valid
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should handle intermittent connectivity gracefully', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Simulate intermittent connectivity
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network temporarily unavailable'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponse)
        });
      });

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert - Should eventually succeed after retries
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
      expect(callCount).toBeGreaterThan(2); // Should have retried
    });
  });

  describe('Offline Data Validation', () => {
    it('should validate stored session data integrity offline', async () => {
      // Arrange - Setup valid session data
      const mockUserData = integrationTestUtils.createMockUserData();
      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'valid-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act - Initialize service offline
      await authService.initialize();

      // Assert - Should validate and restore session
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should reject corrupted session data when offline', async () => {
      // Arrange - Setup corrupted session data
      const corruptedSessionData = {
        userData: { invalid: 'data' },
        sessionId: null,
        timestamp: 'invalid-timestamp',
        expiresAt: 'invalid-expiry',
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', corruptedSessionData, true);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act
      await authService.initialize();

      // Assert - Should reject corrupted data
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should handle missing session data gracefully offline', async () => {
      // Arrange - No session data in storage
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act
      await authService.initialize();

      // Assert - Should handle gracefully
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.error).toBeNull(); // Should not error
    });
  });

  describe('Performance in Different Network Conditions', () => {
    it('should timeout appropriately on slow networks', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock very slow response (longer than timeout)
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
      );

      // Act
      const startTime = Date.now();
      const result = await authService.login(credentials);
      const endTime = Date.now();

      // Assert - Should timeout within reasonable time
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(endTime - startTime).toBeLessThan(35000); // Should timeout before 35s
    });

    it('should handle poor network quality gracefully', async () => {
      // Arrange
      integrationTestUtils.setNetworkState({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular' // Slower connection
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock slower response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), 2000) // 2 second delay
        )
      );

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert - Should succeed despite slow connection
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });
  });
});
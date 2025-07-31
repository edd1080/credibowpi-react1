// Integration Test: Logout Flow with Server Invalidation
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';

describe('Logout Flow Integration', () => {
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

  describe('Online Logout Flow', () => {
    it('should complete full logout flow with server invalidation', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Verify login succeeded
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Mock successful logout response
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      const result = await authService.logout();

      // Assert - Logout result
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(true);
      expect(result.localLogoutSuccess).toBe(true);

      // Assert - Auth store cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.bowpiToken).toBeUndefined();

      // Assert - Storage cleared
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);

      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);
    });

    it('should handle server logout failure gracefully', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock server logout failure
      integrationTestUtils.mockServerError(500, 'Internal server error');

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should succeed locally despite server failure
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);

      // Assert - Local state should still be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();

      // Assert - Storage should still be cleared
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);
    });

    it('should handle network timeout during logout', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock network timeout
      integrationTestUtils.mockNetworkError('Request timeout');

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should succeed locally despite network timeout
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);
      expect(result.message).toContain('timeout');

      // Assert - Local cleanup should still work
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should send proper headers for logout request', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock successful logout response
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      await authService.logout();

      // Assert - Verify logout request was made with proper headers
      const logoutCall = (global.fetch as jest.Mock).mock.calls.find(call => 
        call[0].includes('/logout') || call[1]?.method === 'POST'
      );

      expect(logoutCall).toBeDefined();
      
      if (logoutCall) {
        const headers = logoutCall[1]?.headers;
        expect(headers).toHaveProperty('Content-Type', 'application/json');
        expect(headers).toHaveProperty('otp-token');
        // Should include authentication token
        expect(headers).toHaveProperty('bowpi-auth-token');
      }
    });

    it('should handle concurrent logout attempts', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock logout responses
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);
      integrationTestUtils.mockServerResponse(logoutResponse);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Concurrent logout attempts
      const logoutPromises = [
        authService.logout(),
        authService.logout(),
        authService.logout(),
      ];

      const results = await Promise.all(logoutPromises);

      // Assert - All should succeed or handle gracefully
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.localLogoutSuccess).toBe(true);
      });

      // Assert - Final state should be consistent
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });

  describe('Offline Logout Flow', () => {
    it('should show confirmation dialog for offline logout', async () => {
      // Arrange - First login while online
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Mock user confirmation (accept logout)
      const mockAlert = jest.spyOn(require('react-native'), 'Alert', 'get')
        .mockReturnValue({
          alert: jest.fn((title, message, buttons) => {
            // Simulate user pressing "Logout" button
            const logoutButton = buttons?.find((b: any) => b.text === 'Logout' || b.style !== 'cancel');
            if (logoutButton?.onPress) {
              logoutButton.onPress();
            }
          })
        });

      // Act - Logout while offline
      const result = await authService.logout();

      // Assert - Should succeed with user confirmation
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(false);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);
      expect(result.message).toContain('offline');

      // Assert - Confirmation dialog was shown
      expect(mockAlert().alert).toHaveBeenCalled();

      // Assert - Local state cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);

      mockAlert.mockRestore();
    });

    it('should cancel logout if user declines offline confirmation', async () => {
      // Arrange - First login while online
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Mock user cancellation
      const mockAlert = jest.spyOn(require('react-native'), 'Alert', 'get')
        .mockReturnValue({
          alert: jest.fn((title, message, buttons) => {
            // Simulate user pressing "Cancel" button
            const cancelButton = buttons?.find((b: any) => b.style === 'cancel');
            if (cancelButton?.onPress) {
              cancelButton.onPress();
            }
          })
        });

      // Act - Logout while offline
      const result = await authService.logout();

      // Assert - Should be cancelled
      expect(result.success).toBe(false);
      expect(result.serverLogoutAttempted).toBe(false);
      expect(result.localLogoutSuccess).toBe(false);
      expect(result.message).toContain('cancelled');

      // Assert - User should remain authenticated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');

      mockAlert.mockRestore();
    });

    it('should handle offline logout without confirmation when forced', async () => {
      // Arrange - First login while online
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Go offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act - Force logout (e.g., due to security issue)
      const result = await authService.logout(true); // Force logout

      // Assert - Should succeed without confirmation
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);

      // Assert - State cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe('Session Invalidation', () => {
    it('should invalidate session on server and locally', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock successful logout response
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      await authService.logout();

      // Try to use the session after logout
      const isAuthenticated = await authService.isAuthenticated();

      // Assert - Session should be invalid
      expect(isAuthenticated).toBe(false);

      // Assert - Stored session should be cleared
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);
    });

    it('should handle session already invalidated on server', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock server response indicating session already invalid
      integrationTestUtils.mockServerError(401, 'Session already invalidated');

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should still succeed locally
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);
      expect(result.message).toContain('already invalidated');

      // Assert - Local state should be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should clear all session-related data on logout', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Verify data is stored
      let storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(true);

      let storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);

      let storedProfile = await bowpiSecureStorage.secureRetrieve('bowpi_user_profile');
      expect(storedProfile.success).toBe(true);

      // Mock successful logout
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      await authService.logout();

      // Assert - All session data should be cleared
      storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);

      storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);

      storedProfile = await bowpiSecureStorage.secureRetrieve('bowpi_user_profile');
      expect(storedProfile.success).toBe(false);

      const storedSessionId = await bowpiSecureStorage.secureRetrieve('bowpi_session_id');
      expect(storedSessionId.success).toBe(false);
    });
  });

  describe('Logout Error Handling', () => {
    it('should handle storage errors during logout', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock storage error during logout
      jest.spyOn(bowpiSecureStorage, 'secureDelete')
        .mockRejectedValue(new Error('Storage unavailable'));

      // Mock successful server logout
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should handle storage error gracefully
      expect(result.success).toBe(true); // Overall success
      expect(result.serverLogoutSuccess).toBe(true);
      expect(result.localLogoutSuccess).toBe(false); // Local cleanup failed
      expect(result.message).toContain('storage');

      // Assert - Auth store should still be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should handle auth store errors during logout', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock auth store error
      jest.spyOn(useAuthStore.getState(), 'logout')
        .mockImplementation(() => {
          throw new Error('Store update failed');
        });

      // Mock successful server logout
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should handle store error gracefully
      expect(result.success).toBe(true); // Overall success
      expect(result.serverLogoutSuccess).toBe(true);
      expect(result.message).toContain('error');
    });

    it('should provide detailed error information', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Mock specific server error
      integrationTestUtils.mockServerError(503, 'Service temporarily unavailable');

      // Act - Logout
      const result = await authService.logout();

      // Assert - Should provide detailed error info
      expect(result.success).toBe(true); // Local logout should still succeed
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.statusCode).toBe(503);
      expect(result.error?.message).toContain('Service temporarily unavailable');
    });
  });
});
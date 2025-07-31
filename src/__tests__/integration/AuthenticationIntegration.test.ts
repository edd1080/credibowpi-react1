// Integration Test Suite: Complete Authentication Flow Integration
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';
import { sessionRecoveryService } from '../../services/SessionRecoveryService';

describe('Complete Authentication Flow Integration', () => {
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

  describe('End-to-End Authentication Scenarios', () => {
    it('should complete full authentication lifecycle', async () => {
      // Phase 1: Login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      const loginResult = await authService.login(credentials);

      // Assert login success
      expect(loginResult.success).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Phase 2: Session validation
      const isAuthenticated = await authService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      // Phase 3: Token refresh
      const refreshResponse = integrationTestUtils.createMockBowpiResponse('new-token');
      integrationTestUtils.mockServerResponse(refreshResponse);

      const refreshedUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      });

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(refreshedUserData);

      const refreshResult = await authService.refreshToken();
      expect(refreshResult).toBe(true);

      // Phase 4: Logout
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      const logoutResult = await authService.logout();

      // Assert logout success
      expect(logoutResult.success).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Assert cleanup
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);
    });

    it('should handle complete offline-to-online authentication flow', async () => {
      // Phase 1: Attempt login while offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      let result = await authService.login(credentials);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_UNAVAILABLE');

      // Phase 2: Network comes back online
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Phase 3: Successful login after network restoration
      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      result = await authService.login(credentials);
      expect(result.success).toBe(true);

      // Phase 4: Go offline again
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Phase 5: Verify offline session persistence
      const isAuthenticated = await authService.isAuthenticated();
      expect(isAuthenticated).toBe(true);

      // Phase 6: Offline logout with confirmation
      const mockAlert = jest.spyOn(require('react-native'), 'Alert', 'get')
        .mockReturnValue({
          alert: jest.fn((title, message, buttons) => {
            const logoutButton = buttons?.find((b: any) => b.text === 'Logout' || b.style !== 'cancel');
            if (logoutButton?.onPress) {
              logoutButton.onPress();
            }
          })
        });

      const logoutResult = await authService.logout();
      expect(logoutResult.success).toBe(true);
      expect(logoutResult.serverLogoutAttempted).toBe(false);

      mockAlert.mockRestore();
    });

    it('should handle session recovery across app restarts', async () => {
      // Phase 1: Initial login
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
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Phase 2: Simulate app restart
      const newAuthService = new BowpiAuthService();
      await newAuthService.initialize();

      // Phase 3: Verify session restoration
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('user123');

      // Phase 4: Simulate session corruption
      const corruptedData = { invalid: 'data' };
      integrationTestUtils.setStorageData('bowpi_session_data', corruptedData, true);

      // Phase 5: Another app restart with corrupted data
      const recoveryAuthService = new BowpiAuthService();
      await recoveryAuthService.initialize();

      // Wait for recovery process
      await integrationTestUtils.waitFor(500);

      // Phase 6: Verify recovery handled corruption
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle concurrent authentication operations', async () => {
      // Phase 1: Concurrent login attempts
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock multiple responses
      for (let i = 0; i < 5; i++) {
        integrationTestUtils.mockServerResponse(loginResponse);
      }

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      const concurrentLogins = Array(5).fill(0).map(() =>
        authService.login(credentials)
      );

      const results = await Promise.all(concurrentLogins);

      // Assert all succeeded or handled gracefully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Assert final state is consistent
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('user123');

      // Phase 2: Concurrent logout attempts
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      for (let i = 0; i < 3; i++) {
        integrationTestUtils.mockServerResponse(logoutResponse);
      }

      const concurrentLogouts = Array(3).fill(0).map(() =>
        authService.logout()
      );

      const logoutResults = await Promise.all(concurrentLogouts);

      // Assert all handled gracefully
      logoutResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Assert final state is consistent
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle authentication with network quality changes', async () => {
      // Phase 1: Login on WiFi
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
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      let result = await authService.login(credentials);
      expect(result.success).toBe(true);

      // Phase 2: Switch to cellular
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular'
      });

      // Phase 3: Token refresh on cellular
      const refreshResponse = integrationTestUtils.createMockBowpiResponse('refreshed-token');
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(refreshResponse)
          }), 1000) // Slower cellular response
        )
      );

      const refreshResult = await authService.refreshToken();
      expect(refreshResult).toBe(true);

      // Phase 4: Switch to ethernet (faster)
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'ethernet'
      });

      // Phase 5: Fast logout on ethernet
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      const logoutResult = await authService.logout();
      expect(logoutResult.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from multiple types of failures', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Phase 1: Network failure during login
      integrationTestUtils.mockNetworkError('Network timeout');
      let result = await authService.login(credentials);
      expect(result.success).toBe(false);

      // Phase 2: Server error during login
      integrationTestUtils.mockServerError(500, 'Internal server error');
      result = await authService.login(credentials);
      expect(result.success).toBe(false);

      // Phase 3: Authentication failure
      integrationTestUtils.mockServerError(401, 'Invalid credentials');
      result = await authService.login(credentials);
      expect(result.success).toBe(false);

      // Phase 4: Successful login after failures
      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      result = await authService.login(credentials);
      expect(result.success).toBe(true);

      // Phase 5: Storage error during operation
      jest.spyOn(bowpiSecureStorage, 'secureStore')
        .mockRejectedValueOnce(new Error('Storage unavailable'));

      // Should handle storage error gracefully
      const isAuthenticated = await authService.isAuthenticated();
      expect(isAuthenticated).toBe(true); // Should still work from memory
    });

    it('should handle session recovery service failures', async () => {
      // Phase 1: Create corrupted session
      const corruptedData = { invalid: 'session' };
      integrationTestUtils.setStorageData('bowpi_session_data', corruptedData, true);

      // Phase 2: Mock session recovery service failure
      jest.spyOn(sessionRecoveryService, 'validateAndRecoverSession')
        .mockRejectedValue(new Error('Recovery service failed'));

      // Phase 3: Initialize service
      await authService.initialize();

      // Assert - Should handle recovery failure gracefully
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should maintain data consistency during failures', async () => {
      // Phase 1: Successful login
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

      // Phase 2: Simulate partial failure during logout
      jest.spyOn(bowpiSecureStorage, 'secureDelete')
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValue({ success: true });

      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);
      integrationTestUtils.mockServerResponse(logoutResponse);

      const logoutResult = await authService.logout();

      // Assert - Should handle partial failure
      expect(logoutResult.success).toBe(true);
      expect(logoutResult.localLogoutSuccess).toBe(false); // Storage failed
      expect(logoutResult.serverLogoutSuccess).toBe(true);

      // Auth store should still be cleared
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency authentication operations', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');
      const logoutResponse = integrationTestUtils.createMockBowpiResponse(null);

      // Mock responses for multiple operations
      for (let i = 0; i < 20; i++) {
        integrationTestUtils.mockServerResponse(loginResponse);
        integrationTestUtils.mockServerResponse(logoutResponse);
      }

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Perform rapid login/logout cycles
      for (let i = 0; i < 10; i++) {
        const loginResult = await authService.login(credentials);
        expect(loginResult.success).toBe(true);

        const logoutResult = await authService.logout();
        expect(logoutResult.success).toBe(true);
      }

      // Assert final state is clean
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle large user profile data efficiently', async () => {
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Create large user profile
      const largeProfile = {
        names: 'María José Alejandra',
        lastNames: 'González Rodríguez de la Torre',
        documentType: 'CC',
        documentNumber: '1234567890',
        phone: '+57 300 123 4567',
        address: 'Carrera 15 #123-45, Apartamento 501, Torre Norte, Conjunto Residencial Los Rosales, Barrio La Castellana, Localidad de Chapinero, Bogotá D.C., Colombia',
        additionalInfo: {
          occupation: 'Ingeniera de Sistemas y Computación',
          company: 'Empresa de Tecnología e Innovación S.A.S.',
          emergencyContact: {
            name: 'Carlos Alberto González',
            phone: '+57 301 987 6543',
            relationship: 'Padre'
          },
          references: [
            {
              name: 'Ana Patricia Rodríguez',
              phone: '+57 302 456 7890',
              relationship: 'Jefe inmediato'
            },
            {
              name: 'Luis Fernando Martínez',
              phone: '+57 303 123 4567',
              relationship: 'Colega de trabajo'
            }
          ]
        }
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        userProfile: largeProfile
      });

      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      const startTime = Date.now();
      const result = await authService.login(credentials);
      const endTime = Date.now();

      // Assert - Should handle large data efficiently
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify large profile data is stored correctly
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      expect(storedSession.data.userData.userProfile.additionalInfo).toBeDefined();
    });

    it('should handle memory pressure gracefully', async () => {
      // Create memory pressure
      const largeArrays = Array(100).fill(0).map(() => 
        Array(1000).fill(0).map(() => ({
          data: 'x'.repeat(100),
          timestamp: Date.now(),
          random: Math.random()
        }))
      );

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act under memory pressure
      const result = await authService.login(credentials);

      // Assert - Should complete successfully
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');

      // Cleanup
      largeArrays.length = 0;
    });
  });

  describe('Security and Data Protection', () => {
    it('should maintain security throughout authentication flow', async () => {
      const credentials = {
        username: 'testuser',
        password: 'supersecretpassword123'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Spy on console to check for sensitive data exposure
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await authService.login(credentials);

      // Assert - Sensitive data should not be logged
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ].join(' ');

      expect(allLogs).not.toContain('supersecretpassword123');
      expect(allLogs).not.toContain('encrypted-jwt-token');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should encrypt sensitive data in storage', async () => {
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

      // Verify data is encrypted in storage
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(true);
      expect(storedToken.encrypted).toBe(true);

      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      expect(storedSession.encrypted).toBe(true);
    });

    it('should validate data integrity throughout the flow', async () => {
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

      // Verify data integrity
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      
      const sessionData = storedSession.data;
      expect(sessionData.userData.userId).toBe('user123');
      expect(sessionData.userData.email).toBe('test@example.com');
      expect(sessionData.sessionId).toBeDefined();
      expect(sessionData.timestamp).toBeDefined();
    });
  });
});
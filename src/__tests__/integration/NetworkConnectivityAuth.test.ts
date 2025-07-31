// Integration Test: Network Connectivity Changes During Authentication
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import NetworkAwareService from '../../services/NetworkAwareService';

describe('Network Connectivity Changes During Authentication', () => {
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

  describe('Network Changes During Login', () => {
    it('should handle network disconnection during login request', async () => {
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

      // Simulate network disconnection during request
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
          statusText: 'Network Error',
          json: () => Promise.reject(new Error('Network request failed'))
        });
      }, 100);

      const result = await loginPromise;

      // Assert - Should handle network failure gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should retry login when network is restored', async () => {
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

      // Simulate network restoration
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

    it('should handle network quality changes during authentication', async () => {
      // Arrange - Start with good WiFi
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

      // Mock slower response for cellular
      let responseDelay = 100; // Fast WiFi response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), responseDelay)
        )
      );

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Start login
      const loginPromise = authService.login(credentials);

      // Simulate network quality degradation during request
      setTimeout(() => {
        integrationTestUtils.simulateNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular' // Slower connection
        });
        responseDelay = 2000; // Slower cellular response
      }, 50);

      const result = await loginPromise;

      // Assert - Should still succeed despite network quality change
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });

    it('should handle intermittent connectivity during login', async () => {
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
        
        // First few calls fail due to intermittent connectivity
        if (callCount <= 2) {
          // Simulate network disconnection
          integrationTestUtils.simulateNetworkChange({
            isConnected: false,
            isInternetReachable: false,
            type: 'none'
          });
          
          return Promise.reject(new Error('Network temporarily unavailable'));
        }
        
        // Network comes back
        integrationTestUtils.simulateNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi'
        });
        
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

    it('should timeout appropriately on unstable networks', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock very unstable network with long delays
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((resolve, reject) => {
          // Simulate network instability
          setTimeout(() => {
            if (Math.random() > 0.7) {
              resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(integrationTestUtils.createMockBowpiResponse('token'))
              });
            } else {
              reject(new Error('Network timeout'));
            }
          }, 5000); // 5 second delay
        })
      );

      // Act
      const startTime = Date.now();
      const result = await authService.login(credentials);
      const endTime = Date.now();

      // Assert - Should timeout within reasonable time
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(endTime - startTime).toBeLessThan(10000); // Should timeout before 10s
    });
  });

  describe('Network Changes During Session Management', () => {
    it('should handle network disconnection during token refresh', async () => {
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

      // Simulate network disconnection
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Act - Try to refresh token while offline
      const refreshResult = await authService.refreshToken();

      // Assert - Should fail due to offline state
      expect(refreshResult).toBe(false);

      // Session should remain valid locally
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
    });

    it('should resume token refresh when network is restored', async () => {
      // Arrange - Login with token close to expiry
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const soonToExpireUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      });

      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(soonToExpireUserData);

      await authService.login(credentials);

      // Go offline
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Try to refresh (should fail)
      let refreshResult = await authService.refreshToken();
      expect(refreshResult).toBe(false);

      // Come back online
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Mock successful refresh response
      const refreshResponse = integrationTestUtils.createMockBowpiResponse('new-refreshed-token');
      integrationTestUtils.mockServerResponse(refreshResponse);

      const refreshedUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(refreshedUserData);

      // Act - Retry refresh now that we're online
      refreshResult = await authService.refreshToken();

      // Assert - Should succeed now
      expect(refreshResult).toBe(true);

      const authState = useAuthStore.getState();
      expect(authState.bowpiToken).toBe('new-refreshed-token');
    });

    it('should handle network changes during logout', async () => {
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

      // Mock slow logout response
      let resolveLogout: (value: any) => void;
      const slowLogoutResponse = new Promise(resolve => {
        resolveLogout = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(slowLogoutResponse);

      // Start logout
      const logoutPromise = authService.logout();

      // Simulate network disconnection during logout
      setTimeout(() => {
        integrationTestUtils.simulateNetworkChange({
          isConnected: false,
          isInternetReachable: false,
          type: 'none'
        });

        // Resolve with network error
        resolveLogout!({
          ok: false,
          status: 0,
          json: () => Promise.reject(new Error('Network error'))
        });
      }, 100);

      const result = await logoutPromise;

      // Assert - Should succeed locally despite network error
      expect(result.success).toBe(true);
      expect(result.serverLogoutAttempted).toBe(true);
      expect(result.serverLogoutSuccess).toBe(false);
      expect(result.localLogoutSuccess).toBe(true);

      // Local state should be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });

  describe('Network Quality Adaptation', () => {
    it('should adapt request timeouts based on network quality', async () => {
      // Arrange - Start with poor cellular connection
      integrationTestUtils.setNetworkState({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular'
      });

      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock slower response for cellular
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), 3000) // 3 second delay for cellular
        )
      );

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const startTime = Date.now();
      const result = await authService.login(credentials);
      const endTime = Date.now();

      // Assert - Should succeed despite slow connection
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
      expect(endTime - startTime).toBeGreaterThan(2500); // Should have waited for slow response
    });

    it('should handle network type changes during authentication', async () => {
      // Arrange - Start with WiFi
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

      let responseTime = 100; // Fast WiFi
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponse)
          }), responseTime)
        )
      );

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Start login
      const loginPromise = authService.login(credentials);

      // Switch to cellular during request
      setTimeout(() => {
        integrationTestUtils.simulateNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular'
        });
        responseTime = 2000; // Slower cellular
      }, 50);

      const result = await loginPromise;

      // Assert - Should adapt to network change
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });

    it('should handle ethernet to mobile network transitions', async () => {
      // Arrange - Start with ethernet (fastest)
      integrationTestUtils.setNetworkState({
        isConnected: true,
        isInternetReachable: true,
        type: 'ethernet'
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

      // Login with ethernet
      let result = await authService.login(credentials);
      expect(result.success).toBe(true);

      // Switch to mobile network
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular'
      });

      // Mock token refresh with slower response
      const refreshResponse = integrationTestUtils.createMockBowpiResponse('refreshed-token');
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(refreshResponse)
          }), 1500) // Slower mobile response
        )
      );

      // Act - Refresh token on mobile network
      const refreshResult = await authService.refreshToken();

      // Assert - Should adapt to slower network
      expect(refreshResult).toBe(true);
    });
  });

  describe('Network Monitoring and Recovery', () => {
    it('should monitor network status continuously', async () => {
      // Arrange - Login first
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

      // Spy on network status checks
      const networkStatusSpy = jest.spyOn(NetworkAwareService, 'getNetworkStatus');

      // Simulate multiple network changes
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      await integrationTestUtils.waitFor(200);

      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      await integrationTestUtils.waitFor(200);

      // Assert - Network status should be monitored
      expect(networkStatusSpy).toHaveBeenCalled();
    });

    it('should handle rapid network state changes', async () => {
      // Arrange - Login first
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

      // Simulate rapid network changes
      const networkStates = [
        { isConnected: false, isInternetReachable: false, type: 'none' },
        { isConnected: true, isInternetReachable: true, type: 'wifi' },
        { isConnected: true, isInternetReachable: false, type: 'wifi' },
        { isConnected: true, isInternetReachable: true, type: 'cellular' },
        { isConnected: true, isInternetReachable: true, type: 'wifi' },
      ];

      for (const state of networkStates) {
        integrationTestUtils.simulateNetworkChange(state);
        await integrationTestUtils.waitFor(50);
      }

      // Wait for all changes to be processed
      await integrationTestUtils.waitFor(500);

      // Assert - Should handle rapid changes gracefully
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should recover from network errors automatically', async () => {
      // Arrange - Setup scenario where network recovery is needed
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Start offline
      integrationTestUtils.setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Try to login (should fail)
      let result = await authService.login(credentials);
      expect(result.success).toBe(false);

      // Network comes back
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Setup successful response
      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Wait for network recovery to be detected
      await integrationTestUtils.waitFor(300);

      // Act - Retry login after network recovery
      result = await authService.login(credentials);

      // Assert - Should succeed after network recovery
      expect(result.success).toBe(true);
      expect(result.userData?.userId).toBe('user123');
    });

    it('should provide network status information to UI', async () => {
      // Arrange - Login first
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

      // Act - Check network status
      const networkStatus = await NetworkAwareService.getNetworkStatus();

      // Assert - Should provide accurate network information
      expect(networkStatus).toBeDefined();
      expect(networkStatus.isConnected).toBe(true);
      expect(networkStatus.type).toBe('wifi');

      // Simulate network change
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      await integrationTestUtils.waitFor(100);

      const updatedStatus = await NetworkAwareService.getNetworkStatus();
      expect(updatedStatus.isConnected).toBe(false);
      expect(updatedStatus.type).toBe('none');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle DNS resolution failures', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock DNS resolution failure
      integrationTestUtils.mockNetworkError('getaddrinfo ENOTFOUND api.bowpi.com');

      // Act
      const result = await authService.login(credentials);

      // Assert - Should handle DNS failure gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('ENOTFOUND');
    });

    it('should handle SSL/TLS certificate errors', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock SSL certificate error
      integrationTestUtils.mockNetworkError('certificate verify failed');

      // Act
      const result = await authService.login(credentials);

      // Assert - Should handle SSL error gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.message).toContain('certificate');
    });

    it('should handle proxy and firewall issues', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock proxy/firewall blocking
      integrationTestUtils.mockServerError(407, 'Proxy Authentication Required');

      // Act
      const result = await authService.login(credentials);

      // Assert - Should handle proxy issues gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('NETWORK_ERROR');
      expect(result.error?.statusCode).toBe(407);
    });

    it('should maintain session state during network instability', async () => {
      // Arrange - Login first
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

      // Simulate network instability
      for (let i = 0; i < 5; i++) {
        integrationTestUtils.simulateNetworkChange({
          isConnected: Math.random() > 0.5,
          isInternetReachable: Math.random() > 0.3,
          type: ['wifi', 'cellular', 'none'][Math.floor(Math.random() * 3)]
        });
        
        await integrationTestUtils.waitFor(100);
      }

      // Stabilize network
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      await integrationTestUtils.waitFor(200);

      // Assert - Session should remain stable
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });
  });
});
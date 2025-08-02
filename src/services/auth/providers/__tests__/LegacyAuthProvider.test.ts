// LegacyAuthProvider Tests
// Tests for the legacy authentication provider (mock/simulated authentication)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LegacyAuthProvider } from '../LegacyAuthProvider';
import { 
  AuthType, 
  LegacyAuthConfig, 
  AuthProviderCapabilities,
  ProviderHealthStatus,
  ProviderDebugInfo,
  AuthProviderError,
  AuthProviderErrorType
} from '../../../../types/auth-providers';
import { User, LoginResult } from '../../../../types/auth-shared';

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = mockConsole as any;

describe('LegacyAuthProvider', () => {
  let provider: LegacyAuthProvider;
  let mockConfig: LegacyAuthConfig;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      mockDelay: 100, // Short delay for tests
      allowedUsers: ['test@example.com', 'admin@test.com'],
      simulateNetworkErrors: false,
      offlineMode: true,
      sessionDuration: 60000, // 1 minute for tests
      enableDebugLogging: false,
      mockUserRoles: {
        'admin@test.com': 'supervisor',
        'test@example.com': 'agent'
      }
    };
    
    provider = new LegacyAuthProvider(mockConfig);
  });

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.type).toBe(AuthType.LEGACY);
      expect(provider.name).toBe('Legacy Authentication');
      expect(provider.description).toBe('Simulated authentication for development and testing');
      expect(provider.version).toBe('1.0.0');
    });

    it('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportsOffline).toBe(true);
      expect(capabilities.supportsTokenRefresh).toBe(false);
      expect(capabilities.supportsPasswordReset).toBe(false);
      expect(capabilities.supportsBiometric).toBe(false);
      expect(capabilities.requiresNetwork).toBe(false);
      expect(capabilities.supportsMultipleUsers).toBe(true);
      expect(capabilities.hasSessionPersistence).toBe(true);
      expect(capabilities.supportsRoleBasedAuth).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it('should load existing session during initialization', async () => {
      const mockSession = {
        user: {
          id: 'legacy-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent'
        },
        createdAt: Date.now() - 30000,
        lastActivity: Date.now() - 10000,
        expiresAt: Date.now() + 30000, // Valid session
        sessionId: 'session-123'
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockSession));
      
      await provider.initialize();
      
      const isAuth = await provider.isAuthenticated();
      expect(isAuth).toBe(true);
      
      const user = await provider.getCurrentUser();
      expect(user?.email).toBe('test@example.com');
    });

    it('should handle initialization errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(provider.initialize()).rejects.toThrow('Failed to initialize legacy authentication provider');
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await provider.initialize();
    });

    it('should login with valid credentials', async () => {
      const result = await provider.login('test@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.userData).toBeDefined();
      expect(result.userData?.email).toBe('test@example.com');
      expect(result.userData?.role).toBe('agent'); // From mockUserRoles
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should login with supervisor role', async () => {
      const result = await provider.login('admin@test.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.userData?.role).toBe('supervisor');
    });

    it('should reject invalid email format', async () => {
      const result = await provider.login('invalid-email', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
      expect(result.error).toBeDefined();
    });

    it('should reject short passwords', async () => {
      const result = await provider.login('test@example.com', '123');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });

    it('should respect allowed users list', async () => {
      const result = await provider.login('notallowed@example.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });

    it('should accept any user when allowed users list is empty', async () => {
      const configWithoutAllowedUsers = {
        ...mockConfig,
        allowedUsers: []
      };
      const providerWithoutRestrictions = new LegacyAuthProvider(configWithoutAllowedUsers);
      await providerWithoutRestrictions.initialize();
      
      const result = await providerWithoutRestrictions.login('anyone@example.com', 'password123');
      
      expect(result.success).toBe(true);
    });

    it('should simulate network errors when configured', async () => {
      const configWithErrors = {
        ...mockConfig,
        simulateNetworkErrors: true
      };
      const providerWithErrors = new LegacyAuthProvider(configWithErrors);
      await providerWithErrors.initialize();
      
      // Run multiple attempts to hit the 10% error rate
      const results = await Promise.all(
        Array(20).fill(0).map(() => 
          providerWithErrors.login('test@example.com', 'password123')
        )
      );
      
      // Should have at least some failures due to simulated errors
      const failures = results.filter(r => !r.success);
      expect(failures.length).toBeGreaterThan(0);
    });

    it('should respect mock delay', async () => {
      const configWithDelay = {
        ...mockConfig,
        mockDelay: 500
      };
      const providerWithDelay = new LegacyAuthProvider(configWithDelay);
      await providerWithDelay.initialize();
      
      const startTime = Date.now();
      await providerWithDelay.login('test@example.com', 'password123');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(500);
    });

    it('should create proper user data structure', async () => {
      const result = await provider.login('john.doe@example.com', 'password123');
      
      expect(result.userData).toMatchObject({
        id: expect.stringMatching(/^legacy-\d+-[a-z0-9]+$/),
        email: 'john.doe@example.com',
        name: 'John Doe', // Formatted from email
        role: 'agent',
        profile: {
          provider: 'legacy',
          createdAt: expect.any(String),
          lastLogin: expect.any(String),
          sessionType: 'mock',
          mockDelay: mockConfig.mockDelay,
          allowedUser: false // Not in allowed users list
        }
      });
    });

    it('should handle login errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await provider.login('test@example.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should track login metrics', async () => {
      await provider.login('test@example.com', 'password123');
      await provider.login('invalid@example.com', 'password123');
      
      const debugInfo = provider.getDebugInfo();
      
      expect(debugInfo.metrics.loginAttempts).toBe(2);
      expect(debugInfo.metrics.successfulLogins).toBe(1);
      expect(debugInfo.metrics.failedLogins).toBe(1);
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await provider.initialize();
    });

    it('should check authentication status correctly', async () => {
      // Initially not authenticated
      expect(await provider.isAuthenticated()).toBe(false);

      // Login
      await provider.login('test@example.com', 'password123');
      expect(await provider.isAuthenticated()).toBe(true);

      // Logout
      await provider.logout();
      expect(await provider.isAuthenticated()).toBe(false);
    });

    it('should get current user after login', async () => {
      await provider.login('test@example.com', 'password123');
      
      const user = await provider.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
    });

    it('should return null for current user when not authenticated', async () => {
      const user = await provider.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle session expiration', async () => {
      const shortSessionConfig = {
        ...mockConfig,
        sessionDuration: 100 // 100ms for quick expiration
      };
      const shortSessionProvider = new LegacyAuthProvider(shortSessionConfig);
      await shortSessionProvider.initialize();

      await shortSessionProvider.login('test@example.com', 'password123');
      expect(await shortSessionProvider.isAuthenticated()).toBe(true);

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await shortSessionProvider.isAuthenticated()).toBe(false);
    });

    it('should logout successfully', async () => {
      await provider.login('test@example.com', 'password123');
      expect(await provider.isAuthenticated()).toBe(true);

      await provider.logout();
      
      expect(await provider.isAuthenticated()).toBe(false);
      expect(await provider.getCurrentUser()).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('legacy_auth_session');
    });

    it('should handle logout when not authenticated', async () => {
      await expect(provider.logout()).resolves.not.toThrow();
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await provider.initialize();
    });

    it('should return healthy status', async () => {
      const health = await provider.healthCheck();
      
      expect(health.isHealthy).toBe(true);
      expect(health.lastCheck).toBeDefined();
      expect(health.issues).toHaveLength(0);
      expect(health.performance).toBeDefined();
      expect(health.performance.averageLoginTime).toBeGreaterThan(0);
      expect(health.performance.successRate).toBe(1.0); // No attempts yet
    });

    it('should detect initialization issues', async () => {
      const uninitializedProvider = new LegacyAuthProvider(mockConfig);
      
      const health = await uninitializedProvider.healthCheck();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Provider not initialized');
    });

    it('should detect storage access issues', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const health = await provider.healthCheck();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Storage access failed');
    });

    it('should detect expired sessions', async () => {
      // Create a session that will expire
      const expiredSession = {
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'agent' as const, profile: {} },
        createdAt: Date.now() - 120000,
        lastActivity: Date.now() - 120000,
        expiresAt: Date.now() - 60000, // Expired 1 minute ago
        sessionId: 'expired-session'
      };
      
      // Simulate having an expired session
      (provider as any).sessionData = expiredSession;
      
      const health = await provider.healthCheck();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Current session expired');
    });

    it('should handle health check errors gracefully', async () => {
      // Mock a critical error during health check
      mockAsyncStorage.getItem.mockImplementation(() => {
        throw new Error('Critical storage error');
      });
      
      const health = await provider.healthCheck();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Health check failed');
      expect(health.performance.averageLoginTime).toBe(0);
      expect(health.performance.successRate).toBe(0);
    });

    it('should calculate performance metrics correctly', async () => {
      // Perform some operations to generate metrics
      await provider.login('test@example.com', 'password123');
      await provider.login('invalid@example.com', 'password123');
      
      const health = await provider.healthCheck();
      
      expect(health.performance.totalOperations).toBe(2);
      expect(health.performance.successRate).toBe(0.5);
      expect(health.performance.lastSuccessfulOperation).toBeGreaterThan(0);
    });
  });

  describe('Debug Information', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      await provider.initialize();
    });

    it('should provide comprehensive debug information', async () => {
      await provider.login('test@example.com', 'password123');
      
      const debugInfo = provider.getDebugInfo();
      
      expect(debugInfo.type).toBe(AuthType.LEGACY);
      expect(debugInfo.name).toBe('Legacy Authentication');
      expect(debugInfo.version).toBe('1.0.0');
      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.hasActiveSession).toBe(true);
      expect(debugInfo.lastActivity).toBeGreaterThan(0);
      
      expect(debugInfo.configuration).toMatchObject({
        mockDelay: mockConfig.mockDelay,
        allowedUsersCount: mockConfig.allowedUsers.length,
        simulateNetworkErrors: mockConfig.simulateNetworkErrors,
        offlineMode: mockConfig.offlineMode,
        sessionDuration: mockConfig.sessionDuration
      });
      
      expect(debugInfo.metrics).toMatchObject({
        loginAttempts: 1,
        successfulLogins: 1,
        failedLogins: 0,
        sessionDuration: 0
      });
      
      expect(debugInfo.errors).toMatchObject({
        recent: expect.any(Array),
        count: expect.any(Number)
      });
    });

    it('should track recent errors in debug info', async () => {
      // Cause an error
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await provider.login('test@example.com', 'password123');
      
      const debugInfo = provider.getDebugInfo();
      
      expect(debugInfo.errors.count).toBeGreaterThan(0);
      expect(debugInfo.errors.recent.length).toBeGreaterThan(0);
      expect(debugInfo.errors.lastError).toBeDefined();
      expect(debugInfo.errors.lastError?.message).toContain('Storage error');
    });

    it('should limit recent errors to 10', async () => {
      // Generate more than 10 errors
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      for (let i = 0; i < 15; i++) {
        await provider.login('test@example.com', 'password123');
      }
      
      const debugInfo = provider.getDebugInfo();
      
      expect(debugInfo.errors.recent.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors during login', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));
      await provider.initialize();

      const result = await provider.login('test@example.com', 'password123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
      expect(result.error).toBeDefined();
    });

    it('should handle AsyncStorage errors during logout', async () => {
      await provider.initialize();
      await provider.login('test@example.com', 'password123');
      
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(provider.logout()).rejects.toThrow('Failed to logout');
    });

    it('should handle corrupted session data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      
      await provider.initialize();
      
      // Should handle corrupted data gracefully
      expect(await provider.isAuthenticated()).toBe(false);
    });

    it('should handle network simulation errors gracefully', async () => {
      const errorConfig = {
        ...mockConfig,
        simulateNetworkErrors: true
      };
      const errorProvider = new LegacyAuthProvider(errorConfig);
      await errorProvider.initialize();

      // Run multiple attempts to trigger simulated errors
      const results = [];
      for (let i = 0; i < 50; i++) {
        const result = await errorProvider.login('test@example.com', 'password123');
        results.push(result);
      }

      // Should have some failures due to simulated errors
      const failures = results.filter(r => !r.success);
      expect(failures.length).toBeGreaterThan(0);
      
      // All failures should have proper error structure
      failures.forEach(failure => {
        expect(failure.error).toBeDefined();
        expect(failure.message).toBeDefined();
        expect(failure.duration).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent login attempts', async () => {
      await provider.initialize();

      // Simulate concurrent login attempts
      const loginPromises = Array(5).fill(0).map(() => 
        provider.login('test@example.com', 'password123')
      );

      const results = await Promise.all(loginPromises);

      // All should succeed (no race conditions)
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.userData).toBeDefined();
      });
    });

    it('should handle session validation during concurrent operations', async () => {
      await provider.initialize();
      await provider.login('test@example.com', 'password123');

      // Simulate concurrent session checks
      const checkPromises = Array(10).fill(0).map(() => provider.isAuthenticated());
      const results = await Promise.all(checkPromises);

      // All should return true consistently
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should handle extreme configuration values', async () => {
      const extremeConfig = {
        ...mockConfig,
        mockDelay: 0,
        sessionDuration: 1000, // Very short session
        allowedUsers: []
      };
      const extremeProvider = new LegacyAuthProvider(extremeConfig);
      await extremeProvider.initialize();

      const result = await extremeProvider.login('any@example.com', 'password123');
      expect(result.success).toBe(true);

      // Session should expire quickly
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await extremeProvider.isAuthenticated()).toBe(false);
    });

    it('should handle large allowed users list', async () => {
      const largeUsersList = Array(1000).fill(0).map((_, i) => `user${i}@example.com`);
      const largeConfig = {
        ...mockConfig,
        allowedUsers: largeUsersList
      };
      const largeProvider = new LegacyAuthProvider(largeConfig);
      await largeProvider.initialize();

      // Should handle large list efficiently
      const result = await largeProvider.login('user500@example.com', 'password123');
      expect(result.success).toBe(true);

      const invalidResult = await largeProvider.login('notinlist@example.com', 'password123');
      expect(invalidResult.success).toBe(false);
    });

    it('should handle special characters in user data', async () => {
      await provider.initialize();

      const specialEmail = 'test+special.email@example-domain.com';
      const result = await provider.login(specialEmail, 'password123');

      expect(result.success).toBe(true);
      expect(result.userData?.email).toBe(specialEmail);
      expect(result.userData?.name).toBe('Test+special Email');
    });

    it('should validate session data integrity', async () => {
      await provider.initialize();
      await provider.login('test@example.com', 'password123');

      // Simulate corrupted session data
      const corruptedSession = {
        user: null, // Missing user data
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 60000,
        sessionId: 'corrupted-session'
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(corruptedSession));

      // Should handle corrupted session gracefully
      expect(await provider.isAuthenticated()).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid successive operations', async () => {
      await provider.initialize();

      const startTime = Date.now();
      
      // Perform rapid operations
      for (let i = 0; i < 100; i++) {
        await provider.login(`user${i}@example.com`, 'password123');
        await provider.isAuthenticated();
        await provider.getCurrentUser();
        await provider.logout();
      }

      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds for 100 cycles
    });

    it('should maintain consistent performance with metrics tracking', async () => {
      await provider.initialize();

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await provider.login('test@example.com', 'password123');
        await provider.logout();
      }

      const debugInfo = provider.getDebugInfo();
      
      expect(debugInfo.metrics.loginAttempts).toBe(10);
      expect(debugInfo.metrics.successfulLogins).toBe(10);
      expect(debugInfo.metrics.failedLogins).toBe(0);
    });

    it('should handle memory efficiently with large session data', async () => {
      await provider.initialize();

      // Create user with large profile data
      const largeProfileData = {
        ...mockConfig,
        mockUserRoles: Object.fromEntries(
          Array(1000).fill(0).map((_, i) => [`user${i}@example.com`, 'agent'])
        )
      };

      const largeProvider = new LegacyAuthProvider(largeProfileData);
      await largeProvider.initialize();

      const result = await largeProvider.login('user500@example.com', 'password123');
      expect(result.success).toBe(true);

      // Should handle large data without issues
      const user = await largeProvider.getCurrentUser();
      expect(user).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await provider.initialize();
      await provider.login('test@example.com', 'password123');
      
      await provider.cleanup();
      
      // Should clear session
      expect(await provider.isAuthenticated()).toBe(false);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('legacy_auth_session');
    });

    it('should handle cleanup errors gracefully', async () => {
      await provider.initialize();
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Cleanup error'));
      
      await expect(provider.cleanup()).resolves.not.toThrow();
    });

    it('should reset internal state after cleanup', async () => {
      await provider.initialize();
      await provider.login('test@example.com', 'password123');

      const debugInfoBefore = provider.getDebugInfo();
      expect(debugInfoBefore.isInitialized).toBe(true);
      expect(debugInfoBefore.hasActiveSession).toBe(true);

      await provider.cleanup();

      const debugInfoAfter = provider.getDebugInfo();
      expect(debugInfoAfter.isInitialized).toBe(false);
      expect(debugInfoAfter.hasActiveSession).toBe(false);
    });
  });
});
// AuthStoreManager Dual Authentication Tests
// Tests for the enhanced AuthStoreManager with dual authentication support

import { AuthStoreManager } from '../AuthStoreManager';
import { AuthProviderFactory } from '../auth/AuthProviderFactory';
import { AuthConfigurationService } from '../auth/AuthConfiguration';
import { AuthType, AuthProvider, SwitchValidationResult } from '../../types/auth-providers';
import { User } from '../../types/auth-shared';

// Mock dependencies
jest.mock('../auth/AuthProviderFactory');
jest.mock('../auth/AuthConfiguration');

// Mock console to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = mockConsole as any;

describe('AuthStoreManager - Dual Authentication', () => {
  let authStoreManager: AuthStoreManager;
  let mockProviderFactory: jest.Mocked<AuthProviderFactory>;
  let mockConfigService: jest.Mocked<AuthConfigurationService>;
  let mockLegacyProvider: jest.Mocked<AuthProvider>;
  let mockBowpiProvider: jest.Mocked<AuthProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock providers
    mockLegacyProvider = {
      type: AuthType.LEGACY,
      name: 'Legacy Authentication',
      description: 'Legacy provider',
      version: '1.0.0',
      initialize: jest.fn(),
      cleanup: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      healthCheck: jest.fn(),
      getCapabilities: jest.fn(),
      getMetrics: jest.fn(),
      resetMetrics: jest.fn(),
      updateConfiguration: jest.fn(),
    } as any;

    mockBowpiProvider = {
      type: AuthType.BOWPI,
      name: 'Bowpi Authentication',
      description: 'Bowpi provider',
      version: '1.0.0',
      initialize: jest.fn(),
      cleanup: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      healthCheck: jest.fn(),
      getCapabilities: jest.fn(),
      getMetrics: jest.fn(),
      resetMetrics: jest.fn(),
      updateConfiguration: jest.fn(),
    } as any;

    // Mock factory
    mockProviderFactory = {
      getInstance: jest.fn(),
      createProvider: jest.fn(),
      switchProvider: jest.fn(),
      getCurrentProvider: jest.fn(),
      isProviderHealthy: jest.fn(),
      cleanup: jest.fn(),
      getDebugInfo: jest.fn(),
    } as any;

    (AuthProviderFactory.getInstance as jest.Mock).mockReturnValue(mockProviderFactory);

    // Mock configuration service
    mockConfigService = {
      getInstance: jest.fn(),
      initialize: jest.fn(),
      getConfiguration: jest.fn(),
      getCurrentAuthType: jest.fn(),
      setAuthType: jest.fn(),
      isRuntimeSwitchAllowed: jest.fn(),
      requiresConfirmationForSwitch: jest.fn(),
      isAutoSwitchOnFailureEnabled: jest.fn(),
      getFallbackAuthType: jest.fn(),
      getProviderConfig: jest.fn(),
      onConfigurationChange: jest.fn(),
    } as any;

    (AuthConfigurationService.getInstance as jest.Mock).mockReturnValue(mockConfigService);

    // Create AuthStoreManager instance
    authStoreManager = AuthStoreManager.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (AuthStoreManager as any).instance = undefined;
  });

  describe('Provider Switching', () => {
    beforeEach(() => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(true);
      mockConfigService.requiresConfirmationForSwitch.mockReturnValue(false);
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.LEGACY);
      
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);
      mockLegacyProvider.isAuthenticated.mockResolvedValue(false);
      mockLegacyProvider.logout.mockResolvedValue();
      
      mockProviderFactory.switchProvider.mockResolvedValue(mockBowpiProvider);
      mockProviderFactory.isProviderHealthy.mockResolvedValue(true);
    });

    it('should switch authentication provider successfully', async () => {
      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully switched to Bowpi');
      expect(result.previousType).toBe(AuthType.LEGACY);
      expect(result.newType).toBe(AuthType.BOWPI);
      expect(result.duration).toBeGreaterThan(0);

      expect(mockProviderFactory.switchProvider).toHaveBeenCalledWith(AuthType.BOWPI);
      expect(mockConfigService.setAuthType).toHaveBeenCalledWith(AuthType.BOWPI);
    });

    it('should logout current user before switching', async () => {
      mockLegacyProvider.isAuthenticated.mockResolvedValue(true);

      await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(mockLegacyProvider.logout).toHaveBeenCalled();
    });

    it('should reject switch when runtime switching is disabled', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(false);

      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Runtime provider switching is not allowed');
      expect(result.error).toBeDefined();
    });

    it('should reject switch to same provider type', async () => {
      const result = await authStoreManager.switchAuthProvider(AuthType.LEGACY);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Already using Legacy provider');
    });

    it('should handle switch validation failure', async () => {
      mockProviderFactory.isProviderHealthy.mockResolvedValue(false);

      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Target provider is not healthy');
    });

    it('should handle logout failure during switch', async () => {
      mockLegacyProvider.isAuthenticated.mockResolvedValue(true);
      mockLegacyProvider.logout.mockRejectedValue(new Error('Logout failed'));

      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to logout from current provider');
      expect(result.error).toBeDefined();
    });

    it('should rollback configuration on provider switch failure', async () => {
      mockProviderFactory.switchProvider.mockRejectedValue(new Error('Switch failed'));

      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to switch provider');
      
      // Should not have changed configuration
      expect(mockConfigService.setAuthType).not.toHaveBeenCalledWith(AuthType.BOWPI);
    });

    it('should handle configuration update failure', async () => {
      mockConfigService.setAuthType.mockRejectedValue(new Error('Config update failed'));

      const result = await authStoreManager.switchAuthProvider(AuthType.BOWPI);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to update configuration');
    });
  });

  describe('Switch Validation', () => {
    beforeEach(() => {
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.LEGACY);
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);
    });

    it('should validate successful switch', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(true);
      mockProviderFactory.isProviderHealthy.mockResolvedValue(true);
      mockLegacyProvider.isAuthenticated.mockResolvedValue(false);

      const validation = await authStoreManager.validateProviderSwitch(AuthType.BOWPI);

      expect(validation.canSwitch).toBe(true);
      expect(validation.reason).toBe('Switch validation passed');
      expect(validation.warnings).toHaveLength(0);
      expect(validation.requirements.runtimeSwitchAllowed).toBe(true);
      expect(validation.requirements.targetProviderHealthy).toBe(true);
      expect(validation.requirements.currentUserLoggedOut).toBe(true);
    });

    it('should validate switch with warnings for authenticated user', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(true);
      mockProviderFactory.isProviderHealthy.mockResolvedValue(true);
      mockLegacyProvider.isAuthenticated.mockResolvedValue(true);

      const validation = await authStoreManager.validateProviderSwitch(AuthType.BOWPI);

      expect(validation.canSwitch).toBe(true);
      expect(validation.warnings).toContain('Current user will be logged out during switch');
      expect(validation.requirements.currentUserLoggedOut).toBe(false);
    });

    it('should reject switch when runtime switching is disabled', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(false);

      const validation = await authStoreManager.validateProviderSwitch(AuthType.BOWPI);

      expect(validation.canSwitch).toBe(false);
      expect(validation.reason).toContain('Runtime provider switching is not allowed');
      expect(validation.requirements.runtimeSwitchAllowed).toBe(false);
    });

    it('should reject switch when target provider is unhealthy', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(true);
      mockProviderFactory.isProviderHealthy.mockResolvedValue(false);

      const validation = await authStoreManager.validateProviderSwitch(AuthType.BOWPI);

      expect(validation.canSwitch).toBe(false);
      expect(validation.reason).toContain('Target provider is not healthy');
      expect(validation.requirements.targetProviderHealthy).toBe(false);
    });

    it('should reject switch to same provider type', async () => {
      const validation = await authStoreManager.validateProviderSwitch(AuthType.LEGACY);

      expect(validation.canSwitch).toBe(false);
      expect(validation.reason).toContain('Already using Legacy provider');
    });

    it('should handle validation errors gracefully', async () => {
      mockProviderFactory.isProviderHealthy.mockRejectedValue(new Error('Health check failed'));

      const validation = await authStoreManager.validateProviderSwitch(AuthType.BOWPI);

      expect(validation.canSwitch).toBe(false);
      expect(validation.reason).toContain('Validation failed');
      expect(validation.error).toBeDefined();
    });
  });

  describe('Current Provider Information', () => {
    it('should get current authentication type', () => {
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.BOWPI);

      const currentType = authStoreManager.getCurrentAuthType();

      expect(currentType).toBe(AuthType.BOWPI);
      expect(mockConfigService.getCurrentAuthType).toHaveBeenCalled();
    });

    it('should get current provider instance', async () => {
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);

      const provider = await authStoreManager.getCurrentProvider();

      expect(provider).toBe(mockLegacyProvider);
      expect(mockProviderFactory.getCurrentProvider).toHaveBeenCalled();
    });

    it('should handle null current provider', async () => {
      mockProviderFactory.getCurrentProvider.mockResolvedValue(null);

      const provider = await authStoreManager.getCurrentProvider();

      expect(provider).toBeNull();
    });
  });

  describe('Auto-Switch on Failure', () => {
    beforeEach(() => {
      mockConfigService.isAutoSwitchOnFailureEnabled.mockReturnValue(true);
      mockConfigService.getFallbackAuthType.mockReturnValue(AuthType.LEGACY);
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.BOWPI);
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockBowpiProvider);
    });

    it('should auto-switch on authentication failure', async () => {
      // Mock login failure
      mockBowpiProvider.login.mockResolvedValue({
        success: false,
        message: 'Network error',
        error: new Error('Network error'),
        provider: AuthType.BOWPI,
        duration: 1000
      });

      // Mock successful switch to fallback
      mockProviderFactory.switchProvider.mockResolvedValue(mockLegacyProvider);
      mockLegacyProvider.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: {
          id: 'legacy-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent'
        } as User,
        provider: AuthType.LEGACY,
        duration: 500
      });

      const result = await authStoreManager.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.provider).toBe(AuthType.LEGACY);
      expect(mockProviderFactory.switchProvider).toHaveBeenCalledWith(AuthType.LEGACY);
    });

    it('should not auto-switch when disabled', async () => {
      mockConfigService.isAutoSwitchOnFailureEnabled.mockReturnValue(false);

      mockBowpiProvider.login.mockResolvedValue({
        success: false,
        message: 'Network error',
        error: new Error('Network error'),
        provider: AuthType.BOWPI,
        duration: 1000
      });

      const result = await authStoreManager.login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(mockProviderFactory.switchProvider).not.toHaveBeenCalled();
    });

    it('should handle auto-switch failure', async () => {
      mockBowpiProvider.login.mockResolvedValue({
        success: false,
        message: 'Network error',
        error: new Error('Network error'),
        provider: AuthType.BOWPI,
        duration: 1000
      });

      mockProviderFactory.switchProvider.mockRejectedValue(new Error('Switch failed'));

      const result = await authStoreManager.login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('should not auto-switch to same provider type', async () => {
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.LEGACY);
      mockConfigService.getFallbackAuthType.mockReturnValue(AuthType.LEGACY);
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);

      mockLegacyProvider.login.mockResolvedValue({
        success: false,
        message: 'Auth error',
        error: new Error('Auth error'),
        provider: AuthType.LEGACY,
        duration: 1000
      });

      const result = await authStoreManager.login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(mockProviderFactory.switchProvider).not.toHaveBeenCalled();
    });
  });

  describe('Provider Metrics', () => {
    beforeEach(() => {
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);
    });

    it('should get provider metrics', async () => {
      const mockMetrics = {
        totalLoginAttempts: 10,
        successfulLogins: 8,
        failedLogins: 2,
        successRate: 0.8,
        averageSessionDuration: 3600000,
        lastLoginAttempt: new Date(),
        providerUptime: 86400000,
        healthChecksPassed: 100,
        healthChecksFailed: 2
      };

      mockLegacyProvider.getMetrics.mockResolvedValue(mockMetrics);

      const metrics = await authStoreManager.getProviderMetrics();

      expect(metrics).toEqual({
        currentProvider: AuthType.LEGACY,
        metrics: mockMetrics,
        retrievedAt: expect.any(Date)
      });
    });

    it('should handle metrics retrieval failure', async () => {
      mockLegacyProvider.getMetrics.mockRejectedValue(new Error('Metrics error'));

      await expect(
        authStoreManager.getProviderMetrics()
      ).rejects.toThrow('Failed to retrieve provider metrics: Metrics error');
    });

    it('should handle null current provider for metrics', async () => {
      mockProviderFactory.getCurrentProvider.mockResolvedValue(null);

      await expect(
        authStoreManager.getProviderMetrics()
      ).rejects.toThrow('No authentication provider available');
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.LEGACY);
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);
      mockProviderFactory.getDebugInfo.mockReturnValue({
        cachedProviders: [AuthType.LEGACY],
        currentProvider: AuthType.LEGACY,
        totalProvidersCreated: 1,
        lastHealthCheck: new Date(),
        factoryInitialized: true
      });
    });

    it('should provide comprehensive debug information', async () => {
      mockLegacyProvider.isAuthenticated.mockResolvedValue(true);
      mockLegacyProvider.getCurrentUser.mockResolvedValue({
        id: 'legacy-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent'
      } as User);

      const debugInfo = await authStoreManager.getDebugInfo();

      expect(debugInfo.currentAuthType).toBe(AuthType.LEGACY);
      expect(debugInfo.isAuthenticated).toBe(true);
      expect(debugInfo.currentUser?.email).toBe('test@example.com');
      expect(debugInfo.providerFactory).toBeDefined();
      expect(debugInfo.storeManagerInitialized).toBe(true);
      expect(debugInfo.lastOperation).toBeDefined();
    });

    it('should handle debug info retrieval errors', async () => {
      mockLegacyProvider.isAuthenticated.mockRejectedValue(new Error('Auth check failed'));

      const debugInfo = await authStoreManager.getDebugInfo();

      expect(debugInfo.currentAuthType).toBe(AuthType.LEGACY);
      expect(debugInfo.isAuthenticated).toBe(false);
      expect(debugInfo.error).toBeDefined();
    });
  });

  describe('Enhanced Login with Provider Context', () => {
    beforeEach(() => {
      mockProviderFactory.getCurrentProvider.mockResolvedValue(mockLegacyProvider);
    });

    it('should include provider information in login result', async () => {
      const mockUser = {\n        id: 'legacy-123',\n        email: 'test@example.com',\n        name: 'Test User',\n        role: 'agent'\n      } as User;\n\n      mockLegacyProvider.login.mockResolvedValue({\n        success: true,\n        message: 'Login successful',\n        userData: mockUser,\n        provider: AuthType.LEGACY,\n        duration: 1000\n      });\n\n      const result = await authStoreManager.login('test@example.com', 'password123');\n\n      expect(result.success).toBe(true);\n      expect(result.provider).toBe(AuthType.LEGACY);\n      expect(result.userData).toEqual(mockUser);\n      expect(result.providerInfo).toBeDefined();\n      expect(result.providerInfo?.name).toBe('Legacy Authentication');\n    });\n\n    it('should handle provider unavailable during login', async () => {\n      mockProviderFactory.getCurrentProvider.mockResolvedValue(null);\n\n      const result = await authStoreManager.login('test@example.com', 'password123');\n\n      expect(result.success).toBe(false);\n      expect(result.message).toContain('No authentication provider available');\n    });\n  });\n\n  describe('Configuration Change Handling', () => {\n    it('should handle configuration changes', async () => {\n      const mockListener = jest.fn();\n      mockConfigService.onConfigurationChange.mockReturnValue(mockListener);\n\n      // Simulate configuration change\n      const newConfig = {\n        currentType: AuthType.BOWPI,\n        allowRuntimeSwitch: true,\n        requireConfirmationForSwitch: false,\n        autoSwitchOnFailure: false,\n        fallbackType: AuthType.LEGACY,\n        legacy: {},\n        bowpi: {}\n      };\n\n      // Trigger the listener that would be registered\n      const configChangeCallback = mockConfigService.onConfigurationChange.mock.calls[0]?.[0];\n      if (configChangeCallback) {\n        configChangeCallback(newConfig);\n      }\n\n      expect(mockConfigService.onConfigurationChange).toHaveBeenCalled();\n    });\n  });\n\n  describe('Error Recovery', () => {\n    it('should recover from provider initialization failure', async () => {\n      mockProviderFactory.getCurrentProvider\n        .mockRejectedValueOnce(new Error('Init failed'))\n        .mockResolvedValueOnce(mockLegacyProvider);\n\n      // First call should fail\n      await expect(\n        authStoreManager.login('test@example.com', 'password123')\n      ).rejects.toThrow('Init failed');\n\n      // Second call should succeed after recovery\n      mockLegacyProvider.login.mockResolvedValue({\n        success: true,\n        message: 'Login successful',\n        userData: {\n          id: 'legacy-123',\n          email: 'test@example.com',\n          name: 'Test User',\n          role: 'agent'\n        } as User,\n        provider: AuthType.LEGACY,\n        duration: 1000\n      });\n\n      const result = await authStoreManager.login('test@example.com', 'password123');\n      expect(result.success).toBe(true);\n    });\n  });\n});
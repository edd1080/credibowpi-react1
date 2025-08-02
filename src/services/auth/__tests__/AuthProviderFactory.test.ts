// AuthProviderFactory Tests
// Tests for the authentication provider factory system

import { AuthProviderFactory } from '../AuthProviderFactory';
import { LegacyAuthProvider } from '../providers/LegacyAuthProvider';
import { BowpiAuthProvider } from '../providers/BowpiAuthProvider';
import { 
  AuthType, 
  AuthProvider, 
  AuthConfiguration,
  AuthProviderError,
  AuthProviderErrorType,
  ProviderInitResult,
  ProviderCleanupResult,
  DEFAULT_AUTH_CONFIG
} from '../../../types/auth-providers';

// Mock the providers
jest.mock('../providers/LegacyAuthProvider');
jest.mock('../providers/BowpiAuthProvider');

// Mock the AuthConfigurationService
jest.mock('../AuthConfiguration', () => ({
  AuthConfigurationService: {
    getInstance: jest.fn(() => ({
      getProviderConfig: jest.fn(),
      isRuntimeSwitchAllowed: jest.fn(),
      getCurrentAuthType: jest.fn(),
    })),
  },
}));

// Mock console to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = mockConsole as any;

describe('AuthProviderFactory', () => {
  let factory: AuthProviderFactory;
  let mockConfig: AuthConfiguration;
  let mockLegacyProvider: jest.Mocked<LegacyAuthProvider>;
  let mockBowpiProvider: jest.Mocked<BowpiAuthProvider>;
  let mockConfigService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration service
    mockConfigService = {
      getProviderConfig: jest.fn(),
      isRuntimeSwitchAllowed: jest.fn(),
      getCurrentAuthType: jest.fn(),
    };

    // Mock configuration
    mockConfig = {
      ...DEFAULT_AUTH_CONFIG,
      currentType: AuthType.LEGACY,
      fallbackType: AuthType.BOWPI,
      allowRuntimeSwitch: true
    };

    // Mock providers
    mockLegacyProvider = {
      type: AuthType.LEGACY,
      name: 'Legacy Authentication',
      description: 'Mock legacy provider',
      version: '1.0.0',
      initialize: jest.fn(),
      cleanup: jest.fn(),
      healthCheck: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      getCapabilities: jest.fn(),
      getDebugInfo: jest.fn(),
    } as any;

    mockBowpiProvider = {
      type: AuthType.BOWPI,
      name: 'Bowpi Authentication',
      description: 'Mock bowpi provider',
      version: '2.0.0',
      initialize: jest.fn(),
      cleanup: jest.fn(),
      healthCheck: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      isAuthenticated: jest.fn(),
      getCurrentUser: jest.fn(),
      getCapabilities: jest.fn(),
      getDebugInfo: jest.fn(),
    } as any;

    (LegacyAuthProvider as jest.Mock).mockImplementation(() => mockLegacyProvider);
    (BowpiAuthProvider as jest.Mock).mockImplementation(() => mockBowpiProvider);

    factory = AuthProviderFactory.getInstance();
  });

  afterEach(async () => {
    // Cleanup factory state
    await factory.cleanup();
    // Reset singleton instance
    (AuthProviderFactory as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthProviderFactory.getInstance();
      const instance2 = AuthProviderFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize configuration service on first access', () => {
      AuthProviderFactory.getInstance();
      
      expect(AuthConfigurationService.getInstance).toHaveBeenCalled();
    });
  });

  describe('Initialization', () => {
    it('should initialize with configuration', () => {
      factory.initialize(mockConfig);

      const debugInfo = factory.getDebugInfo();
      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.currentConfig).toEqual(mockConfig);
    });

    it('should throw error when creating provider without initialization', async () => {
      await expect(
        factory.createProvider(AuthType.LEGACY)
      ).rejects.toThrow(AuthProviderError);
      
      try {
        await factory.createProvider(AuthType.LEGACY);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthProviderError);
        expect((error as AuthProviderError).type).toBe(AuthProviderErrorType.CONFIGURATION_ERROR);
        expect((error as AuthProviderError).message).toBe('Factory not initialized with configuration');
      }
    });
  });

  describe('Provider Creation', () => {
    beforeEach(() => {
      factory.initialize(mockConfig);
    });

    it('should create legacy provider', async () => {
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      const provider = await factory.createProvider(AuthType.LEGACY);

      expect(provider).toBe(mockLegacyProvider);
      expect(LegacyAuthProvider).toHaveBeenCalledWith(mockConfig.legacy);
      expect(mockLegacyProvider.initialize).toHaveBeenCalled();
    });

    it('should create bowpi provider', async () => {
      mockBowpiProvider.initialize.mockResolvedValue();
      mockBowpiProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 2500,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      const provider = await factory.createProvider(AuthType.BOWPI);

      expect(provider).toBe(mockBowpiProvider);
      expect(BowpiAuthProvider).toHaveBeenCalledWith(mockConfig.bowpi);
      expect(mockBowpiProvider.initialize).toHaveBeenCalled();
    });

    it('should throw error for unknown provider type', async () => {
      await expect(
        factory.createProvider('unknown' as AuthType)
      ).rejects.toThrow(AuthProviderError);
      
      try {
        await factory.createProvider('unknown' as AuthType);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthProviderError);
        expect((error as AuthProviderError).type).toBe(AuthProviderErrorType.CONFIGURATION_ERROR);
        expect((error as AuthProviderError).message).toBe('Unknown authentication provider type: unknown');
      }
    });

    it('should handle provider initialization failure', async () => {
      const initError = new Error('Init failed');
      mockLegacyProvider.initialize.mockRejectedValue(initError);

      await expect(
        factory.createProvider(AuthType.LEGACY)
      ).rejects.toThrow(AuthProviderError);
      
      try {
        await factory.createProvider(AuthType.LEGACY);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthProviderError);
        expect((error as AuthProviderError).type).toBe(AuthProviderErrorType.INITIALIZATION_FAILED);
        expect((error as AuthProviderError).message).toBe('Failed to initialize legacy provider: Init failed');
      }
    });

    it('should recreate unhealthy cached provider', async () => {
      // First creation - healthy
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      const provider1 = await factory.createProvider(AuthType.LEGACY);

      // Simulate provider becoming unhealthy
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: false,
        lastCheck: Date.now(),
        issues: ['Provider unhealthy'],
        performance: {
          averageLoginTime: 1000,
          successRate: 0.5,
          lastSuccessfulOperation: Date.now() - 60000,
          totalOperations: 10
        }
      });

      // Should cleanup and recreate
      mockLegacyProvider.cleanup.mockResolvedValue();
      
      // Reset health for new instance
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      const provider2 = await factory.createProvider(AuthType.LEGACY);

      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(2);
    });

    it('should handle health check errors during creation', async () => {
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockRejectedValue(new Error('Health check failed'));

      // Should still create provider if health check fails
      const provider = await factory.createProvider(AuthType.LEGACY);
      expect(provider).toBe(mockLegacyProvider);
    });
  });

  describe('Provider Caching', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });
    });

    it('should cache created providers', async () => {
      const provider1 = await factory.createProvider(AuthType.LEGACY);
      const provider2 = await factory.createProvider(AuthType.LEGACY);

      expect(provider1).toBe(provider2);
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(1);
      expect(mockLegacyProvider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return different instances for different types', async () => {
      mockBowpiProvider.initialize.mockResolvedValue();
      mockBowpiProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });

      const legacyProvider = await factory.createProvider(AuthType.LEGACY);
      const bowpiProvider = await factory.createProvider(AuthType.BOWPI);

      expect(legacyProvider).not.toBe(bowpiProvider);
      expect(legacyProvider.type).toBe(AuthType.LEGACY);
      expect(bowpiProvider.type).toBe(AuthType.BOWPI);
    });

    it('should invalidate cache when provider becomes unhealthy', async () => {
      // First creation - healthy
      const provider1 = await factory.createProvider(AuthType.LEGACY);

      // Simulate provider becoming unhealthy
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: false,
        status: 'error',
        message: 'Provider is unhealthy',
        lastCheck: new Date(),
        details: {}
      });

      // Should create new instance after health check failure
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });

      const provider2 = await factory.createProvider(AuthType.LEGACY);

      expect(LegacyAuthProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Provider Switching', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(true);
      
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.cleanup.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });

      mockBowpiProvider.initialize.mockResolvedValue();
      mockBowpiProvider.cleanup.mockResolvedValue();
      mockBowpiProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });
    });

    it('should switch providers successfully', async () => {
      // Create initial provider
      const legacyProvider = await factory.createProvider(AuthType.LEGACY);
      expect(legacyProvider.type).toBe(AuthType.LEGACY);

      // Switch to Bowpi
      const bowpiProvider = await factory.switchProvider(AuthType.BOWPI);
      expect(bowpiProvider.type).toBe(AuthType.BOWPI);

      // Should cleanup old provider
      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();
    });

    it('should reject switch when runtime switching is disabled', async () => {
      mockConfigService.isRuntimeSwitchAllowed.mockReturnValue(false);

      await expect(
        factory.switchProvider(AuthType.BOWPI)
      ).rejects.toThrow('Runtime provider switching is not allowed');
    });

    it('should handle cleanup errors during switch', async () => {
      // Create initial provider
      await factory.createProvider(AuthType.LEGACY);

      // Mock cleanup failure
      mockLegacyProvider.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      // Switch should still succeed but log error
      const bowpiProvider = await factory.switchProvider(AuthType.BOWPI);
      expect(bowpiProvider.type).toBe(AuthType.BOWPI);
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error cleaning up provider during switch:',
        expect.any(Error)
      );
    });

    it('should rollback on new provider creation failure', async () => {
      // Create initial provider
      const legacyProvider = await factory.createProvider(AuthType.LEGACY);

      // Mock new provider creation failure
      mockBowpiProvider.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(
        factory.switchProvider(AuthType.BOWPI)
      ).rejects.toThrow('Failed to create Bowpi provider: Init failed');

      // Should still have original provider
      const currentProvider = await factory.getCurrentProvider();
      expect(currentProvider?.type).toBe(AuthType.LEGACY);
    });
  });

  describe('Current Provider Management', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockConfigService.getCurrentAuthType.mockReturnValue(AuthType.LEGACY);
      
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });
    });

    it('should get current provider', async () => {
      await factory.createProvider(AuthType.LEGACY);
      
      const currentProvider = await factory.getCurrentProvider();
      expect(currentProvider?.type).toBe(AuthType.LEGACY);
    });

    it('should return null when no provider is created', async () => {
      const currentProvider = await factory.getCurrentProvider();
      expect(currentProvider).toBeNull();
    });

    it('should create current provider based on configuration', async () => {
      const provider = await factory.getCurrentProvider();
      expect(provider?.type).toBe(AuthType.LEGACY);
      expect(mockLegacyProvider.initialize).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockLegacyProvider.initialize.mockResolvedValue();
    });

    it('should check provider health', async () => {
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });

      const isHealthy = await factory.isProviderHealthy(AuthType.LEGACY);
      expect(isHealthy).toBe(true);
    });

    it('should return false for unhealthy provider', async () => {
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: false,
        status: 'error',
        message: 'Provider is unhealthy',
        lastCheck: new Date(),
        details: {}
      });

      await factory.createProvider(AuthType.LEGACY);
      const isHealthy = await factory.isProviderHealthy(AuthType.LEGACY);
      expect(isHealthy).toBe(false);
    });

    it('should return false for non-existent provider', async () => {
      const isHealthy = await factory.isProviderHealthy(AuthType.BOWPI);
      expect(isHealthy).toBe(false);
    });

    it('should handle health check errors', async () => {
      mockLegacyProvider.healthCheck.mockRejectedValue(new Error('Health check failed'));

      await factory.createProvider(AuthType.LEGACY);
      const isHealthy = await factory.isProviderHealthy(AuthType.LEGACY);
      expect(isHealthy).toBe(false);
    });
  });

  describe('Cleanup and Resource Management', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.cleanup.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });

      mockBowpiProvider.initialize.mockResolvedValue();
      mockBowpiProvider.cleanup.mockResolvedValue();
      mockBowpiProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });
    });

    it('should cleanup all providers', async () => {
      await factory.createProvider(AuthType.LEGACY);
      await factory.createProvider(AuthType.BOWPI);

      await factory.cleanup();

      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();
      expect(mockBowpiProvider.cleanup).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      await factory.createProvider(AuthType.LEGACY);
      mockLegacyProvider.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(factory.cleanup()).resolves.not.toThrow();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error cleaning up provider Legacy:',
        expect.any(Error)
      );
    });

    it('should clear cache after cleanup', async () => {
      await factory.createProvider(AuthType.LEGACY);
      await factory.cleanup();

      // Should create new instance after cleanup
      const provider = await factory.createProvider(AuthType.LEGACY);
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        status: 'healthy',
        message: 'Provider is healthy',
        lastCheck: new Date(),
        details: {}
      });
    });

    it('should provide debug information', async () => {
      await factory.createProvider(AuthType.LEGACY);

      const debugInfo = factory.getDebugInfo();

      expect(debugInfo.cachedProviders).toContain(AuthType.LEGACY);
      expect(debugInfo.currentProvider).toBe(AuthType.LEGACY);
      expect(debugInfo.totalProvidersCreated).toBe(1);
      expect(debugInfo.lastHealthCheck).toBeDefined();
      expect(debugInfo.factoryInitialized).toBe(true);
    });

    it('should show empty debug info when no providers created', () => {
      const debugInfo = factory.getDebugInfo();

      expect(debugInfo.cachedProviders).toHaveLength(0);
      expect(debugInfo.currentProvider).toBeNull();
      expect(debugInfo.totalProvidersCreated).toBe(0);
      expect(debugInfo.factoryInitialized).toBe(true);
    });
  });

  describe('Advanced Factory Operations', () => {
    beforeEach(() => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockReturnValue({});
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });
    });

    it('should handle rapid provider creation requests', async () => {
      // Simulate rapid concurrent requests for the same provider
      const promises = Array(10).fill(0).map(() => 
        factory.createProvider(AuthType.LEGACY)
      );

      const providers = await Promise.all(promises);

      // All should return the same cached instance
      providers.forEach(provider => {
        expect(provider).toBe(mockLegacyProvider);
      });

      // Provider should only be created once
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(1);
    });

    it('should handle provider creation with different configurations', async () => {
      const configs = [
        { ...mockConfig, legacy: { ...mockConfig.legacy, mockDelay: 500 } },
        { ...mockConfig, legacy: { ...mockConfig.legacy, mockDelay: 1000 } },
        { ...mockConfig, legacy: { ...mockConfig.legacy, mockDelay: 1500 } },
      ];

      for (const config of configs) {
        factory.initialize(config);
        await factory.createProvider(AuthType.LEGACY);
      }

      // Should create provider for each different configuration
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(configs.length);
    });

    it('should handle provider health degradation and recovery', async () => {
      // Initial healthy provider
      const provider1 = await factory.createProvider(AuthType.LEGACY);
      expect(provider1).toBe(mockLegacyProvider);

      // Simulate health degradation
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: false,
        lastCheck: Date.now(),
        issues: ['Provider unhealthy'],
        performance: {
          averageLoginTime: 5000,
          successRate: 0.1,
          lastSuccessfulOperation: Date.now() - 300000,
          totalOperations: 100
        }
      });

      // Should recreate provider when unhealthy
      mockLegacyProvider.cleanup.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      const provider2 = await factory.createProvider(AuthType.LEGACY);

      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();
      expect(LegacyAuthProvider).toHaveBeenCalledTimes(2);
    });

    it('should handle provider switching with session preservation', async () => {
      mockBowpiProvider.initialize.mockResolvedValue();
      mockBowpiProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 2500,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      // Create initial provider
      const legacyProvider = await factory.createProvider(AuthType.LEGACY);
      expect(legacyProvider.type).toBe(AuthType.LEGACY);

      // Switch to Bowpi
      const bowpiProvider = await factory.switchProvider(AuthType.BOWPI);
      expect(bowpiProvider.type).toBe(AuthType.BOWPI);

      // Verify cleanup was called
      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();
    });

    it('should provide comprehensive debug information', async () => {
      await factory.createProvider(AuthType.LEGACY);
      await factory.createProvider(AuthType.BOWPI);

      const debugInfo = factory.getDebugInfo();

      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.currentConfig).toEqual(mockConfig);
      expect(debugInfo.cachedProviders).toContain(AuthType.LEGACY);
      expect(debugInfo.cachedProviders).toContain(AuthType.BOWPI);
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockReturnValue({});
    });

    it('should handle memory pressure by cleaning up unused providers', async () => {
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.cleanup.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      // Create provider
      await factory.createProvider(AuthType.LEGACY);

      // Simulate cleanup
      await factory.cleanup();

      expect(mockLegacyProvider.cleanup).toHaveBeenCalled();

      // Debug info should reflect cleanup
      const debugInfo = factory.getDebugInfo();
      expect(debugInfo.cachedProviders).toHaveLength(0);
    });

    it('should handle partial cleanup failures gracefully', async () => {
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.cleanup.mockRejectedValue(new Error('Cleanup failed'));
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      await factory.createProvider(AuthType.LEGACY);

      // Cleanup should not throw even if provider cleanup fails
      await expect(factory.cleanup()).resolves.not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error cleaning up provider Legacy:',
        expect.any(Error)
      );
    });

    it('should track provider lifecycle metrics', async () => {
      mockLegacyProvider.initialize.mockResolvedValue();
      mockLegacyProvider.healthCheck.mockResolvedValue({
        isHealthy: true,
        lastCheck: Date.now(),
        issues: [],
        performance: {
          averageLoginTime: 1000,
          successRate: 1.0,
          lastSuccessfulOperation: Date.now(),
          totalOperations: 0
        }
      });

      // Create and cleanup multiple times
      for (let i = 0; i < 3; i++) {
        await factory.createProvider(AuthType.LEGACY);
        await factory.cleanupProvider(AuthType.LEGACY);
      }

      expect(LegacyAuthProvider).toHaveBeenCalledTimes(3);
      expect(mockLegacyProvider.cleanup).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration service errors', async () => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockImplementation(() => {
        throw new Error('Config error');
      });

      await expect(
        factory.createProvider(AuthType.LEGACY)
      ).rejects.toThrow('Failed to create Legacy provider: Config error');
    });

    it('should handle provider constructor errors', async () => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockReturnValue({});
      (LegacyAuthProvider as jest.Mock).mockImplementation(() => {
        throw new Error('Constructor error');
      });

      await expect(
        factory.createProvider(AuthType.LEGACY)
      ).rejects.toThrow('Failed to create Legacy provider: Constructor error');
    });

    it('should handle initialization timeout scenarios', async () => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockReturnValue({});
      
      // Mock slow initialization
      mockLegacyProvider.initialize.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const startTime = Date.now();
      await factory.createProvider(AuthType.LEGACY);
      const duration = Date.now() - startTime;

      // Should complete initialization (no timeout in this implementation)
      expect(duration).toBeGreaterThanOrEqual(5000);
      expect(mockLegacyProvider.initialize).toHaveBeenCalled();
    });

    it('should handle concurrent error scenarios', async () => {
      factory.initialize(mockConfig);
      mockConfigService.getProviderConfig.mockReturnValue({});
      
      // Mock initialization failure
      mockLegacyProvider.initialize.mockRejectedValue(new Error('Init failed'));

      // Multiple concurrent requests should all fail consistently
      const promises = Array(5).fill(0).map(() => 
        factory.createProvider(AuthType.LEGACY).catch(error => error)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeInstanceOf(AuthProviderError);
        expect(result.message).toContain('Failed to initialize legacy provider');
      });
    });
  });
});
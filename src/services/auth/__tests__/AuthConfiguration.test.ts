// AuthConfiguration Tests
// Tests for the authentication configuration service

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthConfigurationService } from '../AuthConfiguration';
import { 
  AuthType, 
  AuthConfiguration,
  LegacyAuthConfig,
  BowpiAuthConfig,
  DEFAULT_AUTH_CONFIG,
  isValidAuthType
} from '../../../types/auth-providers';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = mockConsole as any;

// Mock environment variables
const originalEnv = process.env;

describe('AuthConfigurationService', () => {
  let configService: AuthConfigurationService;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    
    configService = AuthConfigurationService.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (AuthConfigurationService as any).instance = undefined;
    
    // Restore environment variables
    process.env = originalEnv;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthConfigurationService.getInstance();
      const instance2 = AuthConfigurationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
      expect(config.fallbackType).toBe(DEFAULT_AUTH_CONFIG.fallbackType);
      expect(config.allowRuntimeSwitch).toBe(DEFAULT_AUTH_CONFIG.allowRuntimeSwitch);
    });

    it('should load configuration from environment variables', async () => {
      process.env.AUTH_TYPE = AuthType.LEGACY;
      process.env.ALLOW_RUNTIME_SWITCH = 'false';
      process.env.AUTO_SWITCH_ON_FAILURE = 'true';
      process.env.AUTH_DEBUG_LOGGING = 'true';
      process.env.LEGACY_MOCK_DELAY = '2000';
      process.env.LEGACY_ALLOWED_USERS = 'user1@test.com,user2@test.com';
      process.env.LEGACY_SIMULATE_ERRORS = 'true';
      process.env.BOWPI_BASE_URL = 'http://custom.bowpi.com';
      process.env.BOWPI_TIMEOUT = '45000';
      process.env.BOWPI_RETRY_ATTEMPTS = '5';
      process.env.BOWPI_ENCRYPTION = 'false';

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(AuthType.LEGACY);
      expect(config.allowRuntimeSwitch).toBe(false);
      expect(config.autoSwitchOnFailure).toBe(true);
      expect(config.enableDebugLogging).toBe(true);
      expect(config.legacy.mockDelay).toBe(2000);
      expect(config.legacy.allowedUsers).toEqual(['user1@test.com', 'user2@test.com']);
      expect(config.legacy.simulateNetworkErrors).toBe(true);
      expect(config.bowpi.baseUrl).toBe('http://custom.bowpi.com');
      expect(config.bowpi.timeout).toBe(45000);
      expect(config.bowpi.retryAttempts).toBe(5);
      expect(config.bowpi.enableEncryption).toBe(false);
    });

    it('should load stored configuration', async () => {
      const storedConfig: Partial<AuthConfiguration> = {
        currentType: AuthType.LEGACY,
        allowRuntimeSwitch: false,
        legacy: {
          ...DEFAULT_LEGACY_CONFIG,
          mockDelay: 3000
        }
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(storedConfig));
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(AuthType.LEGACY);
      expect(config.allowRuntimeSwitch).toBe(false);
      expect(config.legacy.mockDelay).toBe(3000);
    });

    it('should load user preferences', async () => {
      const userPrefs: Partial<AuthConfiguration> = {
        currentType: AuthType.BOWPI,
        requireConfirmationForSwitch: false
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user_preferences') {
          return Promise.resolve(JSON.stringify(userPrefs));
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(AuthType.BOWPI);
      expect(config.requireConfirmationForSwitch).toBe(false);
    });

    it('should prioritize environment variables over stored config', async () => {
      process.env.AUTH_TYPE = AuthType.LEGACY;

      const storedConfig: Partial<AuthConfiguration> = {
        currentType: AuthType.BOWPI
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(storedConfig));
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      await configService.initialize();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(AuthType.LEGACY); // Environment wins
    });

    it('should handle initialization errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      mockAsyncStorage.setItem.mockResolvedValue();

      await expect(configService.initialize()).rejects.toThrow('Storage error');

      // Should still provide default configuration
      const config = configService.getConfiguration();
      expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
    });

    it('should validate configuration during initialization', async () => {
      const invalidConfig: Partial<AuthConfiguration> = {
        currentType: 'invalid' as AuthType,
        legacy: {
          ...DEFAULT_LEGACY_CONFIG,
          mockDelay: -1000 // Invalid negative delay
        }
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(invalidConfig));
        }
        return Promise.resolve(null);
      });

      await expect(configService.initialize()).rejects.toThrow();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should get current configuration', () => {
      const config = configService.getConfiguration();
      
      expect(config).toBeDefined();
      expect(config.currentType).toBeDefined();
      expect(config.legacy).toBeDefined();
      expect(config.bowpi).toBeDefined();
    });

    it('should get current auth type', () => {
      const authType = configService.getCurrentAuthType();
      expect(Object.values(AuthType)).toContain(authType);
    });

    it('should get fallback auth type', () => {
      const fallbackType = configService.getFallbackAuthType();
      if (fallbackType) {
        expect(Object.values(AuthType)).toContain(fallbackType);
      }
    });

    it('should set auth type', async () => {
      await configService.setAuthType(AuthType.LEGACY);
      
      expect(configService.getCurrentAuthType()).toBe(AuthType.LEGACY);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'auth_configuration',
        expect.stringContaining('"currentType":"legacy"')
      );
    });

    it('should reject invalid auth type', async () => {
      await expect(
        configService.setAuthType('invalid' as AuthType)
      ).rejects.toThrow('Invalid authentication type: invalid');
    });

    it('should rollback on save error', async () => {
      const originalType = configService.getCurrentAuthType();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Save failed'));

      await expect(
        configService.setAuthType(AuthType.LEGACY)
      ).rejects.toThrow('Save failed');

      expect(configService.getCurrentAuthType()).toBe(originalType);
    });

    it('should update legacy configuration', async () => {
      const newLegacyConfig: Partial<LegacyAuthConfig> = {
        mockDelay: 5000,
        allowedUsers: ['new@example.com']
      };

      await configService.updateLegacyConfig(newLegacyConfig);

      const config = configService.getConfiguration();
      expect(config.legacy.mockDelay).toBe(5000);
      expect(config.legacy.allowedUsers).toEqual(['new@example.com']);
    });

    it('should validate legacy configuration updates', async () => {
      const invalidLegacyConfig: Partial<LegacyAuthConfig> = {
        mockDelay: -1000, // Invalid negative delay
        sessionDuration: 30000 // Too short (less than 1 minute)
      };

      await expect(
        configService.updateLegacyConfig(invalidLegacyConfig)
      ).rejects.toThrow();
    });

    it('should update bowpi configuration', async () => {
      const newBowpiConfig: Partial<BowpiAuthConfig> = {
        baseUrl: 'http://new.bowpi.com',
        timeout: 60000
      };

      await configService.updateBowpiConfig(newBowpiConfig);

      const config = configService.getConfiguration();
      expect(config.bowpi.baseUrl).toBe('http://new.bowpi.com');
      expect(config.bowpi.timeout).toBe(60000);
    });

    it('should validate bowpi configuration updates', async () => {
      const invalidBowpiConfig: Partial<BowpiAuthConfig> = {
        baseUrl: 'invalid-url', // Invalid URL format
        timeout: 500, // Too short (less than 1000ms)
        retryAttempts: 15 // Too many (more than 10)
      };

      await expect(
        configService.updateBowpiConfig(invalidBowpiConfig)
      ).rejects.toThrow();
    });

    it('should get provider-specific configuration', () => {
      const legacyConfig = configService.getProviderConfig(AuthType.LEGACY);
      const bowpiConfig = configService.getProviderConfig(AuthType.BOWPI);

      expect(legacyConfig).toHaveProperty('mockDelay');
      expect(legacyConfig).toHaveProperty('allowedUsers');
      expect(bowpiConfig).toHaveProperty('baseUrl');
      expect(bowpiConfig).toHaveProperty('timeout');
    });

    it('should throw error for unknown provider type', () => {
      expect(() => {
        configService.getProviderConfig('unknown' as AuthType);
      }).toThrow('Unknown provider type: unknown');
    });

    it('should reset to defaults', async () => {
      // Change some settings first
      await configService.setAuthType(AuthType.LEGACY);
      await configService.updateLegacyConfig({ mockDelay: 5000 });

      // Reset to defaults
      await configService.resetToDefaults();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
      expect(config.legacy.mockDelay).toBe(DEFAULT_LEGACY_CONFIG.mockDelay);
    });
  });

  describe('Configuration Flags', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should check runtime switch permission', () => {
      const isAllowed = configService.isRuntimeSwitchAllowed();
      expect(typeof isAllowed).toBe('boolean');
    });

    it('should check confirmation requirement', () => {
      const requiresConfirmation = configService.requiresConfirmationForSwitch();
      expect(typeof requiresConfirmation).toBe('boolean');
    });

    it('should check auto-switch on failure', () => {
      const autoSwitch = configService.isAutoSwitchOnFailureEnabled();
      expect(typeof autoSwitch).toBe('boolean');
    });
  });

  describe('Configuration Listeners', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should register configuration change listener', () => {
      const listener = jest.fn();
      const unsubscribe = configService.onConfigurationChange(listener);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify listeners on configuration change', async () => {
      const listener = jest.fn();
      configService.onConfigurationChange(listener);

      await configService.setAuthType(AuthType.LEGACY);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          currentType: AuthType.LEGACY
        })
      );
    });

    it('should unsubscribe listeners', async () => {
      const listener = jest.fn();
      const unsubscribe = configService.onConfigurationChange(listener);

      unsubscribe();

      await configService.setAuthType(AuthType.LEGACY);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      configService.onConfigurationChange(errorListener);

      await expect(
        configService.setAuthType(AuthType.LEGACY)
      ).resolves.not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ [AUTH_CONFIG] Error in configuration change listener:',
        expect.any(Error)
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration', async () => {
      const validConfig: AuthConfiguration = {
        ...DEFAULT_AUTH_CONFIG,
        currentType: AuthType.LEGACY,
        fallbackType: AuthType.BOWPI
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(validConfig));
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      await expect(configService.initialize()).resolves.not.toThrow();
    });

    it('should reject invalid auth types', async () => {
      const invalidConfig = {
        ...DEFAULT_AUTH_CONFIG,
        currentType: 'invalid',
        fallbackType: 'also-invalid'
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(invalidConfig));
        }
        return Promise.resolve(null);
      });

      await expect(configService.initialize()).rejects.toThrow('Invalid current auth type');
    });

    it('should reject invalid numeric values', async () => {
      const invalidConfig = {
        ...DEFAULT_AUTH_CONFIG,
        switchCooldownPeriod: -1000,
        healthCheckInterval: 500,
        maxSwitchesPerHour: 0
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(invalidConfig));
        }
        return Promise.resolve(null);
      });

      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should validate legacy configuration', async () => {
      const invalidLegacyConfig = {
        ...DEFAULT_AUTH_CONFIG,
        legacy: {
          ...DEFAULT_LEGACY_CONFIG,
          mockDelay: -1000,
          sessionDuration: 30000,
          allowedUsers: ['invalid-email']
        }
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(invalidLegacyConfig));
        }
        return Promise.resolve(null);
      });

      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should validate bowpi configuration', async () => {
      const invalidBowpiConfig = {
        ...DEFAULT_AUTH_CONFIG,
        bowpi: {
          ...DEFAULT_BOWPI_CONFIG,
          baseUrl: 'invalid-url',
          timeout: 500,
          retryAttempts: 15,
          sessionValidationInterval: 30000
        }
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(invalidBowpiConfig));
        }
        return Promise.resolve(null);
      });

      await expect(configService.initialize()).rejects.toThrow();
    });
  });

  describe('Debug Information', () => {
    beforeEach(async () => {
      process.env.AUTH_TYPE = AuthType.LEGACY;
      process.env.ALLOW_RUNTIME_SWITCH = 'false';
      process.env.BOWPI_BASE_URL = 'http://debug.bowpi.com';
      process.env.LEGACY_MOCK_DELAY = '1500';

      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should provide debug information', () => {
      const listener = jest.fn();
      configService.onConfigurationChange(listener);

      const debugInfo = configService.getDebugInfo();

      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.currentConfig).toBeDefined();
      expect(debugInfo.listenerCount).toBe(1);
      expect(debugInfo.environmentOverrides).toContain('AUTH_TYPE');
      expect(debugInfo.environmentOverrides).toContain('ALLOW_RUNTIME_SWITCH');
      expect(debugInfo.environmentOverrides).toContain('BOWPI_BASE_URL');
      expect(debugInfo.environmentOverrides).toContain('LEGACY_MOCK_DELAY');
    });
  });

  describe('Type Guards and Utilities', () => {
    it('should validate auth types correctly', () => {
      expect(isValidAuthType(AuthType.LEGACY)).toBe(true);
      expect(isValidAuthType(AuthType.BOWPI)).toBe(true);
      expect(isValidAuthType('invalid')).toBe(false);
      expect(isValidAuthType(null)).toBe(false);
      expect(isValidAuthType(undefined)).toBe(false);
    });
  });

  describe('Advanced Configuration Scenarios', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should handle complex environment variable combinations', async () => {
      // Reset service for this test
      (AuthConfigurationService as any).instance = undefined;
      
      // Set complex environment variables
      process.env.AUTH_TYPE = AuthType.LEGACY;
      process.env.ALLOW_RUNTIME_SWITCH = 'false';
      process.env.AUTO_SWITCH_ON_FAILURE = 'true';
      process.env.LEGACY_MOCK_DELAY = '2500';
      process.env.LEGACY_ALLOWED_USERS = 'admin@test.com,user1@test.com,user2@test.com';
      process.env.BOWPI_BASE_URL = 'https://production.bowpi.com';
      process.env.BOWPI_TIMEOUT = '45000';
      process.env.BOWPI_RETRY_ATTEMPTS = '5';

      const newConfigService = AuthConfigurationService.getInstance();
      await newConfigService.initialize();

      const config = newConfigService.getConfiguration();

      expect(config.currentType).toBe(AuthType.LEGACY);
      expect(config.allowRuntimeSwitch).toBe(false);
      expect(config.autoSwitchOnFailure).toBe(true);
      expect(config.legacy.mockDelay).toBe(2500);
      expect(config.legacy.allowedUsers).toEqual(['admin@test.com', 'user1@test.com', 'user2@test.com']);
      expect(config.bowpi.baseUrl).toBe('https://production.bowpi.com');
      expect(config.bowpi.timeout).toBe(45000);
      expect(config.bowpi.retryAttempts).toBe(5);
    });

    it('should handle configuration priority correctly', async () => {
      // Reset service for this test
      (AuthConfigurationService as any).instance = undefined;

      // Environment variable
      process.env.AUTH_TYPE = AuthType.LEGACY;

      // Stored configuration (should be overridden by env)
      const storedConfig = {
        currentType: AuthType.BOWPI,
        allowRuntimeSwitch: false
      };

      // User preferences (should be overridden by env and stored)
      const userPrefs = {
        currentType: AuthType.BOWPI,
        requireConfirmationForSwitch: false
      };

      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve(JSON.stringify(storedConfig));
        }
        if (key === 'auth_user_preferences') {
          return Promise.resolve(JSON.stringify(userPrefs));
        }
        return Promise.resolve(null);
      });

      const newConfigService = AuthConfigurationService.getInstance();
      await newConfigService.initialize();

      const config = newConfigService.getConfiguration();

      // Environment should win for auth type
      expect(config.currentType).toBe(AuthType.LEGACY);
      
      // Stored config should win for runtime switch
      expect(config.allowRuntimeSwitch).toBe(false);
      
      // User prefs should win for confirmation requirement
      expect(config.requireConfirmationForSwitch).toBe(false);
    });

    it('should handle rapid configuration changes', async () => {
      const changes = [
        AuthType.LEGACY,
        AuthType.BOWPI,
        AuthType.LEGACY,
        AuthType.BOWPI,
        AuthType.LEGACY
      ];

      for (const authType of changes) {
        await configService.setAuthType(authType);
        expect(configService.getCurrentAuthType()).toBe(authType);
      }

      // Should have saved each change
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(changes.length + 1); // +1 for initial save
    });

    it('should handle concurrent configuration updates', async () => {
      const updates = [
        () => configService.setAuthType(AuthType.LEGACY),
        () => configService.updateLegacyConfig({ mockDelay: 2000 }),
        () => configService.updateBowpiConfig({ timeout: 60000 }),
      ];

      // Execute concurrent updates
      await Promise.all(updates.map(update => update()));

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(AuthType.LEGACY);
      expect(config.legacy.mockDelay).toBe(2000);
      expect(config.bowpi.timeout).toBe(60000);
    });

    it('should validate configuration boundaries', async () => {
      // Test extreme but valid values
      const extremeConfig: Partial<AuthConfiguration> = {
        switchCooldownPeriod: 0, // Minimum
        healthCheckInterval: 1000, // Minimum
        maxSwitchesPerHour: 1000, // High but valid
      };

      // Should not throw for valid extreme values
      await expect(async () => {
        const testConfig = { ...configService.getConfiguration(), ...extremeConfig };
        (configService as any).validateConfiguration(testConfig);
      }).not.toThrow();
    });

    it('should handle configuration rollback on validation failure', async () => {
      const originalConfig = configService.getConfiguration();

      // Attempt to set invalid configuration
      await expect(
        configService.updateLegacyConfig({ mockDelay: -1000 })
      ).rejects.toThrow();

      // Configuration should remain unchanged
      const currentConfig = configService.getConfiguration();
      expect(currentConfig.legacy.mockDelay).toBe(originalConfig.legacy.mockDelay);
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();
    });

    it('should handle large configuration objects efficiently', async () => {
      const largeAllowedUsers = Array(10000).fill(0).map((_, i) => `user${i}@example.com`);
      
      const startTime = Date.now();
      await configService.updateLegacyConfig({ allowedUsers: largeAllowedUsers });
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second

      const config = configService.getConfiguration();
      expect(config.legacy.allowedUsers).toHaveLength(10000);
    });

    it('should handle many configuration listeners efficiently', async () => {
      const listeners = Array(100).fill(0).map(() => jest.fn());
      const unsubscribers = listeners.map(listener => 
        configService.onConfigurationChange(listener)
      );

      // Trigger configuration change
      await configService.setAuthType(AuthType.LEGACY);

      // All listeners should be called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ currentType: AuthType.LEGACY })
        );
      });

      // Cleanup
      unsubscribers.forEach(unsubscribe => unsubscribe());
    });

    it('should handle rapid listener registration and deregistration', async () => {
      const operations = [];

      // Rapid registration and deregistration
      for (let i = 0; i < 100; i++) {
        const listener = jest.fn();
        const unsubscribe = configService.onConfigurationChange(listener);
        operations.push(() => unsubscribe());
      }

      // Execute all deregistrations
      operations.forEach(op => op());

      // Trigger change - no listeners should be called
      await configService.setAuthType(AuthType.LEGACY);

      // No errors should occur
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors during save', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();

      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(
        configService.setAuthType(AuthType.LEGACY)
      ).rejects.toThrow('Storage full');
    });

    it('should handle corrupted stored configuration', async () => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_configuration') {
          return Promise.resolve('invalid-json');
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      // Should not throw and use defaults
      await expect(configService.initialize()).resolves.not.toThrow();

      const config = configService.getConfiguration();
      expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
    });

    it('should handle corrupted user preferences', async () => {
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'auth_user_preferences') {
          return Promise.resolve('invalid-json');
        }
        return Promise.resolve(null);
      });
      mockAsyncStorage.setItem.mockResolvedValue();

      // Should not throw and use defaults
      await expect(configService.initialize()).resolves.not.toThrow();
    });

    it('should return default config when not initialized', () => {
      const uninitializedService = AuthConfigurationService.getInstance();
      
      const config = uninitializedService.getConfiguration();
      expect(config.currentType).toBe(DEFAULT_AUTH_CONFIG.currentType);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '⚠️ [AUTH_CONFIG] Configuration not initialized, returning default'
      );
    });

    it('should handle storage quota exceeded scenarios', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();

      // Simulate quota exceeded error
      mockAsyncStorage.setItem.mockRejectedValue(new Error('QuotaExceededError'));

      await expect(
        configService.setAuthType(AuthType.LEGACY)
      ).rejects.toThrow('QuotaExceededError');
    });

    it('should handle listener errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      await configService.initialize();

      // Add listeners that throw errors
      const errorListener1 = jest.fn(() => { throw new Error('Listener error 1'); });
      const errorListener2 = jest.fn(() => { throw new Error('Listener error 2'); });
      const goodListener = jest.fn();

      configService.onConfigurationChange(errorListener1);
      configService.onConfigurationChange(errorListener2);
      configService.onConfigurationChange(goodListener);

      // Configuration change should not throw despite listener errors
      await expect(configService.setAuthType(AuthType.LEGACY)).resolves.not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();

      // Error should be logged
      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ [AUTH_CONFIG] Error in configuration change listener:',
        expect.any(Error)
      );
    });
  });
});
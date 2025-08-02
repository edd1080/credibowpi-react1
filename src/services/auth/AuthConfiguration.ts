// Authentication Configuration Service - Manages dual authentication configuration
// Handles loading, validation, and persistence of authentication settings

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AuthConfiguration, 
  AuthType, 
  LegacyAuthConfig, 
  BowpiAuthConfig,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_LEGACY_CONFIG,
  DEFAULT_BOWPI_CONFIG,
  isValidAuthType
} from '../../types/auth-providers';

/**
 * Configuration source priority (highest to lowest):
 * 1. Environment variables (build-time)
 * 2. Remote configuration (runtime)
 * 3. User preferences (runtime)
 * 4. Stored configuration (persistent)
 * 5. Default configuration (fallback)
 */
export class AuthConfigurationService {
  private static instance: AuthConfigurationService;
  private currentConfig: AuthConfiguration;
  private configListeners: ((config: AuthConfiguration) => void)[] = [];
  private isInitialized = false;

  private constructor() {
    this.currentConfig = { ...DEFAULT_AUTH_CONFIG };
  }

  static getInstance(): AuthConfigurationService {
    if (!AuthConfigurationService.instance) {
      AuthConfigurationService.instance = new AuthConfigurationService();
    }
    return AuthConfigurationService.instance;
  }

  /**
   * Initialize configuration service with multi-source loading
   */
  async initialize(): Promise<void> {
    console.log('🔍 [AUTH_CONFIG] Initializing authentication configuration...');

    try {
      // Load configuration from multiple sources
      const envConfig = this.loadEnvironmentConfig();
      const storedConfig = await this.loadStoredConfig();
      const userPrefsConfig = await this.loadUserPreferences();
      
      // Merge configurations with priority order
      this.currentConfig = this.mergeConfigurations([
        DEFAULT_AUTH_CONFIG,
        storedConfig,
        userPrefsConfig,
        envConfig
      ]);

      // Validate final configuration
      this.validateConfiguration(this.currentConfig);

      // Save merged configuration
      await this.saveConfiguration(this.currentConfig);

      this.isInitialized = true;

      console.log('✅ [AUTH_CONFIG] Configuration initialized:', {
        currentType: this.currentConfig.currentType,
        fallbackType: this.currentConfig.fallbackType,
        allowRuntimeSwitch: this.currentConfig.allowRuntimeSwitch
      });

    } catch (error) {
      console.error('❌ [AUTH_CONFIG] Failed to initialize configuration:', error);
      
      // Fallback to default configuration
      this.currentConfig = { ...DEFAULT_AUTH_CONFIG };
      this.isInitialized = true;
      
      throw error;
    }
  }

  /**
   * Get current authentication configuration
   */
  getConfiguration(): AuthConfiguration {
    if (!this.isInitialized) {
      console.warn('⚠️ [AUTH_CONFIG] Configuration not initialized, returning default');
      return { ...DEFAULT_AUTH_CONFIG };
    }
    return { ...this.currentConfig };
  }

  /**
   * Get current authentication type
   */
  getCurrentAuthType(): AuthType {
    return this.currentConfig.currentType;
  }

  /**
   * Get fallback authentication type
   */
  getFallbackAuthType(): AuthType | undefined {
    return this.currentConfig.fallbackType;
  }

  /**
   * Update authentication type
   */
  async setAuthType(newType: AuthType): Promise<void> {
    console.log(`🔄 [AUTH_CONFIG] Changing auth type from ${this.currentConfig.currentType} to ${newType}`);

    if (!isValidAuthType(newType)) {
      throw new Error(`Invalid authentication type: ${newType}`);
    }

    const oldType = this.currentConfig.currentType;
    this.currentConfig.currentType = newType;

    try {
      // Save updated configuration
      await this.saveConfiguration(this.currentConfig);
      
      // Notify listeners
      this.notifyConfigurationChange();

      console.log(`✅ [AUTH_CONFIG] Auth type changed successfully to ${newType}`);

    } catch (error) {
      // Rollback on error
      this.currentConfig.currentType = oldType;
      console.error('❌ [AUTH_CONFIG] Failed to save auth type change:', error);
      throw error;
    }
  }

  /**
   * Update legacy provider configuration
   */
  async updateLegacyConfig(config: Partial<LegacyAuthConfig>): Promise<void> {
    console.log('🔄 [AUTH_CONFIG] Updating legacy configuration');

    const oldConfig = { ...this.currentConfig.legacy };
    this.currentConfig.legacy = { ...this.currentConfig.legacy, ...config };

    try {
      this.validateLegacyConfig(this.currentConfig.legacy);
      await this.saveConfiguration(this.currentConfig);
      this.notifyConfigurationChange();

      console.log('✅ [AUTH_CONFIG] Legacy configuration updated successfully');

    } catch (error) {
      // Rollback on error
      this.currentConfig.legacy = oldConfig;
      console.error('❌ [AUTH_CONFIG] Failed to update legacy configuration:', error);
      throw error;
    }
  }

  /**
   * Update Bowpi provider configuration
   */
  async updateBowpiConfig(config: Partial<BowpiAuthConfig>): Promise<void> {
    console.log('🔄 [AUTH_CONFIG] Updating Bowpi configuration');

    const oldConfig = { ...this.currentConfig.bowpi };
    this.currentConfig.bowpi = { ...this.currentConfig.bowpi, ...config };

    try {
      this.validateBowpiConfig(this.currentConfig.bowpi);
      await this.saveConfiguration(this.currentConfig);
      this.notifyConfigurationChange();

      console.log('✅ [AUTH_CONFIG] Bowpi configuration updated successfully');

    } catch (error) {
      // Rollback on error
      this.currentConfig.bowpi = oldConfig;
      console.error('❌ [AUTH_CONFIG] Failed to update Bowpi configuration:', error);
      throw error;
    }
  }

  /**
   * Check if runtime switching is allowed
   */
  isRuntimeSwitchAllowed(): boolean {
    return this.currentConfig.allowRuntimeSwitch;
  }

  /**
   * Check if confirmation is required for switching
   */
  requiresConfirmationForSwitch(): boolean {
    return this.currentConfig.requireConfirmationForSwitch;
  }

  /**
   * Check if auto-switch on failure is enabled
   */
  isAutoSwitchOnFailureEnabled(): boolean {
    return this.currentConfig.autoSwitchOnFailure;
  }

  /**
   * Subscribe to configuration changes
   */
  onConfigurationChange(listener: (config: AuthConfiguration) => void): () => void {
    this.configListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.configListeners.indexOf(listener);
      if (index > -1) {
        this.configListeners.splice(index, 1);
      }
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    console.log('🔄 [AUTH_CONFIG] Resetting configuration to defaults');

    this.currentConfig = { ...DEFAULT_AUTH_CONFIG };

    try {
      await this.saveConfiguration(this.currentConfig);
      this.notifyConfigurationChange();

      console.log('✅ [AUTH_CONFIG] Configuration reset to defaults');

    } catch (error) {
      console.error('❌ [AUTH_CONFIG] Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration for specific provider
   */
  getProviderConfig(type: AuthType): LegacyAuthConfig | BowpiAuthConfig {
    switch (type) {
      case AuthType.LEGACY:
        return { ...this.currentConfig.legacy };
      case AuthType.BOWPI:
        return { ...this.currentConfig.bowpi };
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentConfig(): Partial<AuthConfiguration> {
    console.log('🔍 [AUTH_CONFIG] Loading environment configuration');

    const config: Partial<AuthConfiguration> = {};

    // Auth type from environment
    const envAuthType = process.env.AUTH_TYPE;
    if (envAuthType && isValidAuthType(envAuthType)) {
      config.currentType = envAuthType;
      console.log(`📝 [AUTH_CONFIG] Environment auth type: ${envAuthType}`);
    }

    // Runtime switching
    if (process.env.ALLOW_RUNTIME_SWITCH !== undefined) {
      config.allowRuntimeSwitch = process.env.ALLOW_RUNTIME_SWITCH === 'true';
    }

    // Auto-switch on failure
    if (process.env.AUTO_SWITCH_ON_FAILURE !== undefined) {
      config.autoSwitchOnFailure = process.env.AUTO_SWITCH_ON_FAILURE === 'true';
    }

    // Debug logging
    if (process.env.AUTH_DEBUG_LOGGING !== undefined) {
      config.enableDebugLogging = process.env.AUTH_DEBUG_LOGGING === 'true';
    }

    // Legacy configuration
    const legacyConfig: Partial<LegacyAuthConfig> = {};
    if (process.env.LEGACY_MOCK_DELAY) {
      legacyConfig.mockDelay = parseInt(process.env.LEGACY_MOCK_DELAY, 10);
    }
    if (process.env.LEGACY_ALLOWED_USERS) {
      legacyConfig.allowedUsers = process.env.LEGACY_ALLOWED_USERS.split(',');
    }
    if (process.env.LEGACY_SIMULATE_ERRORS !== undefined) {
      legacyConfig.simulateNetworkErrors = process.env.LEGACY_SIMULATE_ERRORS === 'true';
    }
    if (Object.keys(legacyConfig).length > 0) {
      config.legacy = legacyConfig;
    }

    // Bowpi configuration
    const bowpiConfig: Partial<BowpiAuthConfig> = {};
    if (process.env.BOWPI_BASE_URL) {
      bowpiConfig.baseUrl = process.env.BOWPI_BASE_URL;
    }
    if (process.env.BOWPI_TIMEOUT) {
      bowpiConfig.timeout = parseInt(process.env.BOWPI_TIMEOUT, 10);
    }
    if (process.env.BOWPI_RETRY_ATTEMPTS) {
      bowpiConfig.retryAttempts = parseInt(process.env.BOWPI_RETRY_ATTEMPTS, 10);
    }
    if (process.env.BOWPI_ENCRYPTION !== undefined) {
      bowpiConfig.enableEncryption = process.env.BOWPI_ENCRYPTION === 'true';
    }
    if (Object.keys(bowpiConfig).length > 0) {
      config.bowpi = bowpiConfig;
    }

    return config;
  }

  /**
   * Load stored configuration from AsyncStorage
   */
  private async loadStoredConfig(): Promise<Partial<AuthConfiguration>> {
    try {
      console.log('🔍 [AUTH_CONFIG] Loading stored configuration');

      const storedConfigJson = await AsyncStorage.getItem('auth_configuration');
      if (!storedConfigJson) {
        console.log('📝 [AUTH_CONFIG] No stored configuration found');
        return {};
      }

      const storedConfig = JSON.parse(storedConfigJson);
      console.log('📝 [AUTH_CONFIG] Loaded stored configuration');

      return storedConfig;

    } catch (error) {
      console.error('❌ [AUTH_CONFIG] Failed to load stored configuration:', error);
      return {};
    }
  }

  /**
   * Load user preferences
   */
  private async loadUserPreferences(): Promise<Partial<AuthConfiguration>> {
    try {
      console.log('🔍 [AUTH_CONFIG] Loading user preferences');

      const prefsJson = await AsyncStorage.getItem('auth_user_preferences');
      if (!prefsJson) {
        console.log('📝 [AUTH_CONFIG] No user preferences found');
        return {};
      }

      const prefs = JSON.parse(prefsJson);
      console.log('📝 [AUTH_CONFIG] Loaded user preferences');

      return prefs;

    } catch (error) {
      console.error('❌ [AUTH_CONFIG] Failed to load user preferences:', error);
      return {};
    }
  }

  /**
   * Save configuration to AsyncStorage
   */
  private async saveConfiguration(config: AuthConfiguration): Promise<void> {
    try {
      const configJson = JSON.stringify(config, null, 2);
      await AsyncStorage.setItem('auth_configuration', configJson);
      console.log('💾 [AUTH_CONFIG] Configuration saved successfully');

    } catch (error) {
      console.error('❌ [AUTH_CONFIG] Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Merge multiple configuration objects with priority
   */
  private mergeConfigurations(configs: Partial<AuthConfiguration>[]): AuthConfiguration {
    let merged = { ...DEFAULT_AUTH_CONFIG };

    for (const config of configs) {
      if (config) {
        // Merge top-level properties
        merged = { ...merged, ...config };

        // Deep merge nested objects
        if (config.legacy) {
          merged.legacy = { ...merged.legacy, ...config.legacy };
        }
        if (config.bowpi) {
          merged.bowpi = { ...merged.bowpi, ...config.bowpi };
        }
      }
    }

    return merged;
  }

  /**
   * Validate complete configuration
   */
  private validateConfiguration(config: AuthConfiguration): void {
    console.log('🔍 [AUTH_CONFIG] Validating configuration');

    // Validate auth type
    if (!isValidAuthType(config.currentType)) {
      throw new Error(`Invalid current auth type: ${config.currentType}`);
    }

    if (config.fallbackType && !isValidAuthType(config.fallbackType)) {
      throw new Error(`Invalid fallback auth type: ${config.fallbackType}`);
    }

    // Validate provider configurations
    this.validateLegacyConfig(config.legacy);
    this.validateBowpiConfig(config.bowpi);

    // Validate numeric values
    if (config.switchCooldownPeriod < 0) {
      throw new Error('Switch cooldown period must be non-negative');
    }

    if (config.healthCheckInterval < 1000) {
      throw new Error('Health check interval must be at least 1000ms');
    }

    if (config.maxSwitchesPerHour < 1) {
      throw new Error('Max switches per hour must be at least 1');
    }

    console.log('✅ [AUTH_CONFIG] Configuration validation passed');
  }

  /**
   * Validate legacy configuration
   */
  private validateLegacyConfig(config: LegacyAuthConfig): void {
    if (config.mockDelay < 0) {
      throw new Error('Legacy mock delay must be non-negative');
    }

    if (config.sessionDuration < 60000) {
      throw new Error('Legacy session duration must be at least 1 minute');
    }

    // Validate allowed users format
    for (const user of config.allowedUsers) {
      if (!user.includes('@')) {
        throw new Error(`Invalid email format in allowed users: ${user}`);
      }
    }
  }

  /**
   * Validate Bowpi configuration
   */
  private validateBowpiConfig(config: BowpiAuthConfig): void {
    // Validate URL format
    try {
      new URL(config.baseUrl);
    } catch {
      throw new Error(`Invalid Bowpi base URL: ${config.baseUrl}`);
    }

    if (config.timeout < 1000) {
      throw new Error('Bowpi timeout must be at least 1000ms');
    }

    if (config.retryAttempts < 0 || config.retryAttempts > 10) {
      throw new Error('Bowpi retry attempts must be between 0 and 10');
    }

    if (config.sessionValidationInterval < 60000) {
      throw new Error('Bowpi session validation interval must be at least 1 minute');
    }
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyConfigurationChange(): void {
    const config = this.getConfiguration();
    this.configListeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('❌ [AUTH_CONFIG] Error in configuration change listener:', error);
      }
    });
  }

  /**
   * Get debug information about configuration service
   */
  getDebugInfo(): {
    isInitialized: boolean;
    currentConfig: AuthConfiguration;
    listenerCount: number;
    environmentOverrides: string[];
  } {
    const envOverrides: string[] = [];
    if (process.env.AUTH_TYPE) envOverrides.push('AUTH_TYPE');
    if (process.env.ALLOW_RUNTIME_SWITCH) envOverrides.push('ALLOW_RUNTIME_SWITCH');
    if (process.env.BOWPI_BASE_URL) envOverrides.push('BOWPI_BASE_URL');
    if (process.env.LEGACY_MOCK_DELAY) envOverrides.push('LEGACY_MOCK_DELAY');

    return {
      isInitialized: this.isInitialized,
      currentConfig: this.getConfiguration(),
      listenerCount: this.configListeners.length,
      environmentOverrides: envOverrides
    };
  }
}

// Export singleton instance
export const authConfiguration = AuthConfigurationService.getInstance();
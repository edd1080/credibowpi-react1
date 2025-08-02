// Authentication Provider Factory - Creates and manages authentication providers
// Implements the Factory pattern for creating different authentication providers

import { 
  AuthProvider, 
  AuthType, 
  AuthConfiguration,
  AuthProviderError,
  AuthProviderErrorType,
  ProviderInitResult,
  ProviderCleanupResult
} from '../../types/auth-providers';
import { LegacyAuthProvider, BowpiAuthProvider } from './providers';

/**
 * Authentication Provider Factory
 * Manages creation, caching, and lifecycle of authentication providers
 */
export class AuthProviderFactory {
  private static instance: AuthProviderFactory;
  private providers: Map<AuthType, AuthProvider> = new Map();
  private config: AuthConfiguration | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AuthProviderFactory {
    if (!AuthProviderFactory.instance) {
      AuthProviderFactory.instance = new AuthProviderFactory();
    }
    return AuthProviderFactory.instance;
  }

  /**
   * Initialize factory with configuration
   */
  initialize(config: AuthConfiguration): void {
    console.log('🔍 [AUTH_FACTORY] Initializing with configuration:', {
      currentType: config.currentType,
      fallbackType: config.fallbackType,
      allowRuntimeSwitch: config.allowRuntimeSwitch
    });

    this.config = { ...config };
    this.isInitialized = true;

    console.log('✅ [AUTH_FACTORY] Factory initialized successfully');
  }

  /**
   * Create or get cached authentication provider
   */
  async createProvider(type: AuthType): Promise<AuthProvider> {
    console.log(`🔍 [AUTH_FACTORY] Creating provider: ${type}`);

    if (!this.isInitialized || !this.config) {
      throw new AuthProviderError(
        AuthProviderErrorType.CONFIGURATION_ERROR,
        'Factory not initialized with configuration',
        type
      );
    }

    // Return cached provider if exists and is healthy
    const cachedProvider = this.providers.get(type);
    if (cachedProvider) {
      try {
        const health = await cachedProvider.healthCheck();
        if (health.isHealthy) {
          console.log(`✅ [AUTH_FACTORY] Returning cached ${type} provider`);
          return cachedProvider;
        } else {
          console.log(`⚠️ [AUTH_FACTORY] Cached ${type} provider unhealthy, recreating`);
          await this.cleanupProvider(type);
        }
      } catch (error) {
        console.warn(`⚠️ [AUTH_FACTORY] Health check failed for cached ${type} provider:`, error);
        await this.cleanupProvider(type);
      }
    }

    // Create new provider
    const provider = await this.instantiateProvider(type);
    
    // Initialize provider
    const initResult = await this.initializeProvider(provider);
    if (!initResult.success) {
      throw new AuthProviderError(
        AuthProviderErrorType.INITIALIZATION_FAILED,
        `Failed to initialize ${type} provider: ${initResult.message}`,
        type,
        initResult.error
      );
    }

    // Cache provider
    this.providers.set(type, provider);

    console.log(`✅ [AUTH_FACTORY] Created and cached ${type} provider`);
    return provider;
  }

  /**
   * Switch to a different authentication provider
   */
  async switchProvider(newType: AuthType): Promise<AuthProvider> {
    console.log(`🔄 [AUTH_FACTORY] Switching to provider: ${newType}`);

    if (!this.isInitialized || !this.config) {
      throw new AuthProviderError(
        AuthProviderErrorType.CONFIGURATION_ERROR,
        'Factory not initialized with configuration',
        newType
      );
    }

    const startTime = Date.now();

    try {
      // Cleanup current provider if different from new type
      const currentType = this.config.currentType;
      if (currentType !== newType) {
        await this.cleanupProvider(currentType);
      }

      // Create new provider
      const newProvider = await this.createProvider(newType);

      // Update configuration
      this.config.currentType = newType;

      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH_FACTORY] Successfully switched to ${newType} provider (${duration}ms)`);

      return newProvider;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH_FACTORY] Failed to switch to ${newType} provider (${duration}ms):`, error);
      throw error;
    }
  }

  /**
   * Get current authentication provider
   */
  getCurrentProvider(): AuthProvider | null {
    if (!this.config) {
      return null;
    }

    return this.providers.get(this.config.currentType) || null;
  }

  /**
   * Get all available provider types
   */
  getAvailableProviders(): AuthType[] {
    return [AuthType.LEGACY, AuthType.BOWPI];
  }

  /**
   * Get cached providers
   */
  getCachedProviders(): AuthType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is cached and healthy
   */
  async isProviderHealthy(type: AuthType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) {
      return false;
    }

    try {
      const health = await provider.healthCheck();
      return health.isHealthy;
    } catch (error) {
      console.error(`❌ [AUTH_FACTORY] Health check failed for ${type} provider:`, error);
      return false;
    }
  }

  /**
   * Cleanup specific provider
   */
  async cleanupProvider(type: AuthType): Promise<ProviderCleanupResult> {
    console.log(`🧹 [AUTH_FACTORY] Cleaning up ${type} provider`);

    const startTime = Date.now();
    const provider = this.providers.get(type);

    if (!provider) {
      return {
        success: true,
        provider: type,
        duration: Date.now() - startTime,
        message: 'Provider not cached, nothing to cleanup',
        resourcesFreed: []
      };
    }

    try {
      await provider.cleanup();
      this.providers.delete(type);

      const duration = Date.now() - startTime;
      console.log(`✅ [AUTH_FACTORY] Successfully cleaned up ${type} provider (${duration}ms)`);

      return {
        success: true,
        provider: type,
        duration,
        message: 'Provider cleaned up successfully',
        resourcesFreed: ['cached_instance', 'provider_resources']
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [AUTH_FACTORY] Failed to cleanup ${type} provider (${duration}ms):`, error);

      // Force remove from cache even if cleanup failed
      this.providers.delete(type);

      return {
        success: false,
        provider: type,
        duration,
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error as Error,
        resourcesFreed: ['cached_instance'] // At least removed from cache
      };
    }
  }

  /**
   * Cleanup all providers
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [AUTH_FACTORY] Cleaning up all providers');

    const cleanupPromises = Array.from(this.providers.keys()).map(type => 
      this.cleanupProvider(type)
    );

    const results = await Promise.allSettled(cleanupPromises);
    
    // Log results
    results.forEach((result, index) => {
      const type = Array.from(this.providers.keys())[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ [AUTH_FACTORY] Cleanup result for ${type}:`, result.value);
      } else {
        console.error(`❌ [AUTH_FACTORY] Cleanup failed for ${type}:`, result.reason);
      }
    });

    this.providers.clear();
    this.isInitialized = false;
    this.config = null;

    console.log('✅ [AUTH_FACTORY] All providers cleaned up');
  }

  /**
   * Get factory debug information
   */
  getDebugInfo(): {
    isInitialized: boolean;
    currentConfig: AuthConfiguration | null;
    cachedProviders: AuthType[];
    providerHealth: Record<string, boolean>;
  } {
    const providerHealth: Record<string, boolean> = {};
    
    // Note: We can't await here, so we'll return a promise-based approach
    // In a real implementation, you might want to cache health status
    for (const [type] of this.providers) {
      providerHealth[type] = true; // Simplified for debug info
    }

    return {
      isInitialized: this.isInitialized,
      currentConfig: this.config ? { ...this.config } : null,
      cachedProviders: Array.from(this.providers.keys()),
      providerHealth
    };
  }

  /**
   * Instantiate provider based on type
   */
  private async instantiateProvider(type: AuthType): Promise<AuthProvider> {
    if (!this.config) {
      throw new AuthProviderError(
        AuthProviderErrorType.CONFIGURATION_ERROR,
        'No configuration available',
        type
      );
    }

    switch (type) {
      case AuthType.LEGACY:
        return new LegacyAuthProvider(this.config.legacy);

      case AuthType.BOWPI:
        return new BowpiAuthProvider(this.config.bowpi);

      default:
        throw new AuthProviderError(
          AuthProviderErrorType.CONFIGURATION_ERROR,
          `Unknown authentication provider type: ${type}`,
          type
        );
    }
  }

  /**
   * Initialize provider with error handling
   */
  private async initializeProvider(provider: AuthProvider): Promise<ProviderInitResult> {
    const startTime = Date.now();

    try {
      await provider.initialize();

      const duration = Date.now() - startTime;
      return {
        success: true,
        provider: provider.type,
        duration,
        message: 'Provider initialized successfully',
        warnings: []
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown initialization error';

      return {
        success: false,
        provider: provider.type,
        duration,
        message,
        error: error as Error,
        warnings: []
      };
    }
  }

  /**
   * Validate provider configuration
   */
  private validateProviderConfig(type: AuthType): void {
    if (!this.config) {
      throw new AuthProviderError(
        AuthProviderErrorType.CONFIGURATION_ERROR,
        'No configuration available',
        type
      );
    }

    switch (type) {
      case AuthType.LEGACY:
        if (!this.config.legacy) {
          throw new AuthProviderError(
            AuthProviderErrorType.CONFIGURATION_ERROR,
            'Legacy provider configuration missing',
            type
          );
        }
        break;

      case AuthType.BOWPI:
        if (!this.config.bowpi) {
          throw new AuthProviderError(
            AuthProviderErrorType.CONFIGURATION_ERROR,
            'Bowpi provider configuration missing',
            type
          );
        }
        break;

      default:
        throw new AuthProviderError(
          AuthProviderErrorType.CONFIGURATION_ERROR,
          `Unknown provider type: ${type}`,
          type
        );
    }
  }
}

// Export singleton instance
export const authProviderFactory = AuthProviderFactory.getInstance();
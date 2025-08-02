// Auth Store Manager - Enhanced for dual authentication system
// This service acts as a bridge between auth services and the Zustand store
// Now supports multiple authentication providers with dynamic switching

import { 
  AuthStoreInterface, 
  AuthStoreActions, 
  AuthState, 
  User,
  AuthStoreCallback 
} from '../types/auth-shared';
import { 
  AuthProvider, 
  AuthType, 
  AuthConfiguration,
  AuthSwitchResult,
  SwitchValidationResult,
  AuthProviderError,
  AuthProviderErrorType
} from '../types/auth-providers';
import { authConfiguration } from './auth/AuthConfiguration';
import { authProviderFactory } from './auth/AuthProviderFactory';

/**
 * Enhanced Auth Store Manager - Provides controlled access to auth store with dual authentication
 * This breaks circular dependencies and orchestrates multiple authentication providers
 */
export class AuthStoreManager {
  private static instance: AuthStoreManager;
  private storeRef: AuthStoreInterface | null = null;
  private callbacks: AuthStoreCallback[] = [];
  private currentProvider: AuthProvider | null = null;
  private config: AuthConfiguration | null = null;
  private isInitialized = false;
  private switchInProgress = false;

  private constructor() {}

  static getInstance(): AuthStoreManager {
    if (!AuthStoreManager.instance) {
      AuthStoreManager.instance = new AuthStoreManager();
    }
    return AuthStoreManager.instance;
  }

  /**
   * Initialize the store manager with dual authentication support
   * This is called by the auth store during initialization
   */
  async initialize(store: AuthStoreInterface): Promise<void> {
    console.log('🔍 [AUTH_STORE_MANAGER] Initializing with dual authentication support');
    
    this.storeRef = store;

    try {
      // Initialize configuration service
      await authConfiguration.initialize();
      this.config = authConfiguration.getConfiguration();

      // Initialize provider factory
      authProviderFactory.initialize(this.config);

      // Create initial provider
      this.currentProvider = await authProviderFactory.createProvider(this.config.currentType);

      // Subscribe to configuration changes
      authConfiguration.onConfigurationChange((newConfig) => {
        this.config = newConfig;
        console.log(`🔄 [AUTH_STORE_MANAGER] Configuration updated: ${newConfig.currentType}`);
      });

      this.isInitialized = true;
      console.log(`✅ [AUTH_STORE_MANAGER] Initialized with ${this.currentProvider.name}`);

    } catch (error) {
      console.error('❌ [AUTH_STORE_MANAGER] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    if (!this.storeRef) {
      console.warn('⚠️ [AUTH_STORE_MANAGER] Store not initialized, returning default state');
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        bowpiToken: undefined,
        bowpiUserData: undefined,
        sessionId: undefined,
        isOfflineMode: false,
      };
    }

    return {
      user: this.storeRef.user,
      token: this.storeRef.token,
      isAuthenticated: this.storeRef.isAuthenticated,
      isLoading: this.storeRef.isLoading,
      error: this.storeRef.error,
      bowpiToken: this.storeRef.bowpiToken,
      bowpiUserData: this.storeRef.bowpiUserData,
      sessionId: this.storeRef.sessionId,
      isOfflineMode: this.storeRef.isOfflineMode,
    };
  }

  /**
   * Get store actions
   */
  getActions(): AuthStoreActions {
    if (!this.storeRef) {
      console.warn('⚠️ [AUTH_STORE_MANAGER] Store not initialized, returning no-op actions');
      return {
        setLoading: () => {},
        clearError: () => {},
        setBowpiAuth: () => {},
        clearBowpiAuth: () => {},
        setOfflineMode: () => {},
        setAuthenticated: () => {},
        setUser: () => {},
      };
    }

    return {
      setLoading: this.storeRef.setLoading,
      clearError: this.storeRef.clearError,
      setBowpiAuth: this.storeRef.setBowpiAuth,
      clearBowpiAuth: this.storeRef.clearBowpiAuth,
      setOfflineMode: this.storeRef.setOfflineMode,
      setAuthenticated: this.storeRef.setAuthenticated,
      setUser: this.storeRef.setUser,
    };
  }

  /**
   * Perform login using current authentication provider
   */
  async login(email: string, password: string): Promise<void> {
    if (!this.currentProvider) {
      throw new AuthProviderError(
        AuthProviderErrorType.PROVIDER_UNAVAILABLE,
        'No authentication provider available',
        AuthType.BOWPI // Default fallback
      );
    }

    console.log(`🔍 [AUTH_STORE_MANAGER] Login attempt using ${this.currentProvider.name}`);

    this.setLoading(true);
    this.clearError();

    try {
      const result = await this.currentProvider.login(email, password);

      if (result.success && result.userData) {
        this.updateAuthState(result.userData);
        console.log(`✅ [AUTH_STORE_MANAGER] Login successful with ${this.currentProvider.name}`);
      } else {
        throw new Error(result.message || 'Login failed');
      }

    } catch (error) {
      console.error(`❌ [AUTH_STORE_MANAGER] Login failed with ${this.currentProvider.name}:`, error);

      // If auto-switch is enabled and we have a fallback, try it
      if (this.config?.autoSwitchOnFailure && this.config.fallbackType && 
          this.config.fallbackType !== this.currentProvider.type) {
        
        console.log(`🔄 [AUTH_STORE_MANAGER] Attempting fallback to ${this.config.fallbackType}`);
        
        try {
          await this.switchAuthProvider(this.config.fallbackType);
          return this.login(email, password);
        } catch (switchError) {
          console.error('❌ [AUTH_STORE_MANAGER] Fallback switch failed:', switchError);
        }
      }

      this.setLoading(false);
      throw error;
    }
  }

  /**
   * Perform logout using current authentication provider
   */
  async logout(): Promise<void> {
    if (!this.currentProvider) {
      console.warn('⚠️ [AUTH_STORE_MANAGER] No provider available for logout, clearing local state');
      this.clearAuthState();
      return;
    }

    console.log(`🔍 [AUTH_STORE_MANAGER] Logout using ${this.currentProvider.name}`);

    try {
      await this.currentProvider.logout();
      this.clearAuthState();
      console.log(`✅ [AUTH_STORE_MANAGER] Logout successful with ${this.currentProvider.name}`);

    } catch (error) {
      console.error(`❌ [AUTH_STORE_MANAGER] Logout error with ${this.currentProvider.name}:`, error);
      // Always clear local state even if provider logout fails
      this.clearAuthState();
      throw error;
    }
  }

  /**
   * Check if user is authenticated using current provider
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.currentProvider) {
      return false;
    }

    try {
      const isAuth = await this.currentProvider.isAuthenticated();
      
      // Update store state if needed
      const currentState = this.getState();
      if (currentState.isAuthenticated !== isAuth) {
        this.setAuthenticated(isAuth);
        
        if (isAuth) {
          // Load user data if authenticated but not in store
          const userData = await this.currentProvider.getCurrentUser();
          if (userData && !currentState.user) {
            this.setUser(userData);
          }
        }
      }

      return isAuth;

    } catch (error) {
      console.error('❌ [AUTH_STORE_MANAGER] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Switch to a different authentication provider
   */
  async switchAuthProvider(newType: AuthType): Promise<AuthSwitchResult> {
    console.log(`🔄 [AUTH_STORE_MANAGER] Switching from ${this.getCurrentAuthType()} to ${newType}`);

    if (this.switchInProgress) {
      throw new AuthProviderError(
        AuthProviderErrorType.SWITCH_FAILED,
        'Provider switch already in progress',
        newType
      );
    }

    const startTime = Date.now();
    const fromType = this.getCurrentAuthType();
    this.switchInProgress = true;

    try {
      // Validate switch
      const validation = await this.validateProviderSwitch(newType);
      if (!validation.canSwitch) {
        throw new AuthProviderError(
          AuthProviderErrorType.SWITCH_FAILED,
          validation.reason || 'Switch validation failed',
          newType
        );
      }

      // Logout from current provider if authenticated
      const wasAuthenticated = await this.isAuthenticated();
      if (wasAuthenticated && this.currentProvider) {
        try {
          await this.currentProvider.logout();
        } catch (error) {
          console.warn('⚠️ [AUTH_STORE_MANAGER] Current provider logout failed during switch:', error);
        }
      }

      // Switch to new provider
      this.currentProvider = await authProviderFactory.switchProvider(newType);

      // Update configuration
      await authConfiguration.setAuthType(newType);

      // Clear auth state
      this.clearAuthState();

      const duration = Date.now() - startTime;
      const switchEvent = {
        id: `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromType,
        toType: newType,
        timestamp: Date.now(),
        reason: 'user_request' as const,
        success: true,
        duration,
        userId: undefined,
        metadata: { wasAuthenticated }
      };

      console.log(`✅ [AUTH_STORE_MANAGER] Successfully switched to ${this.currentProvider.name} (${duration}ms)`);

      // Notify callbacks
      this.notifyCallbacks();

      return {
        success: true,
        fromProvider: fromType,
        toProvider: newType,
        duration,
        message: `Successfully switched to ${this.currentProvider.name}`,
        requiresReauth: wasAuthenticated,
        event: switchEvent
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const switchEvent = {
        id: `switch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromType,
        toType: newType,
        timestamp: Date.now(),
        reason: 'user_request' as const,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: undefined,
        metadata: {}
      };

      console.error(`❌ [AUTH_STORE_MANAGER] Failed to switch to ${newType} (${duration}ms):`, error);

      return {
        success: false,
        fromProvider: fromType,
        toProvider: newType,
        duration,
        message: error instanceof Error ? error.message : 'Switch failed',
        error: error as Error,
        requiresReauth: false,
        event: switchEvent
      };

    } finally {
      this.switchInProgress = false;
    }
  }

  /**
   * Get current authentication type
   */
  getCurrentAuthType(): AuthType {
    return this.config?.currentType || AuthType.BOWPI;
  }

  /**
   * Get current authentication provider
   */
  getCurrentProvider(): AuthProvider | null {
    return this.currentProvider;
  }

  /**
   * Get available authentication providers
   */
  getAvailableProviders(): AuthType[] {
    return authProviderFactory.getAvailableProviders();
  }

  /**
   * Check if runtime switching is allowed
   */
  isRuntimeSwitchAllowed(): boolean {
    return this.config?.allowRuntimeSwitch || false;
  }

  /**
   * Validate provider switch
   */
  async validateProviderSwitch(newType: AuthType): Promise<SwitchValidationResult> {
    const warnings: string[] = [];
    const requirements: string[] = [];

    // Check if switching is allowed
    if (!this.isRuntimeSwitchAllowed()) {
      return {
        canSwitch: false,
        reason: 'Runtime switching is disabled',
        warnings,
        requirements,
        estimatedDuration: 0,
        requiresConfirmation: false
      };
    }

    // Check if already using this provider
    if (this.getCurrentAuthType() === newType) {
      return {
        canSwitch: false,
        reason: `Already using ${newType} provider`,
        warnings,
        requirements,
        estimatedDuration: 0,
        requiresConfirmation: false
      };
    }

    // Check if switch is in progress
    if (this.switchInProgress) {
      return {
        canSwitch: false,
        reason: 'Provider switch already in progress',
        warnings,
        requirements,
        estimatedDuration: 0,
        requiresConfirmation: false
      };
    }

    // Check provider health
    try {
      const isHealthy = await authProviderFactory.isProviderHealthy(newType);
      if (!isHealthy) {
        warnings.push(`Target provider (${newType}) may not be healthy`);
      }
    } catch (error) {
      warnings.push(`Unable to check target provider health: ${error}`);
    }

    // Check if user is authenticated
    const isAuth = await this.isAuthenticated();
    if (isAuth) {
      requirements.push('Current session will be terminated');
      warnings.push('You will need to log in again after switching');
    }

    return {
      canSwitch: true,
      warnings,
      requirements,
      estimatedDuration: 2000, // Estimated 2 seconds
      requiresConfirmation: this.config?.requireConfirmationForSwitch || false
    };
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    const actions = this.getActions();
    actions.setLoading(loading);
    this.notifyCallbacks();
  }

  /**
   * Clear error state
   */
  clearError(): void {
    const actions = this.getActions();
    actions.clearError();
    this.notifyCallbacks();
  }

  /**
   * Set Bowpi authentication data
   */
  setBowpiAuth(token: string, userData: any): void {
    const actions = this.getActions();
    actions.setBowpiAuth(token, userData);
    this.notifyCallbacks();
  }

  /**
   * Clear Bowpi authentication data
   */
  clearBowpiAuth(): void {
    const actions = this.getActions();
    actions.clearBowpiAuth();
    this.notifyCallbacks();
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    const actions = this.getActions();
    actions.setOfflineMode(offline);
    this.notifyCallbacks();
  }

  /**
   * Set authentication status
   */
  setAuthenticated(authenticated: boolean): void {
    const actions = this.getActions();
    actions.setAuthenticated(authenticated);
    this.notifyCallbacks();
  }

  /**
   * Set user data
   */
  setUser(user: User | null): void {
    const actions = this.getActions();
    actions.setUser(user);
    this.notifyCallbacks();
  }

  /**
   * Update authentication state with user data
   */
  updateAuthState(user: User, token?: string, bowpiData?: any): void {
    console.log('🔍 [AUTH_STORE_MANAGER] Updating auth state for user:', user.id);
    
    const actions = this.getActions();
    
    // Update user and authentication status
    actions.setUser(user);
    actions.setAuthenticated(true);
    actions.clearError();
    actions.setLoading(false);

    // Update Bowpi-specific data if provided
    if (token && bowpiData) {
      actions.setBowpiAuth(token, bowpiData);
    }

    this.notifyCallbacks();
  }

  /**
   * Clear all authentication data
   */
  clearAuthState(): void {
    console.log('🔍 [AUTH_STORE_MANAGER] Clearing auth state');
    
    const actions = this.getActions();
    
    actions.setUser(null);
    actions.setAuthenticated(false);
    actions.clearBowpiAuth();
    actions.clearError();
    actions.setLoading(false);

    this.notifyCallbacks();
  }

  /**
   * Set error state
   */
  setError(error: string): void {
    if (!this.storeRef) {
      console.warn('⚠️ [AUTH_STORE_MANAGER] Store not initialized, cannot set error');
      return;
    }

    // Since error is not in AuthStoreActions interface, we need to access it directly
    // This is a temporary solution - ideally we'd add setError to the interface
    if ('error' in this.storeRef && typeof (this.storeRef as any).setError === 'function') {
      (this.storeRef as any).setError(error);
    } else {
      console.warn('⚠️ [AUTH_STORE_MANAGER] Store does not support setError method');
    }

    this.notifyCallbacks();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(callback: AuthStoreCallback): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks of state changes
   */
  private notifyCallbacks(): void {
    const currentState = this.getState();
    this.callbacks.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('❌ [AUTH_STORE_MANAGER] Error in state change callback:', error);
      }
    });
  }

  /**
   * Check if store is initialized
   */
  isInitialized(): boolean {
    return this.storeRef !== null;
  }

  /**
   * Get enhanced debug information
   */
  getDebugInfo(): {
    isInitialized: boolean;
    callbackCount: number;
    currentState: AuthState;
    currentProvider: {
      type: AuthType;
      name: string;
      isHealthy: boolean;
    } | null;
    configuration: AuthConfiguration | null;
    switchInProgress: boolean;
    availableProviders: AuthType[];
  } {
    let providerInfo = null;
    if (this.currentProvider) {
      providerInfo = {
        type: this.currentProvider.type,
        name: this.currentProvider.name,
        isHealthy: true // Simplified for debug - would need async call for real health check
      };
    }

    return {
      isInitialized: this.isInitialized,
      callbackCount: this.callbacks.length,
      currentState: this.getState(),
      currentProvider: providerInfo,
      configuration: this.config,
      switchInProgress: this.switchInProgress,
      availableProviders: this.getAvailableProviders()
    };
  }

  /**
   * Reset the store manager (for testing purposes)
   */
  reset(): void {
    console.log('🔍 [AUTH_STORE_MANAGER] Resetting store manager');
    this.storeRef = null;
    this.callbacks = [];
  }
}

// Export singleton instance
export const authStoreManager = AuthStoreManager.getInstance();
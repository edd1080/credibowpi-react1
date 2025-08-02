// Legacy Authentication Provider - Simulated authentication for development and testing
// This provider implements the AuthProvider interface with mock authentication logic

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AuthProvider, 
  AuthType, 
  AuthProviderCapabilities, 
  ProviderHealthStatus, 
  ProviderDebugInfo,
  LegacyAuthConfig,
  AuthProviderError,
  AuthProviderErrorType
} from '../../../types/auth-providers';
import { User, LoginResult, NetworkStatus } from '../../../types/auth-shared';

/**
 * Legacy session data structure
 */
interface LegacySessionData {
  user: User;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  sessionId: string;
}

/**
 * Legacy Authentication Provider
 * Provides simulated authentication for development, testing, and fallback scenarios
 */
export class LegacyAuthProvider implements AuthProvider {
  readonly type = AuthType.LEGACY;
  readonly name = 'Legacy Authentication';
  readonly description = 'Simulated authentication for development and testing';
  readonly version = '1.0.0';

  private config: LegacyAuthConfig;
  private currentUser: User | null = null;
  private sessionData: LegacySessionData | null = null;
  private isInitialized = false;
  private metrics = {
    loginAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    sessionDuration: 0,
    lastActivity: 0
  };
  private recentErrors: string[] = [];
  private lastError?: { message: string; timestamp: number; stack?: string };

  constructor(config: LegacyAuthConfig) {
    this.config = { ...config };
    console.log('🔍 [LEGACY_AUTH] Provider created with config:', {
      mockDelay: config.mockDelay,
      allowedUsersCount: config.allowedUsers.length,
      offlineMode: config.offlineMode
    });
  }

  /**
   * Initialize the legacy authentication provider
   */
  async initialize(): Promise<void> {
    console.log('🔍 [LEGACY_AUTH] Initializing provider...');

    try {
      // Load existing session if available
      await this.loadExistingSession();

      this.isInitialized = true;
      console.log('✅ [LEGACY_AUTH] Provider initialized successfully');

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Failed to initialize provider:', error);
      this.recordError('Initialization failed', error);
      throw new AuthProviderError(
        AuthProviderErrorType.INITIALIZATION_FAILED,
        'Failed to initialize legacy authentication provider',
        AuthType.LEGACY,
        error as Error
      );
    }
  }

  /**
   * Perform login with simulated authentication
   */
  async login(email: string, password: string): Promise<LoginResult> {
    console.log(`🔍 [LEGACY_AUTH] Login attempt for: ${email}`);

    this.metrics.loginAttempts++;
    const startTime = Date.now();

    try {
      // Simulate network delay
      await this.simulateDelay();

      // Simulate network errors if configured
      if (this.config.simulateNetworkErrors && Math.random() < 0.1) {
        throw new Error('Simulated network error');
      }

      // Validate credentials
      if (!this.isValidCredentials(email, password)) {
        this.metrics.failedLogins++;
        const errorMessage = 'Invalid email or password';
        this.recordError(errorMessage);
        
        return {
          success: false,
          message: errorMessage,
          error: new Error(errorMessage)
        };
      }

      // Create mock user data
      const userData = this.createMockUser(email);

      // Create and store session
      const sessionData = await this.createSession(userData);
      
      this.currentUser = userData;
      this.sessionData = sessionData;
      this.metrics.successfulLogins++;
      this.metrics.lastActivity = Date.now();

      const duration = Date.now() - startTime;

      console.log(`✅ [LEGACY_AUTH] Login successful for: ${email} (${duration}ms)`);

      return {
        success: true,
        message: 'Login successful',
        userData,
        provider: AuthType.LEGACY,
        duration
      };

    } catch (error) {
      this.metrics.failedLogins++;
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.recordError(errorMessage, error);

      console.error(`❌ [LEGACY_AUTH] Login failed for: ${email}`, error);

      return {
        success: false,
        message: errorMessage,
        error: error as Error,
        provider: AuthType.LEGACY,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Perform logout
   */
  async logout(): Promise<void> {
    console.log('🔍 [LEGACY_AUTH] Logout initiated');

    try {
      // Clear session data
      await this.clearSession();
      
      this.currentUser = null;
      this.sessionData = null;
      this.metrics.lastActivity = Date.now();

      console.log('✅ [LEGACY_AUTH] Logout completed successfully');

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Logout error:', error);
      this.recordError('Logout failed', error);
      
      // Always clear local state even if storage operations fail
      this.currentUser = null;
      this.sessionData = null;
      
      throw new AuthProviderError(
        AuthProviderErrorType.LOGOUT_FAILED,
        'Failed to logout from legacy authentication',
        AuthType.LEGACY,
        error as Error
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check current session
      if (this.currentUser && this.sessionData) {
        if (this.isSessionValid(this.sessionData)) {
          return true;
        } else {
          // Session expired, clear it
          await this.clearSession();
          this.currentUser = null;
          this.sessionData = null;
        }
      }

      // Try to load session from storage
      const session = await this.loadSession();
      if (session && this.isSessionValid(session)) {
        this.currentUser = session.user;
        this.sessionData = session;
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Error checking authentication:', error);
      this.recordError('Authentication check failed', error);
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (await this.isAuthenticated()) {
        return this.currentUser;
      }
      return null;

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Error getting current user:', error);
      this.recordError('Get current user failed', error);
      return null;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    return await this.isAuthenticated();
  }

  /**
   * Get session information
   */
  async getSessionInfo(): Promise<any> {
    if (this.sessionData) {
      return {
        sessionId: this.sessionData.sessionId,
        createdAt: this.sessionData.createdAt,
        lastActivity: this.sessionData.lastActivity,
        expiresAt: this.sessionData.expiresAt,
        isValid: this.isSessionValid(this.sessionData)
      };
    }
    return null;
  }

  /**
   * Cleanup provider resources
   */
  async cleanup(): Promise<void> {
    console.log('🔍 [LEGACY_AUTH] Cleaning up provider...');

    try {
      // Clear current session
      await this.clearSession();
      
      this.currentUser = null;
      this.sessionData = null;
      this.isInitialized = false;

      console.log('✅ [LEGACY_AUTH] Provider cleanup completed');

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Error during cleanup:', error);
      this.recordError('Cleanup failed', error);
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): AuthProviderCapabilities {
    return {
      supportsOffline: true,
      supportsTokenRefresh: false,
      supportsPasswordReset: false,
      supportsBiometric: false,
      requiresNetwork: false,
      supportsMultipleUsers: true,
      hasSessionPersistence: true,
      supportsRoleBasedAuth: true
    };
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Check if provider is initialized
      if (!this.isInitialized) {
        issues.push('Provider not initialized');
      }

      // Check storage access
      try {
        await AsyncStorage.getItem('legacy_auth_health_check');
        await AsyncStorage.setItem('legacy_auth_health_check', Date.now().toString());
      } catch (error) {
        issues.push('Storage access failed');
      }

      // Check session validity if exists
      if (this.sessionData && !this.isSessionValid(this.sessionData)) {
        issues.push('Current session expired');
      }

      const responseTime = Date.now() - startTime;
      const isHealthy = issues.length === 0;

      return {
        isHealthy,
        lastCheck: Date.now(),
        issues,
        performance: {
          averageLoginTime: this.calculateAverageLoginTime(),
          successRate: this.calculateSuccessRate(),
          lastSuccessfulOperation: this.metrics.lastActivity,
          totalOperations: this.metrics.loginAttempts
        }
      };

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Health check failed:', error);
      this.recordError('Health check failed', error);

      return {
        isHealthy: false,
        lastCheck: Date.now(),
        issues: ['Health check failed', ...issues],
        performance: {
          averageLoginTime: 0,
          successRate: 0,
          lastSuccessfulOperation: 0,
          totalOperations: 0
        }
      };
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): ProviderDebugInfo {
    return {
      type: this.type,
      name: this.name,
      version: this.version,
      isInitialized: this.isInitialized,
      hasActiveSession: !!this.currentUser,
      lastActivity: this.metrics.lastActivity,
      configuration: {
        mockDelay: this.config.mockDelay,
        allowedUsersCount: this.config.allowedUsers.length,
        simulateNetworkErrors: this.config.simulateNetworkErrors,
        offlineMode: this.config.offlineMode,
        sessionDuration: this.config.sessionDuration
      },
      metrics: { ...this.metrics },
      errors: {
        recent: [...this.recentErrors],
        count: this.recentErrors.length,
        lastError: this.lastError ? { ...this.lastError } : undefined
      }
    };
  }

  /**
   * Simulate network delay based on configuration
   */
  private async simulateDelay(): Promise<void> {
    if (this.config.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.mockDelay));
    }
  }

  /**
   * Validate user credentials
   */
  private isValidCredentials(email: string, password: string): boolean {
    // Basic email format validation
    if (!email.includes('@') || !email.includes('.')) {
      return false;
    }

    // Password length validation
    if (password.length < 4) {
      return false;
    }

    // If specific users are configured, validate against them
    if (this.config.allowedUsers.length > 0) {
      return this.config.allowedUsers.includes(email);
    }

    // Default validation - accept any properly formatted email
    return true;
  }

  /**
   * Create mock user data
   */
  private createMockUser(email: string): User {
    const name = email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    // Determine role from configuration or default to agent
    const role = this.config.mockUserRoles[email] || 'agent';

    return {
      id: `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      role,
      profile: {
        provider: 'legacy',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        sessionType: 'mock',
        mockDelay: this.config.mockDelay,
        allowedUser: this.config.allowedUsers.includes(email)
      }
    };
  }

  /**
   * Create and store session data
   */
  private async createSession(user: User): Promise<LegacySessionData> {
    const now = Date.now();
    const sessionData: LegacySessionData = {
      user,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.sessionDuration,
      sessionId: `legacy-session-${now}-${Math.random().toString(36).substr(2, 9)}`
    };

    await this.storeSession(sessionData);
    return sessionData;
  }

  /**
   * Store session data in AsyncStorage
   */
  private async storeSession(sessionData: LegacySessionData): Promise<void> {
    try {
      const sessionJson = JSON.stringify(sessionData);
      await AsyncStorage.setItem('legacy_auth_session', sessionJson);
      console.log('💾 [LEGACY_AUTH] Session stored successfully');

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Failed to store session:', error);
      throw error;
    }
  }

  /**
   * Load session data from AsyncStorage
   */
  private async loadSession(): Promise<LegacySessionData | null> {
    try {
      const sessionJson = await AsyncStorage.getItem('legacy_auth_session');
      if (!sessionJson) {
        return null;
      }

      const sessionData = JSON.parse(sessionJson) as LegacySessionData;
      console.log('📖 [LEGACY_AUTH] Session loaded from storage');
      return sessionData;

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Load existing session during initialization
   */
  private async loadExistingSession(): Promise<void> {
    const session = await this.loadSession();
    if (session && this.isSessionValid(session)) {
      this.currentUser = session.user;
      this.sessionData = session;
      console.log('✅ [LEGACY_AUTH] Existing session restored');
    }
  }

  /**
   * Clear session data
   */
  private async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem('legacy_auth_session');
      console.log('🗑️ [LEGACY_AUTH] Session cleared from storage');

    } catch (error) {
      console.error('❌ [LEGACY_AUTH] Failed to clear session:', error);
      throw error;
    }
  }

  /**
   * Check if session is valid (not expired)
   */
  private isSessionValid(session: LegacySessionData): boolean {
    const now = Date.now();
    return now < session.expiresAt;
  }

  /**
   * Record error for debugging and metrics
   */
  private recordError(message: string, error?: any): void {
    const errorInfo = {
      message,
      timestamp: Date.now(),
      stack: error?.stack
    };

    this.lastError = errorInfo;
    this.recentErrors.unshift(message);

    // Keep only last 10 errors
    if (this.recentErrors.length > 10) {
      this.recentErrors = this.recentErrors.slice(0, 10);
    }

    if (this.config.enableDebugLogging) {
      console.error(`❌ [LEGACY_AUTH] ${message}`, error);
    }
  }

  /**
   * Calculate average login time for metrics
   */
  private calculateAverageLoginTime(): number {
    // For legacy provider, return configured mock delay plus some processing time
    return this.config.mockDelay + 100;
  }

  /**
   * Calculate success rate for metrics
   */
  private calculateSuccessRate(): number {
    if (this.metrics.loginAttempts === 0) {
      return 1.0; // 100% if no attempts yet
    }
    return this.metrics.successfulLogins / this.metrics.loginAttempts;
  }
}
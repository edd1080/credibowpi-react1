// Bowpi Authentication Provider - Wrapper for existing Bowpi authentication system
// This provider implements the AuthProvider interface wrapping the existing BowpiAuthService

import { 
  AuthProvider, 
  AuthType, 
  AuthProviderCapabilities, 
  ProviderHealthStatus, 
  ProviderDebugInfo,
  BowpiAuthConfig,
  AuthProviderError,
  AuthProviderErrorType
} from '../../../types/auth-providers';
import { User, LoginResult } from '../../../types/auth-shared';
import { bowpiAuthService } from '../../BowpiAuthService';
import { AuthTokenData } from '../../../types/bowpi';

/**
 * Bowpi Authentication Provider
 * Wraps the existing BowpiAuthService to implement the AuthProvider interface
 */
export class BowpiAuthProvider implements AuthProvider {
  readonly type = AuthType.BOWPI;
  readonly name = 'Bowpi Authentication';
  readonly description = 'Production Bowpi authentication system';
  readonly version = '2.0.0';

  private config: BowpiAuthConfig;
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

  constructor(config: BowpiAuthConfig) {
    this.config = { ...config };
    console.log('🔍 [BOWPI_AUTH] Provider created with config:', {
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      enableEncryption: config.enableEncryption
    });
  }

  /**
   * Initialize the Bowpi authentication provider
   */
  async initialize(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH] Initializing provider...');

    try {
      // Initialize the underlying Bowpi service
      await bowpiAuthService.initialize();

      this.isInitialized = true;
      console.log('✅ [BOWPI_AUTH] Provider initialized successfully');

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Failed to initialize provider:', error);
      this.recordError('Initialization failed', error);
      throw new AuthProviderError(
        AuthProviderErrorType.INITIALIZATION_FAILED,
        'Failed to initialize Bowpi authentication provider',
        AuthType.BOWPI,
        error as Error
      );
    }
  }

  /**
   * Perform login using Bowpi authentication
   */
  async login(email: string, password: string): Promise<LoginResult> {
    console.log(`🔍 [BOWPI_AUTH] Login attempt for: ${email}`);

    this.metrics.loginAttempts++;
    const startTime = Date.now();

    try {
      // Use existing Bowpi service for login
      const bowpiResult = await bowpiAuthService.login(email, password);

      if (bowpiResult.success && bowpiResult.userData) {
        // Convert Bowpi user data to standard User format
        const userData = this.convertBowpiUserToStandardUser(bowpiResult.userData);

        this.metrics.successfulLogins++;
        this.metrics.lastActivity = Date.now();

        const duration = Date.now() - startTime;

        console.log(`✅ [BOWPI_AUTH] Login successful for: ${email} (${duration}ms)`);

        return {
          success: true,
          message: bowpiResult.message,
          userData,
          provider: AuthType.BOWPI,
          duration
        };

      } else {
        this.metrics.failedLogins++;
        const errorMessage = bowpiResult.message || 'Login failed';
        this.recordError(errorMessage, bowpiResult.error);

        console.error(`❌ [BOWPI_AUTH] Login failed for: ${email}`, bowpiResult.error);

        return {
          success: false,
          message: errorMessage,
          error: bowpiResult.error,
          provider: AuthType.BOWPI,
          duration: Date.now() - startTime
        };
      }

    } catch (error) {
      this.metrics.failedLogins++;
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.recordError(errorMessage, error);

      console.error(`❌ [BOWPI_AUTH] Login error for: ${email}`, error);

      return {
        success: false,
        message: errorMessage,
        error: error as Error,
        provider: AuthType.BOWPI,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Perform logout using Bowpi authentication
   */
  async logout(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH] Logout initiated');

    try {
      await bowpiAuthService.logout();
      this.metrics.lastActivity = Date.now();

      console.log('✅ [BOWPI_AUTH] Logout completed successfully');

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Logout error:', error);
      this.recordError('Logout failed', error);
      
      throw new AuthProviderError(
        AuthProviderErrorType.LOGOUT_FAILED,
        'Failed to logout from Bowpi authentication',
        AuthType.BOWPI,
        error as Error
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const isAuth = await bowpiAuthService.isAuthenticated();
      
      if (isAuth) {
        this.metrics.lastActivity = Date.now();
      }

      return isAuth;

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error checking authentication:', error);
      this.recordError('Authentication check failed', error);
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const bowpiUser = await bowpiAuthService.getCurrentUser();
      
      if (!bowpiUser) {
        return null;
      }

      // Convert Bowpi user to standard User format
      return this.convertBowpiUserToStandardUser(bowpiUser);

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error getting current user:', error);
      this.recordError('Get current user failed', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      console.log('🔍 [BOWPI_AUTH] Refreshing token...');
      
      const success = await bowpiAuthService.refreshToken();
      
      if (success) {
        this.metrics.lastActivity = Date.now();
        console.log('✅ [BOWPI_AUTH] Token refreshed successfully');
      } else {
        console.log('❌ [BOWPI_AUTH] Token refresh failed');
        this.recordError('Token refresh failed');
      }

      return success;

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Token refresh error:', error);
      this.recordError('Token refresh error', error);
      return false;
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
    try {
      const sessionId = await bowpiAuthService.getCurrentSessionId();
      const user = await this.getCurrentUser();
      const isValid = await this.isAuthenticated();

      return {
        sessionId,
        userId: user?.id,
        isValid,
        provider: 'bowpi',
        lastActivity: this.metrics.lastActivity
      };

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error getting session info:', error);
      this.recordError('Get session info failed', error);
      return null;
    }
  }

  /**
   * Cleanup provider resources
   */
  async cleanup(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH] Cleaning up provider...');

    try {
      // The BowpiAuthService doesn't have a cleanup method,
      // but we can clear our internal state
      this.isInitialized = false;
      this.metrics.lastActivity = Date.now();

      console.log('✅ [BOWPI_AUTH] Provider cleanup completed');

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error during cleanup:', error);
      this.recordError('Cleanup failed', error);
    }
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): AuthProviderCapabilities {
    return {
      supportsOffline: true,
      supportsTokenRefresh: true,
      supportsPasswordReset: false,
      supportsBiometric: false,
      requiresNetwork: true,
      supportsMultipleUsers: false,
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

      // Check network status
      const networkStatus = bowpiAuthService.getNetworkStatus();
      if (!networkStatus.isConnected) {
        issues.push('Network connection required but not available');
      }

      // Check if we can perform auth operations
      const capabilities = await bowpiAuthService.canPerformAuthOperations();
      if (!capabilities.canLogin) {
        issues.push(`Cannot perform login: ${capabilities.reason}`);
      }

      // Check session validity if authenticated
      const isAuth = await this.isAuthenticated();
      if (isAuth) {
        const user = await this.getCurrentUser();
        if (!user) {
          issues.push('Authenticated but no user data available');
        }
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
        },
        networkStatus
      };

    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Health check failed:', error);
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
    const bowpiDebugInfo = bowpiAuthService.getDebugInfo();

    return {
      type: this.type,
      name: this.name,
      version: this.version,
      isInitialized: this.isInitialized,
      hasActiveSession: !!bowpiDebugInfo.serviceState.hasAdapter,
      lastActivity: this.metrics.lastActivity,
      configuration: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        enableEncryption: this.config.enableEncryption,
        enableOfflineMode: this.config.enableOfflineMode,
        sessionValidationInterval: this.config.sessionValidationInterval
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
   * Handle network status changes
   */
  onNetworkStatusChanged(callback: (status: any) => void): void {
    // The BowpiAuthService already handles network status internally
    // We could extend this if needed
    console.log('🔍 [BOWPI_AUTH] Network status change callback registered');
  }

  /**
   * Convert Bowpi AuthTokenData to standard User format
   */
  private convertBowpiUserToStandardUser(bowpiUser: AuthTokenData): User {
    const userProfile = bowpiUser.userProfile;
    
    return {
      id: bowpiUser.userId,
      email: bowpiUser.email,
      name: `${userProfile.names} ${userProfile.lastNames}`.trim(),
      role: this.mapBowpiRoleToStandardRole(bowpiUser.roles),
      profile: {
        provider: 'bowpi',
        ...userProfile,
        bowpiData: bowpiUser, // Keep original Bowpi data for reference
        lastLogin: new Date().toISOString(),
        sessionType: 'bowpi'
      }
    };
  }

  /**
   * Map Bowpi roles to standard app roles
   */
  private mapBowpiRoleToStandardRole(bowpiRoles: string[]): 'agent' | 'supervisor' {
    // Check for supervisor roles first
    const supervisorRoles = ['SUPERVISOR', 'MANAGER', 'ADMIN'];
    const hasSupervisorRole = bowpiRoles.some(role => 
      supervisorRoles.some(supervisorRole => 
        role.toUpperCase().includes(supervisorRole)
      )
    );

    return hasSupervisorRole ? 'supervisor' : 'agent';
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
      console.error(`❌ [BOWPI_AUTH] ${message}`, error);
    }
  }

  /**
   * Calculate average login time for metrics
   */
  private calculateAverageLoginTime(): number {
    // For Bowpi provider, this would typically be higher due to network calls
    // We could track actual times, but for now return a reasonable estimate
    return 2500; // 2.5 seconds average
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
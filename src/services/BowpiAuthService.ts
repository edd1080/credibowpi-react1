// BOWPI Authentication Service - Main authentication interface wrapper

import NetInfo from '@react-native-community/netinfo';
import { 
  BowpiAuthAdapter,
  AuthTokenData,
  BowpiAuthError,
  BowpiAuthErrorType,
  LoginResult,
  NetworkStatus
} from './bowpi';
import { useAuthStore } from '../stores/authStore';
import LogoutAlertService from './LogoutAlertService';
import NetworkAwareService from './NetworkAwareService';
import { bowpiSecureStorage } from './BowpiSecureStorageService';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';
import { suspiciousActivityMonitor } from './SuspiciousActivityMonitor';
import { bowpiErrorManager } from './BowpiErrorManager';
import { errorRecoveryService } from './ErrorRecoveryService';
import { sessionRecoveryService } from './SessionRecoveryService';

/**
 * Main Bowpi Authentication Service
 * 
 * This service acts as the primary interface for authentication operations,
 * handling network connectivity checks and offline/online authentication flows.
 */
export class BowpiAuthService {
  private authAdapter: BowpiAuthAdapter;
  private networkStatus: NetworkStatus = { isConnected: true };

  constructor() {
    this.authAdapter = new BowpiAuthAdapter();
    // Don't initialize network monitoring in constructor - do it in initialize() method
  }

  /**
   * Initialize network connectivity monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Initialize NetworkAwareService
      this.networkStatus = await NetworkAwareService.initialize();

      console.log('🔍 [BOWPI_AUTH_SERVICE] Network monitoring initialized:', this.networkStatus);

      // Subscribe to network status changes
      NetworkAwareService.addNetworkListener((status) => {
        this.networkStatus = status;
        
        console.log('🔍 [BOWPI_AUTH_SERVICE] Network status updated:', {
          isConnected: status.isConnected,
          type: status.type,
          quality: NetworkAwareService.getNetworkQuality()
        });

        // Update auth store with network status
        const authStore = useAuthStore.getState();
        authStore.setOfflineMode(!status.isConnected);

        // Handle network restoration for pending operations
        if (status.isConnected) {
          this.handleNetworkRestoration();
        }
      });

    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Failed to initialize network monitoring:', error);
      // Fallback to basic network status
      this.networkStatus = { isConnected: true };
    }
  }

  /**
   * Perform login with network connectivity validation
   * 
   * @param email User email
   * @param password User password
   * @returns Login result with success status and user data
   */
  async login(email: string, password: string): Promise<LoginResult> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Login attempt started for:', email);

    try {
      // Validate network connectivity first
      await this.validateNetworkForLogin();

      console.log('🔍 [BOWPI_AUTH_SERVICE] Network validation passed, proceeding with login...');

      // Perform login using Bowpi adapter
      const loginResponse = await this.authAdapter.login(email, password);

      if (loginResponse.success && loginResponse.data) {
        console.log('✅ [BOWPI_AUTH_SERVICE] Login successful');

        // Get decrypted user data
        const userData = await this.authAdapter.getCurrentUser();
        
        if (userData) {
          // Update auth store with Bowpi authentication
          const authStore = useAuthStore.getState();
          authStore.setBowpiAuth(loginResponse.data, userData);
          authStore.setAuthenticated(true);
          authStore.setUser({
            id: userData.userId,
            email: userData.email,
            name: userData.userProfile.names + ' ' + userData.userProfile.lastNames,
            profile: userData.userProfile
          });

          console.log('✅ [BOWPI_AUTH_SERVICE] Auth store updated with user data');

          return {
            success: true,
            message: 'Login successful',
            userData
          };
        } else {
          throw new BowpiAuthError(
            BowpiAuthErrorType.DECRYPTION_ERROR,
            'Failed to decrypt user data from token'
          );
        }
      } else {
        throw new BowpiAuthError(
          BowpiAuthErrorType.INVALID_CREDENTIALS,
          loginResponse.message || 'Invalid credentials'
        );
      }

    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Login failed:', error);

      let authError: BowpiAuthError;

      if (error instanceof BowpiAuthError) {
        authError = error;
      } else {
        authError = new BowpiAuthError(
          BowpiAuthErrorType.SERVER_ERROR,
          'Login failed due to server error',
          error as Error
        );
      }

      return {
        success: false,
        message: authError.message,
        error: authError
      };
    }
  }

  /**
   * Perform logout with network-aware handling
   */
  async logout(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Logout initiated');

    try {
      const authStore = useAuthStore.getState();

      // Check network connectivity
      const isOnline = NetworkAwareService.isOnline();
      console.log('🔍 [BOWPI_AUTH_SERVICE] Network status for logout:', isOnline);

      if (!isOnline) {
        // Handle offline logout with detailed confirmation
        const shouldProceed = await this.handleOfflineLogout();
        if (!shouldProceed) {
          console.log('🔍 [BOWPI_AUTH_SERVICE] User cancelled offline logout');
          return;
        }
        
        // Perform offline-only logout
        await this.performOfflineLogout();
        return;
      }

      // Attempt online logout with retry logic
      await this.performOnlineLogout();

    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Logout error:', error);
      
      // Handle logout failure with user options
      await this.handleLogoutFailure(error);
    }
  }

  /**
   * Handle offline logout with user confirmation
   */
  private async handleOfflineLogout(): Promise<boolean> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Handling offline logout...');
    
    // Show detailed offline logout warning
    return await LogoutAlertService.showDetailedOfflineLogoutWarning();
  }

  /**
   * Perform offline-only logout
   */
  private async performOfflineLogout(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Performing offline logout...');
    
    try {
      // Clear local session data
      await this.authAdapter.clearLocalSession();
      
      // Clear auth store
      const authStore = useAuthStore.getState();
      authStore.clearBowpiAuth();
      authStore.setAuthenticated(false);
      authStore.setUser(null);
      
      console.log('✅ [BOWPI_AUTH_SERVICE] Offline logout completed successfully');
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error during offline logout:', error);
      // Even if local cleanup fails, ensure auth store is cleared
      const authStore = useAuthStore.getState();
      authStore.clearBowpiAuth();
      authStore.setAuthenticated(false);
      authStore.setUser(null);
    }
  }

  /**
   * Perform online logout with server invalidation
   */
  private async performOnlineLogout(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Performing online logout...');
    
    try {
      // Perform logout using Bowpi adapter (includes server invalidation)
      await this.authAdapter.logout();

      // Clear auth store
      const authStore = useAuthStore.getState();
      authStore.clearBowpiAuth();
      authStore.setAuthenticated(false);
      authStore.setUser(null);

      console.log('✅ [BOWPI_AUTH_SERVICE] Online logout completed successfully');
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Online logout failed:', error);
      throw error; // Re-throw to be handled by handleLogoutFailure
    }
  }

  /**
   * Handle logout failure with user options
   */
  private async handleLogoutFailure(error: any): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Handling logout failure...');
    
    // Check if it's a network error
    const isNetworkError = error?.message?.includes('Network') || 
                          error?.message?.includes('timeout') ||
                          !NetworkAwareService.isOnline();
    
    if (isNetworkError) {
      // Show retry options for network errors
      const userChoice = await LogoutAlertService.showLogoutRetryOptions();
      
      switch (userChoice) {
        case 'retry':
          console.log('🔍 [BOWPI_AUTH_SERVICE] User chose to retry logout');
          // Wait for network and retry
          const connected = await this.waitForNetworkConnection(10000);
          if (connected) {
            await this.performOnlineLogout();
          } else {
            // If still no network, offer offline logout
            const offlineConfirm = await LogoutAlertService.showOfflineLogoutConfirmation();
            if (offlineConfirm) {
              await this.performOfflineLogout();
            }
          }
          break;
          
        case 'offline':
          console.log('🔍 [BOWPI_AUTH_SERVICE] User chose offline logout');
          await this.performOfflineLogout();
          break;
          
        case 'cancel':
          console.log('🔍 [BOWPI_AUTH_SERVICE] User cancelled logout');
          return; // Don't logout
      }
    } else {
      // For non-network errors, clear locally and show error
      await this.performOfflineLogout();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      LogoutAlertService.showLogoutError(errorMessage).catch(console.error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      console.log('🔍 [BOWPI_AUTH_SERVICE] Checking authentication status...');
      
      const isAuth = await this.authAdapter.isAuthenticated();
      
      console.log('🔍 [BOWPI_AUTH_SERVICE] Authentication status:', isAuth);
      
      // Update auth store if needed
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated !== isAuth) {
        authStore.setAuthenticated(isAuth);
        
        if (isAuth) {
          // Load user data if authenticated but not in store
          const userData = await this.authAdapter.getCurrentUser();
          if (userData && !authStore.user) {
            authStore.setUser({
              id: userData.userId,
              email: userData.email,
              name: userData.userProfile.names + ' ' + userData.userProfile.lastNames,
              profile: userData.userProfile
            });
          }
        }
      }

      return isAuth;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthTokenData | null> {
    try {
      console.log('🔍 [BOWPI_AUTH_SERVICE] Getting current user...');
      
      const userData = await this.authAdapter.getCurrentUser();
      
      console.log('🔍 [BOWPI_AUTH_SERVICE] Current user:', userData ? {
        userId: userData.userId,
        email: userData.email,
        username: userData.username
      } : null);

      return userData;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get current session ID (requestId)
   */
  async getCurrentSessionId(): Promise<string | null> {
    try {
      return await this.authAdapter.getCurrentSessionId();
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error getting session ID:', error);
      return null;
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<boolean> {
    try {
      console.log('🔍 [BOWPI_AUTH_SERVICE] Attempting token refresh...');
      
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('❌ [BOWPI_AUTH_SERVICE] Cannot refresh token - no network connection');
        return false;
      }

      const success = await this.authAdapter.refreshToken();
      
      console.log('🔍 [BOWPI_AUTH_SERVICE] Token refresh result:', success);
      
      return success;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Validate network connectivity for login operations
   */
  private async validateNetworkForLogin(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Validating network for login...');

    try {
      // Check if network is suitable for authentication
      const networkCheck = await NetworkAwareService.isNetworkSuitableForAuth();
      
      if (!networkCheck.suitable) {
        console.log('❌ [BOWPI_AUTH_SERVICE] Network not suitable for login:', networkCheck.reason);
        
        // Show appropriate user message
        await NetworkAwareService.showOfflineLoginMessage();
        
        throw new BowpiAuthError(
          BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT,
          networkCheck.reason || 'Network connection not suitable for login'
        );
      }

      // Validate network connectivity using NetworkAwareService
      await NetworkAwareService.validateNetworkForLogin();
      
      // Update internal network status
      this.networkStatus = NetworkAwareService.getCurrentNetworkStatus();
      
      console.log('✅ [BOWPI_AUTH_SERVICE] Network validation passed:', {
        quality: NetworkAwareService.getNetworkQuality(),
        status: this.networkStatus
      });

    } catch (error) {
      if (error instanceof BowpiAuthError) {
        throw error;
      }
      
      // Handle network validation errors
      console.log('❌ [BOWPI_AUTH_SERVICE] Network validation failed:', error);
      throw new BowpiAuthError(
        BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT,
        'Login requires internet connection. Please check your network and try again.'
      );
    }
  }

  /**
   * Setup suspicious activity monitoring
   */
  private setupSuspiciousActivityMonitoring(): void {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Setting up suspicious activity monitoring...');

    // Register callback for suspicious activity alerts
    suspiciousActivityMonitor.onSuspiciousActivity(async (event) => {
      console.warn('🚨 [BOWPI_AUTH_SERVICE] Suspicious activity detected:', event);
      
      // Take action based on severity
      switch (event.severity) {
        case 'critical':
          // For critical events, consider forcing logout
          if (event.type === 'multiple_failed_logins' || event.type === 'token_manipulation') {
            console.warn('🚨 [BOWPI_AUTH_SERVICE] Critical security event - considering forced logout');
            // Could implement automatic logout here
          }
          break;
          
        case 'high':
          // For high severity, increase monitoring
          console.warn('⚠️ [BOWPI_AUTH_SERVICE] High severity security event - increasing monitoring');
          break;
          
        default:
          // Log and monitor
          console.log('ℹ️ [BOWPI_AUTH_SERVICE] Security event logged for monitoring');
          break;
      }
    });

    console.log('✅ [BOWPI_AUTH_SERVICE] Suspicious activity monitoring setup completed');
  }

  /**
   * Handle network restoration - perform any pending operations
   */
  private handleNetworkRestoration(): void {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Network restored - checking for pending operations...');

    // Log network restoration
    suspiciousActivityMonitor.recordNetworkEvent(
      'connection_restored',
      NetworkAwareService.getNetworkQuality(),
      { timestamp: Date.now() }
    );

    // Check if we need to refresh authentication status
    this.isAuthenticated().then(isAuth => {
      if (isAuth) {
        console.log('✅ [BOWPI_AUTH_SERVICE] Authentication status confirmed after network restoration');
      }
    }).catch(error => {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error checking auth status after network restoration:', error);
    });

    // Could add other pending operations here like:
    // - Retry failed logout attempts
    // - Sync pending data
    // - Refresh tokens if needed
  }

  /**
   * Check network status for logout operations
   */
  async checkNetworkForLogout(): Promise<{
    canLogoutOnline: boolean;
    requiresOfflineConfirmation: boolean;
    networkQuality: string;
    reason?: string;
  }> {
    try {
      const isOnline = NetworkAwareService.isOnline();
      const quality = NetworkAwareService.getNetworkQuality();
      
      if (!isOnline) {
        return {
          canLogoutOnline: false,
          requiresOfflineConfirmation: true,
          networkQuality: quality,
          reason: 'No network connection available'
        };
      }

      // Check if network is suitable for logout operations
      const networkCheck = await NetworkAwareService.isNetworkSuitableForAuth();
      
      return {
        canLogoutOnline: networkCheck.suitable,
        requiresOfflineConfirmation: !networkCheck.suitable,
        networkQuality: quality,
        reason: networkCheck.reason
      };
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error checking network for logout:', error);
      return {
        canLogoutOnline: false,
        requiresOfflineConfirmation: true,
        networkQuality: 'offline',
        reason: 'Unable to determine network status'
      };
    }
  }

  /**
   * Get debug information about the service state
   */
  getDebugInfo(): {
    networkStatus: NetworkStatus;
    adapterInfo: any;
    serviceState: {
      hasAdapter: boolean;
      networkMonitoringActive: boolean;
    };
  } {
    return {
      networkStatus: this.networkStatus,
      adapterInfo: this.authAdapter.getDebugInfo(),
      serviceState: {
        hasAdapter: !!this.authAdapter,
        networkMonitoringActive: true
      }
    };
  }

  /**
   * Check if user can perform authentication operations based on network status
   */
  async canPerformAuthOperations(): Promise<{
    canLogin: boolean;
    canLogout: boolean;
    canRefreshToken: boolean;
    networkQuality: string;
    reason?: string;
  }> {
    try {
      const networkCheck = await NetworkAwareService.isNetworkSuitableForAuth();
      const isOnline = NetworkAwareService.isOnline();
      const quality = NetworkAwareService.getNetworkQuality();

      return {
        canLogin: networkCheck.suitable,
        canLogout: true, // Logout always possible (offline with confirmation)
        canRefreshToken: isOnline,
        networkQuality: quality,
        reason: networkCheck.reason
      };
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Error checking auth operations capability:', error);
      return {
        canLogin: false,
        canLogout: true,
        canRefreshToken: false,
        networkQuality: 'offline',
        reason: 'Unable to determine network status'
      };
    }
  }

  /**
   * Wait for network connection before performing operation
   */
  async waitForNetworkConnection(timeoutMs: number = 30000): Promise<boolean> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Waiting for network connection...');
    
    const connected = await NetworkAwareService.waitForConnection(timeoutMs);
    
    if (connected) {
      console.log('✅ [BOWPI_AUTH_SERVICE] Network connection established');
      this.networkStatus = NetworkAwareService.getCurrentNetworkStatus();
    } else {
      console.log('⏰ [BOWPI_AUTH_SERVICE] Network connection timeout');
    }
    
    return connected;
  }

  /**
   * Perform automatic session restoration when app starts
   */
  async performSessionRestoration(): Promise<boolean> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Performing session restoration...');

    try {
      // Check if user is authenticated (this will load from storage if needed)
      const isAuth = await this.isAuthenticated();
      
      if (isAuth) {
        console.log('✅ [BOWPI_AUTH_SERVICE] Session restored successfully');
        
        // Validate session if we're online
        if (NetworkAwareService.isOnline()) {
          const userData = await this.getCurrentUser();
          if (userData) {
            // Update auth store with restored session
            const authStore = useAuthStore.getState();
            authStore.setAuthenticated(true);
            authStore.setUser({
              id: userData.userId,
              email: userData.email,
              name: userData.userProfile.names + ' ' + userData.userProfile.lastNames,
              profile: userData.userProfile
            });
            
            console.log('✅ [BOWPI_AUTH_SERVICE] Auth store updated with restored session');
          }
        }
        
        return true;
      } else {
        console.log('🔍 [BOWPI_AUTH_SERVICE] No valid session to restore');
        return false;
      }
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Session restoration failed:', error);
      return false;
    }
  }

  /**
   * Initialize the service (called on app startup)
   */
  async initialize(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_SERVICE] Initializing service...');

    try {
      // Initialize secure storage first
      await bowpiSecureStorage.initialize();
      console.log('✅ [BOWPI_AUTH_SERVICE] Secure storage initialized');

      // Initialize security logging
      await securityLogger.logSecurityEvent(
        SecurityEventType.SERVICE_INITIALIZATION,
        SecurityEventSeverity.INFO,
        'Bowpi authentication service initialization started',
        { component: 'BowpiAuthService' }
      );

      // Initialize auth adapter
      await this.authAdapter.initialize();
      console.log('✅ [BOWPI_AUTH_SERVICE] Auth adapter initialized');

      // Initialize session management
      const { sessionManager } = await import('./SessionManagementService');
      await sessionManager.initialize();

      // Initialize network monitoring
      await this.initializeNetworkMonitoring();

      // Setup suspicious activity monitoring
      this.setupSuspiciousActivityMonitoring();

      // Initialize session recovery service
      await sessionRecoveryService.validateAndRecoverSession();

      // Perform automatic session restoration
      const sessionRestored = await this.performSessionRestoration();
      
      // Log successful initialization
      await securityLogger.logSecurityEvent(
        SecurityEventType.SERVICE_INITIALIZATION,
        SecurityEventSeverity.INFO,
        'Bowpi authentication service initialized successfully',
        {
          sessionRestored,
          networkConnected: this.networkStatus.isConnected,
          networkQuality: NetworkAwareService.getNetworkQuality()
        }
      );
      
      console.log('✅ [BOWPI_AUTH_SERVICE] Service initialized successfully', {
        sessionRestored,
        networkConnected: this.networkStatus.isConnected,
        networkQuality: NetworkAwareService.getNetworkQuality()
      });

    } catch (error) {
      console.error('❌ [BOWPI_AUTH_SERVICE] Service initialization failed:', error);
      
      // Use comprehensive error handling for initialization failures
      await bowpiErrorManager.handleError(error, {
        operation: 'service_initialization',
        component: 'BowpiAuthService'
      }, {
        showUserAlert: true,
        logError: true,
        reportSuspicious: true,
        attemptRecovery: true,
        allowRetry: false,
        maxRetries: 0
      });
      
      throw error;
    }
  }
}

// Export singleton instance
export const bowpiAuthService = new BowpiAuthService();
// Authentication Integration Service - Connects Bowpi auth with existing app structure

import { bowpiAuthService } from './BowpiAuthService';
import { useAuthStore } from '../stores/authStore';
import { 
  BowpiAuthError, 
  BowpiAuthErrorType, 
  LoginResult,
  AuthTokenData 
} from '../types/bowpi';
import AuthErrorHandlingService from './AuthErrorHandlingService';
import AuthRetryService from './AuthRetryService';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';
import { suspiciousActivityMonitor } from './SuspiciousActivityMonitor';
import { bowpiErrorManager } from './BowpiErrorManager';
import { errorRecoveryService } from './ErrorRecoveryService';

/**
 * Service that integrates Bowpi authentication with the existing app structure
 * This service acts as a bridge between the new Bowpi auth system and the existing UI/stores
 */
export class AuthIntegrationService {
  
  /**
   * Perform login using Bowpi authentication system with enhanced error handling
   * This method replaces the existing mock login in the AuthStore
   * 
   * @param email User email
   * @param password User password
   * @returns Promise<void> - throws error if login fails
   */
  static async loginWithBowpi(email: string, password: string): Promise<void> {
    console.log('🔍 [AUTH_INTEGRATION] Starting Bowpi login for:', email);

    const authStore = useAuthStore.getState();
    
    try {
      // Set loading state
      authStore.setLoading(true);
      authStore.clearError();

      // Log login attempt start
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_ATTEMPT,
        SecurityEventSeverity.INFO,
        `Login attempt started for user: ${email}`,
        { email: this.maskEmail(email) }
      );

      // Perform Bowpi login with retry mechanism
      const retryResult = await AuthRetryService.executeLoginWithRetry(async () => {
        return await bowpiAuthService.login(email, password);
      });

      if (retryResult.success && retryResult.result?.success && retryResult.result?.userData) {
        console.log(`✅ [AUTH_INTEGRATION] Bowpi login successful after ${retryResult.attempts} attempts`);

        // Convert Bowpi user data to app User format
        const appUser = this.convertBowpiUserToAppUser(retryResult.result.userData);

        // Update auth store with successful login
        authStore.setUser(appUser);
        authStore.setAuthenticated(true);
        authStore.setLoading(false);
        authStore.clearError();

        // Log successful login
        await suspiciousActivityMonitor.recordLoginAttempt(
          true,
          appUser.id,
          { 
            attempts: retryResult.attempts,
            email: this.maskEmail(email)
          }
        );

        console.log('✅ [AUTH_INTEGRATION] Auth store updated successfully');

      } else {
        console.error('❌ [AUTH_INTEGRATION] Bowpi login failed after retries:', retryResult.error);
        
        // Log failed login
        await suspiciousActivityMonitor.recordLoginAttempt(
          false,
          undefined,
          { 
            attempts: retryResult.attempts,
            email: this.maskEmail(email),
            reason: retryResult.error?.message || 'Unknown error'
          }
        );
        
        // Handle login failure with enhanced error handling
        authStore.setLoading(false);
        authStore.setAuthenticated(false);
        authStore.setUser(null);
        
        // Use enhanced error handling
        const errorHandlingResult = await AuthErrorHandlingService.handleError(
          retryResult.error || new Error('Login failed after retries'),
          {
            showAlert: false, // We'll handle the error message in the UI
            allowRetry: false, // Already retried
            maxRetries: 0
          }
        );
        
        const errorMessage = this.getErrorMessage(retryResult.error);
        authStore.clearError();
        
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Login error:', error);
      
      // Update store with error state
      authStore.setLoading(false);
      authStore.setAuthenticated(false);
      authStore.setUser(null);
      
      // Re-throw error for UI handling
      throw error;
    }
  }

  /**
   * Perform logout using Bowpi authentication system with enhanced error handling
   */
  static async logoutWithBowpi(): Promise<void> {
    console.log('🔍 [AUTH_INTEGRATION] Starting Bowpi logout');

    const authStore = useAuthStore.getState();

    try {
      // Set loading state
      authStore.setLoading(true);

      // Get user info before logout for logging
      const currentUser = authStore.user;
      const sessionId = authStore.sessionId;

      // Perform Bowpi logout with retry mechanism
      const retryResult = await AuthRetryService.executeLogoutWithRetry(async () => {
        await bowpiAuthService.logout();
      });

      // Clear auth store regardless of server logout success
      authStore.setUser(null);
      authStore.setAuthenticated(false);
      authStore.clearBowpiAuth();
      authStore.setLoading(false);
      authStore.clearError();

      // Log logout event
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGOUT,
        SecurityEventSeverity.INFO,
        `User logged out`,
        {
          serverLogoutSuccess: retryResult.success,
          attempts: retryResult.attempts,
          reason: retryResult.success ? 'user_initiated' : 'local_only'
        },
        currentUser?.id,
        sessionId
      );

      if (retryResult.success) {
        console.log(`✅ [AUTH_INTEGRATION] Bowpi logout completed successfully after ${retryResult.attempts} attempts`);
      } else {
        console.log('⚠️ [AUTH_INTEGRATION] Server logout failed, but local logout completed');
        
        // Handle logout error silently - logout should always succeed locally
        await AuthErrorHandlingService.handleError(
          retryResult.error,
          {
            showAlert: false, // Don't show alert for logout errors
            allowRetry: false,
            maxRetries: 0
          }
        );
      }

    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Logout error:', error);
      
      // Even if logout fails, clear local state
      authStore.setUser(null);
      authStore.setAuthenticated(false);
      authStore.clearBowpiAuth();
      authStore.setLoading(false);
      
      // Handle error silently for logout
      await AuthErrorHandlingService.handleError(
        error,
        {
          showAlert: false,
          allowRetry: false,
          maxRetries: 0
        }
      );
      
      console.log('✅ [AUTH_INTEGRATION] Local logout completed despite errors');
    }
  }

  /**
   * Check authentication status using Bowpi system
   */
  static async checkBowpiAuthStatus(): Promise<void> {
    console.log('🔍 [AUTH_INTEGRATION] Checking Bowpi auth status');

    const authStore = useAuthStore.getState();

    try {
      // Check if user is authenticated via Bowpi
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      
      console.log('🔍 [AUTH_INTEGRATION] Bowpi auth status:', isAuthenticated);

      if (isAuthenticated) {
        // Get current user data
        const userData = await bowpiAuthService.getCurrentUser();
        
        if (userData) {
          // Convert and update store
          const appUser = this.convertBowpiUserToAppUser(userData);
          
          authStore.setUser(appUser);
          authStore.setAuthenticated(true);
          
          console.log('✅ [AUTH_INTEGRATION] Auth status updated - user is authenticated');
        } else {
          // Authenticated but no user data - clear auth
          authStore.setUser(null);
          authStore.setAuthenticated(false);
          authStore.clearBowpiAuth();
          
          console.log('⚠️ [AUTH_INTEGRATION] Authenticated but no user data - cleared auth');
        }
      } else {
        // Not authenticated - clear store
        authStore.setUser(null);
        authStore.setAuthenticated(false);
        authStore.clearBowpiAuth();
        
        console.log('🔍 [AUTH_INTEGRATION] User not authenticated');
      }

    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Error checking auth status:', error);
      
      // On error, assume not authenticated
      authStore.setUser(null);
      authStore.setAuthenticated(false);
      authStore.clearBowpiAuth();
    }
  }

  /**
   * Initialize Bowpi authentication system
   */
  static async initializeBowpiAuth(): Promise<void> {
    console.log('🔍 [AUTH_INTEGRATION] Initializing Bowpi authentication');

    try {
      // Initialize the Bowpi auth service
      await bowpiAuthService.initialize();
      
      // Check current auth status
      await this.checkBowpiAuthStatus();
      
      console.log('✅ [AUTH_INTEGRATION] Bowpi authentication initialized successfully');

    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Failed to initialize Bowpi authentication:', error);
      throw error;
    }
  }

  /**
   * Convert Bowpi AuthTokenData to app User format
   */
  private static convertBowpiUserToAppUser(bowpiUser: AuthTokenData): any {
    const userProfile = bowpiUser.userProfile;
    
    return {
      id: bowpiUser.userId,
      email: bowpiUser.email,
      name: `${userProfile.names} ${userProfile.lastNames}`.trim(),
      role: this.mapBowpiRoleToAppRole(bowpiUser.roles),
      profile: {
        ...userProfile,
        bowpiData: bowpiUser // Keep original Bowpi data for reference
      }
    };
  }

  /**
   * Map Bowpi roles to app roles
   */
  private static mapBowpiRoleToAppRole(bowpiRoles: string[]): 'agent' | 'supervisor' {
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
   * Get user-friendly error message from BowpiAuthError
   */
  private static getErrorMessage(error?: BowpiAuthError): string {
    if (!error) {
      return 'Error desconocido durante el login';
    }

    switch (error.type) {
      case BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT:
        return 'Se requiere conexión a internet para iniciar sesión. Por favor verifica tu conexión.';
      
      case BowpiAuthErrorType.INVALID_CREDENTIALS:
        return 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
      
      case BowpiAuthErrorType.NETWORK_ERROR:
        return 'Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.';
      
      case BowpiAuthErrorType.SERVER_ERROR:
        return 'Error del servidor. Por favor intenta nuevamente en unos momentos.';
      
      case BowpiAuthErrorType.DECRYPTION_ERROR:
        return 'Error procesando la respuesta del servidor. Por favor intenta nuevamente.';
      
      case BowpiAuthErrorType.DOMAIN_NOT_ALLOWED:
        return 'Error de configuración del servidor. Contacta al administrador.';
      
      case BowpiAuthErrorType.HTTPS_REQUIRED:
        return 'Conexión segura requerida. Contacta al administrador.';
      
      default:
        return error.message || 'Error durante el login. Por favor intenta nuevamente.';
    }
  }

  /**
   * Get current network status
   */
  static getNetworkStatus() {
    return bowpiAuthService.getNetworkStatus();
  }

  /**
   * Handle authentication error with comprehensive error management
   */
  static async handleAuthError(error: any, operation: 'login' | 'logout' | 'refresh'): Promise<void> {
    console.log(`🔍 [AUTH_INTEGRATION] Handling ${operation} error:`, error);

    try {
      // Use comprehensive error manager
      const result = await bowpiErrorManager.handleError(error, {
        operation,
        component: 'AuthIntegrationService'
      }, {
        showUserAlert: operation === 'login', // Only show alerts for login errors
        logError: true,
        reportSuspicious: operation === 'login', // Report suspicious login attempts
        attemptRecovery: true,
        allowRetry: operation === 'login', // Only allow retry for login
        maxRetries: operation === 'login' ? 2 : 0,
        customMessage: this.getCustomErrorMessage(error, operation)
      });

      console.log(`🔍 [AUTH_INTEGRATION] Comprehensive error handling result for ${operation}:`, result);

      // If recovery failed and it's a critical error, attempt automatic recovery
      if (!result.recovered && result.userAction === 'cancel') {
        console.log(`🔄 [AUTH_INTEGRATION] Attempting automatic recovery for ${operation} error...`);
        const recoveryResults = await errorRecoveryService.attemptRecovery(operation);
        
        if (recoveryResults.some(r => r.success)) {
          console.log(`✅ [AUTH_INTEGRATION] Automatic recovery successful for ${operation}`);
        }
      }

    } catch (handlingError) {
      console.error(`❌ [AUTH_INTEGRATION] Error handling failed for ${operation}:`, handlingError);
      
      // Fallback to legacy error handling
      const errorHandlingResult = await AuthErrorHandlingService.handleError(error, {
        showAlert: operation === 'login',
        allowRetry: operation === 'login',
        maxRetries: operation === 'login' ? 2 : 0,
        customMessage: this.getCustomErrorMessage(error, operation)
      });

      console.log(`🔍 [AUTH_INTEGRATION] Fallback error handling result for ${operation}:`, errorHandlingResult);
    }
  }

  /**
   * Get custom error message based on operation
   */
  private static getCustomErrorMessage(error: any, operation: string): string | undefined {
    const errorInfo = AuthErrorHandlingService.analyzeError(error);
    
    switch (operation) {
      case 'login':
        if (errorInfo.category === 'network') {
          return 'No se pudo conectar al servidor de autenticación. Verifica tu conexión a internet e intenta nuevamente.';
        }
        if (errorInfo.category === 'credentials') {
          return 'Las credenciales ingresadas son incorrectas. Verifica tu email y contraseña.';
        }
        break;
        
      case 'logout':
        return 'Hubo un problema al cerrar sesión en el servidor, pero tu sesión local ha sido cerrada correctamente.';
        
      case 'refresh':
        return 'No se pudo renovar tu sesión. Por favor inicia sesión nuevamente.';
    }
    
    return undefined;
  }

  /**
   * Check if an error requires immediate user attention
   */
  static requiresImmediateAttention(error: any): boolean {
    return AuthErrorHandlingService.requiresImmediateAction(error);
  }

  /**
   * Get recovery recommendations for an error
   */
  static getErrorRecoveryRecommendations(error: any) {
    return AuthErrorHandlingService.getRecoveryRecommendations(error);
  }

  /**
   * Get authentication error statistics
   */
  static getErrorStats() {
    return {
      errorHandling: AuthErrorHandlingService.getErrorStats(),
      retry: AuthRetryService.getRetryStats()
    };
  }

  /**
   * Clean up old error data
   */
  static cleanupErrorData(): void {
    AuthErrorHandlingService.cleanupErrorCounts();
    console.log('✅ [AUTH_INTEGRATION] Error data cleanup completed');
  }

  /**
   * Mask email for logging purposes
   */
  private static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email.substring(0, 2) + '*'.repeat(Math.max(0, email.length - 4)) + email.substring(email.length - 2);
    
    const maskedLocal = local.length > 2 ? 
      local.substring(0, 1) + '*'.repeat(local.length - 2) + local.substring(local.length - 1) :
      '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Get debug information about the authentication system
   */
  static async getDebugInfo() {
    const authStore = useAuthStore.getState();
    const loggingStats = await securityLogger.getLoggingStats();
    const activityStats = suspiciousActivityMonitor.getActivityStats();
    const riskSummary = suspiciousActivityMonitor.getRiskSummary();
    
    return {
      bowpiService: await bowpiAuthService.getDebugInfo(),
      authStore: {
        isAuthenticated: authStore.isAuthenticated,
        hasUser: !!authStore.user,
        hasBowpiToken: !!authStore.bowpiToken,
        isOfflineMode: authStore.isOfflineMode,
        sessionId: authStore.sessionId
      },
      networkStatus: this.getNetworkStatus(),
      errorStats: this.getErrorStats(),
      securityLogging: loggingStats,
      activityMonitoring: {
        stats: activityStats,
        riskSummary
      }
    };
  }

  /**
   * Check if login operations are possible with current network conditions
   */
  static async checkLoginCapabilities(): Promise<{
    canLogin: boolean;
    canLogout: boolean;
    canRefreshToken: boolean;
    networkQuality: string;
    reason?: string;
  }> {
    console.log('🔍 [AUTH_INTEGRATION] Checking login capabilities');

    try {
      const capabilities = await bowpiAuthService.canPerformAuthOperations();
      console.log('🔍 [AUTH_INTEGRATION] Login capabilities:', capabilities);
      return capabilities;
    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Error checking login capabilities:', error);
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
   * Force refresh authentication token with enhanced error handling
   */
  static async refreshToken(): Promise<boolean> {
    console.log('🔍 [AUTH_INTEGRATION] Attempting to refresh token');

    try {
      // Perform token refresh with retry mechanism
      const retryResult = await AuthRetryService.executeTokenRefreshWithRetry(async () => {
        return await bowpiAuthService.refreshToken();
      });

      if (retryResult.success && retryResult.result) {
        // Update auth status after successful refresh
        await this.checkBowpiAuthStatus();
        console.log(`✅ [AUTH_INTEGRATION] Token refreshed successfully after ${retryResult.attempts} attempts`);
        return true;
      } else {
        console.log('❌ [AUTH_INTEGRATION] Token refresh failed after retries');
        
        // Handle refresh error
        await AuthErrorHandlingService.handleError(
          retryResult.error || new Error('Token refresh failed'),
          {
            showAlert: false, // Token refresh failures are usually handled silently
            allowRetry: false,
            maxRetries: 0
          }
        );
        
        return false;
      }

    } catch (error) {
      console.error('❌ [AUTH_INTEGRATION] Token refresh error:', error);
      
      // Handle error
      await AuthErrorHandlingService.handleError(
        error,
        {
          showAlert: false,
          allowRetry: false,
          maxRetries: 0
        }
      );
      
      return false;
    }
  }
}

// Export for easy access
export const authIntegration = AuthIntegrationService;
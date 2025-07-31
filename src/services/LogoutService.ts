// Logout Service - Handles secure logout with network awareness

import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { sessionManager } from './SessionManagementService';
import { secureHttpClient } from './SecureHttpClient';
import { 
  BOWPI_CONSTANTS, 
  BOWPI_ENDPOINTS,
  BowpiAuthError,
  BowpiAuthErrorType 
} from '../types/bowpi';

/**
 * Logout result information
 */
export interface LogoutResult {
  success: boolean;
  serverLogoutAttempted: boolean;
  serverLogoutSuccess?: boolean;
  localLogoutSuccess: boolean;
  message: string;
  error?: Error;
}

/**
 * Service for handling secure logout operations
 * Manages both server-side session invalidation and local data cleanup
 */
export class LogoutService {
  
  /**
   * Perform complete logout with network awareness
   * 
   * @param forceLogout If true, skip user confirmation for offline logout
   * @returns Logout result with detailed information
   */
  static async performLogout(forceLogout: boolean = false): Promise<LogoutResult> {
    console.log('🔍 [LOGOUT_SERVICE] Starting logout process...');

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected ?? false;

      console.log('🔍 [LOGOUT_SERVICE] Network status:', isConnected);

      let serverLogoutAttempted = false;
      let serverLogoutSuccess = false;

      if (isConnected) {
        // Online logout - attempt server invalidation
        console.log('🔍 [LOGOUT_SERVICE] Network available, attempting server logout...');
        
        try {
          await this.performServerLogout();
          serverLogoutAttempted = true;
          serverLogoutSuccess = true;
          console.log('✅ [LOGOUT_SERVICE] Server logout successful');
        } catch (error) {
          console.error('❌ [LOGOUT_SERVICE] Server logout failed:', error);
          serverLogoutAttempted = true;
          serverLogoutSuccess = false;
          // Continue with local logout even if server logout fails
        }
      } else {
        // Offline logout - warn user and get confirmation
        console.log('⚠️ [LOGOUT_SERVICE] No network connection, handling offline logout...');
        
        if (!forceLogout) {
          const shouldProceed = await this.confirmOfflineLogout();
          if (!shouldProceed) {
            console.log('🔍 [LOGOUT_SERVICE] User cancelled offline logout');
            return {
              success: false,
              serverLogoutAttempted: false,
              localLogoutSuccess: false,
              message: 'Logout cancelled by user'
            };
          }
        }
      }

      // Perform local logout (always)
      console.log('🔍 [LOGOUT_SERVICE] Performing local logout...');
      await this.performLocalLogout();

      const result: LogoutResult = {
        success: true,
        serverLogoutAttempted,
        serverLogoutSuccess,
        localLogoutSuccess: true,
        message: isConnected 
          ? 'Logout completed successfully'
          : 'Offline logout completed - you will need internet connection to login again'
      };

      console.log('✅ [LOGOUT_SERVICE] Logout completed:', result);
      return result;

    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Logout process failed:', error);
      
      // Even if logout fails, try to clear local data
      try {
        await this.performLocalLogout();
      } catch (localError) {
        console.error('❌ [LOGOUT_SERVICE] Local logout also failed:', localError);
      }

      return {
        success: false,
        serverLogoutAttempted: false,
        localLogoutSuccess: false,
        message: 'Logout failed but local data may have been cleared',
        error: error as Error
      };
    }
  }

  /**
   * Perform server-side logout (session invalidation)
   */
  private static async performServerLogout(): Promise<void> {
    console.log('🔍 [LOGOUT_SERVICE] Performing server logout...');

    try {
      // Get current session ID
      const sessionId = await sessionManager.getCurrentSessionId();
      
      if (!sessionId) {
        console.log('⚠️ [LOGOUT_SERVICE] No session ID found, skipping server logout');
        return;
      }

      // Build invalidation URL
      const invalidateUrl = `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${BOWPI_ENDPOINTS.INVALIDATE_SESSION}/${sessionId}`;
      
      console.log('🔍 [LOGOUT_SERVICE] Calling session invalidation endpoint...');

      // Get encrypted token for authentication
      const encryptedToken = await sessionManager.getEncryptedToken();
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Add auth token if available
      if (encryptedToken) {
        headers['bowpi-auth-token'] = encryptedToken;
      }

      // Make the invalidation request
      // Note: This is fire-and-forget as per specification
      try {
        const response = await secureHttpClient.get(invalidateUrl, headers);
        console.log('✅ [LOGOUT_SERVICE] Session invalidation response:', response.success);
      } catch (error) {
        console.log('⚠️ [LOGOUT_SERVICE] Session invalidation failed (ignored):', error);
        // Don't throw error - fire-and-forget
      }

    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Server logout error:', error);
      throw new BowpiAuthError(
        BowpiAuthErrorType.SERVER_ERROR,
        'Failed to invalidate server session',
        error as Error
      );
    }
  }

  /**
   * Perform local logout (clear all local data)
   */
  private static async performLocalLogout(): Promise<void> {
    console.log('🔍 [LOGOUT_SERVICE] Performing local logout...');

    try {
      // Clear session data using session manager
      await sessionManager.clearSession();
      
      console.log('✅ [LOGOUT_SERVICE] Local logout completed successfully');

    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Local logout failed:', error);
      throw new BowpiAuthError(
        BowpiAuthErrorType.SERVER_ERROR,
        'Failed to clear local session data',
        error as Error
      );
    }
  }

  /**
   * Show confirmation dialog for offline logout
   * 
   * @returns Promise<boolean> - true if user confirms, false otherwise
   */
  private static async confirmOfflineLogout(): Promise<boolean> {
    console.log('🔍 [LOGOUT_SERVICE] Requesting offline logout confirmation...');

    return new Promise((resolve) => {
      Alert.alert(
        'Cerrar Sesión Sin Conexión',
        'No tienes conexión a internet. Si cierras sesión ahora, necesitarás conexión a internet para volver a iniciar sesión.\n\n¿Estás seguro de que quieres continuar?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              console.log('🔍 [LOGOUT_SERVICE] User cancelled offline logout');
              resolve(false);
            }
          },
          {
            text: 'Cerrar Sesión',
            style: 'destructive',
            onPress: () => {
              console.log('✅ [LOGOUT_SERVICE] User confirmed offline logout');
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Quick logout without confirmation (for emergency situations)
   */
  static async emergencyLogout(): Promise<LogoutResult> {
    console.log('🚨 [LOGOUT_SERVICE] Performing emergency logout...');

    try {
      // Clear local data immediately
      await this.performLocalLogout();

      // Try server logout in background (fire-and-forget)
      this.performServerLogout().catch(error => {
        console.log('⚠️ [LOGOUT_SERVICE] Background server logout failed:', error);
      });

      return {
        success: true,
        serverLogoutAttempted: true,
        serverLogoutSuccess: undefined, // Unknown since it's background
        localLogoutSuccess: true,
        message: 'Emergency logout completed'
      };

    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Emergency logout failed:', error);
      
      return {
        success: false,
        serverLogoutAttempted: false,
        localLogoutSuccess: false,
        message: 'Emergency logout failed',
        error: error as Error
      };
    }
  }

  /**
   * Check if logout is safe (has internet connection)
   */
  static async isLogoutSafe(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Failed to check network status:', error);
      return false;
    }
  }

  /**
   * Get logout safety information
   */
  static async getLogoutInfo(): Promise<{
    hasInternet: boolean;
    hasSession: boolean;
    sessionId?: string;
    canLogoutSafely: boolean;
    warningMessage?: string;
  }> {
    try {
      const [netInfo, sessionStats] = await Promise.all([
        NetInfo.fetch(),
        sessionManager.getSessionStats()
      ]);

      const hasInternet = netInfo.isConnected ?? false;
      const hasSession = sessionStats.hasSession;
      const canLogoutSafely = hasInternet || !hasSession;

      let warningMessage: string | undefined;
      if (!hasInternet && hasSession) {
        warningMessage = 'Sin conexión a internet. Necesitarás conexión para volver a iniciar sesión.';
      }

      return {
        hasInternet,
        hasSession,
        sessionId: sessionStats.sessionId,
        canLogoutSafely,
        warningMessage
      };

    } catch (error) {
      console.error('❌ [LOGOUT_SERVICE] Failed to get logout info:', error);
      
      return {
        hasInternet: false,
        hasSession: false,
        canLogoutSafely: false,
        warningMessage: 'No se pudo verificar el estado de la conexión'
      };
    }
  }
}

// Export for easy access
export const logoutService = LogoutService;
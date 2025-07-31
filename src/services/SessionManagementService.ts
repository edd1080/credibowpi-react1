// Session Management Service - Handles Bowpi session lifecycle

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AuthTokenData, 
  BowpiSessionData, 
  BOWPI_STORAGE_KEYS,
  BowpiAuthError,
  BowpiAuthErrorType
} from '../types/bowpi';

/**
 * Session validation result
 */
export interface SessionValidationResult {
  isValid: boolean;
  isExpired: boolean;
  timeUntilExpiry?: number;
  sessionData?: BowpiSessionData;
  error?: string;
}

/**
 * Service for managing Bowpi authentication sessions
 * Handles session storage, validation, and lifecycle management
 */
export class SessionManagementService {
  
  private static readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static sessionCheckTimer?: NodeJS.Timeout;

  /**
   * Store session data after successful authentication
   * 
   * @param encryptedToken Encrypted JWT token from server
   * @param decryptedTokenData Decrypted token data
   */
  static async storeSession(
    encryptedToken: string, 
    decryptedTokenData: AuthTokenData
  ): Promise<void> {
    console.log('🔍 [SESSION_MGMT] Storing session data...');

    try {
      // Create session data structure
      const sessionData: BowpiSessionData = {
        decryptedToken: decryptedTokenData,
        lastRenewalDate: Date.now(),
        userId: decryptedTokenData.userId,
        userProfile: decryptedTokenData.userProfile,
        sessionId: decryptedTokenData.userProfile?.requestId || decryptedTokenData.userId,
        expirationTime: decryptedTokenData.exp * 1000 // Convert to milliseconds
      };

      // Store all session-related data
      await Promise.all([
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN, encryptedToken),
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData)),
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.SESSION_ID, sessionData.sessionId),
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.USER_PROFILE, JSON.stringify(decryptedTokenData.userProfile))
      ]);

      console.log('✅ [SESSION_MGMT] Session stored successfully:', {
        userId: sessionData.userId,
        sessionId: sessionData.sessionId,
        expirationTime: new Date(sessionData.expirationTime).toISOString()
      });

      // Start session monitoring
      this.startSessionMonitoring();

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to store session:', error);
      throw new BowpiAuthError(
        BowpiAuthErrorType.SERVER_ERROR,
        'Failed to store session data',
        error as Error
      );
    }
  }

  /**
   * Load existing session data from storage
   * 
   * @returns Session data if exists and valid, null otherwise
   */
  static async loadSession(): Promise<BowpiSessionData | null> {
    console.log('🔍 [SESSION_MGMT] Loading session data...');

    try {
      const [encryptedToken, sessionDataJson] = await Promise.all([
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA)
      ]);

      if (!encryptedToken || !sessionDataJson) {
        console.log('🔍 [SESSION_MGMT] No session data found');
        return null;
      }

      const sessionData: BowpiSessionData = JSON.parse(sessionDataJson);

      console.log('✅ [SESSION_MGMT] Session loaded successfully:', {
        userId: sessionData.userId,
        sessionId: sessionData.sessionId,
        hasToken: !!encryptedToken
      });

      return sessionData;

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to load session:', error);
      
      // Clear corrupted session data
      await this.clearSession();
      return null;
    }
  }

  /**
   * Validate current session
   * 
   * @returns Validation result with session status
   */
  static async validateSession(): Promise<SessionValidationResult> {
    console.log('🔍 [SESSION_MGMT] Validating session...');

    try {
      const sessionData = await this.loadSession();

      if (!sessionData) {
        return {
          isValid: false,
          isExpired: false,
          error: 'No session data found'
        };
      }

      const now = Date.now();
      const isExpired = now >= sessionData.expirationTime;
      const timeUntilExpiry = sessionData.expirationTime - now;

      console.log('🔍 [SESSION_MGMT] Session validation result:', {
        isExpired,
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60), // minutes
        sessionId: sessionData.sessionId
      });

      // For offline-first app, we don't expire tokens unless explicitly logged out
      // But we still track expiration for informational purposes
      return {
        isValid: true, // Always valid for offline-first
        isExpired,
        timeUntilExpiry: isExpired ? 0 : timeUntilExpiry,
        sessionData,
        error: isExpired ? 'Token has expired but maintained for offline use' : undefined
      };

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Session validation failed:', error);
      
      return {
        isValid: false,
        isExpired: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Update session with new token data (for token refresh)
   * 
   * @param encryptedToken New encrypted token
   * @param decryptedTokenData New decrypted token data
   */
  static async updateSession(
    encryptedToken: string, 
    decryptedTokenData: AuthTokenData
  ): Promise<void> {
    console.log('🔍 [SESSION_MGMT] Updating session...');

    try {
      // Load existing session data
      const existingSession = await this.loadSession();
      
      if (!existingSession) {
        // No existing session, create new one
        await this.storeSession(encryptedToken, decryptedTokenData);
        return;
      }

      // Update session data with new token info
      const updatedSessionData: BowpiSessionData = {
        ...existingSession,
        decryptedToken: decryptedTokenData,
        lastRenewalDate: Date.now(),
        expirationTime: decryptedTokenData.exp * 1000
      };

      // Store updated data
      await Promise.all([
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN, encryptedToken),
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.SESSION_DATA, JSON.stringify(updatedSessionData))
      ]);

      console.log('✅ [SESSION_MGMT] Session updated successfully');

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to update session:', error);
      throw new BowpiAuthError(
        BowpiAuthErrorType.SERVER_ERROR,
        'Failed to update session data',
        error as Error
      );
    }
  }

  /**
   * Clear all session data
   */
  static async clearSession(): Promise<void> {
    console.log('🔍 [SESSION_MGMT] Clearing session data...');

    try {
      // Stop session monitoring
      this.stopSessionMonitoring();

      // Clear all session-related storage
      await Promise.all([
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.SESSION_DATA),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.SESSION_ID),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.OFFLINE_QUEUE)
      ]);

      console.log('✅ [SESSION_MGMT] Session cleared successfully');

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to clear session:', error);
      
      // Try to clear individual items if batch clear fails
      for (const key of Object.values(BOWPI_STORAGE_KEYS)) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (individualError) {
          console.error(`❌ [SESSION_MGMT] Failed to clear ${key}:`, individualError);
        }
      }
    }
  }

  /**
   * Get current session ID (requestId)
   * 
   * @returns Session ID or null if no session
   */
  static async getCurrentSessionId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_ID);
    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to get session ID:', error);
      return null;
    }
  }

  /**
   * Get encrypted token from storage
   * 
   * @returns Encrypted token or null if not found
   */
  static async getEncryptedToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to get encrypted token:', error);
      return null;
    }
  }

  /**
   * Get user profile from storage
   * 
   * @returns User profile or null if not found
   */
  static async getUserProfile(): Promise<any | null> {
    try {
      const profileJson = await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.USER_PROFILE);
      return profileJson ? JSON.parse(profileJson) : null;
    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Check if session exists (has stored data)
   * 
   * @returns True if session data exists
   */
  static async hasSession(): Promise<boolean> {
    try {
      const encryptedToken = await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
      return !!encryptedToken;
    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to check session existence:', error);
      return false;
    }
  }

  /**
   * Get session statistics and information
   * 
   * @returns Session statistics
   */
  static async getSessionStats(): Promise<{
    hasSession: boolean;
    sessionAge?: number;
    timeUntilExpiry?: number;
    lastRenewal?: number;
    sessionId?: string;
    userId?: string;
  }> {
    try {
      const sessionData = await this.loadSession();
      
      if (!sessionData) {
        return { hasSession: false };
      }

      const now = Date.now();
      const sessionAge = now - (sessionData.lastRenewalDate || 0);
      const timeUntilExpiry = sessionData.expirationTime - now;

      return {
        hasSession: true,
        sessionAge,
        timeUntilExpiry,
        lastRenewal: sessionData.lastRenewalDate,
        sessionId: sessionData.sessionId,
        userId: sessionData.userId
      };

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to get session stats:', error);
      return { hasSession: false };
    }
  }

  /**
   * Start monitoring session for expiration and renewal
   */
  private static startSessionMonitoring(): void {
    // Stop existing monitoring
    this.stopSessionMonitoring();

    console.log('🔍 [SESSION_MGMT] Starting session monitoring...');

    this.sessionCheckTimer = setInterval(async () => {
      try {
        const validation = await this.validateSession();
        
        if (validation.isExpired && validation.sessionData) {
          console.log('⚠️ [SESSION_MGMT] Session expired but maintained for offline use');
          
          // In a real implementation, you might want to:
          // 1. Attempt token refresh if online
          // 2. Show user notification about expired session
          // 3. Log the expiration event
        }

      } catch (error) {
        console.error('❌ [SESSION_MGMT] Session monitoring error:', error);
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  /**
   * Stop session monitoring
   */
  private static stopSessionMonitoring(): void {
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = undefined;
      console.log('🔍 [SESSION_MGMT] Session monitoring stopped');
    }
  }

  /**
   * Initialize session management service
   */
  static async initialize(): Promise<void> {
    console.log('🔍 [SESSION_MGMT] Initializing session management...');

    try {
      // Check if there's an existing session
      const hasSession = await this.hasSession();
      
      if (hasSession) {
        // Start monitoring existing session
        this.startSessionMonitoring();
        console.log('✅ [SESSION_MGMT] Session management initialized with existing session');
      } else {
        console.log('✅ [SESSION_MGMT] Session management initialized without existing session');
      }

    } catch (error) {
      console.error('❌ [SESSION_MGMT] Failed to initialize session management:', error);
      throw error;
    }
  }

  /**
   * Cleanup session management (call on app termination)
   */
  static cleanup(): void {
    console.log('🔍 [SESSION_MGMT] Cleaning up session management...');
    this.stopSessionMonitoring();
  }
}

// Export for easy access
export const sessionManager = SessionManagementService;
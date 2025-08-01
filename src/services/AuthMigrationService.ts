// Authentication Migration Service - Handles migration from legacy auth to Bowpi auth

import { secureStorageService, AuthTokens, UserData } from './secureStorage';
import { bowpiSecureStorage } from './BowpiSecureStorageService';
import { bowpiAuthService } from './BowpiAuthService';
import { useAuthStore } from '../stores/authStore';
import { BOWPI_STORAGE_KEYS } from '../types/bowpi';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';

export interface MigrationResult {
  success: boolean;
  migrated: boolean;
  reason: string;
  legacyDataFound: boolean;
  bowpiDataExists: boolean;
  actions: string[];
  timestamp: number;
}

export interface LegacySessionData {
  tokens: AuthTokens;
  userData: UserData;
  isValid: boolean;
}

/**
 * Service to handle migration from existing authentication system to Bowpi authentication
 */
export class AuthMigrationService {
  
  /**
   * Check if migration is needed by detecting legacy data
   */
  async checkMigrationNeeded(): Promise<{
    needed: boolean;
    hasLegacyData: boolean;
    hasBowpiData: boolean;
    reason: string;
  }> {
    console.log('🔍 [AUTH_MIGRATION] Checking if migration is needed...');

    try {
      // Check for legacy authentication data
      const legacyTokens = await secureStorageService.getAuthTokens();
      const legacyUserData = await secureStorageService.getUserData();
      const hasLegacyData = !!(legacyTokens && legacyUserData);

      // Check for existing Bowpi data
      const bowpiToken = await bowpiSecureStorage.secureRetrieve(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
      const bowpiSessionData = await bowpiSecureStorage.secureRetrieve(BOWPI_STORAGE_KEYS.SESSION_DATA);
      const hasBowpiData = !!(bowpiToken && bowpiSessionData);

      console.log('🔍 [AUTH_MIGRATION] Migration check results:', {
        hasLegacyData,
        hasBowpiData,
        legacyValid: hasLegacyData ? await secureStorageService.isTokenValid() : false
      });

      let needed = false;
      let reason = '';

      if (hasLegacyData && !hasBowpiData) {
        needed = true;
        reason = 'Legacy authentication data found without Bowpi data';
      } else if (hasLegacyData && hasBowpiData) {
        needed = false;
        reason = 'Both legacy and Bowpi data exist - migration already completed';
      } else if (!hasLegacyData && !hasBowpiData) {
        needed = false;
        reason = 'No authentication data found - fresh installation';
      } else {
        needed = false;
        reason = 'Only Bowpi data exists - migration not needed';
      }

      return {
        needed,
        hasLegacyData,
        hasBowpiData,
        reason
      };

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error checking migration status:', error);
      return {
        needed: false,
        hasLegacyData: false,
        hasBowpiData: false,
        reason: `Error checking migration status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load and validate legacy session data
   */
  async loadLegacySessionData(): Promise<LegacySessionData | null> {
    console.log('🔍 [AUTH_MIGRATION] Loading legacy session data...');

    try {
      const tokens = await secureStorageService.getAuthTokens();
      const userData = await secureStorageService.getUserData();

      if (!tokens || !userData) {
        console.log('🔍 [AUTH_MIGRATION] No legacy session data found');
        return null;
      }

      const isValid = await secureStorageService.isTokenValid();

      console.log('🔍 [AUTH_MIGRATION] Legacy session data loaded:', {
        hasTokens: !!tokens,
        hasUserData: !!userData,
        isValid,
        userId: userData.id,
        email: userData.email
      });

      return {
        tokens,
        userData,
        isValid
      };

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error loading legacy session data:', error);
      return null;
    }
  }

  /**
   * Create a mock Bowpi session from legacy data for offline-first compatibility
   * Note: This creates a local-only session that will require re-authentication when online
   */
  async createMockBowpiSession(legacyData: LegacySessionData): Promise<boolean> {
    console.log('🔍 [AUTH_MIGRATION] Creating mock Bowpi session from legacy data...');

    try {
      // Create a mock AuthTokenData structure from legacy data
      const mockBowpiUserData = {
        // JWT standard fields
        iss: 'legacy-migration',
        aud: 'credibowpi-mobile',
        exp: Math.floor(legacyData.tokens.expiresAt / 1000), // Convert to seconds
        iat: Math.floor(Date.now() / 1000),
        sub: legacyData.userData.id,
        jti: `legacy-${legacyData.userData.id}-${Date.now()}`,
        
        // User identification
        userId: legacyData.userData.id,
        username: legacyData.userData.email,
        email: legacyData.userData.email,
        
        // Mock user profile (will need to be updated when user logs in with Bowpi)
        userProfile: {
          username: legacyData.userData.email,
          email: legacyData.userData.email,
          names: legacyData.userData.name.split(' ')[0] || 'Usuario',
          lastNames: legacyData.userData.name.split(' ').slice(1).join(' ') || 'Migrado',
          firstLogin: false,
          state: { id: 1, value: 'ACTIVE' },
          phone: '',
          time: Date.now(),
          duration: 0,
          agency: { id: 1, value: 'MIGRATED' },
          region: { id: 1, value: 'MIGRATED' },
          macroRegion: { id: 1, value: 'MIGRATED' },
          employeePosition: { id: 1, value: legacyData.userData.role.toUpperCase() },
          company: { id: 1, name: 'CrediBowpi', type: 'FINANCIAL' },
          permissions: ['MOBILE_ACCESS'],
          Groups: [legacyData.userData.role.toUpperCase()],
          hasSignature: false,
          officerCode: legacyData.userData.id,
          requestId: `legacy-${legacyData.userData.id}`, // This will be the session ID
          passwordExpirationDate: undefined,
          passwordExpirationDays: undefined
        },
        permissions: ['MOBILE_ACCESS'],
        roles: [legacyData.userData.role.toUpperCase()]
      };

      // Create mock encrypted token (this is just for storage compatibility)
      const mockEncryptedToken = `legacy.${btoa(JSON.stringify({
        userId: legacyData.userData.id,
        email: legacyData.userData.email,
        migrated: true,
        originalExpiry: legacyData.tokens.expiresAt
      }))}.migration`;

      // Store the mock Bowpi session data
      const sessionData = {
        encryptedToken: mockEncryptedToken,
        userData: mockBowpiUserData,
        sessionId: mockBowpiUserData.userProfile.requestId,
        timestamp: Date.now(),
        deviceId: await secureStorageService.getOrCreateDeviceId(),
        migrated: true, // Flag to indicate this is migrated data
        requiresReauth: true // Flag to indicate re-authentication is needed
      };

      // Store using Bowpi secure storage
      await Promise.all([
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN, mockEncryptedToken),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.SESSION_DATA, sessionData),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.SESSION_ID, mockBowpiUserData.userProfile.requestId),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.USER_PROFILE, mockBowpiUserData.userProfile)
      ]);

      // Update auth store with migrated data
      const authStore = useAuthStore.getState();
      authStore.setBowpiAuth(mockEncryptedToken, mockBowpiUserData);
      authStore.setAuthenticated(true);
      authStore.setUser({
        id: mockBowpiUserData.userId,
        email: mockBowpiUserData.email,
        name: mockBowpiUserData.userProfile.names + ' ' + mockBowpiUserData.userProfile.lastNames,
        role: legacyData.userData.role,
        profile: {
          ...mockBowpiUserData.userProfile,
          migrated: true,
          requiresReauth: true
        }
      });

      console.log('✅ [AUTH_MIGRATION] Mock Bowpi session created successfully');

      // Log migration event
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_MIGRATION,
        SecurityEventSeverity.INFO,
        'Legacy session migrated to Bowpi format',
        {
          userId: legacyData.userData.id,
          email: legacyData.userData.email,
          role: legacyData.userData.role,
          wasValid: legacyData.isValid,
          requiresReauth: true
        },
        mockBowpiUserData.userId,
        mockBowpiUserData.userProfile.requestId
      );

      return true;

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error creating mock Bowpi session:', error);
      
      // Log migration failure
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_MIGRATION,
        SecurityEventSeverity.ERROR,
        'Failed to migrate legacy session to Bowpi format',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: legacyData.userData.id
        }
      );

      return false;
    }
  }

  /**
   * Perform complete migration from legacy authentication to Bowpi
   */
  async performMigration(): Promise<MigrationResult> {
    console.log('🔍 [AUTH_MIGRATION] Starting authentication migration...');

    const startTime = Date.now();
    const actions: string[] = [];

    try {
      // Check if migration is needed
      const migrationCheck = await this.checkMigrationNeeded();
      actions.push(`Migration check: ${migrationCheck.reason}`);

      if (!migrationCheck.needed) {
        console.log('🔍 [AUTH_MIGRATION] Migration not needed:', migrationCheck.reason);
        return {
          success: true,
          migrated: false,
          reason: migrationCheck.reason,
          legacyDataFound: migrationCheck.hasLegacyData,
          bowpiDataExists: migrationCheck.hasBowpiData,
          actions,
          timestamp: startTime
        };
      }

      // Load legacy session data
      const legacyData = await this.loadLegacySessionData();
      if (!legacyData) {
        actions.push('No valid legacy data found');
        return {
          success: false,
          migrated: false,
          reason: 'No valid legacy session data found',
          legacyDataFound: false,
          bowpiDataExists: migrationCheck.hasBowpiData,
          actions,
          timestamp: startTime
        };
      }

      actions.push(`Legacy data loaded: ${legacyData.userData.email} (valid: ${legacyData.isValid})`);

      // Create mock Bowpi session
      const sessionCreated = await this.createMockBowpiSession(legacyData);
      if (!sessionCreated) {
        actions.push('Failed to create mock Bowpi session');
        return {
          success: false,
          migrated: false,
          reason: 'Failed to create mock Bowpi session from legacy data',
          legacyDataFound: true,
          bowpiDataExists: migrationCheck.hasBowpiData,
          actions,
          timestamp: startTime
        };
      }

      actions.push('Mock Bowpi session created successfully');

      // Mark legacy data as migrated (but don't delete it yet for safety)
      await this.markLegacyDataAsMigrated();
      actions.push('Legacy data marked as migrated');

      console.log('✅ [AUTH_MIGRATION] Migration completed successfully');

      return {
        success: true,
        migrated: true,
        reason: 'Legacy authentication data successfully migrated to Bowpi format',
        legacyDataFound: true,
        bowpiDataExists: true, // Now it exists after migration
        actions,
        timestamp: startTime
      };

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Migration failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      actions.push(`Migration failed: ${errorMessage}`);

      return {
        success: false,
        migrated: false,
        reason: `Migration failed: ${errorMessage}`,
        legacyDataFound: true,
        bowpiDataExists: false,
        actions,
        timestamp: startTime
      };
    }
  }

  /**
   * Mark legacy data as migrated by adding a migration flag
   */
  private async markLegacyDataAsMigrated(): Promise<void> {
    try {
      // Store a migration marker
      await bowpiSecureStorage.secureStore('legacy_migration_completed', {
        timestamp: Date.now(),
        version: '1.0',
        migrated: true
      });

      console.log('✅ [AUTH_MIGRATION] Legacy data marked as migrated');
    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error marking legacy data as migrated:', error);
      // Don't throw - this is not critical for migration success
    }
  }

  /**
   * Check if legacy data has been migrated
   */
  async isLegacyDataMigrated(): Promise<boolean> {
    try {
      const migrationMarker = await bowpiSecureStorage.secureRetrieve('legacy_migration_completed');
      return !!(migrationMarker && migrationMarker.migrated);
    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Clean up legacy data after successful Bowpi authentication
   * This should only be called after the user has successfully logged in with Bowpi
   */
  async cleanupLegacyData(): Promise<void> {
    console.log('🔍 [AUTH_MIGRATION] Cleaning up legacy authentication data...');

    try {
      // Verify that Bowpi authentication is working
      const isBowpiAuthenticated = await bowpiAuthService.isAuthenticated();
      if (!isBowpiAuthenticated) {
        console.log('⚠️ [AUTH_MIGRATION] Bowpi authentication not confirmed - skipping legacy cleanup');
        return;
      }

      // Clear legacy authentication data
      await secureStorageService.clearAllData();
      
      // Update migration marker
      await bowpiSecureStorage.secureStore('legacy_cleanup_completed', {
        timestamp: Date.now(),
        version: '1.0',
        cleaned: true
      });

      console.log('✅ [AUTH_MIGRATION] Legacy authentication data cleaned up successfully');

      // Log cleanup event
      await securityLogger.logSecurityEvent(
        SecurityEventType.DATA_CLEANUP,
        SecurityEventSeverity.INFO,
        'Legacy authentication data cleaned up after successful Bowpi authentication',
        { timestamp: Date.now() }
      );

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error cleaning up legacy data:', error);
      
      // Log cleanup failure
      await securityLogger.logSecurityEvent(
        SecurityEventType.DATA_CLEANUP,
        SecurityEventSeverity.WARNING,
        'Failed to clean up legacy authentication data',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Check if user needs to re-authenticate with Bowpi
   * This checks if the current session is from migration and requires real Bowpi auth
   */
  async requiresBowpiReauth(): Promise<{
    required: boolean;
    reason: string;
    isMigratedSession: boolean;
  }> {
    try {
      // Check if current session is from migration
      const sessionData = await bowpiSecureStorage.secureRetrieve(BOWPI_STORAGE_KEYS.SESSION_DATA);
      
      if (!sessionData) {
        return {
          required: true,
          reason: 'No session data found',
          isMigratedSession: false
        };
      }

      const isMigrated = sessionData.migrated === true;
      const requiresReauth = sessionData.requiresReauth === true;

      if (isMigrated && requiresReauth) {
        return {
          required: true,
          reason: 'Session was migrated from legacy system and requires Bowpi re-authentication',
          isMigratedSession: true
        };
      }

      // Check if it's a real Bowpi session
      const encryptedToken = await bowpiSecureStorage.secureRetrieve(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN);
      if (encryptedToken && encryptedToken.startsWith('legacy.')) {
        return {
          required: true,
          reason: 'Current session is a legacy migration placeholder',
          isMigratedSession: true
        };
      }

      return {
        required: false,
        reason: 'Valid Bowpi session exists',
        isMigratedSession: false
      };

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error checking reauth requirement:', error);
      return {
        required: true,
        reason: 'Error checking session status',
        isMigratedSession: false
      };
    }
  }

  /**
   * Get migration status and statistics
   */
  async getMigrationStatus(): Promise<{
    migrationCompleted: boolean;
    cleanupCompleted: boolean;
    hasLegacyData: boolean;
    hasBowpiData: boolean;
    requiresReauth: boolean;
    migrationDate?: number;
    cleanupDate?: number;
  }> {
    try {
      const [
        migrationMarker,
        cleanupMarker,
        migrationCheck,
        reauthCheck
      ] = await Promise.all([
        bowpiSecureStorage.secureRetrieve('legacy_migration_completed'),
        bowpiSecureStorage.secureRetrieve('legacy_cleanup_completed'),
        this.checkMigrationNeeded(),
        this.requiresBowpiReauth()
      ]);

      return {
        migrationCompleted: !!(migrationMarker && migrationMarker.migrated),
        cleanupCompleted: !!(cleanupMarker && cleanupMarker.cleaned),
        hasLegacyData: migrationCheck.hasLegacyData,
        hasBowpiData: migrationCheck.hasBowpiData,
        requiresReauth: reauthCheck.required,
        migrationDate: migrationMarker?.timestamp,
        cleanupDate: cleanupMarker?.timestamp
      };

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error getting migration status:', error);
      return {
        migrationCompleted: false,
        cleanupCompleted: false,
        hasLegacyData: false,
        hasBowpiData: false,
        requiresReauth: true
      };
    }
  }

  /**
   * Initialize migration service and perform automatic migration if needed
   * This should be called during app startup
   */
  async initialize(): Promise<MigrationResult | null> {
    console.log('🔍 [AUTH_MIGRATION] Initializing migration service...');

    try {
      // Check if migration is needed
      const migrationCheck = await this.checkMigrationNeeded();
      
      if (migrationCheck.needed) {
        console.log('🔍 [AUTH_MIGRATION] Migration needed - performing automatic migration');
        return await this.performMigration();
      } else {
        console.log('🔍 [AUTH_MIGRATION] No migration needed:', migrationCheck.reason);
        return null;
      }

    } catch (error) {
      console.error('❌ [AUTH_MIGRATION] Error during migration initialization:', error);
      return {
        success: false,
        migrated: false,
        reason: `Migration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        legacyDataFound: false,
        bowpiDataExists: false,
        actions: ['Migration initialization failed'],
        timestamp: Date.now()
      };
    }
  }
}

// Export singleton instance
export const authMigrationService = new AuthMigrationService();
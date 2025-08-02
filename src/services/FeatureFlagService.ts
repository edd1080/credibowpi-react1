// Feature Flag Service - Manages feature flags for gradual Bowpi authentication rollout

import AsyncStorage from '@react-native-async-storage/async-storage';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';

export interface FeatureFlags {
  // Authentication feature flags
  enableBowpiAuth: boolean;
  enableDualAuth: boolean; // Support both legacy and Bowpi during transition
  enableAutoMigration: boolean;
  enableLegacyCleanup: boolean;
  
  // Rollout control
  bowpiAuthRolloutPercentage: number; // 0-100
  forceAllUsersToBowpi: boolean;
  
  // Development and testing
  enableAuthDebugMode: boolean;
  enableMigrationLogs: boolean;
  bypassNetworkChecks: boolean; // For testing
  
  // Safety features
  enableFallbackToLegacy: boolean;
  enableEmergencyDisable: boolean;
}

export interface UserRolloutInfo {
  userId: string;
  email: string;
  isInRollout: boolean;
  rolloutReason: string;
  assignedAt: number;
}

const FEATURE_FLAGS_STORAGE_KEY = 'credibowpi_feature_flags';
const USER_ROLLOUT_STORAGE_KEY = 'credibowpi_user_rollout';

/**
 * Service to manage feature flags for gradual Bowpi authentication rollout
 */
export class FeatureFlagService {
  private flags: FeatureFlags;
  private userRolloutCache: Map<string, UserRolloutInfo> = new Map();
  private initialized = false;

  constructor() {
    // Default feature flags - conservative defaults for production safety
    this.flags = {
      // Authentication flags
      enableBowpiAuth: true, // Bowpi auth is ready
      enableDualAuth: true, // Support both during transition
      enableAutoMigration: true, // Auto-migrate legacy sessions
      enableLegacyCleanup: false, // Don't auto-cleanup until confirmed stable
      
      // Rollout control
      bowpiAuthRolloutPercentage: 100, // Start with 100% since Bowpi is implemented
      forceAllUsersToBowpi: false, // Don't force until fully tested
      
      // Development
      enableAuthDebugMode: __DEV__, // Debug mode only in development
      enableMigrationLogs: true, // Keep migration logs enabled
      bypassNetworkChecks: false, // Don't bypass network checks
      
      // Safety
      enableFallbackToLegacy: true, // Keep fallback enabled for safety
      enableEmergencyDisable: false // Emergency disable off by default
    };
  }

  /**
   * Initialize the feature flag service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔍 [FEATURE_FLAGS] Initializing feature flag service...');

    try {
      // Load flags from storage
      await this.loadFlags();
      
      // Load user rollout data
      await this.loadUserRolloutData();

      this.initialized = true;

      console.log('✅ [FEATURE_FLAGS] Feature flag service initialized', {
        bowpiAuthEnabled: this.flags.enableBowpiAuth,
        dualAuthEnabled: this.flags.enableDualAuth,
        rolloutPercentage: this.flags.bowpiAuthRolloutPercentage
      });

      // Log initialization
      await securityLogger.logSecurityEvent(
        SecurityEventType.SERVICE_INITIALIZATION,
        SecurityEventSeverity.INFO,
        'Feature flag service initialized',
        {
          flags: this.getSafeFlags(), // Don't log sensitive flags
          rolloutPercentage: this.flags.bowpiAuthRolloutPercentage
        }
      );

    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Failed to initialize feature flag service:', error);
      // Continue with default flags if loading fails
      this.initialized = true;
    }
  }

  /**
   * Load feature flags from storage
   */
  private async loadFlags(): Promise<void> {
    try {
      const storedFlags = await AsyncStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
      if (storedFlags) {
        const parsedFlags = JSON.parse(storedFlags);
        // Merge with defaults to ensure all flags exist
        this.flags = { ...this.flags, ...parsedFlags };
        console.log('✅ [FEATURE_FLAGS] Loaded flags from storage');
      }
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error loading flags from storage:', error);
      // Continue with default flags
    }
  }

  /**
   * Save feature flags to storage
   */
  private async saveFlags(): Promise<void> {
    try {
      await AsyncStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(this.flags));
      console.log('✅ [FEATURE_FLAGS] Flags saved to storage');
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error saving flags to storage:', error);
    }
  }

  /**
   * Load user rollout data from storage
   */
  private async loadUserRolloutData(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(USER_ROLLOUT_STORAGE_KEY);
      if (storedData) {
        const rolloutData = JSON.parse(storedData);
        this.userRolloutCache = new Map(Object.entries(rolloutData));
        console.log('✅ [FEATURE_FLAGS] Loaded user rollout data');
      }
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error loading user rollout data:', error);
    }
  }

  /**
   * Save user rollout data to storage
   */
  private async saveUserRolloutData(): Promise<void> {
    try {
      const rolloutData = Object.fromEntries(this.userRolloutCache);
      await AsyncStorage.setItem(USER_ROLLOUT_STORAGE_KEY, JSON.stringify(rolloutData));
      console.log('✅ [FEATURE_FLAGS] User rollout data saved');
    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error saving user rollout data:', error);
    }
  }

  /**
   * Check if Bowpi authentication is enabled
   */
  isBowpiAuthEnabled(): boolean {
    if (!this.initialized) {
      console.warn('⚠️ [FEATURE_FLAGS] Service not initialized, using default');
      return true; // Default to enabled since Bowpi is implemented
    }

    return this.flags.enableBowpiAuth && !this.flags.enableEmergencyDisable;
  }

  /**
   * Check if dual authentication support is enabled
   */
  isDualAuthEnabled(): boolean {
    if (!this.initialized) return true;
    return this.flags.enableDualAuth && !this.flags.enableEmergencyDisable;
  }

  /**
   * Check if auto-migration is enabled
   */
  isAutoMigrationEnabled(): boolean {
    if (!this.initialized) return true;
    return this.flags.enableAutoMigration && !this.flags.enableEmergencyDisable;
  }

  /**
   * Check if legacy cleanup is enabled
   */
  isLegacyCleanupEnabled(): boolean {
    if (!this.initialized) return false; // Conservative default
    return this.flags.enableLegacyCleanup;
  }

  /**
   * Check if a user should use Bowpi authentication based on rollout percentage
   */
  async shouldUserUseBowpi(userId: string, email: string): Promise<{
    shouldUse: boolean;
    reason: string;
    isInRollout: boolean;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check emergency disable first
    if (this.flags.enableEmergencyDisable) {
      return {
        shouldUse: false,
        reason: 'Emergency disable is active',
        isInRollout: false
      };
    }

    // Check if Bowpi auth is enabled
    if (!this.flags.enableBowpiAuth) {
      return {
        shouldUse: false,
        reason: 'Bowpi authentication is disabled',
        isInRollout: false
      };
    }

    // Check if all users are forced to Bowpi
    if (this.flags.forceAllUsersToBowpi) {
      return {
        shouldUse: true,
        reason: 'All users forced to Bowpi authentication',
        isInRollout: true
      };
    }

    // Check if user is already in rollout cache
    const cachedRollout = this.userRolloutCache.get(userId);
    if (cachedRollout) {
      return {
        shouldUse: cachedRollout.isInRollout,
        reason: cachedRollout.rolloutReason,
        isInRollout: cachedRollout.isInRollout
      };
    }

    // Determine rollout based on percentage
    const rolloutResult = this.calculateUserRollout(userId, email);
    
    // Cache the result
    this.userRolloutCache.set(userId, rolloutResult);
    await this.saveUserRolloutData();

    return {
      shouldUse: rolloutResult.isInRollout,
      reason: rolloutResult.rolloutReason,
      isInRollout: rolloutResult.isInRollout
    };
  }

  /**
   * Calculate if user should be in rollout based on percentage
   */
  private calculateUserRollout(userId: string, email: string): UserRolloutInfo {
    // Use a hash of the user ID to get consistent rollout assignment
    const hash = this.simpleHash(userId + email);
    const userPercentile = hash % 100;
    const isInRollout = userPercentile < this.flags.bowpiAuthRolloutPercentage;

    return {
      userId,
      email,
      isInRollout,
      rolloutReason: isInRollout 
        ? `User in ${this.flags.bowpiAuthRolloutPercentage}% rollout (percentile: ${userPercentile})`
        : `User not in ${this.flags.bowpiAuthRolloutPercentage}% rollout (percentile: ${userPercentile})`,
      assignedAt: Date.now()
    };
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if fallback to legacy auth is enabled
   */
  isFallbackToLegacyEnabled(): boolean {
    if (!this.initialized) return true; // Conservative default
    return this.flags.enableFallbackToLegacy;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugModeEnabled(): boolean {
    if (!this.initialized) return __DEV__;
    return this.flags.enableAuthDebugMode;
  }

  /**
   * Check if migration logs are enabled
   */
  areMigrationLogsEnabled(): boolean {
    if (!this.initialized) return true;
    return this.flags.enableMigrationLogs;
  }

  /**
   * Check if network checks should be bypassed (for testing)
   */
  shouldBypassNetworkChecks(): boolean {
    if (!this.initialized) return false;
    return this.flags.bypassNetworkChecks && __DEV__; // Only in development
  }

  /**
   * Update feature flags (admin function)
   */
  async updateFlags(newFlags: Partial<FeatureFlags>): Promise<void> {
    console.log('🔍 [FEATURE_FLAGS] Updating feature flags:', newFlags);

    const oldFlags = { ...this.flags };
    this.flags = { ...this.flags, ...newFlags };

    try {
      await this.saveFlags();

      // Log flag changes
      await securityLogger.logSecurityEvent(
        SecurityEventType.CONFIGURATION_CHANGE,
        SecurityEventSeverity.INFO,
        'Feature flags updated',
        {
          changes: this.getChangedFlags(oldFlags, this.flags),
          updatedAt: Date.now()
        }
      );

      console.log('✅ [FEATURE_FLAGS] Feature flags updated successfully');

    } catch (error) {
      console.error('❌ [FEATURE_FLAGS] Error updating feature flags:', error);
      // Revert changes on error
      this.flags = oldFlags;
      throw error;
    }
  }

  /**
   * Get current feature flags (safe version without sensitive data)
   */
  getSafeFlags(): Partial<FeatureFlags> {
    return {
      enableBowpiAuth: this.flags.enableBowpiAuth,
      enableDualAuth: this.flags.enableDualAuth,
      enableAutoMigration: this.flags.enableAutoMigration,
      bowpiAuthRolloutPercentage: this.flags.bowpiAuthRolloutPercentage,
      enableAuthDebugMode: this.flags.enableAuthDebugMode
    };
  }

  /**
   * Get all feature flags (admin function)
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Emergency disable Bowpi authentication
   */
  async emergencyDisable(reason: string): Promise<void> {
    console.warn('🚨 [FEATURE_FLAGS] Emergency disable activated:', reason);

    await this.updateFlags({
      enableEmergencyDisable: true,
      enableBowpiAuth: false
    });

    // Log emergency disable
    await securityLogger.logSecurityEvent(
      SecurityEventType.EMERGENCY_ACTION,
      SecurityEventSeverity.CRITICAL,
      'Bowpi authentication emergency disabled',
      { reason, timestamp: Date.now() }
    );
  }

  /**
   * Clear emergency disable
   */
  async clearEmergencyDisable(): Promise<void> {
    console.log('🔍 [FEATURE_FLAGS] Clearing emergency disable');

    await this.updateFlags({
      enableEmergencyDisable: false,
      enableBowpiAuth: true
    });

    // Log emergency clear
    await securityLogger.logSecurityEvent(
      SecurityEventType.EMERGENCY_ACTION,
      SecurityEventSeverity.INFO,
      'Bowpi authentication emergency disable cleared',
      { timestamp: Date.now() }
    );
  }

  /**
   * Get rollout statistics
   */
  getRolloutStats(): {
    totalUsers: number;
    usersInRollout: number;
    rolloutPercentage: number;
    actualRolloutPercentage: number;
  } {
    const totalUsers = this.userRolloutCache.size;
    const usersInRollout = Array.from(this.userRolloutCache.values())
      .filter(user => user.isInRollout).length;

    return {
      totalUsers,
      usersInRollout,
      rolloutPercentage: this.flags.bowpiAuthRolloutPercentage,
      actualRolloutPercentage: totalUsers > 0 ? (usersInRollout / totalUsers) * 100 : 0
    };
  }

  /**
   * Force a user into or out of Bowpi rollout
   */
  async setUserRolloutStatus(userId: string, email: string, inRollout: boolean, reason: string): Promise<void> {
    const rolloutInfo: UserRolloutInfo = {
      userId,
      email,
      isInRollout: inRollout,
      rolloutReason: reason,
      assignedAt: Date.now()
    };

    this.userRolloutCache.set(userId, rolloutInfo);
    await this.saveUserRolloutData();

    console.log(`✅ [FEATURE_FLAGS] User ${userId} rollout status set to ${inRollout}: ${reason}`);

    // Log rollout change
    await securityLogger.logSecurityEvent(
      SecurityEventType.USER_ROLLOUT_CHANGE,
      SecurityEventSeverity.INFO,
      `User rollout status changed`,
      {
        userId,
        email: this.maskEmail(email),
        inRollout,
        reason,
        timestamp: Date.now()
      }
    );
  }

  /**
   * Get changed flags between old and new
   */
  private getChangedFlags(oldFlags: FeatureFlags, newFlags: FeatureFlags): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key in newFlags) {
      const typedKey = key as keyof FeatureFlags;
      if (oldFlags[typedKey] !== newFlags[typedKey]) {
        changes[key] = {
          old: oldFlags[typedKey],
          new: newFlags[typedKey]
        };
      }
    }

    return changes;
  }

  /**
   * Mask email for logging
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email.substring(0, 2) + '*'.repeat(Math.max(0, email.length - 4)) + email.substring(email.length - 2);
    
    const maskedLocal = local.length > 2 ? 
      local.substring(0, 1) + '*'.repeat(local.length - 2) + local.substring(local.length - 1) :
      '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Reset all rollout data (admin function)
   */
  async resetRolloutData(): Promise<void> {
    console.log('🔍 [FEATURE_FLAGS] Resetting all rollout data');

    this.userRolloutCache.clear();
    await AsyncStorage.removeItem(USER_ROLLOUT_STORAGE_KEY);

    // Log reset
    await securityLogger.logSecurityEvent(
      SecurityEventType.DATA_CLEANUP,
      SecurityEventSeverity.INFO,
      'User rollout data reset',
      { timestamp: Date.now() }
    );

    console.log('✅ [FEATURE_FLAGS] Rollout data reset completed');
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    initialized: boolean;
    flags: FeatureFlags;
    rolloutStats: ReturnType<typeof this.getRolloutStats>;
    cacheSize: number;
  } {
    return {
      initialized: this.initialized,
      flags: this.flags,
      rolloutStats: this.getRolloutStats(),
      cacheSize: this.userRolloutCache.size
    };
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();
// Session Format Converter - Utilities for converting between legacy and Bowpi session formats

import { AuthTokens, UserData } from './secureStorage';
import { AuthTokenData, BowpiSessionData } from '../types/bowpi';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';

export interface ConversionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings: string[];
  metadata: {
    sourceFormat: string;
    targetFormat: string;
    timestamp: number;
    version: string;
  };
}

export interface LegacySessionFormat {
  tokens: AuthTokens;
  userData: UserData;
  deviceId?: string;
  lastActivity?: number;
}

export interface BowpiSessionFormat {
  encryptedToken: string;
  userData: AuthTokenData;
  sessionId: string;
  timestamp: number;
  deviceId: string;
}

/**
 * Service to convert between different session data formats
 */
export class SessionFormatConverter {

  /**
   * Convert legacy session format to Bowpi session format
   */
  static async convertLegacyToBowpi(
    legacySession: LegacySessionFormat
  ): Promise<ConversionResult<BowpiSessionFormat>> {
    console.log('🔍 [SESSION_CONVERTER] Converting legacy session to Bowpi format');

    const warnings: string[] = [];
    const startTime = Date.now();

    try {
      // Validate legacy session data
      const validation = this.validateLegacySession(legacySession);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid legacy session data: ${validation.errors.join(', ')}`,
          warnings,
          metadata: {
            sourceFormat: 'legacy',
            targetFormat: 'bowpi',
            timestamp: startTime,
            version: '1.0'
          }
        };
      }

      warnings.push(...validation.warnings);

      // Create Bowpi AuthTokenData from legacy data
      const bowpiUserData = this.createBowpiUserDataFromLegacy(legacySession.userData, legacySession.tokens);
      
      // Create mock encrypted token for compatibility
      const mockEncryptedToken = this.createMockEncryptedToken(legacySession);

      // Generate session ID
      const sessionId = `legacy-${legacySession.userData.id}-${Date.now()}`;

      // Create Bowpi session format
      const bowpiSession: BowpiSessionFormat = {
        encryptedToken: mockEncryptedToken,
        userData: bowpiUserData,
        sessionId,
        timestamp: Date.now(),
        deviceId: legacySession.deviceId || await this.generateDeviceId()
      };

      // Log successful conversion
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_CONVERSION,
        SecurityEventSeverity.INFO,
        'Legacy session converted to Bowpi format',
        {
          userId: legacySession.userData.id,
          email: this.maskEmail(legacySession.userData.email),
          sessionId,
          warningCount: warnings.length
        }
      );

      console.log('✅ [SESSION_CONVERTER] Legacy to Bowpi conversion successful');

      return {
        success: true,
        data: bowpiSession,
        warnings,
        metadata: {
          sourceFormat: 'legacy',
          targetFormat: 'bowpi',
          timestamp: startTime,
          version: '1.0'
        }
      };

    } catch (error) {
      console.error('❌ [SESSION_CONVERTER] Error converting legacy to Bowpi:', error);

      // Log conversion error
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_CONVERSION,
        SecurityEventSeverity.ERROR,
        'Failed to convert legacy session to Bowpi format',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: legacySession.userData?.id
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
        warnings,
        metadata: {
          sourceFormat: 'legacy',
          targetFormat: 'bowpi',
          timestamp: startTime,
          version: '1.0'
        }
      };
    }
  }

  /**
   * Convert Bowpi session format to legacy session format (for fallback scenarios)
   */
  static async convertBowpiToLegacy(
    bowpiSession: BowpiSessionFormat
  ): Promise<ConversionResult<LegacySessionFormat>> {
    console.log('🔍 [SESSION_CONVERTER] Converting Bowpi session to legacy format');

    const warnings: string[] = [];
    const startTime = Date.now();

    try {
      // Validate Bowpi session data
      const validation = this.validateBowpiSession(bowpiSession);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid Bowpi session data: ${validation.errors.join(', ')}`,
          warnings,
          metadata: {
            sourceFormat: 'bowpi',
            targetFormat: 'legacy',
            timestamp: startTime,
            version: '1.0'
          }
        };
      }

      warnings.push(...validation.warnings);

      // Extract user data from Bowpi format
      const userData: UserData = {
        id: bowpiSession.userData.userId,
        email: bowpiSession.userData.email,
        name: `${bowpiSession.userData.userProfile.names} ${bowpiSession.userData.userProfile.lastNames}`.trim(),
        role: this.mapBowpiRoleToLegacyRole(bowpiSession.userData.roles)
      };

      // Create legacy tokens (mock tokens since we can't reverse the encryption)
      const tokens: AuthTokens = {
        accessToken: bowpiSession.encryptedToken,
        refreshToken: bowpiSession.encryptedToken, // Use same token
        expiresAt: bowpiSession.userData.exp ? bowpiSession.userData.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000
      };

      warnings.push('Legacy tokens are mock tokens derived from Bowpi session');

      // Create legacy session format
      const legacySession: LegacySessionFormat = {
        tokens,
        userData,
        deviceId: bowpiSession.deviceId,
        lastActivity: bowpiSession.timestamp
      };

      // Log successful conversion
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_CONVERSION,
        SecurityEventSeverity.INFO,
        'Bowpi session converted to legacy format',
        {
          userId: bowpiSession.userData.userId,
          email: this.maskEmail(bowpiSession.userData.email),
          sessionId: bowpiSession.sessionId,
          warningCount: warnings.length
        }
      );

      console.log('✅ [SESSION_CONVERTER] Bowpi to legacy conversion successful');

      return {
        success: true,
        data: legacySession,
        warnings,
        metadata: {
          sourceFormat: 'bowpi',
          targetFormat: 'legacy',
          timestamp: startTime,
          version: '1.0'
        }
      };

    } catch (error) {
      console.error('❌ [SESSION_CONVERTER] Error converting Bowpi to legacy:', error);

      // Log conversion error
      await securityLogger.logSecurityEvent(
        SecurityEventType.SESSION_CONVERSION,
        SecurityEventSeverity.ERROR,
        'Failed to convert Bowpi session to legacy format',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          sessionId: bowpiSession.sessionId
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
        warnings,
        metadata: {
          sourceFormat: 'bowpi',
          targetFormat: 'legacy',
          timestamp: startTime,
          version: '1.0'
        }
      };
    }
  }

  /**
   * Create Bowpi AuthTokenData from legacy user data
   */
  private static createBowpiUserDataFromLegacy(userData: UserData, tokens: AuthTokens): AuthTokenData {
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.floor(tokens.expiresAt / 1000);

    return {
      // JWT standard fields
      iss: 'legacy-migration',
      aud: 'credibowpi-mobile',
      exp,
      iat: now,
      sub: userData.id,
      jti: `legacy-${userData.id}-${now}`,
      
      // User identification
      userId: userData.id,
      username: userData.email,
      email: userData.email,
      
      // User profile (reconstructed from legacy data)
      userProfile: {
        username: userData.email,
        email: userData.email,
        names: userData.name.split(' ')[0] || 'Usuario',
        lastNames: userData.name.split(' ').slice(1).join(' ') || 'Migrado',
        firstLogin: false,
        state: { id: 1, value: 'ACTIVE' },
        phone: '',
        time: Date.now(),
        duration: 0,
        agency: { id: 1, value: 'MIGRATED' },
        region: { id: 1, value: 'MIGRATED' },
        macroRegion: { id: 1, value: 'MIGRATED' },
        employeePosition: { id: 1, value: userData.role.toUpperCase() },
        company: { id: 1, name: 'CrediBowpi', type: 'FINANCIAL' },
        permissions: ['MOBILE_ACCESS'],
        Groups: [userData.role.toUpperCase()],
        hasSignature: false,
        officerCode: userData.id,
        requestId: `legacy-${userData.id}`,
        passwordExpirationDate: undefined,
        passwordExpirationDays: undefined
      },
      permissions: ['MOBILE_ACCESS'],
      roles: [userData.role.toUpperCase()]
    };
  }

  /**
   * Create mock encrypted token for legacy compatibility
   */
  private static createMockEncryptedToken(legacySession: LegacySessionFormat): string {
    const tokenData = {
      userId: legacySession.userData.id,
      email: legacySession.userData.email,
      role: legacySession.userData.role,
      migrated: true,
      originalExpiry: legacySession.tokens.expiresAt,
      timestamp: Date.now()
    };

    return `legacy.${btoa(JSON.stringify(tokenData))}.migration`;
  }

  /**
   * Map Bowpi roles to legacy roles
   */
  private static mapBowpiRoleToLegacyRole(bowpiRoles: string[]): 'agent' | 'supervisor' {
    const supervisorRoles = ['SUPERVISOR', 'MANAGER', 'ADMIN'];
    const hasSupervisorRole = bowpiRoles.some(role => 
      supervisorRoles.some(supervisorRole => 
        role.toUpperCase().includes(supervisorRole)
      )
    );

    return hasSupervisorRole ? 'supervisor' : 'agent';
  }

  /**
   * Validate legacy session data
   */
  private static validateLegacySession(session: LegacySessionFormat): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!session.tokens) {
      errors.push('Missing tokens');
    } else {
      if (!session.tokens.accessToken) errors.push('Missing access token');
      if (!session.tokens.refreshToken) errors.push('Missing refresh token');
      if (!session.tokens.expiresAt) errors.push('Missing token expiration');
      
      // Check token expiration
      if (session.tokens.expiresAt < Date.now()) {
        warnings.push('Legacy tokens are expired');
      }
    }

    if (!session.userData) {
      errors.push('Missing user data');
    } else {
      if (!session.userData.id) errors.push('Missing user ID');
      if (!session.userData.email) errors.push('Missing user email');
      if (!session.userData.name) errors.push('Missing user name');
      if (!session.userData.role) errors.push('Missing user role');
      
      // Validate email format
      if (session.userData.email && !this.isValidEmail(session.userData.email)) {
        errors.push('Invalid email format');
      }
      
      // Validate role
      if (session.userData.role && !['agent', 'supervisor'].includes(session.userData.role)) {
        warnings.push(`Unknown user role: ${session.userData.role}, defaulting to agent`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Bowpi session data
   */
  private static validateBowpiSession(session: BowpiSessionFormat): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!session.encryptedToken) errors.push('Missing encrypted token');
    if (!session.sessionId) errors.push('Missing session ID');
    if (!session.deviceId) errors.push('Missing device ID');
    if (!session.timestamp) errors.push('Missing timestamp');

    if (!session.userData) {
      errors.push('Missing user data');
    } else {
      if (!session.userData.userId) errors.push('Missing user ID');
      if (!session.userData.email) errors.push('Missing user email');
      if (!session.userData.userProfile) errors.push('Missing user profile');
      
      // Check token expiration
      if (session.userData.exp && session.userData.exp < Math.floor(Date.now() / 1000)) {
        warnings.push('Bowpi token is expired');
      }
      
      // Validate email format
      if (session.userData.email && !this.isValidEmail(session.userData.email)) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate device ID
   */
  private static async generateDeviceId(): Promise<string> {
    try {
      const Crypto = require('expo-crypto');
      return Crypto.randomUUID();
    } catch (error) {
      // Fallback to timestamp-based ID
      return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Mask email for logging
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
   * Compare session data to detect differences
   */
  static compareSessionFormats(
    legacySession: LegacySessionFormat,
    bowpiSession: BowpiSessionFormat
  ): {
    matches: boolean;
    differences: string[];
    similarities: string[];
  } {
    const differences: string[] = [];
    const similarities: string[] = [];

    // Compare user IDs
    if (legacySession.userData.id === bowpiSession.userData.userId) {
      similarities.push('User IDs match');
    } else {
      differences.push(`User ID mismatch: ${legacySession.userData.id} vs ${bowpiSession.userData.userId}`);
    }

    // Compare emails
    if (legacySession.userData.email === bowpiSession.userData.email) {
      similarities.push('Emails match');
    } else {
      differences.push(`Email mismatch: ${legacySession.userData.email} vs ${bowpiSession.userData.email}`);
    }

    // Compare names
    const bowpiFullName = `${bowpiSession.userData.userProfile.names} ${bowpiSession.userData.userProfile.lastNames}`.trim();
    if (legacySession.userData.name === bowpiFullName) {
      similarities.push('Names match');
    } else {
      differences.push(`Name mismatch: "${legacySession.userData.name}" vs "${bowpiFullName}"`);
    }

    // Compare roles
    const bowpiRole = this.mapBowpiRoleToLegacyRole(bowpiSession.userData.roles);
    if (legacySession.userData.role === bowpiRole) {
      similarities.push('Roles match');
    } else {
      differences.push(`Role mismatch: ${legacySession.userData.role} vs ${bowpiRole}`);
    }

    // Compare device IDs
    if (legacySession.deviceId === bowpiSession.deviceId) {
      similarities.push('Device IDs match');
    } else {
      differences.push(`Device ID mismatch: ${legacySession.deviceId} vs ${bowpiSession.deviceId}`);
    }

    return {
      matches: differences.length === 0,
      differences,
      similarities
    };
  }

  /**
   * Get conversion statistics
   */
  static getConversionStats(): {
    totalConversions: number;
    successfulConversions: number;
    failedConversions: number;
    lastConversionTime?: number;
  } {
    // This would typically be stored in AsyncStorage or a database
    // For now, return placeholder data
    return {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      lastConversionTime: undefined
    };
  }

  /**
   * Test conversion round-trip (for validation)
   */
  static async testConversionRoundTrip(legacySession: LegacySessionFormat): Promise<{
    success: boolean;
    dataIntegrity: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log('🔍 [SESSION_CONVERTER] Testing conversion round-trip');

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Convert legacy to Bowpi
      const toBowpiResult = await this.convertLegacyToBowpi(legacySession);
      if (!toBowpiResult.success || !toBowpiResult.data) {
        errors.push(`Legacy to Bowpi conversion failed: ${toBowpiResult.error}`);
        return { success: false, dataIntegrity: false, errors, warnings };
      }

      warnings.push(...toBowpiResult.warnings);

      // Convert Bowpi back to legacy
      const toLegacyResult = await this.convertBowpiToLegacy(toBowpiResult.data);
      if (!toLegacyResult.success || !toLegacyResult.data) {
        errors.push(`Bowpi to legacy conversion failed: ${toLegacyResult.error}`);
        return { success: false, dataIntegrity: false, errors, warnings };
      }

      warnings.push(...toLegacyResult.warnings);

      // Compare original and round-trip result
      const comparison = this.compareSessionFormats(legacySession, toBowpiResult.data);
      
      if (!comparison.matches) {
        warnings.push('Data integrity issues detected:');
        warnings.push(...comparison.differences);
      }

      console.log('✅ [SESSION_CONVERTER] Round-trip test completed');

      return {
        success: true,
        dataIntegrity: comparison.matches,
        errors,
        warnings
      };

    } catch (error) {
      console.error('❌ [SESSION_CONVERTER] Round-trip test failed:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        dataIntegrity: false,
        errors,
        warnings
      };
    }
  }
}

// Export for easy access
export const sessionFormatConverter = SessionFormatConverter;
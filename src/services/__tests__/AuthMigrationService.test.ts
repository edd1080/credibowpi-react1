// Tests for AuthMigrationService

import { authMigrationService } from '../AuthMigrationService';
import { secureStorageService } from '../secureStorage';
import { bowpiSecureStorage } from '../BowpiSecureStorageService';
import { BOWPI_STORAGE_KEYS } from '../../types/bowpi';

// Mock dependencies
jest.mock('../secureStorage');
jest.mock('../BowpiSecureStorageService');
jest.mock('../SecurityLoggingService');

const mockSecureStorageService = secureStorageService as jest.Mocked<typeof secureStorageService>;
const mockBowpiSecureStorage = bowpiSecureStorage as jest.Mocked<typeof bowpiSecureStorage>;

describe('AuthMigrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMigrationNeeded', () => {
    it('should return migration needed when legacy data exists without Bowpi data', async () => {
      // Mock legacy data exists
      mockSecureStorageService.getAuthTokens.mockResolvedValue({
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token',
        expiresAt: Date.now() + 3600000
      });
      mockSecureStorageService.getUserData.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent'
      });

      // Mock no Bowpi data
      mockBowpiSecureStorage.secureRetrieve.mockResolvedValue(null);

      const result = await authMigrationService.checkMigrationNeeded();

      expect(result.needed).toBe(true);
      expect(result.hasLegacyData).toBe(true);
      expect(result.hasBowpiData).toBe(false);
      expect(result.reason).toContain('Legacy authentication data found without Bowpi data');
    });

    it('should return migration not needed when both legacy and Bowpi data exist', async () => {
      // Mock legacy data exists
      mockSecureStorageService.getAuthTokens.mockResolvedValue({
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token',
        expiresAt: Date.now() + 3600000
      });
      mockSecureStorageService.getUserData.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent'
      });

      // Mock Bowpi data exists
      mockBowpiSecureStorage.secureRetrieve
        .mockResolvedValueOnce('bowpi-encrypted-token') // ENCRYPTED_TOKEN
        .mockResolvedValueOnce({ sessionId: 'session-123' }); // SESSION_DATA

      const result = await authMigrationService.checkMigrationNeeded();

      expect(result.needed).toBe(false);
      expect(result.hasLegacyData).toBe(true);
      expect(result.hasBowpiData).toBe(true);
      expect(result.reason).toContain('Both legacy and Bowpi data exist');
    });

    it('should return migration not needed when no data exists', async () => {
      // Mock no legacy data
      mockSecureStorageService.getAuthTokens.mockResolvedValue(null);
      mockSecureStorageService.getUserData.mockResolvedValue(null);

      // Mock no Bowpi data
      mockBowpiSecureStorage.secureRetrieve.mockResolvedValue(null);

      const result = await authMigrationService.checkMigrationNeeded();

      expect(result.needed).toBe(false);
      expect(result.hasLegacyData).toBe(false);
      expect(result.hasBowpiData).toBe(false);
      expect(result.reason).toContain('No authentication data found');
    });
  });

  describe('loadLegacySessionData', () => {
    it('should load valid legacy session data', async () => {
      const mockTokens = {
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token',
        expiresAt: Date.now() + 3600000
      };
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent' as const
      };

      mockSecureStorageService.getAuthTokens.mockResolvedValue(mockTokens);
      mockSecureStorageService.getUserData.mockResolvedValue(mockUserData);
      mockSecureStorageService.isTokenValid.mockResolvedValue(true);

      const result = await authMigrationService.loadLegacySessionData();

      expect(result).not.toBeNull();
      expect(result?.tokens).toEqual(mockTokens);
      expect(result?.userData).toEqual(mockUserData);
      expect(result?.isValid).toBe(true);
    });

    it('should return null when no legacy data exists', async () => {
      mockSecureStorageService.getAuthTokens.mockResolvedValue(null);
      mockSecureStorageService.getUserData.mockResolvedValue(null);

      const result = await authMigrationService.loadLegacySessionData();

      expect(result).toBeNull();
    });
  });

  describe('createMockBowpiSession', () => {
    it('should create mock Bowpi session from legacy data', async () => {
      const legacyData = {
        tokens: {
          accessToken: 'legacy-access-token',
          refreshToken: 'legacy-refresh-token',
          expiresAt: Date.now() + 3600000
        },
        userData: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent' as const
        },
        isValid: true
      };

      // Mock device ID generation
      mockSecureStorageService.getOrCreateDeviceId.mockResolvedValue('device-123');

      // Mock successful storage operations
      mockBowpiSecureStorage.secureStore.mockResolvedValue(undefined);

      const result = await authMigrationService.createMockBowpiSession(legacyData);

      expect(result).toBe(true);

      // Verify that Bowpi storage was called with correct keys
      expect(mockBowpiSecureStorage.secureStore).toHaveBeenCalledWith(
        BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN,
        expect.stringContaining('legacy.')
      );
      expect(mockBowpiSecureStorage.secureStore).toHaveBeenCalledWith(
        BOWPI_STORAGE_KEYS.SESSION_DATA,
        expect.objectContaining({
          migrated: true,
          requiresReauth: true
        })
      );
    });

    it('should handle errors during mock session creation', async () => {
      const legacyData = {
        tokens: {
          accessToken: 'legacy-access-token',
          refreshToken: 'legacy-refresh-token',
          expiresAt: Date.now() + 3600000
        },
        userData: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent' as const
        },
        isValid: true
      };

      // Mock storage failure
      mockBowpiSecureStorage.secureStore.mockRejectedValue(new Error('Storage failed'));

      const result = await authMigrationService.createMockBowpiSession(legacyData);

      expect(result).toBe(false);
    });
  });

  describe('performMigration', () => {
    it('should perform complete migration successfully', async () => {
      // Mock migration check - migration needed
      mockSecureStorageService.getAuthTokens.mockResolvedValue({
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token',
        expiresAt: Date.now() + 3600000
      });
      mockSecureStorageService.getUserData.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent'
      });
      mockSecureStorageService.isTokenValid.mockResolvedValue(true);

      // Mock no existing Bowpi data
      mockBowpiSecureStorage.secureRetrieve.mockResolvedValue(null);

      // Mock successful storage operations
      mockBowpiSecureStorage.secureStore.mockResolvedValue(undefined);
      mockSecureStorageService.getOrCreateDeviceId.mockResolvedValue('device-123');

      const result = await authMigrationService.performMigration();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.legacyDataFound).toBe(true);
      expect(result.bowpiDataExists).toBe(true);
      expect(result.actions).toContain('Mock Bowpi session created successfully');
    });

    it('should return success false when migration is not needed', async () => {
      // Mock no legacy data
      mockSecureStorageService.getAuthTokens.mockResolvedValue(null);
      mockSecureStorageService.getUserData.mockResolvedValue(null);
      mockBowpiSecureStorage.secureRetrieve.mockResolvedValue(null);

      const result = await authMigrationService.performMigration();

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(false);
      expect(result.reason).toContain('No authentication data found');
    });
  });

  describe('requiresBowpiReauth', () => {
    it('should return true for migrated sessions', async () => {
      mockBowpiSecureStorage.secureRetrieve
        .mockResolvedValueOnce({
          migrated: true,
          requiresReauth: true
        })
        .mockResolvedValueOnce('legacy.token.migration');

      const result = await authMigrationService.requiresBowpiReauth();

      expect(result.required).toBe(true);
      expect(result.isMigratedSession).toBe(true);
      expect(result.reason).toContain('migrated from legacy system');
    });

    it('should return false for valid Bowpi sessions', async () => {
      mockBowpiSecureStorage.secureRetrieve
        .mockResolvedValueOnce({
          migrated: false,
          requiresReauth: false
        })
        .mockResolvedValueOnce('real.bowpi.token');

      const result = await authMigrationService.requiresBowpiReauth();

      expect(result.required).toBe(false);
      expect(result.isMigratedSession).toBe(false);
      expect(result.reason).toContain('Valid Bowpi session exists');
    });
  });

  describe('getMigrationStatus', () => {
    it('should return comprehensive migration status', async () => {
      // Mock migration completed
      mockBowpiSecureStorage.secureRetrieve
        .mockResolvedValueOnce({ migrated: true, timestamp: Date.now() }) // migration marker
        .mockResolvedValueOnce({ cleaned: true, timestamp: Date.now() }); // cleanup marker

      // Mock migration check
      mockSecureStorageService.getAuthTokens.mockResolvedValue(null);
      mockSecureStorageService.getUserData.mockResolvedValue(null);
      mockBowpiSecureStorage.secureRetrieve.mockResolvedValue('bowpi-data');

      const result = await authMigrationService.getMigrationStatus();

      expect(result.migrationCompleted).toBe(true);
      expect(result.cleanupCompleted).toBe(true);
      expect(result.hasBowpiData).toBe(true);
      expect(result.migrationDate).toBeDefined();
      expect(result.cleanupDate).toBeDefined();
    });
  });
});
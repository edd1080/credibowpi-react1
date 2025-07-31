// Integration Test: Session Persistence and Recovery
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';
import { sessionRecoveryService } from '../../services/SessionRecoveryService';

describe('Session Persistence and Recovery Integration', () => {
  let authService: BowpiAuthService;

  beforeEach(async () => {
    authService = new BowpiAuthService();
    await integrationTestUtils.clearAllStorage();
    useAuthStore.getState().logout();
    
    // Reset network state to online
    integrationTestUtils.setNetworkState({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    });
  });

  describe('Session Persistence', () => {
    it('should persist session data across app restarts', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      });

      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Verify session is active
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Simulate app restart by creating new service instance
      const newAuthService = new BowpiAuthService();
      await newAuthService.initialize();

      // Assert - Session should be restored
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
      expect(authState.user?.email).toBe('test@example.com');
      expect(authState.bowpiToken).toBe('encrypted-jwt-token');
    });

    it('should not restore expired sessions', async () => {
      // Arrange - Create expired session data
      const expiredUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      });

      const expiredSessionData = {
        userData: expiredUserData,
        sessionId: 'expired-session-123',
        timestamp: Date.now() - 7200000, // 2 hours ago
        expiresAt: (Math.floor(Date.now() / 1000) - 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'expired-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', expiredSessionData, true);

      // Act - Initialize service
      await authService.initialize();

      // Assert - Expired session should not be restored
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();

      // Assert - Expired data should be cleaned up
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);
    });

    it('should handle corrupted session data during restoration', async () => {
      // Arrange - Create corrupted session data
      const corruptedSessionData = {
        userData: { invalid: 'structure' },
        sessionId: null,
        timestamp: 'invalid-timestamp',
        expiresAt: 'not-a-number',
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', corruptedSessionData, true);

      // Act - Initialize service
      await authService.initialize();

      // Assert - Should handle corruption gracefully
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();

      // Assert - Corrupted data should be cleaned up
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);
    });

    it('should preserve user profile data correctly', async () => {
      // Arrange - Login with detailed profile
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        userProfile: {
          names: 'Ana María',
          lastNames: 'González Rodríguez',
          documentType: 'CC',
          documentNumber: '12345678',
          phone: '+57 300 123 4567',
          address: 'Carrera 15 #123-45, Apartamento 501, Bogotá D.C.',
        }
      });

      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Simulate app restart
      const newAuthService = new BowpiAuthService();
      await newAuthService.initialize();

      // Assert - Profile data should be preserved
      const authState = useAuthStore.getState();
      expect(authState.user?.name).toBe('Ana María González Rodríguez');

      // Verify detailed profile data
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      
      const profile = storedSession.data.userData.userProfile;
      expect(profile.names).toBe('Ana María');
      expect(profile.lastNames).toBe('González Rodríguez');
      expect(profile.phone).toBe('+57 300 123 4567');
      expect(profile.address).toBe('Carrera 15 #123-45, Apartamento 501, Bogotá D.C.');
    });

    it('should handle session data encryption/decryption', async () => {
      // Arrange - Login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Verify data is encrypted in storage
      const rawStoredData = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(rawStoredData.success).toBe(true);
      expect(rawStoredData.encrypted).toBe(true); // Should be encrypted

      // Simulate app restart and verify decryption works
      const newAuthService = new BowpiAuthService();
      await newAuthService.initialize();

      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });
  });

  describe('Session Recovery', () => {
    it('should recover from missing session data using backup', async () => {
      // Arrange - Create backup session data
      const mockUserData = integrationTestUtils.createMockUserData();
      const backupSessionData = {
        userData: mockUserData,
        sessionId: 'backup-session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      // Set backup data but not main session data
      integrationTestUtils.setStorageData('bowpi_session_data_backup', backupSessionData, true);

      // Act - Initialize service
      await authService.initialize();

      // Wait for recovery process
      await integrationTestUtils.waitFor(500);

      // Assert - Session should be recovered from backup
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');

      // Assert - Main session data should be restored
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
    });

    it('should recover from corrupted session data', async () => {
      // Arrange - Create corrupted main data and valid backup
      const corruptedData = { invalid: 'data' };
      const validBackupData = {
        userData: integrationTestUtils.createMockUserData(),
        sessionId: 'backup-session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_session_data', corruptedData, true);
      integrationTestUtils.setStorageData('bowpi_session_data_backup', validBackupData, true);

      // Act - Initialize service
      await authService.initialize();

      // Wait for recovery process
      await integrationTestUtils.waitFor(500);

      // Assert - Should recover from backup
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should handle token refresh during recovery', async () => {
      // Arrange - Create session with token close to expiry
      const soonToExpireUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      });

      const sessionData = {
        userData: soonToExpireUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 300) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'soon-to-expire-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Mock successful token refresh
      const refreshResponse = integrationTestUtils.createMockBowpiResponse('new-refreshed-token');
      integrationTestUtils.mockServerResponse(refreshResponse);

      const refreshedUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(refreshedUserData);

      // Act - Initialize service
      await authService.initialize();

      // Wait for recovery and refresh process
      await integrationTestUtils.waitFor(1000);

      // Assert - Session should be refreshed
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.bowpiToken).toBe('new-refreshed-token');
    });

    it('should validate session integrity during recovery', async () => {
      // Arrange - Create session with invalid checksum
      const mockUserData = integrationTestUtils.createMockUserData();
      const sessionDataWithInvalidChecksum = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
        checksum: 'invalid-checksum', // This should fail validation
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionDataWithInvalidChecksum, true);

      // Act - Initialize service
      await authService.initialize();

      // Assert - Should reject invalid session
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should handle network errors during recovery', async () => {
      // Arrange - Create session that needs server validation
      const mockUserData = integrationTestUtils.createMockUserData();
      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
        requiresServerValidation: true,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Mock network error during validation
      integrationTestUtils.mockNetworkError('Network unavailable');

      // Act - Initialize service
      await authService.initialize();

      // Assert - Should handle network error gracefully
      const authState = useAuthStore.getState();
      // Should still restore session locally if valid
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });
  });

  describe('Session Recovery Service Integration', () => {
    it('should use session recovery service for automatic recovery', async () => {
      // Arrange - Create session that needs recovery
      const mockUserData = integrationTestUtils.createMockUserData();
      const corruptedSessionData = {
        userData: { corrupted: 'data' },
        sessionId: null,
        timestamp: 'invalid',
      };

      const validBackupData = {
        userData: mockUserData,
        sessionId: 'backup-session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_session_data', corruptedSessionData, true);
      integrationTestUtils.setStorageData('bowpi_session_data_backup', validBackupData, true);

      // Spy on session recovery service
      const recoverySpy = jest.spyOn(sessionRecoveryService, 'validateAndRecoverSession');

      // Act - Initialize service
      await authService.initialize();

      // Wait for recovery process
      await integrationTestUtils.waitFor(500);

      // Assert - Session recovery service should be called
      expect(recoverySpy).toHaveBeenCalled();

      // Assert - Session should be recovered
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });

    it('should handle session recovery service failures', async () => {
      // Arrange - Mock session recovery service to fail
      jest.spyOn(sessionRecoveryService, 'validateAndRecoverSession')
        .mockRejectedValue(new Error('Recovery service failed'));

      const corruptedSessionData = {
        userData: { corrupted: 'data' },
      };

      integrationTestUtils.setStorageData('bowpi_session_data', corruptedSessionData, true);

      // Act - Initialize service
      await authService.initialize();

      // Assert - Should handle recovery failure gracefully
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should provide recovery statistics and history', async () => {
      // Arrange - Create scenario that triggers recovery
      const mockUserData = integrationTestUtils.createMockUserData();
      const backupData = {
        userData: mockUserData,
        sessionId: 'backup-session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_session_data_backup', backupData, true);

      // Act - Initialize service (triggers recovery)
      await authService.initialize();

      // Wait for recovery
      await integrationTestUtils.waitFor(500);

      // Assert - Recovery statistics should be available
      const recoveryStats = sessionRecoveryService.getRecoveryStats();
      expect(recoveryStats.totalAttempts).toBeGreaterThan(0);

      const recoveryHistory = sessionRecoveryService.getRecoveryHistory(5);
      expect(recoveryHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Background Session Validation', () => {
    it('should validate session in background periodically', async () => {
      // Arrange - Login first
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Spy on session validation
      const validationSpy = jest.spyOn(sessionRecoveryService, 'validateAndRecoverSession');

      // Act - Wait for background validation
      await integrationTestUtils.waitFor(1000);

      // Assert - Background validation should occur
      expect(validationSpy).toHaveBeenCalled();
    });

    it('should handle session expiry during background validation', async () => {
      // Arrange - Create session that will expire soon
      const soonToExpireUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 1, // 1 second from now
      });

      const sessionData = {
        userData: soonToExpireUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 1) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      await authService.initialize();

      // Verify session is initially valid
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Wait for session to expire and background validation to run
      await integrationTestUtils.waitFor(2000);

      // Assert - Session should be invalidated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should handle network changes during background validation', async () => {
      // Arrange - Login first
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Simulate going offline
      integrationTestUtils.simulateNetworkChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      });

      // Wait for network change to be processed
      await integrationTestUtils.waitFor(500);

      // Come back online
      integrationTestUtils.simulateNetworkChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      });

      // Mock session validation response
      integrationTestUtils.mockServerResponse(
        integrationTestUtils.createMockBowpiResponse({ valid: true })
      );

      // Wait for network restoration validation
      await integrationTestUtils.waitFor(500);

      // Assert - Session should remain valid
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });
  });

  describe('Data Integrity and Security', () => {
    it('should maintain data integrity across multiple app sessions', async () => {
      // Arrange - Login and create session
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const loginResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(loginResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      await authService.login(credentials);

      // Get initial session data
      const initialSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      const initialChecksum = initialSession.data?.checksum;

      // Simulate multiple app restarts
      for (let i = 0; i < 3; i++) {
        const newAuthService = new BowpiAuthService();
        await newAuthService.initialize();
        
        // Verify session is still valid
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
        
        // Verify data integrity
        const currentSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
        expect(currentSession.data?.userData.userId).toBe('user123');
      }

      // Verify checksum hasn't changed (data integrity maintained)
      const finalSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(finalSession.data?.checksum).toBe(initialChecksum);
    });

    it('should detect and handle data tampering', async () => {
      // Arrange - Create valid session
      const mockUserData = integrationTestUtils.createMockUserData();
      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000,
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Simulate data tampering
      const tamperedData = {
        ...sessionData,
        userData: {
          ...mockUserData,
          userId: 'tampered-user-id', // Tampered data
        }
      };

      integrationTestUtils.setStorageData('bowpi_session_data', tamperedData, true);

      // Act - Initialize service
      await authService.initialize();

      // Assert - Should detect tampering and reject session
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });
});
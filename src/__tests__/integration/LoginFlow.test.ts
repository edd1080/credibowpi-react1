// Integration Test: Complete Login Flow from UI to Storage
import { integrationTestUtils } from './setup';
import { BowpiAuthService } from '../../services/BowpiAuthService';
import { useAuthStore } from '../../stores/authStore';
import { bowpiSecureStorage } from '../../services/BowpiSecureStorageService';

describe('Login Flow Integration', () => {
  let authService: BowpiAuthService;

  beforeEach(async () => {
    authService = new BowpiAuthService();
    await integrationTestUtils.clearAllStorage();
    
    // Reset auth store
    useAuthStore.getState().logout();
  });

  describe('Complete Login Flow', () => {
    it('should complete full login flow from credentials to storage', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock successful server response
      integrationTestUtils.mockServerResponse(mockResponse);

      // Mock token decryption
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert - Login result
      expect(result.success).toBe(true);
      expect(result.userData).toBeDefined();
      expect(result.userData?.userId).toBe('user123');
      expect(result.userData?.email).toBe('test@example.com');

      // Assert - Auth store updated
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBeDefined();
      expect(authState.user?.id).toBe('user123');
      expect(authState.bowpiToken).toBe('encrypted-jwt-token');

      // Assert - Data stored securely
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(true);
      expect(storedToken.data).toBe('encrypted-jwt-token');

      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      expect(storedSession.data).toBeDefined();
      expect(storedSession.data.userData.userId).toBe('user123');
    });

    it('should handle login failure and maintain clean state', async () => {
      // Arrange
      const credentials = {
        username: 'wronguser',
        password: 'wrongpassword'
      };

      // Mock authentication failure
      integrationTestUtils.mockServerError(401, 'Invalid credentials');

      // Act
      const result = await authService.login(credentials);

      // Assert - Login failed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('AUTHENTICATION_FAILED');

      // Assert - Auth store remains clean
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.bowpiToken).toBeUndefined();

      // Assert - No data stored
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);

      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);
    });

    it('should handle token decryption failure gracefully', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockResponse = integrationTestUtils.createMockBowpiResponse('corrupted-token');

      // Mock successful server response but failed decryption
      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockRejectedValue(new Error('Token decryption failed'));

      // Act
      const result = await authService.login(credentials);

      // Assert - Login failed due to token issue
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TOKEN_DECRYPTION_ERROR');

      // Assert - State remains clean
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should validate and store session metadata correctly', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
        iat: Math.floor(Date.now() / 1000),
      });

      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(true);

      // Verify session metadata
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      
      const sessionData = storedSession.data;
      expect(sessionData.timestamp).toBeDefined();
      expect(sessionData.expiresAt).toBe(mockUserData.exp * 1000);
      expect(sessionData.sessionId).toBeDefined();
      expect(sessionData.userData).toEqual(mockUserData);
    });

    it('should handle concurrent login attempts correctly', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      // Mock responses for concurrent requests
      integrationTestUtils.mockServerResponse(mockResponse);
      integrationTestUtils.mockServerResponse(mockResponse);
      integrationTestUtils.mockServerResponse(mockResponse);

      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act - Concurrent login attempts
      const loginPromises = [
        authService.login(credentials),
        authService.login(credentials),
        authService.login(credentials),
      ];

      const results = await Promise.all(loginPromises);

      // Assert - All should succeed or handle gracefully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Assert - Final state should be consistent
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
    });
  });

  describe('Session Restoration on App Start', () => {
    it('should restore session from storage on app initialization', async () => {
      // Arrange - Pre-populate storage with valid session
      const mockUserData = integrationTestUtils.createMockUserData();
      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now(),
        expiresAt: (Math.floor(Date.now() / 1000) + 3600) * 1000, // 1 hour from now
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'stored-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Act - Initialize service (simulates app start)
      await authService.initialize();

      // Assert - Session should be restored
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
      expect(authState.bowpiToken).toBe('stored-token');
    });

    it('should not restore expired session', async () => {
      // Arrange - Pre-populate storage with expired session
      const mockUserData = integrationTestUtils.createMockUserData({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      });

      const sessionData = {
        userData: mockUserData,
        sessionId: 'session-123',
        timestamp: Date.now() - 7200000, // 2 hours ago
        expiresAt: (Math.floor(Date.now() / 1000) - 3600) * 1000, // 1 hour ago
      };

      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'expired-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', sessionData, true);

      // Act
      await authService.initialize();

      // Assert - Session should not be restored
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });

    it('should handle corrupted session data gracefully', async () => {
      // Arrange - Pre-populate storage with corrupted data
      integrationTestUtils.setStorageData('bowpi_encrypted_token', 'corrupted-token', true);
      integrationTestUtils.setStorageData('bowpi_session_data', 'invalid-json-data', true);

      // Act
      await authService.initialize();

      // Assert - Should handle gracefully without crashing
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });

  describe('Data Persistence and Retrieval', () => {
    it('should persist user profile data correctly', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        userProfile: {
          names: 'María José',
          lastNames: 'García López',
          documentType: 'CC',
          documentNumber: '87654321',
          phone: '3001234567',
          address: 'Calle 123 #45-67, Bogotá',
        }
      });

      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(true);

      // Verify profile data in auth store
      const authState = useAuthStore.getState();
      expect(authState.user?.name).toBe('María José García López');

      // Verify profile data in storage
      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(true);
      
      const profile = storedSession.data.userData.userProfile;
      expect(profile.names).toBe('María José');
      expect(profile.lastNames).toBe('García López');
      expect(profile.documentNumber).toBe('87654321');
    });

    it('should handle special characters in user data', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData({
        username: 'user_with_special_chars_123',
        email: 'test+user@example.com',
        userProfile: {
          names: 'José María',
          lastNames: 'Rodríguez-Pérez',
          address: 'Calle 123 #45-67, Apartamento 8B',
        }
      });

      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.success).toBe(true);

      // Verify special characters are preserved
      const authState = useAuthStore.getState();
      expect(authState.user?.email).toBe('test+user@example.com');
      expect(authState.user?.name).toBe('José María Rodríguez-Pérez');
    });

    it('should maintain data integrity across app restarts', async () => {
      // Arrange - First login
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Act - Login and store data
      await authService.login(credentials);

      // Simulate app restart by creating new service instance
      const newAuthService = new BowpiAuthService();
      await newAuthService.initialize();

      // Assert - Data should be restored correctly
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user?.id).toBe('user123');
      expect(authState.user?.email).toBe('test@example.com');
      expect(authState.bowpiToken).toBe('encrypted-jwt-token');
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should clean up partial data on login failure', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      // Mock server success but token decryption failure
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');
      integrationTestUtils.mockServerResponse(mockResponse);
      
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockRejectedValue(new Error('Decryption failed'));

      // Act
      const result = await authService.login(credentials);

      // Assert - Login failed
      expect(result.success).toBe(false);

      // Assert - No partial data left in storage
      const storedToken = await bowpiSecureStorage.secureRetrieve('bowpi_encrypted_token');
      expect(storedToken.success).toBe(false);

      const storedSession = await bowpiSecureStorage.secureRetrieve('bowpi_session_data');
      expect(storedSession.success).toBe(false);

      // Assert - Auth store is clean
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.error).toBeDefined();
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      const credentials = {
        username: 'testuser',
        password: 'testpassword'
      };

      const mockUserData = integrationTestUtils.createMockUserData();
      const mockResponse = integrationTestUtils.createMockBowpiResponse('encrypted-jwt-token');

      integrationTestUtils.mockServerResponse(mockResponse);
      jest.spyOn(authService['authAdapter']['cryptoService'], 'decryptToken')
        .mockResolvedValue(mockUserData);

      // Mock storage failure
      jest.spyOn(bowpiSecureStorage, 'secureStore')
        .mockRejectedValue(new Error('Storage unavailable'));

      // Act
      const result = await authService.login(credentials);

      // Assert - Should handle storage error gracefully
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('STORAGE_ERROR');

      // Auth state should remain clean
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });
  });
});
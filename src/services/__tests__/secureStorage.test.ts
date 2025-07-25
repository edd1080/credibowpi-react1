import { secureStorageService, AuthTokens, UserData } from '../secureStorage';

// Mock expo-secure-store
const mockSecureStore = {
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
}));

describe('SecureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token management', () => {
    const mockTokens: AuthTokens = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: Date.now() + 3600000, // 1 hour from now
    };

    it('should store auth tokens', async () => {
      await expect(
        secureStorageService.storeAuthTokens(mockTokens)
      ).resolves.not.toThrow();

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'credibowpi_access_token',
        mockTokens.accessToken
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'credibowpi_refresh_token',
        mockTokens.refreshToken
      );
    });

    it('should retrieve auth tokens', async () => {
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken)
        .mockResolvedValueOnce(mockTokens.expiresAt.toString());

      const tokens = await secureStorageService.getAuthTokens();

      expect(tokens).toEqual(mockTokens);
    });

    it('should return null when tokens are missing', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const tokens = await secureStorageService.getAuthTokens();
      expect(tokens).toBeNull();
    });

    it('should clear auth tokens', async () => {
      await expect(
        secureStorageService.clearAuthTokens()
      ).resolves.not.toThrow();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'credibowpi_access_token'
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'credibowpi_refresh_token'
      );
    });

    it('should validate token expiration', async () => {
      // Mock expired token
      const expiredTokens = {
        ...mockTokens,
        expiresAt: Date.now() - 3600000, // 1 hour ago
      };

      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(expiredTokens.accessToken)
        .mockResolvedValueOnce(expiredTokens.refreshToken)
        .mockResolvedValueOnce(expiredTokens.expiresAt.toString());

      const isValid = await secureStorageService.isTokenValid();
      expect(isValid).toBe(false);
    });
  });

  describe('user data management', () => {
    const mockUserData: UserData = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'agent',
    };

    it('should store user data', async () => {
      await expect(
        secureStorageService.storeUserData(mockUserData)
      ).resolves.not.toThrow();

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'credibowpi_user_data',
        JSON.stringify(mockUserData)
      );
    });

    it('should retrieve user data', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(
        JSON.stringify(mockUserData)
      );

      const userData = await secureStorageService.getUserData();
      expect(userData).toEqual(mockUserData);
    });

    it('should return null when user data is missing', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const userData = await secureStorageService.getUserData();
      expect(userData).toBeNull();
    });
  });

  describe('encryption key management', () => {
    it('should create encryption key if not exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const key = await secureStorageService.getOrCreateEncryptionKey();

      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'credibowpi_encryption_key',
        expect.any(String)
      );
    });

    it('should return existing encryption key', async () => {
      const existingKey = 'existing-encryption-key';
      mockSecureStore.getItemAsync.mockResolvedValue(existingKey);

      const key = await secureStorageService.getOrCreateEncryptionKey();

      expect(key).toBe(existingKey);
      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('session validation', () => {
    it('should validate complete session', async () => {
      const validTokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      const userData: UserData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent',
      };

      mockSecureStore.getItemAsync.mockImplementation((key: string) => {
        switch (key) {
          case 'credibowpi_access_token':
            return Promise.resolve(validTokens.accessToken);
          case 'credibowpi_refresh_token':
            return Promise.resolve(validTokens.refreshToken);
          case 'token_expires_at':
            return Promise.resolve(validTokens.expiresAt.toString());
          case 'credibowpi_user_data':
            return Promise.resolve(JSON.stringify(userData));
          default:
            return Promise.resolve(null);
        }
      });

      const hasValidSession = await secureStorageService.hasValidSession();
      expect(hasValidSession).toBe(true);
    });

    it('should invalidate session with missing data', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const hasValidSession = await secureStorageService.hasValidSession();
      expect(hasValidSession).toBe(false);
    });
  });
});

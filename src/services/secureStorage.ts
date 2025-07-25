import * as SecureStore from 'expo-secure-store';

// Secure storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'credibowpi_access_token',
  REFRESH_TOKEN: 'credibowpi_refresh_token',
  USER_DATA: 'credibowpi_user_data',
  ENCRYPTION_KEY: 'credibowpi_encryption_key',
  DEVICE_ID: 'credibowpi_device_id',
} as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'supervisor';
}

export class SecureStorageService {
  // Token management
  async storeAuthTokens(tokens: AuthTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.ACCESS_TOKEN,
        tokens.accessToken
      );
      await SecureStore.setItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN,
        tokens.refreshToken
      );
      await SecureStore.setItemAsync(
        'token_expires_at',
        tokens.expiresAt.toString()
      );
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.ACCESS_TOKEN
      );
      const refreshToken = await SecureStore.getItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN
      );
      const expiresAtStr = await SecureStore.getItemAsync('token_expires_at');

      if (!accessToken || !refreshToken || !expiresAtStr) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAtStr, 10),
      };
    } catch (error) {
      console.error('Failed to retrieve auth tokens:', error);
      return null;
    }
  }

  async clearAuthTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync('token_expires_at');
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
      throw new Error('Failed to clear authentication tokens');
    }
  }

  async isTokenValid(): Promise<boolean> {
    try {
      const tokens = await this.getAuthTokens();
      if (!tokens) return false;

      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      return tokens.expiresAt > now + bufferTime;
    } catch (error) {
      console.error('Failed to check token validity:', error);
      return false;
    }
  }

  // User data management
  async storeUserData(userData: UserData): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  async getUserData(): Promise<UserData | null> {
    try {
      const userDataStr = await SecureStore.getItemAsync(
        STORAGE_KEYS.USER_DATA
      );
      if (!userDataStr) return null;

      return JSON.parse(userDataStr);
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  async clearUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw new Error('Failed to clear user data');
    }
  }

  // Encryption key management
  async getOrCreateEncryptionKey(): Promise<string> {
    try {
      let encryptionKey = await SecureStore.getItemAsync(
        STORAGE_KEYS.ENCRYPTION_KEY
      );

      if (!encryptionKey) {
        // Generate a new encryption key
        const Crypto = require('expo-crypto');
        encryptionKey = Crypto.randomUUID() + Crypto.randomUUID();
        await SecureStore.setItemAsync(
          STORAGE_KEYS.ENCRYPTION_KEY,
          encryptionKey
        );
        return encryptionKey;
      }

      return encryptionKey;
    } catch (error) {
      console.error('Failed to get or create encryption key:', error);
      throw new Error('Failed to manage encryption key');
    }
  }

  // Device ID management
  async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);

      if (!deviceId) {
        const Crypto = require('expo-crypto');
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId);
        return deviceId;
      }

      return deviceId;
    } catch (error) {
      console.error('Failed to get or create device ID:', error);
      throw new Error('Failed to manage device ID');
    }
  }

  // Complete logout - clear all secure data
  async clearAllData(): Promise<void> {
    try {
      await this.clearAuthTokens();
      await this.clearUserData();
      // Note: We don't clear encryption key and device ID as they should persist
    } catch (error) {
      console.error('Failed to clear all secure data:', error);
      throw new Error('Failed to clear secure data');
    }
  }

  // Utility methods
  async hasValidSession(): Promise<boolean> {
    try {
      const tokens = await this.getAuthTokens();
      const userData = await this.getUserData();
      const isTokenValid = await this.isTokenValid();

      return !!(tokens && userData && isTokenValid);
    } catch (error) {
      console.error('Failed to check session validity:', error);
      return false;
    }
  }

  // For debugging - check what's stored (remove in production)
  async getStorageInfo(): Promise<Record<string, boolean>> {
    const info: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(STORAGE_KEYS)) {
      try {
        const item = await SecureStore.getItemAsync(value);
        info[key] = !!item;
      } catch {
        info[key] = false;
      }
    }

    return info;
  }
}

// Singleton instance
export const secureStorageService = new SecureStorageService();

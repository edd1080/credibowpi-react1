import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorageService, AuthTokens } from '../services/secureStorage';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'agent' | 'supervisor';
  profile?: any; // For Bowpi user profile data
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Bowpi specific state
  bowpiToken?: string;
  bowpiUserData?: any;
  sessionId?: string;
  isOfflineMode: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuthStatus: () => Promise<void>;
  // Bowpi specific actions
  setBowpiAuth: (token: string, userData: any) => void;
  clearBowpiAuth: () => void;
  setOfflineMode: (offline: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setUser: (user: User | null) => void;
}

export type AuthStore = AuthState & AuthActions;

// SecureStore adapter for Zustand persistence
const secureStorage = {
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const tokens = await secureStorageService.getAuthTokens();
      const userData = await secureStorageService.getUserData();

      if (tokens && userData) {
        return JSON.stringify({
          user: userData,
          token: tokens.accessToken,
          isAuthenticated: true,
        });
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const data = JSON.parse(value);
      if (data.user && data.token) {
        const tokens: AuthTokens = {
          accessToken: data.token,
          refreshToken: data.token, // For now, using same token
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        };

        await secureStorageService.storeAuthTokens(tokens);
        await secureStorageService.storeUserData(data.user);
      }
    } catch (error) {
      console.error('Failed to save to SecureStore:', error);
    }
  },
  removeItem: async (_name: string): Promise<void> => {
    try {
      await secureStorageService.clearAllData();
    } catch (error) {
      console.error('Failed to remove from SecureStore:', error);
    }
  },
};

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  bowpiToken: '',
  bowpiUserData: undefined,
  sessionId: '',
  isOfflineMode: false,
};

// Import auth store manager to break circular dependencies
import { authStoreManager } from '../services/AuthStoreManager';
import { AuthStoreInterface } from '../types/auth-shared';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      const store: AuthStore = {
        ...initialState,

        login: async (email: string, password: string) => {
          // Import here to avoid circular dependency
          const { authIntegration } = await import('../services/AuthIntegrationService');
          
          try {
            await authIntegration.loginWithBowpi(email, password);
          } catch (error) {
            // Set error in store
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Error al iniciar sesión',
            });
            throw error;
          }
        },

        logout: async () => {
          // Import here to avoid circular dependency
          const { authIntegration } = await import('../services/AuthIntegrationService');
          await authIntegration.logoutWithBowpi();
        },

        clearError: () => set({ error: null }),

        setLoading: (loading: boolean) => set({ isLoading: loading }),

        checkAuthStatus: async () => {
          // Import here to avoid circular dependency
          const { authIntegration } = await import('../services/AuthIntegrationService');
          await authIntegration.checkBowpiAuthStatus();
        },

        // Bowpi specific actions
        setBowpiAuth: (token: string, userData: any) => {
          set({
            bowpiToken: token,
            bowpiUserData: userData,
            sessionId: userData.userProfile?.requestId || userData.userId,
          });
        },

        clearBowpiAuth: () => {
          set({
            bowpiToken: '',
            bowpiUserData: undefined,
            sessionId: '',
          });
        },

        setOfflineMode: (offline: boolean) => {
          set({ isOfflineMode: offline });
        },

        setAuthenticated: (authenticated: boolean) => {
          set({ isAuthenticated: authenticated });
        },

        setUser: (user: User | null) => {
          set({ user });
        },
      };

      // Initialize the auth store manager with this store instance
      // This allows services to interact with the store without circular dependencies
      authStoreManager.initialize(store as AuthStoreInterface);

      return store;
    },
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

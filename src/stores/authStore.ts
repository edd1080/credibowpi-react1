import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorageService, AuthTokens } from '../services/secureStorage';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'supervisor';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuthStatus: () => Promise<void>;
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
};

// Mock API functions (to be replaced with real API calls)
const mockLogin = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simple validation for demo
  if (email === 'test@credibowpi.com' && password === 'password') {
    return {
      user: {
        id: '1',
        email,
        name: 'Agente de Campo',
        role: 'agent',
      },
      token: 'mock-jwt-token-' + Date.now(),
    };
  }

  throw new Error(
    'Credenciales inválidas. Intenta con test@credibowpi.com / password'
  );
};

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, token } = await mockLogin(email, password);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Error al iniciar sesión',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          await secureStorageService.clearAllData();

          set({
            ...initialState,
            isLoading: false,
          });
        } catch (error) {
          console.error('Logout error:', error);
          set({
            ...initialState,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      checkAuthStatus: async () => {
        try {
          const hasValidSession = await secureStorageService.hasValidSession();
          const userData = await secureStorageService.getUserData();
          const tokens = await secureStorageService.getAuthTokens();

          if (hasValidSession && userData && tokens) {
            set({
              user: userData,
              token: tokens.accessToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              ...initialState,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth status check error:', error);
          set({
            ...initialState,
            isLoading: false,
          });
        }
      },
    }),
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

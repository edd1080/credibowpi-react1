/**
 * Shared authentication types to prevent circular dependencies
 */

export interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
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
  setError: (error: string | null) => void;
  setBowpiAuth: (token: string, userData: any, sessionId: string) => void;
  clearBowpiAuth: () => void;
  setOfflineMode: (offline: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;
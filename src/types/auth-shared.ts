// Shared Authentication Types - Breaks circular dependencies
// This file contains interfaces and types shared between auth services and stores

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
  bowpiToken: string;
  bowpiUserData?: any;
  sessionId: string;
  isOfflineMode: boolean;
}

// Interface for auth store actions - used by services
export interface AuthStoreActions {
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  setBowpiAuth: (token: string, userData: any) => void;
  clearBowpiAuth: () => void;
  setOfflineMode: (offline: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setUser: (user: User | null) => void;
}

// Combined interface for the complete auth store
export interface AuthStoreInterface extends AuthState, AuthStoreActions {}

// Callback type for auth store updates
export type AuthStoreCallback = (state: AuthState) => void;

// Auth service interface - defines what auth services should provide
export interface AuthServiceInterface {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getCurrentUser(): Promise<any>;
  initialize?(): Promise<void>;
}

// Network status interface
export interface NetworkStatus {
  isConnected: boolean;
  type?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

// Login result interface
export interface LoginResult {
  success: boolean;
  message: string;
  userData?: any;
  error?: Error;
}

// Auth event types for logging and monitoring
export enum AuthEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_RESTORED = 'session_restored',
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH = 'token_refresh'
}

// Auth error categories
export enum AuthErrorCategory {
  NETWORK = 'network',
  CREDENTIALS = 'credentials',
  SERVER = 'server',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

// Auth operation context
export interface AuthOperationContext {
  operation: string;
  component: string;
  timestamp: number;
  networkStatus?: NetworkStatus;
  userAgent?: string;
}

// Auth metrics interface
export interface AuthMetrics {
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  logouts: number;
  sessionRestorations: number;
  averageLoginTime: number;
  lastLoginTime?: number;
  lastLogoutTime?: number;
}
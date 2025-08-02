// Authentication Providers Types - Dual Authentication System
// This file contains all interfaces and types for the dual authentication system

import { User, LoginResult, NetworkStatus } from './auth-shared';

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

/**
 * Available authentication provider types
 */
export enum AuthType {
  LEGACY = 'legacy',
  BOWPI = 'bowpi'
}

/**
 * Authentication provider capabilities
 */
export interface AuthProviderCapabilities {
  supportsOffline: boolean;
  supportsTokenRefresh: boolean;
  supportsPasswordReset: boolean;
  supportsBiometric: boolean;
  requiresNetwork: boolean;
  supportsMultipleUsers: boolean;
  hasSessionPersistence: boolean;
  supportsRoleBasedAuth: boolean;
}

/**
 * Provider health status information
 */
export interface ProviderHealthStatus {
  isHealthy: boolean;
  lastCheck: number;
  issues: string[];
  performance: {
    averageLoginTime: number;
    successRate: number;
    lastSuccessfulOperation: number;
    totalOperations: number;
  };
  networkStatus?: NetworkStatus;
}

/**
 * Provider debug information
 */
export interface ProviderDebugInfo {
  type: AuthType;
  name: string;
  version: string;
  isInitialized: boolean;
  hasActiveSession: boolean;
  lastActivity: number;
  configuration: Record<string, any>;
  metrics: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    sessionDuration: number;
  };
  errors: {
    recent: string[];
    count: number;
    lastError?: {
      message: string;
      timestamp: number;
      stack?: string;
    };
  };
}

// ============================================================================
// AUTHENTICATION PROVIDER INTERFACE
// ============================================================================

/**
 * Core interface that all authentication providers must implement
 */
export interface AuthProvider {
  // Provider identification
  readonly type: AuthType;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  
  // Core authentication methods
  login(email: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  
  // Session management
  refreshToken?(): Promise<boolean>;
  validateSession?(): Promise<boolean>;
  getSessionInfo?(): Promise<any>;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Provider-specific capabilities
  getCapabilities(): AuthProviderCapabilities;
  
  // Health and status
  healthCheck(): Promise<ProviderHealthStatus>;
  getDebugInfo(): ProviderDebugInfo;
  
  // Event handling (optional)
  onSessionExpired?(callback: () => void): void;
  onNetworkStatusChanged?(callback: (status: NetworkStatus) => void): void;
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Legacy authentication provider configuration
 */
export interface LegacyAuthConfig {
  mockDelay: number;
  allowedUsers: string[];
  simulateNetworkErrors: boolean;
  offlineMode: boolean;
  sessionDuration: number;
  enableDebugLogging: boolean;
  mockUserRoles: Record<string, 'agent' | 'supervisor'>;
}

/**
 * Bowpi authentication provider configuration
 */
export interface BowpiAuthConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableEncryption: boolean;
  enableOfflineMode: boolean;
  sessionValidationInterval: number;
  enableDebugLogging: boolean;
}

/**
 * Main authentication configuration
 */
export interface AuthConfiguration {
  // Current provider settings
  currentType: AuthType;
  fallbackType?: AuthType;
  autoSwitchOnFailure: boolean;
  
  // Provider-specific configurations
  legacy: LegacyAuthConfig;
  bowpi: BowpiAuthConfig;
  
  // Runtime switching settings
  allowRuntimeSwitch: boolean;
  requireConfirmationForSwitch: boolean;
  switchCooldownPeriod: number;
  
  // Monitoring and analytics
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  
  // Security settings
  enableAuditLogging: boolean;
  maxSwitchesPerHour: number;
  requireReauthOnSwitch: boolean;
}

// ============================================================================
// PROVIDER FACTORY INTERFACES
// ============================================================================

/**
 * Provider factory interface
 */
export interface AuthProviderFactory {
  initialize(config: AuthConfiguration): void;
  createProvider(type: AuthType): Promise<AuthProvider>;
  switchProvider(newType: AuthType): Promise<AuthProvider>;
  getCurrentProvider(): AuthProvider | null;
  getAvailableProviders(): AuthType[];
  cleanup(): Promise<void>;
}

// ============================================================================
// SWITCHING AND EVENTS
// ============================================================================

/**
 * Authentication switch event
 */
export interface AuthSwitchEvent {
  id: string;
  fromType: AuthType;
  toType: AuthType;
  timestamp: number;
  reason: 'user_request' | 'auto_fallback' | 'configuration_change' | 'health_check_failure';
  success: boolean;
  duration: number;
  error?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Authentication switch result
 */
export interface AuthSwitchResult {
  success: boolean;
  fromProvider: AuthType;
  toProvider: AuthType;
  duration: number;
  message: string;
  error?: Error;
  requiresReauth: boolean;
  event: AuthSwitchEvent;
}

/**
 * Provider switch validation result
 */
export interface SwitchValidationResult {
  canSwitch: boolean;
  reason?: string;
  warnings: string[];
  requirements: string[];
  estimatedDuration: number;
  requiresConfirmation: boolean;
}

// ============================================================================
// METRICS AND ANALYTICS
// ============================================================================

/**
 * Authentication metrics for analytics
 */
export interface AuthMetrics {
  // Current state
  currentProvider: AuthType;
  sessionStartTime: number;
  
  // Overall statistics
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  averageLoginTime: number;
  
  // Provider switching
  providerSwitches: number;
  lastSwitch?: AuthSwitchEvent;
  switchHistory: AuthSwitchEvent[];
  
  // Provider-specific stats
  providerStats: {
    [key in AuthType]: {
      usage: number;
      successRate: number;
      averageResponseTime: number;
      lastUsed: number;
      totalSessions: number;
      errors: number;
    };
  };
  
  // Performance metrics
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    cacheHitRate: number;
  };
}

/**
 * Provider comparison data
 */
export interface ProviderComparison {
  providers: AuthType[];
  comparison: {
    [key in AuthType]: {
      capabilities: AuthProviderCapabilities;
      health: ProviderHealthStatus;
      metrics: Partial<AuthMetrics['providerStats'][AuthType]>;
      pros: string[];
      cons: string[];
      recommendedFor: string[];
    };
  };
  recommendation: {
    primary: AuthType;
    fallback: AuthType;
    reason: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Authentication provider error types
 */
export enum AuthProviderErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  LOGIN_FAILED = 'login_failed',
  LOGOUT_FAILED = 'logout_failed',
  SESSION_INVALID = 'session_invalid',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  SWITCH_FAILED = 'switch_failed',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Authentication provider error
 */
export class AuthProviderError extends Error {
  constructor(
    public type: AuthProviderErrorType,
    message: string,
    public provider: AuthType,
    public originalError?: Error,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthProviderError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Provider initialization result
 */
export interface ProviderInitResult {
  success: boolean;
  provider: AuthType;
  duration: number;
  message: string;
  error?: Error;
  warnings: string[];
}

/**
 * Provider cleanup result
 */
export interface ProviderCleanupResult {
  success: boolean;
  provider: AuthType;
  duration: number;
  message: string;
  error?: Error;
  resourcesFreed: string[];
}

/**
 * Authentication operation context
 */
export interface AuthOperationContext {
  operation: 'login' | 'logout' | 'refresh' | 'validate' | 'switch';
  provider: AuthType;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Provider feature flags
 */
export interface ProviderFeatureFlags {
  enableLegacyProvider: boolean;
  enableBowpiProvider: boolean;
  enableRuntimeSwitching: boolean;
  enableAutoFallback: boolean;
  enableHealthChecks: boolean;
  enableMetrics: boolean;
  enableDebugMode: boolean;
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

/**
 * Type guard to check if a value is a valid AuthType
 */
export function isValidAuthType(value: any): value is AuthType {
  return Object.values(AuthType).includes(value);
}

/**
 * Type guard to check if an error is an AuthProviderError
 */
export function isAuthProviderError(error: any): error is AuthProviderError {
  return error instanceof AuthProviderError;
}

/**
 * Default configurations for providers
 */
export const DEFAULT_LEGACY_CONFIG: LegacyAuthConfig = {
  mockDelay: 1000,
  allowedUsers: [],
  simulateNetworkErrors: false,
  offlineMode: true,
  sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
  enableDebugLogging: false,
  mockUserRoles: {}
};

export const DEFAULT_BOWPI_CONFIG: BowpiAuthConfig = {
  baseUrl: 'http://10.14.11.200:7161',
  timeout: 30000,
  retryAttempts: 3,
  enableEncryption: true,
  enableOfflineMode: true,
  sessionValidationInterval: 5 * 60 * 1000, // 5 minutes
  enableDebugLogging: false
};

export const DEFAULT_AUTH_CONFIG: AuthConfiguration = {
  currentType: AuthType.BOWPI,
  fallbackType: AuthType.LEGACY,
  autoSwitchOnFailure: false,
  
  legacy: DEFAULT_LEGACY_CONFIG,
  bowpi: DEFAULT_BOWPI_CONFIG,
  
  allowRuntimeSwitch: true,
  requireConfirmationForSwitch: true,
  switchCooldownPeriod: 60000, // 1 minute
  
  enableMetrics: true,
  enableDebugLogging: false,
  enableHealthChecks: true,
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  
  enableAuditLogging: true,
  maxSwitchesPerHour: 10,
  requireReauthOnSwitch: false
};
// BOWPI Authentication Types and Constants

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Standard Bowpi Web Service Response Interface
 * Used for all API responses from Bowpi microservices
 */
export interface ResponseWs<T = any> {
  code: string;
  message: string;
  data: T;
  success: boolean;
}

/**
 * Bowpi Login Response - data contains encrypted JWT token
 */
export interface BowpiLoginResponse extends ResponseWs<string> {
  // data field contains the encrypted JWT token as string
}

// ============================================================================
// AUTHENTICATION DATA INTERFACES
// ============================================================================

/**
 * Decrypted JWT Token Data Structure
 * Contains both JWT metadata and decrypted user profile
 */
export interface AuthTokenData {
  // JWT Standard Claims
  iss: string;                    // Issuer
  aud: string;                    // Audience
  exp: number;                    // Expiration time (Unix timestamp)
  iat: number;                    // Issued at (Unix timestamp)
  sub: string;                    // Subject
  jti: string;                    // JWT ID

  // Bowpi Specific Claims
  userId: string;                 // requestId - main user identifier
  username: string;               // username from profile
  email: string;                  // email from profile
  userProfile: BowpiUserProfile;  // Complete user profile
  permissions: string[];          // User permissions array
  roles: string[];               // User roles/groups array
}

/**
 * Session Information Interface
 */
export interface SessionInfo {
  isValid: boolean;
  state: 'valid' | 'expired' | 'corrupted' | 'missing' | 'network_error' | 'unknown';
  userId?: string;
  sessionId?: string;
  lastActivity?: number;
  expiresAt?: number;
  source: 'memory' | 'storage' | 'server';
  validationTime: number;
}

/**
 * Session Recovery Result Interface
 */
export interface SessionRecoveryResult {
  success: boolean;
  type: string;
  previousState: string;
  newState: string;
  message: string;
  userData?: string;
  sessionId?: string;
  timestamp: number;
  details?: Record<string, any>;
}

/**
 * Complete Bowpi User Profile Structure
 * Extracted from decrypted JWT data claim
 */
export interface BowpiUserProfile {
  username: string;
  email: string;
  names: string;
  lastNames: string;
  firstLogin: boolean;
  state: {
    id: number;
    value: string;
  };
  phone: string;
  time: number;
  duration: number;
  agency: {
    id: number;
    value: string;
  };
  region: {
    id: number;
    value: string;
  };
  macroRegion: {
    id: number;
    value: string;
  };
  employeePosition: {
    id: number;
    value: string;
  };
  company: {
    id: number;
    name: string;
    type: string;
  };
  permissions: string[];
  Groups: string[];
  hasSignature: boolean;
  officerCode: string;
  requestId: string;              // Main session identifier
  passwordExpirationDate?: string;
  passwordExpirationDays?: number;
}

// ============================================================================
// REQUEST HEADERS INTERFACES
// ============================================================================

/**
 * Base Bowpi Request Headers - Always Required
 */
export interface BowpiRequestHeaders extends Record<string, string> {
  'Authorization': string;        // 'Basic Ym93cGk6Qm93cGkyMDE3'
  'Cache-Control': string;        // 'no-cache'
  'Pragma': string;              // 'no-cache'
  'OTPToken': string;            // Generated dynamically
}

/**
 * Mandatory Headers for PUT/POST/PATCH requests
 */
export type BowpiMandatoryHeaders = {
  'X-Date': string;              // Generated timestamp
  'X-Digest': string;            // HMAC signature
  'bowpi-auth-token'?: string;   // Only if authenticated session exists
}

/**
 * Complete Headers Type - Combination of base and mandatory
 */
export type BowpiCompleteHeaders = BowpiRequestHeaders & BowpiMandatoryHeaders;

// ============================================================================
// HTTP CLIENT INTERFACES
// ============================================================================

/**
 * Request Configuration for HTTP Client
 */
export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  context: InterceptorContext;
}

/**
 * Response Configuration from HTTP Client
 */
export interface ResponseConfig {
  data: any;
  status: number;
  headers: Record<string, string>;
  config: RequestConfig;
}

/**
 * Interceptor Context for Request Tracking
 */
export interface InterceptorContext {
  requestId: string;
  retryCount: number;
  timestamp: number;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * OTP Token Generator Interface
 */
export interface OTPTokenGenerator {
  generateOTPToken(): string;
  getProduct(n: number): number;
}

/**
 * HMAC Generator Interface
 */
export interface HMACGenerator {
  generateDigestHmac(body: any, headers: any): Promise<string>;
  shouldGenerateHMAC(method: string): boolean;
}

/**
 * Crypto Service Interface
 */
export interface CryptoService {
  decryptToken(encryptedToken: string): AuthTokenData;
  decrypt(encryptedText: string): string;
}

/**
 * Authentication Adapter Interface
 */
export interface AuthenticationAdapter {
  login(email: string, password: string): Promise<BowpiLoginResponse>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getCurrentUser(): Promise<AuthTokenData | null>;
  getCurrentSessionId(): Promise<string | null>;
  getAuthHeaders(url: string, method: string, body?: any): Promise<Record<string, string>>;
  refreshToken(): Promise<boolean>;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Bowpi Authentication Error Types
 */
export enum BowpiAuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  OFFLINE_LOGIN_ATTEMPT = 'OFFLINE_LOGIN_ATTEMPT',
  SESSION_INVALIDATION_ERROR = 'SESSION_INVALIDATION_ERROR',
  DOMAIN_NOT_ALLOWED = 'DOMAIN_NOT_ALLOWED',
  HTTPS_REQUIRED = 'HTTPS_REQUIRED'
}

/**
 * Bowpi Authentication Error Class
 */
export class BowpiAuthError extends Error {
  constructor(
    public type: BowpiAuthErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BowpiAuthError';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Bowpi Service Constants - DO NOT MODIFY
 * These values are required for compatibility with Bowpi backend
 */
export const BOWPI_CONSTANTS = {
  // Server Configuration
  BASE_HOST: 'http://10.14.11.200:7161',
  SERVICE_PREFIX: '/bowpi/micro-auth-service',
  
  // Authentication Constants
  BASIC_AUTH: 'Basic Ym93cGk6Qm93cGkyMDE3',
  APPLICATION_TYPE: 'MOBILE',
  
  // Cryptographic Keys - DO NOT MODIFY
  SECRET_KEY_HMAC: 'bowpi2017',
  ENCRYPTION_KEY: 'bowpi2017bowpi2017bowpi2017bowpi2017',
  ENCRYPTION_IV: 'bowpi2017bowpi20',
} as const;

/**
 * Bowpi API Endpoints
 */
export const BOWPI_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  INVALIDATE_SESSION: '/management/session/invalidate/request',
  REFRESH_TOKEN: '/auth/refresh'
} as const;

/**
 * Base Headers for All Requests
 */
export const BOWPI_BASE_HEADERS = {
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
} as const;

/**
 * HTTP Methods that require HMAC signature
 */
export const METHODS_REQUIRING_HMAC = ['POST', 'PUT', 'PATCH'] as const;

/**
 * Public endpoints that don't require authentication token
 */
export const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/register',
  '/forgot-password',
  '/health'
] as const;

/**
 * Allowed domains for HTTP requests
 */
export const ALLOWED_DOMAINS = [
  '10.14.11.200',
  'localhost',
  '127.0.0.1',
  // Add production domains here
] as const;

/**
 * AsyncStorage Keys for Bowpi Data
 */
export const BOWPI_STORAGE_KEYS = {
  ENCRYPTED_TOKEN: 'bowpi_encrypted_token',
  SESSION_DATA: 'bowpi_session_data',
  SESSION_ID: 'bowpi_session_id',
  OFFLINE_QUEUE: 'bowpi_offline_queue',
  USER_PROFILE: 'bowpi_user_profile'
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Login Result Type
 */
export interface LoginResult {
  success: boolean;
  message: string;
  userData?: AuthTokenData;
  error?: BowpiAuthError;
}

/**
 * Session Data Storage Structure
 */
export interface BowpiSessionData {
  decryptedToken: AuthTokenData;
  lastRenewalDate: number;
  userId: string;
  userProfile: BowpiUserProfile;
  sessionId: string;
  expirationTime: number;
}

/**
 * Network Status Interface
 */
export interface NetworkStatus {
  isConnected: boolean;
  type?: string;
  isInternetReachable?: boolean;
}

/**
 * Environment Configuration
 */
export interface BowpiEnvironmentConfig {
  isDevelopment: boolean;
  allowHttp: boolean;
  enableDebugLogs: boolean;
  baseUrl: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ResponseWs
 */
export function isResponseWs<T>(obj: any): obj is ResponseWs<T> {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.success === 'boolean' &&
    obj.hasOwnProperty('data')
  );
}

/**
 * Type guard for AuthTokenData
 */
export function isAuthTokenData(obj: any): obj is AuthTokenData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.userId === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string' &&
    obj.userProfile &&
    typeof obj.userProfile.requestId === 'string'
  );
}

/**
 * Type guard for BowpiAuthError
 */
export function isBowpiAuthError(error: any): error is BowpiAuthError {
  return error instanceof BowpiAuthError;
}
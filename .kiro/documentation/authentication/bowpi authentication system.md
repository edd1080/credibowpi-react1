# Bowpi Authentication System - Complete Specification

## Overview

This document serves as the master specification for the Bowpi authentication system implementation in the CrediBowpi mobile application. It provides a comprehensive overview of the system architecture, components, and integration points.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Specifications](#component-specifications)
3. [Integration Points](#integration-points)
4. [Security Implementation](#security-implementation)
5. [Offline-First Design](#offline-first-design)
6. [API Specifications](#api-specifications)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)
11. [Maintenance and Support](#maintenance-and-support)
12. [Related Documentation](#related-documentation)

## System Architecture

### High-Level Architecture

The Bowpi authentication system follows a layered architecture designed for security, reliability, and offline-first functionality:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  LoginScreen | AuthGuards | NetworkIndicators              │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  BowpiAuthService | SessionManager | NetworkAwareService   │
├─────────────────────────────────────────────────────────────┤
│                    Adapter Layer                            │
│  BowpiAuthAdapter | HttpClient | StorageAdapter            │
├─────────────────────────────────────────────────────────────┤
│                    Core Services                            │
│  OTPService | HMACService | CryptoService | Interceptor    │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                     │
│  AsyncStorage | NetInfo | SecureStore | FileSystem         │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```mermaid
graph TB
    subgraph "UI Layer"
        LS[LoginScreen]
        AS[AuthGuard]
        NI[NetworkIndicator]
    end
    
    subgraph "Service Layer"
        BAS[BowpiAuthService]
        SM[SessionManager]
        NAS[NetworkAwareService]
    end
    
    subgraph "Adapter Layer"
        BAA[BowpiAuthAdapter]
        HC[HttpClient]
        SA[StorageAdapter]
    end
    
    subgraph "Core Services"
        OTP[OTPService]
        HMAC[HMACService]
        CS[CryptoService]
        AI[AuthInterceptor]
    end
    
    subgraph "Infrastructure"
        AST[AsyncStorage]
        NIF[NetInfo]
        SS[SecureStore]
    end
    
    LS --> BAS
    AS --> BAS
    NI --> NAS
    
    BAS --> BAA
    BAS --> SM
    BAS --> NAS
    
    BAA --> HC
    SM --> SA
    HC --> AI
    
    AI --> OTP
    AI --> HMAC
    BAA --> CS
    
    SA --> AST
    NAS --> NIF
    CS --> SS
```

## Component Specifications

### 1. BowpiAuthService

**Purpose**: Main authentication service interface for the application.

**Responsibilities**:
- Coordinate authentication flows
- Manage session lifecycle
- Handle network-aware operations
- Provide unified API for authentication

**Key Methods**:
```typescript
class BowpiAuthService {
  async login(email: string, password: string): Promise<LoginResult>
  async logout(): Promise<void>
  async isAuthenticated(): Promise<boolean>
  async getCurrentUser(): Promise<AuthTokenData | null>
  async refreshSession(): Promise<void>
}
```

**Dependencies**: BowpiAuthAdapter, SessionManager, NetworkAwareService

### 2. BowpiAuthAdapter

**Purpose**: Core authentication logic and server communication.

**Responsibilities**:
- Execute authentication requests
- Handle JWT token processing
- Manage server session invalidation
- Process authentication responses

**Key Methods**:
```typescript
class BowpiAuthAdapter {
  async login(email: string, password: string): Promise<AuthTokenData>
  async invalidateSession(requestId: string): Promise<void>
  private async processAuthResponse(response: ResponseWs<string>): Promise<AuthTokenData>
}
```

**Dependencies**: HttpClient, CryptoService, OTPService, HMACService

### 3. Bowpi Core Services

#### BowpiOTPService
- **Purpose**: Generate OTP tokens for request authentication
- **Method**: `generateOTPToken(): string`
- **Format**: Base64(randomNumber + timestamp + "4000" + timestamp)

#### BowpiHMACService
- **Purpose**: Generate HMAC digests for request integrity
- **Method**: `generateDigestHmac(body: any, headers: Record<string, string>): Promise<{digest: string, headers: Record<string, string>}>`
- **Usage**: Required for PUT/POST/PATCH requests

#### BowpiCryptoService
- **Purpose**: Handle JWT token decryption
- **Method**: `decryptToken(encryptedToken: string): AuthTokenData`
- **Security**: Uses provided encryption algorithms without modification

#### BowpiAuthenticationInterceptor
- **Purpose**: Automatic header injection for HTTP requests
- **Functionality**: Adds required headers (Authorization, OTPToken, X-Digest, etc.)

### 4. SecureHttpClient

**Purpose**: Enhanced HTTP client with security features.

**Security Features**:
- Domain validation
- HTTPS enforcement in production
- Automatic header injection
- No-cache policy for non-auth services

**Configuration**:
```typescript
const SECURITY_CONFIG = {
  ALLOWED_DOMAINS: ['10.14.11.200', 'bowpi.com', 'credibowpi.com'],
  ENFORCE_HTTPS: !__DEV__,
  REQUIRE_AUTH_HEADERS: true,
  NO_CACHE_POLICY: true
};
```

### 5. SessionManager

**Purpose**: Manage user sessions with offline-first approach.

**Key Features**:
- Session persistence across app restarts
- No automatic expiration (offline-first)
- Secure session storage
- Session validation and recovery

**Storage Schema**:
```typescript
interface BowpiSessionData {
  decryptedToken: AuthTokenData;
  lastRenewalDate: number;
  userId: string;
  userProfile: AuthTokenData['userProfile'];
  sessionId: string;
  expirationTime: number; // Not enforced
}
```

## Integration Points

### 1. AuthStore Integration

```typescript
// Enhanced AuthStore with Bowpi support
interface AuthState {
  // Existing fields
  isAuthenticated: boolean;
  user: User | null;
  
  // Bowpi-specific fields
  bowpiToken?: string;
  bowpiUserData?: AuthTokenData;
  sessionId?: string;
  isOfflineMode: boolean;
  lastSyncTimestamp?: number;
}

interface AuthActions {
  // Existing methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Bowpi-specific methods
  loginWithBowpi: (email: string, password: string) => Promise<void>;
  setBowpiAuth: (token: string, userData: AuthTokenData) => void;
  clearBowpiAuth: () => void;
  setOfflineMode: (offline: boolean) => void;
}
```

### 2. Navigation Integration

```typescript
// Authentication-aware navigation
const AuthNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <SplashScreen />;
  }
  
  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <TabNavigator />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
```

### 3. Network State Integration

```typescript
// Network-aware authentication
const useNetworkAwareAuth = () => {
  const [isConnected, setIsConnected] = useState(true);
  const authService = new BowpiAuthService();
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);
  
  const login = async (email: string, password: string) => {
    if (!isConnected) {
      throw new BowpiAuthError(
        BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT,
        'Login requires internet connection'
      );
    }
    return authService.login(email, password);
  };
  
  return { login, logout: authService.logout, isConnected };
};
```

## Security Implementation

### 1. Security Layers

| Layer | Security Measures |
|-------|------------------|
| **Transport** | HTTPS enforcement, certificate pinning |
| **Authentication** | JWT tokens, OTP generation, HMAC validation |
| **Authorization** | Role-based access control, session validation |
| **Data** | Encryption at rest, secure storage |
| **Application** | Input validation, error sanitization |

### 2. Cryptographic Standards

- **Encryption**: AES-256 for data at rest
- **Hashing**: SHA-256 for data integrity
- **Random Generation**: Cryptographically secure random numbers
- **Key Derivation**: PBKDF2 with appropriate iterations

### 3. Security Headers

```typescript
const REQUIRED_HEADERS = {
  'Authorization': 'Basic Ym93cGk6Qm93cGkyMDE3',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'OTPToken': '[Generated dynamically]'
};
```

## Offline-First Design

### 1. Core Principles

- **Connectivity Independence**: Full functionality without network
- **Data Persistence**: All data survives app restarts
- **Graceful Degradation**: Clear feedback for network-dependent features
- **Optimistic Updates**: Immediate local changes, background sync

### 2. Authentication Flow States

| State | Network Required | User Experience |
|-------|------------------|-----------------|
| **App Start** | No | Instant session restoration |
| **Login** | Yes | Clear offline messaging |
| **Main App** | No | Full functionality |
| **Logout** | No | Warning for offline logout |

### 3. Data Synchronization

```typescript
interface SyncStrategy {
  // Immediate local updates
  optimisticUpdates: boolean;
  
  // Background synchronization
  autoSyncOnReconnect: boolean;
  syncRetryAttempts: number;
  syncRetryDelay: number;
  
  // Conflict resolution
  conflictResolution: 'client-wins' | 'server-wins' | 'merge';
}
```

## API Specifications

### 1. Authentication Endpoints

#### POST /auth/login
```typescript
// Request
interface LoginRequest {
  username: string;
  password: string;
  application: 'MOBILE';
  isCheckVersion: false;
}

// Response
interface LoginResponse extends ResponseWs<string> {
  data: string; // Encrypted JWT token
}
```

#### POST /management/session/invalidate/request/{requestId}
```typescript
// Fire-and-forget session invalidation
// Requires bowpi-auth-token header
// No response expected
```

### 2. Required Headers

```typescript
interface RequestHeaders {
  // Always required
  'Authorization': 'Basic Ym93cGk6Qm93cGkyMDE3';
  'Cache-Control': 'no-cache';
  'Pragma': 'no-cache';
  'OTPToken': string; // Generated dynamically
  
  // For PUT/POST/PATCH
  'X-Date'?: string;
  'X-Digest'?: string;
  
  // For authenticated requests (not /login)
  'bowpi-auth-token'?: string;
}
```

## Data Models

### 1. Core Interfaces

```typescript
// Server response wrapper
interface ResponseWs<T = any> {
  code: string;
  message: string;
  data: T;
  success: boolean;
}

// Decrypted JWT token data
interface AuthTokenData {
  // JWT metadata
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  jti: string;
  
  // User identification
  userId: string;
  username: string;
  email: string;
  
  // User profile
  userProfile: {
    username: string;
    email: string;
    names: string;
    lastNames: string;
    firstLogin: boolean;
    state: { id: number; value: string };
    phone: string;
    time: number;
    duration: number;
    agency: { id: number; value: string };
    region: { id: number; value: string };
    macroRegion: { id: number; value: string };
    employeePosition: { id: number; value: string };
    company: { id: number; name: string; type: string };
    permissions: string[];
    Groups: string[];
    hasSignature: boolean;
    officerCode: string;
    requestId: string;
    passwordExpirationDate?: string;
    passwordExpirationDays?: number;
  };
  
  permissions: string[];
  roles: string[];
}
```

### 2. Error Types

```typescript
enum BowpiAuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  OFFLINE_LOGIN_ATTEMPT = 'OFFLINE_LOGIN_ATTEMPT',
  DOMAIN_VALIDATION_ERROR = 'DOMAIN_VALIDATION_ERROR',
  HTTPS_REQUIRED = 'HTTPS_REQUIRED'
}

class BowpiAuthError extends Error {
  constructor(
    public type: BowpiAuthErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BowpiAuthError';
  }
}
```

## Error Handling

### 1. Error Classification

| Error Type | Severity | User Action | System Action |
|------------|----------|-------------|---------------|
| **Network Error** | Medium | Retry when online | Queue for sync |
| **Invalid Credentials** | High | Re-enter credentials | Clear form |
| **Token Expired** | High | Re-authenticate | Auto-logout (if online) |
| **Server Error** | Medium | Try again later | Log and monitor |
| **Offline Login** | Low | Wait for connection | Show helpful message |

### 2. Error Recovery Strategies

```typescript
const errorRecoveryStrategies = {
  [BowpiAuthErrorType.NETWORK_ERROR]: {
    userMessage: 'Error de conexión. Verifica tu conexión a internet.',
    recovery: 'retry',
    autoRetry: true,
    retryDelay: 5000
  },
  
  [BowpiAuthErrorType.INVALID_CREDENTIALS]: {
    userMessage: 'Credenciales inválidas. Verifica tu email y contraseña.',
    recovery: 'user-input',
    clearForm: true
  },
  
  [BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT]: {
    userMessage: 'El login requiere conexión a internet.',
    recovery: 'wait-for-network',
    showNetworkStatus: true
  }
};
```

## Testing Strategy

### 1. Test Categories

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | Individual services | Jest |
| **Integration Tests** | Service interactions | Jest + Testing Library |
| **Security Tests** | Crypto operations | Custom security suite |
| **E2E Tests** | Complete flows | Detox |
| **Performance Tests** | Response times | Custom benchmarks |

### 2. Test Scenarios

#### Authentication Flow Tests
- [ ] Successful login with valid credentials
- [ ] Failed login with invalid credentials
- [ ] Login attempt while offline
- [ ] Session restoration on app start
- [ ] Logout while online
- [ ] Logout while offline with confirmation

#### Security Tests
- [ ] OTP token generation format
- [ ] HMAC digest validation
- [ ] JWT token decryption
- [ ] Domain validation
- [ ] HTTPS enforcement
- [ ] Header injection

#### Offline Tests
- [ ] Session persistence across restarts
- [ ] Network state monitoring
- [ ] Offline operation queueing
- [ ] Sync on reconnection

## Deployment Guide

### 1. Environment Configuration

```typescript
// Development
const DEV_CONFIG = {
  AUTH_ENDPOINT: 'http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
  ENFORCE_HTTPS: false,
  DEBUG_LOGGING: true,
  ALLOWED_DOMAINS: ['10.14.11.200', 'localhost']
};

// Production
const PROD_CONFIG = {
  AUTH_ENDPOINT: 'https://api.credibowpi.com/bowpi/micro-auth-service/auth/login',
  ENFORCE_HTTPS: true,
  DEBUG_LOGGING: false,
  ALLOWED_DOMAINS: ['api.credibowpi.com', 'bowpi.com']
};
```

### 2. Deployment Checklist

- [ ] Environment variables configured
- [ ] HTTPS certificates installed
- [ ] Domain whitelist updated
- [ ] Security headers configured
- [ ] Monitoring and logging enabled
- [ ] Error tracking configured
- [ ] Performance monitoring active

### 3. Migration Strategy

1. **Phase 1**: Deploy alongside existing auth (feature flag)
2. **Phase 2**: Gradual user migration (A/B testing)
3. **Phase 3**: Full migration and old system removal
4. **Phase 4**: Cleanup and optimization

## Maintenance and Support

### 1. Regular Maintenance Tasks

| Task | Frequency | Responsibility |
|------|-----------|----------------|
| **Security Updates** | Monthly | Security Team |
| **Dependency Updates** | Quarterly | Development Team |
| **Performance Review** | Quarterly | DevOps Team |
| **Security Audit** | Annually | External Auditor |

### 2. Monitoring and Alerting

```typescript
// Key metrics to monitor
const MONITORING_METRICS = {
  authentication: {
    loginSuccessRate: 'percentage',
    loginResponseTime: 'milliseconds',
    failedLoginAttempts: 'count',
    sessionDuration: 'minutes'
  },
  
  security: {
    suspiciousActivityEvents: 'count',
    tokenDecryptionFailures: 'count',
    domainValidationFailures: 'count',
    httpsViolations: 'count'
  },
  
  performance: {
    authServiceResponseTime: 'milliseconds',
    cryptoOperationTime: 'milliseconds',
    storageOperationTime: 'milliseconds',
    syncOperationTime: 'milliseconds'
  }
};
```

### 3. Support Procedures

#### Issue Escalation
1. **Level 1**: Basic troubleshooting (Development Team)
2. **Level 2**: Advanced debugging (Senior Developers)
3. **Level 3**: Security incidents (Security Team)
4. **Level 4**: Critical system failures (DevOps + Management)

#### Emergency Response
- **Authentication Outage**: Implement graceful degradation
- **Security Breach**: Immediate session invalidation
- **Data Corruption**: Restore from backups and re-sync

## Related Documentation

### 1. Core Documentation Files

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**: Complete integration guide
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)**: Detailed API documentation
- **[SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md)**: Security guidelines and best practices
- **[OFFLINE_BEHAVIOR.md](./OFFLINE_BEHAVIOR.md)**: Offline-first behavior specification
- **[TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)**: Troubleshooting guide

### 2. Implementation Files

```
src/
├── services/
│   ├── BowpiAuthService.ts
│   ├── bowpi/
│   │   ├── BowpiAuthAdapter.ts
│   │   ├── BowpiOTPService.ts
│   │   ├── BowpiHMACService.ts
│   │   ├── BowpiCryptoService.ts
│   │   └── BowpiAuthenticationInterceptor.ts
│   ├── SecureHttpClient.ts
│   └── BowpiSecureStorageService.ts
├── types/
│   └── bowpi.ts
├── constants/
│   └── bowpi.ts
└── hooks/
    └── useBowpiAuth.ts
```

### 3. Test Files

```
src/__tests__/
├── integration/
│   ├── AuthenticationIntegration.test.ts
│   ├── LoginFlow.test.ts
│   ├── LogoutFlow.test.ts
│   └── OfflineOnlineAuth.test.ts
├── security-performance/
│   ├── TokenSecurity.test.ts
│   ├── HeaderSecurity.test.ts
│   └── AuthPerformance.test.ts
└── services/bowpi/
    ├── BowpiAuthAdapter.test.ts
    ├── BowpiCryptoService.test.ts
    ├── BowpiHMACService.test.ts
    └── BowpiOTPService.test.ts
```

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 2025 | Initial implementation | CrediBowpi Team |

## Approval and Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Technical Lead** | | | |
| **Security Officer** | | | |
| **Product Manager** | | | |
| **QA Lead** | | | |

---

**Document Classification**: Internal Use Only  
**Last Updated**: January 2025  
**Next Review Date**: April 2025  
**Maintainer**: CrediBowpi Development Team  
**Contact**: dev-team@credibowpi.com
# Bowpi Authentication System Integration Guide

## Overview

This document provides comprehensive guidance for integrating and maintaining the Bowpi authentication system in the CrediBowpi mobile application. The system implements a secure, offline-first authentication mechanism that follows OWASP security standards.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Integration Process](#integration-process)
3. [Configuration](#configuration)
4. [API Documentation](#api-documentation)
5. [Security Guidelines](#security-guidelines)
6. [Offline-First Behavior](#offline-first-behavior)
7. [Troubleshooting](#troubleshooting)
8. [Migration Guide](#migration-guide)
9. [Testing](#testing)
10. [Monitoring and Analytics](#monitoring-and-analytics)

## Architecture Overview

### Core Components

The Bowpi authentication system consists of several key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
├─────────────────────────────────────────────────────────────┤
│  LoginScreen → BowpiAuthService → BowpiAuthAdapter          │
│                      ↓                    ↓                 │
│              AuthStore/Storage    Bowpi Services            │
│                      ↓                    ↓                 │
│              AsyncStorage        OTP/HMAC/Crypto            │
│                                           ↓                 │
│                              SecureHttpClient               │
│                                           ↓                 │
├─────────────────────────────────────────────────────────────┤
│                    Network Layer                            │
├─────────────────────────────────────────────────────────────┤
│                   Bowpi Server                              │
│              Auth API | Session API                        │
└─────────────────────────────────────────────────────────────┘
```

### Key Services

- **BowpiAuthService**: Main authentication interface
- **BowpiAuthAdapter**: Core authentication logic
- **BowpiOTPService**: OTP token generation
- **BowpiHMACService**: HMAC digest generation
- **BowpiCryptoService**: JWT token decryption
- **SecureHttpClient**: HTTP client with security headers
- **BowpiAuthenticationInterceptor**: Automatic header injection

## Integration Process

### Step 1: Dependencies Installation

```bash
npm install crypto-js@^4.2.0
npm install @react-native-community/netinfo
```

Verify that `expo-crypto@~14.1.5` is available in your Expo SDK.

### Step 2: Service Integration

1. **Copy Bowpi Services**: Place the provided Bowpi services in `src/services/bowpi/`:
   - `BowpiOTPService.ts`
   - `BowpiHMACService.ts`
   - `BowpiCryptoService.ts`
   - `BowpiAuthenticationInterceptor.ts`
   - `BowpiAuthAdapter.ts`

2. **Create Service Wrapper**: Implement `BowpiAuthService.ts` as the main interface:

```typescript
import { BowpiAuthAdapter } from './bowpi/BowpiAuthAdapter';
import { AuthStore } from '../stores/authStore';
import NetInfo from '@react-native-community/netinfo';

export class BowpiAuthService {
  private authAdapter: BowpiAuthAdapter;
  private authStore: AuthStore;

  constructor() {
    this.authAdapter = new BowpiAuthAdapter();
    this.authStore = useAuthStore.getState();
  }

  async login(email: string, password: string): Promise<LoginResult> {
    // Implementation details...
  }

  async logout(): Promise<void> {
    // Implementation details...
  }
}
```

### Step 3: HTTP Client Enhancement

Enhance your existing HTTP client to support:
- Domain validation
- HTTPS enforcement in production
- Automatic header injection
- No-cache policy for non-auth services

### Step 4: UI Integration

Update your LoginScreen to use the new authentication service:

```typescript
const { loginWithBowpi, isLoading, error } = useAuthStore();

const handleLogin = async () => {
  if (!isConnected) {
    Alert.alert('Sin Conexión', 'El login requiere conexión a internet.');
    return;
  }
  
  await loginWithBowpi(email, password);
};
```

## Configuration

### Environment Variables

```typescript
// src/constants/environment.ts
export const BOWPI_CONFIG = {
  AUTH_ENDPOINT: 'http://10.14.11.200:7161/bowpi/micro-auth-service/auth/login',
  SESSION_ENDPOINT: 'http://10.14.11.200:7161/bowpi/micro-auth-service/management/session',
  ALLOWED_DOMAINS: [
    '10.14.11.200',
    'bowpi.com',
    'credibowpi.com'
  ],
  ENFORCE_HTTPS: __DEV__ ? false : true,
};
```

### Storage Keys

```typescript
export const BOWPI_STORAGE_KEYS = {
  ENCRYPTED_TOKEN: '@bowpi_encrypted_token',
  SESSION_DATA: '@bowpi_session_data',
  SESSION_ID: '@bowpi_session_id',
  USER_PROFILE: '@bowpi_user_profile',
} as const;
```

### Constants

```typescript
export const BOWPI_CONSTANTS = {
  APPLICATION_TYPE: 'MOBILE',
  CHECK_VERSION: false,
  BASIC_AUTH: 'Basic Ym93cGk6Qm93cGkyMDE3',
  CACHE_CONTROL: 'no-cache',
  PRAGMA: 'no-cache',
} as const;
```

## API Documentation

### Authentication Endpoints

#### POST /auth/login

**Request:**
```json
{
  "username": "user@example.com",
  "password": "userPassword",
  "application": "MOBILE",
  "isCheckVersion": false
}
```

**Headers:**
```
Authorization: Basic Ym93cGk6Qm93cGkyMDE3
Cache-Control: no-cache
Pragma: no-cache
OTPToken: [Generated OTP Token]
X-Date: [ISO Date String]
X-Digest: [HMAC Digest]
```

**Response:**
```json
{
  "code": "200",
  "message": "Success",
  "data": "[Encrypted JWT Token]",
  "success": true
}
```

#### POST /management/session/invalidate/request/{requestId}

**Headers:**
```
Authorization: Basic Ym93cGk6Qm93cGkyMDE3
bowpi-auth-token: [Session Token]
OTPToken: [Generated OTP Token]
```

**Response:** Fire-and-forget (no response expected)

### Header Generation

#### OTP Token Generation

```typescript
// Generated format: Base64(randomNumber + timestamp + "4000" + timestamp)
const otpToken = BowpiOTPService.generateOTPToken();
```

#### HMAC Digest Generation

```typescript
// For PUT/POST/PATCH requests
const { digest, headers } = await BowpiHMACService.generateDigestHmac(
  requestBody,
  existingHeaders
);
```

### JWT Token Processing

```typescript
// Decrypt received JWT token
const decryptedData = BowpiCryptoService.decryptToken(encryptedJWT);

// Extract user information
const userData: AuthTokenData = {
  userId: decryptedData.userProfile.requestId,
  username: decryptedData.userProfile.username,
  email: decryptedData.userProfile.email,
  // ... other profile data
};
```

## Security Guidelines

### 1. Token Security

- **Storage**: Use AsyncStorage with encryption for sensitive data
- **Transmission**: Always use HTTPS in production
- **Validation**: Validate token integrity before use
- **Expiration**: Tokens don't expire unless explicitly logged out

### 2. Network Security

```typescript
// Domain validation
const validateDomain = (url: string): boolean => {
  const domain = new URL(url).hostname;
  return BOWPI_CONFIG.ALLOWED_DOMAINS.includes(domain);
};

// HTTPS enforcement
const enforceHttps = (url: string): void => {
  if (BOWPI_CONFIG.ENFORCE_HTTPS && !url.startsWith('https://')) {
    throw new Error('HTTPS required in production');
  }
};
```

### 3. Error Handling Security

- Never expose sensitive information in error messages
- Log security events without revealing credentials
- Implement secure fallback mechanisms

```typescript
// Secure error logging
const logSecurityEvent = (event: string, details?: any) => {
  if (__DEV__) {
    console.log(`[SECURITY] ${event}:`, details);
  } else {
    // Production logging without sensitive data
    SecurityLoggingService.log(event, sanitizeDetails(details));
  }
};
```

### 4. Session Management Security

- Automatic session invalidation on authentication errors
- Secure session cleanup on logout
- Protection against session hijacking

## Offline-First Behavior

### Login Behavior

```typescript
// Online Login Flow
1. Check network connectivity
2. If offline → Show "Internet required" message
3. If online → Proceed with authentication
4. Store encrypted token locally
5. Navigate to main app

// Offline Usage
1. App starts → Check for valid local token
2. If valid token exists → Skip login, go to main app
3. If no token → Show login screen
4. User can navigate app with cached data
```

### Logout Behavior

```typescript
// Online Logout
1. Call server invalidation endpoint (fire-and-forget)
2. Clear local session data
3. Navigate to login screen

// Offline Logout
1. Show warning: "Cannot login again without internet"
2. User confirms → Clear local data
3. Navigate to login screen
```

### Session Persistence

- Sessions persist across app restarts
- No automatic expiration (offline-first requirement)
- Manual logout required to clear session
- Automatic cleanup on authentication errors (when online)

### Network State Handling

```typescript
// Monitor network changes
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsConnected(state.isConnected ?? false);
    
    if (state.isConnected) {
      // Attempt to sync pending operations
      syncPendingOperations();
    }
  });
  
  return unsubscribe;
}, []);
```

## Troubleshooting

See [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) for detailed troubleshooting guide.

## Migration Guide

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration from existing authentication systems.

## Testing

### Unit Tests

```bash
# Run Bowpi service tests
npm test -- --testPathPattern="bowpi"

# Run authentication integration tests
npm test -- --testPathPattern="integration.*auth"
```

### Security Tests

```bash
# Run security and performance tests
npm test -- --testPathPattern="security-performance"
```

### Manual Testing Checklist

- [ ] Login with valid credentials (online)
- [ ] Login attempt while offline
- [ ] Session persistence across app restarts
- [ ] Logout while online
- [ ] Logout while offline with confirmation
- [ ] Automatic logout on 401/403 errors
- [ ] Header generation for different request types
- [ ] Token decryption and user data extraction

## Monitoring and Analytics

### Authentication Metrics

- Login success/failure rates
- Network connectivity during auth attempts
- Session duration and logout patterns
- Error frequency and types

### Security Monitoring

- Failed authentication attempts
- Token validation failures
- Suspicious activity detection
- Network security violations

### Performance Metrics

- Authentication response times
- Token decryption performance
- Storage operation efficiency
- Network request optimization

## Support and Maintenance

### Regular Maintenance Tasks

1. **Token Rotation**: Monitor for any server-side token rotation requirements
2. **Security Updates**: Keep crypto dependencies updated
3. **Performance Monitoring**: Track authentication performance metrics
4. **Error Analysis**: Regular review of authentication error logs

### Emergency Procedures

1. **Authentication Outage**: Implement graceful degradation
2. **Security Breach**: Token invalidation and forced re-authentication
3. **Service Migration**: Dual authentication support during transitions

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: CrediBowpi Development Team
# Bowpi Authentication API Documentation

## Overview

This document provides comprehensive API documentation for the Bowpi authentication system integration in the CrediBowpi mobile application.

## Table of Contents

1. [Authentication Service API](#authentication-service-api)
2. [Bowpi Services API](#bowpi-services-api)
3. [HTTP Client API](#http-client-api)
4. [Storage API](#storage-api)
5. [Error Handling](#error-handling)
6. [Type Definitions](#type-definitions)
7. [Usage Examples](#usage-examples)

## Authentication Service API

### BowpiAuthService

Main authentication service interface for the application.

#### Constructor

```typescript
constructor()
```

Creates a new instance of BowpiAuthService with initialized dependencies.

#### Methods

##### login(email: string, password: string): Promise<LoginResult>

Authenticates a user with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
- `Promise<LoginResult>`: Authentication result

**Throws:**
- `BowpiAuthError`: When authentication fails

**Example:**
```typescript
try {
  const result = await authService.login('user@example.com', 'password123');
  if (result.success) {
    console.log('Login successful:', result.userData);
  }
} catch (error) {
  console.error('Login failed:', error.message);
}
```

##### logout(): Promise<void>

Logs out the current user and clears session data.

**Returns:**
- `Promise<void>`

**Example:**
```typescript
await authService.logout();
console.log('User logged out successfully');
```

##### isAuthenticated(): Promise<boolean>

Checks if a user is currently authenticated.

**Returns:**
- `Promise<boolean>`: True if authenticated, false otherwise

**Example:**
```typescript
const isAuth = await authService.isAuthenticated();
if (isAuth) {
  // User is authenticated
  navigateToMainApp();
} else {
  // User needs to login
  navigateToLogin();
}
```

##### getCurrentUser(): Promise<AuthTokenData | null>

Retrieves the current authenticated user's data.

**Returns:**
- `Promise<AuthTokenData | null>`: User data or null if not authenticated

**Example:**
```typescript
const userData = await authService.getCurrentUser();
if (userData) {
  console.log('Current user:', userData.username);
}
```

##### refreshSession(): Promise<void>

Refreshes the current session (if supported by server).

**Returns:**
- `Promise<void>`

**Example:**
```typescript
try {
  await authService.refreshSession();
  console.log('Session refreshed successfully');
} catch (error) {
  console.error('Session refresh failed:', error);
}
```

## Bowpi Services API

### BowpiOTPService

Generates OTP tokens for request authentication.

#### Methods

##### generateOTPToken(): string

Generates a new OTP token for request authentication.

**Returns:**
- `string`: Base64-encoded OTP token

**Example:**
```typescript
const otpToken = BowpiOTPService.generateOTPToken();
console.log('Generated OTP token:', otpToken);
```

**Token Format:**
```
Base64(randomNumber + timestamp + "4000" + timestamp)
```

### BowpiHMACService

Generates HMAC digests for request integrity.

#### Methods

##### generateDigestHmac(body: any, headers: Record<string, string>): Promise<{ digest: string, headers: Record<string, string> }>

Generates HMAC digest for request body and updates headers.

**Parameters:**
- `body` (any): Request body object
- `headers` (Record<string, string>): Existing headers object (modified in place)

**Returns:**
- `Promise<{ digest: string, headers: Record<string, string> }>`: Digest and updated headers

**Example:**
```typescript
const requestBody = { username: 'user@example.com', password: 'password' };
const headers = {};

const result = await BowpiHMACService.generateDigestHmac(requestBody, headers);

console.log('Generated digest:', result.digest);
console.log('Updated headers:', result.headers);
// headers now contains X-Date and X-Digest
```

### BowpiCryptoService

Handles JWT token decryption and validation.

#### Methods

##### decryptToken(encryptedToken: string): AuthTokenData

Decrypts an encrypted JWT token and extracts user data.

**Parameters:**
- `encryptedToken` (string): Encrypted JWT token from server

**Returns:**
- `AuthTokenData`: Decrypted user data

**Throws:**
- `Error`: When decryption fails or token is invalid

**Example:**
```typescript
try {
  const encryptedJWT = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...";
  const userData = BowpiCryptoService.decryptToken(encryptedJWT);
  
  console.log('User ID:', userData.userId);
  console.log('Username:', userData.username);
  console.log('Email:', userData.email);
} catch (error) {
  console.error('Token decryption failed:', error);
}
```

### BowpiAuthAdapter

Core authentication logic adapter.

#### Methods

##### login(email: string, password: string): Promise<AuthTokenData>

Performs the complete login flow with the Bowpi server.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
- `Promise<AuthTokenData>`: Authenticated user data

**Example:**
```typescript
const adapter = new BowpiAuthAdapter();
const userData = await adapter.login('user@example.com', 'password123');
```

##### invalidateSession(requestId: string): Promise<void>

Invalidates a user session on the server.

**Parameters:**
- `requestId` (string): User's session request ID

**Returns:**
- `Promise<void>`

**Example:**
```typescript
await adapter.invalidateSession(userData.userId);
```

## HTTP Client API

### SecureHttpClient

Enhanced HTTP client with Bowpi security features.

#### Methods

##### request<T>(config: RequestConfig): Promise<ResponseWs<T>>

Makes a secure HTTP request with automatic header injection.

**Parameters:**
- `config` (RequestConfig): Request configuration

**Returns:**
- `Promise<ResponseWs<T>>`: Server response

**Example:**
```typescript
const response = await httpClient.request({
  url: '/api/data',
  method: 'POST',
  data: { key: 'value' },
  headers: { 'Custom-Header': 'value' }
});

console.log('Response:', response.data);
```

##### get<T>(url: string, config?: RequestConfig): Promise<ResponseWs<T>>

Makes a GET request.

**Parameters:**
- `url` (string): Request URL
- `config` (RequestConfig, optional): Additional configuration

**Returns:**
- `Promise<ResponseWs<T>>`: Server response

##### post<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseWs<T>>

Makes a POST request.

**Parameters:**
- `url` (string): Request URL
- `data` (any, optional): Request body data
- `config` (RequestConfig, optional): Additional configuration

**Returns:**
- `Promise<ResponseWs<T>>`: Server response

##### put<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseWs<T>>

Makes a PUT request.

##### patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseWs<T>>

Makes a PATCH request.

##### delete<T>(url: string, config?: RequestConfig): Promise<ResponseWs<T>>

Makes a DELETE request.

## Storage API

### BowpiSecureStorageService

Secure storage service for authentication data.

#### Methods

##### storeSessionData(sessionData: BowpiSessionData): Promise<void>

Stores encrypted session data.

**Parameters:**
- `sessionData` (BowpiSessionData): Session data to store

**Example:**
```typescript
const sessionData = {
  decryptedToken: userData,
  lastRenewalDate: Date.now(),
  userId: userData.userId,
  userProfile: userData.userProfile,
  sessionId: userData.userId,
  expirationTime: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
};

await storageService.storeSessionData(sessionData);
```

##### getSessionData(): Promise<BowpiSessionData | null>

Retrieves stored session data.

**Returns:**
- `Promise<BowpiSessionData | null>`: Session data or null if not found

##### clearSessionData(): Promise<void>

Clears all stored session data.

##### storeUserProfile(profile: AuthTokenData['userProfile']): Promise<void>

Stores user profile data.

##### getUserProfile(): Promise<AuthTokenData['userProfile'] | null>

Retrieves stored user profile data.

## Error Handling

### BowpiAuthError

Custom error class for authentication-related errors.

#### Constructor

```typescript
constructor(type: BowpiAuthErrorType, message: string, originalError?: Error)
```

#### Properties

- `type` (BowpiAuthErrorType): Error type classification
- `message` (string): Error message
- `originalError` (Error, optional): Original error that caused this error

#### Error Types

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
```

#### Usage Example

```typescript
try {
  await authService.login(email, password);
} catch (error) {
  if (error instanceof BowpiAuthError) {
    switch (error.type) {
      case BowpiAuthErrorType.NETWORK_ERROR:
        showNetworkErrorMessage();
        break;
      case BowpiAuthErrorType.INVALID_CREDENTIALS:
        showInvalidCredentialsMessage();
        break;
      case BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT:
        showOfflineLoginMessage();
        break;
      default:
        showGenericErrorMessage();
    }
  }
}
```

## Type Definitions

### Core Interfaces

#### ResponseWs<T>

Server response wrapper interface.

```typescript
interface ResponseWs<T = any> {
  code: string;
  message: string;
  data: T;
  success: boolean;
}
```

#### AuthTokenData

Decrypted JWT token data structure.

```typescript
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

#### BowpiRequestHeaders

Required headers for Bowpi requests.

```typescript
interface BowpiRequestHeaders extends Record<string, string> {
  'Authorization': string;     // 'Basic Ym93cGk6Qm93cGkyMDE3'
  'Cache-Control': string;     // 'no-cache'
  'Pragma': string;           // 'no-cache'
  'OTPToken': string;         // Generated dynamically
}

interface BowpiMandatoryHeaders {
  'X-Date': string;           // For PUT/POST/PATCH only
  'X-Digest': string;         // For PUT/POST/PATCH only
  'bowpi-auth-token'?: string; // If session exists and not /login
}
```

#### LoginResult

Result of login operation.

```typescript
interface LoginResult {
  success: boolean;
  userData?: AuthTokenData;
  error?: BowpiAuthError;
}
```

#### RequestConfig

HTTP request configuration.

```typescript
interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}
```

#### BowpiSessionData

Session data storage structure.

```typescript
interface BowpiSessionData {
  decryptedToken: AuthTokenData;
  lastRenewalDate: number;
  userId: string;
  userProfile: AuthTokenData['userProfile'];
  sessionId: string;
  expirationTime: number;
}
```

## Usage Examples

### Complete Authentication Flow

```typescript
import { BowpiAuthService } from '@/services/BowpiAuthService';
import { BowpiAuthError, BowpiAuthErrorType } from '@/types/bowpi';

const authService = new BowpiAuthService();

// Login flow
const handleLogin = async (email: string, password: string) => {
  try {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(
        'Sin Conexión',
        'El login requiere conexión a internet. Por favor verifica tu conexión.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Attempt login
    const result = await authService.login(email, password);
    
    if (result.success) {
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' }],
      });
    }
  } catch (error) {
    if (error instanceof BowpiAuthError) {
      switch (error.type) {
        case BowpiAuthErrorType.INVALID_CREDENTIALS:
          Alert.alert('Error', 'Credenciales inválidas');
          break;
        case BowpiAuthErrorType.NETWORK_ERROR:
          Alert.alert('Error', 'Error de conexión. Intenta nuevamente.');
          break;
        default:
          Alert.alert('Error', 'Error inesperado. Intenta nuevamente.');
      }
    }
  }
};

// Logout flow
const handleLogout = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      Alert.alert(
        'Sin Conexión',
        'No podrás volver a iniciar sesión sin conexión a internet. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Cerrar Sesión', 
            style: 'destructive',
            onPress: async () => {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ]
      );
    } else {
      await authService.logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Session validation on app start
const validateSession = async () => {
  try {
    const isAuthenticated = await authService.isAuthenticated();
    
    if (isAuthenticated) {
      // User has valid session, go to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' }],
      });
    } else {
      // No valid session, show login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  } catch (error) {
    console.error('Session validation error:', error);
    // Default to login screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
};
```

### Making Authenticated Requests

```typescript
import { SecureHttpClient } from '@/services/SecureHttpClient';

const httpClient = new SecureHttpClient();

// GET request
const fetchUserData = async () => {
  try {
    const response = await httpClient.get('/api/user/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
};

// POST request with data
const createApplication = async (applicationData: any) => {
  try {
    const response = await httpClient.post('/api/applications', applicationData);
    return response.data;
  } catch (error) {
    console.error('Failed to create application:', error);
    throw error;
  }
};

// PUT request with authentication
const updateProfile = async (profileData: any) => {
  try {
    const response = await httpClient.put('/api/user/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};
```

### Custom Hook Integration

```typescript
import { useState, useEffect } from 'react';
import { BowpiAuthService } from '@/services/BowpiAuthService';

export const useBowpiAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthTokenData | null>(null);

  const authService = new BowpiAuthService();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.userData || null);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    checkAuthStatus,
  };
};
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: CrediBowpi Development Team
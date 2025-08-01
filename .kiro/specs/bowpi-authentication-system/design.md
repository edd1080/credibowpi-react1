# Bowpi Authentication System - Design

## Overview

Este documento describe el diseño técnico para la implementación del sistema de autenticación Bowpi, incluyendo la arquitectura, componentes, interfaces y estrategias de integración con el sistema existente.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Mobile App"
        UI[Login Screen]
        AuthStore[Auth Store]
        AuthService[Auth Service]
        HttpClient[Secure HTTP Client]
        
        subgraph "Bowpi Services"
            OTP[BowpiOTPService]
            HMAC[BowpiHMACService]
            Crypto[BowpiCryptoService]
            Interceptor[BowpiAuthenticationInterceptor]
            Adapter[BowpiAuthAdapter]
        end
        
        Storage[AsyncStorage]
        NetInfo[Network Detection]
    end
    
    subgraph "Bowpi Server"
        AuthAPI[Auth Microservice]
        SessionAPI[Session Management]
    end
    
    UI --> AuthService
    AuthService --> AuthStore
    AuthService --> Adapter
    Adapter --> OTP
    Adapter --> HMAC
    Adapter --> Crypto
    Adapter --> HttpClient
    HttpClient --> Interceptor
    Interceptor --> AuthAPI
    Interceptor --> SessionAPI
    AuthStore --> Storage
    AuthService --> NetInfo
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant LS as LoginScreen
    participant AS as AuthService
    participant BA as BowpiAuthAdapter
    participant OTP as BowpiOTPService
    participant HMAC as BowpiHMACService
    participant HC as HttpClient
    participant API as Bowpi API
    participant CS as CryptoService
    participant Store as AsyncStorage

    U->>LS: Enter credentials
    LS->>AS: login(email, password)
    AS->>BA: login(email, password)
    BA->>OTP: generateOTPToken()
    BA->>HMAC: generateDigestHmac(body, headers)
    BA->>HC: POST /auth/login
    HC->>API: Request with headers
    API-->>HC: ResponseWs<JWT>
    HC-->>BA: Encrypted JWT
    BA->>CS: decryptToken(jwt)
    CS-->>BA: AuthTokenData
    BA->>Store: Save session data
    BA-->>AS: Login success
    AS-->>LS: Navigate to app
```

## Components and Interfaces

### 1. Core Interfaces

#### ResponseWs Interface
```typescript
export interface ResponseWs<T = any> {
  code: string;
  message: string;
  data: T;
  success: boolean;
}
```

#### AuthTokenData Interface
```typescript
export interface AuthTokenData {
  // JWT metadata
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  jti: string;
  
  // Decrypted profile data
  userId: string;                    // requestId como identificador principal
  username: string;
  email: string;
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

#### BowpiRequestHeaders Interface
```typescript
export interface BowpiRequestHeaders extends Record<string, string> {
  'Authorization': string;     // 'Basic Ym93cGk6Qm93cGkyMDE3'
  'Cache-Control': string;     // 'no-cache'
  'Pragma': string;           // 'no-cache'
  'OTPToken': string;         // Generado dinámicamente
}

export type BowpiMandatoryHeaders = {
  'X-Date': string;           // Solo PUT/POST/PATCH
  'X-Digest': string;         // Solo PUT/POST/PATCH
  'bowpi-auth-token'?: string; // Solo si existe sesión y no es /login
}
```

### 2. Service Layer Architecture

#### BowpiAuthService (New)
```typescript
export class BowpiAuthService {
  private authAdapter: BowpiAuthAdapter;
  private authStore: AuthStore;
  private networkService: NetworkService;
  
  async login(email: string, password: string): Promise<LoginResult>;
  async logout(): Promise<void>;
  async isAuthenticated(): Promise<boolean>;
  async getCurrentUser(): Promise<AuthTokenData | null>;
  private async handleOfflineLogin(): Promise<void>;
  private async handleOfflineLogout(): Promise<boolean>;
}
```

#### SecureHttpClient (Enhanced)
```typescript
export class SecureHttpClient {
  private interceptor: BowpiAuthenticationInterceptor;
  private allowedDomains: string[];
  
  async request<T>(config: RequestConfig): Promise<ResponseWs<T>>;
  private validateDomain(url: string): boolean;
  private enforceHttpsInProduction(url: string): void;
  private shouldCache(url: string): boolean;
}
```

### 3. Integration Points

#### AuthStore Integration
```typescript
// Existing AuthStore enhancement
interface AuthState {
  // Existing fields...
  bowpiToken?: string;
  bowpiUserData?: AuthTokenData;
  sessionId?: string;
  isOfflineMode: boolean;
}

interface AuthActions {
  // Existing methods...
  setBowpiAuth: (token: string, userData: AuthTokenData) => void;
  clearBowpiAuth: () => void;
  setOfflineMode: (offline: boolean) => void;
}
```

#### LoginScreen Integration
```typescript
// Enhanced LoginScreen
export const LoginScreen: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const { loginWithBowpi, isLoading, error } = useAuthStore();
  
  const handleLogin = async () => {
    if (!isConnected) {
      Alert.alert(
        'Sin Conexión',
        'El login requiere conexión a internet. Por favor verifica tu conexión.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    
    await loginWithBowpi(email, password);
  };
  
  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);
};
```

## Data Models

### 1. Storage Schema

#### AsyncStorage Keys
```typescript
export const BOWPI_STORAGE_KEYS = {
  ENCRYPTED_TOKEN: '@bowpi_encrypted_token',
  SESSION_DATA: '@bowpi_session_data',
  SESSION_ID: '@bowpi_session_id',
  OFFLINE_QUEUE: '@bowpi_offline_queue'
} as const;
```

#### Session Data Structure
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

### 2. Network Request Models

#### Login Request
```typescript
interface BowpiLoginRequest {
  username: string;
  password: string;
  application: 'MOBILE';
  isCheckVersion: false;
}
```

#### Login Response
```typescript
interface BowpiLoginResponse extends ResponseWs<string> {
  // data contains encrypted JWT token
}
```

## Error Handling

### 1. Error Types

```typescript
export enum BowpiAuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  OFFLINE_LOGIN_ATTEMPT = 'OFFLINE_LOGIN_ATTEMPT'
}

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
```

### 2. Error Handling Strategy

```typescript
// Error handling in AuthService
async login(email: string, password: string): Promise<LoginResult> {
  try {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new BowpiAuthError(
        BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT,
        'Login requires internet connection'
      );
    }
    
    // Proceed with login
    const result = await this.authAdapter.login(email, password);
    return result;
    
  } catch (error) {
    if (error instanceof BowpiAuthError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new BowpiAuthError(
      BowpiAuthErrorType.SERVER_ERROR,
      'Login failed due to server error',
      error as Error
    );
  }
}
```

## Testing Strategy

### 1. Unit Testing

#### Service Testing
```typescript
describe('BowpiAuthService', () => {
  describe('login', () => {
    it('should throw error when offline', async () => {
      // Mock NetInfo to return offline
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false });
      
      await expect(authService.login('test@test.com', 'password'))
        .rejects.toThrow(BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT);
    });
    
    it('should process successful login', async () => {
      // Mock successful API response
      mockHttpClient.request.mockResolvedValue({
        success: true,
        data: 'encrypted_jwt_token',
        code: '200',
        message: 'Success'
      });
      
      const result = await authService.login('test@test.com', 'password');
      expect(result.success).toBe(true);
    });
  });
});
```

#### Crypto Service Testing
```typescript
describe('BowpiCryptoService', () => {
  it('should decrypt token correctly', () => {
    const mockEncryptedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...';
    const result = cryptoService.decryptToken(mockEncryptedToken);
    
    expect(result.userId).toBeDefined();
    expect(result.userProfile.requestId).toBeDefined();
  });
});
```

### 2. Integration Testing

#### End-to-End Authentication Flow
```typescript
describe('Authentication Flow', () => {
  it('should complete full login flow', async () => {
    // 1. User enters credentials
    fireEvent.changeText(emailInput, 'test@bowpi.com');
    fireEvent.changeText(passwordInput, 'password123');
    
    // 2. Submit login
    fireEvent.press(loginButton);
    
    // 3. Verify API call
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/auth/login'),
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Basic Ym93cGk6Qm93cGkyMDE3',
            'OTPToken': expect.any(String),
            'X-Digest': expect.any(String)
          })
        })
      );
    });
    
    // 4. Verify navigation to main app
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('TabNavigator');
    });
  });
});
```

### 3. Security Testing

#### Header Generation Testing
```typescript
describe('Security Headers', () => {
  it('should generate correct OTP token format', () => {
    const token = otpService.generateOTPToken();
    const decoded = atob(token);
    
    // Verify token structure matches expected format
    expect(decoded).toMatch(/^\d{7}\d{4}\d+4000\d+$/);
  });
  
  it('should generate valid HMAC digest', async () => {
    const body = { test: 'data' };
    const headers = {};
    
    const digest = await hmacService.generateDigestHmac(body, headers);
    
    expect(digest).toBeDefined();
    expect(headers['X-Date']).toBeDefined();
    expect(typeof digest).toBe('string');
  });
});
```

## Performance Considerations

### 1. Caching Strategy
- **No caching** for non-authentication microservices
- **Persistent storage** only for authentication tokens and user data
- **Memory caching** for current session data to avoid repeated AsyncStorage reads

### 2. Network Optimization
- **Request batching** for multiple API calls when possible
- **Retry logic** with exponential backoff for failed requests
- **Connection pooling** for HTTP client

### 3. Offline Performance
- **Immediate feedback** for offline login attempts
- **Fast session validation** using cached token data
- **Minimal storage operations** during authentication checks

## Security Considerations

### 1. Token Security
- **Encrypted storage** of JWT tokens using AsyncStorage
- **No token expiration** unless explicit logout (offline-first requirement)
- **Automatic session invalidation** on authentication errors (when online)

### 2. Network Security
- **HTTPS enforcement** in production
- **Domain validation** for all requests
- **Header validation** and automatic generation

### 3. Error Security
- **No sensitive data** in error messages
- **Secure logging** that doesn't expose credentials
- **Graceful degradation** for crypto failures

## Migration Strategy

### 1. Gradual Integration
1. **Phase 1**: Implement Bowpi services alongside existing auth
2. **Phase 2**: Update LoginScreen to use Bowpi auth
3. **Phase 3**: Migrate existing sessions to Bowpi format
4. **Phase 4**: Remove old authentication system

### 2. Backward Compatibility
- **Dual authentication** support during migration
- **Session migration** utilities for existing users
- **Fallback mechanisms** for service failures

### 3. Testing Strategy
- **Feature flags** for Bowpi authentication
- **A/B testing** for gradual rollout
- **Monitoring** for authentication success rates
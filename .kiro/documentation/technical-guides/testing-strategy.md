# Testing Strategy & Standards

## Overview

Esta guía establece la estrategia integral de testing para CrediBowpi Mobile, incluyendo estándares, patrones y mejores prácticas para garantizar la calidad y confiabilidad del código en un entorno offline-first.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Categories](#test-categories)
3. [Testing Patterns](#testing-patterns)
4. [Test Structure & Organization](#test-structure--organization)
5. [Mock Strategies](#mock-strategies)
6. [Authentication Testing](#authentication-testing)
7. [Database Testing](#database-testing)
8. [Offline Testing](#offline-testing)
9. [Security Testing](#security-testing)
10. [Performance Testing](#performance-testing)
11. [E2E Testing](#e2e-testing)
12. [Test Coverage Standards](#test-coverage-standards)
13. [CI/CD Integration](#cicd-integration)
14. [Testing Tools & Setup](#testing-tools--setup)

## Testing Philosophy

### Core Principles

1. **Test-Driven Development (TDD)**: Escribir tests antes del código cuando sea posible
2. **Offline-First Testing**: Todos los tests deben funcionar sin conectividad de red
3. **Realistic Scenarios**: Tests que reflejen casos de uso reales de agentes de campo
4. **Fast Feedback**: Tests rápidos que se ejecuten en menos de 30 segundos
5. **Deterministic**: Tests que produzcan resultados consistentes
6. **Maintainable**: Tests fáciles de entender y mantener

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               /Integration\
              /__________\
             /            \
            /     Unit     \
           /________________\
```

- **Unit Tests (70%)**: Funciones individuales, componentes aislados
- **Integration Tests (20%)**: Interacción entre servicios y componentes
- **E2E Tests (10%)**: Flujos completos de usuario

## Test Categories

### 1. Unit Tests

#### Services Testing

```typescript
// src/services/__tests__/AuthStoreManager.test.ts
import { AuthStoreManager } from '../AuthStoreManager';
import { BowpiAuthProvider } from '../auth/providers/BowpiAuthProvider';
import { LegacyAuthProvider } from '../auth/providers/LegacyAuthProvider';

describe('AuthStoreManager', () => {
  let authStoreManager: AuthStoreManager;
  
  beforeEach(() => {
    authStoreManager = new AuthStoreManager();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUserData = {
        userId: 'test-user-id',
        username: 'test@test.com',
        userProfile: { names: 'Test User' }
      };

      const mockProvider = {
        login: jest.fn().mockResolvedValue({
          success: true,
          userData: mockUserData
        })
      };

      authStoreManager.setCurrentProvider(mockProvider as any);

      const result = await authStoreManager.login('test@test.com', 'password');

      expect(result.success).toBe(true);
      expect(result.userData).toEqual(mockUserData);
      expect(mockProvider.login).toHaveBeenCalledWith('test@test.com', 'password');
    });

    it('should handle authentication errors gracefully', async () => {
      const mockProvider = {
        login: jest.fn().mockRejectedValue(new Error('Invalid credentials'))
      };

      authStoreManager.setCurrentProvider(mockProvider as any);

      await expect(authStoreManager.login('test@test.com', 'wrong-password'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('switchAuthProvider', () => {
    it('should switch providers successfully', async () => {
      const result = await authStoreManager.switchAuthProvider('legacy');

      expect(result.success).toBe(true);
      expect(result.newProvider).toBe('legacy');
    });

    it('should validate provider switch conditions', async () => {
      // Mock authenticated state
      authStoreManager.setState({ isAuthenticated: true });

      const validation = await authStoreManager.validateProviderSwitch('bowpi');

      expect(validation.canSwitch).toBe(true);
      expect(validation.warnings).toContain('Current session will be terminated');
    });
  });
});
```

#### Component Testing

```typescript
// src/components/atoms/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    const { getByTestId } = render(
      <Button title="Test Button" loading onPress={() => {}} />
    );
    
    expect(getByTestId('button-loading-indicator')).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" disabled onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('applies correct variant styles', () => {
    const { getByTestId } = render(
      <Button title="Test Button" variant="primary" onPress={() => {}} />
    );
    
    const button = getByTestId('button-container');
    expect(button.props.style).toMatchObject({
      backgroundColor: expect.any(String)
    });
  });
});
```

### 2. Integration Tests

#### Authentication Integration

```typescript
// src/__tests__/integration/AuthenticationIntegration.test.ts
import { AuthStoreManager } from '../../services/AuthStoreManager';
import { AuthProviderFactory } from '../../services/auth/AuthProviderFactory';
import { AuthConfiguration } from '../../services/auth/AuthConfiguration';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Authentication Integration', () => {
  let authStoreManager: AuthStoreManager;
  let authProviderFactory: AuthProviderFactory;
  let authConfiguration: AuthConfiguration;

  beforeEach(async () => {
    await AsyncStorage.clear();
    
    authConfiguration = new AuthConfiguration();
    authProviderFactory = new AuthProviderFactory(authConfiguration);
    authStoreManager = new AuthStoreManager(authProviderFactory, authConfiguration);
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full login flow with Bowpi provider', async () => {
      // Setup
      await authConfiguration.setAuthType('bowpi');
      
      // Mock network response
      const mockResponse = {
        success: true,
        data: 'encrypted_token_data'
      };
      
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      // Execute login
      const result = await authStoreManager.login('test@bowpi.com', 'password');

      // Verify results
      expect(result.success).toBe(true);
      expect(result.userData).toBeDefined();
      
      // Verify session storage
      const storedSession = await AsyncStorage.getItem('@bowpi_session_data');
      expect(storedSession).toBeTruthy();
      
      // Verify authentication state
      expect(authStoreManager.isAuthenticated()).toBe(true);
    });

    it('should handle provider switching during authentication', async () => {
      // Start with Legacy
      await authConfiguration.setAuthType('legacy');
      
      // Login with Legacy
      const legacyResult = await authStoreManager.login('test@test.com', 'password');
      expect(legacyResult.success).toBe(true);
      
      // Switch to Bowpi
      const switchResult = await authStoreManager.switchAuthProvider('bowpi');
      expect(switchResult.success).toBe(true);
      
      // Verify state is cleared
      expect(authStoreManager.isAuthenticated()).toBe(false);
      
      // Verify new provider is active
      const currentProvider = await authProviderFactory.getCurrentProvider();
      expect(currentProvider.type).toBe('bowpi');
    });
  });

  describe('Session Management Integration', () => {
    it('should restore session on app restart', async () => {
      // Create session
      const sessionData = {
        decryptedToken: { userId: 'test-user', username: 'test@test.com' },
        sessionId: 'test-session',
        lastRenewalDate: Date.now()
      };
      
      await AsyncStorage.setItem('@bowpi_session_data', JSON.stringify(sessionData));
      
      // Simulate app restart
      const newAuthStoreManager = new AuthStoreManager(authProviderFactory, authConfiguration);
      await newAuthStoreManager.initialize();
      
      // Verify session restoration
      expect(newAuthStoreManager.isAuthenticated()).toBe(true);
      expect(newAuthStoreManager.getCurrentUser()).toEqual(sessionData.decryptedToken);
    });

    it('should handle corrupted session data', async () => {
      // Store corrupted data
      await AsyncStorage.setItem('@bowpi_session_data', 'corrupted-json');
      
      // Initialize manager
      const newAuthStoreManager = new AuthStoreManager(authProviderFactory, authConfiguration);
      await newAuthStoreManager.initialize();
      
      // Verify graceful handling
      expect(newAuthStoreManager.isAuthenticated()).toBe(false);
      
      // Verify cleanup
      const storedData = await AsyncStorage.getItem('@bowpi_session_data');
      expect(storedData).toBeNull();
    });
  });
});
```

#### Database Integration

```typescript
// src/__tests__/integration/DatabaseIntegration.test.ts
import { DatabaseService } from '../../services/DatabaseService';
import { SyncService } from '../../services/SyncService';
import { ApplicationData } from '../../types/application';

describe('Database Integration', () => {
  let databaseService: DatabaseService;
  let syncService: SyncService;

  beforeEach(async () => {
    databaseService = new DatabaseService();
    syncService = new SyncService(databaseService);
    
    await databaseService.initialize();
    await databaseService.clearAllData(); // Clean slate for each test
  });

  afterEach(async () => {
    await databaseService.close();
  });

  describe('Application Data Flow', () => {
    it('should create, read, update, and delete applications', async () => {
      const applicationData: ApplicationData = {
        id: 'test-app-1',
        applicantName: 'Juan Pérez',
        dpi: '1234567890123',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create
      const created = await databaseService.createApplication(applicationData);
      expect(created.id).toBe(applicationData.id);

      // Read
      const retrieved = await databaseService.getApplication(applicationData.id);
      expect(retrieved).toEqual(applicationData);

      // Update
      const updatedData = { ...applicationData, applicantName: 'Juan Carlos Pérez' };
      const updated = await databaseService.updateApplication(applicationData.id, updatedData);
      expect(updated.applicantName).toBe('Juan Carlos Pérez');

      // Delete
      await databaseService.deleteApplication(applicationData.id);
      const deleted = await databaseService.getApplication(applicationData.id);
      expect(deleted).toBeNull();
    });

    it('should handle concurrent operations safely', async () => {
      const applications = Array.from({ length: 10 }, (_, i) => ({
        id: `test-app-${i}`,
        applicantName: `Applicant ${i}`,
        dpi: `123456789012${i}`,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Create all applications concurrently
      const createPromises = applications.map(app => 
        databaseService.createApplication(app)
      );
      
      const results = await Promise.all(createPromises);
      expect(results).toHaveLength(10);

      // Verify all were created
      const allApplications = await databaseService.getAllApplications();
      expect(allApplications).toHaveLength(10);
    });
  });

  describe('Sync Integration', () => {
    it('should queue operations for offline sync', async () => {
      const applicationData: ApplicationData = {
        id: 'test-app-sync',
        applicantName: 'Sync Test',
        dpi: '9876543210987',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create application offline
      await databaseService.createApplication(applicationData);
      
      // Queue for sync
      await syncService.queueOperation({
        type: 'CREATE',
        entity: 'APPLICATION',
        data: applicationData
      });

      // Verify operation is queued
      const pendingOps = await syncService.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].data).toEqual(applicationData);
    });

    it('should handle sync conflicts', async () => {
      const localData: ApplicationData = {
        id: 'conflict-app',
        applicantName: 'Local Version',
        dpi: '1111111111111',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const serverData: ApplicationData = {
        ...localData,
        applicantName: 'Server Version',
        updatedAt: new Date(Date.now() + 1000).toISOString() // Server is newer
      };

      // Create local version
      await databaseService.createApplication(localData);

      // Simulate server conflict resolution
      const resolved = await syncService.resolveConflict(localData, serverData);
      
      // Server version should win (newer timestamp)
      expect(resolved.applicantName).toBe('Server Version');
      
      // Verify database is updated
      const stored = await databaseService.getApplication('conflict-app');
      expect(stored?.applicantName).toBe('Server Version');
    });
  });
});
```

### 3. E2E Tests

#### Critical User Flows

```typescript
// src/__tests__/e2e/CriticalUserFlows.test.ts
import { by, device, element, expect as detoxExpect } from 'detox';

describe('Critical User Flows', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should complete login flow successfully', async () => {
      // Navigate to login screen
      await detoxExpected(element(by.id('login-screen'))).toBeVisible();
      
      // Enter credentials
      await element(by.id('email-input')).typeText('test@bowpi.com');
      await element(by.id('password-input')).typeText('password123');
      
      // Tap login button
      await element(by.id('login-button')).tap();
      
      // Wait for navigation to main screen
      await detoxExpected(element(by.id('main-screen'))).toBeVisible();
      
      // Verify user is logged in
      await detoxExpected(element(by.text('Bienvenido'))).toBeVisible();
    });

    it('should handle login errors gracefully', async () => {
      await element(by.id('email-input')).typeText('invalid@test.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();
      
      // Verify error message
      await detoxExpected(element(by.text('Credenciales inválidas'))).toBeVisible();
      
      // Verify still on login screen
      await detoxExpected(element(by.id('login-screen'))).toBeVisible();
    });
  });

  describe('Application Creation Flow', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('email-input')).typeText('test@bowpi.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await detoxExpected(element(by.id('main-screen'))).toBeVisible();
    });

    it('should create new application successfully', async () => {
      // Navigate to new application
      await element(by.id('new-application-button')).tap();
      await detoxExpected(element(by.id('application-form'))).toBeVisible();
      
      // Fill basic information
      await element(by.id('applicant-name-input')).typeText('Juan Pérez');
      await element(by.id('dpi-input')).typeText('1234567890123');
      await element(by.id('email-input')).typeText('juan@test.com');
      
      // Save application
      await element(by.id('save-button')).tap();
      
      // Verify success message
      await detoxExpected(element(by.text('Solicitud guardada'))).toBeVisible();
      
      // Verify navigation to application list
      await detoxExpected(element(by.id('applications-list'))).toBeVisible();
      await detoxExpected(element(by.text('Juan Pérez'))).toBeVisible();
    });

    it('should handle offline application creation', async () => {
      // Simulate offline mode
      await device.setNetworkConnection('none');
      
      // Create application
      await element(by.id('new-application-button')).tap();
      await element(by.id('applicant-name-input')).typeText('Offline User');
      await element(by.id('dpi-input')).typeText('9876543210987');
      await element(by.id('save-button')).tap();
      
      // Verify offline indicator
      await detoxExpected(element(by.text('Sin conexión'))).toBeVisible();
      await detoxExpected(element(by.text('Se sincronizará cuando tengas conexión'))).toBeVisible();
      
      // Restore connection
      await device.setNetworkConnection('wifi');
      
      // Verify sync indicator
      await detoxExpected(element(by.text('Sincronizando...'))).toBeVisible();
    });
  });

  describe('Provider Switching Flow', () => {
    it('should switch authentication providers', async () => {
      // Login first
      await element(by.id('email-input')).typeText('test@bowpi.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      
      // Navigate to developer settings
      await element(by.id('settings-button')).tap();
      await element(by.id('developer-settings-button')).tap();
      
      // Switch to Legacy provider
      await element(by.id('legacy-provider-button')).tap();
      await element(by.text('Confirmar')).tap();
      
      // Verify logout and return to login
      await detoxExpected(element(by.id('login-screen'))).toBeVisible();
      
      // Verify provider indicator
      await detoxExpected(element(by.text('Legacy Authentication'))).toBeVisible();
    });
  });
});
```

## Testing Patterns

### 1. Mock Strategies

#### Network Mocking

```typescript
// src/__tests__/utils/networkMocks.ts
export class NetworkMockManager {
  private static originalFetch: typeof fetch;
  private static mockResponses: Map<string, any> = new Map();

  static setup(): void {
    this.originalFetch = global.fetch;
    global.fetch = jest.fn(this.mockFetch.bind(this));
  }

  static teardown(): void {
    global.fetch = this.originalFetch;
    this.mockResponses.clear();
  }

  static mockResponse(url: string, response: any): void {
    this.mockResponses.set(url, response);
  }

  static mockNetworkError(url: string): void {
    this.mockResponses.set(url, { error: 'Network Error' });
  }

  static mockTimeout(url: string): void {
    this.mockResponses.set(url, { timeout: true });
  }

  private static async mockFetch(url: string, options?: RequestInit): Promise<Response> {
    const mockResponse = this.mockResponses.get(url);
    
    if (!mockResponse) {
      throw new Error(`No mock response defined for ${url}`);
    }

    if (mockResponse.error) {
      throw new Error(mockResponse.error);
    }

    if (mockResponse.timeout) {
      await new Promise(resolve => setTimeout(resolve, 30000));
      throw new Error('Request timeout');
    }

    return {
      ok: mockResponse.ok ?? true,
      status: mockResponse.status ?? 200,
      json: () => Promise.resolve(mockResponse.data || mockResponse),
      text: () => Promise.resolve(JSON.stringify(mockResponse.data || mockResponse))
    } as Response;
  }
}

// Usage in tests
describe('API Service', () => {
  beforeEach(() => {
    NetworkMockManager.setup();
  });

  afterEach(() => {
    NetworkMockManager.teardown();
  });

  it('should handle successful API response', async () => {
    NetworkMockManager.mockResponse('/api/login', {
      success: true,
      data: { token: 'mock-token' }
    });

    const result = await apiService.login('test@test.com', 'password');
    expect(result.success).toBe(true);
  });

  it('should handle network errors', async () => {
    NetworkMockManager.mockNetworkError('/api/login');

    await expect(apiService.login('test@test.com', 'password'))
      .rejects.toThrow('Network Error');
  });
});
```

#### Database Mocking

```typescript
// src/__tests__/utils/databaseMocks.ts
export class DatabaseMockManager {
  private static mockData: Map<string, any> = new Map();
  private static mockQueries: Map<string, jest.Mock> = new Map();

  static setup(): void {
    // Mock SQLite operations
    jest.mock('expo-sqlite', () => ({
      openDatabase: jest.fn(() => ({
        transaction: jest.fn((callback) => {
          callback({
            executeSql: this.mockExecuteSql.bind(this)
          });
        })
      }))
    }));
  }

  static mockTable(tableName: string, data: any[]): void {
    this.mockData.set(tableName, data);
  }

  static mockQuery(query: string, mockFn: jest.Mock): void {
    this.mockQueries.set(query, mockFn);
  }

  private static mockExecuteSql(
    query: string,
    params: any[],
    successCallback?: (tx: any, result: any) => void,
    errorCallback?: (tx: any, error: any) => void
  ): void {
    try {
      const mockFn = this.mockQueries.get(query);
      if (mockFn) {
        const result = mockFn(params);
        successCallback?.(null, result);
        return;
      }

      // Default behavior for common queries
      if (query.includes('SELECT')) {
        const tableName = this.extractTableName(query);
        const data = this.mockData.get(tableName) || [];
        successCallback?.(null, { rows: { _array: data } });
      } else if (query.includes('INSERT')) {
        successCallback?.(null, { insertId: Date.now() });
      } else {
        successCallback?.(null, { rowsAffected: 1 });
      }
    } catch (error) {
      errorCallback?.(null, error);
    }
  }

  private static extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : '';
  }
}
```

### 2. Authentication Testing Patterns

```typescript
// src/__tests__/patterns/authenticationPatterns.ts
export class AuthenticationTestPatterns {
  // Test authentication with different providers
  static async testProviderAuthentication(
    providerType: 'bowpi' | 'legacy',
    credentials: { email: string; password: string }
  ): Promise<void> {
    const authStoreManager = new AuthStoreManager();
    await authStoreManager.switchAuthProvider(providerType);
    
    const result = await authStoreManager.login(credentials.email, credentials.password);
    
    expect(result.success).toBe(true);
    expect(result.userData).toBeDefined();
    expect(authStoreManager.isAuthenticated()).toBe(true);
  }

  // Test session persistence
  static async testSessionPersistence(sessionData: any): Promise<void> {
    // Store session
    await AsyncStorage.setItem('@bowpi_session_data', JSON.stringify(sessionData));
    
    // Create new manager instance (simulates app restart)
    const newManager = new AuthStoreManager();
    await newManager.initialize();
    
    // Verify session restoration
    expect(newManager.isAuthenticated()).toBe(true);
    expect(newManager.getCurrentUser()).toEqual(sessionData.decryptedToken);
  }

  // Test authentication errors
  static async testAuthenticationError(
    errorType: 'network' | 'credentials' | 'server',
    expectedErrorMessage: string
  ): Promise<void> {
    const authStoreManager = new AuthStoreManager();
    
    // Setup appropriate mock based on error type
    switch (errorType) {
      case 'network':
        NetworkMockManager.mockNetworkError('/auth/login');
        break;
      case 'credentials':
        NetworkMockManager.mockResponse('/auth/login', {
          success: false,
          message: 'Invalid credentials'
        });
        break;
      case 'server':
        NetworkMockManager.mockResponse('/auth/login', {
          status: 500,
          error: 'Internal server error'
        });
        break;
    }
    
    await expect(authStoreManager.login('test@test.com', 'password'))
      .rejects.toThrow(expectedErrorMessage);
  }
}
```

### 3. Offline Testing Patterns

```typescript
// src/__tests__/patterns/offlinePatterns.ts
export class OfflineTestPatterns {
  // Test offline data operations
  static async testOfflineDataOperation(
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    data: any
  ): Promise<void> {
    // Simulate offline mode
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({
      isConnected: false,
      type: 'none'
    } as any);

    const databaseService = new DatabaseService();
    const syncService = new SyncService(databaseService);

    let result;
    switch (operation) {
      case 'create':
        result = await databaseService.createEntity(entityType, data);
        break;
      case 'update':
        result = await databaseService.updateEntity(entityType, data.id, data);
        break;
      case 'delete':
        result = await databaseService.deleteEntity(entityType, data.id);
        break;
    }

    // Verify operation succeeded locally
    expect(result).toBeDefined();

    // Verify operation was queued for sync
    const pendingOps = await syncService.getPendingOperations();
    expect(pendingOps.some(op => op.type === operation.toUpperCase())).toBe(true);
  }

  // Test sync when coming back online
  static async testSyncOnReconnection(): Promise<void> {
    const syncService = new SyncService();
    
    // Queue some operations while offline
    await syncService.queueOperation({
      type: 'CREATE',
      entity: 'APPLICATION',
      data: { name: 'Test App' }
    });

    // Simulate coming back online
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({
      isConnected: true,
      type: 'wifi'
    } as any);

    // Mock successful server responses
    NetworkMockManager.mockResponse('/api/applications', {
      success: true,
      data: { id: 'server-id' }
    });

    // Trigger sync
    await syncService.startSync();

    // Verify operations were processed
    const pendingOps = await syncService.getPendingOperations();
    expect(pendingOps).toHaveLength(0);
  }

  // Test conflict resolution
  static async testConflictResolution(
    localData: any,
    serverData: any,
    expectedResolution: any
  ): Promise<void> {
    const syncService = new SyncService();
    
    const resolved = await syncService.resolveConflict(localData, serverData);
    
    expect(resolved).toEqual(expectedResolution);
  }
}
```

## Security Testing

### Security Audit Tests

```typescript
// src/__tests__/security/SecurityAudit.test.ts
describe('Security Audit', () => {
  describe('Data Encryption', () => {
    it('should encrypt sensitive data before storage', async () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'jwt-token-here',
        personalInfo: { dpi: '1234567890123' }
      };

      await secureStorage.store('sensitive-key', sensitiveData);
      
      // Verify raw storage doesn't contain plaintext
      const rawData = await AsyncStorage.getItem('sensitive-key');
      expect(rawData).not.toContain('secret123');
      expect(rawData).not.toContain('jwt-token-here');
      expect(rawData).not.toContain('1234567890123');
    });

    it('should validate data integrity on retrieval', async () => {
      const originalData = { test: 'data' };
      await secureStorage.store('integrity-test', originalData);
      
      // Tamper with stored data
      const rawData = await AsyncStorage.getItem('integrity-test');
      await AsyncStorage.setItem('integrity-test', rawData + 'tampered');
      
      // Should detect tampering
      await expect(secureStorage.retrieve('integrity-test'))
        .rejects.toThrow('Data integrity check failed');
    });
  });

  describe('Input Validation', () => {
    it('should reject malicious input patterns', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE users;',
        '${process.env.SECRET}',
        '../../../etc/passwd'
      ];

      for (const input of maliciousInputs) {
        expect(() => validateUserInput(input))
          .toThrow('Invalid input detected');
      }
    });

    it('should sanitize user inputs', () => {
      const unsafeInput = '<script>alert("test")</script>';
      const sanitized = sanitizeInput(unsafeInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });
  });

  describe('Authentication Security', () => {
    it('should enforce secure session management', async () => {
      const authStoreManager = new AuthStoreManager();
      
      // Login
      await authStoreManager.login('test@test.com', 'password');
      
      // Verify session has expiration
      const session = await authStoreManager.getCurrentSession();
      expect(session.expirationTime).toBeDefined();
      expect(session.expirationTime).toBeGreaterThan(Date.now());
    });

    it('should invalidate sessions on security events', async () => {
      const authStoreManager = new AuthStoreManager();
      await authStoreManager.login('test@test.com', 'password');
      
      // Simulate security event
      await authStoreManager.handleSecurityEvent('SUSPICIOUS_ACTIVITY');
      
      // Verify session is invalidated
      expect(authStoreManager.isAuthenticated()).toBe(false);
    });
  });

  describe('Network Security', () => {
    it('should enforce HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      expect(() => {
        validateApiEndpoint('http://insecure-api.com');
      }).toThrow('HTTPS required in production');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should validate SSL certificates', async () => {
      // Mock certificate validation
      const mockCert = 'invalid-certificate';
      
      await expect(validateSSLCertificate(mockCert))
        .rejects.toThrow('Invalid SSL certificate');
    });
  });
});
```

## Performance Testing

### Performance Benchmarks

```typescript
// src/__tests__/performance/PerformanceBenchmarks.test.ts
describe('Performance Benchmarks', () => {
  describe('Database Operations', () => {
    it('should perform CRUD operations within acceptable time limits', async () => {
      const databaseService = new DatabaseService();
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        name: `Test Application ${i}`,
        data: { field1: 'value1', field2: 'value2' }
      }));

      // Measure create operations
      const createStart = performance.now();
      await Promise.all(testData.map(data => databaseService.create('applications', data)));
      const createTime = performance.now() - createStart;
      
      expect(createTime).toBeLessThan(1000); // Should complete in under 1 second

      // Measure read operations
      const readStart = performance.now();
      await Promise.all(testData.map(data => databaseService.get('applications', data.id)));
      const readTime = performance.now() - readStart;
      
      expect(readTime).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle large datasets efficiently', async () => {
      const databaseService = new DatabaseService();
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-${i}`,
        name: `Large Dataset Item ${i}`,
        description: 'A'.repeat(1000) // 1KB of data per item
      }));

      const start = performance.now();
      await databaseService.bulkInsert('large_items', largeDataset);
      const insertTime = performance.now() - start;
      
      expect(insertTime).toBeLessThan(5000); // Should complete in under 5 seconds

      // Test query performance
      const queryStart = performance.now();
      const results = await databaseService.query('SELECT * FROM large_items LIMIT 100');
      const queryTime = performance.now() - queryStart;
      
      expect(queryTime).toBeLessThan(100); // Should complete in under 100ms
      expect(results).toHaveLength(100);
    });
  });

  describe('Sync Performance', () => {
    it('should sync operations efficiently', async () => {
      const syncService = new SyncService();
      
      // Queue multiple operations
      const operations = Array.from({ length: 50 }, (_, i) => ({
        type: 'CREATE' as const,
        entity: 'APPLICATION',
        data: { id: `sync-${i}`, name: `Sync Test ${i}` }
      }));

      for (const op of operations) {
        await syncService.queueOperation(op);
      }

      // Mock network responses
      NetworkMockManager.mockResponse('/api/applications', {
        success: true,
        data: { id: 'server-id' }
      });

      // Measure sync time
      const syncStart = performance.now();
      await syncService.startSync();
      const syncTime = performance.now() - syncStart;
      
      expect(syncTime).toBeLessThan(10000); // Should complete in under 10 seconds
      
      // Verify all operations were processed
      const pendingOps = await syncService.getPendingOperations();
      expect(pendingOps).toHaveLength(0);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during intensive operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform memory-intensive operations
      for (let i = 0; i < 100; i++) {
        const largeObject = {
          id: `memory-test-${i}`,
          data: new Array(1000).fill('test-data')
        };
        
        await processLargeObject(largeObject);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
```

## Test Coverage Standards

### Coverage Requirements

```typescript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Critical modules require higher coverage
    './src/services/auth/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/database/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts'
  ]
};
```

### Coverage Analysis

```typescript
// scripts/analyze-coverage.ts
import fs from 'fs';
import path from 'path';

interface CoverageReport {
  total: CoverageMetrics;
  files: Record<string, CoverageMetrics>;
}

interface CoverageMetrics {
  lines: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

class CoverageAnalyzer {
  static analyzeCoverage(): void {
    const coverageFile = path.join(__dirname, '../coverage/coverage-summary.json');
    
    if (!fs.existsSync(coverageFile)) {
      console.error('Coverage file not found. Run tests with coverage first.');
      process.exit(1);
    }

    const coverage: CoverageReport = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    console.log('\n📊 Coverage Analysis Report\n');
    console.log('='.repeat(50));
    
    // Overall coverage
    this.printCoverageMetrics('Overall', coverage.total);
    
    // Critical modules
    const criticalModules = [
      'src/services/auth/',
      'src/services/database/',
      'src/services/sync/'
    ];
    
    console.log('\n🔍 Critical Modules Coverage:\n');
    
    for (const module of criticalModules) {
      const moduleFiles = Object.keys(coverage.files)
        .filter(file => file.includes(module));
      
      if (moduleFiles.length > 0) {
        const moduleCoverage = this.calculateModuleCoverage(coverage.files, moduleFiles);
        this.printCoverageMetrics(module, moduleCoverage);
      }
    }
    
    // Low coverage files
    console.log('\n⚠️  Files with Low Coverage (< 80%):\n');
    
    const lowCoverageFiles = Object.entries(coverage.files)
      .filter(([_, metrics]) => metrics.lines.pct < 80)
      .sort(([_, a], [__, b]) => a.lines.pct - b.lines.pct);
    
    if (lowCoverageFiles.length === 0) {
      console.log('✅ All files meet coverage requirements!');
    } else {
      lowCoverageFiles.forEach(([file, metrics]) => {
        console.log(`  ${file}: ${metrics.lines.pct.toFixed(1)}% lines covered`);
      });
    }
  }

  private static printCoverageMetrics(name: string, metrics: CoverageMetrics): void {
    console.log(`${name}:`);
    console.log(`  Lines:      ${metrics.lines.pct.toFixed(1)}% (${metrics.lines.covered}/${metrics.lines.total})`);
    console.log(`  Functions:  ${metrics.functions.pct.toFixed(1)}% (${metrics.functions.covered}/${metrics.functions.total})`);
    console.log(`  Statements: ${metrics.statements.pct.toFixed(1)}% (${metrics.statements.covered}/${metrics.statements.total})`);
    console.log(`  Branches:   ${metrics.branches.pct.toFixed(1)}% (${metrics.branches.covered}/${metrics.branches.total})`);
    console.log();
  }

  private static calculateModuleCoverage(
    files: Record<string, CoverageMetrics>,
    moduleFiles: string[]
  ): CoverageMetrics {
    const totals = {
      lines: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 }
    };

    moduleFiles.forEach(file => {
      const metrics = files[file];
      totals.lines.total += metrics.lines.total;
      totals.lines.covered += metrics.lines.covered;
      totals.functions.total += metrics.functions.total;
      totals.functions.covered += metrics.functions.covered;
      totals.statements.total += metrics.statements.total;
      totals.statements.covered += metrics.statements.covered;
      totals.branches.total += metrics.branches.total;
      totals.branches.covered += metrics.branches.covered;
    });

    return {
      lines: { ...totals.lines, pct: (totals.lines.covered / totals.lines.total) * 100 },
      functions: { ...totals.functions, pct: (totals.functions.covered / totals.functions.total) * 100 },
      statements: { ...totals.statements, pct: (totals.statements.covered / totals.statements.total) * 100 },
      branches: { ...totals.branches, pct: (totals.branches.covered / totals.branches.total) * 100 }
    };
  }
}

// Run analysis
CoverageAnalyzer.analyzeCoverage();
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:unit -- --coverage
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run security audit
      run: npm run test:security
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Analyze coverage
      run: npm run analyze:coverage
    
    - name: Comment PR with coverage
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));
          const comment = `
          ## 📊 Test Coverage Report
          
          | Metric | Coverage |
          |--------|----------|
          | Lines | ${coverage.total.lines.pct.toFixed(1)}% |
          | Functions | ${coverage.total.functions.pct.toFixed(1)}% |
          | Statements | ${coverage.total.statements.pct.toFixed(1)}% |
          | Branches | ${coverage.total.branches.pct.toFixed(1)}% |
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });

  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js 18.x
      uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build app
      run: npm run build
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload E2E artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: e2e-artifacts
        path: |
          e2e/screenshots/
          e2e/videos/
```

## Testing Tools & Setup

### Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts'
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/__tests__/jest.setup.js']
};
```

### Test Setup

```typescript
// src/__tests__/setup.ts
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi'
  })),
  addEventListener: jest.fn(() => jest.fn())
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  })
}));

// Mock Expo modules
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn()
  }))
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    userId: 'test-user-id',
    username: 'test@test.com',
    userProfile: {
      names: 'Test User',
      lastNames: 'Test LastName',
      email: 'test@test.com'
    }
  }),
  
  createMockApplication: () => ({
    id: 'test-app-id',
    applicantName: 'Juan Pérez',
    dpi: '1234567890123',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }),
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('Warning: ReactDOM.render is no longer supported')) {
    return;
  }
  originalWarn.call(console, ...args);
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:e2e": "detox test",
    "test:security": "jest --testPathPattern=__tests__/security",
    "test:performance": "jest --testPathPattern=__tests__/performance",
    "test:dual-auth": "jest --testPathPattern=dual-auth",
    "analyze:coverage": "ts-node scripts/analyze-coverage.ts",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:security"
  }
}
```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi
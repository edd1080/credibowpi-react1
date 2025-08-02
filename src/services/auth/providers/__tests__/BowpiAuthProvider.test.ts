// BowpiAuthProvider Tests
// Tests for the Bowpi authentication provider wrapper

import { BowpiAuthProvider } from '../BowpiAuthProvider';
import { 
  AuthType, 
  BowpiAuthConfig, 
  AuthProviderCapabilities,
  ProviderHealthStatus,
  ProviderDebugInfo,
  AuthProviderError,
  AuthProviderErrorType
} from '../../../../types/auth-providers';
import { User, LoginResult } from '../../../../types/auth-shared';
import { bowpiAuthService } from '../../../BowpiAuthService';
import { AuthTokenData } from '../../../../types/bowpi';

// Mock the BowpiAuthService
jest.mock('../../../BowpiAuthService', () => ({
  bowpiAuthService: {
    initialize: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentSessionId: jest.fn(),
    getNetworkStatus: jest.fn(),
    canPerformAuthOperations: jest.fn(),
    getDebugInfo: jest.fn(),
  }
}));

// Mock all the Bowpi services that might be imported
jest.mock('../../../BowpiSecureStorageService', () => ({
  bowpiSecureStorageService: {
    initialize: jest.fn(),
    secureStore: jest.fn(),
    secureRetrieve: jest.fn(),
  }
}));

jest.mock('../../../SecurityLoggingService', () => ({
  securityLoggingService: {
    logSecurityEvent: jest.fn(),
    logAuthEvent: jest.fn(),
  }
}));

jest.mock('../../../BowpiErrorManager', () => ({
  bowpiErrorManager: {
    handleError: jest.fn(),
  }
}));

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = mockConsole as any;

describe('BowpiAuthProvider', () => {
  let provider: BowpiAuthProvider;
  let mockConfig: BowpiAuthConfig;
  const mockBowpiService = bowpiAuthService as jest.Mocked<typeof bowpiAuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      baseUrl: 'http://localhost:7161',
      timeout: 30000,
      retryAttempts: 3,
      enableEncryption: true,
      enableOfflineMode: true,
      sessionValidationInterval: 300000,
      enableDebugLogging: false
    };
    
    provider = new BowpiAuthProvider(mockConfig);
  });

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.type).toBe(AuthType.BOWPI);
      expect(provider.name).toBe('Bowpi Authentication');
      expect(provider.description).toBe('Production Bowpi authentication system');
      expect(provider.version).toBe('2.0.0');
    });

    it('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();
      
      expect(capabilities.supportsOffline).toBe(true);
      expect(capabilities.supportsTokenRefresh).toBe(true);
      expect(capabilities.supportsPasswordReset).toBe(false);
      expect(capabilities.supportsBiometric).toBe(false);
      expect(capabilities.requiresNetwork).toBe(true);
      expect(capabilities.supportsMultipleUsers).toBe(false);
      expect(capabilities.hasSessionPersistence).toBe(true);
      expect(capabilities.supportsRoleBasedAuth).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockBowpiService.initialize.mockResolvedValue();
      
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(mockBowpiService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const initError = new Error('Bowpi service initialization failed');
      mockBowpiService.initialize.mockRejectedValue(initError);
      
      await expect(provider.initialize()).rejects.toThrow(AuthProviderError);
      await expect(provider.initialize()).rejects.toThrow('Failed to initialize Bowpi authentication provider');
    });

    it('should throw AuthProviderError with correct type on init failure', async () => {
      mockBowpiService.initialize.mockRejectedValue(new Error('Init failed'));
      
      try {
        await provider.initialize();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthProviderError);
        expect((error as AuthProviderError).type).toBe(AuthProviderErrorType.INITIALIZATION_FAILED);
        expect((error as AuthProviderError).provider).toBe(AuthType.BOWPI);
      }
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should login successfully with valid credentials', async () => {
      const mockBowpiUser: AuthTokenData = {
        userId: 'bowpi-123',
        email: 'test@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'John',
          lastNames: 'Doe',
          documentNumber: '1234567890123',
          phoneNumber: '12345678'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockBowpiUser
      });

      const result = await provider.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.userData).toBeDefined();
      expect(result.userData?.email).toBe('test@example.com');
      expect(result.userData?.name).toBe('John Doe');
      expect(result.userData?.role).toBe('agent');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockBowpiService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should login with supervisor role for admin users', async () => {
      const mockBowpiUser: AuthTokenData = {
        userId: 'bowpi-456',
        email: 'admin@example.com',
        roles: ['SUPERVISOR', 'ADMIN'],
        userProfile: {
          names: 'Jane',
          lastNames: 'Smith',
          documentNumber: '1234567890124',
          phoneNumber: '12345679'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockBowpiUser
      });

      const result = await provider.login('admin@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userData?.role).toBe('supervisor');
    });

    it('should handle login failure from Bowpi service', async () => {
      const loginError = new Error('Invalid credentials');
      mockBowpiService.login.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
        error: loginError
      });

      const result = await provider.login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(result.error).toBe(loginError);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle login exceptions', async () => {
      const loginError = new Error('Network error');
      mockBowpiService.login.mockRejectedValue(loginError);

      const result = await provider.login('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
      expect(result.error).toBe(loginError);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should track login metrics', async () => {
      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: {} as AuthTokenData
      });

      await provider.login('test@example.com', 'password123');
      await provider.login('test2@example.com', 'password123');

      const debugInfo = provider.getDebugInfo();

      expect(debugInfo.metrics.loginAttempts).toBe(2);
      expect(debugInfo.metrics.successfulLogins).toBe(2);
      expect(debugInfo.metrics.failedLogins).toBe(0);
    });

    it('should convert Bowpi user data correctly', async () => {
      const mockBowpiUser: AuthTokenData = {
        userId: 'bowpi-789',
        email: 'user@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Alice',
          lastNames: 'Johnson',
          documentNumber: '1234567890125',
          phoneNumber: '12345680',
          additionalField: 'extra-data'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockBowpiUser
      });

      const result = await provider.login('user@example.com', 'password123');

      expect(result.userData).toMatchObject({
        id: 'bowpi-789',
        email: 'user@example.com',
        name: 'Alice Johnson',
        role: 'agent',
        profile: {
          provider: 'bowpi',
          names: 'Alice',
          lastNames: 'Johnson',
          documentNumber: '1234567890125',
          phoneNumber: '12345680',
          additionalField: 'extra-data',
          bowpiData: mockBowpiUser,
          lastLogin: expect.any(String),
          sessionType: 'bowpi'
        }
      });
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should check authentication status', async () => {
      mockBowpiService.isAuthenticated.mockResolvedValue(true);

      const isAuth = await provider.isAuthenticated();

      expect(isAuth).toBe(true);
      expect(mockBowpiService.isAuthenticated).toHaveBeenCalled();
    });

    it('should handle authentication check errors', async () => {
      mockBowpiService.isAuthenticated.mockRejectedValue(new Error('Auth check failed'));

      const isAuth = await provider.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    it('should get current user', async () => {
      const mockBowpiUser: AuthTokenData = {
        userId: 'bowpi-current',
        email: 'current@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Current',
          lastNames: 'User',
          documentNumber: '1234567890126',
          phoneNumber: '12345681'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.getCurrentUser.mockResolvedValue(mockBowpiUser);

      const user = await provider.getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.email).toBe('current@example.com');
      expect(user?.name).toBe('Current User');
      expect(user?.role).toBe('agent');
    });

    it('should return null when no current user', async () => {
      mockBowpiService.getCurrentUser.mockResolvedValue(null);

      const user = await provider.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should handle get current user errors', async () => {
      mockBowpiService.getCurrentUser.mockRejectedValue(new Error('Get user failed'));

      const user = await provider.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should logout successfully', async () => {
      mockBowpiService.logout.mockResolvedValue();

      await expect(provider.logout()).resolves.not.toThrow();
      expect(mockBowpiService.logout).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const logoutError = new Error('Logout failed');
      mockBowpiService.logout.mockRejectedValue(logoutError);

      await expect(provider.logout()).rejects.toThrow(AuthProviderError);
      await expect(provider.logout()).rejects.toThrow('Failed to logout from Bowpi authentication');
    });

    it('should refresh token successfully', async () => {
      mockBowpiService.refreshToken.mockResolvedValue(true);

      const result = await provider.refreshToken();

      expect(result).toBe(true);
      expect(mockBowpiService.refreshToken).toHaveBeenCalled();
    });

    it('should handle token refresh failure', async () => {
      mockBowpiService.refreshToken.mockResolvedValue(false);

      const result = await provider.refreshToken();

      expect(result).toBe(false);
    });

    it('should handle token refresh errors', async () => {
      mockBowpiService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      const result = await provider.refreshToken();

      expect(result).toBe(false);
    });

    it('should validate session', async () => {
      mockBowpiService.isAuthenticated.mockResolvedValue(true);

      const isValid = await provider.validateSession();

      expect(isValid).toBe(true);
    });

    it('should get session info', async () => {
      const mockUser: AuthTokenData = {
        userId: 'session-user',
        email: 'session@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Session',
          lastNames: 'User',
          documentNumber: '1234567890127',
          phoneNumber: '12345682'
        },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.getCurrentSessionId.mockResolvedValue('session-123');
      mockBowpiService.getCurrentUser.mockResolvedValue(mockUser);
      mockBowpiService.isAuthenticated.mockResolvedValue(true);

      const sessionInfo = await provider.getSessionInfo();

      expect(sessionInfo).toMatchObject({
        sessionId: 'session-123',
        userId: 'session-user',
        isValid: true,
        provider: 'bowpi',
        lastActivity: expect.any(Number)
      });
    });

    it('should handle session info errors', async () => {
      mockBowpiService.getCurrentSessionId.mockRejectedValue(new Error('Session info failed'));

      const sessionInfo = await provider.getSessionInfo();

      expect(sessionInfo).toBeNull();
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should return healthy status', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true
      });
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: true,
        canLogout: true,
        canRefresh: true,
        reason: 'All operations available'
      });
      mockBowpiService.isAuthenticated.mockResolvedValue(false);

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.lastCheck).toBeDefined();
      expect(health.issues).toHaveLength(0);
      expect(health.performance).toBeDefined();
      expect(health.networkStatus).toBeDefined();
    });

    it('should detect initialization issues', async () => {
      const uninitializedProvider = new BowpiAuthProvider(mockConfig);

      const health = await uninitializedProvider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Provider not initialized');
    });

    it('should detect network connectivity issues', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: false,
        connectionType: 'none',
        isInternetReachable: false
      });
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: true,
        canLogout: true,
        canRefresh: true,
        reason: 'All operations available'
      });

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Network connection required but not available');
    });

    it('should detect auth operation issues', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true
      });
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: false,
        canLogout: true,
        canRefresh: false,
        reason: 'Server maintenance'
      });

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Cannot perform login: Server maintenance');
    });

    it('should detect authenticated user data issues', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true
      });
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: true,
        canLogout: true,
        canRefresh: true,
        reason: 'All operations available'
      });
      mockBowpiService.isAuthenticated.mockResolvedValue(true);
      mockBowpiService.getCurrentUser.mockResolvedValue(null);

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Authenticated but no user data available');
    });

    it('should handle health check errors gracefully', async () => {
      mockBowpiService.getNetworkStatus.mockImplementation(() => {
        throw new Error('Network status error');
      });

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Health check failed');
    });

    it('should calculate performance metrics correctly', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true
      });
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: true,
        canLogout: true,
        canRefresh: true,
        reason: 'All operations available'
      });

      // Perform some operations to generate metrics
      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Success',
        userData: {} as AuthTokenData
      });
      await provider.login('test@example.com', 'password123');

      const health = await provider.healthCheck();

      expect(health.performance.totalOperations).toBe(1);
      expect(health.performance.successRate).toBe(1.0);
      expect(health.performance.averageLoginTime).toBe(2500); // Default estimate
    });
  });

  describe('Debug Information', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should provide comprehensive debug information', async () => {
      mockBowpiService.getDebugInfo.mockReturnValue({
        serviceState: {
          hasAdapter: true,
          isInitialized: true,
          lastActivity: Date.now()
        },
        networkStatus: {
          isConnected: true,
          connectionType: 'wifi'
        },
        configuration: {
          baseUrl: 'http://localhost:7161'
        }
      });

      const debugInfo = provider.getDebugInfo();

      expect(debugInfo.type).toBe(AuthType.BOWPI);
      expect(debugInfo.name).toBe('Bowpi Authentication');
      expect(debugInfo.version).toBe('2.0.0');
      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.hasActiveSession).toBe(true);
      expect(debugInfo.lastActivity).toBeGreaterThan(0);

      expect(debugInfo.configuration).toMatchObject({
        baseUrl: mockConfig.baseUrl,
        timeout: mockConfig.timeout,
        retryAttempts: mockConfig.retryAttempts,
        enableEncryption: mockConfig.enableEncryption,
        enableOfflineMode: mockConfig.enableOfflineMode,
        sessionValidationInterval: mockConfig.sessionValidationInterval
      });

      expect(debugInfo.metrics).toMatchObject({
        loginAttempts: expect.any(Number),
        successfulLogins: expect.any(Number),
        failedLogins: expect.any(Number),
        sessionDuration: expect.any(Number)
      });

      expect(debugInfo.errors).toMatchObject({
        recent: expect.any(Array),
        count: expect.any(Number)
      });
    });

    it('should track recent errors in debug info', async () => {
      // Cause an error
      mockBowpiService.login.mockRejectedValue(new Error('Network error'));
      await provider.login('test@example.com', 'password123');

      const debugInfo = provider.getDebugInfo();

      expect(debugInfo.errors.count).toBeGreaterThan(0);
      expect(debugInfo.errors.recent.length).toBeGreaterThan(0);
      expect(debugInfo.errors.lastError).toBeDefined();
      expect(debugInfo.errors.lastError?.message).toContain('Network error');
    });

    it('should limit recent errors to 10', async () => {
      // Generate more than 10 errors
      mockBowpiService.login.mockRejectedValue(new Error('Network error'));

      for (let i = 0; i < 15; i++) {
        await provider.login('test@example.com', 'password123');
      }

      const debugInfo = provider.getDebugInfo();

      expect(debugInfo.errors.recent.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Role Mapping', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should map supervisor roles correctly', async () => {
      const testCases = [
        { roles: ['SUPERVISOR'], expected: 'supervisor' },
        { roles: ['MANAGER'], expected: 'supervisor' },
        { roles: ['ADMIN'], expected: 'supervisor' },
        { roles: ['AGENT', 'SUPERVISOR'], expected: 'supervisor' },
        { roles: ['TEAM_SUPERVISOR'], expected: 'supervisor' },
        { roles: ['REGIONAL_MANAGER'], expected: 'supervisor' },
      ];

      for (const testCase of testCases) {
        const mockBowpiUser: AuthTokenData = {
          userId: 'test-user',
          email: 'test@example.com',
          roles: testCase.roles,
          userProfile: {
            names: 'Test',
            lastNames: 'User',
            documentNumber: '1234567890128',
            phoneNumber: '12345683'
          },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer'
        };

        mockBowpiService.login.mockResolvedValue({
          success: true,
          message: 'Login successful',
          userData: mockBowpiUser
        });

        const result = await provider.login('test@example.com', 'password123');

        expect(result.userData?.role).toBe(testCase.expected);
      }
    });

    it('should map agent roles correctly', async () => {
      const testCases = [
        { roles: ['AGENT'], expected: 'agent' },
        { roles: ['USER'], expected: 'agent' },
        { roles: ['FIELD_AGENT'], expected: 'agent' },
        { roles: ['CREDIT_AGENT'], expected: 'agent' },
        { roles: [], expected: 'agent' }, // Default to agent
      ];

      for (const testCase of testCases) {
        const mockBowpiUser: AuthTokenData = {
          userId: 'test-user',
          email: 'test@example.com',
          roles: testCase.roles,
          userProfile: {
            names: 'Test',
            lastNames: 'User',
            documentNumber: '1234567890129',
            phoneNumber: '12345684'
          },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer'
        };

        mockBowpiService.login.mockResolvedValue({
          success: true,
          message: 'Login successful',
          userData: mockBowpiUser
        });

        const result = await provider.login('test@example.com', 'password123');

        expect(result.userData?.role).toBe(testCase.expected);
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();

      await provider.cleanup();

      // Should reset initialization state
      const debugInfo = provider.getDebugInfo();
      expect(debugInfo.isInitialized).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();

      // No specific cleanup errors expected for Bowpi provider
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Advanced Authentication Scenarios', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should handle token refresh workflow', async () => {
      // Setup initial login
      const mockUser: AuthTokenData = {
        userId: 'refresh-user',
        email: 'refresh@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Refresh',
          lastNames: 'User',
          documentNumber: '1234567890130',
          phoneNumber: '12345685'
        },
        accessToken: 'initial-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockUser
      });

      await provider.login('refresh@example.com', 'password123');

      // Test token refresh
      mockBowpiService.refreshToken.mockResolvedValue(true);
      const refreshResult = await provider.refreshToken();

      expect(refreshResult).toBe(true);
      expect(mockBowpiService.refreshToken).toHaveBeenCalled();
    });

    it('should handle session validation workflow', async () => {
      mockBowpiService.isAuthenticated.mockResolvedValue(true);

      const isValid = await provider.validateSession();

      expect(isValid).toBe(true);
      expect(mockBowpiService.isAuthenticated).toHaveBeenCalled();
    });

    it('should handle complex user profile data', async () => {
      const complexUser: AuthTokenData = {
        userId: 'complex-user-123',
        email: 'complex.user+test@example.com',
        roles: ['AGENT', 'FIELD_SUPERVISOR', 'REGIONAL_COORDINATOR'],
        userProfile: {
          names: 'María José',
          lastNames: 'García-López',
          documentNumber: '1234567890131',
          phoneNumber: '12345686',
          department: 'Guatemala',
          municipality: 'Guatemala',
          address: 'Zona 1, Ciudad de Guatemala',
          birthDate: '1990-01-01',
          gender: 'F',
          additionalData: {
            emergencyContact: 'Juan García',
            emergencyPhone: '12345687',
            bankAccount: '1234567890',
            taxId: 'CF123456789'
          }
        },
        accessToken: 'complex-token',
        refreshToken: 'complex-refresh-token',
        expiresIn: 7200,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: complexUser
      });

      const result = await provider.login('complex.user+test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userData?.name).toBe('María José García-López');
      expect(result.userData?.profile.additionalData).toBeDefined();
      expect(result.userData?.profile.bowpiData).toEqual(complexUser);
    });

    it('should handle concurrent authentication operations', async () => {
      const mockUser: AuthTokenData = {
        userId: 'concurrent-user',
        email: 'concurrent@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Concurrent',
          lastNames: 'User',
          documentNumber: '1234567890132',
          phoneNumber: '12345687'
        },
        accessToken: 'concurrent-token',
        refreshToken: 'concurrent-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockUser
      });

      // Simulate concurrent operations
      const operations = [
        provider.login('concurrent@example.com', 'password123'),
        provider.isAuthenticated(),
        provider.getCurrentUser(),
        provider.validateSession()
      ];

      const results = await Promise.all(operations);

      // Login should succeed
      expect(results[0].success).toBe(true);
      
      // Other operations should complete without errors
      expect(results).toHaveLength(4);
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should recover from temporary network failures', async () => {
      // First attempt fails
      mockBowpiService.login.mockRejectedValueOnce(new Error('Network timeout'));
      
      // Second attempt succeeds
      const mockUser: AuthTokenData = {
        userId: 'recovery-user',
        email: 'recovery@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Recovery',
          lastNames: 'User',
          documentNumber: '1234567890133',
          phoneNumber: '12345688'
        },
        accessToken: 'recovery-token',
        refreshToken: 'recovery-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValueOnce({
        success: true,
        message: 'Login successful',
        userData: mockUser
      });

      // First attempt should fail
      const firstResult = await provider.login('recovery@example.com', 'password123');
      expect(firstResult.success).toBe(false);

      // Second attempt should succeed
      const secondResult = await provider.login('recovery@example.com', 'password123');
      expect(secondResult.success).toBe(true);

      // Metrics should reflect both attempts
      const debugInfo = provider.getDebugInfo();
      expect(debugInfo.metrics.loginAttempts).toBe(2);
      expect(debugInfo.metrics.successfulLogins).toBe(1);
      expect(debugInfo.metrics.failedLogins).toBe(1);
    });

    it('should handle service degradation gracefully', async () => {
      // Mock degraded service state
      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: false,
        canLogout: true,
        canRefresh: false,
        reason: 'Service maintenance in progress'
      });

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('Cannot perform login: Service maintenance in progress');
    });

    it('should maintain error history for debugging', async () => {
      // Generate multiple errors
      const errors = [
        'Network timeout',
        'Invalid credentials',
        'Server error',
        'Rate limit exceeded'
      ];

      for (const errorMessage of errors) {
        mockBowpiService.login.mockRejectedValueOnce(new Error(errorMessage));
        await provider.login('test@example.com', 'password123');
      }

      const debugInfo = provider.getDebugInfo();

      expect(debugInfo.errors.count).toBe(4);
      expect(debugInfo.errors.recent).toHaveLength(4);
      expect(debugInfo.errors.lastError?.message).toBe('Rate limit exceeded');
    });

    it('should limit error history to prevent memory leaks', async () => {
      // Generate more than 10 errors
      for (let i = 0; i < 15; i++) {
        mockBowpiService.login.mockRejectedValueOnce(new Error(`Error ${i}`));
        await provider.login('test@example.com', 'password123');
      }

      const debugInfo = provider.getDebugInfo();

      // Should keep only last 10 errors
      expect(debugInfo.errors.recent).toHaveLength(10);
      expect(debugInfo.errors.count).toBe(15); // Total count should still be accurate
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();
    });

    it('should track operation performance metrics', async () => {
      const mockUser: AuthTokenData = {
        userId: 'perf-user',
        email: 'perf@example.com',
        roles: ['AGENT'],
        userProfile: {
          names: 'Performance',
          lastNames: 'User',
          documentNumber: '1234567890134',
          phoneNumber: '12345689'
        },
        accessToken: 'perf-token',
        refreshToken: 'perf-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockBowpiService.login.mockResolvedValue({
        success: true,
        message: 'Login successful',
        userData: mockUser
      });

      const startTime = Date.now();
      const result = await provider.login('perf@example.com', 'password123');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
    });

    it('should provide comprehensive health metrics', async () => {
      mockBowpiService.getNetworkStatus.mockReturnValue({
        isConnected: true,
        connectionType: 'wifi',
        isInternetReachable: true
      });

      mockBowpiService.canPerformAuthOperations.mockResolvedValue({
        canLogin: true,
        canLogout: true,
        canRefresh: true,
        reason: 'All operations available'
      });

      mockBowpiService.isAuthenticated.mockResolvedValue(false);

      const health = await provider.healthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.performance).toBeDefined();
      expect(health.performance.averageLoginTime).toBe(2500);
      expect(health.networkStatus).toBeDefined();
      expect(health.networkStatus?.isConnected).toBe(true);
    });
  });

  describe('Network Status Handling', () => {
    it('should register network status callback', () => {
      const callback = jest.fn();

      provider.onNetworkStatusChanged(callback);

      // Should not throw and should log registration
      expect(mockConsole.log).toHaveBeenCalledWith(
        '🔍 [BOWPI_AUTH] Network status change callback registered'
      );
    });

    it('should handle network status changes in health checks', async () => {
      mockBowpiService.initialize.mockResolvedValue();
      await provider.initialize();

      // Test with different network states
      const networkStates = [
        { isConnected: true, connectionType: 'wifi', isInternetReachable: true },
        { isConnected: true, connectionType: 'cellular', isInternetReachable: true },
        { isConnected: false, connectionType: 'none', isInternetReachable: false },
      ];

      for (const networkState of networkStates) {
        mockBowpiService.getNetworkStatus.mockReturnValue(networkState);
        mockBowpiService.canPerformAuthOperations.mockResolvedValue({
          canLogin: networkState.isConnected,
          canLogout: true,
          canRefresh: networkState.isConnected,
          reason: networkState.isConnected ? 'Network available' : 'No network connection'
        });

        const health = await provider.healthCheck();

        if (networkState.isConnected) {
          expect(health.isHealthy).toBe(true);
        } else {
          expect(health.isHealthy).toBe(false);
          expect(health.issues).toContain('Network connection required but not available');
        }
      }
    });
  });
});
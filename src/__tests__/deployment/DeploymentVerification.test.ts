// Deployment Verification Tests - Ensure production readiness

// Mock __DEV__ for production testing
(global as any).__DEV__ = false;

// Mock environment variables for testing
process.env.EXPO_PUBLIC_BOWPI_BASE_URL = 'https://bowpi.credibowpi.com';
process.env.EXPO_PUBLIC_BOWPI_AUTH_URL = 'https://bowpi.credibowpi.com/micro-auth-service';
process.env.EXPO_PUBLIC_BOWPI_SESSION_URL = 'https://bowpi.credibowpi.com/management';
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.credibowpi.com';
process.env.EXPO_PUBLIC_ENCRYPTION_KEY = 'test-encryption-key-for-deployment-verification-testing';
process.env.EXPO_PUBLIC_BUILD_TYPE = 'production';
process.env.EXPO_PUBLIC_APP_VERSION = '1.0.0';
process.env.EXPO_PUBLIC_METRICS_ENDPOINT = 'https://metrics.credibowpi.com/auth';
process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT = 'https://errors.credibowpi.com/report';
process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT = 'https://performance.credibowpi.com/metrics';

import { ENV, validateEnvironment } from '../../constants/environment';
import { PRODUCTION_CONFIG } from '../../constants/production';
import { config } from '../../constants/config';

describe('Deployment Verification Tests', () => {
  describe('Environment Configuration', () => {
    it('should have valid environment configuration', () => {
      const validation = validateEnvironment();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should enforce HTTPS in production', () => {
      if (!__DEV__) {
        expect(ENV.BOWPI.BASE_URL).toMatch(/^https:\/\//);
        expect(ENV.API.BASE_URL).toMatch(/^https:\/\//);
        expect(ENV.ANALYTICS.METRICS_ENDPOINT).toMatch(/^https:\/\//);
        expect(config.security.enforceHttps).toBe(true);
      }
    });

    it('should have proper Bowpi endpoints configured', () => {
      expect(ENV.BOWPI.BASE_URL).toBeDefined();
      expect(ENV.BOWPI.AUTH_URL).toBeDefined();
      expect(ENV.BOWPI.SESSION_URL).toBeDefined();
      
      // Validate URL format
      expect(() => new URL(ENV.BOWPI.BASE_URL)).not.toThrow();
      expect(() => new URL(ENV.BOWPI.AUTH_URL)).not.toThrow();
      expect(() => new URL(ENV.BOWPI.SESSION_URL)).not.toThrow();
    });

    it('should have secure encryption configuration', () => {
      expect(ENV.SECURITY.ENCRYPTION_KEY).toBeDefined();
      expect(ENV.SECURITY.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(16);
    });

    it('should have proper timeout configurations', () => {
      expect(ENV.API.TIMEOUT).toBeGreaterThan(5000);
      expect(ENV.API.TIMEOUT).toBeLessThanOrEqual(60000);
      expect(config.bowpi.timeout).toBeGreaterThan(5000);
    });

    it('should have analytics endpoints configured for production', () => {
      if (!__DEV__) {
        expect(ENV.ANALYTICS.METRICS_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.PERFORMANCE_ENDPOINT).toBeDefined();
      }
    });
  });

  describe('Security Configuration', () => {
    it('should have security features enabled in production', () => {
      if (!__DEV__) {
        expect(PRODUCTION_CONFIG.security.enableSecurityHeaders).toBe(true);
        expect(PRODUCTION_CONFIG.security.enableRequestValidation).toBe(true);
        expect(config.security.enforceHttps).toBe(true);
      }
    });

    it('should have proper logging configuration for production', () => {
      if (!__DEV__) {
        expect(PRODUCTION_CONFIG.logging.enableSecurityLogs).toBe(true);
        expect(PRODUCTION_CONFIG.logging.enableErrorReporting).toBe(true);
        expect(PRODUCTION_CONFIG.logging.logLevel).toBe('error');
      }
    });

    it('should have analytics enabled for production monitoring', () => {
      if (!__DEV__) {
        expect(PRODUCTION_CONFIG.analytics.enableAuthMetrics).toBe(true);
        expect(PRODUCTION_CONFIG.analytics.enablePerformanceMetrics).toBe(true);
        expect(PRODUCTION_CONFIG.analytics.enableErrorTracking).toBe(true);
      }
    });

    it('should disable sensitive features in production', () => {
      if (!__DEV__) {
        expect(PRODUCTION_CONFIG.logging.enableProductionLogs).toBe(false);
        expect(PRODUCTION_CONFIG.analytics.enableUserBehaviorTracking).toBe(false);
        expect(PRODUCTION_CONFIG.performance.enableRequestCaching).toBe(false);
      }
    });
  });

  describe('Service Configuration', () => {
    it('should have secure HTTP client configuration for production', () => {
      if (!__DEV__) {
        expect(config.security.enforceHttps).toBe(true);
        expect(config.logging.enableDebugLogs).toBe(false);
      }
      
      expect(config.security.requestTimeout).toBeGreaterThan(0);
    });

    it('should have proper authentication service configuration', () => {
      expect(config.bowpi.authServiceUrl).toBeDefined();
      expect(config.bowpi.sessionManagementUrl).toBeDefined();
      expect(config.bowpi.baseUrl).toBeDefined();
      expect(config.bowpi.timeout).toBeGreaterThan(5000);
    });

    it('should have analytics configuration for production monitoring', () => {
      if (!__DEV__) {
        expect(config.analytics.enableAuthMetrics).toBe(true);
        expect(config.analytics.enablePerformanceMetrics).toBe(true);
        expect(config.analytics.enableErrorTracking).toBe(true);
      }
    });

    it('should have production logging configuration', () => {
      if (!__DEV__) {
        expect(config.logging.logLevel).toBe('error');
        expect(config.logging.enableSecurityLogs).toBe(true);
      }
    });
  });

  describe('Network Configuration', () => {
    it('should have valid URL configurations', () => {
      // Test that URLs are properly formatted
      expect(() => new URL(ENV.BOWPI.BASE_URL)).not.toThrow();
      expect(() => new URL(ENV.BOWPI.AUTH_URL)).not.toThrow();
      expect(() => new URL(ENV.BOWPI.SESSION_URL)).not.toThrow();
      expect(() => new URL(ENV.API.BASE_URL)).not.toThrow();
    });

    it('should enforce HTTPS in production URLs', () => {
      if (!__DEV__) {
        expect(ENV.BOWPI.BASE_URL).toMatch(/^https:\/\//);
        expect(ENV.BOWPI.AUTH_URL).toMatch(/^https:\/\//);
        expect(ENV.BOWPI.SESSION_URL).toMatch(/^https:\/\//);
        expect(ENV.API.BASE_URL).toMatch(/^https:\/\//);
      }
    });

    it('should have proper timeout configurations', () => {
      expect(ENV.API.TIMEOUT).toBeGreaterThan(5000);
      expect(ENV.API.TIMEOUT).toBeLessThanOrEqual(60000);
      expect(config.bowpi.timeout).toBeGreaterThan(5000);
      expect(config.security.requestTimeout).toBeGreaterThan(5000);
    });

    it('should have analytics endpoints configured for production', () => {
      if (!__DEV__) {
        expect(ENV.ANALYTICS.METRICS_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.PERFORMANCE_ENDPOINT).toBeDefined();
        
        expect(ENV.ANALYTICS.METRICS_ENDPOINT).toMatch(/^https:\/\//);
        expect(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT).toMatch(/^https:\/\//);
        expect(ENV.ANALYTICS.PERFORMANCE_ENDPOINT).toMatch(/^https:\/\//);
      }
    });
  });

  describe('Authentication Configuration', () => {
    it('should have proper Bowpi authentication endpoints', () => {
      expect(config.bowpi.authServiceUrl).toContain('/micro-auth-service');
      expect(config.bowpi.sessionManagementUrl).toContain('/management');
      
      if (!__DEV__) {
        expect(config.bowpi.authServiceUrl).toMatch(/^https:\/\//);
        expect(config.bowpi.sessionManagementUrl).toMatch(/^https:\/\//);
      }
    });

    it('should have security features enabled for production', () => {
      if (!__DEV__) {
        expect(config.security.enforceHttps).toBe(true);
        expect(config.security.enableSecurityHeaders).toBe(true);
      }
    });

    it('should have proper retry and timeout configurations', () => {
      expect(config.security.maxRetryAttempts).toBeGreaterThan(0);
      expect(config.security.maxRetryAttempts).toBeLessThanOrEqual(5);
      expect(config.security.requestTimeout).toBeGreaterThan(5000);
    });
  });

  describe('Error Handling Configuration', () => {
    it('should have proper error handling settings', () => {
      expect(config.security.maxRetryAttempts).toBeDefined();
      expect(config.security.maxRetryAttempts).toBeGreaterThan(0);
      
      if (!__DEV__) {
        expect(config.logging.enableSecurityLogs).toBe(true);
        expect(config.analytics.enableErrorTracking).toBe(true);
      }
    });

    it('should have proper logging levels for production', () => {
      if (!__DEV__) {
        expect(config.logging.logLevel).toBe('error');
        expect(config.logging.enableDebugLogs).toBe(false);
      } else {
        expect(config.logging.logLevel).toBe('debug');
        expect(config.logging.enableDebugLogs).toBe(true);
      }
    });

    it('should have analytics endpoints for error reporting', () => {
      if (!__DEV__) {
        expect(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT).toMatch(/^https:\/\//);
      }
    });
  });

  describe('Performance Configuration', () => {
    it('should have reasonable timeout configurations', () => {
      expect(ENV.API.TIMEOUT).toBeLessThanOrEqual(60000); // Max 60 seconds
      expect(config.bowpi.timeout).toBeLessThanOrEqual(60000);
      expect(config.security.requestTimeout).toBeLessThanOrEqual(60000);
    });

    it('should have proper performance monitoring settings', () => {
      if (!__DEV__) {
        expect(config.analytics.enablePerformanceMetrics).toBe(true);
        expect(ENV.ANALYTICS.PERFORMANCE_ENDPOINT).toBeDefined();
        expect(ENV.ANALYTICS.PERFORMANCE_ENDPOINT).toMatch(/^https:\/\//);
      }
    });

    it('should have efficient caching configuration', () => {
      // In production, request caching should be disabled for security
      if (!__DEV__) {
        expect(PRODUCTION_CONFIG.performance.enableRequestCaching).toBe(false);
      }
      
      expect(PRODUCTION_CONFIG.performance.maxConcurrentRequests).toBeGreaterThan(0);
      expect(PRODUCTION_CONFIG.performance.maxConcurrentRequests).toBeLessThanOrEqual(10);
    });
  });

  describe('Build Configuration Verification', () => {
    it('should have correct build information', () => {
      expect(ENV.BUILD.VERSION).toBeDefined();
      expect(ENV.BUILD.VERSION).toMatch(/^\d+\.\d+\.\d+/);
      expect(ENV.BUILD.TYPE).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(ENV.BUILD.TYPE);
    });

    it('should have environment detection working correctly', () => {
      expect(typeof ENV.ENVIRONMENT.IS_DEVELOPMENT).toBe('boolean');
      expect(typeof ENV.ENVIRONMENT.IS_PRODUCTION).toBe('boolean');
      expect(ENV.ENVIRONMENT.IS_DEVELOPMENT).toBe(__DEV__);
      expect(ENV.ENVIRONMENT.IS_PRODUCTION).toBe(!__DEV__);
    });

    it('should have feature flags configured properly', () => {
      expect(typeof ENV.FEATURES.ENABLE_BOWPI_AUTH).toBe('boolean');
      expect(typeof ENV.FEATURES.ENABLE_OFFLINE_MODE).toBe('boolean');
      expect(typeof ENV.FEATURES.ENABLE_BIOMETRIC_AUTH).toBe('boolean');
      expect(typeof ENV.FEATURES.ENABLE_SESSION_RECOVERY).toBe('boolean');
      expect(typeof ENV.FEATURES.ENABLE_SUSPICIOUS_ACTIVITY_MONITORING).toBe('boolean');
    });
  });

  describe('Production Readiness Checklist', () => {
    it('should pass all production readiness checks', () => {
      const checks = {
        environmentValid: validateEnvironment().isValid,
        httpsEnforced: !__DEV__ ? config.security.enforceHttps : true,
        securityEnabled: !__DEV__ ? PRODUCTION_CONFIG.security.enableSecurityHeaders : true,
        analyticsEnabled: !__DEV__ ? PRODUCTION_CONFIG.analytics.enableAuthMetrics : true,
        loggingConfigured: PRODUCTION_CONFIG.logging.enableSecurityLogs,
        endpointsConfigured: ENV.BOWPI.BASE_URL && ENV.BOWPI.AUTH_URL && ENV.BOWPI.SESSION_URL,
        encryptionConfigured: ENV.SECURITY.ENCRYPTION_KEY.length >= 16,
        timeoutsConfigured: ENV.API.TIMEOUT > 5000 && ENV.API.TIMEOUT <= 60000,
      };

      // All checks should pass
      Object.entries(checks).forEach(([check, passed]) => {
        expect(passed).toBe(true);
      });

      // Log readiness status
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      console.log(`✅ Production Readiness: ${passedChecks}/${totalChecks} checks passed`);
      
      if (passedChecks === totalChecks) {
        console.log('🚀 Application is ready for production deployment');
      } else {
        console.warn('⚠️ Some production readiness checks failed');
      }
    });
  });
});

// Helper function to run deployment verification
export const runDeploymentVerification = async (): Promise<{
  passed: boolean;
  results: Record<string, boolean>;
  errors: string[];
}> => {
  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  try {
    // Environment validation
    const envValidation = validateEnvironment();
    results.environmentValid = envValidation.isValid;
    if (!envValidation.isValid) {
      errors.push(...envValidation.errors);
    }

    // HTTPS enforcement check
    if (!__DEV__) {
      results.httpsEnforced = ENV.BOWPI.BASE_URL.startsWith('https://') && 
                             ENV.API.BASE_URL.startsWith('https://');
      if (!results.httpsEnforced) {
        errors.push('HTTPS not enforced for all endpoints in production');
      }
    } else {
      results.httpsEnforced = true;
    }

    // Service initialization check
    try {
      const networkStatus = bowpiAuthService.getNetworkStatus();
      results.servicesInitialized = !!networkStatus;
    } catch (error) {
      results.servicesInitialized = false;
      errors.push('Service initialization failed');
    }

    // Analytics check
    try {
      const analyticsSummary = authAnalytics.getAnalyticsSummary();
      results.analyticsConfigured = !!analyticsSummary;
    } catch (error) {
      results.analyticsConfigured = false;
      errors.push('Analytics configuration failed');
    }

    // Logging check
    try {
      const loggingStats = productionLogger.getLoggingStats();
      results.loggingConfigured = !!loggingStats;
    } catch (error) {
      results.loggingConfigured = false;
      errors.push('Logging configuration failed');
    }

    const passed = Object.values(results).every(Boolean);

    return { passed, results, errors };

  } catch (error) {
    errors.push(`Deployment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { passed: false, results, errors };
  }
};
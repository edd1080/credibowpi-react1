import { PRODUCTION_CONFIG } from './production';

// Application configuration constants
export const config = {
  // API Configuration
  api: {
    baseUrl: __DEV__ 
      ? (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.14.11.200:7161')
      : PRODUCTION_CONFIG.bowpi.baseUrl,
    timeout: PRODUCTION_CONFIG.bowpi.timeout,
    enforceHttps: PRODUCTION_CONFIG.https.enforceHttps && !__DEV__,
  },

  // Bowpi Configuration
  bowpi: {
    authServiceUrl: __DEV__
      ? 'http://10.14.11.200:7161/bowpi/micro-auth-service'
      : PRODUCTION_CONFIG.bowpi.authServiceUrl,
    sessionManagementUrl: __DEV__
      ? 'http://10.14.11.200:7161/bowpi/management'
      : PRODUCTION_CONFIG.bowpi.sessionManagementUrl,
    baseUrl: __DEV__
      ? 'http://10.14.11.200:7161'
      : PRODUCTION_CONFIG.bowpi.baseUrl,
    timeout: PRODUCTION_CONFIG.bowpi.timeout,
  },

  // Security Configuration
  security: {
    enforceHttps: PRODUCTION_CONFIG.https.enforceHttps && !__DEV__,
    enableSecurityHeaders: PRODUCTION_CONFIG.security.enableSecurityHeaders,
    enableCertificatePinning: PRODUCTION_CONFIG.security.enableCertificatePinning && !__DEV__,
    maxRetryAttempts: PRODUCTION_CONFIG.security.maxRetryAttempts,
    requestTimeout: PRODUCTION_CONFIG.security.requestTimeout,
  },

  // Sync Configuration
  sync: {
    intervalMinutes: 5,
    retryAttempts: 3,
    backoffMultiplier: 2,
  },

  // Storage Configuration
  storage: {
    databaseName: 'credibowpi.db',
    encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'credibowpi_encryption_key',
  },

  // UI Configuration
  ui: {
    splashDuration: 2000, // 2 seconds
    animationDuration: {
      fast: 150,
      normal: 250,
      slow: 300,
    },
  },

  // Validation Configuration
  validation: {
    minPasswordLength: 8,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedImageTypes: ['image/jpeg', 'image/png'],
  },

  // Logging Configuration
  logging: {
    enableDebugLogs: __DEV__ || PRODUCTION_CONFIG.logging.enableProductionLogs,
    enableSecurityLogs: PRODUCTION_CONFIG.logging.enableSecurityLogs,
    enablePerformanceLogs: PRODUCTION_CONFIG.logging.enablePerformanceLogs,
    logLevel: __DEV__ ? 'debug' : PRODUCTION_CONFIG.logging.logLevel,
    maxLogSize: PRODUCTION_CONFIG.logging.maxLogSize,
  },

  // Analytics Configuration
  analytics: {
    enableAuthMetrics: PRODUCTION_CONFIG.analytics.enableAuthMetrics,
    enablePerformanceMetrics: PRODUCTION_CONFIG.analytics.enablePerformanceMetrics,
    enableErrorTracking: PRODUCTION_CONFIG.analytics.enableErrorTracking,
    metricsEndpoint: PRODUCTION_CONFIG.analytics.metricsEndpoint,
  },

  // Environment Configuration
  environment: {
    isProduction: PRODUCTION_CONFIG.environment.isProduction,
    isDevelopment: PRODUCTION_CONFIG.environment.isDevelopment,
    buildType: PRODUCTION_CONFIG.environment.buildType,
    version: PRODUCTION_CONFIG.environment.version,
  },
} as const;

export type ConfigKey = keyof typeof config;
export type ConfigValue = (typeof config)[ConfigKey];

// Re-export production config for external access
export { PRODUCTION_CONFIG } from './production';

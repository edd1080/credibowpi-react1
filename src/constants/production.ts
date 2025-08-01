// Production configuration constants
export const PRODUCTION_CONFIG = {
  // HTTPS Enforcement
  https: {
    enforceHttps: true,
    allowedProtocols: ['https:'],
    httpsRedirect: true,
    strictTransportSecurity: true,
  },

  // Bowpi Endpoints
  bowpi: {
    authServiceUrl: process.env.EXPO_PUBLIC_BOWPI_AUTH_URL || 'https://bowpi.credibowpi.com/micro-auth-service',
    sessionManagementUrl: process.env.EXPO_PUBLIC_BOWPI_SESSION_URL || 'https://bowpi.credibowpi.com/management',
    baseUrl: process.env.EXPO_PUBLIC_BOWPI_BASE_URL || 'https://bowpi.credibowpi.com',
    timeout: 30000,
  },

  // Security Settings
  security: {
    enableSecurityHeaders: true,
    enableCertificatePinning: true,
    enableRequestValidation: true,
    maxRetryAttempts: 3,
    requestTimeout: 30000,
  },

  // Logging Configuration
  logging: {
    enableProductionLogs: false,
    enableSecurityLogs: true,
    enablePerformanceLogs: true,
    enableErrorReporting: true,
    logLevel: 'error', // 'debug' | 'info' | 'warn' | 'error'
    maxLogSize: 1024 * 1024, // 1MB
  },

  // Analytics and Monitoring
  analytics: {
    enableAuthMetrics: true,
    enablePerformanceMetrics: true,
    enableErrorTracking: true,
    enableUserBehaviorTracking: false, // Privacy-focused
    metricsEndpoint: process.env.EXPO_PUBLIC_METRICS_ENDPOINT || 'https://metrics.credibowpi.com/auth',
  },

  // Feature Flags
  features: {
    enableBowpiAuth: true,
    enableOfflineMode: true,
    enableBiometricAuth: true,
    enableSessionRecovery: true,
    enableSuspiciousActivityMonitoring: true,
  },

  // Performance Settings
  performance: {
    enableRequestCaching: false, // Disabled for security
    enableResponseCompression: true,
    enableConnectionPooling: true,
    maxConcurrentRequests: 5,
  },

  // Environment Detection
  environment: {
    isProduction: !__DEV__,
    isDevelopment: __DEV__,
    buildType: process.env.EXPO_PUBLIC_BUILD_TYPE || 'production',
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  },
} as const;

export type ProductionConfigKey = keyof typeof PRODUCTION_CONFIG;
export type ProductionConfigValue = (typeof PRODUCTION_CONFIG)[ProductionConfigKey];
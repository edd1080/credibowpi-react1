// Environment variable configuration and validation

/**
 * Environment variable configuration with type safety and validation
 */
export const ENV = {
  // Bowpi Configuration
  BOWPI: {
    BASE_URL: process.env.EXPO_PUBLIC_BOWPI_BASE_URL || (__DEV__ 
      ? 'http://10.14.11.200:7161' 
      : 'https://bowpi.credibowpi.com'),
    AUTH_URL: process.env.EXPO_PUBLIC_BOWPI_AUTH_URL || (__DEV__ 
      ? 'http://10.14.11.200:7161/bowpi/micro-auth-service' 
      : 'https://bowpi.credibowpi.com/micro-auth-service'),
    SESSION_URL: process.env.EXPO_PUBLIC_BOWPI_SESSION_URL || (__DEV__ 
      ? 'http://10.14.11.200:7161/bowpi/management' 
      : 'https://bowpi.credibowpi.com/management'),
  },

  // API Configuration
  API: {
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ 
      ? 'http://10.14.11.200:7161' 
      : 'https://api.credibowpi.com'),
    TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
  },

  // Security Configuration
  SECURITY: {
    ENCRYPTION_KEY: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'credibowpi_default_key',
    JWT_SECRET: process.env.EXPO_PUBLIC_JWT_SECRET || '',
  },

  // Analytics and Monitoring
  ANALYTICS: {
    METRICS_ENDPOINT: process.env.EXPO_PUBLIC_METRICS_ENDPOINT || 'https://metrics.credibowpi.com/auth',
    ERROR_REPORTING_ENDPOINT: process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT || 'https://errors.credibowpi.com/report',
    PERFORMANCE_ENDPOINT: process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT || 'https://performance.credibowpi.com/metrics',
  },

  // Build Configuration
  BUILD: {
    TYPE: process.env.EXPO_PUBLIC_BUILD_TYPE || (__DEV__ ? 'development' : 'production'),
    VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    BUILD_NUMBER: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',
  },

  // Feature Flags
  FEATURES: {
    ENABLE_BOWPI_AUTH: process.env.EXPO_PUBLIC_ENABLE_BOWPI_AUTH === 'true',
    ENABLE_OFFLINE_MODE: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE !== 'false', // Default true
    ENABLE_BIOMETRIC_AUTH: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH !== 'false', // Default true
    ENABLE_SESSION_RECOVERY: process.env.EXPO_PUBLIC_ENABLE_SESSION_RECOVERY !== 'false', // Default true
    ENABLE_SUSPICIOUS_ACTIVITY_MONITORING: process.env.EXPO_PUBLIC_ENABLE_SUSPICIOUS_ACTIVITY_MONITORING !== 'false', // Default true
  },

  // Logging Configuration
  LOGGING: {
    ENABLE_PRODUCTION_LOGS: process.env.EXPO_PUBLIC_ENABLE_PRODUCTION_LOGS === 'true',
    ENABLE_SECURITY_LOGS: process.env.EXPO_PUBLIC_ENABLE_SECURITY_LOGS !== 'false', // Default true
    ENABLE_PERFORMANCE_LOGS: process.env.EXPO_PUBLIC_ENABLE_PERFORMANCE_LOGS !== 'false', // Default true
    LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL || (__DEV__ ? 'debug' : 'error'),
  },

  // Development Configuration
  DEVELOPMENT: {
    DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true' || __DEV__,
    ENABLE_MOCK_SERVICES: process.env.EXPO_PUBLIC_ENABLE_MOCK_SERVICES === 'true',
  },

  // Environment Detection
  ENVIRONMENT: {
    IS_DEVELOPMENT: __DEV__,
    IS_PRODUCTION: !__DEV__,
    IS_STAGING: process.env.EXPO_PUBLIC_BUILD_TYPE === 'staging',
  },
} as const;

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate required URLs in production
  if (!__DEV__) {
    if (!ENV.BOWPI.BASE_URL.startsWith('https://')) {
      errors.push('EXPO_PUBLIC_BOWPI_BASE_URL must use HTTPS in production');
    }

    if (!ENV.API.BASE_URL.startsWith('https://')) {
      errors.push('EXPO_PUBLIC_API_BASE_URL must use HTTPS in production');
    }

    if (!ENV.ANALYTICS.METRICS_ENDPOINT.startsWith('https://')) {
      errors.push('EXPO_PUBLIC_METRICS_ENDPOINT must use HTTPS in production');
    }
  }

  // Validate timeout values
  if (ENV.API.TIMEOUT < 5000 || ENV.API.TIMEOUT > 60000) {
    errors.push('EXPO_PUBLIC_API_TIMEOUT must be between 5000 and 60000 milliseconds');
  }

  // Validate encryption key
  if (ENV.SECURITY.ENCRYPTION_KEY.length < 16) {
    errors.push('EXPO_PUBLIC_ENCRYPTION_KEY must be at least 16 characters long');
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(ENV.LOGGING.LOG_LEVEL)) {
    errors.push(`EXPO_PUBLIC_LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const validation = validateEnvironment();
  
  if (!validation.isValid) {
    console.error('❌ Environment validation failed:', validation.errors);
    
    // In development, log warnings but continue
    if (__DEV__) {
      console.warn('⚠️ Continuing with invalid environment in development mode');
    } else {
      // In production, this should be treated as a critical error
      throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
    }
  }

  return {
    ...ENV,
    validation,
  };
};

/**
 * Log environment configuration (safe for production)
 */
export const logEnvironmentInfo = () => {
  const safeConfig = {
    build: {
      type: ENV.BUILD.TYPE,
      version: ENV.BUILD.VERSION,
      buildNumber: ENV.BUILD.BUILD_NUMBER,
    },
    environment: {
      isDevelopment: ENV.ENVIRONMENT.IS_DEVELOPMENT,
      isProduction: ENV.ENVIRONMENT.IS_PRODUCTION,
      isStaging: ENV.ENVIRONMENT.IS_STAGING,
    },
    features: ENV.FEATURES,
    logging: {
      level: ENV.LOGGING.LOG_LEVEL,
      enableProductionLogs: ENV.LOGGING.ENABLE_PRODUCTION_LOGS,
      enableSecurityLogs: ENV.LOGGING.ENABLE_SECURITY_LOGS,
      enablePerformanceLogs: ENV.LOGGING.ENABLE_PERFORMANCE_LOGS,
    },
    // Don't log sensitive URLs or keys in production
    endpoints: __DEV__ ? {
      bowpiBase: ENV.BOWPI.BASE_URL,
      apiBase: ENV.API.BASE_URL,
    } : {
      bowpiBase: ENV.BOWPI.BASE_URL.replace(/https?:\/\/([^\/]+).*/, 'https://$1/***'),
      apiBase: ENV.API.BASE_URL.replace(/https?:\/\/([^\/]+).*/, 'https://$1/***'),
    },
  };

  console.log('🔧 Environment Configuration:', safeConfig);
};

export type EnvironmentConfig = typeof ENV;
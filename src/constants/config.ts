// Application configuration constants
export const config = {
  // API Configuration
  api: {
    baseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.credibowpi.com',
    timeout: 30000, // 30 seconds
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
    encryptionKey: 'credibowpi_encryption_key',
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
} as const;

export type ConfigKey = keyof typeof config;
export type ConfigValue = (typeof config)[ConfigKey];

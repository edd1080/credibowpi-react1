// Authentication Providers - Export all available providers

export { LegacyAuthProvider } from './LegacyAuthProvider';
export { BowpiAuthProvider } from './BowpiAuthProvider';

// Re-export types for convenience
export type {
  AuthProvider,
  AuthProviderCapabilities,
  ProviderHealthStatus,
  ProviderDebugInfo,
  LegacyAuthConfig,
  BowpiAuthConfig
} from '../../../types/auth-providers';
// Authentication Retry Service - Intelligent retry mechanisms for auth operations
import NetworkAwareService from './NetworkAwareService';
import AuthErrorHandlingService, { AuthErrorCategory } from './AuthErrorHandlingService';

/**
 * Configuración de retry
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

/**
 * Resultado de operación con retry
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * Estrategias de retry
 */
export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_DELAY = 'fixed_delay',
  NETWORK_AWARE = 'network_aware'
}

/**
 * Servicio para manejo inteligente de reintentos en autenticación
 */
export class AuthRetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterMax: 1000
  };

  /**
   * Ejecutar operación con retry inteligente
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    strategy: RetryStrategy = RetryStrategy.NETWORK_AWARE
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: any;

    console.log('🔍 [AUTH_RETRY] Starting operation with retry strategy:', strategy);

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔍 [AUTH_RETRY] Attempt ${attempt}/${finalConfig.maxAttempts}`);

        const result = await operation();
        
        console.log(`✅ [AUTH_RETRY] Operation succeeded on attempt ${attempt}`);
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };

      } catch (error) {
        lastError = error;
        console.log(`❌ [AUTH_RETRY] Attempt ${attempt} failed:`, error);

        // Verificar si debemos continuar con los reintentos
        if (attempt === finalConfig.maxAttempts) {
          console.log('🔍 [AUTH_RETRY] Max attempts reached');
          break;
        }

        // Verificar condición personalizada de retry
        if (finalConfig.retryCondition && !finalConfig.retryCondition(error, attempt)) {
          console.log('🔍 [AUTH_RETRY] Custom retry condition failed, stopping');
          break;
        }

        // Verificar si el error permite retry
        if (!this.shouldRetryError(error)) {
          console.log('🔍 [AUTH_RETRY] Error type does not allow retry, stopping');
          break;
        }

        // Calcular delay para el siguiente intento
        const delay = await this.calculateDelay(strategy, attempt, finalConfig, error);
        
        console.log(`🔍 [AUTH_RETRY] Waiting ${delay}ms before next attempt`);

        // Callback de retry si existe
        if (finalConfig.onRetry) {
          finalConfig.onRetry(error, attempt);
        }

        // Esperar antes del siguiente intento
        await this.delay(delay);
      }
    }

    // Callback cuando se alcanzan los intentos máximos
    if (finalConfig.onMaxAttemptsReached) {
      finalConfig.onMaxAttemptsReached(lastError);
    }

    console.log('❌ [AUTH_RETRY] All retry attempts failed');

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Determinar si un error permite reintentos
   */
  private static shouldRetryError(error: any): boolean {
    const errorInfo = AuthErrorHandlingService.analyzeError(error);
    
    // No reintentar errores críticos de seguridad o configuración
    if (errorInfo.category === AuthErrorCategory.SECURITY ||
        errorInfo.category === AuthErrorCategory.CONFIGURATION) {
      return false;
    }

    // No reintentar errores de credenciales después del primer intento
    if (errorInfo.category === AuthErrorCategory.CREDENTIALS) {
      return false;
    }

    return errorInfo.canRetry;
  }

  /**
   * Calcular delay según la estrategia
   */
  private static async calculateDelay(
    strategy: RetryStrategy,
    attempt: number,
    config: RetryConfig,
    error: any
  ): Promise<number> {
    let delay: number;

    switch (strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        break;

      case RetryStrategy.LINEAR_BACKOFF:
        delay = Math.min(
          config.baseDelay * attempt,
          config.maxDelay
        );
        break;

      case RetryStrategy.FIXED_DELAY:
        delay = config.baseDelay;
        break;

      case RetryStrategy.NETWORK_AWARE:
        delay = await this.calculateNetworkAwareDelay(attempt, config, error);
        break;

      default:
        delay = config.baseDelay;
    }

    // Agregar jitter para evitar thundering herd
    const jitter = Math.random() * config.jitterMax;
    return Math.floor(delay + jitter);
  }

  /**
   * Calcular delay consciente de la red
   */
  private static async calculateNetworkAwareDelay(
    attempt: number,
    config: RetryConfig,
    error: any
  ): Promise<number> {
    const errorInfo = AuthErrorHandlingService.analyzeError(error);
    
    // Si es error de red, usar delay más largo
    if (errorInfo.category === AuthErrorCategory.NETWORK) {
      const networkQuality = NetworkAwareService.getNetworkQuality();
      
      let multiplier = 1;
      switch (networkQuality) {
        case 'poor':
          multiplier = 4;
          break;
        case 'fair':
          multiplier = 2;
          break;
        case 'good':
          multiplier = 1.5;
          break;
        case 'excellent':
          multiplier = 1;
          break;
        case 'offline':
          // Esperar a que se restaure la conexión
          console.log('🔍 [AUTH_RETRY] Waiting for network connection...');
          const connected = await NetworkAwareService.waitForConnection(30000);
          if (!connected) {
            return config.maxDelay; // Máximo delay si no se restaura
          }
          multiplier = 1;
          break;
      }

      return Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1) * multiplier,
        config.maxDelay
      );
    }

    // Para otros tipos de error, usar backoff exponencial estándar
    return Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );
  }

  /**
   * Crear delay con Promise
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Configuración predefinida para login
   */
  static getLoginRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      jitterMax: 1000,
      retryCondition: (error, attempt) => {
        const errorInfo = AuthErrorHandlingService.analyzeError(error);
        
        // No reintentar errores de credenciales
        if (errorInfo.category === AuthErrorCategory.CREDENTIALS) {
          return false;
        }
        
        // No reintentar errores críticos
        if (errorInfo.category === AuthErrorCategory.SECURITY ||
            errorInfo.category === AuthErrorCategory.CONFIGURATION) {
          return false;
        }
        
        return true;
      },
      onRetry: (error, attempt) => {
        console.log(`🔄 [AUTH_RETRY] Retrying login, attempt ${attempt}`);
        const errorInfo = AuthErrorHandlingService.analyzeError(error);
        console.log(`🔍 [AUTH_RETRY] Error category: ${errorInfo.category}`);
      }
    };
  }

  /**
   * Configuración predefinida para logout
   */
  static getLogoutRetryConfig(): RetryConfig {
    return {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitterMax: 500,
      retryCondition: (error, attempt) => {
        const errorInfo = AuthErrorHandlingService.analyzeError(error);
        
        // Solo reintentar errores de red para logout
        return errorInfo.category === AuthErrorCategory.NETWORK;
      },
      onRetry: (error, attempt) => {
        console.log(`🔄 [AUTH_RETRY] Retrying logout, attempt ${attempt}`);
      },
      onMaxAttemptsReached: (error) => {
        console.log('🔍 [AUTH_RETRY] Logout retry failed, proceeding with local logout');
        // El logout siempre debe proceder localmente
      }
    };
  }

  /**
   * Configuración predefinida para refresh token
   */
  static getTokenRefreshRetryConfig(): RetryConfig {
    return {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 3,
      jitterMax: 500,
      retryCondition: (error, attempt) => {
        const errorInfo = AuthErrorHandlingService.analyzeError(error);
        
        // No reintentar si el token es inválido
        if (errorInfo.category === AuthErrorCategory.CREDENTIALS) {
          return false;
        }
        
        return errorInfo.category === AuthErrorCategory.NETWORK ||
               errorInfo.category === AuthErrorCategory.SERVER;
      },
      onRetry: (error, attempt) => {
        console.log(`🔄 [AUTH_RETRY] Retrying token refresh, attempt ${attempt}`);
      }
    };
  }

  /**
   * Ejecutar login con retry inteligente
   */
  static async executeLoginWithRetry(
    loginOperation: () => Promise<any>
  ): Promise<RetryResult<any>> {
    return this.executeWithRetry(
      loginOperation,
      this.getLoginRetryConfig(),
      RetryStrategy.NETWORK_AWARE
    );
  }

  /**
   * Ejecutar logout con retry inteligente
   */
  static async executeLogoutWithRetry(
    logoutOperation: () => Promise<void>
  ): Promise<RetryResult<void>> {
    return this.executeWithRetry(
      logoutOperation,
      this.getLogoutRetryConfig(),
      RetryStrategy.NETWORK_AWARE
    );
  }

  /**
   * Ejecutar refresh token con retry inteligente
   */
  static async executeTokenRefreshWithRetry(
    refreshOperation: () => Promise<boolean>
  ): Promise<RetryResult<boolean>> {
    return this.executeWithRetry(
      refreshOperation,
      this.getTokenRefreshRetryConfig(),
      RetryStrategy.EXPONENTIAL_BACKOFF
    );
  }

  /**
   * Obtener estadísticas de retry
   */
  static getRetryStats(): {
    totalOperations: number;
    successfulRetries: number;
    failedRetries: number;
    averageAttempts: number;
  } {
    // En una implementación real, esto mantendría estadísticas
    // Por ahora, devolvemos valores por defecto
    return {
      totalOperations: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    };
  }
}

export default AuthRetryService;
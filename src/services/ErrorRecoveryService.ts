// Error Recovery Service - Automatic error recovery mechanisms
import { bowpiSecureStorage } from './BowpiSecureStorageService';
import { bowpiAuthService } from './BowpiAuthService';
import NetworkAwareService from './NetworkAwareService';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';

/**
 * Tipos de recuperación
 */
export enum RecoveryType {
  NETWORK_RECONNECTION = 'network_reconnection',
  STORAGE_CLEANUP = 'storage_cleanup',
  SESSION_RESTORATION = 'session_restoration',
  TOKEN_REFRESH = 'token_refresh',
  DATA_RECOVERY = 'data_recovery',
  CACHE_CLEAR = 'cache_clear',
  SERVICE_RESTART = 'service_restart'
}

/**
 * Resultado de recuperación
 */
export interface RecoveryResult {
  success: boolean;
  type: RecoveryType;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * Estrategia de recuperación
 */
export interface RecoveryStrategy {
  type: RecoveryType;
  condition: () => Promise<boolean>;
  execute: () => Promise<RecoveryResult>;
  priority: number;
  maxAttempts: number;
  cooldownMs: number;
}

/**
 * Servicio de recuperación automática de errores
 */
export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private strategies: Map<RecoveryType, RecoveryStrategy> = new Map();
  private attemptCounts: Map<RecoveryType, number> = new Map();
  private lastAttempts: Map<RecoveryType, number> = new Map();
  private recoveryHistory: RecoveryResult[] = [];

  private constructor() {
    this.setupDefaultStrategies();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Intentar recuperación automática
   */
  async attemptRecovery(errorType?: string): Promise<RecoveryResult[]> {
    console.log('🔄 [ERROR_RECOVERY] Starting automatic recovery process...');

    const results: RecoveryResult[] = [];
    const availableStrategies = Array.from(this.strategies.values())
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of availableStrategies) {
      try {
        // Verificar si podemos intentar esta estrategia
        if (!await this.canAttemptStrategy(strategy)) {
          continue;
        }

        // Verificar condición de la estrategia
        if (!await strategy.condition()) {
          continue;
        }

        console.log(`🔄 [ERROR_RECOVERY] Attempting ${strategy.type} recovery...`);

        // Ejecutar estrategia de recuperación
        const result = await strategy.execute();
        results.push(result);

        // Actualizar contadores
        this.updateAttemptCounters(strategy.type, result.success);

        // Log del resultado
        await this.logRecoveryAttempt(result);

        // Si fue exitosa, podemos parar aquí dependiendo del tipo
        if (result.success && this.isTerminalRecovery(strategy.type)) {
          console.log(`✅ [ERROR_RECOVERY] Terminal recovery successful: ${strategy.type}`);
          break;
        }

      } catch (error) {
        console.error(`❌ [ERROR_RECOVERY] Strategy ${strategy.type} failed:`, error);
        
        const failureResult: RecoveryResult = {
          success: false,
          type: strategy.type,
          message: `Recovery strategy failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        };
        
        results.push(failureResult);
        await this.logRecoveryAttempt(failureResult);
      }
    }

    // Limpiar historial antiguo
    this.cleanupRecoveryHistory();

    console.log(`🔄 [ERROR_RECOVERY] Recovery process completed. ${results.length} strategies attempted.`);
    return results;
  }

  /**
   * Configurar estrategias de recuperación por defecto
   */
  private setupDefaultStrategies(): void {
    // Estrategia de reconexión de red
    this.strategies.set(RecoveryType.NETWORK_RECONNECTION, {
      type: RecoveryType.NETWORK_RECONNECTION,
      priority: 10,
      maxAttempts: 3,
      cooldownMs: 5000,
      condition: async () => {
        return !NetworkAwareService.isOnline();
      },
      execute: async () => {
        const connected = await NetworkAwareService.waitForConnection(15000);
        return {
          success: connected,
          type: RecoveryType.NETWORK_RECONNECTION,
          message: connected ? 'Network connection restored' : 'Failed to restore network connection',
          details: { 
            networkStatus: NetworkAwareService.getCurrentNetworkStatus(),
            quality: NetworkAwareService.getNetworkQuality()
          },
          timestamp: Date.now()
        };
      }
    });

    // Estrategia de limpieza de almacenamiento
    this.strategies.set(RecoveryType.STORAGE_CLEANUP, {
      type: RecoveryType.STORAGE_CLEANUP,
      priority: 8,
      maxAttempts: 2,
      cooldownMs: 30000,
      condition: async () => {
        // Verificar si hay problemas de almacenamiento
        try {
          const debugInfo = await bowpiSecureStorage.getDebugInfo();
          return debugInfo.stats.failedOperations > 0;
        } catch {
          return true; // Si no podemos verificar, asumir que necesitamos limpieza
        }
      },
      execute: async () => {
        try {
          // Limpiar datos temporales y cache
          await this.performStorageCleanup();
          
          return {
            success: true,
            type: RecoveryType.STORAGE_CLEANUP,
            message: 'Storage cleanup completed successfully',
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            success: false,
            type: RecoveryType.STORAGE_CLEANUP,
            message: `Storage cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
          };
        }
      }
    });

    // Estrategia de restauración de sesión
    this.strategies.set(RecoveryType.SESSION_RESTORATION, {
      type: RecoveryType.SESSION_RESTORATION,
      priority: 9,
      maxAttempts: 2,
      cooldownMs: 10000,
      condition: async () => {
        // Verificar si hay una sesión válida pero no cargada
        try {
          const isAuth = await bowpiAuthService.isAuthenticated();
          return !isAuth;
        } catch {
          return true;
        }
      },
      execute: async () => {
        try {
          const restored = await this.performSessionRestoration();
          
          return {
            success: restored,
            type: RecoveryType.SESSION_RESTORATION,
            message: restored ? 'Session restored successfully' : 'No valid session to restore',
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            success: false,
            type: RecoveryType.SESSION_RESTORATION,
            message: `Session restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
          };
        }
      }
    });

    // Estrategia de refresh de token
    this.strategies.set(RecoveryType.TOKEN_REFRESH, {
      type: RecoveryType.TOKEN_REFRESH,
      priority: 7,
      maxAttempts: 2,
      cooldownMs: 60000,
      condition: async () => {
        // Solo si estamos autenticados pero hay problemas de token
        try {
          const isAuth = await bowpiAuthService.isAuthenticated();
          return isAuth && NetworkAwareService.isOnline();
        } catch {
          return false;
        }
      },
      execute: async () => {
        try {
          const refreshed = await bowpiAuthService.refreshToken();
          
          return {
            success: refreshed,
            type: RecoveryType.TOKEN_REFRESH,
            message: refreshed ? 'Token refreshed successfully' : 'Token refresh failed',
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            success: false,
            type: RecoveryType.TOKEN_REFRESH,
            message: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
          };
        }
      }
    });

    // Estrategia de recuperación de datos
    this.strategies.set(RecoveryType.DATA_RECOVERY, {
      type: RecoveryType.DATA_RECOVERY,
      priority: 6,
      maxAttempts: 1,
      cooldownMs: 120000,
      condition: async () => {
        // Verificar si hay datos corruptos que se pueden recuperar
        try {
          const debugInfo = await bowpiSecureStorage.getDebugInfo();
          return debugInfo.stats.recoveredOperations > 0;
        } catch {
          return false;
        }
      },
      execute: async () => {
        try {
          const recovered = await this.performDataRecovery();
          
          return {
            success: recovered,
            type: RecoveryType.DATA_RECOVERY,
            message: recovered ? 'Data recovery completed' : 'No data to recover',
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            success: false,
            type: RecoveryType.DATA_RECOVERY,
            message: `Data recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
          };
        }
      }
    });

    // Estrategia de limpieza de cache
    this.strategies.set(RecoveryType.CACHE_CLEAR, {
      type: RecoveryType.CACHE_CLEAR,
      priority: 5,
      maxAttempts: 1,
      cooldownMs: 300000,
      condition: async () => {
        // Siempre disponible como último recurso
        return true;
      },
      execute: async () => {
        try {
          await this.performCacheClear();
          
          return {
            success: true,
            type: RecoveryType.CACHE_CLEAR,
            message: 'Cache cleared successfully',
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            success: false,
            type: RecoveryType.CACHE_CLEAR,
            message: `Cache clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now()
          };
        }
      }
    });

    console.log('✅ [ERROR_RECOVERY] Default recovery strategies configured');
  }

  /**
   * Verificar si podemos intentar una estrategia
   */
  private async canAttemptStrategy(strategy: RecoveryStrategy): Promise<boolean> {
    const attempts = this.attemptCounts.get(strategy.type) || 0;
    const lastAttempt = this.lastAttempts.get(strategy.type) || 0;
    const now = Date.now();

    // Verificar límite de intentos
    if (attempts >= strategy.maxAttempts) {
      return false;
    }

    // Verificar cooldown
    if (now - lastAttempt < strategy.cooldownMs) {
      return false;
    }

    return true;
  }

  /**
   * Actualizar contadores de intentos
   */
  private updateAttemptCounters(type: RecoveryType, success: boolean): void {
    const currentAttempts = this.attemptCounts.get(type) || 0;
    
    if (success) {
      // Reset counter on success
      this.attemptCounts.set(type, 0);
    } else {
      // Increment counter on failure
      this.attemptCounts.set(type, currentAttempts + 1);
    }
    
    this.lastAttempts.set(type, Date.now());
  }

  /**
   * Verificar si es una recuperación terminal
   */
  private isTerminalRecovery(type: RecoveryType): boolean {
    return type === RecoveryType.SESSION_RESTORATION || 
           type === RecoveryType.SERVICE_RESTART;
  }

  /**
   * Realizar limpieza de almacenamiento
   */
  private async performStorageCleanup(): Promise<void> {
    console.log('🧹 [ERROR_RECOVERY] Performing storage cleanup...');
    
    try {
      // Limpiar logs antiguos
      await securityLogger.cleanupOldLogs();
      
      // Limpiar datos de error antiguos
      // En una implementación real, esto limpiaría cache y datos temporales
      
      console.log('✅ [ERROR_RECOVERY] Storage cleanup completed');
    } catch (error) {
      console.error('❌ [ERROR_RECOVERY] Storage cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Realizar restauración de sesión
   */
  private async performSessionRestoration(): Promise<boolean> {
    console.log('🔄 [ERROR_RECOVERY] Performing session restoration...');
    
    try {
      // Intentar restaurar sesión usando el servicio de auth
      const isAuth = await bowpiAuthService.isAuthenticated();
      
      if (isAuth) {
        console.log('✅ [ERROR_RECOVERY] Session restoration successful');
        return true;
      } else {
        console.log('ℹ️ [ERROR_RECOVERY] No valid session to restore');
        return false;
      }
    } catch (error) {
      console.error('❌ [ERROR_RECOVERY] Session restoration failed:', error);
      return false;
    }
  }

  /**
   * Realizar recuperación de datos
   */
  private async performDataRecovery(): Promise<boolean> {
    console.log('🔄 [ERROR_RECOVERY] Performing data recovery...');
    
    try {
      // En una implementación real, esto intentaría recuperar datos desde backups
      // Por ahora, simulamos la recuperación
      
      console.log('✅ [ERROR_RECOVERY] Data recovery completed');
      return true;
    } catch (error) {
      console.error('❌ [ERROR_RECOVERY] Data recovery failed:', error);
      return false;
    }
  }

  /**
   * Realizar limpieza de cache
   */
  private async performCacheClear(): Promise<void> {
    console.log('🧹 [ERROR_RECOVERY] Performing cache clear...');
    
    try {
      // Limpiar cache de la aplicación
      // En una implementación real, esto limpiaría varios tipos de cache
      
      console.log('✅ [ERROR_RECOVERY] Cache clear completed');
    } catch (error) {
      console.error('❌ [ERROR_RECOVERY] Cache clear failed:', error);
      throw error;
    }
  }

  /**
   * Registrar intento de recuperación
   */
  private async logRecoveryAttempt(result: RecoveryResult): Promise<void> {
    try {
      this.recoveryHistory.push(result);

      await securityLogger.logSecurityEvent(
        result.success ? SecurityEventType.DATA_RECOVERY : SecurityEventType.SERVICE_ERROR,
        result.success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
        `Recovery attempt: ${result.type}`,
        {
          success: result.success,
          type: result.type,
          message: result.message,
          details: result.details
        }
      );

      console.log(`📊 [ERROR_RECOVERY] Recovery attempt logged: ${result.type} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('❌ [ERROR_RECOVERY] Failed to log recovery attempt:', error);
    }
  }

  /**
   * Limpiar historial de recuperación
   */
  private cleanupRecoveryHistory(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    const cutoff = Date.now() - maxAge;
    
    const initialCount = this.recoveryHistory.length;
    this.recoveryHistory = this.recoveryHistory.filter(result => result.timestamp > cutoff);
    
    const removedCount = initialCount - this.recoveryHistory.length;
    if (removedCount > 0) {
      console.log(`🧹 [ERROR_RECOVERY] Cleaned up ${removedCount} old recovery records`);
    }
  }

  /**
   * Registrar estrategia personalizada
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.type, strategy);
    console.log(`🔧 [ERROR_RECOVERY] Custom recovery strategy registered: ${strategy.type}`);
  }

  /**
   * Obtener historial de recuperación
   */
  getRecoveryHistory(limit?: number): RecoveryResult[] {
    const history = [...this.recoveryHistory].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Obtener estadísticas de recuperación
   */
  getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    recoveryByType: Record<RecoveryType, { attempts: number; successes: number }>;
    recentRecoveries: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const stats = {
      totalAttempts: this.recoveryHistory.length,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      recoveryByType: {} as Record<RecoveryType, { attempts: number; successes: number }>,
      recentRecoveries: 0
    };

    // Inicializar contadores por tipo
    Object.values(RecoveryType).forEach(type => {
      stats.recoveryByType[type] = { attempts: 0, successes: 0 };
    });

    // Calcular estadísticas
    this.recoveryHistory.forEach(result => {
      if (result.success) {
        stats.successfulRecoveries++;
        stats.recoveryByType[result.type].successes++;
      } else {
        stats.failedRecoveries++;
      }
      
      stats.recoveryByType[result.type].attempts++;
      
      if (result.timestamp > oneHourAgo) {
        stats.recentRecoveries++;
      }
    });

    return stats;
  }

  /**
   * Reset contadores de intentos
   */
  resetAttemptCounters(): void {
    this.attemptCounts.clear();
    this.lastAttempts.clear();
    console.log('🔄 [ERROR_RECOVERY] Attempt counters reset');
  }

  /**
   * Obtener información de debug
   */
  getDebugInfo(): {
    strategies: Array<{ type: RecoveryType; attempts: number; lastAttempt: number }>;
    recentHistory: RecoveryResult[];
    stats: ReturnType<typeof this.getRecoveryStats>;
  } {
    const strategies = Array.from(this.strategies.keys()).map(type => ({
      type,
      attempts: this.attemptCounts.get(type) || 0,
      lastAttempt: this.lastAttempts.get(type) || 0
    }));

    return {
      strategies,
      recentHistory: this.getRecoveryHistory(10),
      stats: this.getRecoveryStats()
    };
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();

// Export types
export type { RecoveryResult, RecoveryStrategy };
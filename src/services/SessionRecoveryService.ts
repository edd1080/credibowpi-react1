// Session Recovery Service - Automatic session recovery and validation
import { bowpiSecureStorage } from './BowpiSecureStorageService';
import { bowpiAuthService } from './BowpiAuthService';
import NetworkAwareService from './NetworkAwareService';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';
import { suspiciousActivityMonitor } from './SuspiciousActivityMonitor';
import DataValidationService from './DataValidationService';
import { useAuthStore } from '../stores/authStore';
import { SessionInfo as BowpiSessionInfo, SessionRecoveryResult as BowpiSessionRecoveryResult } from '../types/bowpi';

/**
 * Tipos de recuperación de sesión
 */
export enum SessionRecoveryType {
  STORAGE_RECOVERY = 'storage_recovery',
  TOKEN_REFRESH = 'token_refresh',
  BACKGROUND_VALIDATION = 'background_validation',
  NETWORK_RESTORATION = 'network_restoration',
  CORRUPTION_RECOVERY = 'corruption_recovery',
  FOREGROUND_RESTORATION = 'foreground_restoration'
}

/**
 * Estado de la sesión
 */
export enum SessionState {
  VALID = 'valid',
  EXPIRED = 'expired',
  CORRUPTED = 'corrupted',
  MISSING = 'missing',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown'
}

/**
 * Resultado de recuperación de sesión (extendido)
 */
export interface SessionRecoveryResult extends BowpiSessionRecoveryResult {
  type: SessionRecoveryType;
  previousState: SessionState;
  newState: SessionState;
  userData?: any;
}

/**
 * Información de sesión (extendido)
 */
export interface SessionInfo extends BowpiSessionInfo {
  state: SessionState;
  expiresAt?: number;
}

/**
 * Configuración de recuperación
 */
interface SessionRecoveryConfig {
  enabled: boolean;
  autoRecoveryEnabled: boolean;
  backgroundValidationInterval: number;
  maxRecoveryAttempts: number;
  recoveryTimeout: number;
  validateOnForeground: boolean;
  validateOnNetworkRestore: boolean;
  corruptionRecoveryEnabled: boolean;
  tokenRefreshThreshold: number; // minutes before expiry
}

/**
 * Servicio de recuperación automática de sesión
 */
export class SessionRecoveryService {
  private static instance: SessionRecoveryService;
  private config: SessionRecoveryConfig;
  private recoveryHistory: SessionRecoveryResult[] = [];
  private backgroundValidationTimer: ReturnType<typeof setInterval> | null = null;
  private isRecovering = false;
  private lastValidationTime = 0;
  private recoveryAttempts = 0;

  private constructor() {
    this.config = {
      enabled: true,
      autoRecoveryEnabled: true,
      backgroundValidationInterval: 300000, // 5 minutes
      maxRecoveryAttempts: 3,
      recoveryTimeout: 30000, // 30 seconds
      validateOnForeground: true,
      validateOnNetworkRestore: true,
      corruptionRecoveryEnabled: true,
      tokenRefreshThreshold: 10 // 10 minutes before expiry
    };

    this.initializeService();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): SessionRecoveryService {
    if (!SessionRecoveryService.instance) {
      SessionRecoveryService.instance = new SessionRecoveryService();
    }
    return SessionRecoveryService.instance;
  }

  /**
   * Inicializar el servicio
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🔄 [SESSION_RECOVERY] Initializing session recovery service...');

      // Configurar validación en background
      if (this.config.enabled && this.config.autoRecoveryEnabled) {
        this.setupBackgroundValidation();
      }

      // Configurar listeners de eventos
      this.setupEventListeners();

      // Realizar validación inicial
      await this.performInitialValidation();

      console.log('✅ [SESSION_RECOVERY] Session recovery service initialized');
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to initialize service:', error);
    }
  }

  /**
   * Validar y recuperar sesión si es necesario
   */
  async validateAndRecoverSession(force: boolean = false): Promise<SessionRecoveryResult | null> {
    if (this.isRecovering && !force) {
      console.log('🔄 [SESSION_RECOVERY] Recovery already in progress, skipping...');
      return null;
    }

    console.log('🔍 [SESSION_RECOVERY] Starting session validation and recovery...');
    
    this.isRecovering = true;
    this.lastValidationTime = Date.now();

    try {
      // Obtener estado actual de la sesión
      const sessionInfo = await this.getSessionInfo();
      console.log('🔍 [SESSION_RECOVERY] Current session state:', sessionInfo.state);

      // Si la sesión es válida, no necesitamos recuperación
      if (sessionInfo.isValid && sessionInfo.state === SessionState.VALID) {
        console.log('✅ [SESSION_RECOVERY] Session is valid, no recovery needed');
        return null;
      }

      // Intentar recuperación según el estado
      const recoveryResult = await this.attemptRecovery(sessionInfo);
      
      // Registrar resultado
      this.recoveryHistory.push(recoveryResult);
      await this.logRecoveryAttempt(recoveryResult);

      // Limpiar historial antiguo
      this.cleanupRecoveryHistory();

      return recoveryResult;

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Session validation and recovery failed:', error);
      
      const failureResult: SessionRecoveryResult = {
        success: false,
        type: SessionRecoveryType.BACKGROUND_VALIDATION,
        previousState: SessionState.UNKNOWN,
        newState: SessionState.UNKNOWN,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };

      this.recoveryHistory.push(failureResult);
      await this.logRecoveryAttempt(failureResult);

      return failureResult;

    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Obtener información actual de la sesión
   */
  async getSessionInfo(): Promise<SessionInfo> {
    const validationTime = Date.now();

    try {
      // Verificar sesión en memoria primero
      const isAuthenticated = await bowpiAuthService.isAuthenticated();
      
      if (isAuthenticated) {
        const userData = await bowpiAuthService.getCurrentUser();
        const sessionId = await bowpiAuthService.getCurrentSessionId();

        if (userData && sessionId) {
          return {
            isValid: true,
            state: SessionState.VALID,
            userId: userData.userId,
            sessionId,
            lastActivity: Date.now(),
            expiresAt: userData.exp ? userData.exp * 1000 : undefined,
            source: 'memory',
            validationTime
          };
        }
      }

      // Verificar en storage si no está en memoria
      const storageInfo = await this.validateStorageSession();
      if (storageInfo) {
        return storageInfo;
      }

      // No hay sesión válida
      return {
        isValid: false,
        state: SessionState.MISSING,
        expiresAt: undefined,
        source: 'storage',
        validationTime
      };

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Error getting session info:', error);
      
      return {
        isValid: false,
        state: SessionState.UNKNOWN,
        expiresAt: undefined,
        source: 'storage',
        validationTime
      };
    }
  }

  /**
   * Validar sesión en storage
   */
  private async validateStorageSession(): Promise<SessionInfo | null> {
    try {
      // Cargar datos de sesión desde storage
      const [tokenResult, sessionResult] = await Promise.all([
        bowpiSecureStorage.secureRetrieve<string>('bowpi_encrypted_token'),
        bowpiSecureStorage.secureRetrieve<any>('bowpi_session_data')
      ]);

      if (!tokenResult.success || !sessionResult.success || !tokenResult.data || !sessionResult.data) {
        return {
          isValid: false,
          state: SessionState.MISSING,
          expiresAt: undefined,
          source: 'storage',
          validationTime: Date.now()
        };
      }

      // Validar integridad de los datos
      const sessionValidation = DataValidationService.validateSessionData(sessionResult.data);
      if (!sessionValidation.isValid) {
        console.warn('⚠️ [SESSION_RECOVERY] Session data validation failed:', sessionValidation.errors);
        
        await suspiciousActivityMonitor.recordDataCorruption(
          'session_validation',
          false,
          { errors: sessionValidation.errors }
        );

        return {
          isValid: false,
          state: SessionState.CORRUPTED,
          expiresAt: undefined,
          source: 'storage',
          validationTime: Date.now()
        };
      }

      const tokenValidation = DataValidationService.validateJWTStructure(tokenResult.data);
      if (!tokenValidation.isValid) {
        console.warn('⚠️ [SESSION_RECOVERY] Token structure validation failed:', tokenValidation.errors);
        
        return {
          isValid: false,
          state: SessionState.CORRUPTED,
          expiresAt: undefined,
          source: 'storage',
          validationTime: Date.now()
        };
      }

      // Validar datos de usuario
      const userData = sessionResult.data.userData;
      const userValidation = DataValidationService.validateAuthTokenData(userData);
      if (!userValidation.isValid) {
        console.warn('⚠️ [SESSION_RECOVERY] User data validation failed:', userValidation.errors);
        
        return {
          isValid: false,
          state: SessionState.CORRUPTED,
          expiresAt: undefined,
          source: 'storage',
          validationTime: Date.now()
        };
      }

      // Verificar expiración (para aplicaciones offline-first, esto es opcional)
      const now = Date.now() / 1000;
      const isExpired = userData.exp && userData.exp < now;

      return {
        isValid: !isExpired,
        state: isExpired ? SessionState.EXPIRED : SessionState.VALID,
        userId: userData.userId,
        sessionId: sessionResult.data.sessionId,
        lastActivity: sessionResult.data.timestamp,
        expiresAt: userData.exp ? userData.exp * 1000 : undefined,
        source: 'storage',
        validationTime: Date.now()
      };

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Error validating storage session:', error);
      return null;
    }
  }

  /**
   * Intentar recuperación según el estado de la sesión
   */
  private async attemptRecovery(sessionInfo: SessionInfo): Promise<SessionRecoveryResult> {
    console.log(`🔄 [SESSION_RECOVERY] Attempting recovery for state: ${sessionInfo.state}`);

    switch (sessionInfo.state) {
      case SessionState.MISSING:
        return await this.recoverFromMissingSession();
      
      case SessionState.CORRUPTED:
        return await this.recoverFromCorruptedSession();
      
      case SessionState.EXPIRED:
        return await this.recoverFromExpiredSession(sessionInfo);
      
      case SessionState.NETWORK_ERROR:
        return await this.recoverFromNetworkError();
      
      default:
        return await this.performGenericRecovery(sessionInfo);
    }
  }

  /**
   * Recuperar desde sesión faltante
   */
  private async recoverFromMissingSession(): Promise<SessionRecoveryResult> {
    console.log('🔄 [SESSION_RECOVERY] Attempting recovery from missing session...');

    try {
      // Verificar si hay datos de backup
      const backupResult = await bowpiSecureStorage.secureRetrieve<any>('bowpi_session_data_backup');
      
      if (backupResult.success && backupResult.data) {
        console.log('🔄 [SESSION_RECOVERY] Found backup session data, attempting restore...');
        
        // Validar datos de backup
        const validation = DataValidationService.validateSessionData(backupResult.data);
        if (validation.isValid) {
          // Restaurar desde backup
          await bowpiSecureStorage.secureStore('bowpi_session_data', validation.sanitizedData);
          
          // Actualizar auth store
          await this.updateAuthStore(backupResult.data.userData, backupResult.data.sessionId);
          
          return {
            success: true,
            type: SessionRecoveryType.STORAGE_RECOVERY,
            previousState: SessionState.MISSING,
            newState: SessionState.VALID,
            message: 'Session recovered from backup',
            userData: backupResult.data.userData,
            sessionId: backupResult.data.sessionId,
            timestamp: Date.now(),
            details: { source: 'backup' }
          };
        }
      }

      // No hay backup válido
      return {
        success: false,
        type: SessionRecoveryType.STORAGE_RECOVERY,
        previousState: SessionState.MISSING,
        newState: SessionState.MISSING,
        message: 'No valid session data found for recovery',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to recover from missing session:', error);
      
      return {
        success: false,
        type: SessionRecoveryType.STORAGE_RECOVERY,
        previousState: SessionState.MISSING,
        newState: SessionState.MISSING,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Recuperar desde sesión corrupta
   */
  private async recoverFromCorruptedSession(): Promise<SessionRecoveryResult> {
    console.log('🔄 [SESSION_RECOVERY] Attempting recovery from corrupted session...');

    if (!this.config.corruptionRecoveryEnabled) {
      return {
        success: false,
        type: SessionRecoveryType.CORRUPTION_RECOVERY,
        previousState: SessionState.CORRUPTED,
        newState: SessionState.CORRUPTED,
        message: 'Corruption recovery is disabled',
        timestamp: Date.now()
      };
    }

    try {
      // Limpiar datos corruptos
      await this.clearCorruptedData();
      
      // Intentar recuperar desde backup
      const backupRecovery = await this.recoverFromMissingSession();
      
      if (backupRecovery.success) {
        return {
          ...backupRecovery,
          type: SessionRecoveryType.CORRUPTION_RECOVERY,
          previousState: SessionState.CORRUPTED,
          message: 'Session recovered from corruption using backup'
        };
      }

      // Si no hay backup, la sesión se pierde
      return {
        success: false,
        type: SessionRecoveryType.CORRUPTION_RECOVERY,
        previousState: SessionState.CORRUPTED,
        newState: SessionState.MISSING,
        message: 'Corrupted session cleared, no backup available',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to recover from corrupted session:', error);
      
      return {
        success: false,
        type: SessionRecoveryType.CORRUPTION_RECOVERY,
        previousState: SessionState.CORRUPTED,
        newState: SessionState.CORRUPTED,
        message: `Corruption recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Recuperar desde sesión expirada
   */
  private async recoverFromExpiredSession(_sessionInfo: SessionInfo): Promise<SessionRecoveryResult> {
    console.log('🔄 [SESSION_RECOVERY] Attempting recovery from expired session...');

    try {
      // Solo intentar refresh si estamos online
      if (!NetworkAwareService.isOnline()) {
        return {
          success: false,
          type: SessionRecoveryType.TOKEN_REFRESH,
          previousState: SessionState.EXPIRED,
          newState: SessionState.NETWORK_ERROR,
          message: 'Cannot refresh expired token while offline',
          timestamp: Date.now()
        };
      }

      // Intentar refresh del token
      const refreshSuccess = await bowpiAuthService.refreshToken();
      
      if (refreshSuccess) {
        // Verificar que la sesión esté ahora válida
        const newSessionInfo = await this.getSessionInfo();
        
        return {
          success: true,
          type: SessionRecoveryType.TOKEN_REFRESH,
          previousState: SessionState.EXPIRED,
          newState: newSessionInfo.state,
          message: 'Token refreshed successfully',
          userData: newSessionInfo.userId || '',
          sessionId: newSessionInfo.sessionId || '',
          timestamp: Date.now(),
          details: { refreshed: true }
        };
      } else {
        return {
          success: false,
          type: SessionRecoveryType.TOKEN_REFRESH,
          previousState: SessionState.EXPIRED,
          newState: SessionState.EXPIRED,
          message: 'Token refresh failed',
          timestamp: Date.now()
        };
      }

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to recover from expired session:', error);
      
      return {
        success: false,
        type: SessionRecoveryType.TOKEN_REFRESH,
        previousState: SessionState.EXPIRED,
        newState: SessionState.EXPIRED,
        message: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Recuperar desde error de red
   */
  private async recoverFromNetworkError(): Promise<SessionRecoveryResult> {
    console.log('🔄 [SESSION_RECOVERY] Attempting recovery from network error...');

    try {
      // Esperar a que se restaure la conexión
      const connected = await NetworkAwareService.waitForConnection(this.config.recoveryTimeout);
      
      if (connected) {
        // Revalidar sesión ahora que tenemos conexión
        const sessionInfo = await this.getSessionInfo();
        
        return {
          success: sessionInfo.isValid,
          type: SessionRecoveryType.NETWORK_RESTORATION,
          previousState: SessionState.NETWORK_ERROR,
          newState: sessionInfo.state,
          message: connected ? 'Network restored, session revalidated' : 'Network restored but session invalid',
          userData: sessionInfo.userId || '',
          sessionId: sessionInfo.sessionId || '',
          timestamp: Date.now(),
          details: { networkRestored: true }
        };
      } else {
        return {
          success: false,
          type: SessionRecoveryType.NETWORK_RESTORATION,
          previousState: SessionState.NETWORK_ERROR,
          newState: SessionState.NETWORK_ERROR,
          message: 'Network connection could not be restored',
          timestamp: Date.now()
        };
      }

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to recover from network error:', error);
      
      return {
        success: false,
        type: SessionRecoveryType.NETWORK_RESTORATION,
        previousState: SessionState.NETWORK_ERROR,
        newState: SessionState.NETWORK_ERROR,
        message: `Network recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Recuperación genérica
   */
  private async performGenericRecovery(sessionInfo: SessionInfo): Promise<SessionRecoveryResult> {
    console.log('🔄 [SESSION_RECOVERY] Performing generic recovery...');

    try {
      // Intentar revalidar la sesión
      const newSessionInfo = await this.getSessionInfo();
      
      return {
        success: newSessionInfo.isValid,
        type: SessionRecoveryType.BACKGROUND_VALIDATION,
        previousState: sessionInfo.state,
        newState: newSessionInfo.state,
        message: 'Session revalidated',
        userData: newSessionInfo.userId || '',
        sessionId: newSessionInfo.sessionId || '',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Generic recovery failed:', error);
      
      return {
        success: false,
        type: SessionRecoveryType.BACKGROUND_VALIDATION,
        previousState: sessionInfo.state,
        newState: SessionState.UNKNOWN,
        message: `Generic recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Limpiar datos corruptos
   */
  private async clearCorruptedData(): Promise<void> {
    console.log('🧹 [SESSION_RECOVERY] Clearing corrupted session data...');

    try {
      const keysToDelete = [
        'bowpi_encrypted_token',
        'bowpi_session_data',
        'bowpi_session_id',
        'bowpi_user_profile'
      ];

      await Promise.all(
        keysToDelete.map(key => bowpiSecureStorage.secureDelete(key))
      );

      console.log('✅ [SESSION_RECOVERY] Corrupted data cleared');
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to clear corrupted data:', error);
      throw error;
    }
  }

  /**
   * Actualizar auth store con datos de sesión
   */
  private async updateAuthStore(userData: any, _sessionId: string): Promise<void> {
    try {
      const authStore = useAuthStore.getState();
      
      // Convertir datos de Bowpi a formato de app
      const appUser = {
        id: userData.userId,
        email: userData.email,
        name: `${userData.userProfile.names} ${userData.userProfile.lastNames}`.trim(),
        profile: userData.userProfile
      };

      // Actualizar store
      authStore.setUser(appUser);
      authStore.setAuthenticated(true);
      authStore.setBowpiAuth(userData.encryptedToken || '', userData);

      console.log('✅ [SESSION_RECOVERY] Auth store updated with recovered session');
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to update auth store:', error);
      throw error;
    }
  }

  /**
   * Configurar validación en background
   */
  private setupBackgroundValidation(): void {
    if (this.backgroundValidationTimer) {
      clearInterval(this.backgroundValidationTimer);
    }

    this.backgroundValidationTimer = setInterval(async () => {
      try {
        await this.validateAndRecoverSession();
      } catch (error) {
        console.error('❌ [SESSION_RECOVERY] Background validation failed:', error);
      }
    }, this.config.backgroundValidationInterval);

    console.log('✅ [SESSION_RECOVERY] Background validation configured');
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    // Listener para restauración de red
    if (this.config.validateOnNetworkRestore) {
      NetworkAwareService.addNetworkListener(async (status) => {
        if (status.isConnected) {
          console.log('🔄 [SESSION_RECOVERY] Network restored, validating session...');
          await this.validateAndRecoverSession();
        }
      });
    }

    console.log('✅ [SESSION_RECOVERY] Event listeners configured');
  }

  /**
   * Realizar validación inicial
   */
  private async performInitialValidation(): Promise<void> {
    try {
      console.log('🔄 [SESSION_RECOVERY] Performing initial session validation...');
      await this.validateAndRecoverSession();
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Initial validation failed:', error);
    }
  }

  /**
   * Registrar intento de recuperación
   */
  private async logRecoveryAttempt(result: SessionRecoveryResult): Promise<void> {
    try {
      await securityLogger.logSecurityEvent(
        result.success ? SecurityEventType.DATA_RECOVERY : SecurityEventType.SERVICE_ERROR,
        result.success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
        `Session recovery: ${result.type}`,
        {
          success: result.success,
          type: result.type,
          previousState: result.previousState,
          newState: result.newState,
          message: result.message,
          details: result.details
        },
        result.userData,
        result.sessionId
      );

      console.log(`📊 [SESSION_RECOVERY] Recovery attempt logged: ${result.type} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Failed to log recovery attempt:', error);
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
      console.log(`🧹 [SESSION_RECOVERY] Cleaned up ${removedCount} old recovery records`);
    }
  }

  /**
   * Validar sesión en foreground (cuando la app vuelve al frente)
   */
  async validateOnForeground(): Promise<void> {
    if (!this.config.validateOnForeground) {
      return;
    }

    console.log('🔄 [SESSION_RECOVERY] Validating session on foreground...');
    
    try {
      await this.validateAndRecoverSession();
    } catch (error) {
      console.error('❌ [SESSION_RECOVERY] Foreground validation failed:', error);
    }
  }

  /**
   * Obtener historial de recuperación
   */
  getRecoveryHistory(limit?: number): SessionRecoveryResult[] {
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
    recoveryByType: Record<SessionRecoveryType, { attempts: number; successes: number }>;
    lastRecoveryTime: number | null;
    isRecovering: boolean;
  } {
    const stats = {
      totalAttempts: this.recoveryHistory.length,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      recoveryByType: {} as Record<SessionRecoveryType, { attempts: number; successes: number }>,
      lastRecoveryTime: null as number | null,
      isRecovering: this.isRecovering
    };

    // Inicializar contadores por tipo
    Object.values(SessionRecoveryType).forEach(type => {
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
      
      if (!stats.lastRecoveryTime || result.timestamp > stats.lastRecoveryTime) {
        stats.lastRecoveryTime = result.timestamp;
      }
    });

    return stats;
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<SessionRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reconfigurar validación en background si cambió
    if (newConfig.backgroundValidationInterval || newConfig.autoRecoveryEnabled !== undefined) {
      if (this.config.enabled && this.config.autoRecoveryEnabled) {
        this.setupBackgroundValidation();
      } else if (this.backgroundValidationTimer) {
        clearInterval(this.backgroundValidationTimer);
        this.backgroundValidationTimer = null;
      }
    }
    
    console.log('🔧 [SESSION_RECOVERY] Configuration updated');
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): SessionRecoveryConfig {
    return { ...this.config };
  }

  /**
   * Obtener información de debug
   */
  getDebugInfo(): {
    config: SessionRecoveryConfig;
    isRecovering: boolean;
    lastValidationTime: number;
    recoveryAttempts: number;
    recentHistory: SessionRecoveryResult[];
    stats: any;
  } {
    return {
      config: this.config,
      isRecovering: this.isRecovering,
      lastValidationTime: this.lastValidationTime,
      recoveryAttempts: this.recoveryAttempts,
      recentHistory: this.getRecoveryHistory(5),
      stats: this.getRecoveryStats()
    };
  }

  /**
   * Cleanup al destruir el servicio
   */
  async destroy(): Promise<void> {
    if (this.backgroundValidationTimer) {
      clearInterval(this.backgroundValidationTimer);
      this.backgroundValidationTimer = null;
    }

    console.log('🔄 [SESSION_RECOVERY] Service destroyed');
  }
}

// Export singleton instance
export const sessionRecoveryService = SessionRecoveryService.getInstance();
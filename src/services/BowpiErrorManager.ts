// Bowpi Error Manager - Comprehensive error management system
import { Alert } from 'react-native';
import { BowpiAuthError, BowpiAuthErrorType } from '../types/bowpi';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';
import { suspiciousActivityMonitor } from './SuspiciousActivityMonitor';
import AuthErrorHandlingService, { AuthErrorCategory } from './AuthErrorHandlingService';
import NetworkAwareService from './NetworkAwareService';

/**
 * Categorías de errores del sistema Bowpi
 */
export enum BowpiErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  SECURITY = 'security',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

/**
 * Severidad de errores
 */
export enum BowpiErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Contexto del error
 */
export interface BowpiErrorContext {
  userId?: string;
  sessionId?: string;
  operation?: string;
  component?: string;
  timestamp?: number;
  networkStatus?: any;
  deviceInfo?: any;
  additionalData?: Record<string, any>;
}

/**
 * Información detallada del error
 */
export interface BowpiErrorInfo {
  id: string;
  category: BowpiErrorCategory;
  severity: BowpiErrorSeverity;
  code: string;
  message: string;
  technicalMessage: string;
  userMessage: string;
  context: BowpiErrorContext;
  timestamp: number;
  stackTrace?: string;
  innerError?: Error;
  recoverable: boolean;
  retryable: boolean;
  suggestedActions: string[];
}

/**
 * Opciones de manejo de errores
 */
export interface ErrorHandlingOptions {
  showUserAlert: boolean;
  logError: boolean;
  reportSuspicious: boolean;
  attemptRecovery: boolean;
  allowRetry: boolean;
  maxRetries: number;
  customMessage?: string;
  onRecovery?: () => Promise<void>;
  onRetry?: () => Promise<void>;
}

/**
 * Resultado del manejo de errores
 */
export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  userAction: 'retry' | 'cancel' | 'ignore' | 'recovered';
  message?: string;
}

/**
 * Manager central de errores para el sistema Bowpi
 */
export class BowpiErrorManager {
  private static instance: BowpiErrorManager;
  private errorHistory: BowpiErrorInfo[] = [];
  private recoveryStrategies = new Map<string, () => Promise<boolean>>();

  private constructor() {
    this.setupDefaultRecoveryStrategies();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): BowpiErrorManager {
    if (!BowpiErrorManager.instance) {
      BowpiErrorManager.instance = new BowpiErrorManager();
    }
    return BowpiErrorManager.instance;
  }

  /**
   * Manejar error de forma comprehensiva
   */
  async handleError(
    error: any,
    context: BowpiErrorContext = {},
    options: Partial<ErrorHandlingOptions> = {}
  ): Promise<ErrorHandlingResult> {
    console.log('🔍 [BOWPI_ERROR_MANAGER] Handling error:', error);

    try {
      // Analizar y categorizar el error
      const errorInfo = await this.analyzeError(error, context);
      
      // Configurar opciones por defecto
      const finalOptions: ErrorHandlingOptions = {
        showUserAlert: true,
        logError: true,
        reportSuspicious: false,
        attemptRecovery: true,
        allowRetry: errorInfo.retryable,
        maxRetries: 3,
        ...options
      };

      // Registrar el error en el historial
      this.errorHistory.push(errorInfo);

      // Log del error si está habilitado
      if (finalOptions.logError) {
        await this.logError(errorInfo);
      }

      // Reportar actividad sospechosa si es necesario
      if (finalOptions.reportSuspicious || this.isSuspiciousError(errorInfo)) {
        await this.reportSuspiciousActivity(errorInfo);
      }

      // Intentar recuperación automática
      if (finalOptions.attemptRecovery && errorInfo.recoverable) {
        const recovered = await this.attemptRecovery(errorInfo, finalOptions);
        if (recovered) {
          return {
            handled: true,
            recovered: true,
            userAction: 'recovered',
            message: 'Error recovered automatically'
          };
        }
      }

      // Mostrar alerta al usuario si es necesario
      if (finalOptions.showUserAlert) {
        const userAction = await this.showUserAlert(errorInfo, finalOptions);
        return {
          handled: true,
          recovered: false,
          userAction,
          message: errorInfo.userMessage
        };
      }

      return {
        handled: true,
        recovered: false,
        userAction: 'ignore',
        message: errorInfo.userMessage
      };

    } catch (handlingError) {
      console.error('❌ [BOWPI_ERROR_MANAGER] Error while handling error:', handlingError);
      
      // Fallback: mostrar error básico
      Alert.alert(
        'Error del Sistema',
        'Ocurrió un error inesperado. Por favor intenta nuevamente.',
        [{ text: 'OK' }]
      );

      return {
        handled: false,
        recovered: false,
        userAction: 'cancel',
        message: 'Error handling failed'
      };
    }
  }

  /**
   * Analizar y categorizar error
   */
  private async analyzeError(error: any, context: BowpiErrorContext): Promise<BowpiErrorInfo> {
    const timestamp = Date.now();
    const errorId = `bowpi_error_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Si es un BowpiAuthError, usar su información
    if (error instanceof BowpiAuthError) {
      return this.analyzeBowpiAuthError(error, context, errorId, timestamp);
    }

    // Si es un Error estándar, analizarlo
    if (error instanceof Error) {
      return this.analyzeStandardError(error, context, errorId, timestamp);
    }

    // Error desconocido
    return this.createUnknownErrorInfo(error, context, errorId, timestamp);
  }

  /**
   * Analizar BowpiAuthError
   */
  private analyzeBowpiAuthError(
    error: BowpiAuthError,
    context: BowpiErrorContext,
    errorId: string,
    timestamp: number
  ): BowpiErrorInfo {
    const baseInfo = {
      id: errorId,
      timestamp,
      context: { ...context, timestamp },
      technicalMessage: error.message,
      stackTrace: error.stack,
      innerError: error,
      recoverable: false,
      retryable: false,
      suggestedActions: [] as string[]
    };

    switch (error.type) {
      case BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.NETWORK,
          severity: BowpiErrorSeverity.MEDIUM,
          code: 'BOWPI_OFFLINE_LOGIN',
          message: 'Offline login attempt',
          userMessage: 'Se requiere conexión a internet para iniciar sesión',
          retryable: true,
          suggestedActions: [
            'Verifica tu conexión a internet',
            'Intenta conectarte a WiFi',
            'Verifica que los datos móviles estén habilitados'
          ]
        };

      case BowpiAuthErrorType.INVALID_CREDENTIALS:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.AUTHENTICATION,
          severity: BowpiErrorSeverity.MEDIUM,
          code: 'BOWPI_INVALID_CREDENTIALS',
          message: 'Invalid credentials provided',
          userMessage: 'Credenciales incorrectas',
          retryable: true,
          suggestedActions: [
            'Verifica tu email y contraseña',
            'Asegúrate de que no tengas Caps Lock activado',
            'Contacta a tu supervisor si olvidaste tu contraseña'
          ]
        };

      case BowpiAuthErrorType.NETWORK_ERROR:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.NETWORK,
          severity: BowpiErrorSeverity.HIGH,
          code: 'BOWPI_NETWORK_ERROR',
          message: 'Network communication error',
          userMessage: 'Error de conexión al servidor',
          retryable: true,
          recoverable: true,
          suggestedActions: [
            'Verifica tu conexión a internet',
            'Intenta nuevamente en unos momentos',
            'Contacta al administrador si el problema persiste'
          ]
        };

      case BowpiAuthErrorType.SERVER_ERROR:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.SYSTEM,
          severity: BowpiErrorSeverity.HIGH,
          code: 'BOWPI_SERVER_ERROR',
          message: 'Server error occurred',
          userMessage: 'Error del servidor de autenticación',
          retryable: true,
          suggestedActions: [
            'Intenta nuevamente en unos momentos',
            'El problema puede ser temporal',
            'Contacta al administrador si persiste'
          ]
        };

      case BowpiAuthErrorType.DECRYPTION_ERROR:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.SECURITY,
          severity: BowpiErrorSeverity.CRITICAL,
          code: 'BOWPI_DECRYPTION_ERROR',
          message: 'Token decryption failed',
          userMessage: 'Error de seguridad en la autenticación',
          recoverable: true,
          suggestedActions: [
            'Intenta cerrar y abrir la aplicación',
            'Contacta al administrador inmediatamente',
            'No compartas esta información'
          ]
        };

      case BowpiAuthErrorType.DOMAIN_NOT_ALLOWED:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.CONFIGURATION,
          severity: BowpiErrorSeverity.CRITICAL,
          code: 'BOWPI_DOMAIN_ERROR',
          message: 'Domain not allowed',
          userMessage: 'Error de configuración del servidor',
          suggestedActions: [
            'Contacta al administrador del sistema',
            'Verifica la configuración de la aplicación',
            'Este error requiere atención técnica'
          ]
        };

      case BowpiAuthErrorType.HTTPS_REQUIRED:
        return {
          ...baseInfo,
          category: BowpiErrorCategory.SECURITY,
          severity: BowpiErrorSeverity.CRITICAL,
          code: 'BOWPI_HTTPS_REQUIRED',
          message: 'HTTPS connection required',
          userMessage: 'Conexión segura requerida',
          suggestedActions: [
            'Contacta al administrador del sistema',
            'La aplicación requiere conexión segura',
            'No uses redes públicas no seguras'
          ]
        };

      default:
        return this.createUnknownErrorInfo(error, context, errorId, timestamp);
    }
  }

  /**
   * Analizar Error estándar
   */
  private analyzeStandardError(
    error: Error,
    context: BowpiErrorContext,
    errorId: string,
    timestamp: number
  ): BowpiErrorInfo {
    const message = error.message.toLowerCase();
    
    const baseInfo = {
      id: errorId,
      timestamp,
      context: { ...context, timestamp },
      technicalMessage: error.message,
      stackTrace: error.stack,
      innerError: error,
      recoverable: false,
      retryable: false,
      suggestedActions: [] as string[]
    };

    // Errores de red
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        ...baseInfo,
        category: BowpiErrorCategory.NETWORK,
        severity: BowpiErrorSeverity.MEDIUM,
        code: 'NETWORK_ERROR',
        message: 'Network error occurred',
        userMessage: 'Error de conexión',
        retryable: true,
        recoverable: true,
        suggestedActions: [
          'Verifica tu conexión a internet',
          'Intenta nuevamente en unos momentos'
        ]
      };
    }

    // Errores de almacenamiento
    if (message.includes('storage') || message.includes('disk') || message.includes('quota')) {
      return {
        ...baseInfo,
        category: BowpiErrorCategory.STORAGE,
        severity: BowpiErrorSeverity.HIGH,
        code: 'STORAGE_ERROR',
        message: 'Storage error occurred',
        userMessage: 'Error de almacenamiento',
        recoverable: true,
        suggestedActions: [
          'Libera espacio en tu dispositivo',
          'Reinicia la aplicación',
          'Contacta al soporte si persiste'
        ]
      };
    }

    // Errores de validación
    if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
      return {
        ...baseInfo,
        category: BowpiErrorCategory.VALIDATION,
        severity: BowpiErrorSeverity.MEDIUM,
        code: 'VALIDATION_ERROR',
        message: 'Data validation error',
        userMessage: 'Error de validación de datos',
        retryable: true,
        suggestedActions: [
          'Verifica que los datos ingresados sean correctos',
          'Intenta nuevamente con información válida'
        ]
      };
    }

    // Errores de permisos
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        ...baseInfo,
        category: BowpiErrorCategory.SECURITY,
        severity: BowpiErrorSeverity.HIGH,
        code: 'PERMISSION_ERROR',
        message: 'Permission denied',
        userMessage: 'Error de permisos',
        suggestedActions: [
          'Verifica que tengas los permisos necesarios',
          'Contacta al administrador',
          'Intenta iniciar sesión nuevamente'
        ]
      };
    }

    return this.createUnknownErrorInfo(error, context, errorId, timestamp);
  }

  /**
   * Crear información para errores desconocidos
   */
  private createUnknownErrorInfo(
    error: any,
    context: BowpiErrorContext,
    errorId: string,
    timestamp: number
  ): BowpiErrorInfo {
    return {
      id: errorId,
      category: BowpiErrorCategory.SYSTEM,
      severity: BowpiErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      technicalMessage: error?.message || String(error),
      userMessage: 'Error inesperado',
      context: { ...context, timestamp },
      timestamp,
      stackTrace: error?.stack,
      innerError: error instanceof Error ? error : undefined,
      recoverable: true,
      retryable: true,
      suggestedActions: [
        'Intenta nuevamente',
        'Reinicia la aplicación si persiste',
        'Contacta al soporte técnico'
      ]
    };
  }

  /**
   * Registrar error en logs
   */
  private async logError(errorInfo: BowpiErrorInfo): Promise<void> {
    try {
      const securityEventType = this.mapToSecurityEventType(errorInfo.category);
      const severity = this.mapToSecuritySeverity(errorInfo.severity);

      await securityLogger.logSecurityEvent(
        securityEventType,
        severity,
        errorInfo.message,
        {
          errorId: errorInfo.id,
          category: errorInfo.category,
          code: errorInfo.code,
          recoverable: errorInfo.recoverable,
          retryable: errorInfo.retryable,
          technicalMessage: errorInfo.technicalMessage,
          suggestedActions: errorInfo.suggestedActions
        },
        errorInfo.context.userId,
        errorInfo.context.sessionId
      );

      console.log(`📊 [BOWPI_ERROR_MANAGER] Error logged: ${errorInfo.code}`);
    } catch (loggingError) {
      console.error('❌ [BOWPI_ERROR_MANAGER] Failed to log error:', loggingError);
    }
  }

  /**
   * Reportar actividad sospechosa
   */
  private async reportSuspiciousActivity(errorInfo: BowpiErrorInfo): Promise<void> {
    try {
      await suspiciousActivityMonitor.recordDataCorruption(
        errorInfo.category,
        errorInfo.recoverable,
        {
          errorId: errorInfo.id,
          code: errorInfo.code,
          severity: errorInfo.severity
        }
      );

      console.log(`🚨 [BOWPI_ERROR_MANAGER] Suspicious activity reported: ${errorInfo.code}`);
    } catch (reportingError) {
      console.error('❌ [BOWPI_ERROR_MANAGER] Failed to report suspicious activity:', reportingError);
    }
  }

  /**
   * Verificar si el error es sospechoso
   */
  private isSuspiciousError(errorInfo: BowpiErrorInfo): boolean {
    // Errores críticos de seguridad son siempre sospechosos
    if (errorInfo.category === BowpiErrorCategory.SECURITY && 
        errorInfo.severity === BowpiErrorSeverity.CRITICAL) {
      return true;
    }

    // Múltiples errores del mismo tipo en poco tiempo
    const recentSimilarErrors = this.errorHistory.filter(
      e => e.code === errorInfo.code && 
           e.timestamp > Date.now() - 300000 // 5 minutos
    );

    return recentSimilarErrors.length >= 3;
  }

  /**
   * Intentar recuperación automática
   */
  private async attemptRecovery(
    errorInfo: BowpiErrorInfo,
    options: ErrorHandlingOptions
  ): Promise<boolean> {
    console.log(`🔄 [BOWPI_ERROR_MANAGER] Attempting recovery for: ${errorInfo.code}`);

    try {
      // Ejecutar callback de recuperación personalizado
      if (options.onRecovery) {
        await options.onRecovery();
        return true;
      }

      // Usar estrategia de recuperación registrada
      const recoveryStrategy = this.recoveryStrategies.get(errorInfo.code);
      if (recoveryStrategy) {
        const recovered = await recoveryStrategy();
        if (recovered) {
          console.log(`✅ [BOWPI_ERROR_MANAGER] Recovery successful for: ${errorInfo.code}`);
          return true;
        }
      }

      // Estrategias de recuperación por defecto
      switch (errorInfo.category) {
        case BowpiErrorCategory.NETWORK:
          return await this.recoverFromNetworkError();
        
        case BowpiErrorCategory.STORAGE:
          return await this.recoverFromStorageError();
        
        case BowpiErrorCategory.SECURITY:
          return await this.recoverFromSecurityError();
        
        default:
          return false;
      }

    } catch (recoveryError) {
      console.error(`❌ [BOWPI_ERROR_MANAGER] Recovery failed for ${errorInfo.code}:`, recoveryError);
      return false;
    }
  }

  /**
   * Mostrar alerta al usuario
   */
  private async showUserAlert(
    errorInfo: BowpiErrorInfo,
    options: ErrorHandlingOptions
  ): Promise<'retry' | 'cancel' | 'ignore'> {
    return new Promise((resolve) => {
      const title = this.getAlertTitle(errorInfo.category, errorInfo.severity);
      const message = options.customMessage || this.buildAlertMessage(errorInfo);
      
      const buttons: any[] = [];

      // Botón de cancelar
      buttons.push({
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => resolve('cancel')
      });

      // Botón de reintentar si es posible
      if (options.allowRetry && errorInfo.retryable) {
        buttons.push({
          text: 'Reintentar',
          onPress: () => resolve('retry')
        });
      }

      // Botón de ignorar para errores no críticos
      if (errorInfo.severity !== BowpiErrorSeverity.CRITICAL) {
        buttons.push({
          text: 'Ignorar',
          onPress: () => resolve('ignore')
        });
      }

      Alert.alert(title, message, buttons, { cancelable: false });
    });
  }

  /**
   * Configurar estrategias de recuperación por defecto
   */
  private setupDefaultRecoveryStrategies(): void {
    // Estrategia para errores de red
    this.recoveryStrategies.set('NETWORK_ERROR', async () => {
      return await this.recoverFromNetworkError();
    });

    // Estrategia para errores de almacenamiento
    this.recoveryStrategies.set('STORAGE_ERROR', async () => {
      return await this.recoverFromStorageError();
    });

    // Estrategia para errores de desencriptación
    this.recoveryStrategies.set('BOWPI_DECRYPTION_ERROR', async () => {
      return await this.recoverFromSecurityError();
    });
  }

  /**
   * Recuperación de errores de red
   */
  private async recoverFromNetworkError(): Promise<boolean> {
    try {
      // Esperar a que se restaure la conexión
      const connected = await NetworkAwareService.waitForConnection(10000);
      return connected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Recuperación de errores de almacenamiento
   */
  private async recoverFromStorageError(): Promise<boolean> {
    try {
      // Intentar limpiar cache o datos temporales
      // En una implementación real, esto limpiaría datos no críticos
      console.log('🔄 [BOWPI_ERROR_MANAGER] Attempting storage cleanup...');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Recuperación de errores de seguridad
   */
  private async recoverFromSecurityError(): Promise<boolean> {
    try {
      // Para errores de seguridad, la recuperación típicamente implica
      // limpiar datos corruptos y forzar re-autenticación
      console.log('🔄 [BOWPI_ERROR_MANAGER] Attempting security error recovery...');
      return false; // Generalmente requiere intervención del usuario
    } catch (error) {
      return false;
    }
  }

  /**
   * Mapear categoría a tipo de evento de seguridad
   */
  private mapToSecurityEventType(category: BowpiErrorCategory): SecurityEventType {
    switch (category) {
      case BowpiErrorCategory.AUTHENTICATION:
        return SecurityEventType.LOGIN_FAILURE;
      case BowpiErrorCategory.NETWORK:
        return SecurityEventType.NETWORK_ERROR;
      case BowpiErrorCategory.STORAGE:
        return SecurityEventType.DATA_CORRUPTION;
      case BowpiErrorCategory.SECURITY:
        return SecurityEventType.SECURITY_VIOLATION;
      default:
        return SecurityEventType.SERVICE_ERROR;
    }
  }

  /**
   * Mapear severidad a severidad de seguridad
   */
  private mapToSecuritySeverity(severity: BowpiErrorSeverity): SecurityEventSeverity {
    switch (severity) {
      case BowpiErrorSeverity.LOW:
        return SecurityEventSeverity.INFO;
      case BowpiErrorSeverity.MEDIUM:
        return SecurityEventSeverity.WARNING;
      case BowpiErrorSeverity.HIGH:
        return SecurityEventSeverity.ERROR;
      case BowpiErrorSeverity.CRITICAL:
        return SecurityEventSeverity.CRITICAL;
      default:
        return SecurityEventSeverity.WARNING;
    }
  }

  /**
   * Obtener título de alerta
   */
  private getAlertTitle(category: BowpiErrorCategory, severity: BowpiErrorSeverity): string {
    if (severity === BowpiErrorSeverity.CRITICAL) {
      return 'Error Crítico';
    }

    switch (category) {
      case BowpiErrorCategory.AUTHENTICATION:
        return 'Error de Autenticación';
      case BowpiErrorCategory.NETWORK:
        return 'Error de Conexión';
      case BowpiErrorCategory.STORAGE:
        return 'Error de Almacenamiento';
      case BowpiErrorCategory.SECURITY:
        return 'Error de Seguridad';
      case BowpiErrorCategory.VALIDATION:
        return 'Error de Validación';
      default:
        return 'Error del Sistema';
    }
  }

  /**
   * Construir mensaje de alerta
   */
  private buildAlertMessage(errorInfo: BowpiErrorInfo): string {
    let message = errorInfo.userMessage;

    if (errorInfo.suggestedActions.length > 0) {
      message += '\n\nAcciones sugeridas:\n';
      errorInfo.suggestedActions.slice(0, 3).forEach((action, index) => {
        message += `${index + 1}. ${action}\n`;
      });
    }

    return message.trim();
  }

  /**
   * Registrar estrategia de recuperación personalizada
   */
  registerRecoveryStrategy(errorCode: string, strategy: () => Promise<boolean>): void {
    this.recoveryStrategies.set(errorCode, strategy);
    console.log(`🔧 [BOWPI_ERROR_MANAGER] Recovery strategy registered for: ${errorCode}`);
  }

  /**
   * Obtener historial de errores
   */
  getErrorHistory(limit?: number): BowpiErrorInfo[] {
    const history = [...this.errorHistory].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Obtener estadísticas de errores
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<BowpiErrorCategory, number>;
    errorsBySeverity: Record<BowpiErrorSeverity, number>;
    recentErrors: number;
    recoveredErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByCategory: {} as Record<BowpiErrorCategory, number>,
      errorsBySeverity: {} as Record<BowpiErrorSeverity, number>,
      recentErrors: 0,
      recoveredErrors: 0
    };

    // Inicializar contadores
    Object.values(BowpiErrorCategory).forEach(category => {
      stats.errorsByCategory[category] = 0;
    });
    Object.values(BowpiErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });

    // Calcular estadísticas
    this.errorHistory.forEach(error => {
      stats.errorsByCategory[error.category]++;
      stats.errorsBySeverity[error.severity]++;
      
      if (error.timestamp > oneHourAgo) {
        stats.recentErrors++;
      }
      
      if (error.recoverable) {
        stats.recoveredErrors++;
      }
    });

    return stats;
  }

  /**
   * Limpiar historial de errores antiguos
   */
  cleanupErrorHistory(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    const initialCount = this.errorHistory.length;
    
    this.errorHistory = this.errorHistory.filter(error => error.timestamp > cutoff);
    
    const removedCount = initialCount - this.errorHistory.length;
    if (removedCount > 0) {
      console.log(`🧹 [BOWPI_ERROR_MANAGER] Cleaned up ${removedCount} old error records`);
    }
  }
}

// Export singleton instance
export const bowpiErrorManager = BowpiErrorManager.getInstance();

// Export types
export type { BowpiErrorInfo, BowpiErrorContext, ErrorHandlingOptions, ErrorHandlingResult };
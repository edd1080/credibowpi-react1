// Authentication Error Handling Service - Comprehensive error management for auth operations
import { Alert } from 'react-native';
import { BowpiAuthError, BowpiAuthErrorType } from '../types/bowpi';
import NetworkAwareService from './NetworkAwareService';

/**
 * Categorías de errores de autenticación
 */
export enum AuthErrorCategory {
  NETWORK = 'network',
  CREDENTIALS = 'credentials',
  SERVER = 'server',
  SECURITY = 'security',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

/**
 * Severidad del error
 */
export enum AuthErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Información detallada del error
 */
export interface AuthErrorInfo {
  category: AuthErrorCategory;
  severity: AuthErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
  canRetry: boolean;
  retryDelay?: number;
  requiresUserAction: boolean;
  logLevel: 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Opciones de recuperación de errores
 */
export interface ErrorRecoveryOptions {
  showAlert: boolean;
  allowRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  fallbackAction?: () => Promise<void>;
  customMessage?: string;
}

/**
 * Servicio para manejo avanzado de errores de autenticación
 */
export class AuthErrorHandlingService {
  private static errorCounts = new Map<string, number>();
  private static lastErrorTime = new Map<string, number>();

  /**
   * Analizar y categorizar un error de autenticación
   */
  static analyzeError(error: any): AuthErrorInfo {
    console.log('🔍 [AUTH_ERROR_HANDLER] Analyzing error:', error);

    // Si es un BowpiAuthError, usar su información
    if (error instanceof BowpiAuthError) {
      return this.analyzeBowpiError(error);
    }

    // Si es un Error estándar, analizar el mensaje
    if (error instanceof Error) {
      return this.analyzeStandardError(error);
    }

    // Error desconocido
    return this.createUnknownErrorInfo(error);
  }

  /**
   * Analizar errores específicos de Bowpi
   */
  private static analyzeBowpiError(error: BowpiAuthError): AuthErrorInfo {
    switch (error.type) {
      case BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT:
        return {
          category: AuthErrorCategory.NETWORK,
          severity: AuthErrorSeverity.MEDIUM,
          userMessage: 'Se requiere conexión a internet para iniciar sesión',
          technicalMessage: `Offline login attempt: ${error.message}`,
          suggestedActions: [
            'Verifica tu conexión a internet',
            'Intenta conectarte a una red WiFi',
            'Verifica que los datos móviles estén habilitados'
          ],
          canRetry: true,
          retryDelay: 2000,
          requiresUserAction: true,
          logLevel: 'warn'
        };

      case BowpiAuthErrorType.INVALID_CREDENTIALS:
        return {
          category: AuthErrorCategory.CREDENTIALS,
          severity: AuthErrorSeverity.MEDIUM,
          userMessage: 'Credenciales incorrectas',
          technicalMessage: `Invalid credentials: ${error.message}`,
          suggestedActions: [
            'Verifica tu email y contraseña',
            'Asegúrate de que no tengas Caps Lock activado',
            'Contacta a tu supervisor si olvidaste tu contraseña'
          ],
          canRetry: true,
          retryDelay: 1000,
          requiresUserAction: true,
          logLevel: 'info'
        };

      case BowpiAuthErrorType.NETWORK_ERROR:
        return {
          category: AuthErrorCategory.NETWORK,
          severity: AuthErrorSeverity.HIGH,
          userMessage: 'Error de conexión al servidor',
          technicalMessage: `Network error: ${error.message}`,
          suggestedActions: [
            'Verifica tu conexión a internet',
            'Intenta nuevamente en unos momentos',
            'Contacta al administrador si el problema persiste'
          ],
          canRetry: true,
          retryDelay: 5000,
          requiresUserAction: false,
          logLevel: 'error'
        };

      case BowpiAuthErrorType.SERVER_ERROR:
        return {
          category: AuthErrorCategory.SERVER,
          severity: AuthErrorSeverity.HIGH,
          userMessage: 'Error del servidor de autenticación',
          technicalMessage: `Server error: ${error.message}`,
          suggestedActions: [
            'Intenta nuevamente en unos momentos',
            'El problema puede ser temporal',
            'Contacta al administrador si persiste'
          ],
          canRetry: true,
          retryDelay: 10000,
          requiresUserAction: false,
          logLevel: 'error'
        };

      case BowpiAuthErrorType.DECRYPTION_ERROR:
        return {
          category: AuthErrorCategory.SECURITY,
          severity: AuthErrorSeverity.CRITICAL,
          userMessage: 'Error de seguridad en la autenticación',
          technicalMessage: `Decryption error: ${error.message}`,
          suggestedActions: [
            'Intenta cerrar y abrir la aplicación',
            'Contacta al administrador inmediatamente',
            'No compartas esta información'
          ],
          canRetry: false,
          requiresUserAction: true,
          logLevel: 'critical'
        };

      case BowpiAuthErrorType.DOMAIN_NOT_ALLOWED:
        return {
          category: AuthErrorCategory.CONFIGURATION,
          severity: AuthErrorSeverity.CRITICAL,
          userMessage: 'Error de configuración del servidor',
          technicalMessage: `Domain not allowed: ${error.message}`,
          suggestedActions: [
            'Contacta al administrador del sistema',
            'Verifica la configuración de la aplicación',
            'Este error requiere atención técnica'
          ],
          canRetry: false,
          requiresUserAction: true,
          logLevel: 'critical'
        };

      case BowpiAuthErrorType.HTTPS_REQUIRED:
        return {
          category: AuthErrorCategory.SECURITY,
          severity: AuthErrorSeverity.CRITICAL,
          userMessage: 'Conexión segura requerida',
          technicalMessage: `HTTPS required: ${error.message}`,
          suggestedActions: [
            'Contacta al administrador del sistema',
            'La aplicación requiere conexión segura',
            'No uses redes públicas no seguras'
          ],
          canRetry: false,
          requiresUserAction: true,
          logLevel: 'critical'
        };

      default:
        return this.createUnknownErrorInfo(error);
    }
  }

  /**
   * Analizar errores estándar de JavaScript
   */
  private static analyzeStandardError(error: Error): AuthErrorInfo {
    const message = error.message.toLowerCase();

    // Errores de red
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        category: AuthErrorCategory.NETWORK,
        severity: AuthErrorSeverity.MEDIUM,
        userMessage: 'Error de conexión',
        technicalMessage: error.message,
        suggestedActions: [
          'Verifica tu conexión a internet',
          'Intenta nuevamente en unos momentos'
        ],
        canRetry: true,
        retryDelay: 3000,
        requiresUserAction: false,
        logLevel: 'warn'
      };
    }

    // Errores de autenticación
    if (message.includes('401') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        category: AuthErrorCategory.CREDENTIALS,
        severity: AuthErrorSeverity.MEDIUM,
        userMessage: 'Credenciales inválidas',
        technicalMessage: error.message,
        suggestedActions: [
          'Verifica tu email y contraseña',
          'Contacta a tu supervisor si es necesario'
        ],
        canRetry: true,
        retryDelay: 1000,
        requiresUserAction: true,
        logLevel: 'info'
      };
    }

    // Errores del servidor
    if (message.includes('500') || message.includes('server') || message.includes('internal')) {
      return {
        category: AuthErrorCategory.SERVER,
        severity: AuthErrorSeverity.HIGH,
        userMessage: 'Error del servidor',
        technicalMessage: error.message,
        suggestedActions: [
          'Intenta nuevamente en unos momentos',
          'Contacta al administrador si persiste'
        ],
        canRetry: true,
        retryDelay: 5000,
        requiresUserAction: false,
        logLevel: 'error'
      };
    }

    return this.createUnknownErrorInfo(error);
  }

  /**
   * Crear información para errores desconocidos
   */
  private static createUnknownErrorInfo(error: any): AuthErrorInfo {
    return {
      category: AuthErrorCategory.UNKNOWN,
      severity: AuthErrorSeverity.MEDIUM,
      userMessage: 'Error inesperado durante la autenticación',
      technicalMessage: error?.message || String(error),
      suggestedActions: [
        'Intenta nuevamente',
        'Reinicia la aplicación si persiste',
        'Contacta al soporte técnico'
      ],
      canRetry: true,
      retryDelay: 2000,
      requiresUserAction: false,
      logLevel: 'error'
    };
  }

  /**
   * Manejar error con opciones de recuperación
   */
  static async handleError(
    error: any,
    options: Partial<ErrorRecoveryOptions> = {}
  ): Promise<'retry' | 'cancel' | 'fallback'> {
    const errorInfo = this.analyzeError(error);
    const defaultOptions: ErrorRecoveryOptions = {
      showAlert: true,
      allowRetry: errorInfo.canRetry,
      maxRetries: 3,
      retryDelay: errorInfo.retryDelay || 2000,
      ...options
    };

    // Registrar el error
    this.logError(errorInfo);

    // Verificar si hemos excedido el límite de reintentos
    const errorKey = this.getErrorKey(errorInfo);
    const errorCount = this.errorCounts.get(errorKey) || 0;
    
    if (errorCount >= defaultOptions.maxRetries) {
      console.log('🔍 [AUTH_ERROR_HANDLER] Max retries exceeded for error:', errorKey);
      
      if (defaultOptions.fallbackAction) {
        await defaultOptions.fallbackAction();
        return 'fallback';
      }
      
      if (defaultOptions.showAlert) {
        await this.showMaxRetriesAlert(errorInfo);
      }
      
      return 'cancel';
    }

    // Incrementar contador de errores
    this.errorCounts.set(errorKey, errorCount + 1);
    this.lastErrorTime.set(errorKey, Date.now());

    // Mostrar alerta si es necesario
    if (defaultOptions.showAlert) {
      const userChoice = await this.showErrorAlert(errorInfo, defaultOptions);
      return userChoice;
    }

    // Si no se muestra alerta y se puede reintentar, hacerlo automáticamente
    if (defaultOptions.allowRetry && errorInfo.canRetry) {
      return 'retry';
    }

    return 'cancel';
  }

  /**
   * Mostrar alerta de error al usuario
   */
  private static showErrorAlert(
    errorInfo: AuthErrorInfo,
    options: ErrorRecoveryOptions
  ): Promise<'retry' | 'cancel' | 'fallback'> {
    return new Promise((resolve) => {
      const buttons: any[] = [];

      // Botón de cancelar
      buttons.push({
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => {
          console.log('🔍 [AUTH_ERROR_HANDLER] User cancelled error recovery');
          resolve('cancel');
        }
      });

      // Botón de reintentar si es posible
      if (options.allowRetry && errorInfo.canRetry) {
        buttons.push({
          text: 'Reintentar',
          onPress: () => {
            console.log('🔍 [AUTH_ERROR_HANDLER] User chose to retry');
            resolve('retry');
          }
        });
      }

      // Botón de acción alternativa si existe
      if (options.fallbackAction) {
        buttons.push({
          text: 'Acción Alternativa',
          onPress: () => {
            console.log('🔍 [AUTH_ERROR_HANDLER] User chose fallback action');
            resolve('fallback');
          }
        });
      }

      const title = this.getAlertTitle(errorInfo.category, errorInfo.severity);
      const message = options.customMessage || this.buildErrorMessage(errorInfo);

      Alert.alert(title, message, buttons, { cancelable: false });
    });
  }

  /**
   * Mostrar alerta cuando se exceden los reintentos máximos
   */
  private static showMaxRetriesAlert(errorInfo: AuthErrorInfo): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Límite de Reintentos Excedido',
        `Se han agotado los intentos para resolver este error.\n\n${errorInfo.userMessage}\n\nPor favor contacta al soporte técnico.`,
        [
          {
            text: 'Entendido',
            onPress: () => {
              console.log('🔍 [AUTH_ERROR_HANDLER] User acknowledged max retries');
              resolve();
            }
          }
        ]
      );
    });
  }

  /**
   * Construir mensaje de error para el usuario
   */
  private static buildErrorMessage(errorInfo: AuthErrorInfo): string {
    let message = errorInfo.userMessage;

    if (errorInfo.suggestedActions.length > 0) {
      message += '\n\nAcciones sugeridas:\n';
      errorInfo.suggestedActions.forEach((action, index) => {
        message += `${index + 1}. ${action}\n`;
      });
    }

    return message.trim();
  }

  /**
   * Obtener título de alerta según categoría y severidad
   */
  private static getAlertTitle(category: AuthErrorCategory, severity: AuthErrorSeverity): string {
    if (severity === AuthErrorSeverity.CRITICAL) {
      return 'Error Crítico';
    }

    switch (category) {
      case AuthErrorCategory.NETWORK:
        return 'Error de Conexión';
      case AuthErrorCategory.CREDENTIALS:
        return 'Error de Credenciales';
      case AuthErrorCategory.SERVER:
        return 'Error del Servidor';
      case AuthErrorCategory.SECURITY:
        return 'Error de Seguridad';
      case AuthErrorCategory.CONFIGURATION:
        return 'Error de Configuración';
      default:
        return 'Error de Autenticación';
    }
  }

  /**
   * Generar clave única para el error
   */
  private static getErrorKey(errorInfo: AuthErrorInfo): string {
    return `${errorInfo.category}_${errorInfo.technicalMessage.substring(0, 50)}`;
  }

  /**
   * Registrar error para debugging y monitoreo
   */
  private static logError(errorInfo: AuthErrorInfo): void {
    const logMessage = `[${errorInfo.category.toUpperCase()}] ${errorInfo.technicalMessage}`;
    
    switch (errorInfo.logLevel) {
      case 'critical':
        console.error('🚨 [AUTH_ERROR_HANDLER] CRITICAL:', logMessage);
        break;
      case 'error':
        console.error('❌ [AUTH_ERROR_HANDLER] ERROR:', logMessage);
        break;
      case 'warn':
        console.warn('⚠️ [AUTH_ERROR_HANDLER] WARNING:', logMessage);
        break;
      case 'info':
        console.log('ℹ️ [AUTH_ERROR_HANDLER] INFO:', logMessage);
        break;
    }

    // En producción, aquí se enviarían los logs a un servicio de monitoreo
    if (!__DEV__ && errorInfo.severity === AuthErrorSeverity.CRITICAL) {
      // TODO: Enviar a servicio de monitoreo (Crashlytics, Sentry, etc.)
      console.log('📊 [AUTH_ERROR_HANDLER] Would send to monitoring service:', errorInfo);
    }
  }

  /**
   * Limpiar contadores de errores antiguos
   */
  static cleanupErrorCounts(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos

    for (const [key, timestamp] of this.lastErrorTime.entries()) {
      if (now - timestamp > maxAge) {
        this.errorCounts.delete(key);
        this.lastErrorTime.delete(key);
      }
    }

    console.log('🔍 [AUTH_ERROR_HANDLER] Cleaned up old error counts');
  }

  /**
   * Obtener estadísticas de errores
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    recentErrors: Array<{ key: string; count: number; lastSeen: number }>;
  } {
    const errorsByCategory: Record<string, number> = {};
    const recentErrors: Array<{ key: string; count: number; lastSeen: number }> = [];

    for (const [key, count] of this.errorCounts.entries()) {
      const category = key.split('_')[0];
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      
      recentErrors.push({
        key,
        count,
        lastSeen: this.lastErrorTime.get(key) || 0
      });
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCategory,
      recentErrors: recentErrors.sort((a, b) => b.lastSeen - a.lastSeen)
    };
  }

  /**
   * Verificar si el error requiere acción inmediata del usuario
   */
  static requiresImmediateAction(error: any): boolean {
    const errorInfo = this.analyzeError(error);
    return errorInfo.severity === AuthErrorSeverity.CRITICAL || 
           errorInfo.requiresUserAction;
  }

  /**
   * Obtener recomendaciones de recuperación para un error
   */
  static getRecoveryRecommendations(error: any): {
    canAutoRetry: boolean;
    recommendedDelay: number;
    userActionRequired: boolean;
    suggestions: string[];
  } {
    const errorInfo = this.analyzeError(error);
    
    return {
      canAutoRetry: errorInfo.canRetry && !errorInfo.requiresUserAction,
      recommendedDelay: errorInfo.retryDelay || 2000,
      userActionRequired: errorInfo.requiresUserAction,
      suggestions: errorInfo.suggestedActions
    };
  }
}

export default AuthErrorHandlingService;
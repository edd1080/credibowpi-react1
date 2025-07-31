import { useState, useCallback, useEffect } from 'react';
import { bowpiErrorManager, BowpiErrorInfo, ErrorHandlingOptions } from '../services/BowpiErrorManager';
import { errorRecoveryService } from '../services/ErrorRecoveryService';

/**
 * Estado del manejo de errores
 */
interface ErrorHandlingState {
  currentError: BowpiErrorInfo | null;
  isHandling: boolean;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number | null;
}

/**
 * Opciones del hook
 */
interface UseErrorHandlingOptions {
  autoRecover?: boolean;
  showUserAlerts?: boolean;
  logErrors?: boolean;
  maxRecoveryAttempts?: number;
  onError?: (error: BowpiErrorInfo) => void;
  onRecovery?: (success: boolean) => void;
}

/**
 * Hook personalizado para manejo comprehensivo de errores
 */
export const useErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  const {
    autoRecover = true,
    showUserAlerts = true,
    logErrors = true,
    maxRecoveryAttempts = 3,
    onError,
    onRecovery
  } = options;

  const [state, setState] = useState<ErrorHandlingState>({
    currentError: null,
    isHandling: false,
    isRecovering: false,
    recoveryAttempts: 0,
    lastRecoveryTime: null
  });

  /**
   * Manejar error
   */
  const handleError = useCallback(async (
    error: any,
    context: Record<string, any> = {},
    customOptions: Partial<ErrorHandlingOptions> = {}
  ) => {
    console.log('🔍 [useErrorHandling] Handling error:', error);

    setState(prev => ({ ...prev, isHandling: true }));

    try {
      const result = await bowpiErrorManager.handleError(error, context, {
        showUserAlert: showUserAlerts,
        logError: logErrors,
        attemptRecovery: autoRecover,
        ...customOptions
      });

      // Obtener información detallada del error
      const errorHistory = bowpiErrorManager.getErrorHistory(1);
      const currentError = errorHistory[0] || null;

      setState(prev => ({
        ...prev,
        currentError,
        isHandling: false
      }));

      // Callback de error
      if (onError && currentError) {
        onError(currentError);
      }

      // Si no se recuperó automáticamente y está habilitada la recuperación automática
      if (!result.recovered && autoRecover && state.recoveryAttempts < maxRecoveryAttempts) {
        await attemptRecovery();
      }

      return result;

    } catch (handlingError) {
      console.error('❌ [useErrorHandling] Error handling failed:', handlingError);
      
      setState(prev => ({
        ...prev,
        isHandling: false,
        currentError: null
      }));

      throw handlingError;
    }
  }, [showUserAlerts, logErrors, autoRecover, maxRecoveryAttempts, onError, state.recoveryAttempts]);

  /**
   * Intentar recuperación automática
   */
  const attemptRecovery = useCallback(async () => {
    if (state.isRecovering || state.recoveryAttempts >= maxRecoveryAttempts) {
      return false;
    }

    console.log('🔄 [useErrorHandling] Attempting automatic recovery...');

    setState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      const recoveryResults = await errorRecoveryService.attemptRecovery();
      const success = recoveryResults.some(result => result.success);

      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryTime: Date.now(),
        currentError: success ? null : prev.currentError
      }));

      // Callback de recuperación
      if (onRecovery) {
        onRecovery(success);
      }

      console.log(`🔄 [useErrorHandling] Recovery ${success ? 'successful' : 'failed'}`);
      return success;

    } catch (recoveryError) {
      console.error('❌ [useErrorHandling] Recovery attempt failed:', recoveryError);
      
      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryTime: Date.now()
      }));

      if (onRecovery) {
        onRecovery(false);
      }

      return false;
    }
  }, [state.isRecovering, state.recoveryAttempts, maxRecoveryAttempts, onRecovery]);

  /**
   * Limpiar error actual
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentError: null,
      recoveryAttempts: 0
    }));
  }, []);

  /**
   * Reintentar operación
   */
  const retry = useCallback(async (operation: () => Promise<any>) => {
    console.log('🔄 [useErrorHandling] Retrying operation...');
    
    setState(prev => ({ ...prev, currentError: null }));

    try {
      const result = await operation();
      console.log('✅ [useErrorHandling] Retry successful');
      return result;
    } catch (error) {
      console.log('❌ [useErrorHandling] Retry failed, handling error...');
      await handleError(error);
      throw error;
    }
  }, [handleError]);

  /**
   * Obtener estadísticas de errores
   */
  const getErrorStats = useCallback(() => {
    return bowpiErrorManager.getErrorStats();
  }, []);

  /**
   * Obtener historial de errores
   */
  const getErrorHistory = useCallback((limit?: number) => {
    return bowpiErrorManager.getErrorHistory(limit);
  }, []);

  /**
   * Obtener estadísticas de recuperación
   */
  const getRecoveryStats = useCallback(() => {
    return errorRecoveryService.getRecoveryStats();
  }, []);

  /**
   * Verificar si hay errores críticos recientes
   */
  const hasCriticalErrors = useCallback(() => {
    const recentErrors = bowpiErrorManager.getErrorHistory(5);
    return recentErrors.some(error => 
      error.severity === 'critical' && 
      Date.now() - error.timestamp < 300000 // 5 minutos
    );
  }, []);

  /**
   * Obtener recomendaciones basadas en errores recientes
   */
  const getRecommendations = useCallback(() => {
    const recentErrors = bowpiErrorManager.getErrorHistory(10);
    const recommendations: string[] = [];

    // Analizar patrones de errores
    const errorCounts = recentErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generar recomendaciones
    if (errorCounts.network > 2) {
      recommendations.push('Verifica tu conexión a internet');
    }
    
    if (errorCounts.storage > 1) {
      recommendations.push('Considera liberar espacio en tu dispositivo');
    }
    
    if (errorCounts.authentication > 2) {
      recommendations.push('Verifica tus credenciales de acceso');
    }
    
    if (errorCounts.security > 0) {
      recommendations.push('Contacta al administrador del sistema');
    }

    return recommendations;
  }, []);

  // Limpiar errores antiguos periódicamente
  useEffect(() => {
    const cleanup = setInterval(() => {
      bowpiErrorManager.cleanupErrorHistory();
    }, 60000); // Cada minuto

    return () => clearInterval(cleanup);
  }, []);

  // Reset recovery attempts después de un tiempo
  useEffect(() => {
    if (state.recoveryAttempts > 0 && state.lastRecoveryTime) {
      const resetTimer = setTimeout(() => {
        setState(prev => ({ ...prev, recoveryAttempts: 0 }));
      }, 300000); // 5 minutos

      return () => clearTimeout(resetTimer);
    }
  }, [state.recoveryAttempts, state.lastRecoveryTime]);

  return {
    // Estado
    currentError: state.currentError,
    isHandling: state.isHandling,
    isRecovering: state.isRecovering,
    recoveryAttempts: state.recoveryAttempts,
    
    // Acciones
    handleError,
    attemptRecovery,
    clearError,
    retry,
    
    // Información
    getErrorStats,
    getErrorHistory,
    getRecoveryStats,
    hasCriticalErrors,
    getRecommendations,
    
    // Estado computado
    hasError: !!state.currentError,
    canRetry: state.currentError?.retryable || false,
    canRecover: state.currentError?.recoverable || false,
    isOperational: !state.isHandling && !state.isRecovering && !state.currentError
  };
};

export default useErrorHandling;
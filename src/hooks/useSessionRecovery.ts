import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { sessionRecoveryService } from '../services/SessionRecoveryService';
import type { SessionRecoveryResult, SessionInfo } from '../services/SessionRecoveryService';
import { useAuthStore } from '../stores/authStore';

/**
 * Estado del hook de recuperación de sesión
 */
interface SessionRecoveryState {
  isRecovering: boolean;
  lastRecoveryResult: SessionRecoveryResult | null;
  sessionInfo: SessionInfo | null;
  recoveryAttempts: number;
  lastValidationTime: number;
}

/**
 * Opciones del hook
 */
interface UseSessionRecoveryOptions {
  autoRecover?: boolean;
  validateOnForeground?: boolean;
  onRecoverySuccess?: (result: SessionRecoveryResult) => void;
  onRecoveryFailure?: (result: SessionRecoveryResult) => void;
  onSessionLost?: () => void;
}

/**
 * Hook personalizado para manejo de recuperación de sesión
 */
export const useSessionRecovery = (options: UseSessionRecoveryOptions = {}) => {
  const {
    autoRecover = true,
    validateOnForeground = true,
    onRecoverySuccess,
    onRecoveryFailure,
    onSessionLost
  } = options;

  const [state, setState] = useState<SessionRecoveryState>({
    isRecovering: false,
    lastRecoveryResult: null,
    sessionInfo: null,
    recoveryAttempts: 0,
    lastValidationTime: 0
  });

  const { isAuthenticated } = useAuthStore();

  /**
   * Validar y recuperar sesión
   */
  const validateAndRecover = useCallback(async (force: boolean = false) => {
    console.log('🔄 [useSessionRecovery] Starting session validation and recovery...');

    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      // Obtener información actual de la sesión
      const sessionInfo = await sessionRecoveryService.getSessionInfo();
      
      setState(prev => ({ 
        ...prev, 
        sessionInfo,
        lastValidationTime: Date.now()
      }));

      // Si la sesión es válida, no necesitamos recuperación
      if (sessionInfo.isValid) {
        console.log('✅ [useSessionRecovery] Session is valid, no recovery needed');
        setState(prev => ({ ...prev, isRecovering: false }));
        return { success: true, sessionInfo };
      }

      // Intentar recuperación si está habilitada
      if (autoRecover) {
        const recoveryResult = await sessionRecoveryService.validateAndRecoverSession(force);
        
        if (recoveryResult) {
          setState(prev => ({
            ...prev,
            lastRecoveryResult: recoveryResult,
            recoveryAttempts: prev.recoveryAttempts + 1,
            isRecovering: false
          }));

          // Callbacks
          if (recoveryResult.success && onRecoverySuccess) {
            onRecoverySuccess(recoveryResult);
          } else if (!recoveryResult.success && onRecoveryFailure) {
            onRecoveryFailure(recoveryResult);
          }

          // Si la recuperación falló completamente, notificar pérdida de sesión
          if (!recoveryResult.success && onSessionLost) {
            onSessionLost();
          }

          return { success: recoveryResult.success, recoveryResult };
        }
      }

      // Si no se pudo recuperar y hay callback de sesión perdida
      if (onSessionLost) {
        onSessionLost();
      }

      setState(prev => ({ ...prev, isRecovering: false }));
      return { success: false, sessionInfo };

    } catch (error) {
      console.error('❌ [useSessionRecovery] Session validation and recovery failed:', error);
      
      setState(prev => ({ ...prev, isRecovering: false }));
      
      if (onSessionLost) {
        onSessionLost();
      }

      return { success: false, error };
    }
  }, [autoRecover, onRecoverySuccess, onRecoveryFailure, onSessionLost]);

  /**
   * Forzar validación de sesión
   */
  const forceValidation = useCallback(async () => {
    return await validateAndRecover(true);
  }, [validateAndRecover]);

  /**
   * Obtener estadísticas de recuperación
   */
  const getRecoveryStats = useCallback(() => {
    return sessionRecoveryService.getRecoveryStats();
  }, []);

  /**
   * Obtener historial de recuperación
   */
  const getRecoveryHistory = useCallback((limit?: number) => {
    return sessionRecoveryService.getRecoveryHistory(limit);
  }, []);

  /**
   * Verificar si la sesión necesita atención
   */
  const needsAttention = useCallback(() => {
    if (!state.sessionInfo) return false;
    
    return !state.sessionInfo.isValid || 
           state.sessionInfo.state === 'corrupted' ||
           state.sessionInfo.state === 'expired';
  }, [state.sessionInfo]);

  /**
   * Obtener mensaje de estado de la sesión
   */
  const getStatusMessage = useCallback(() => {
    if (state.isRecovering) {
      return 'Recuperando sesión...';
    }

    if (!state.sessionInfo) {
      return 'Validando sesión...';
    }

    switch (state.sessionInfo.state) {
      case 'valid':
        return 'Sesión válida';
      case 'expired':
        return 'Sesión expirada';
      case 'corrupted':
        return 'Datos de sesión corruptos';
      case 'missing':
        return 'Sesión no encontrada';
      case 'network_error':
        return 'Error de red';
      default:
        return 'Estado de sesión desconocido';
    }
  }, [state.isRecovering, state.sessionInfo]);

  /**
   * Manejar cambios de estado de la app
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && validateOnForeground) {
      console.log('🔄 [useSessionRecovery] App became active, validating session...');
      validateAndRecover();
    }
  }, [validateOnForeground, validateAndRecover]);

  // Configurar listeners de estado de la app
  useEffect(() => {
    if (validateOnForeground) {
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [validateOnForeground, handleAppStateChange]);

  // Validación inicial
  useEffect(() => {
    validateAndRecover();
  }, []);

  // Monitorear cambios en el estado de autenticación
  useEffect(() => {
    if (!isAuthenticated && state.sessionInfo?.isValid) {
      console.log('🔄 [useSessionRecovery] Auth state changed, revalidating session...');
      validateAndRecover();
    }
  }, [isAuthenticated, state.sessionInfo?.isValid, validateAndRecover]);

  return {
    // Estado
    isRecovering: state.isRecovering,
    sessionInfo: state.sessionInfo,
    lastRecoveryResult: state.lastRecoveryResult,
    recoveryAttempts: state.recoveryAttempts,
    lastValidationTime: state.lastValidationTime,
    
    // Acciones
    validateAndRecover,
    forceValidation,
    
    // Información
    getRecoveryStats,
    getRecoveryHistory,
    getStatusMessage,
    
    // Estado computado
    isSessionValid: state.sessionInfo?.isValid || false,
    needsAttention: needsAttention(),
    canRecover: state.sessionInfo?.state !== 'missing' && state.sessionInfo?.state !== 'unknown',
    statusMessage: getStatusMessage()
  };
};

export default useSessionRecovery;
// Suspicious Activity Monitor - Detects and reports suspicious authentication activities
import { securityLogger, SecurityEventType, SecurityEventSeverity } from './SecurityLoggingService';
import NetworkAwareService from './NetworkAwareService';

/**
 * Tipos de actividad sospechosa
 */
export enum SuspiciousActivityType {
  RAPID_LOGIN_ATTEMPTS = 'rapid_login_attempts',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  UNUSUAL_NETWORK_PATTERN = 'unusual_network_pattern',
  TOKEN_MANIPULATION = 'token_manipulation',
  SESSION_HIJACKING = 'session_hijacking',
  OFFLINE_ABUSE = 'offline_abuse',
  DATA_CORRUPTION_PATTERN = 'data_corruption_pattern',
  UNUSUAL_DEVICE_BEHAVIOR = 'unusual_device_behavior'
}

/**
 * Configuración del monitor
 */
interface MonitorConfig {
  enabled: boolean;
  maxLoginAttempts: number;
  loginAttemptWindow: number; // milliseconds
  maxFailedLogins: number;
  failedLoginWindow: number; // milliseconds
  tokenValidationThreshold: number;
  sessionTimeoutThreshold: number;
  dataCorruptionThreshold: number;
  networkPatternThreshold: number;
}

/**
 * Evento de actividad sospechosa
 */
interface SuspiciousActivityEvent {
  type: SuspiciousActivityType;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  riskScore: number; // 0-100
}

/**
 * Estadísticas de actividad
 */
interface ActivityStats {
  loginAttempts: Array<{ timestamp: number; success: boolean; userId?: string }>;
  failedLogins: Array<{ timestamp: number; userId?: string; reason: string }>;
  tokenValidations: Array<{ timestamp: number; success: boolean; reason?: string }>;
  networkEvents: Array<{ timestamp: number; type: string; quality: string }>;
  dataCorruptions: Array<{ timestamp: number; type: string; recovered: boolean }>;
}

/**
 * Monitor de actividad sospechosa
 */
export class SuspiciousActivityMonitor {
  private static instance: SuspiciousActivityMonitor;
  private config: MonitorConfig;
  private activityStats: ActivityStats;
  private alertCallbacks: Array<(event: SuspiciousActivityEvent) => void> = [];

  private constructor() {
    this.config = {
      enabled: true,
      maxLoginAttempts: 5,
      loginAttemptWindow: 60000, // 1 minute
      maxFailedLogins: 3,
      failedLoginWindow: 300000, // 5 minutes
      tokenValidationThreshold: 10,
      sessionTimeoutThreshold: 3,
      dataCorruptionThreshold: 5,
      networkPatternThreshold: 10
    };

    this.activityStats = {
      loginAttempts: [],
      failedLogins: [],
      tokenValidations: [],
      networkEvents: [],
      dataCorruptions: []
    };

    this.initializeMonitor();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): SuspiciousActivityMonitor {
    if (!SuspiciousActivityMonitor.instance) {
      SuspiciousActivityMonitor.instance = new SuspiciousActivityMonitor();
    }
    return SuspiciousActivityMonitor.instance;
  }

  /**
   * Inicializar el monitor
   */
  private async initializeMonitor(): Promise<void> {
    try {
      // Limpiar estadísticas antiguas al inicializar
      await this.cleanupOldStats();
      
      console.log('✅ [SUSPICIOUS_ACTIVITY_MONITOR] Monitor initialized successfully');
    } catch (error) {
      console.error('❌ [SUSPICIOUS_ACTIVITY_MONITOR] Failed to initialize monitor:', error);
    }
  }

  /**
   * Registrar intento de login
   */
  async recordLoginAttempt(success: boolean, userId?: string, details: Record<string, any> = {}): Promise<void> {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    
    this.activityStats.loginAttempts.push({
      timestamp,
      success,
      userId
    });

    if (!success) {
      this.activityStats.failedLogins.push({
        timestamp,
        userId,
        reason: details.reason || 'unknown'
      });
    }

    // Verificar patrones sospechosos
    await this.checkRapidLoginAttempts(userId);
    await this.checkMultipleFailedLogins(userId);

    // Log del evento
    await securityLogger.logSecurityEvent(
      success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
      `Login attempt ${success ? 'succeeded' : 'failed'}`,
      details,
      userId
    );
  }

  /**
   * Registrar validación de token
   */
  async recordTokenValidation(success: boolean, reason?: string, userId?: string, sessionId?: string): Promise<void> {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    
    this.activityStats.tokenValidations.push({
      timestamp,
      success,
      reason
    });

    // Verificar patrones de manipulación de tokens
    if (!success) {
      await this.checkTokenManipulation(userId, sessionId, reason);
    }

    // Log del evento
    await securityLogger.logSecurityEvent(
      SecurityEventType.TOKEN_VALIDATION,
      success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
      `Token validation ${success ? 'succeeded' : 'failed'}`,
      { reason },
      userId,
      sessionId
    );
  }

  /**
   * Registrar evento de red
   */
  async recordNetworkEvent(type: string, quality: string, details: Record<string, any> = {}): Promise<void> {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    
    this.activityStats.networkEvents.push({
      timestamp,
      type,
      quality
    });

    // Verificar patrones de red inusuales
    await this.checkUnusualNetworkPattern();

    // Log del evento
    await securityLogger.logNetworkEvent(
      type as SecurityEventType,
      `Network event: ${type} (${quality})`,
      { quality, ...details }
    );
  }

  /**
   * Registrar corrupción de datos
   */
  async recordDataCorruption(type: string, recovered: boolean, details: Record<string, any> = {}): Promise<void> {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    
    this.activityStats.dataCorruptions.push({
      timestamp,
      type,
      recovered
    });

    // Verificar patrones de corrupción
    await this.checkDataCorruptionPattern();

    // Log del evento
    await securityLogger.logSecurityEvent(
      SecurityEventType.DATA_CORRUPTION,
      recovered ? SecurityEventSeverity.WARNING : SecurityEventSeverity.ERROR,
      `Data corruption detected: ${type}`,
      { recovered, ...details }
    );
  }

  /**
   * Verificar intentos de login rápidos
   */
  private async checkRapidLoginAttempts(userId?: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.loginAttemptWindow;
    
    const recentAttempts = this.activityStats.loginAttempts.filter(
      attempt => attempt.timestamp > windowStart && 
                 (!userId || attempt.userId === userId)
    );

    if (recentAttempts.length > this.config.maxLoginAttempts) {
      const event: SuspiciousActivityEvent = {
        type: SuspiciousActivityType.RAPID_LOGIN_ATTEMPTS,
        timestamp: now,
        severity: 'high',
        description: `${recentAttempts.length} login attempts in ${this.config.loginAttemptWindow / 1000} seconds`,
        evidence: {
          attempts: recentAttempts.length,
          window: this.config.loginAttemptWindow,
          userId
        },
        userId,
        riskScore: Math.min(100, (recentAttempts.length / this.config.maxLoginAttempts) * 50)
      };

      await this.reportSuspiciousActivity(event);
    }
  }

  /**
   * Verificar múltiples logins fallidos
   */
  private async checkMultipleFailedLogins(userId?: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.failedLoginWindow;
    
    const recentFailures = this.activityStats.failedLogins.filter(
      failure => failure.timestamp > windowStart && 
                 (!userId || failure.userId === userId)
    );

    if (recentFailures.length >= this.config.maxFailedLogins) {
      const event: SuspiciousActivityEvent = {
        type: SuspiciousActivityType.MULTIPLE_FAILED_LOGINS,
        timestamp: now,
        severity: 'critical',
        description: `${recentFailures.length} failed login attempts in ${this.config.failedLoginWindow / 1000} seconds`,
        evidence: {
          failures: recentFailures.length,
          window: this.config.failedLoginWindow,
          reasons: recentFailures.map(f => f.reason),
          userId
        },
        userId,
        riskScore: Math.min(100, (recentFailures.length / this.config.maxFailedLogins) * 80)
      };

      await this.reportSuspiciousActivity(event);
    }
  }

  /**
   * Verificar manipulación de tokens
   */
  private async checkTokenManipulation(userId?: string, sessionId?: string, reason?: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - 300000; // 5 minutes
    
    const recentFailures = this.activityStats.tokenValidations.filter(
      validation => !validation.success && validation.timestamp > windowStart
    );

    if (recentFailures.length >= this.config.tokenValidationThreshold) {
      const event: SuspiciousActivityEvent = {
        type: SuspiciousActivityType.TOKEN_MANIPULATION,
        timestamp: now,
        severity: 'critical',
        description: `${recentFailures.length} token validation failures suggest manipulation`,
        evidence: {
          failures: recentFailures.length,
          reasons: recentFailures.map(f => f.reason),
          lastReason: reason
        },
        userId,
        sessionId,
        riskScore: Math.min(100, (recentFailures.length / this.config.tokenValidationThreshold) * 90)
      };

      await this.reportSuspiciousActivity(event);
    }
  }

  /**
   * Verificar patrones de red inusuales
   */
  private async checkUnusualNetworkPattern(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 600000; // 10 minutes
    
    const recentEvents = this.activityStats.networkEvents.filter(
      event => event.timestamp > windowStart
    );

    // Detectar cambios frecuentes de calidad de red
    const qualityChanges = new Set(recentEvents.map(e => e.quality)).size;
    
    if (recentEvents.length > this.config.networkPatternThreshold && qualityChanges > 3) {
      const event: SuspiciousActivityEvent = {
        type: SuspiciousActivityType.UNUSUAL_NETWORK_PATTERN,
        timestamp: now,
        severity: 'medium',
        description: `Unusual network pattern: ${recentEvents.length} events with ${qualityChanges} quality changes`,
        evidence: {
          events: recentEvents.length,
          qualityChanges,
          qualities: Array.from(new Set(recentEvents.map(e => e.quality)))
        },
        riskScore: Math.min(100, (qualityChanges / 3) * 30)
      };

      await this.reportSuspiciousActivity(event);
    }
  }

  /**
   * Verificar patrones de corrupción de datos
   */
  private async checkDataCorruptionPattern(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 3600000; // 1 hour
    
    const recentCorruptions = this.activityStats.dataCorruptions.filter(
      corruption => corruption.timestamp > windowStart
    );

    if (recentCorruptions.length >= this.config.dataCorruptionThreshold) {
      const event: SuspiciousActivityEvent = {
        type: SuspiciousActivityType.DATA_CORRUPTION_PATTERN,
        timestamp: now,
        severity: 'high',
        description: `${recentCorruptions.length} data corruptions in 1 hour suggests systematic issue`,
        evidence: {
          corruptions: recentCorruptions.length,
          types: recentCorruptions.map(c => c.type),
          recovered: recentCorruptions.filter(c => c.recovered).length
        },
        riskScore: Math.min(100, (recentCorruptions.length / this.config.dataCorruptionThreshold) * 70)
      };

      await this.reportSuspiciousActivity(event);
    }
  }

  /**
   * Reportar actividad sospechosa
   */
  private async reportSuspiciousActivity(event: SuspiciousActivityEvent): Promise<void> {
    console.warn('🚨 [SUSPICIOUS_ACTIVITY_MONITOR] Suspicious activity detected:', event);

    // Log del evento de seguridad
    await securityLogger.logSuspiciousActivity(
      event.description,
      {
        type: event.type,
        severity: event.severity,
        riskScore: event.riskScore,
        evidence: event.evidence
      },
      event.userId,
      event.sessionId
    );

    // Notificar a callbacks registrados
    this.alertCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ [SUSPICIOUS_ACTIVITY_MONITOR] Error in alert callback:', error);
      }
    });
  }

  /**
   * Registrar callback de alerta
   */
  onSuspiciousActivity(callback: (event: SuspiciousActivityEvent) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Retornar función para desregistrar
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obtener estadísticas de actividad
   */
  getActivityStats(): ActivityStats {
    return {
      loginAttempts: [...this.activityStats.loginAttempts],
      failedLogins: [...this.activityStats.failedLogins],
      tokenValidations: [...this.activityStats.tokenValidations],
      networkEvents: [...this.activityStats.networkEvents],
      dataCorruptions: [...this.activityStats.dataCorruptions]
    };
  }

  /**
   * Obtener resumen de riesgos
   */
  getRiskSummary(): {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: Array<{ type: string; score: number; description: string }>;
    recommendations: string[];
  } {
    const now = Date.now();
    const riskFactors: Array<{ type: string; score: number; description: string }> = [];
    
    // Evaluar intentos de login recientes
    const recentLoginAttempts = this.activityStats.loginAttempts.filter(
      attempt => attempt.timestamp > now - 300000 // 5 minutes
    );
    
    if (recentLoginAttempts.length > 3) {
      riskFactors.push({
        type: 'login_frequency',
        score: Math.min(100, (recentLoginAttempts.length / 3) * 30),
        description: `${recentLoginAttempts.length} login attempts in last 5 minutes`
      });
    }

    // Evaluar fallos de validación de token
    const recentTokenFailures = this.activityStats.tokenValidations.filter(
      validation => !validation.success && validation.timestamp > now - 600000 // 10 minutes
    );
    
    if (recentTokenFailures.length > 2) {
      riskFactors.push({
        type: 'token_failures',
        score: Math.min(100, (recentTokenFailures.length / 2) * 40),
        description: `${recentTokenFailures.length} token validation failures in last 10 minutes`
      });
    }

    // Evaluar corrupción de datos
    const recentCorruptions = this.activityStats.dataCorruptions.filter(
      corruption => corruption.timestamp > now - 3600000 // 1 hour
    );
    
    if (recentCorruptions.length > 1) {
      riskFactors.push({
        type: 'data_corruption',
        score: Math.min(100, (recentCorruptions.length / 1) * 50),
        description: `${recentCorruptions.length} data corruptions in last hour`
      });
    }

    // Calcular riesgo general
    const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
    const averageScore = riskFactors.length > 0 ? totalScore / riskFactors.length : 0;
    
    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (averageScore < 25) overallRisk = 'low';
    else if (averageScore < 50) overallRisk = 'medium';
    else if (averageScore < 75) overallRisk = 'high';
    else overallRisk = 'critical';

    // Generar recomendaciones
    const recommendations: string[] = [];
    
    if (recentLoginAttempts.length > 5) {
      recommendations.push('Consider implementing rate limiting for login attempts');
    }
    
    if (recentTokenFailures.length > 3) {
      recommendations.push('Review token validation logic and check for manipulation attempts');
    }
    
    if (recentCorruptions.length > 2) {
      recommendations.push('Investigate data storage integrity and consider backup restoration');
    }

    return {
      overallRisk,
      riskFactors,
      recommendations
    };
  }

  /**
   * Limpiar estadísticas antiguas
   */
  private async cleanupOldStats(): Promise<void> {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = now - maxAge;

    this.activityStats.loginAttempts = this.activityStats.loginAttempts.filter(
      attempt => attempt.timestamp > cutoff
    );
    
    this.activityStats.failedLogins = this.activityStats.failedLogins.filter(
      failure => failure.timestamp > cutoff
    );
    
    this.activityStats.tokenValidations = this.activityStats.tokenValidations.filter(
      validation => validation.timestamp > cutoff
    );
    
    this.activityStats.networkEvents = this.activityStats.networkEvents.filter(
      event => event.timestamp > cutoff
    );
    
    this.activityStats.dataCorruptions = this.activityStats.dataCorruptions.filter(
      corruption => corruption.timestamp > cutoff
    );

    console.log('🧹 [SUSPICIOUS_ACTIVITY_MONITOR] Cleaned up old statistics');
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [SUSPICIOUS_ACTIVITY_MONITOR] Configuration updated');
  }

  /**
   * Obtener configuración
   */
  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * Resetear estadísticas
   */
  resetStats(): void {
    this.activityStats = {
      loginAttempts: [],
      failedLogins: [],
      tokenValidations: [],
      networkEvents: [],
      dataCorruptions: []
    };
    console.log('🔄 [SUSPICIOUS_ACTIVITY_MONITOR] Statistics reset');
  }
}

// Export singleton instance
export const suspiciousActivityMonitor = SuspiciousActivityMonitor.getInstance();

// Export types
export type { SuspiciousActivityEvent, ActivityStats, MonitorConfig };
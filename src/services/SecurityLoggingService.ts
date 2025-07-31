// Security Logging Service - Comprehensive security event logging and monitoring
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bowpiSecureStorage } from './BowpiSecureStorageService';

/**
 * Niveles de severidad de eventos de seguridad
 */
export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Tipos de eventos de seguridad
 */
export enum SecurityEventType {
  // Autenticación
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  
  // Tokens
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_VALIDATION = 'token_validation',
  TOKEN_CORRUPTION = 'token_corruption',
  
  // Datos
  DATA_ENCRYPTION = 'data_encryption',
  DATA_DECRYPTION = 'data_decryption',
  DATA_CORRUPTION = 'data_corruption',
  DATA_RECOVERY = 'data_recovery',
  
  // Red
  NETWORK_ERROR = 'network_error',
  OFFLINE_OPERATION = 'offline_operation',
  CONNECTION_RESTORED = 'connection_restored',
  
  // Seguridad
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // Sistema
  SERVICE_INITIALIZATION = 'service_initialization',
  SERVICE_ERROR = 'service_error',
  CONFIGURATION_CHANGE = 'configuration_change'
}

/**
 * Evento de seguridad
 */
export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  message: string;
  details: Record<string, any>;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  stackTrace?: string;
}

/**
 * Configuración de logging
 */
interface SecurityLoggingConfig {
  enabled: boolean;
  maxLogEntries: number;
  retentionDays: number;
  logToConsole: boolean;
  logToStorage: boolean;
  logToRemote: boolean;
  remoteEndpoint?: string;
  sensitiveDataMasking: boolean;
  includeStackTrace: boolean;
  includeLocation: boolean;
  batchSize: number;
  flushInterval: number;
}

/**
 * Estadísticas de logging
 */
interface LoggingStats {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  lastEvent: number;
  oldestEvent: number;
  storageSize: number;
}

/**
 * Filtros de eventos
 */
interface EventFilter {
  types?: SecurityEventType[];
  severities?: SecurityEventSeverity[];
  startTime?: number;
  endTime?: number;
  userId?: string;
  sessionId?: string;
  limit?: number;
}

/**
 * Servicio de logging y monitoreo de seguridad
 */
export class SecurityLoggingService {
  private static instance: SecurityLoggingService;
  private config: SecurityLoggingConfig;
  private eventQueue: SecurityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private deviceId: string | null = null;

  private constructor() {
    this.config = {
      enabled: true,
      maxLogEntries: 1000,
      retentionDays: 30,
      logToConsole: __DEV__,
      logToStorage: true,
      logToRemote: false, // Disabled by default for privacy
      sensitiveDataMasking: true,
      includeStackTrace: __DEV__,
      includeLocation: false, // Disabled by default for privacy
      batchSize: 10,
      flushInterval: 30000 // 30 seconds
    };

    this.initializeService();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(): SecurityLoggingService {
    if (!SecurityLoggingService.instance) {
      SecurityLoggingService.instance = new SecurityLoggingService();
    }
    return SecurityLoggingService.instance;
  }

  /**
   * Inicializar el servicio
   */
  private async initializeService(): Promise<void> {
    try {
      // Obtener device ID
      this.deviceId = await this.getDeviceId();
      
      // Configurar flush automático
      this.setupAutoFlush();
      
      // Limpiar logs antiguos
      await this.cleanupOldLogs();
      
      console.log('✅ [SECURITY_LOGGING] Service initialized successfully');
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to initialize service:', error);
    }
  }

  /**
   * Registrar evento de seguridad
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    message: string,
    details: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const event: SecurityEvent = {
        id: await this.generateEventId(),
        timestamp: Date.now(),
        type,
        severity,
        message,
        details: this.config.sensitiveDataMasking ? this.maskSensitiveData(details) : details,
        userId,
        sessionId,
        deviceId: this.deviceId || undefined,
        stackTrace: this.config.includeStackTrace ? this.getStackTrace() : undefined
      };

      // Log to console if enabled
      if (this.config.logToConsole) {
        this.logToConsole(event);
      }

      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Flush immediately for critical events
      if (severity === SecurityEventSeverity.CRITICAL) {
        await this.flushEvents();
      }

      console.log(`📊 [SECURITY_LOGGING] Event logged: ${type} (${severity})`);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to log security event:', error);
    }
  }

  /**
   * Registrar intento de login
   */
  async logLoginAttempt(email: string, success: boolean, details: Record<string, any> = {}): Promise<void> {
    const type = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE;
    const severity = success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING;
    const message = success ? `Login successful for ${email}` : `Login failed for ${email}`;
    
    await this.logSecurityEvent(type, severity, message, {
      email: this.maskEmail(email),
      ...details
    });
  }

  /**
   * Registrar logout
   */
  async logLogout(userId: string, sessionId: string, reason: string = 'user_initiated'): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.LOGOUT,
      SecurityEventSeverity.INFO,
      `User logged out: ${reason}`,
      { reason },
      userId,
      sessionId
    );
  }

  /**
   * Registrar error de seguridad
   */
  async logSecurityError(
    type: SecurityEventType,
    error: Error,
    details: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      type,
      SecurityEventSeverity.ERROR,
      error.message,
      {
        errorName: error.name,
        errorStack: this.config.includeStackTrace ? error.stack : undefined,
        ...details
      },
      userId,
      sessionId
    );
  }

  /**
   * Registrar actividad sospechosa
   */
  async logSuspiciousActivity(
    description: string,
    details: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventSeverity.CRITICAL,
      `Suspicious activity detected: ${description}`,
      details,
      userId,
      sessionId
    );
  }

  /**
   * Registrar evento de red
   */
  async logNetworkEvent(
    type: SecurityEventType,
    message: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const severity = type === SecurityEventType.NETWORK_ERROR ? 
      SecurityEventSeverity.WARNING : SecurityEventSeverity.INFO;
    
    await this.logSecurityEvent(type, severity, message, details);
  }

  /**
   * Obtener eventos de seguridad
   */
  async getSecurityEvents(filter: EventFilter = {}): Promise<SecurityEvent[]> {
    try {
      const allEvents = await this.loadEventsFromStorage();
      return this.filterEvents(allEvents, filter);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de logging
   */
  async getLoggingStats(): Promise<LoggingStats> {
    try {
      const events = await this.loadEventsFromStorage();
      
      const stats: LoggingStats = {
        totalEvents: events.length,
        eventsByType: {} as Record<SecurityEventType, number>,
        eventsBySeverity: {} as Record<SecurityEventSeverity, number>,
        lastEvent: 0,
        oldestEvent: 0,
        storageSize: 0
      };

      // Initialize counters
      Object.values(SecurityEventType).forEach(type => {
        stats.eventsByType[type] = 0;
      });
      Object.values(SecurityEventSeverity).forEach(severity => {
        stats.eventsBySeverity[severity] = 0;
      });

      // Calculate statistics
      events.forEach(event => {
        stats.eventsByType[event.type]++;
        stats.eventsBySeverity[event.severity]++;
        
        if (event.timestamp > stats.lastEvent) {
          stats.lastEvent = event.timestamp;
        }
        
        if (stats.oldestEvent === 0 || event.timestamp < stats.oldestEvent) {
          stats.oldestEvent = event.timestamp;
        }
      });

      // Estimate storage size
      stats.storageSize = JSON.stringify(events).length;

      return stats;
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to get logging stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {} as Record<SecurityEventType, number>,
        eventsBySeverity: {} as Record<SecurityEventSeverity, number>,
        lastEvent: 0,
        oldestEvent: 0,
        storageSize: 0
      };
    }
  }

  /**
   * Limpiar logs antiguos
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const events = await this.loadEventsFromStorage();
      const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      const filteredEvents = events.filter(event => event.timestamp > cutoffTime);
      
      // Limitar número máximo de eventos
      const finalEvents = filteredEvents
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.config.maxLogEntries);

      await this.saveEventsToStorage(finalEvents);
      
      const removedCount = events.length - finalEvents.length;
      if (removedCount > 0) {
        console.log(`🧹 [SECURITY_LOGGING] Cleaned up ${removedCount} old log entries`);
      }
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to cleanup old logs:', error);
    }
  }

  /**
   * Exportar logs para análisis
   */
  async exportLogs(filter: EventFilter = {}): Promise<string> {
    try {
      const events = await this.getSecurityEvents(filter);
      return JSON.stringify(events, null, 2);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to export logs:', error);
      return '[]';
    }
  }

  /**
   * Configurar el servicio
   */
  updateConfig(newConfig: Partial<SecurityLoggingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reconfigurar auto-flush si cambió el intervalo
    if (newConfig.flushInterval) {
      this.setupAutoFlush();
    }
    
    console.log('🔧 [SECURITY_LOGGING] Configuration updated');
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): SecurityLoggingConfig {
    return { ...this.config };
  }

  /**
   * Flush manual de eventos
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    try {
      const eventsToFlush = [...this.eventQueue];
      this.eventQueue = [];

      if (this.config.logToStorage) {
        await this.saveEventsToStorage(eventsToFlush);
      }

      if (this.config.logToRemote && this.config.remoteEndpoint) {
        await this.sendEventsToRemote(eventsToFlush);
      }

      console.log(`📤 [SECURITY_LOGGING] Flushed ${eventsToFlush.length} events`);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to flush events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  /**
   * Configurar flush automático
   */
  private setupAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length >= this.config.batchSize) {
        this.flushEvents();
      }
    }, this.config.flushInterval);
  }

  /**
   * Generar ID único para evento
   */
  private async generateEventId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `sec_${timestamp}_${random}`;
  }

  /**
   * Obtener device ID
   */
  private async getDeviceId(): Promise<string> {
    try {
      const result = await bowpiSecureStorage.secureRetrieve<string>('device_id');
      return result.data || 'unknown';
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to get device ID:', error);
      return 'unknown';
    }
  }

  /**
   * Obtener stack trace
   */
  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (error) {
      return (error as Error).stack || '';
    }
  }

  /**
   * Enmascarar datos sensibles
   */
  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked = { ...data };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];

    Object.keys(masked).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        if (typeof masked[key] === 'string') {
          masked[key] = this.maskString(masked[key]);
        } else {
          masked[key] = '[MASKED]';
        }
      }
    });

    return masked;
  }

  /**
   * Enmascarar string
   */
  private maskString(str: string): string {
    if (str.length <= 4) {
      return '*'.repeat(str.length);
    }
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  /**
   * Enmascarar email
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return this.maskString(email);
    
    const maskedLocal = local.length > 2 ? 
      local.substring(0, 1) + '*'.repeat(local.length - 2) + local.substring(local.length - 1) :
      '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Log to console
   */
  private logToConsole(event: SecurityEvent): void {
    const prefix = `🔒 [SECURITY_${event.severity.toUpperCase()}]`;
    const message = `${event.type}: ${event.message}`;
    
    switch (event.severity) {
      case SecurityEventSeverity.CRITICAL:
        console.error(prefix, message, event.details);
        break;
      case SecurityEventSeverity.ERROR:
        console.error(prefix, message, event.details);
        break;
      case SecurityEventSeverity.WARNING:
        console.warn(prefix, message, event.details);
        break;
      case SecurityEventSeverity.INFO:
        console.log(prefix, message, event.details);
        break;
    }
  }

  /**
   * Cargar eventos desde storage
   */
  private async loadEventsFromStorage(): Promise<SecurityEvent[]> {
    try {
      const result = await bowpiSecureStorage.secureRetrieve<SecurityEvent[]>('security_logs');
      return result.success && result.data ? result.data : [];
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to load events from storage:', error);
      return [];
    }
  }

  /**
   * Guardar eventos en storage
   */
  private async saveEventsToStorage(newEvents: SecurityEvent[]): Promise<void> {
    try {
      const existingEvents = await this.loadEventsFromStorage();
      const allEvents = [...existingEvents, ...newEvents]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.config.maxLogEntries);

      await bowpiSecureStorage.secureStore('security_logs', allEvents);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to save events to storage:', error);
      throw error;
    }
  }

  /**
   * Enviar eventos a servidor remoto
   */
  private async sendEventsToRemote(events: SecurityEvent[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      // En una implementación real, esto enviaría los eventos a un servidor de logging
      console.log(`📡 [SECURITY_LOGGING] Would send ${events.length} events to ${this.config.remoteEndpoint}`);
    } catch (error) {
      console.error('❌ [SECURITY_LOGGING] Failed to send events to remote:', error);
      throw error;
    }
  }

  /**
   * Filtrar eventos
   */
  private filterEvents(events: SecurityEvent[], filter: EventFilter): SecurityEvent[] {
    let filtered = events;

    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter(event => filter.types!.includes(event.type));
    }

    if (filter.severities && filter.severities.length > 0) {
      filtered = filtered.filter(event => filter.severities!.includes(event.severity));
    }

    if (filter.startTime) {
      filtered = filtered.filter(event => event.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      filtered = filtered.filter(event => event.timestamp <= filter.endTime!);
    }

    if (filter.userId) {
      filtered = filtered.filter(event => event.userId === filter.userId);
    }

    if (filter.sessionId) {
      filtered = filtered.filter(event => event.sessionId === filter.sessionId);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filter.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Cleanup al destruir el servicio
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushEvents();
    console.log('🔒 [SECURITY_LOGGING] Service destroyed');
  }
}

// Export singleton instance
export const securityLogger = SecurityLoggingService.getInstance();

// Export types for external use
export type { SecurityEvent, EventFilter, LoggingStats };
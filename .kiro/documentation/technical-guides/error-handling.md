# Error Handling & Logging Standards

## Overview

Esta guía establece los estándares de manejo de errores y logging para CrediBowpi Mobile, incluyendo categorización de errores, estrategias de recuperación, patrones de logging y mejores prácticas para debugging y monitoreo en producción.

## Table of Contents

1. [Error Categories](#error-categories)
2. [Error Handling Patterns](#error-handling-patterns)
3. [Logging Patterns](#logging-patterns)
4. [Production Logging Guidelines](#production-logging-guidelines)
5. [Debug Information Structure](#debug-information-structure)
6. [Error Reporting and Analytics](#error-reporting-and-analytics)
7. [Recovery Strategies](#recovery-strategies)
8. [Security Error Handling](#security-error-handling)
9. [User Experience Guidelines](#user-experience-guidelines)
10. [Testing Error Scenarios](#testing-error-scenarios)

## Error Categories

### Network Errors and Retry Logic

```typescript
// Categorización de errores de red
export enum NetworkErrorType {
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  SSL_HANDSHAKE_FAILED = 'SSL_HANDSHAKE_FAILED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  SERVER_UNREACHABLE = 'SERVER_UNREACHABLE'
}

export class NetworkError extends Error {
  constructor(
    public type: NetworkErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Lógica de reintentos
export class NetworkRetryManager {
  private static readonly RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt)) {
          break;
        }
        
        const delay = this.calculateDelay(attempt);
        
        ErrorLogger.logRetryAttempt({
          context,
          attempt,
          maxAttempts: this.RETRY_CONFIG.maxAttempts,
          delay,
          error: error.message
        });
        
        await this.sleep(delay);
      }
    }
    
    throw new NetworkError(
      NetworkErrorType.CONNECTION_TIMEOUT,
      `Operation failed after ${this.RETRY_CONFIG.maxAttempts} attempts: ${lastError.message}`,
      lastError,
      false
    );
  }
}  pr
ivate static shouldRetry(error: any, attempt: number): boolean {
    // No reintentar en el último intento
    if (attempt >= this.RETRY_CONFIG.maxAttempts) {
      return false;
    }
    
    // Errores que no deben reintentarse
    const nonRetryableErrors = [
      'INVALID_CREDENTIALS',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION_ERROR'
    ];
    
    if (nonRetryableErrors.includes(error.type)) {
      return false;
    }
    
    // Códigos HTTP que no deben reintentarse
    const nonRetryableStatusCodes = [400, 401, 403, 404, 422];
    if (error.response?.status && nonRetryableStatusCodes.includes(error.response.status)) {
      return false;
    }
    
    return true;
  }
  
  private static calculateDelay(attempt: number): number {
    const baseDelay = this.RETRY_CONFIG.baseDelay;
    const backoffDelay = baseDelay * Math.pow(this.RETRY_CONFIG.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(backoffDelay, this.RETRY_CONFIG.maxDelay);
    
    // Agregar jitter para evitar thundering herd
    const jitter = cappedDelay * this.RETRY_CONFIG.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Validation Errors and User Feedback

```typescript
// Errores de validación
export enum ValidationErrorType {
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  DUPLICATE_VALUE = 'DUPLICATE_VALUE',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION'
}

export class ValidationError extends Error {
  constructor(
    public type: ValidationErrorType,
    public field: string,
    message: string,
    public userMessage?: string,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Gestor de errores de validación
export class ValidationErrorManager {
  static createFieldError(
    field: string,
    type: ValidationErrorType,
    value: any,
    constraints?: any
  ): ValidationError {
    const message = this.generateTechnicalMessage(field, type, value, constraints);
    const userMessage = this.generateUserMessage(field, type, constraints);
    const suggestions = this.generateSuggestions(field, type, constraints);
    
    return new ValidationError(type, field, message, userMessage, suggestions);
  }
  
  private static generateUserMessage(
    field: string,
    type: ValidationErrorType,
    constraints?: any
  ): string {
    const fieldDisplayName = this.getFieldDisplayName(field);
    
    switch (type) {
      case ValidationErrorType.REQUIRED_FIELD:
        return `${fieldDisplayName} es obligatorio`;
      case ValidationErrorType.INVALID_FORMAT:
        return `${fieldDisplayName} tiene un formato inválido`;
      case ValidationErrorType.OUT_OF_RANGE:
        return `${fieldDisplayName} debe estar entre ${constraints?.min} y ${constraints?.max}`;
      case ValidationErrorType.DUPLICATE_VALUE:
        return `${fieldDisplayName} ya existe en el sistema`;
      case ValidationErrorType.BUSINESS_RULE_VIOLATION:
        return `${fieldDisplayName} no cumple con las reglas de negocio`;
      default:
        return `Error en ${fieldDisplayName}`;
    }
  }
  
  private static generateSuggestions(
    field: string,
    type: ValidationErrorType,
    constraints?: any
  ): string[] {
    const suggestions: string[] = [];
    
    switch (type) {
      case ValidationErrorType.INVALID_FORMAT:
        if (field === 'email') {
          suggestions.push('Usa el formato: usuario@dominio.com');
        } else if (field === 'dpi') {
          suggestions.push('Usa el formato: 0000 00000 0000');
        } else if (field === 'phone') {
          suggestions.push('Usa el formato: 0000 0000');
        }
        break;
      case ValidationErrorType.OUT_OF_RANGE:
        if (constraints?.min && constraints?.max) {
          suggestions.push(`Ingresa un valor entre ${constraints.min} y ${constraints.max}`);
        }
        break;
    }
    
    return suggestions;
  }
}
```

### System Errors and Recovery

```typescript
// Errores del sistema
export enum SystemErrorType {
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DEPENDENCY_UNAVAILABLE = 'DEPENDENCY_UNAVAILABLE',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
}

export class SystemError extends Error {
  constructor(
    public type: SystemErrorType,
    message: string,
    public originalError?: Error,
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SystemError';
  }
}

// Estrategias de recuperación del sistema
export class SystemRecoveryManager {
  private static recoveryStrategies = new Map<SystemErrorType, RecoveryStrategy>();
  
  static {
    this.recoveryStrategies.set(SystemErrorType.DATABASE_CONNECTION_FAILED, {
      maxAttempts: 3,
      delay: 5000,
      recovery: async () => {
        await DatabaseManager.getInstance().reconnect();
      },
      fallback: async () => {
        await DatabaseManager.getInstance().enableOfflineMode();
      }
    });
    
    this.recoveryStrategies.set(SystemErrorType.FILE_SYSTEM_ERROR, {
      maxAttempts: 2,
      delay: 1000,
      recovery: async () => {
        await FileSystemManager.getInstance().clearTempFiles();
      },
      fallback: async () => {
        await FileSystemManager.getInstance().resetToDefaults();
      }
    });
  }
  
  static async attemptRecovery(error: SystemError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy || !error.recoverable) {
      return false;
    }
    
    ErrorLogger.logRecoveryAttempt({
      errorType: error.type,
      strategy: strategy.constructor.name,
      context: error.context
    });
    
    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        await strategy.recovery();
        
        ErrorLogger.logRecoverySuccess({
          errorType: error.type,
          attempt,
          recoveryTime: Date.now()
        });
        
        return true;
      } catch (recoveryError) {
        ErrorLogger.logRecoveryFailure({
          errorType: error.type,
          attempt,
          recoveryError: recoveryError.message
        });
        
        if (attempt < strategy.maxAttempts) {
          await this.sleep(strategy.delay);
        }
      }
    }
    
    // Intentar fallback
    if (strategy.fallback) {
      try {
        await strategy.fallback();
        
        ErrorLogger.logFallbackSuccess({
          errorType: error.type,
          fallbackTime: Date.now()
        });
        
        return true;
      } catch (fallbackError) {
        ErrorLogger.logFallbackFailure({
          errorType: error.type,
          fallbackError: fallbackError.message
        });
      }
    }
    
    return false;
  }
}
```

### Security Errors and Alerts

```typescript
// Errores de seguridad
export enum SecurityErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  INJECTION_ATTEMPT = 'INJECTION_ATTEMPT'
}

export class SecurityError extends Error {
  constructor(
    public type: SecurityErrorType,
    message: string,
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    public context?: Record<string, any>,
    public shouldAlert: boolean = true
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Gestor de alertas de seguridad
export class SecurityAlertManager {
  private static alertThresholds = new Map<SecurityErrorType, AlertThreshold>();
  
  static {
    this.alertThresholds.set(SecurityErrorType.AUTHENTICATION_FAILED, {
      maxOccurrences: 5,
      timeWindow: 300000, // 5 minutos
      severity: 'HIGH'
    });
    
    this.alertThresholds.set(SecurityErrorType.SUSPICIOUS_ACTIVITY, {
      maxOccurrences: 1,
      timeWindow: 0,
      severity: 'CRITICAL'
    });
  }
  
  static handleSecurityError(error: SecurityError): void {
    // Log inmediato del error de seguridad
    SecurityLogger.logSecurityEvent({
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: this.sanitizeContext(error.context),
      timestamp: Date.now()
    });
    
    // Verificar si debe generar alerta
    if (error.shouldAlert && this.shouldTriggerAlert(error)) {
      this.triggerSecurityAlert(error);
    }
    
    // Aplicar medidas de seguridad automáticas
    this.applySecurityMeasures(error);
  }
  
  private static shouldTriggerAlert(error: SecurityError): boolean {
    const threshold = this.alertThresholds.get(error.type);
    if (!threshold) return true;
    
    // Verificar frecuencia de ocurrencia
    const recentOccurrences = SecurityLogger.getRecentOccurrences(
      error.type,
      threshold.timeWindow
    );
    
    return recentOccurrences >= threshold.maxOccurrences;
  }
  
  private static triggerSecurityAlert(error: SecurityError): void {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: Date.now(),
      context: error.context,
      status: 'ACTIVE'
    };
    
    // Enviar alerta a sistemas de monitoreo
    this.sendToSecurityMonitoring(alert);
    
    // Notificar al equipo de seguridad si es crítico
    if (error.severity === 'CRITICAL') {
      this.notifySecurityTeam(alert);
    }
  }
  
  private static applySecurityMeasures(error: SecurityError): void {
    switch (error.type) {
      case SecurityErrorType.AUTHENTICATION_FAILED:
        // Implementar rate limiting
        RateLimitManager.applyLimit(error.context?.userId || 'anonymous');
        break;
        
      case SecurityErrorType.SUSPICIOUS_ACTIVITY:
        // Bloquear temporalmente la cuenta
        SecurityManager.temporaryAccountLock(error.context?.userId);
        break;
        
      case SecurityErrorType.INJECTION_ATTEMPT:
        // Bloquear IP si es posible
        SecurityManager.blockSuspiciousIP(error.context?.ipAddress);
        break;
    }
  }
}
```

## Error Handling Patterns

### Centralized Error Handler

```typescript
// Manejador centralizado de errores
export class GlobalErrorHandler {
  private static errorHandlers = new Map<string, ErrorHandler>();
  private static fallbackHandler: ErrorHandler;
  
  static initialize(): void {
    // Registrar manejadores específicos
    this.registerHandler('NetworkError', new NetworkErrorHandler());
    this.registerHandler('ValidationError', new ValidationErrorHandler());
    this.registerHandler('SystemError', new SystemErrorHandler());
    this.registerHandler('SecurityError', new SecurityErrorHandler());
    
    // Manejador por defecto
    this.fallbackHandler = new DefaultErrorHandler();
    
    // Configurar manejadores globales
    this.setupGlobalHandlers();
  }
  
  static registerHandler(errorType: string, handler: ErrorHandler): void {
    this.errorHandlers.set(errorType, handler);
  }
  
  static async handleError(error: Error, context?: ErrorContext): Promise<void> {
    try {
      // Obtener manejador específico
      const handler = this.errorHandlers.get(error.constructor.name) || this.fallbackHandler;
      
      // Enriquecer contexto
      const enrichedContext = await this.enrichContext(error, context);
      
      // Manejar error
      await handler.handle(error, enrichedContext);
      
    } catch (handlingError) {
      // Error en el manejo de errores - usar logging básico
      console.error('Error in error handling:', handlingError);
      BasicLogger.logCriticalError({
        originalError: error.message,
        handlingError: handlingError.message,
        timestamp: Date.now()
      });
    }
  }
  
  private static async enrichContext(error: Error, context?: ErrorContext): Promise<ErrorContext> {
    return {
      ...context,
      errorId: this.generateErrorId(),
      timestamp: Date.now(),
      appVersion: await getAppVersion(),
      deviceInfo: await getDeviceInfo(),
      networkState: await getNetworkState(),
      memoryUsage: await getMemoryUsage(),
      stackTrace: error.stack
    };
  }
  
  private static setupGlobalHandlers(): void {
    // Manejar errores no capturados
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.handleError(error, { isFatal, source: 'global' });
      });
    }
    
    // Manejar promesas rechazadas
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.handleError(error, { source: 'unhandledRejection', promise });
      });
    }
  }
}

// Interface para manejadores de error
export interface ErrorHandler {
  handle(error: Error, context: ErrorContext): Promise<void>;
}

// Manejador de errores de red
export class NetworkErrorHandler implements ErrorHandler {
  async handle(error: NetworkError, context: ErrorContext): Promise<void> {
    // Log del error
    ErrorLogger.logNetworkError({
      type: error.type,
      message: error.message,
      retryable: error.retryable,
      context
    });
    
    // Mostrar feedback al usuario
    if (error.retryable) {
      UserFeedback.showRetryableError(
        'Error de conexión',
        'Verifica tu conexión a internet e intenta nuevamente',
        () => this.retryOperation(context)
      );
    } else {
      UserFeedback.showError(
        'Error de red',
        'No se pudo conectar al servidor. Intenta más tarde.'
      );
    }
    
    // Intentar recuperación automática si es apropiado
    if (error.retryable && context.autoRetry !== false) {
      await NetworkRetryManager.executeWithRetry(
        () => this.retryOperation(context),
        context.operation || 'unknown'
      );
    }
  }
  
  private async retryOperation(context: ErrorContext): Promise<void> {
    if (context.retryCallback) {
      await context.retryCallback();
    }
  }
}
```

## Logging Patterns

### Structured Logging System

```typescript
// Sistema de logging estructurado
export class StructuredLogger {
  private static instance: StructuredLogger;
  private logLevel: LogLevel;
  private loggers: Map<string, Logger> = new Map();
  
  private constructor() {
    this.logLevel = this.getLogLevel();
    this.initializeLoggers();
  }
  
  static getInstance(): StructuredLogger {
    if (!this.instance) {
      this.instance = new StructuredLogger();
    }
    return this.instance;
  }
  
  private initializeLoggers(): void {
    // Logger para errores generales
    this.loggers.set('error', new ErrorLogger());
    
    // Logger para eventos de seguridad
    this.loggers.set('security', new SecurityLogger());
    
    // Logger para performance
    this.loggers.set('performance', new PerformanceLogger());
    
    // Logger para eventos de negocio
    this.loggers.set('business', new BusinessEventLogger());
    
    // Logger para debugging
    this.loggers.set('debug', new DebugLogger());
  }
  
  log(level: LogLevel, category: string, event: LogEvent): void {
    if (!this.shouldLog(level)) return;
    
    const logger = this.loggers.get(category) || this.loggers.get('error');
    if (!logger) return;
    
    const enrichedEvent = this.enrichLogEvent(event, level, category);
    logger.log(enrichedEvent);
  }
  
  private enrichLogEvent(event: LogEvent, level: LogLevel, category: string): EnrichedLogEvent {
    return {
      ...event,
      level,
      category,
      timestamp: Date.now(),
      sessionId: this.getCurrentSessionId(),
      userId: this.getCurrentUserId(),
      requestId: this.getCurrentRequestId(),
      environment: __DEV__ ? 'development' : 'production'
    };
  }
  
  // Métodos de conveniencia
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, 'error', {
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }
  
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, 'error', { message, context });
  }
  
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, 'business', { message, context });
  }
  
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, 'debug', { message, context });
  }
  
  security(event: SecurityEvent): void {
    this.log(LogLevel.WARN, 'security', {
      message: `Security event: ${event.type}`,
      context: event
    });
  }
  
  performance(metric: PerformanceMetric): void {
    this.log(LogLevel.INFO, 'performance', {
      message: `Performance metric: ${metric.name}`,
      context: metric
    });
  }
}

// Enums y tipos
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEvent {
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
}

export interface EnrichedLogEvent extends LogEvent {
  level: LogLevel;
  category: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  requestId?: string;
  environment: string;
}
```

### Production Logging Guidelines

```typescript
// Configuración de logging para producción
export class ProductionLoggingConfig {
  static readonly CONFIG = {
    // Niveles de log por categoría
    logLevels: {
      error: LogLevel.ERROR,
      security: LogLevel.WARN,
      performance: LogLevel.INFO,
      business: LogLevel.INFO,
      debug: LogLevel.DEBUG // Solo en desarrollo
    },
    
    // Límites de logging
    limits: {
      maxLogSize: 10 * 1024 * 1024, // 10MB
      maxLogsPerMinute: 1000,
      maxContextSize: 5 * 1024, // 5KB por contexto
      retentionDays: 30
    },
    
    // Configuración de envío
    shipping: {
      batchSize: 100,
      flushInterval: 30000, // 30 segundos
      maxRetries: 3,
      compressionEnabled: true
    },
    
    // Filtros de datos sensibles
    sensitiveDataFilters: [
      'password',
      'token',
      'authorization',
      'cookie',
      'session',
      'dpi',
      'nit',
      'phone',
      'email'
    ]
  };
  
  static sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.CONFIG.sensitiveDataFilters.some(filter =>
        lowerKey.includes(filter)
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  static shouldLogInProduction(level: LogLevel, category: string): boolean {
    const requiredLevel = this.CONFIG.logLevels[category] || LogLevel.ERROR;
    return level >= requiredLevel;
  }
}

// Logger para producción
export class ProductionLogger {
  private logBuffer: EnrichedLogEvent[] = [];
  private lastFlush: number = Date.now();
  
  async log(event: EnrichedLogEvent): Promise<void> {
    // Verificar si debe loggear en producción
    if (!ProductionLoggingConfig.shouldLogInProduction(event.level, event.category)) {
      return;
    }
    
    // Sanitizar datos sensibles
    const sanitizedEvent = {
      ...event,
      context: ProductionLoggingConfig.sanitizeLogData(event.context)
    };
    
    // Agregar al buffer
    this.logBuffer.push(sanitizedEvent);
    
    // Verificar si debe hacer flush
    if (this.shouldFlush()) {
      await this.flush();
    }
  }
  
  private shouldFlush(): boolean {
    const config = ProductionLoggingConfig.CONFIG.shipping;
    
    return (
      this.logBuffer.length >= config.batchSize ||
      Date.now() - this.lastFlush >= config.flushInterval
    );
  }
  
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    this.lastFlush = Date.now();
    
    try {
      await this.sendLogsToServer(logsToSend);
    } catch (error) {
      // En caso de error, volver a agregar los logs al buffer
      this.logBuffer.unshift(...logsToSend);
      console.error('Failed to send logs to server:', error);
    }
  }
  
  private async sendLogsToServer(logs: EnrichedLogEvent[]): Promise<void> {
    const config = ProductionLoggingConfig.CONFIG.shipping;
    
    const payload = {
      logs,
      metadata: {
        appVersion: await getAppVersion(),
        deviceInfo: await getDeviceInfo(),
        timestamp: Date.now()
      }
    };
    
    // Comprimir si está habilitado
    const data = config.compressionEnabled 
      ? await this.compressData(payload)
      : payload;
    
    // Enviar al servidor de logging
    await httpClient.post('/api/logs', data, {
      timeout: 10000,
      headers: {
        'Content-Type': config.compressionEnabled 
          ? 'application/json+gzip' 
          : 'application/json'
      }
    });
  }
}
```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi
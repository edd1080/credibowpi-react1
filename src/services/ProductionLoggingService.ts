// Production Logging Service - Secure logging for production environment

import { ENV } from '../constants/environment';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log categories for better organization
 */
export enum LogCategory {
  AUTHENTICATION = 'auth',
  NETWORK = 'network',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Production-safe logging service
 */
class ProductionLoggingService {
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;
  private currentLogLevel: LogLevel;

  constructor() {
    this.currentLogLevel = this.parseLogLevel(ENV.LOGGING.LOG_LEVEL);
    this.initializeLogging();
  }

  /**
   * Initialize logging service
   */
  private initializeLogging(): void {
    // Start periodic flush in production
    if (ENV.ENVIRONMENT.IS_PRODUCTION && ENV.LOGGING.ENABLE_PRODUCTION_LOGS) {
      this.startPeriodicFlush();
    }

    // Log service initialization
    this.info(LogCategory.SYSTEM, 'Production logging service initialized', {
      logLevel: ENV.LOGGING.LOG_LEVEL,
      enableProductionLogs: ENV.LOGGING.ENABLE_PRODUCTION_LOGS,
      enableSecurityLogs: ENV.LOGGING.ENABLE_SECURITY_LOGS,
      enablePerformanceLogs: ENV.LOGGING.ENABLE_PERFORMANCE_LOGS,
    });
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  /**
   * Sanitize data for production logging
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    // In production, remove sensitive information
    if (ENV.ENVIRONMENT.IS_PRODUCTION) {
      const sanitized = { ...data };
      
      // Remove sensitive fields
      const sensitiveFields = [
        'password', 'token', 'jwt', 'secret', 'key', 'credential',
        'authorization', 'cookie', 'session', 'otp', 'pin', 'biometric'
      ];

      const sanitizeObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        const result: any = Array.isArray(obj) ? [] : {};
        
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        
        return result;
      };

      return sanitizeObject(sanitized);
    }

    return data;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    metadata?: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      component?: string;
      action?: string;
      duration?: number;
      error?: Error;
    }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      ...metadata,
    };

    // Add error information if provided
    if (metadata?.error) {
      entry.error = {
        name: metadata.error.name,
        message: metadata.error.message,
        stack: ENV.ENVIRONMENT.IS_DEVELOPMENT ? metadata.error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Add log entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }

    // Console log in development or when production logs are enabled
    if (ENV.ENVIRONMENT.IS_DEVELOPMENT || ENV.LOGGING.ENABLE_PRODUCTION_LOGS) {
      this.consoleLog(entry);
    }
  }

  /**
   * Console log with appropriate formatting
   */
  private consoleLog(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [${entry.category}]`;
    
    const logData = {
      message: entry.message,
      ...(entry.data && { data: entry.data }),
      ...(entry.component && { component: entry.component }),
      ...(entry.action && { action: entry.action }),
      ...(entry.duration && { duration: `${entry.duration}ms` }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      ...(entry.requestId && { requestId: entry.requestId }),
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, logData);
        break;
      case LogLevel.INFO:
        console.info(prefix, logData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, logData);
        if (entry.error) console.warn('Error details:', entry.error);
        break;
      case LogLevel.ERROR:
        console.error(prefix, logData);
        if (entry.error) console.error('Error details:', entry.error);
        break;
    }
  }

  /**
   * Debug level logging
   */
  debug(category: LogCategory, message: string, data?: any, metadata?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, category, message, data, metadata);
    this.addToBuffer(entry);
  }

  /**
   * Info level logging
   */
  info(category: LogCategory, message: string, data?: any, metadata?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, category, message, data, metadata);
    this.addToBuffer(entry);
  }

  /**
   * Warning level logging
   */
  warn(category: LogCategory, message: string, data?: any, metadata?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, category, message, data, metadata);
    this.addToBuffer(entry);
  }

  /**
   * Error level logging
   */
  error(category: LogCategory, message: string, error?: Error, data?: any, metadata?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, data, {
      ...metadata,
      error,
    });
    this.addToBuffer(entry);
  }

  /**
   * Authentication-specific logging
   */
  logAuthEvent(
    level: LogLevel,
    action: string,
    message: string,
    data?: any,
    metadata?: {
      userId?: string;
      sessionId?: string;
      duration?: number;
      success?: boolean;
      error?: Error;
    }
  ): void {
    if (!ENV.LOGGING.ENABLE_SECURITY_LOGS && !this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, LogCategory.AUTHENTICATION, message, data, {
      ...metadata,
      action,
      component: 'AuthenticationService',
    });
    
    this.addToBuffer(entry);
  }

  /**
   * Performance-specific logging
   */
  logPerformanceEvent(
    action: string,
    duration: number,
    message: string,
    data?: any,
    metadata?: {
      component?: string;
      requestId?: string;
      success?: boolean;
    }
  ): void {
    if (!ENV.LOGGING.ENABLE_PERFORMANCE_LOGS) return;

    const entry = this.createLogEntry(LogLevel.INFO, LogCategory.PERFORMANCE, message, data, {
      ...metadata,
      action,
      duration,
    });
    
    this.addToBuffer(entry);
  }

  /**
   * Security-specific logging
   */
  logSecurityEvent(
    level: LogLevel,
    action: string,
    message: string,
    data?: any,
    metadata?: {
      userId?: string;
      sessionId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      component?: string;
    }
  ): void {
    if (!ENV.LOGGING.ENABLE_SECURITY_LOGS) return;

    const entry = this.createLogEntry(level, LogCategory.SECURITY, message, data, {
      ...metadata,
      action,
      component: metadata?.component || 'SecurityService',
    });
    
    this.addToBuffer(entry);
  }

  /**
   * Network-specific logging
   */
  logNetworkEvent(
    level: LogLevel,
    action: string,
    message: string,
    data?: any,
    metadata?: {
      requestId?: string;
      duration?: number;
      statusCode?: number;
      url?: string;
      method?: string;
    }
  ): void {
    if (!this.shouldLog(level)) return;

    // Sanitize URL for production
    const sanitizedData = {
      ...data,
      url: metadata?.url ? this.sanitizeUrl(metadata.url) : undefined,
    };

    const entry = this.createLogEntry(level, LogCategory.NETWORK, message, sanitizedData, {
      ...metadata,
      action,
      component: 'NetworkService',
    });
    
    this.addToBuffer(entry);
  }

  /**
   * Sanitize URL for logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '[INVALID_URL]';
    }
  }

  /**
   * Start periodic flush to remote endpoint
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  /**
   * Flush logs to remote endpoint
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // In production, send logs to remote endpoint
      if (ENV.ENVIRONMENT.IS_PRODUCTION && ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT) {
        await this.sendLogsToRemote(logsToFlush);
      }

    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add logs to buffer if flush failed
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  /**
   * Send logs to remote endpoint
   */
  private async sendLogsToRemote(logs: LogEntry[]): Promise<void> {
    try {
      const response = await fetch(ENV.ANALYTICS.ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Version': ENV.BUILD.VERSION,
          'X-Build-Type': ENV.BUILD.TYPE,
        },
        body: JSON.stringify({
          logs,
          metadata: {
            appVersion: ENV.BUILD.VERSION,
            buildType: ENV.BUILD.TYPE,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      throw error;
    }
  }

  /**
   * Get current log buffer (for debugging)
   */
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get logging statistics
   */
  getLoggingStats(): {
    bufferSize: number;
    maxBufferSize: number;
    currentLogLevel: string;
    enabledCategories: string[];
  } {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      currentLogLevel: LogLevel[this.currentLogLevel],
      enabledCategories: [
        ENV.LOGGING.ENABLE_SECURITY_LOGS && 'security',
        ENV.LOGGING.ENABLE_PERFORMANCE_LOGS && 'performance',
        'authentication',
        'network',
        'error',
        'system',
      ].filter(Boolean) as string[],
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining logs
    this.flushLogs().catch(console.error);
  }
}

// Export singleton instance
export const productionLogger = new ProductionLoggingService();

// Export types and enums
export { LogLevel, LogCategory };
export type { LogEntry };
// Authentication Analytics Service - Monitor and track authentication metrics

import { ENV } from '../constants/environment';
import { productionLogger, LogLevel, LogCategory } from './ProductionLoggingService';

/**
 * Authentication event types
 */
export enum AuthEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT_ATTEMPT = 'logout_attempt',
  LOGOUT_SUCCESS = 'logout_success',
  LOGOUT_FAILURE = 'logout_failure',
  SESSION_RESTORED = 'session_restored',
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH = 'token_refresh',
  BIOMETRIC_AUTH = 'biometric_auth',
  OFFLINE_LOGIN_BLOCKED = 'offline_login_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Authentication failure reasons
 */
export enum AuthFailureReason {
  INVALID_CREDENTIALS = 'invalid_credentials',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  DECRYPTION_ERROR = 'decryption_error',
  TOKEN_EXPIRED = 'token_expired',
  OFFLINE_ATTEMPT = 'offline_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNKNOWN = 'unknown',
}

/**
 * Authentication metrics data structure
 */
export interface AuthMetrics {
  // Success rates
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  
  // Timing metrics
  averageLoginTime: number;
  averageLogoutTime: number;
  
  // Failure analysis
  failureReasons: Record<AuthFailureReason, number>;
  
  // Session metrics
  sessionsRestored: number;
  sessionsExpired: number;
  averageSessionDuration: number;
  
  // Network metrics
  offlineLoginAttempts: number;
  networkFailures: number;
  
  // Security metrics
  suspiciousActivities: number;
  biometricAuthUsage: number;
  
  // Time period
  periodStart: number;
  periodEnd: number;
}

/**
 * Authentication event data
 */
export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  duration?: number;
  success: boolean;
  failureReason?: AuthFailureReason;
  userId?: string;
  sessionId?: string;
  metadata?: {
    networkType?: string;
    networkQuality?: string;
    deviceInfo?: string;
    appVersion?: string;
    buildType?: string;
    retryAttempt?: number;
    biometricType?: string;
    suspiciousActivityType?: string;
  };
}

/**
 * Authentication Analytics Service
 */
class AuthenticationAnalyticsService {
  private events: AuthEvent[] = [];
  private maxEvents = 1000;
  private metricsCache?: AuthMetrics;
  private cacheExpiry = 0;
  private cacheValidityMs = 60000; // 1 minute
  private reportingInterval = 300000; // 5 minutes
  private reportingTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics service
   */
  private initializeAnalytics(): void {
    if (ENV.ANALYTICS.ENABLE_AUTH_METRICS) {
      this.startPeriodicReporting();
      
      productionLogger.info(
        LogCategory.SYSTEM,
        'Authentication analytics service initialized',
        {
          enableAuthMetrics: ENV.ANALYTICS.ENABLE_AUTH_METRICS,
          metricsEndpoint: ENV.ANALYTICS.METRICS_ENDPOINT,
          reportingInterval: this.reportingInterval,
        }
      );
    }
  }

  /**
   * Record authentication event
   */
  recordAuthEvent(
    type: AuthEventType,
    success: boolean,
    duration?: number,
    failureReason?: AuthFailureReason,
    metadata?: AuthEvent['metadata']
  ): void {
    if (!ENV.ANALYTICS.ENABLE_AUTH_METRICS) return;

    const event: AuthEvent = {
      type,
      timestamp: Date.now(),
      success,
      duration,
      failureReason,
      metadata: {
        ...metadata,
        appVersion: ENV.BUILD.VERSION,
        buildType: ENV.BUILD.TYPE,
      },
    };

    this.events.push(event);

    // Maintain event buffer size
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Invalidate metrics cache
    this.invalidateCache();

    // Log significant events
    this.logSignificantEvent(event);

    productionLogger.debug(
      LogCategory.AUTHENTICATION,
      `Auth event recorded: ${type}`,
      {
        success,
        duration,
        failureReason,
        metadata,
      }
    );
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(
    success: boolean,
    duration: number,
    failureReason?: AuthFailureReason,
    metadata?: {
      networkType?: string;
      networkQuality?: string;
      retryAttempt?: number;
      userId?: string;
    }
  ): void {
    const eventType = success ? AuthEventType.LOGIN_SUCCESS : AuthEventType.LOGIN_FAILURE;
    
    this.recordAuthEvent(eventType, success, duration, failureReason, metadata);

    // Also record the attempt
    this.recordAuthEvent(AuthEventType.LOGIN_ATTEMPT, true, duration, undefined, metadata);
  }

  /**
   * Record logout attempt
   */
  recordLogoutAttempt(
    success: boolean,
    duration: number,
    failureReason?: AuthFailureReason,
    metadata?: {
      networkType?: string;
      networkQuality?: string;
      sessionDuration?: number;
    }
  ): void {
    const eventType = success ? AuthEventType.LOGOUT_SUCCESS : AuthEventType.LOGOUT_FAILURE;
    
    this.recordAuthEvent(eventType, success, duration, failureReason, metadata);

    // Also record the attempt
    this.recordAuthEvent(AuthEventType.LOGOUT_ATTEMPT, true, duration, undefined, metadata);
  }

  /**
   * Record session restoration
   */
  recordSessionRestored(
    success: boolean,
    duration: number,
    metadata?: {
      sessionAge?: number;
      userId?: string;
    }
  ): void {
    this.recordAuthEvent(AuthEventType.SESSION_RESTORED, success, duration, undefined, metadata);
  }

  /**
   * Record session expiration
   */
  recordSessionExpired(
    sessionDuration: number,
    metadata?: {
      reason?: string;
      userId?: string;
    }
  ): void {
    this.recordAuthEvent(
      AuthEventType.SESSION_EXPIRED,
      true,
      undefined,
      undefined,
      {
        ...metadata,
        sessionDuration: sessionDuration.toString(),
      }
    );
  }

  /**
   * Record offline login attempt
   */
  recordOfflineLoginBlocked(
    networkType: string,
    networkQuality: string
  ): void {
    this.recordAuthEvent(
      AuthEventType.OFFLINE_LOGIN_BLOCKED,
      false,
      undefined,
      AuthFailureReason.OFFLINE_ATTEMPT,
      {
        networkType,
        networkQuality,
      }
    );
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(
    activityType: string,
    metadata?: {
      severity?: string;
      userId?: string;
      sessionId?: string;
    }
  ): void {
    this.recordAuthEvent(
      AuthEventType.SUSPICIOUS_ACTIVITY,
      false,
      undefined,
      AuthFailureReason.SUSPICIOUS_ACTIVITY,
      {
        ...metadata,
        suspiciousActivityType: activityType,
      }
    );
  }

  /**
   * Record biometric authentication usage
   */
  recordBiometricAuth(
    success: boolean,
    biometricType: string,
    duration: number,
    failureReason?: AuthFailureReason
  ): void {
    this.recordAuthEvent(
      AuthEventType.BIOMETRIC_AUTH,
      success,
      duration,
      failureReason,
      {
        biometricType,
      }
    );
  }

  /**
   * Calculate authentication metrics
   */
  calculateMetrics(periodHours: number = 24): AuthMetrics {
    // Check cache first
    if (this.metricsCache && Date.now() < this.cacheExpiry) {
      return this.metricsCache;
    }

    const periodStart = Date.now() - (periodHours * 60 * 60 * 1000);
    const periodEnd = Date.now();
    
    const periodEvents = this.events.filter(
      event => event.timestamp >= periodStart && event.timestamp <= periodEnd
    );

    // Calculate basic metrics
    const loginAttempts = periodEvents.filter(e => e.type === AuthEventType.LOGIN_ATTEMPT);
    const successfulLogins = periodEvents.filter(e => e.type === AuthEventType.LOGIN_SUCCESS);
    const failedLogins = periodEvents.filter(e => e.type === AuthEventType.LOGIN_FAILURE);
    
    const totalAttempts = loginAttempts.length;
    const successCount = successfulLogins.length;
    const failureCount = failedLogins.length;
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    // Calculate timing metrics
    const loginTimes = successfulLogins
      .map(e => e.duration)
      .filter((d): d is number => d !== undefined);
    const averageLoginTime = loginTimes.length > 0 
      ? loginTimes.reduce((sum, time) => sum + time, 0) / loginTimes.length 
      : 0;

    const logoutEvents = periodEvents.filter(e => e.type === AuthEventType.LOGOUT_SUCCESS);
    const logoutTimes = logoutEvents
      .map(e => e.duration)
      .filter((d): d is number => d !== undefined);
    const averageLogoutTime = logoutTimes.length > 0
      ? logoutTimes.reduce((sum, time) => sum + time, 0) / logoutTimes.length
      : 0;

    // Calculate failure reasons
    const failureReasons: Record<AuthFailureReason, number> = {
      [AuthFailureReason.INVALID_CREDENTIALS]: 0,
      [AuthFailureReason.NETWORK_ERROR]: 0,
      [AuthFailureReason.SERVER_ERROR]: 0,
      [AuthFailureReason.TIMEOUT]: 0,
      [AuthFailureReason.DECRYPTION_ERROR]: 0,
      [AuthFailureReason.TOKEN_EXPIRED]: 0,
      [AuthFailureReason.OFFLINE_ATTEMPT]: 0,
      [AuthFailureReason.SUSPICIOUS_ACTIVITY]: 0,
      [AuthFailureReason.UNKNOWN]: 0,
    };

    failedLogins.forEach(event => {
      if (event.failureReason) {
        failureReasons[event.failureReason]++;
      } else {
        failureReasons[AuthFailureReason.UNKNOWN]++;
      }
    });

    // Calculate session metrics
    const sessionsRestored = periodEvents.filter(e => e.type === AuthEventType.SESSION_RESTORED).length;
    const sessionsExpired = periodEvents.filter(e => e.type === AuthEventType.SESSION_EXPIRED).length;
    
    const sessionDurations = periodEvents
      .filter(e => e.type === AuthEventType.SESSION_EXPIRED)
      .map(e => parseInt(e.metadata?.sessionDuration || '0', 10))
      .filter(d => d > 0);
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;

    // Calculate network and security metrics
    const offlineLoginAttempts = periodEvents.filter(e => e.type === AuthEventType.OFFLINE_LOGIN_BLOCKED).length;
    const networkFailures = failedLogins.filter(e => e.failureReason === AuthFailureReason.NETWORK_ERROR).length;
    const suspiciousActivities = periodEvents.filter(e => e.type === AuthEventType.SUSPICIOUS_ACTIVITY).length;
    const biometricAuthUsage = periodEvents.filter(e => e.type === AuthEventType.BIOMETRIC_AUTH).length;

    const metrics: AuthMetrics = {
      totalAttempts,
      successfulLogins: successCount,
      failedLogins: failureCount,
      successRate,
      averageLoginTime,
      averageLogoutTime,
      failureReasons,
      sessionsRestored,
      sessionsExpired,
      averageSessionDuration,
      offlineLoginAttempts,
      networkFailures,
      suspiciousActivities,
      biometricAuthUsage,
      periodStart,
      periodEnd,
    };

    // Cache metrics
    this.metricsCache = metrics;
    this.cacheExpiry = Date.now() + this.cacheValidityMs;

    return metrics;
  }

  /**
   * Get authentication success rate
   */
  getSuccessRate(periodHours: number = 24): number {
    const metrics = this.calculateMetrics(periodHours);
    return metrics.successRate;
  }

  /**
   * Get failure analysis
   */
  getFailureAnalysis(periodHours: number = 24): {
    totalFailures: number;
    failureReasons: Record<AuthFailureReason, number>;
    topFailureReason: AuthFailureReason | null;
  } {
    const metrics = this.calculateMetrics(periodHours);
    
    const topFailureReason = Object.entries(metrics.failureReasons)
      .reduce((max, [reason, count]) => 
        count > max.count ? { reason: reason as AuthFailureReason, count } : max,
        { reason: null as AuthFailureReason | null, count: 0 }
      ).reason;

    return {
      totalFailures: metrics.failedLogins,
      failureReasons: metrics.failureReasons,
      topFailureReason,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(periodHours: number = 24): {
    averageLoginTime: number;
    averageLogoutTime: number;
    averageSessionDuration: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  } {
    const metrics = this.calculateMetrics(periodHours);
    
    // Calculate performance grade based on login time
    let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (metrics.averageLoginTime < 2000) performanceGrade = 'A';
    else if (metrics.averageLoginTime < 5000) performanceGrade = 'B';
    else if (metrics.averageLoginTime < 10000) performanceGrade = 'C';
    else if (metrics.averageLoginTime < 20000) performanceGrade = 'D';
    else performanceGrade = 'F';

    return {
      averageLoginTime: metrics.averageLoginTime,
      averageLogoutTime: metrics.averageLogoutTime,
      averageSessionDuration: metrics.averageSessionDuration,
      performanceGrade,
    };
  }

  /**
   * Log significant events
   */
  private logSignificantEvent(event: AuthEvent): void {
    const significantEvents = [
      AuthEventType.LOGIN_FAILURE,
      AuthEventType.LOGOUT_FAILURE,
      AuthEventType.SUSPICIOUS_ACTIVITY,
      AuthEventType.OFFLINE_LOGIN_BLOCKED,
    ];

    if (significantEvents.includes(event.type)) {
      productionLogger.warn(
        LogCategory.AUTHENTICATION,
        `Significant auth event: ${event.type}`,
        {
          success: event.success,
          failureReason: event.failureReason,
          metadata: event.metadata,
        }
      );
    }
  }

  /**
   * Start periodic reporting to analytics endpoint
   */
  private startPeriodicReporting(): void {
    if (!ENV.ANALYTICS.METRICS_ENDPOINT) return;

    this.reportingTimer = setInterval(() => {
      this.reportMetrics().catch(error => {
        productionLogger.error(
          LogCategory.SYSTEM,
          'Failed to report authentication metrics',
          error,
          { component: 'AuthenticationAnalyticsService' }
        );
      });
    }, this.reportingInterval);
  }

  /**
   * Report metrics to analytics endpoint
   */
  private async reportMetrics(): Promise<void> {
    if (!ENV.ANALYTICS.METRICS_ENDPOINT || this.events.length === 0) return;

    try {
      const metrics = this.calculateMetrics(24); // Last 24 hours
      
      const reportData = {
        timestamp: Date.now(),
        appVersion: ENV.BUILD.VERSION,
        buildType: ENV.BUILD.TYPE,
        metrics,
        recentEvents: this.events.slice(-50), // Last 50 events
      };

      const response = await fetch(ENV.ANALYTICS.METRICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Version': ENV.BUILD.VERSION,
          'X-Build-Type': ENV.BUILD.TYPE,
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      productionLogger.info(
        LogCategory.SYSTEM,
        'Authentication metrics reported successfully',
        {
          metricsCount: Object.keys(metrics).length,
          eventsCount: reportData.recentEvents.length,
          successRate: metrics.successRate,
        }
      );

    } catch (error) {
      productionLogger.error(
        LogCategory.SYSTEM,
        'Failed to report authentication metrics',
        error as Error,
        { endpoint: ENV.ANALYTICS.METRICS_ENDPOINT }
      );
    }
  }

  /**
   * Invalidate metrics cache
   */
  private invalidateCache(): void {
    this.metricsCache = undefined;
    this.cacheExpiry = 0;
  }

  /**
   * Get analytics summary for debugging
   */
  getAnalyticsSummary(): {
    totalEvents: number;
    recentMetrics: AuthMetrics;
    isReportingEnabled: boolean;
    lastReportTime?: number;
  } {
    return {
      totalEvents: this.events.length,
      recentMetrics: this.calculateMetrics(1), // Last hour
      isReportingEnabled: ENV.ANALYTICS.ENABLE_AUTH_METRICS && !!ENV.ANALYTICS.METRICS_ENDPOINT,
    };
  }

  /**
   * Clear analytics data
   */
  clearAnalyticsData(): void {
    this.events = [];
    this.invalidateCache();
    
    productionLogger.info(
      LogCategory.SYSTEM,
      'Authentication analytics data cleared'
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = undefined;
    }

    // Send final report
    this.reportMetrics().catch(console.error);
  }
}

// Export singleton instance
export const authAnalytics = new AuthenticationAnalyticsService();

// Export types and enums
export { AuthEventType, AuthFailureReason };
export type { AuthMetrics, AuthEvent };
// Secure HTTP Client for Bowpi Integration

import { 
  RequestConfig, 
  ResponseConfig, 
  ResponseWs,
  BowpiAuthError,
  BowpiAuthErrorType,
  ALLOWED_DOMAINS,
  InterceptorContext
} from '../types/bowpi';
import { BowpiAuthenticationInterceptor } from './bowpi/BowpiAuthenticationInterceptor';
import { BowpiAuthAdapter } from './bowpi/BowpiAuthAdapter';
import { config } from '../constants/config';
import { productionLogger, LogCategory, LogLevel } from './ProductionLoggingService';

/**
 * Environment configuration for HTTP client
 */
interface HttpClientConfig {
  isDevelopment: boolean;
  allowHttp: boolean;
  enableDebugLogs: boolean;
  baseUrl?: string;
  timeout: number;
}

/**
 * Secure HTTP Client with Bowpi integration
 * 
 * Features:
 * - Domain validation for allowed domains
 * - HTTPS enforcement in production
 * - No-cache policy for non-authentication microservices
 * - Automatic header injection via BowpiAuthenticationInterceptor
 * - Request/response logging for development
 */
export class SecureHttpClient {
  private config: HttpClientConfig;
  private interceptor: BowpiAuthenticationInterceptor;
  private requestIdCounter = 0;

  constructor(clientConfig?: Partial<HttpClientConfig>) {
    this.config = {
      isDevelopment: __DEV__ ?? false,
      allowHttp: !config.security.enforceHttps,
      enableDebugLogs: config.logging.enableDebugLogs,
      timeout: config.security.requestTimeout,
      ...clientConfig
    };

    // Initialize interceptor with auth adapter
    const authAdapter = new BowpiAuthAdapter();
    this.interceptor = new BowpiAuthenticationInterceptor(authAdapter);

    productionLogger.info(
      LogCategory.SYSTEM,
      'Secure HTTP client initialized',
      {
        isDevelopment: this.config.isDevelopment,
        allowHttp: this.config.allowHttp,
        enableDebugLogs: this.config.enableDebugLogs,
        timeout: this.config.timeout,
        enforceHttps: config.security.enforceHttps,
      }
    );
  }

  /**
   * Make HTTP request with full security validation
   * 
   * @param config Request configuration
   * @returns Promise<ResponseWs<T>> Parsed response
   */
  async request<T = any>(config: Omit<RequestConfig, 'context'>): Promise<ResponseWs<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Create full request config with context
    const fullConfig: RequestConfig = {
      ...config,
      context: {
        requestId,
        retryCount: 0,
        timestamp: startTime
      }
    };

    productionLogger.debug(
      LogCategory.NETWORK,
      'HTTP request started',
      {
        requestId,
        method: config.method,
        url: this.sanitizeUrlForLogging(config.url)
      }
    );

    try {
      // Step 1: Validate domain
      this.validateDomain(config.url);

      // Step 2: Enforce HTTPS in production
      this.enforceHttpsInProduction(config.url);

      // Step 3: Apply interceptor (adds headers, auth, etc.)
      const interceptedConfig = await this.interceptor.intercept(fullConfig);

      // Step 4: Make actual HTTP request
      const response = await this.performHttpRequest<T>(interceptedConfig);

      // Step 5: Apply response interceptor
      const finalResponse = await this.interceptor.interceptResponse(response);

      // Step 6: Parse and validate response
      const parsedResponse = this.parseResponse<T>(finalResponse);

      const duration = Date.now() - startTime;
      
      productionLogger.logNetworkEvent(
        LogLevel.INFO,
        'http_request_completed',
        'HTTP request completed successfully',
        {
          success: parsedResponse.success,
          status: finalResponse.status,
        },
        {
          requestId,
          duration,
          statusCode: finalResponse.status,
          url: config.url,
          method: config.method,
        }
      );

      return parsedResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      productionLogger.logNetworkEvent(
        LogLevel.ERROR,
        'http_request_failed',
        'HTTP request failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        {
          requestId,
          duration,
          url: config.url,
          method: config.method,
        }
      );

      // Convert to BowpiAuthError if needed
      if (error instanceof BowpiAuthError) {
        throw error;
      }

      throw new BowpiAuthError(
        BowpiAuthErrorType.NETWORK_ERROR,
        `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      );
    }
  }

  /**
   * Convenience methods for different HTTP verbs
   */
  async get<T = any>(url: string, headers?: Record<string, string>): Promise<ResponseWs<T>> {
    return this.request<T>({ url, method: 'GET', headers });
  }

  async post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ResponseWs<T>> {
    return this.request<T>({ url, method: 'POST', body, headers });
  }

  async put<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ResponseWs<T>> {
    return this.request<T>({ url, method: 'PUT', body, headers });
  }

  async patch<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ResponseWs<T>> {
    return this.request<T>({ url, method: 'PATCH', body, headers });
  }

  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<ResponseWs<T>> {
    return this.request<T>({ url, method: 'DELETE', headers });
  }

  /**
   * Validate that the domain is in the allowed list
   */
  private validateDomain(url: string): void {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      const isAllowed = ALLOWED_DOMAINS.some(domain => {
        // Exact match or subdomain match
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });

      if (!isAllowed) {
        throw new BowpiAuthError(
          BowpiAuthErrorType.DOMAIN_NOT_ALLOWED,
          `Domain '${hostname}' is not in the allowed domains list`
        );
      }

      if (this.config.enableDebugLogs) {
        console.log('✅ [SECURE_HTTP_CLIENT] Domain validation passed:', hostname);
      }

    } catch (error) {
      if (error instanceof BowpiAuthError) {
        throw error;
      }
      
      throw new BowpiAuthError(
        BowpiAuthErrorType.DOMAIN_NOT_ALLOWED,
        `Invalid URL format: ${url}`
      );
    }
  }

  /**
   * Enforce HTTPS in production environment
   */
  private enforceHttpsInProduction(url: string): void {
    if (!this.config.allowHttp) {
      const urlObj = new URL(url);
      
      if (urlObj.protocol === 'http:') {
        throw new BowpiAuthError(
          BowpiAuthErrorType.HTTPS_REQUIRED,
          'HTTPS is required in production environment'
        );
      }
    }

    if (this.config.enableDebugLogs) {
      const protocol = new URL(url).protocol;
      console.log('✅ [SECURE_HTTP_CLIENT] Protocol validation passed:', protocol);
    }
  }

  /**
   * Determine if response should be cached
   * No caching for non-authentication microservices
   */
  private shouldCache(url: string): boolean {
    // Only cache authentication-related endpoints
    const authEndpoints = ['/auth/login', '/auth/refresh', '/auth/logout'];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Perform the actual HTTP request using fetch
   */
  private async performHttpRequest<T>(config: RequestConfig): Promise<ResponseConfig> {
    const { url, method, headers = {}, body, context } = config;

    // Set up fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Add cache control headers for non-cacheable requests
    if (!this.shouldCache(url)) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Convert fetch Response to our ResponseConfig format
      const responseData = await this.extractResponseData(response);

      return {
        data: responseData,
        status: response.status,
        headers: this.extractHeaders(response.headers),
        config
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BowpiAuthError(
          BowpiAuthErrorType.NETWORK_ERROR,
          `Request timeout after ${this.config.timeout}ms`
        );
      }

      throw new BowpiAuthError(
        BowpiAuthErrorType.NETWORK_ERROR,
        `Network request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error as Error
      );
    }
  }

  /**
   * Extract response data from fetch Response
   */
  private async extractResponseData(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType.includes('text/')) {
        return await response.text();
      } else {
        // For other content types, try to get as text
        return await response.text();
      }
    } catch (error) {
      // If parsing fails, return empty object
      console.warn('Failed to parse response data:', error);
      return {};
    }
  }

  /**
   * Extract headers from fetch Headers object
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const headerObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    return headerObj;
  }

  /**
   * Parse response into ResponseWs format
   */
  private parseResponse<T>(response: ResponseConfig): ResponseWs<T> {
    const { data, status } = response;

    // If response data is already in ResponseWs format, use it
    if (data && typeof data === 'object' && 'success' in data && 'code' in data && 'message' in data) {
      return {
        code: data.code?.toString() || status.toString(),
        message: data.message || 'Success',
        data: data.data,
        success: data.success ?? (status >= 200 && status < 300)
      };
    }

    // Otherwise, create ResponseWs format
    const isSuccess = status >= 200 && status < 300;
    
    return {
      code: status.toString(),
      message: isSuccess ? 'Success' : 'Request failed',
      data: data as T,
      success: isSuccess
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    this.requestIdCounter = (this.requestIdCounter + 1) % 10000;
    return `req_${Date.now()}_${this.requestIdCounter}`;
  }

  /**
   * Sanitize URL for logging (remove sensitive data)
   */
  private sanitizeUrlForLogging(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '[INVALID_URL]';
    }
  }

  /**
   * Get client configuration
   */
  getConfig(): HttpClientConfig {
    return { ...this.config };
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableDebugLogs) {
      console.log('🔍 [SECURE_HTTP_CLIENT] Configuration updated:', this.config);
    }
  }

  /**
   * Get debug information about the client state
   */
  getDebugInfo(): {
    config: HttpClientConfig;
    interceptorState: any;
    requestCount: number;
  } {
    return {
      config: this.config,
      interceptorState: this.interceptor.getInterceptorState(),
      requestCount: this.requestIdCounter
    };
  }
}

// Export singleton instance
export const secureHttpClient = new SecureHttpClient();
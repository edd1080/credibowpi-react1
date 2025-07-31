// BOWPI Authentication Interceptor - Migración de lógica del TokenInterceptor de Angular

import NetInfo from '@react-native-community/netinfo';
import { RequestConfig, ResponseConfig, InterceptorContext } from '../../types/bowpi';
import { BowpiAuthAdapter } from './BowpiAuthAdapter';

export class BowpiAuthenticationInterceptor {
  
  private authAdapter: BowpiAuthAdapter;
  private isRefreshing = false;
  private failedRequestsQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(authAdapter: BowpiAuthAdapter) {
    this.authAdapter = authAdapter;
  }

  /**
   * Intercepta y procesa requests salientes
   * 
   * LÓGICA ESPECÍFICA:
   * 1. Agregar headers base: Authorization, Cache-Control, Pragma, OTPToken
   * 2. Si método es PUT/POST/PATCH → agregar X-Digest
   * 3. Si NO es /login Y existe token → agregar bowpi-auth-token
   * 4. Validar autenticación antes de enviar
   */
  async intercept(config: RequestConfig): Promise<RequestConfig> {
    try {
      const startTime = Date.now();
      
      // Log del request
      console.log('🔍 [BOWPI_INTERCEPTOR] Request start:', {
        requestId: config.context.requestId,
        method: config.method,
        url: this.sanitizeUrl(config.url),
        hasAuth: await this.authAdapter.isAuthenticated()
      });

      // Paso 1: Obtener headers de autenticación BOWPI específicos
      const bowpiHeaders = await this.authAdapter.getAuthHeaders(
        config.url, 
        config.method, 
        config.body
      );

      // Paso 2: Combinar headers existentes con headers BOWPI
      const combinedHeaders = {
        ...config.headers,
        ...bowpiHeaders
      };

      // Paso 3: Validar autenticación para endpoints protegidos
      if (this.isProtectedEndpoint(config.url)) {
        const isAuthenticated = await this.authAdapter.isAuthenticated();
        
        if (!isAuthenticated) {
          throw new Error('Authentication required for protected endpoint');
        }
      }

      // Paso 4: Configurar request final
      const finalConfig: RequestConfig = {
        ...config,
        headers: combinedHeaders
      };

      // Log headers agregados (sin valores sensibles)
      await this.logger.logSecurityEvent('bowpi_headers_added', 'INFO', {
        requestId: config.context.requestId,
        headersCount: Object.keys(bowpiHeaders).length,
        hasOTP: !!bowpiHeaders.OTPToken,
        hasDigest: !!bowpiHeaders['X-Digest'],
        hasAuthToken: !!bowpiHeaders['bowpi-auth-token']
      });

      return finalConfig;

    } catch (error) {
      await this.logger.logSecurityEvent('bowpi_request_error', 'ERROR', {
        requestId: config.context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.sanitizeUrl(config.url)
      });

      throw error;
    }
  }

  /**
   * Intercepta y procesa responses entrantes
   * 
   * LÓGICA ESPECÍFICA:
   * 1. Manejar errores 401/403 → logout automático (con validación internet)
   * 2. Retry automático (1 vez)
   * 3. Renovación automática de token si es necesario
   */
  async interceptResponse(response: ResponseConfig): Promise<ResponseConfig> {
    try {
      // Log de respuesta
      await this.logger.logSecurityEvent('bowpi_response_received', 'INFO', {
        requestId: response.config.context.requestId,
        status: response.status,
        url: this.sanitizeUrl(response.config.url)
      });

      // Verificar si es error de autenticación
      if (this.isAuthenticationError(response.status)) {
        return await this.handleAuthenticationError(response);
      }

      // Verificar si necesita renovación de token
      if (this.shouldRenewToken(response)) {
        await this.handleTokenRenewal();
      }

      return response;

    } catch (error) {
      await this.logger.logSecurityEvent('bowpi_response_error', 'ERROR', {
        requestId: response.config.context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: response.status
      });

      throw error;
    }
  }

  /**
   * Maneja errores de autenticación (401/403)
   */
  private async handleAuthenticationError(response: ResponseConfig): Promise<ResponseConfig> {
    const { status } = response;
    const requestId = response.config.context.requestId;

    await this.logger.logSecurityEvent('bowpi_auth_error', 'WARN', {
      requestId,
      status,
      url: this.sanitizeUrl(response.config.url)
    });

    // Solo hacer logout si hay internet disponible
    const netInfo = await NetInfo.fetch();
    
    if (netInfo.isConnected) {
      
      // Si es 401, intentar renovar token una vez
      if (status === 401 && !this.isRefreshing && response.config.context.retryCount === 0) {
        return await this.handleTokenRefreshAndRetry(response);
      }

      // Si es 401 después de retry o 403, hacer logout
      if (status === 401 || status === 403) {
        await this.handleAutomaticLogout('Authentication failed', requestId);
      }
    } else {
      // Sin internet, mantener sesión pero log del evento
      await this.logger.logSecurityEvent('bowpi_auth_error_offline', 'WARN', {
        requestId,
        status,
        message: 'Authentication error occurred offline, maintaining session'
      });
    }

    return response;
  }

  /**
   * Maneja renovación de token y retry automático
   */
  private async handleTokenRefreshAndRetry(response: ResponseConfig): Promise<ResponseConfig> {
    const requestId = response.config.context.requestId;

    if (this.isRefreshing) {
      // Si ya se está renovando, agregar a la cola
      return new Promise((resolve, reject) => {
        this.failedRequestsQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      await this.logger.logSecurityEvent('bowpi_token_refresh_start', 'INFO', {
        requestId
      });

      // Intentar renovar token
      const refreshSuccess = await this.authAdapter.refreshToken();

      if (refreshSuccess) {
        await this.logger.logSecurityEvent('bowpi_token_refresh_success', 'INFO', {
          requestId
        });

        // Procesar requests en cola
        this.processFailedRequestsQueue(null);

        // Retry del request original con nuevo token
        const retryConfig = {
          ...response.config,
          context: {
            ...response.config.context,
            retryCount: response.config.context.retryCount + 1
          }
        };

        return await this.retryRequest(retryConfig);
      } else {
        await this.logger.logSecurityEvent('bowpi_token_refresh_failed', 'ERROR', {
          requestId
        });

        // Falló la renovación, hacer logout
        await this.handleAutomaticLogout('Token refresh failed', requestId);
        
        const error = new Error('Token refresh failed');
        this.processFailedRequestsQueue(error);
        throw error;
      }

    } catch (error) {
      await this.logger.logSecurityEvent('bowpi_token_refresh_error', 'ERROR', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.processFailedRequestsQueue(error);
      throw error;

    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Procesa la cola de requests fallidos después de renovación
   */
  private processFailedRequestsQueue(error: any): void {
    this.failedRequestsQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(null); // Será manejado por retry automático
      }
    });

    this.failedRequestsQueue = [];
  }

  /**
   * Maneja logout automático
   */
  private async handleAutomaticLogout(reason: string, requestId: string): Promise<void> {
    try {
      await this.logger.logSecurityEvent('bowpi_automatic_logout', 'INFO', {
        requestId,
        reason
      });

      await this.authAdapter.logout();

    } catch (error) {
      await this.logger.logSecurityEvent('bowpi_logout_error', 'ERROR', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Maneja renovación automática de token
   */
  private async handleTokenRenewal(): Promise<void> {
    try {
      // Solo renovar si no se está renovando ya
      if (!this.isRefreshing) {
        const success = await this.authAdapter.refreshToken();
        
        await this.logger.logSecurityEvent('bowpi_background_renewal', 'INFO', {
          success
        });
      }
    } catch (error) {
      await this.logger.logSecurityEvent('bowpi_background_renewal_error', 'ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Realiza retry de un request
   */
  private async retryRequest(config: RequestConfig): Promise<ResponseConfig> {
    // Este método se implementaría conectando con el HTTP Consumer
    // Por ahora retornamos un placeholder
    
    await this.logger.logSecurityEvent('bowpi_request_retry', 'INFO', {
      requestId: config.context.requestId,
      retryCount: config.context.retryCount
    });

    // TODO: Integrar con SecureHttpClient para retry real
    return {
      data: { retried: true },
      status: 200,
      headers: {},
      config
    };
  }

  /**
   * Verifica si es error de autenticación
   */
  private isAuthenticationError(status: number): boolean {
    return status === 401 || status === 403;
  }

  /**
   * Verifica si debería renovar token
   */
  private shouldRenewToken(response: ResponseConfig): boolean {
    // Renovar si el token está próximo a expirar (ej: respuesta exitosa pero con warning)
    return response.status === 200 && 
           response.headers['x-token-expiring'] === 'true';
  }

  /**
   * Verifica si es endpoint protegido
   */
  private isProtectedEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/auth/login', 
      '/register', 
      '/forgot-password', 
      '/health'
    ];
    return !publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Sanitiza URL para logging
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (error) {
      return '[INVALID_URL]';
    }
  }

  /**
   * Obtiene información de estado del interceptor
   */
  public getInterceptorState(): {
    isRefreshing: boolean;
    queueLength: number;
    adapterInfo: any;
  } {
    return {
      isRefreshing: this.isRefreshing,
      queueLength: this.failedRequestsQueue.length,
      adapterInfo: this.authAdapter.getDebugInfo()
    };
  }

  /**
   * Limpia el estado del interceptor
   */
  public reset(): void {
    this.isRefreshing = false;
    this.failedRequestsQueue = [];
  }
}
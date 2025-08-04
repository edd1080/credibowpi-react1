# API Integration Guidelines

## Overview

Esta guía establece los patrones y mejores prácticas para integrar APIs en CrediBowpi Mobile, incluyendo el backend de Bowpi, servicios externos y manejo de conectividad offline-first.

## Table of Contents

1. [Bowpi Backend Integration](#bowpi-backend-integration)
2. [External Services Integration](#external-services-integration)
3. [HTTP Client Configuration](#http-client-configuration)
4. [Authentication Flow](#authentication-flow)
5. [Data Synchronization Patterns](#data-synchronization-patterns)
6. [Error Handling Strategies](#error-handling-strategies)
7. [Offline-First Considerations](#offline-first-considerations)
8. [Security Guidelines](#security-guidelines)
9. [Testing API Integrations](#testing-api-integrations)
10. [Performance Optimization](#performance-optimization)

## Bowpi Backend Integration

### Base Configuration

```typescript
// src/constants/api.ts
export const BOWPI_API_CONFIG = {
  // Base URLs por ambiente
  BASE_URL: {
    development: 'http://10.14.11.200:7161',
    staging: 'https://staging-api.credibowpi.com',
    production: 'https://api.credibowpi.com'
  },
  
  // Timeouts
  TIMEOUT: {
    authentication: 30000,    // 30 segundos para auth
    dataSync: 60000,         // 60 segundos para sync
    fileUpload: 120000,      // 2 minutos para uploads
    default: 15000           // 15 segundos por defecto
  },
  
  // Retry configuration
  RETRY: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  }
};
```

### Authentication Endpoints

```typescript
// Endpoints de autenticación Bowpi
export const BOWPI_AUTH_ENDPOINTS = {
  // Autenticación principal
  LOGIN: '/auth/login',
  LOGOUT: '/management/session/invalidate/request/{requestId}',
  VALIDATE_SESSION: '/auth/validate-session',
  REFRESH_TOKEN: '/auth/refresh',
  
  // Gestión de usuarios
  USER_PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/profile/update',
  CHANGE_PASSWORD: '/user/change-password',
  
  // Configuración
  APP_CONFIG: '/config/mobile-app',
  FEATURE_FLAGS: '/config/feature-flags'
};

// Ejemplo de implementación
class BowpiAuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await httpClient.post(BOWPI_AUTH_ENDPOINTS.LOGIN, {
      username: email,
      password: password,
      application: 'MOBILE',
      isCheckVersion: false
    }, {
      timeout: BOWPI_API_CONFIG.TIMEOUT.authentication,
      headers: await this.getAuthHeaders()
    });

    if (response.success) {
      const decryptedData = BowpiCryptoService.decryptToken(response.data);
      await this.storeSession(decryptedData);
      return { success: true, userData: decryptedData };
    }

    throw new BowpiAuthError(
      BowpiAuthErrorType.INVALID_CREDENTIALS,
      response.message || 'Authentication failed'
    );
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
      'Content-Type': 'application/json',
      'OTPToken': BowpiOTPService.generateOTPToken(),
      'X-App-Version': await getAppVersion(),
      'X-Device-ID': await getDeviceId()
    };
  }
}
```

### Application Data Endpoints

```typescript
export const BOWPI_APPLICATION_ENDPOINTS = {
  // CRUD de solicitudes
  CREATE_APPLICATION: '/applications',
  GET_APPLICATION: '/applications/{id}',
  UPDATE_APPLICATION: '/applications/{id}',
  DELETE_APPLICATION: '/applications/{id}',
  LIST_APPLICATIONS: '/applications/agent/{agentId}',
  
  // Estados y workflow
  SUBMIT_APPLICATION: '/applications/{id}/submit',
  APPROVE_APPLICATION: '/applications/{id}/approve',
  REJECT_APPLICATION: '/applications/{id}/reject',
  GET_APPLICATION_STATUS: '/applications/{id}/status',
  
  // Documentos
  UPLOAD_DOCUMENT: '/applications/{id}/documents',
  GET_DOCUMENT: '/applications/{id}/documents/{documentId}',
  DELETE_DOCUMENT: '/applications/{id}/documents/{documentId}',
  
  // Validaciones
  VALIDATE_DPI: '/validation/dpi',
  VALIDATE_NIT: '/validation/nit',
  CREDIT_BUREAU_CHECK: '/validation/credit-bureau'
};

// Servicio de aplicaciones
class BowpiApplicationService {
  async createApplication(applicationData: ApplicationData): Promise<ApplicationResponse> {
    try {
      const response = await httpClient.post(
        BOWPI_APPLICATION_ENDPOINTS.CREATE_APPLICATION,
        this.sanitizeApplicationData(applicationData),
        {
          timeout: BOWPI_API_CONFIG.TIMEOUT.dataSync,
          headers: await this.getSecureHeaders('POST', applicationData)
        }
      );

      if (response.success) {
        // Actualizar datos locales
        await this.updateLocalApplication(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create application');

    } catch (error) {
      // Manejar error offline-first
      if (this.isNetworkError(error)) {
        await this.queueForOfflineSync('CREATE', applicationData);
        return this.createLocalApplication(applicationData);
      }
      throw error;
    }
  }

  private async getSecureHeaders(method: string, body?: any): Promise<Record<string, string>> {
    const headers = await this.getBaseHeaders();
    
    // Agregar digest para operaciones que modifican estado
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      const { digest } = await BowpiHMACService.generateDigestHmac(body, headers);
      headers['X-Digest'] = digest;
    }

    // Token de sesión
    const sessionToken = await this.getSessionToken();
    if (sessionToken) {
      headers['bowpi-auth-token'] = sessionToken;
    }

    return headers;
  }
}
```

## External Services Integration

### RENAP Integration (DPI Validation)

```typescript
// Integración con RENAP para validación de DPI
export const RENAP_CONFIG = {
  BASE_URL: 'https://api.renap.gob.gt',
  ENDPOINTS: {
    VALIDATE_DPI: '/validation/dpi',
    GET_CITIZEN_DATA: '/citizen/{dpi}'
  },
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 2
};

class RENAPService {
  async validateDPI(dpi: string): Promise<DPIValidationResult> {
    try {
      // Validar formato antes de enviar
      if (!this.isValidDPIFormat(dpi)) {
        throw new ValidationError('Invalid DPI format');
      }

      const response = await httpClient.post(
        `${RENAP_CONFIG.BASE_URL}${RENAP_CONFIG.ENDPOINTS.VALIDATE_DPI}`,
        { dpi: this.formatDPI(dpi) },
        {
          timeout: RENAP_CONFIG.TIMEOUT,
          headers: await this.getRENAPHeaders()
        }
      );

      return {
        isValid: response.success,
        citizenData: response.data,
        validationDate: new Date().toISOString()
      };

    } catch (error) {
      if (this.isNetworkError(error)) {
        // Offline: usar validación local básica
        return this.performOfflineDPIValidation(dpi);
      }
      throw new ValidationError(`DPI validation failed: ${error.message}`);
    }
  }

  private isValidDPIFormat(dpi: string): boolean {
    // DPI guatemalteco: 13 dígitos
    const dpiRegex = /^\d{4}\s?\d{5}\s?\d{4}$/;
    return dpiRegex.test(dpi.replace(/\s/g, ''));
  }

  private formatDPI(dpi: string): string {
    // Remover espacios y formatear
    return dpi.replace(/\s/g, '');
  }

  private async performOfflineDPIValidation(dpi: string): Promise<DPIValidationResult> {
    // Validación offline básica (solo formato)
    return {
      isValid: this.isValidDPIFormat(dpi),
      citizenData: null,
      validationDate: new Date().toISOString(),
      isOfflineValidation: true
    };
  }
}
```

### Credit Bureau Integration

```typescript
// Integración con burós de crédito
export const CREDIT_BUREAU_CONFIG = {
  PROVIDERS: {
    TRANSUNION: {
      baseUrl: 'https://api.transunion.gt',
      timeout: 15000
    },
    EQUIFAX: {
      baseUrl: 'https://api.equifax.gt',
      timeout: 15000
    }
  },
  FALLBACK_ORDER: ['TRANSUNION', 'EQUIFAX'],
  MAX_RETRY_ATTEMPTS: 2
};

class CreditBureauService {
  async checkCreditHistory(
    dpi: string, 
    personalData: PersonalData
  ): Promise<CreditHistoryResult> {
    const providers = CREDIT_BUREAU_CONFIG.FALLBACK_ORDER;
    let lastError: Error | null = null;

    // Intentar con cada proveedor en orden
    for (const provider of providers) {
      try {
        const result = await this.queryProvider(provider, dpi, personalData);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn(`Credit bureau ${provider} failed:`, error);
        lastError = error;
        continue;
      }
    }

    // Si todos fallan, usar datos offline
    if (this.isNetworkError(lastError)) {
      return this.getOfflineCreditAssessment(dpi, personalData);
    }

    throw new CreditBureauError(
      'All credit bureau providers failed',
      lastError
    );
  }

  private async queryProvider(
    provider: string,
    dpi: string,
    personalData: PersonalData
  ): Promise<CreditHistoryResult> {
    const config = CREDIT_BUREAU_CONFIG.PROVIDERS[provider];
    
    const response = await httpClient.post(
      `${config.baseUrl}/credit-check`,
      {
        dpi,
        firstName: personalData.firstName,
        lastName: personalData.lastName,
        dateOfBirth: personalData.dateOfBirth
      },
      {
        timeout: config.timeout,
        headers: await this.getCreditBureauHeaders(provider)
      }
    );

    return {
      success: true,
      provider,
      creditScore: response.data.score,
      riskLevel: response.data.riskLevel,
      history: response.data.history,
      queryDate: new Date().toISOString()
    };
  }

  private getOfflineCreditAssessment(
    dpi: string,
    personalData: PersonalData
  ): CreditHistoryResult {
    // Evaluación offline básica basada en datos locales
    return {
      success: true,
      provider: 'OFFLINE_ASSESSMENT',
      creditScore: null,
      riskLevel: 'UNKNOWN',
      history: [],
      queryDate: new Date().toISOString(),
      isOfflineAssessment: true,
      note: 'Offline assessment - requires online validation'
    };
  }
}
```

## HTTP Client Configuration

### Base HTTP Client Setup

```typescript
// src/services/httpClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-async-storage/async-storage';

class HTTPClient {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];
  private isOnline: boolean = true;

  constructor() {
    this.client = axios.create({
      timeout: BOWPI_API_CONFIG.TIMEOUT.default,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
    this.setupNetworkMonitoring();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Agregar headers de seguridad
        config.headers = {
          ...config.headers,
          'X-Request-ID': this.generateRequestId(),
          'X-Timestamp': Date.now().toString(),
          'X-App-Version': await getAppVersion()
        };

        // Validar conectividad
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new NetworkError('No internet connection');
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => this.handleSuccessResponse(response),
      (error) => this.handleErrorResponse(error)
    );
  }

  private handleSuccessResponse(response: AxiosResponse): AxiosResponse {
    // Log successful requests
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    
    // Procesar respuesta estándar de Bowpi
    if (response.data && typeof response.data === 'object') {
      return {
        ...response,
        data: {
          success: response.data.success ?? true,
          data: response.data.data ?? response.data,
          message: response.data.message
        }
      };
    }

    return response;
  }

  private async handleErrorResponse(error: any): Promise<never> {
    const config = error.config;
    
    // Log error
    console.error(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
      status: error.response?.status,
      message: error.message
    });

    // Retry logic
    if (this.shouldRetry(error)) {
      return this.retryRequest(config);
    }

    // Network error handling
    if (this.isNetworkError(error)) {
      await this.handleNetworkError(config);
      throw new NetworkError('Network request failed', error);
    }

    // Authentication error handling
    if (error.response?.status === 401) {
      await this.handleAuthError();
      throw new AuthenticationError('Authentication failed', error);
    }

    throw error;
  }

  private shouldRetry(error: any): boolean {
    const config = error.config;
    const retryCount = config.__retryCount || 0;
    
    return (
      retryCount < BOWPI_API_CONFIG.RETRY.maxAttempts &&
      (
        this.isNetworkError(error) ||
        error.response?.status >= 500 ||
        error.code === 'ECONNABORTED'
      )
    );
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    config.__retryCount = (config.__retryCount || 0) + 1;
    
    const delay = BOWPI_API_CONFIG.RETRY.initialDelay * 
                  Math.pow(BOWPI_API_CONFIG.RETRY.backoffMultiplier, config.__retryCount - 1);
    
    await this.sleep(delay);
    
    console.log(`🔄 Retrying request (${config.__retryCount}/${BOWPI_API_CONFIG.RETRY.maxAttempts}): ${config.url}`);
    
    return this.client.request(config);
  }

  // Public methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isNetworkError(error: any): boolean {
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('Network request failed') ||
      error.code === 'ECONNABORTED'
    );
  }
}

// Singleton instance
export const httpClient = new HTTPClient();
```

## Authentication Flow

### Complete Authentication Flow

```typescript
// Flujo completo de autenticación
class AuthenticationFlow {
  async performLogin(email: string, password: string): Promise<AuthResult> {
    try {
      // 1. Validar conectividad
      await this.validateNetworkConnectivity();
      
      // 2. Validar credenciales localmente
      this.validateCredentials(email, password);
      
      // 3. Preparar request de autenticación
      const authRequest = await this.prepareAuthRequest(email, password);
      
      // 4. Enviar request al servidor
      const response = await this.sendAuthRequest(authRequest);
      
      // 5. Procesar respuesta
      const authData = await this.processAuthResponse(response);
      
      // 6. Almacenar sesión
      await this.storeAuthSession(authData);
      
      // 7. Configurar cliente HTTP con token
      await this.configureAuthenticatedClient(authData);
      
      return {
        success: true,
        userData: authData,
        sessionId: authData.sessionId
      };
      
    } catch (error) {
      await this.handleAuthError(error);
      throw error;
    }
  }

  private async validateNetworkConnectivity(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new BowpiAuthError(
        BowpiAuthErrorType.OFFLINE_LOGIN_ATTEMPT,
        'Authentication requires internet connection'
      );
    }
  }

  private async prepareAuthRequest(email: string, password: string): Promise<AuthRequest> {
    return {
      username: email,
      password: password,
      application: 'MOBILE',
      isCheckVersion: false,
      deviceInfo: await this.getDeviceInfo(),
      timestamp: Date.now()
    };
  }

  private async sendAuthRequest(request: AuthRequest): Promise<AuthResponse> {
    const headers = await this.getAuthHeaders();
    
    return httpClient.post(BOWPI_AUTH_ENDPOINTS.LOGIN, request, {
      timeout: BOWPI_API_CONFIG.TIMEOUT.authentication,
      headers
    });
  }

  private async processAuthResponse(response: AuthResponse): Promise<AuthTokenData> {
    if (!response.success) {
      throw new BowpiAuthError(
        BowpiAuthErrorType.INVALID_CREDENTIALS,
        response.message || 'Authentication failed'
      );
    }

    // Desencriptar token
    const decryptedData = BowpiCryptoService.decryptToken(response.data);
    
    // Validar estructura del token
    this.validateTokenStructure(decryptedData);
    
    return decryptedData;
  }

  private async configureAuthenticatedClient(authData: AuthTokenData): Promise<void> {
    // Configurar headers de autenticación para requests futuros
    httpClient.setDefaultHeader('bowpi-auth-token', authData.sessionToken);
    httpClient.setDefaultHeader('X-User-ID', authData.userId);
  }
}
```

## Data Synchronization Patterns

### Offline-First Sync Strategy

```typescript
// Estrategia de sincronización offline-first
class DataSyncManager {
  private syncQueue: SyncOperation[] = [];
  private syncInProgress: boolean = false;

  async queueOperation(operation: SyncOperationRequest): Promise<void> {
    const syncOp: SyncOperation = {
      id: this.generateOperationId(),
      type: operation.type,
      entity: operation.entity,
      data: operation.data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
      priority: operation.priority || 'NORMAL'
    };

    this.syncQueue.push(syncOp);
    await this.persistSyncQueue();

    // Intentar sincronización inmediata si hay conexión
    if (await this.isOnline()) {
      this.startSync();
    }
  }

  async startSync(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      // Ordenar por prioridad y timestamp
      const pendingOps = this.syncQueue
        .filter(op => op.status === 'PENDING' || op.status === 'FAILED')
        .sort((a, b) => {
          // Prioridad primero
          const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // Luego timestamp
          return a.timestamp - b.timestamp;
        });

      for (const operation of pendingOps) {
        await this.syncOperation(operation);
      }

      // Limpiar operaciones completadas
      this.syncQueue = this.syncQueue.filter(op => op.status !== 'COMPLETED');
      await this.persistSyncQueue();

    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    try {
      operation.status = 'IN_PROGRESS';
      
      let result;
      switch (operation.type) {
        case 'CREATE':
          result = await this.syncCreate(operation);
          break;
        case 'UPDATE':
          result = await this.syncUpdate(operation);
          break;
        case 'DELETE':
          result = await this.syncDelete(operation);
          break;
        case 'UPLOAD':
          result = await this.syncUpload(operation);
          break;
      }

      if (result.success) {
        operation.status = 'COMPLETED';
        operation.serverResponse = result.data;
        
        // Actualizar datos locales con respuesta del servidor
        await this.updateLocalData(operation.entity, result.data);
      } else {
        throw new Error(result.message || 'Sync operation failed');
      }

    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount >= 3) {
        operation.status = 'FAILED';
        operation.error = error.message;
        console.error(`Sync failed permanently for operation ${operation.id}:`, error);
      } else {
        operation.status = 'PENDING';
        console.warn(`Sync failed for operation ${operation.id}, will retry:`, error);
      }
    }
  }

  private async syncCreate(operation: SyncOperation): Promise<SyncResult> {
    const endpoint = this.getEndpointForEntity(operation.entity, 'CREATE');
    return httpClient.post(endpoint, operation.data);
  }

  private async syncUpdate(operation: SyncOperation): Promise<SyncResult> {
    const endpoint = this.getEndpointForEntity(operation.entity, 'UPDATE', operation.data.id);
    return httpClient.put(endpoint, operation.data);
  }

  private async syncUpload(operation: SyncOperation): Promise<SyncResult> {
    const endpoint = this.getEndpointForEntity(operation.entity, 'UPLOAD');
    const formData = this.createFormData(operation.data);
    
    return httpClient.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: BOWPI_API_CONFIG.TIMEOUT.fileUpload
    });
  }
}
```

## Error Handling Strategies

### Comprehensive Error Handling

```typescript
// Manejo integral de errores de API
class APIErrorHandler {
  static handleError(error: any, context: string): never {
    // Log error for debugging
    console.error(`API Error in ${context}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });

    // Categorizar y manejar error
    if (this.isNetworkError(error)) {
      throw new NetworkError(
        'Network connection failed',
        error,
        context
      );
    }

    if (this.isAuthenticationError(error)) {
      throw new AuthenticationError(
        'Authentication failed',
        error,
        context
      );
    }

    if (this.isValidationError(error)) {
      throw new ValidationError(
        this.extractValidationMessage(error),
        error,
        context
      );
    }

    if (this.isServerError(error)) {
      throw new ServerError(
        'Server error occurred',
        error,
        context
      );
    }

    // Error genérico
    throw new APIError(
      error.message || 'Unknown API error',
      error,
      context
    );
  }

  static isNetworkError(error: any): boolean {
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('Network request failed') ||
      error.code === 'ECONNABORTED'
    );
  }

  static isAuthenticationError(error: any): boolean {
    return error.response?.status === 401 || error.response?.status === 403;
  }

  static isValidationError(error: any): boolean {
    return error.response?.status === 400 || error.response?.status === 422;
  }

  static isServerError(error: any): boolean {
    return error.response?.status >= 500;
  }

  static extractValidationMessage(error: any): string {
    const data = error.response?.data;
    
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map(err => err.message).join(', ');
    }
    
    if (data?.message) {
      return data.message;
    }
    
    return 'Validation error occurred';
  }
}

// Custom error classes
export class APIError extends Error {
  constructor(
    message: string,
    public originalError: any,
    public context: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string, originalError: any, context: string) {
    super(message, originalError, context);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, originalError: any, context: string) {
    super(message, originalError, context);
    this.name = 'AuthenticationError';
  }
}
```

## Security Guidelines

### API Security Best Practices

```typescript
// Mejores prácticas de seguridad para APIs
class APISecurityManager {
  // Generar headers seguros
  static async generateSecureHeaders(
    method: string,
    body?: any
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      // Headers básicos
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      
      // Headers de seguridad
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      
      // Headers de aplicación
      'X-App-Version': await getAppVersion(),
      'X-Device-ID': await getDeviceId(),
      'X-Request-ID': this.generateRequestId(),
      'X-Timestamp': Date.now().toString(),
      
      // Autenticación básica
      'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
      
      // Token OTP
      'OTPToken': BowpiOTPService.generateOTPToken()
    };

    // Agregar digest para operaciones que modifican estado
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
      const { digest } = await BowpiHMACService.generateDigestHmac(body, headers);
      headers['X-Digest'] = digest;
    }

    // Token de sesión si está autenticado
    const sessionToken = await this.getSessionToken();
    if (sessionToken) {
      headers['bowpi-auth-token'] = sessionToken;
    }

    return headers;
  }

  // Validar respuesta del servidor
  static validateServerResponse(response: any): void {
    // Validar estructura básica
    if (!response || typeof response !== 'object') {
      throw new SecurityError('Invalid server response structure');
    }

    // Validar headers de seguridad
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];

    for (const header of securityHeaders) {
      if (!response.headers?.[header]) {
        console.warn(`Missing security header: ${header}`);
      }
    }

    // Validar contenido
    if (response.data && typeof response.data === 'string') {
      // Verificar que no contenga scripts maliciosos
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(response.data)) {
          throw new SecurityError('Potentially malicious content detected');
        }
      }
    }
  }

  // Sanitizar datos antes de enviar
  static sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Sanitizar strings
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursivo para objetos anidados
        sanitized[key] = this.sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static sanitizeString(str: string): string {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
```

## Testing API Integrations

### API Testing Patterns

```typescript
// Patrones de testing para integraciones de API
describe('API Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: 'encrypted_token_data'
      };

      httpClient.post = jest.fn().mockResolvedValue(mockResponse);
      BowpiCryptoService.decryptToken = jest.fn().mockReturnValue(mockUserData);

      const result = await authService.login('test@test.com', 'password');

      expect(result.success).toBe(true);
      expect(result.userData).toEqual(mockUserData);
      expect(httpClient.post).toHaveBeenCalledWith(
        BOWPI_AUTH_ENDPOINTS.LOGIN,
        expect.objectContaining({
          username: 'test@test.com',
          password: 'password'
        }),
        expect.any(Object)
      );
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      networkError.code = 'NETWORK_ERROR';

      httpClient.post = jest.fn().mockRejectedValue(networkError);

      await expect(authService.login('test@test.com', 'password'))
        .rejects.toThrow(BowpiAuthError);
    });
  });

  describe('Data Synchronization', () => {
    it('should queue operations when offline', async () => {
      NetInfo.fetch = jest.fn().mockResolvedValue({ isConnected: false });

      const applicationData = { name: 'Test Application' };
      await syncManager.queueOperation({
        type: 'CREATE',
        entity: 'APPLICATION',
        data: applicationData
      });

      const queue = await syncManager.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].data).toEqual(applicationData);
    });

    it('should sync queued operations when online', async () => {
      NetInfo.fetch = jest.fn().mockResolvedValue({ isConnected: true });
      httpClient.post = jest.fn().mockResolvedValue({ success: true });

      await syncManager.startSync();

      expect(httpClient.post).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should retry failed requests', async () => {
      let callCount = 0;
      httpClient.get = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Server error');
        }
        return Promise.resolve({ success: true });
      });

      const result = await apiService.getData();
      
      expect(callCount).toBe(3);
      expect(result.success).toBe(true);
    });
  });
});

// Mock setup for testing
export const setupAPIMocks = () => {
  // Mock NetInfo
  jest.mock('@react-native-async-storage/async-storage', () => ({
    fetch: jest.fn().mockResolvedValue({ isConnected: true })
  }));

  // Mock HTTP client
  jest.mock('../services/httpClient', () => ({
    httpClient: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }
  }));

  // Mock crypto services
  jest.mock('../services/BowpiCryptoService', () => ({
    BowpiCryptoService: {
      decryptToken: jest.fn(),
      encryptData: jest.fn()
    }
  }));
};
```

## Performance Optimization

### API Performance Best Practices

```typescript
// Optimizaciones de rendimiento para APIs
class APIPerformanceOptimizer {
  private requestCache = new Map<string, CachedResponse>();
  private requestDeduplication = new Map<string, Promise<any>>();

  // Cache de respuestas
  async getCachedResponse<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000 // 5 minutos por defecto
  ): Promise<T> {
    const cached = this.requestCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`📦 Cache hit for ${key}`);
      return cached.data;
    }

    console.log(`🌐 Cache miss for ${key}, fetching...`);
    const data = await fetcher();
    
    this.requestCache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  // Deduplicación de requests
  async deduplicateRequest<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    if (this.requestDeduplication.has(key)) {
      console.log(`🔄 Deduplicating request for ${key}`);
      return this.requestDeduplication.get(key)!;
    }

    const promise = fetcher().finally(() => {
      this.requestDeduplication.delete(key);
    });

    this.requestDeduplication.set(key, promise);
    return promise;
  }

  // Batch requests
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => request())
      );
      results.push(...batchResults);
      
      // Pequeña pausa entre batches para no sobrecargar el servidor
      if (i + batchSize < requests.length) {
        await this.sleep(100);
      }
    }
    
    return results;
  }

  // Compresión de datos
  compressRequestData(data: any): any {
    if (typeof data === 'string' && data.length > 1000) {
      // Comprimir strings largos
      return {
        compressed: true,
        data: this.compress(data)
      };
    }
    return data;
  }

  private compress(data: string): string {
    // Implementar compresión (ejemplo simplificado)
    return data; // En producción usar una librería de compresión
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const apiPerformanceOptimizer = new APIPerformanceOptimizer();
```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi
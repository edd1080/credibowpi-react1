// BOWPI Authentication Adapter - Implementación principal del adaptador BOWPI

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {
  AuthenticationAdapter,
  AuthTokenData,
  BowpiLoginResponse,
  BowpiRequestHeaders,
  BOWPI_CONSTANTS,
  BOWPI_STORAGE_KEYS,
  BOWPI_BASE_HEADERS,
  PUBLIC_ENDPOINTS,
  BOWPI_ENDPOINTS
} from '../types/bowpi';

import { BowpiOTPService } from './BowpiOTPService';
import { BowpiHMACService } from './BowpiHMACService';
import { BowpiCryptoService } from './BowpiCryptoService';

export class BowpiAuthAdapter implements AuthenticationAdapter {
  
  // Constantes específicas BOWPI (NO MODIFICABLES)
  private readonly BASIC_AUTH = BOWPI_CONSTANTS.BASIC_AUTH;
  private readonly SECRET_KEY_HMAC = BOWPI_CONSTANTS.SECRET_KEY_HMAC;
  private readonly ENCRYPTION_KEY = BOWPI_CONSTANTS.ENCRYPTION_KEY;
  private readonly ENCRYPTION_IV = BOWPI_CONSTANTS.ENCRYPTION_IV;
  private readonly APPLICATION_TYPE = BOWPI_CONSTANTS.APPLICATION_TYPE;
  
  // Servicios específicos BOWPI
  private otpService: BowpiOTPService;
  private hmacService: BowpiHMACService;
  private cryptoService: BowpiCryptoService;
  
  // Cache de sesión actual
  private currentTokenData: AuthTokenData | null = null;
  private currentEncryptedToken: string | null = null;

  constructor() {
    this.otpService = new BowpiOTPService();
    this.hmacService = new BowpiHMACService();
    this.cryptoService = new BowpiCryptoService();
    
    // Cargar sesión existente al inicializar
    this.loadExistingSession();
  }

  /**
   * Realiza login con credenciales BOWPI
   * 
   * @param email Email del usuario
   * @param password Contraseña del usuario
   * @returns Respuesta de login del servidor
   */
  async login(email: string, password: string): Promise<BowpiLoginResponse> {
    try {
      // Construir body de login
      const loginBody = {
        username: email.trim(),
        password: password,
        application: this.APPLICATION_TYPE
      };
      
      // Usar el sistema estándar de headers (incluye X-Date y X-Digest para POST)
      const headers = await this.getAuthHeaders(BOWPI_ENDPOINTS.LOGIN, 'POST', loginBody);
      
      // Realizar petición de login (esto se conectará con el HTTP Consumer)
      const response = await this.performLoginRequest(headers, loginBody);
      
      if (response.success && response.data) {
        // Procesar respuesta exitosa de login
        await this.processSuccessfulLogin(response.data);
      }
      
      return response;
      
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Invalida la sesión en el servidor (fire-and-forget)
   */
  async invalidateSession(): Promise<void> {
    try {
      const sessionId = await this.getCurrentSessionId();
      if (!sessionId) {
        console.log('🔍 [BOWPI_AUTH] No session ID found for invalidation');
        return;
      }

      console.log('🔍 [BOWPI_AUTH] Invalidating session:', sessionId);
      
      // Construir URL del endpoint de invalidación
      const invalidateUrl = `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${BOWPI_ENDPOINTS.INVALIDATE_SESSION}/${sessionId}`;
      
      // Obtener headers necesarios para la invalidación
      const headers = await this.getAuthHeaders(BOWPI_ENDPOINTS.INVALIDATE_SESSION, 'GET');
      
      // Agregar token de autenticación en header
      if (this.currentEncryptedToken) {
        headers['bowpi-auth-token'] = this.currentEncryptedToken;
      }
      
      console.log('🔍 [BOWPI_AUTH] Calling invalidate endpoint (fire-and-forget)');
      
      // Fire-and-forget: no esperamos respuesta
      fetch(invalidateUrl, {
        method: 'GET',
        headers: headers,
      }).catch(error => {
        console.log('🔍 [BOWPI_AUTH] Session invalidation failed (ignored):', error.message);
      });
      
      console.log('✅ [BOWPI_AUTH] Session invalidation request sent');
      
    } catch (error) {
      console.log('❌ [BOWPI_AUTH] Error during session invalidation (ignored):', error);
    }
  }

  /**
   * Realiza logout y limpia datos de sesión
   */
  async logout(): Promise<void> {
    try {
      console.log('🔍 [BOWPI_AUTH] Starting logout process...');
      
      // Verificar conexión antes de logout
      const netInfo = await NetInfo.fetch();
      console.log('🔍 [BOWPI_AUTH] Network connected:', netInfo.isConnected);
      
      if (netInfo.isConnected) {
        // Solo realizar invalidación en servidor si hay conexión (fire-and-forget)
        console.log('🔍 [BOWPI_AUTH] Network available, invalidating session...');
        this.invalidateSession(); // No await - fire-and-forget
      } else {
        console.log('🔍 [BOWPI_AUTH] No network, skipping server invalidation');
      }
      
      // Limpiar datos locales inmediatamente
      console.log('🔍 [BOWPI_AUTH] Clearing local session...');
      await this.clearLocalSession();
      
      console.log('✅ [BOWPI_AUTH] Logout completed successfully');
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Logout error:', error);
      throw new Error('Logout failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Obtiene headers de autenticación para una petición específica
   * 
   * @param url URL de la petición
   * @param method Método HTTP
   * @param body Body de la petición
   * @returns Headers de autenticación completos
   */
  async getAuthHeaders(url: string, method: string, body?: any): Promise<Record<string, string>> {
    try {
      // Headers base que siempre se incluyen
      const headers: Record<string, string> = {
        'Authorization': this.BASIC_AUTH,
        'Cache-Control': BOWPI_BASE_HEADERS['Cache-Control'],
        'Pragma': BOWPI_BASE_HEADERS['Pragma'],
        'OTPToken': this.otpService.generateOTPToken()
      };
      
      // Agregar HMAC si es método que lo requiere
      if (this.hmacService.shouldGenerateHMAC(method)) {
        const headersForHMAC = { ...headers };
        const digest = await this.hmacService.generateDigestHmac(body, headersForHMAC);
        
        headers['X-Digest'] = digest;
        headers['Content-Type'] = 'application/json';
        headers['X-Date'] = headersForHMAC['X-Date']!;
      }
      
      // Agregar token de autenticación si hay sesión y NO es endpoint público
      if (await this.isAuthenticated() && !this.isPublicEndpoint(url)) {
        headers['bowpi-auth-token'] = this.currentEncryptedToken!;
      }
      
      return headers;
      
    } catch (error) {
      console.error('Error generating auth headers:', error);
      // Retornar headers básicos en caso de error
      return {
        'Authorization': this.BASIC_AUTH,
        'Cache-Control': BOWPI_BASE_HEADERS['Cache-Control'],
        'Pragma': BOWPI_BASE_HEADERS['Pragma'],
        'OTPToken': this.otpService.generateOTPToken()
      };
    }
  }

  /**
   * Refresca el token de autenticación
   */
  async refreshToken(): Promise<boolean> {
    try {
      // Solo refrescar si hay conexión y sesión válida
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !this.currentEncryptedToken) {
        return false;
      }
      
      // Construir headers para refresh
      const headers = await this.getAuthHeaders('/auth/refresh', 'POST');
      
      // Realizar petición de refresh
      const response = await this.performRefreshRequest(headers);
      
      if (response.success && response.data) {
        await this.processSuccessfulLogin(response.data);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    console.log('🔍 [BOWPI_AUTH] isAuthenticated() called');
    try {
      // Verificar si hay token en cache
      console.log('🔍 [BOWPI_AUTH] Checking cached tokens...');
      console.log('🔍 [BOWPI_AUTH] Has currentTokenData:', !!this.currentTokenData);
      console.log('🔍 [BOWPI_AUTH] Has currentEncryptedToken:', !!this.currentEncryptedToken);
      
      if (this.currentTokenData && this.currentEncryptedToken) {
        // Verificar si el token no ha expirado
        const now = Date.now() / 1000; // JWT exp está en segundos
        const isValid = this.currentTokenData.exp > now;
        console.log('🔍 [BOWPI_AUTH] Token expiration check:', { 
          now, 
          exp: this.currentTokenData.exp, 
          isValid 
        });
        if (isValid) {
          console.log('✅ [BOWPI_AUTH] Cached token is valid');
          return true;
        } else {
          console.log('❌ [BOWPI_AUTH] Cached token expired');
        }
      }
      
      // Intentar cargar desde storage
      console.log('🔍 [BOWPI_AUTH] Loading session from storage...');
      await this.loadExistingSession();
      
      console.log('🔍 [BOWPI_AUTH] After loading from storage:');
      console.log('🔍 [BOWPI_AUTH] Has currentTokenData:', !!this.currentTokenData);
      console.log('🔍 [BOWPI_AUTH] Has currentEncryptedToken:', !!this.currentEncryptedToken);
      
      if (this.currentTokenData && this.currentEncryptedToken) {
        const now = Date.now() / 1000;
        const isValid = this.currentTokenData.exp > now;
        console.log('🔍 [BOWPI_AUTH] Storage token expiration check:', { 
          now, 
          exp: this.currentTokenData.exp, 
          isValid 
        });
        if (isValid) {
          console.log('✅ [BOWPI_AUTH] Storage token is valid');
          return true;
        } else {
          console.log('❌ [BOWPI_AUTH] Storage token expired');
        }
      }
      
      console.log('❌ [BOWPI_AUTH] No valid authentication found');
      return false;
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Obtiene datos del usuario actual
   */
  async getCurrentUser(): Promise<AuthTokenData | null> {
    console.log('🔍 [BOWPI_AUTH] getCurrentUser() called');
    try {
      console.log('🔍 [BOWPI_AUTH] Checking if authenticated...');
      const isAuth = await this.isAuthenticated();
      console.log('🔍 [BOWPI_AUTH] isAuthenticated result:', isAuth);
      
      if (isAuth) {
        console.log('✅ [BOWPI_AUTH] User is authenticated, returning token data');
        console.log('🔍 [BOWPI_AUTH] Token data:', this.currentTokenData ? {
          userId: this.currentTokenData.userId,
          username: this.currentTokenData.username,
          email: this.currentTokenData.email,
          exp: this.currentTokenData.exp
        } : null);
        return this.currentTokenData;
      }
      
      console.log('❌ [BOWPI_AUTH] User not authenticated, returning null');
      return null;
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Obtiene el ID de sesión actual (requestId)
   */
  async getCurrentSessionId(): Promise<string | null> {
    try {
      const sessionId = await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_ID);
      return sessionId;
    } catch (error) {
      console.error('Error getting session ID:', error);
      return null;
    }
  }

  /**
   * Carga sesión existente desde AsyncStorage
   */
  private async loadExistingSession(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH] loadExistingSession() called');
    try {
      console.log('🔍 [BOWPI_AUTH] Reading from AsyncStorage...');
      const [encryptedToken, sessionDataJson] = await Promise.all([
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA)
      ]);
      
      console.log('🔍 [BOWPI_AUTH] Storage data found:');
      console.log('🔍 [BOWPI_AUTH] Has encryptedToken:', !!encryptedToken);
      console.log('🔍 [BOWPI_AUTH] Has sessionDataJson:', !!sessionDataJson);
      
      if (encryptedToken && sessionDataJson) {
        console.log('🔍 [BOWPI_AUTH] Parsing session data...');
        const sessionData = JSON.parse(sessionDataJson);
        
        this.currentEncryptedToken = encryptedToken;
        this.currentTokenData = sessionData.decryptedToken;
        
        console.log('✅ [BOWPI_AUTH] Existing session loaded successfully');
        console.log('🔍 [BOWPI_AUTH] Session details:', {
          userId: sessionData.decryptedToken?.userId,
          username: sessionData.decryptedToken?.username,
          email: sessionData.decryptedToken?.email,
          exp: sessionData.decryptedToken?.exp,
          sessionId: sessionData.sessionId
        });
      } else {
        console.log('❌ [BOWPI_AUTH] No existing session found in storage');
      }
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error loading existing session:', error);
      // Limpiar datos corruptos
      console.log('🔍 [BOWPI_AUTH] Clearing corrupted session data...');
      await this.clearLocalSession();
    }
  }

  /**
   * Procesa respuesta exitosa de login
   */
  private async processSuccessfulLogin(encryptedToken: string): Promise<void> {
    try {
      // Paso 1: Guardar token encriptado
      await AsyncStorage.setItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN, encryptedToken);
      
      // Paso 2: Desencriptar y decodificar token
      const decryptedTokenData = this.cryptoService.decryptToken(encryptedToken);
      
      // Paso 3: Guardar datos de sesión desencriptados con requestId como identificador
      const sessionData = {
        decryptedToken: decryptedTokenData,
        lastRenewalDate: Date.now(),
        userId: decryptedTokenData.userId,
        userProfile: decryptedTokenData.userProfile,
        sessionId: decryptedTokenData.userProfile?.requestId || decryptedTokenData.userId, // requestId es el identificador principal
        expirationTime: decryptedTokenData.exp * 1000 // Convertir a milisegundos
      };
      
      await Promise.all([
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData)),
        AsyncStorage.setItem(BOWPI_STORAGE_KEYS.SESSION_ID, decryptedTokenData.userProfile?.requestId || decryptedTokenData.userId || 'unknown-session')
      ]);
      
      // Paso 4: Actualizar cache
      this.currentEncryptedToken = encryptedToken;
      this.currentTokenData = decryptedTokenData;
      
      console.log('Login processed successfully');
      
    } catch (error) {
      console.error('Error processing successful login:', error);
      throw new Error('Failed to process login response');
    }
  }

  /**
   * Limpia datos de sesión local
   */
  private async clearLocalSession(): Promise<void> {
    try {
      console.log('🔍 [BOWPI_AUTH] Clearing all local session data...');
      
      // Limpiar todas las claves de AsyncStorage relacionadas con BOWPI
      await Promise.all([
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.SESSION_DATA),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.SESSION_ID),
        AsyncStorage.removeItem(BOWPI_STORAGE_KEYS.OFFLINE_QUEUE)
      ]);
      
      // Limpiar variables en memoria
      this.currentEncryptedToken = null;
      this.currentTokenData = null;
      
      console.log('✅ [BOWPI_AUTH] Local session cleared successfully');
      console.log('🔍 [BOWPI_AUTH] Cleared keys:', Object.values(BOWPI_STORAGE_KEYS));
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH] Error clearing local session:', error);
      
      // Intentar limpiar individualmente si falla en lote
      for (const key of Object.values(BOWPI_STORAGE_KEYS)) {
        try {
          await AsyncStorage.removeItem(key);
          console.log('✅ [BOWPI_AUTH] Individually cleared:', key);
        } catch (individualError) {
          console.error('❌ [BOWPI_AUTH] Failed to clear:', key, individualError);
        }
      }
      
      // Limpiar variables en memoria de todas formas
      this.currentEncryptedToken = null;
      this.currentTokenData = null;
    }
  }


  /**
   * Verifica si una URL es endpoint público
   */
  private isPublicEndpoint(url: string): boolean {
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  /**
   * Placeholder para petición de login
   * Se conectará con el HTTP Consumer en la integración
   */
  private async performLoginRequest(
    headers: Record<string, string>, 
    body: any
  ): Promise<BowpiLoginResponse> {
    try {
      // Construir URL completa del servicio
      const fullUrl = this.buildServiceUrl(BOWPI_ENDPOINTS.LOGIN);
      
      console.log(`Making login request to: ${fullUrl}`);
      console.log('Headers:', headers);
      console.log('Body:', body);
      
      // Realizar request HTTP
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      return {
        message: responseData.message || 'Login successful',
        success: responseData.success || response.ok,
        data: responseData.data || responseData.token,
        code: response.status
      };
      
    } catch (error) {
      console.error('Login request failed:', error);
      
      return {
        message: error instanceof Error ? error.message : 'Login failed',
        success: false,
        data: '',
        code: 500
      };
    }
  }

  /**
   * Petición de logout al servidor BOWPI
   */
  private async performLogoutRequest(): Promise<void> {
    try {
      // Construir URL completa del servicio
      const fullUrl = this.buildServiceUrl(BOWPI_ENDPOINTS.LOGOUT);
      
      // Generar headers de autenticación
      const headers = await this.getAuthHeaders(BOWPI_ENDPOINTS.LOGOUT, 'POST');
      
      console.log(`Making logout request to: ${fullUrl}`);
      console.log('Headers:', headers);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`Logout request failed with status: ${response.status}`);
      } else {
        console.log('Logout request successful');
      }
      
    } catch (error) {
      console.error('Logout request failed:', error);
      // No re-lanzar error para permitir logout local
    }
  }

  /**
   * Placeholder para petición de refresh token
   */
  private async performRefreshRequest(headers: Record<string, string>): Promise<BowpiLoginResponse> {
    // TODO: Integrar con SecureHttpClient
    console.log('Refresh request would be made with:', headers);
    
    return {
      message: 'Token refreshed',
      success: false,
      data: '',
      code: 401
    };
  }

  /**
   * Construye URL completa del servicio BOWPI
   */
  private buildServiceUrl(endpoint: string): string {
    return `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${endpoint}`;
  }

  /**
   * Obtiene información de debugging del adaptador
   */
  public getDebugInfo(): {
    hasEncryptedToken: boolean;
    hasTokenData: boolean;
    tokenExpiration?: number;
    userId?: string;
    isExpired?: boolean;
    serviceUrls?: {
      login: string;
      logout: string;
      base: string;
      prefix: string;
    };
  } {
    const now = Date.now() / 1000;
    
    return {
      hasEncryptedToken: !!this.currentEncryptedToken,
      hasTokenData: !!this.currentTokenData,
      tokenExpiration: this.currentTokenData?.exp,
      userId: this.currentTokenData?.userId,
      isExpired: this.currentTokenData ? this.currentTokenData.exp < now : undefined,
      
      // URLs del servicio para debugging
      serviceUrls: {
        login: this.buildServiceUrl(BOWPI_ENDPOINTS.LOGIN),
        logout: this.buildServiceUrl(BOWPI_ENDPOINTS.LOGOUT),
        base: BOWPI_CONSTANTS.BASE_HOST,
        prefix: BOWPI_CONSTANTS.SERVICE_PREFIX
      }
    };
  }
}
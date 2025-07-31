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
} from '../../types/bowpi';

import { BowpiOTPService } from './BowpiOTPService';
import { BowpiHMACService } from './BowpiHMACService';
import { BowpiCryptoService } from './BowpiCryptoService';
import { secureHttpClient } from '../SecureHttpClient';
import { sessionManager } from '../SessionManagementService';
import { bowpiSecureStorage } from '../BowpiSecureStorageService';
import DataValidationService from '../DataValidationService';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '../SecurityLoggingService';
import { suspiciousActivityMonitor } from '../SuspiciousActivityMonitor';

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
  private currentSessionId: string | null = null;

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
    console.log(`🔍 [BOWPI_AUTH_ADAPTER] Login attempt for user: ${email}`);
    try {
      // Construir el cuerpo de la petición según especificaciones
      const loginBody = {
        username: email,
        password: password,
        application: BOWPI_CONSTANTS.APPLICATION_TYPE,
        isCheckVersion: false
      };
      console.log(`🔍 [BOWPI_AUTH_ADAPTER] Login body prepared:`, {
        username: email,
        application: loginBody.application,
        isCheckVersion: loginBody.isCheckVersion
      });

      // Construir URL completa
      const fullUrl = `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${BOWPI_ENDPOINTS.LOGIN}`;
      console.log(`🔍 [BOWPI_AUTH_ADAPTER] Making login request to: ${fullUrl}`);

      // Usar el sistema estándar de headers (incluye X-Date y X-Digest para POST)
      const headers = await this.getAuthHeaders(BOWPI_ENDPOINTS.LOGIN, 'POST', loginBody);
      console.log(`🔍 [BOWPI_AUTH_ADAPTER] Headers generated for login request`);

      // Realizar petición de login usando SecureHttpClient
      const httpClient = await import('../SecureHttpClient').then(m => m.secureHttpClient);
      const response = await httpClient.request<string>({
        url: fullUrl,
        method: 'POST',
        headers,
        body: loginBody
      });

      console.log(`🔍 [BOWPI_AUTH_ADAPTER] Login response received:`, {
        success: response.success,
        code: response.code,
        hasData: !!response.data
      });

      if (response.success && response.data) {
        // Almacenar el token encriptado
        this.currentEncryptedToken = response.data;
        
        // Desencriptar y almacenar datos del usuario
        const decryptedData = this.cryptoService.decryptToken(response.data);
        this.currentTokenData = decryptedData;
        this.currentSessionId = decryptedData.userProfile.requestId;
        
        // Almacenar en AsyncStorage para persistencia
        await this.storeSessionData(response.data, decryptedData);

        console.log(`✅ [BOWPI_AUTH_ADAPTER] Login successful for user: ${email}`);
        console.log(`🔍 [BOWPI_AUTH_ADAPTER] Session ID: ${this.currentSessionId}`);

        return {
          success: true,
          code: response.code,
          message: response.message,
          data: response.data
        };
      } else {
        console.log(`❌ [BOWPI_AUTH_ADAPTER] Login failed - invalid response`);
        return {
          success: false,
          code: response.code,
          message: response.message || 'Login failed',
          data: null
        };
      }

    } catch (error) {
      console.error(`❌ [BOWPI_AUTH_ADAPTER] Login error:`, error);
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          return {
            success: false,
            code: '401',
            message: 'Invalid credentials. Please check your email and password.',
            data: null
          };
        } else if (error.message.includes('Network')) {
          return {
            success: false,
            code: '503',
            message: 'Network error. Please check your internet connection.',
            data: null
          };
        }
      }
      return {
        success: false,
        code: '500',
        message: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
    }
  }

  /**
   * Realizar logout del usuario actual
   */
  async logout(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_ADAPTER] Logout initiated');
    try {
      // Verificar si hay una sesión activa para invalidar
      if (!this.currentSessionId) {
        console.log('⚠️ [BOWPI_AUTH_ADAPTER] No active session to logout');
        await this.clearLocalSession();
        return;
      }

      // Construir URL de invalidación de sesión
      const invalidateUrl = `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${BOWPI_ENDPOINTS.INVALIDATE_SESSION}/${this.currentSessionId}`;
      console.log(`🔍 [BOWPI_AUTH_ADAPTER] Making logout request to: ${invalidateUrl}`);

      // Generar headers de autenticación
      const headers = await this.getAuthHeaders(BOWPI_ENDPOINTS.INVALIDATE_SESSION, 'GET');

      // Realizar petición de invalidación (fire-and-forget)
      // Esta petición no debe esperarse según las especificaciones
      this.performLogoutRequest(invalidateUrl, headers).catch(error => {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Logout request failed (fire-and-forget):', error);
      });

      console.log('✅ [BOWPI_AUTH_ADAPTER] Logout request sent (fire-and-forget)');

    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Logout preparation error (continuing with local cleanup):', error);
      // Continuar con limpieza local incluso si falla la preparación
    } finally {
      // Limpiar datos locales
      await this.clearLocalSession();
      console.log('✅ [BOWPI_AUTH_ADAPTER] Logout completed - local session cleared');
    }
  }

  /**
   * Realizar petición de logout al servidor (fire-and-forget)
   */
  private async performLogoutRequest(url: string, headers: Record<string, string>): Promise<void> {
    try {
      const httpClient = await import('../SecureHttpClient').then(m => m.secureHttpClient);
      // Realizar petición GET para invalidar sesión
      await httpClient.request({
        url,
        method: 'GET',
        headers
      });
      console.log('✅ [BOWPI_AUTH_ADAPTER] Server logout request completed');
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Server logout request failed:', error);
      // No lanzar error ya que es fire-and-forget
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
   * Verificar si el usuario está autenticado
   * @returns true si hay una sesión válida
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Verificar si tenemos token y datos de usuario en memoria
      if (this.currentEncryptedToken && this.currentTokenData && this.currentSessionId) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] User is authenticated (in-memory session)');
        return true;
      }

      // Intentar cargar datos de sesión desde AsyncStorage
      const sessionLoaded = await this.loadSessionData();
      if (sessionLoaded && this.currentEncryptedToken && this.currentTokenData) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] User is authenticated (loaded from storage)');
        return true;
      }

      console.log('❌ [BOWPI_AUTH_ADAPTER] User is not authenticated');
      return false;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Obtener el usuario actualmente autenticado
   * @returns Datos del usuario o null si no está autenticado
   */
  async getCurrentUser(): Promise<AuthTokenData | null> {
    try {
      // Si tenemos datos en memoria, devolverlos
      if (this.currentTokenData) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] Returning current user data (from memory)');
        return this.currentTokenData;
      }

      // Intentar cargar desde storage
      const sessionLoaded = await this.loadSessionData();
      if (sessionLoaded && this.currentTokenData) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] Returning current user data (from storage)');
        return this.currentTokenData;
      }

      console.log('❌ [BOWPI_AUTH_ADAPTER] No current user data available');
      return null;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Obtener el ID de sesión actual (requestId)
   * @returns Session ID o null si no hay sesión
   */
  async getCurrentSessionId(): Promise<string | null> {
    try {
      // Si tenemos session ID en memoria, devolverlo
      if (this.currentSessionId) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] Returning current session ID (from memory)');
        return this.currentSessionId;
      }

      // Intentar cargar desde storage
      const sessionLoaded = await this.loadSessionData();
      if (sessionLoaded && this.currentSessionId) {
        console.log('✅ [BOWPI_AUTH_ADAPTER] Returning current session ID (from storage)');
        return this.currentSessionId;
      }

      console.log('❌ [BOWPI_AUTH_ADAPTER] No current session ID available');
      return null;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error getting session ID:', error);
      return null;
    }
  }

  /**
   * Almacenar datos de sesión de forma segura
   */
  private async storeSessionData(encryptedToken: string, userData: AuthTokenData): Promise<void> {
    try {
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Storing session data securely...');

      // Validar datos antes de almacenar
      const tokenValidation = DataValidationService.validateAuthTokenData(userData);
      if (!tokenValidation.isValid) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Invalid user data:', tokenValidation.errors);
        
        // Log validation failure
        await securityLogger.logSecurityEvent(
          SecurityEventType.TOKEN_VALIDATION,
          SecurityEventSeverity.ERROR,
          'Token data validation failed during storage',
          { errors: tokenValidation.errors },
          userData.userId
        );
        
        throw new Error(`Invalid user data: ${tokenValidation.errors.join(', ')}`);
      }

      const sessionData = {
        encryptedToken,
        userData: tokenValidation.sanitizedData,
        sessionId: userData.userProfile.requestId,
        timestamp: Date.now(),
        deviceId: await this.getDeviceId()
      };

      // Validar datos de sesión
      const sessionValidation = DataValidationService.validateSessionData(sessionData);
      if (!sessionValidation.isValid) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Invalid session data:', sessionValidation.errors);
        
        // Log validation failure
        await securityLogger.logSecurityEvent(
          SecurityEventType.DATA_CORRUPTION,
          SecurityEventSeverity.ERROR,
          'Session data validation failed during storage',
          { errors: sessionValidation.errors },
          userData.userId,
          userData.userProfile.requestId
        );
        
        throw new Error(`Invalid session data: ${sessionValidation.errors.join(', ')}`);
      }

      // Almacenar usando el servicio seguro
      const results = await Promise.allSettled([
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN, encryptedToken),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.SESSION_DATA, sessionValidation.sanitizedData),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.SESSION_ID, userData.userProfile.requestId),
        bowpiSecureStorage.secureStore(BOWPI_STORAGE_KEYS.USER_PROFILE, userData.userProfile)
      ]);

      // Verificar que todas las operaciones fueron exitosas
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Some storage operations failed:', failures);
        
        // Log storage failure
        await securityLogger.logSecurityEvent(
          SecurityEventType.DATA_ENCRYPTION,
          SecurityEventSeverity.ERROR,
          'Failed to store session data securely',
          { failureCount: failures.length },
          userData.userId,
          userData.userProfile.requestId
        );
        
        throw new Error(`Failed to store ${failures.length} session data items`);
      }

      // Log successful storage
      await securityLogger.logSecurityEvent(
        SecurityEventType.DATA_ENCRYPTION,
        SecurityEventSeverity.INFO,
        'Session data stored securely',
        { dataTypes: ['token', 'session', 'profile'] },
        userData.userId,
        userData.userProfile.requestId
      );

      console.log('✅ [BOWPI_AUTH_ADAPTER] Session data stored securely');
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Failed to store session data:', error);
      throw error;
    }
  }

  /**
   * Cargar datos de sesión de forma segura
   */
  private async loadSessionData(): Promise<boolean> {
    try {
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Loading session data securely...');

      // Cargar datos usando el servicio seguro
      const [tokenResult, sessionResult] = await Promise.all([
        bowpiSecureStorage.secureRetrieve<string>(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        bowpiSecureStorage.secureRetrieve<any>(BOWPI_STORAGE_KEYS.SESSION_DATA)
      ]);

      if (!tokenResult.success || !sessionResult.success) {
        console.log('🔍 [BOWPI_AUTH_ADAPTER] No valid session data found');
        return false;
      }

      const encryptedToken = tokenResult.data;
      const sessionData = sessionResult.data;

      if (!encryptedToken || !sessionData) {
        console.log('🔍 [BOWPI_AUTH_ADAPTER] Session data is incomplete');
        return false;
      }

      // Validar datos de sesión cargados
      const sessionValidation = DataValidationService.validateSessionData(sessionData);
      if (!sessionValidation.isValid) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Loaded session data is invalid:', sessionValidation.errors);
        
        // Log data corruption
        await suspiciousActivityMonitor.recordDataCorruption(
          'session_data',
          false,
          { errors: sessionValidation.errors }
        );
        
        // Limpiar datos corruptos
        await this.clearSessionData();
        return false;
      }

      // Validar datos de usuario
      const userValidation = DataValidationService.validateAuthTokenData(sessionData.userData);
      if (!userValidation.isValid) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Loaded user data is invalid:', userValidation.errors);
        
        // Log data corruption
        await suspiciousActivityMonitor.recordDataCorruption(
          'user_data',
          false,
          { errors: userValidation.errors }
        );
        
        // Limpiar datos corruptos
        await this.clearSessionData();
        return false;
      }

      // Validar estructura del token
      const tokenValidation = DataValidationService.validateJWTStructure(encryptedToken);
      if (!tokenValidation.isValid) {
        console.error('❌ [BOWPI_AUTH_ADAPTER] Loaded token structure is invalid:', tokenValidation.errors);
        
        // Log token corruption
        await suspiciousActivityMonitor.recordDataCorruption(
          'jwt_token',
          false,
          { errors: tokenValidation.errors }
        );
        
        // Limpiar datos corruptos
        await this.clearSessionData();
        return false;
      }

      // Asignar datos validados
      this.currentEncryptedToken = encryptedToken;
      this.currentTokenData = userValidation.sanitizedData;
      this.currentSessionId = sessionData.sessionId;

      // Log successful data recovery if applicable
      if (tokenResult.recovered || sessionResult.recovered) {
        console.log('⚠️ [BOWPI_AUTH_ADAPTER] Some data was recovered from backup');
        
        await suspiciousActivityMonitor.recordDataCorruption(
          'session_recovery',
          true,
          { 
            tokenRecovered: tokenResult.recovered,
            sessionRecovered: sessionResult.recovered
          }
        );
      }

      // Log successful session load
      await securityLogger.logSecurityEvent(
        SecurityEventType.DATA_DECRYPTION,
        SecurityEventSeverity.INFO,
        'Session data loaded and validated successfully',
        { 
          recovered: tokenResult.recovered || sessionResult.recovered,
          userId: this.currentTokenData?.userId
        },
        this.currentTokenData?.userId,
        this.currentSessionId || undefined
      );

      console.log('✅ [BOWPI_AUTH_ADAPTER] Session data loaded and validated successfully');
      return true;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Failed to load session data:', error);
      // Limpiar datos potencialmente corruptos
      await this.clearSessionData();
      return false;
    }
  }

  /**
   * Limpiar datos de sesión de forma segura
   */
  private async clearSessionData(): Promise<void> {
    try {
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Clearing session data securely...');

      // Limpiar usando el servicio seguro
      const results = await Promise.allSettled([
        bowpiSecureStorage.secureDelete(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        bowpiSecureStorage.secureDelete(BOWPI_STORAGE_KEYS.SESSION_DATA),
        bowpiSecureStorage.secureDelete(BOWPI_STORAGE_KEYS.SESSION_ID),
        bowpiSecureStorage.secureDelete(BOWPI_STORAGE_KEYS.USER_PROFILE)
      ]);

      // Log any failures but don't throw - clearing should always succeed
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn('⚠️ [BOWPI_AUTH_ADAPTER] Some session data clearing operations failed:', failures);
      }

      console.log('✅ [BOWPI_AUTH_ADAPTER] Session data cleared securely');
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Failed to clear session data:', error);
      // Don't throw - clearing should always succeed at the adapter level
    }
  }

  /**
   * Validar si la sesión actual es válida
   * @returns true si la sesión es válida
   */
  async validateSession(): Promise<boolean> {
    try {
      // Verificar si tenemos datos básicos de sesión
      const isAuthenticated = await this.isAuthenticated();
      if (!isAuthenticated) {
        console.log('❌ [BOWPI_AUTH_ADAPTER] Session validation failed - not authenticated');
        return false;
      }

      // Verificar que el token no esté corrupto
      if (!this.currentEncryptedToken || !this.currentTokenData) {
        console.log('❌ [BOWPI_AUTH_ADAPTER] Session validation failed - missing token or user data');
        return false;
      }

      // Verificar que los datos del usuario sean consistentes
      if (!this.currentTokenData.userId || !this.currentTokenData.userProfile?.requestId) {
        console.log('❌ [BOWPI_AUTH_ADAPTER] Session validation failed - invalid user data structure');
        return false;
      }

      // Para aplicaciones offline-first, no validamos expiración del token
      // El token solo se invalida con logout explícito
      console.log('✅ [BOWPI_AUTH_ADAPTER] Session validation passed');
      return true;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Session validation error:', error);
      return false;
    }
  }

  /**
   * Renovar la sesión actual (si es necesario)
   * @returns true si la renovación fue exitosa
   */
  async renewSession(): Promise<boolean> {
    try {
      // En aplicaciones offline-first, normalmente no renovamos tokens automáticamente
      // Pero podemos verificar que la sesión siga siendo válida
      const isValid = await this.validateSession();
      if (!isValid) {
        console.log('❌ [BOWPI_AUTH_ADAPTER] Session renewal failed - invalid session');
        return false;
      }

      // Actualizar timestamp de la sesión en storage
      if (this.currentTokenData) {
        await this.storeSessionData(this.currentEncryptedToken!, this.currentTokenData);
        console.log('✅ [BOWPI_AUTH_ADAPTER] Session renewed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Session renewal error:', error);
      return false;
    }
  }

  /**
   * Obtener información de la sesión actual
   * @returns Información de la sesión o null
   */
  async getSessionInfo(): Promise<{
    sessionId: string;
    userId: string;
    username: string;
    email: string;
    isValid: boolean;
    lastActivity: number;
    userProfile: any;
  } | null> {
    try {
      const isValid = await this.validateSession();
      if (!isValid || !this.currentTokenData) {
        return null;
      }

      // Obtener timestamp de última actividad desde storage
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      const sessionDataStr = await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA);
      let lastActivity = Date.now();

      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr);
        lastActivity = sessionData.timestamp || Date.now();
      }

      return {
        sessionId: this.currentSessionId!,
        userId: this.currentTokenData.userId,
        username: this.currentTokenData.username,
        email: this.currentTokenData.email,
        isValid,
        lastActivity,
        userProfile: this.currentTokenData.userProfile
      };
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error getting session info:', error);
      return null;
    }
  }

  /**
   * Limpiar sesión local (sin invalidar en servidor)
   */
  async clearLocalSession(): Promise<void> {
    try {
      // Limpiar datos en memoria
      this.currentEncryptedToken = null;
      this.currentTokenData = null;
      this.currentSessionId = null;

      // Limpiar datos en storage
      await this.clearSessionData();

      console.log('✅ [BOWPI_AUTH_ADAPTER] Local session cleared successfully');
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error clearing local session:', error);
      throw error;
    }
  }

  /**
   * Inicializar el adaptador (cargar sesión existente si existe)
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Initializing adapter...');

      // Intentar cargar sesión existente
      const sessionLoaded = await this.loadSessionData();
      if (sessionLoaded) {
        // Validar la sesión cargada
        const isValid = await this.validateSession();
        if (isValid) {
          console.log('✅ [BOWPI_AUTH_ADAPTER] Adapter initialized with existing session');
          return true;
        } else {
          // Limpiar sesión inválida
          await this.clearLocalSession();
          console.log('⚠️ [BOWPI_AUTH_ADAPTER] Adapter initialized - invalid session cleared');
        }
      }

      console.log('✅ [BOWPI_AUTH_ADAPTER] Adapter initialized without session');
      return false;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Adapter initialization error:', error);
      return false;
    }
  }

  /**
   * Carga sesión existente desde AsyncStorage
   */
  private async loadExistingSession(): Promise<void> {
    console.log('🔍 [BOWPI_AUTH_ADAPTER] loadExistingSession() called');
    try {
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Reading from AsyncStorage...');
      const [encryptedToken, sessionDataJson] = await Promise.all([
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.ENCRYPTED_TOKEN),
        AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA)
      ]);
      
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Storage data found:');
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Has encryptedToken:', !!encryptedToken);
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Has sessionDataJson:', !!sessionDataJson);
      
      if (encryptedToken && sessionDataJson) {
        console.log('🔍 [BOWPI_AUTH_ADAPTER] Parsing session data...');
        const sessionData = JSON.parse(sessionDataJson);
        
        this.currentEncryptedToken = encryptedToken;
        this.currentTokenData = sessionData.userData || sessionData.decryptedToken;
        this.currentSessionId = sessionData.sessionId;
        
        console.log('✅ [BOWPI_AUTH_ADAPTER] Existing session loaded successfully');
        console.log('🔍 [BOWPI_AUTH_ADAPTER] Session details:', {
          userId: this.currentTokenData?.userId,
          username: this.currentTokenData?.username,
          email: this.currentTokenData?.email,
          sessionId: this.currentSessionId
        });
      } else {
        console.log('❌ [BOWPI_AUTH_ADAPTER] No existing session found in storage');
      }
      
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Error loading existing session:', error);
      // Limpiar datos corruptos
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Clearing corrupted session data...');
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
      this.currentSessionId = decryptedTokenData.userProfile?.requestId || decryptedTokenData.userId;
      
      console.log('Login processed successfully');
      
    } catch (error) {
      console.error('Error processing successful login:', error);
      throw new Error('Failed to process login response');
    }
  }

  /**
   * Verifica si una URL es endpoint público
   */
  private isPublicEndpoint(url: string): boolean {
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
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
      code: '401'
    };
  }

  /**
   * Construye URL completa del servicio BOWPI
   */
  private buildServiceUrl(endpoint: string): string {
    return `${BOWPI_CONSTANTS.BASE_HOST}${BOWPI_CONSTANTS.SERVICE_PREFIX}${endpoint}`;
  }

  /**
   * Obtener o generar ID de dispositivo
   */
  private async getDeviceId(): Promise<string> {
    try {
      const deviceIdResult = await bowpiSecureStorage.secureRetrieve<string>('device_id');
      
      if (deviceIdResult.success && deviceIdResult.data) {
        return deviceIdResult.data;
      }

      // Generar nuevo ID de dispositivo
      const Crypto = await import('expo-crypto');
      const newDeviceId = Crypto.randomUUID();
      
      await bowpiSecureStorage.secureStore('device_id', newDeviceId);
      console.log('🔍 [BOWPI_AUTH_ADAPTER] Generated new device ID');
      
      return newDeviceId;
    } catch (error) {
      console.error('❌ [BOWPI_AUTH_ADAPTER] Failed to get/generate device ID:', error);
      // Fallback to timestamp-based ID
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Obtener información de debug del adaptador
   */
  async getDebugInfo(): Promise<any> {
    const storageDebugInfo = await bowpiSecureStorage.getDebugInfo();
    
    return {
      hasEncryptedToken: !!this.currentEncryptedToken,
      hasUserData: !!this.currentTokenData,
      hasSessionId: !!this.currentSessionId,
      isAuthenticated: !!this.currentEncryptedToken && !!this.currentTokenData,
      sessionId: this.currentSessionId,
      userInfo: this.currentTokenData ? {
        userId: this.currentTokenData.userId,
        username: this.currentTokenData.username,
        email: this.currentTokenData.email
      } : null,
      secureStorage: storageDebugInfo
    };
  }
}
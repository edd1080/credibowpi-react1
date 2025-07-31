// Data Validation Service - Validates and sanitizes authentication data
import { AuthTokenData } from '../types/bowpi';

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

/**
 * Esquemas de validación
 */
export interface ValidationSchema {
  required: string[];
  optional: string[];
  types: Record<string, string>;
  patterns?: Record<string, RegExp>;
  ranges?: Record<string, { min?: number; max?: number }>;
  custom?: Record<string, (value: any) => boolean>;
}

/**
 * Servicio de validación de datos
 */
export class DataValidationService {
  
  /**
   * Esquema para datos de token de autenticación
   */
  private static readonly AUTH_TOKEN_SCHEMA: ValidationSchema = {
    required: ['userId', 'username', 'email', 'exp', 'iat', 'userProfile'],
    optional: ['roles', 'permissions', 'iss', 'aud'],
    types: {
      userId: 'string',
      username: 'string',
      email: 'string',
      exp: 'number',
      iat: 'number',
      userProfile: 'object',
      roles: 'array',
      permissions: 'array'
    },
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      userId: /^[a-zA-Z0-9_-]+$/
    },
    ranges: {
      exp: { min: Date.now() / 1000 }, // Token no debe estar expirado
      iat: { max: Date.now() / 1000 + 300 } // Token no debe ser del futuro (5 min buffer)
    },
    custom: {
      userProfile: (value: any) => {
        return value && typeof value === 'object' && 
               typeof value.requestId === 'string' &&
               typeof value.names === 'string' &&
               typeof value.lastNames === 'string';
      }
    }
  };

  /**
   * Esquema para datos de sesión
   */
  private static readonly SESSION_DATA_SCHEMA: ValidationSchema = {
    required: ['encryptedToken', 'userData', 'sessionId', 'timestamp'],
    optional: ['lastActivity', 'deviceId', 'ipAddress'],
    types: {
      encryptedToken: 'string',
      userData: 'object',
      sessionId: 'string',
      timestamp: 'number',
      lastActivity: 'number',
      deviceId: 'string',
      ipAddress: 'string'
    },
    ranges: {
      timestamp: { min: Date.now() - (30 * 24 * 60 * 60 * 1000) }, // No más de 30 días
      lastActivity: { min: Date.now() - (7 * 24 * 60 * 60 * 1000) } // No más de 7 días
    }
  };

  /**
   * Validar datos de token de autenticación
   */
  static validateAuthTokenData(data: any): ValidationResult {
    console.log('🔍 [DATA_VALIDATION] Validating auth token data');
    return this.validateData(data, this.AUTH_TOKEN_SCHEMA);
  }

  /**
   * Validar datos de sesión
   */
  static validateSessionData(data: any): ValidationResult {
    console.log('🔍 [DATA_VALIDATION] Validating session data');
    return this.validateData(data, this.SESSION_DATA_SCHEMA);
  }

  /**
   * Validar datos contra un esquema
   */
  static validateData(data: any, schema: ValidationSchema): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!data || typeof data !== 'object') {
      result.isValid = false;
      result.errors.push('Data must be a valid object');
      return result;
    }

    // Validar campos requeridos
    for (const field of schema.required) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        result.isValid = false;
        result.errors.push(`Required field '${field}' is missing`);
      }
    }

    // Validar tipos de datos
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        const actualType = this.getDataType(data[field]);
        if (actualType !== expectedType) {
          result.isValid = false;
          result.errors.push(`Field '${field}' should be of type '${expectedType}', got '${actualType}'`);
        }
      }
    }

    // Validar patrones
    if (schema.patterns) {
      for (const [field, pattern] of Object.entries(schema.patterns)) {
        if (field in data && typeof data[field] === 'string') {
          if (!pattern.test(data[field])) {
            result.isValid = false;
            result.errors.push(`Field '${field}' does not match required pattern`);
          }
        }
      }
    }

    // Validar rangos
    if (schema.ranges) {
      for (const [field, range] of Object.entries(schema.ranges)) {
        if (field in data && typeof data[field] === 'number') {
          if (range.min !== undefined && data[field] < range.min) {
            result.isValid = false;
            result.errors.push(`Field '${field}' is below minimum value ${range.min}`);
          }
          if (range.max !== undefined && data[field] > range.max) {
            result.isValid = false;
            result.errors.push(`Field '${field}' is above maximum value ${range.max}`);
          }
        }
      }
    }

    // Validaciones personalizadas
    if (schema.custom) {
      for (const [field, validator] of Object.entries(schema.custom)) {
        if (field in data) {
          try {
            if (!validator(data[field])) {
              result.isValid = false;
              result.errors.push(`Field '${field}' failed custom validation`);
            }
          } catch (error) {
            result.isValid = false;
            result.errors.push(`Field '${field}' custom validation threw error: ${error}`);
          }
        }
      }
    }

    // Crear datos sanitizados
    result.sanitizedData = this.sanitizeData(data, schema);

    console.log(`🔍 [DATA_VALIDATION] Validation result: ${result.isValid ? 'VALID' : 'INVALID'}`);
    if (result.errors.length > 0) {
      console.log('❌ [DATA_VALIDATION] Validation errors:', result.errors);
    }
    if (result.warnings.length > 0) {
      console.log('⚠️ [DATA_VALIDATION] Validation warnings:', result.warnings);
    }

    return result;
  }

  /**
   * Sanitizar datos según esquema
   */
  private static sanitizeData(data: any, schema: ValidationSchema): any {
    const sanitized: any = {};
    const allowedFields = [...schema.required, ...schema.optional];

    // Solo incluir campos permitidos
    for (const field of allowedFields) {
      if (field in data) {
        sanitized[field] = this.sanitizeValue(data[field], schema.types[field]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitizar valor individual
   */
  private static sanitizeValue(value: any, expectedType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (expectedType) {
      case 'string':
        return String(value).trim();
      
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      
      case 'boolean':
        return Boolean(value);
      
      case 'array':
        return Array.isArray(value) ? value : [value];
      
      case 'object':
        return typeof value === 'object' ? value : {};
      
      default:
        return value;
    }
  }

  /**
   * Obtener tipo de dato
   */
  private static getDataType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Validar estructura de token JWT
   */
  static validateJWTStructure(token: string): ValidationResult {
    console.log('🔍 [DATA_VALIDATION] Validating JWT structure');
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!token || typeof token !== 'string') {
      result.isValid = false;
      result.errors.push('Token must be a non-empty string');
      return result;
    }

    // Verificar formato básico de JWT (3 partes separadas por puntos)
    const parts = token.split('.');
    if (parts.length !== 3) {
      result.isValid = false;
      result.errors.push('JWT must have exactly 3 parts separated by dots');
      return result;
    }

    // Verificar que cada parte sea base64 válida
    for (let i = 0; i < parts.length; i++) {
      const partName = ['header', 'payload', 'signature'][i];
      if (!this.isValidBase64(parts[i])) {
        result.isValid = false;
        result.errors.push(`JWT ${partName} is not valid base64`);
      }
    }

    // Verificar longitudes mínimas
    if (parts[0].length < 10) {
      result.warnings.push('JWT header seems unusually short');
    }
    if (parts[1].length < 20) {
      result.warnings.push('JWT payload seems unusually short');
    }
    if (parts[2].length < 10) {
      result.warnings.push('JWT signature seems unusually short');
    }

    return result;
  }

  /**
   * Verificar si una cadena es base64 válida
   */
  private static isValidBase64(str: string): boolean {
    try {
      // Agregar padding si es necesario
      const padded = str + '='.repeat((4 - str.length % 4) % 4);
      return btoa(atob(padded)) === padded;
    } catch {
      return false;
    }
  }

  /**
   * Validar email
   */
  static validateEmail(email: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!email || typeof email !== 'string') {
      result.isValid = false;
      result.errors.push('Email must be a non-empty string');
      return result;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.isValid = false;
      result.errors.push('Email format is invalid');
    }

    // Verificaciones adicionales
    if (email.length > 254) {
      result.isValid = false;
      result.errors.push('Email is too long (max 254 characters)');
    }

    const [localPart, domain] = email.split('@');
    if (localPart.length > 64) {
      result.isValid = false;
      result.errors.push('Email local part is too long (max 64 characters)');
    }

    if (domain.length > 253) {
      result.isValid = false;
      result.errors.push('Email domain is too long (max 253 characters)');
    }

    // Advertencias
    if (email.includes('..')) {
      result.warnings.push('Email contains consecutive dots');
    }

    if (email.startsWith('.') || email.endsWith('.')) {
      result.warnings.push('Email starts or ends with a dot');
    }

    result.sanitizedData = email.toLowerCase().trim();

    return result;
  }

  /**
   * Validar ID de sesión
   */
  static validateSessionId(sessionId: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!sessionId || typeof sessionId !== 'string') {
      result.isValid = false;
      result.errors.push('Session ID must be a non-empty string');
      return result;
    }

    // Verificar longitud mínima y máxima
    if (sessionId.length < 8) {
      result.isValid = false;
      result.errors.push('Session ID is too short (minimum 8 characters)');
    }

    if (sessionId.length > 128) {
      result.isValid = false;
      result.errors.push('Session ID is too long (maximum 128 characters)');
    }

    // Verificar caracteres permitidos
    const allowedChars = /^[a-zA-Z0-9_-]+$/;
    if (!allowedChars.test(sessionId)) {
      result.isValid = false;
      result.errors.push('Session ID contains invalid characters (only alphanumeric, underscore, and dash allowed)');
    }

    result.sanitizedData = sessionId.trim();

    return result;
  }

  /**
   * Validar timestamp
   */
  static validateTimestamp(timestamp: number, maxAge?: number): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      result.isValid = false;
      result.errors.push('Timestamp must be a valid number');
      return result;
    }

    const now = Date.now();
    const timestampMs = timestamp > 9999999999 ? timestamp : timestamp * 1000; // Convert to ms if needed

    // Verificar que no sea del futuro (con buffer de 5 minutos)
    if (timestampMs > now + 300000) {
      result.isValid = false;
      result.errors.push('Timestamp is in the future');
    }

    // Verificar edad máxima si se especifica
    if (maxAge && (now - timestampMs) > maxAge) {
      result.isValid = false;
      result.errors.push(`Timestamp is older than maximum age of ${maxAge}ms`);
    }

    // Advertencias
    if (timestampMs < 946684800000) { // Before year 2000
      result.warnings.push('Timestamp seems to be from before year 2000');
    }

    result.sanitizedData = timestampMs;

    return result;
  }

  /**
   * Obtener estadísticas de validación
   */
  static getValidationStats(): {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    commonErrors: string[];
  } {
    // En una implementación real, esto mantendría estadísticas
    return {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      commonErrors: []
    };
  }
}

export default DataValidationService;
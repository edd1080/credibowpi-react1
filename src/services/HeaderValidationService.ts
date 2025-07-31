// Header Validation Service - Utilities for testing and validating Bowpi headers

import { 
  BowpiOTPService,
  BowpiHMACService,
  BOWPI_CONSTANTS,
  BOWPI_BASE_HEADERS,
  METHODS_REQUIRING_HMAC
} from './bowpi';

/**
 * Header validation result
 */
export interface HeaderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    hasAuthorization: boolean;
    hasOTPToken: boolean;
    hasXDigest: boolean;
    hasXDate: boolean;
    hasBowpiAuthToken: boolean;
    otpTokenValid?: boolean;
    hmacValid?: boolean;
  };
}

/**
 * Service for validating and testing Bowpi header generation
 */
export class HeaderValidationService {
  private otpService: BowpiOTPService;
  private hmacService: BowpiHMACService;

  constructor() {
    this.otpService = new BowpiOTPService();
    this.hmacService = new BowpiHMACService();
  }

  /**
   * Validate a complete set of Bowpi headers
   * 
   * @param headers Headers to validate
   * @param method HTTP method
   * @param hasSession Whether user has active session
   * @param isPublicEndpoint Whether endpoint is public
   * @returns Validation result
   */
  validateHeaders(
    headers: Record<string, string>,
    method: string,
    hasSession: boolean = false,
    isPublicEndpoint: boolean = false
  ): HeaderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details = {
      hasAuthorization: false,
      hasOTPToken: false,
      hasXDigest: false,
      hasXDate: false,
      hasBowpiAuthToken: false,
      otpTokenValid: undefined as boolean | undefined,
      hmacValid: undefined as boolean | undefined
    };

    // Check required base headers
    this.validateBaseHeaders(headers, errors, warnings, details);

    // Check HMAC headers for methods that require them
    if (this.hmacService.shouldGenerateHMAC(method)) {
      this.validateHMACHeaders(headers, errors, warnings, details);
    }

    // Check auth token for authenticated requests
    if (hasSession && !isPublicEndpoint) {
      this.validateAuthToken(headers, errors, warnings, details);
    }

    // Validate OTP token format
    if (headers.OTPToken) {
      details.otpTokenValid = this.validateOTPTokenFormat(headers.OTPToken);
      if (!details.otpTokenValid) {
        errors.push('OTPToken format is invalid');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details
    };
  }

  /**
   * Validate base headers that should always be present
   */
  private validateBaseHeaders(
    headers: Record<string, string>,
    errors: string[],
    warnings: string[],
    details: any
  ): void {
    // Authorization header
    if (!headers.Authorization) {
      errors.push('Missing Authorization header');
    } else {
      details.hasAuthorization = true;
      if (headers.Authorization !== BOWPI_CONSTANTS.BASIC_AUTH) {
        errors.push('Invalid Authorization header value');
      }
    }

    // Cache-Control header
    if (!headers['Cache-Control']) {
      errors.push('Missing Cache-Control header');
    } else if (headers['Cache-Control'] !== BOWPI_BASE_HEADERS['Cache-Control']) {
      warnings.push('Cache-Control header value differs from expected');
    }

    // Pragma header
    if (!headers.Pragma) {
      errors.push('Missing Pragma header');
    } else if (headers.Pragma !== BOWPI_BASE_HEADERS.Pragma) {
      warnings.push('Pragma header value differs from expected');
    }

    // OTPToken header
    if (!headers.OTPToken) {
      errors.push('Missing OTPToken header');
    } else {
      details.hasOTPToken = true;
    }
  }

  /**
   * Validate HMAC-related headers for POST/PUT/PATCH requests
   */
  private validateHMACHeaders(
    headers: Record<string, string>,
    errors: string[],
    warnings: string[],
    details: any
  ): void {
    // X-Digest header
    if (!headers['X-Digest']) {
      errors.push('Missing X-Digest header for HMAC method');
    } else {
      details.hasXDigest = true;
    }

    // X-Date header
    if (!headers['X-Date']) {
      errors.push('Missing X-Date header for HMAC method');
    } else {
      details.hasXDate = true;
      
      // Validate X-Date format (should be timestamp)
      const timestamp = parseInt(headers['X-Date']);
      if (isNaN(timestamp) || timestamp <= 0) {
        errors.push('Invalid X-Date header format (should be timestamp)');
      } else {
        // Check if timestamp is reasonable (within last hour to next hour)
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (Math.abs(now - timestamp) > oneHour) {
          warnings.push('X-Date timestamp seems too old or too far in future');
        }
      }
    }

    // Content-Type header should be present for HMAC methods
    if (!headers['Content-Type']) {
      warnings.push('Missing Content-Type header for HMAC method');
    } else if (headers['Content-Type'] !== 'application/json') {
      warnings.push('Content-Type should be application/json for HMAC methods');
    }
  }

  /**
   * Validate authentication token header
   */
  private validateAuthToken(
    headers: Record<string, string>,
    errors: string[],
    warnings: string[],
    details: any
  ): void {
    if (!headers['bowpi-auth-token']) {
      errors.push('Missing bowpi-auth-token header for authenticated request');
    } else {
      details.hasBowpiAuthToken = true;
      
      // Basic JWT format validation
      const token = headers['bowpi-auth-token'];
      const jwtParts = token.split('.');
      if (jwtParts.length !== 3) {
        errors.push('bowpi-auth-token does not appear to be valid JWT format');
      }
    }
  }

  /**
   * Validate OTP token format
   */
  private validateOTPTokenFormat(otpToken: string): boolean {
    try {
      // Decode base64
      const decoded = atob(otpToken);
      
      // Use the OTP service validation method
      const validation = this.otpService.validateTokenStructure(otpToken);
      return validation.isValid;
      
    } catch (error) {
      console.error('OTP token validation error:', error);
      return false;
    }
  }

  /**
   * Generate test headers for validation
   */
  async generateTestHeaders(
    method: string,
    body?: any,
    hasSession: boolean = false,
    authToken?: string
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
      'Cache-Control': BOWPI_BASE_HEADERS['Cache-Control'],
      'Pragma': BOWPI_BASE_HEADERS.Pragma,
      'OTPToken': this.otpService.generateOTPToken()
    };

    // Add HMAC headers if needed
    if (this.hmacService.shouldGenerateHMAC(method)) {
      const headersForHMAC = { ...headers };
      const digest = await this.hmacService.generateDigestHmac(body, headersForHMAC);
      
      headers['X-Digest'] = digest;
      headers['Content-Type'] = 'application/json';
      headers['X-Date'] = headersForHMAC['X-Date']!;
    }

    // Add auth token if provided
    if (hasSession && authToken) {
      headers['bowpi-auth-token'] = authToken;
    }

    return headers;
  }

  /**
   * Test header generation with various scenarios
   */
  async runHeaderTests(): Promise<{
    testResults: Array<{
      testName: string;
      passed: boolean;
      details: HeaderValidationResult;
    }>;
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
    };
  }> {
    const testResults = [];

    // Test 1: GET request without session
    const getHeaders = await this.generateTestHeaders('GET');
    const getValidation = this.validateHeaders(getHeaders, 'GET', false, true);
    testResults.push({
      testName: 'GET request without session',
      passed: getValidation.isValid,
      details: getValidation
    });

    // Test 2: POST request without session (login)
    const postHeaders = await this.generateTestHeaders('POST', { username: 'test', password: 'test' });
    const postValidation = this.validateHeaders(postHeaders, 'POST', false, true);
    testResults.push({
      testName: 'POST request without session (login)',
      passed: postValidation.isValid,
      details: postValidation
    });

    // Test 3: POST request with session
    const authPostHeaders = await this.generateTestHeaders(
      'POST', 
      { data: 'test' }, 
      true, 
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.signature'
    );
    const authPostValidation = this.validateHeaders(authPostHeaders, 'POST', true, false);
    testResults.push({
      testName: 'POST request with session',
      passed: authPostValidation.isValid,
      details: authPostValidation
    });

    // Test 4: PUT request with session
    const putHeaders = await this.generateTestHeaders(
      'PUT', 
      { data: 'update' }, 
      true, 
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.signature'
    );
    const putValidation = this.validateHeaders(putHeaders, 'PUT', true, false);
    testResults.push({
      testName: 'PUT request with session',
      passed: putValidation.isValid,
      details: putValidation
    });

    // Calculate summary
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.length - passed;

    return {
      testResults,
      summary: {
        totalTests: testResults.length,
        passed,
        failed
      }
    };
  }

  /**
   * Log comprehensive header information for debugging
   */
  logHeaderDebugInfo(headers: Record<string, string>, method: string): void {
    console.log('🔍 [HEADER_VALIDATION] Header Debug Info:');
    console.log('Method:', method);
    console.log('Headers:', Object.keys(headers).map(key => ({
      key,
      value: key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') 
        ? '[REDACTED]' 
        : headers[key],
      length: headers[key]?.length || 0
    })));

    // Validate and log results
    const validation = this.validateHeaders(headers, method);
    console.log('Validation Result:', {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      details: validation.details
    });

    if (validation.errors.length > 0) {
      console.log('❌ Errors:', validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️ Warnings:', validation.warnings);
    }
  }
}

// Export singleton instance
export const headerValidationService = new HeaderValidationService();
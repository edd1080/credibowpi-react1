// Header Generation Tests

import { BowpiAuthAdapter } from '../bowpi/BowpiAuthAdapter';
import { HeaderValidationService } from '../HeaderValidationService';
import { BOWPI_CONSTANTS, METHODS_REQUIRING_HMAC } from '../bowpi';

describe('Header Generation', () => {
  let authAdapter: BowpiAuthAdapter;
  let validationService: HeaderValidationService;

  beforeEach(() => {
    authAdapter = new BowpiAuthAdapter();
    validationService = new HeaderValidationService();
  });

  describe('Base Headers', () => {
    it('should generate required base headers for GET request', async () => {
      const headers = await authAdapter.getAuthHeaders('/test', 'GET');

      expect(headers).toHaveProperty('Authorization', BOWPI_CONSTANTS.BASIC_AUTH);
      expect(headers).toHaveProperty('Cache-Control', 'no-cache');
      expect(headers).toHaveProperty('Pragma', 'no-cache');
      expect(headers).toHaveProperty('OTPToken');
      expect(headers.OTPToken).toBeTruthy();
    });

    it('should generate OTPToken in correct format', async () => {
      const headers = await authAdapter.getAuthHeaders('/test', 'GET');
      const otpToken = headers.OTPToken;

      // OTP token should be base64 encoded
      expect(() => atob(otpToken)).not.toThrow();
      
      // Validate using validation service
      const validation = validationService.validateHeaders(headers, 'GET', false, true);
      expect(validation.details.otpTokenValid).toBe(true);
    });
  });

  describe('HMAC Headers', () => {
    it('should generate HMAC headers for POST requests', async () => {
      const body = { username: 'test', password: 'test' };
      const headers = await authAdapter.getAuthHeaders('/auth/login', 'POST', body);

      expect(headers).toHaveProperty('X-Digest');
      expect(headers).toHaveProperty('X-Date');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers['X-Digest']).toBeTruthy();
      expect(headers['X-Date']).toBeTruthy();
    });

    it('should generate HMAC headers for PUT requests', async () => {
      const body = { data: 'update' };
      const headers = await authAdapter.getAuthHeaders('/api/update', 'PUT', body);

      expect(headers).toHaveProperty('X-Digest');
      expect(headers).toHaveProperty('X-Date');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should generate HMAC headers for PATCH requests', async () => {
      const body = { data: 'patch' };
      const headers = await authAdapter.getAuthHeaders('/api/patch', 'PATCH', body);

      expect(headers).toHaveProperty('X-Digest');
      expect(headers).toHaveProperty('X-Date');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    it('should NOT generate HMAC headers for GET requests', async () => {
      const headers = await authAdapter.getAuthHeaders('/api/data', 'GET');

      expect(headers).not.toHaveProperty('X-Digest');
      expect(headers).not.toHaveProperty('X-Date');
      expect(headers).not.toHaveProperty('Content-Type');
    });

    it('should generate valid X-Date timestamp', async () => {
      const body = { test: 'data' };
      const headers = await authAdapter.getAuthHeaders('/test', 'POST', body);

      const timestamp = parseInt(headers['X-Date']);
      expect(timestamp).toBeGreaterThan(0);
      
      // Should be within reasonable time range (last minute to next minute)
      const now = Date.now();
      const oneMinute = 60 * 1000;
      expect(Math.abs(now - timestamp)).toBeLessThan(oneMinute);
    });
  });

  describe('Authentication Token Headers', () => {
    it('should include bowpi-auth-token for authenticated non-public endpoints', async () => {
      // Mock authenticated state
      jest.spyOn(authAdapter, 'isAuthenticated').mockResolvedValue(true);
      (authAdapter as any).currentEncryptedToken = 'mock-jwt-token';

      const headers = await authAdapter.getAuthHeaders('/api/protected', 'GET');

      expect(headers).toHaveProperty('bowpi-auth-token', 'mock-jwt-token');
    });

    it('should NOT include bowpi-auth-token for public endpoints', async () => {
      // Mock authenticated state
      jest.spyOn(authAdapter, 'isAuthenticated').mockResolvedValue(true);
      (authAdapter as any).currentEncryptedToken = 'mock-jwt-token';

      const headers = await authAdapter.getAuthHeaders('/auth/login', 'POST');

      expect(headers).not.toHaveProperty('bowpi-auth-token');
    });

    it('should NOT include bowpi-auth-token when not authenticated', async () => {
      jest.spyOn(authAdapter, 'isAuthenticated').mockResolvedValue(false);

      const headers = await authAdapter.getAuthHeaders('/api/protected', 'GET');

      expect(headers).not.toHaveProperty('bowpi-auth-token');
    });
  });

  describe('Header Validation', () => {
    it('should validate complete header set correctly', async () => {
      const headers = await validationService.generateTestHeaders('POST', { test: 'data' });
      const validation = validationService.validateHeaders(headers, 'POST', false, true);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.details.hasAuthorization).toBe(true);
      expect(validation.details.hasOTPToken).toBe(true);
      expect(validation.details.hasXDigest).toBe(true);
      expect(validation.details.hasXDate).toBe(true);
    });

    it('should detect missing required headers', () => {
      const incompleteHeaders = {
        'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
        // Missing OTPToken, Cache-Control, Pragma
      };

      const validation = validationService.validateHeaders(incompleteHeaders, 'GET');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Missing OTPToken header');
      expect(validation.errors).toContain('Missing Cache-Control header');
      expect(validation.errors).toContain('Missing Pragma header');
    });

    it('should detect missing HMAC headers for POST requests', () => {
      const headersWithoutHMAC = {
        'Authorization': BOWPI_CONSTANTS.BASIC_AUTH,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'OTPToken': 'test-token'
        // Missing X-Digest and X-Date
      };

      const validation = validationService.validateHeaders(headersWithoutHMAC, 'POST');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing X-Digest header for HMAC method');
      expect(validation.errors).toContain('Missing X-Date header for HMAC method');
    });
  });

  describe('Methods Requiring HMAC', () => {
    it('should correctly identify methods that require HMAC', () => {
      expect(METHODS_REQUIRING_HMAC).toContain('POST');
      expect(METHODS_REQUIRING_HMAC).toContain('PUT');
      expect(METHODS_REQUIRING_HMAC).toContain('PATCH');
      expect(METHODS_REQUIRING_HMAC).not.toContain('GET');
      expect(METHODS_REQUIRING_HMAC).not.toContain('DELETE');
    });
  });

  describe('Error Handling', () => {
    it('should return basic headers when header generation fails', async () => {
      // Mock OTP service to throw error
      const mockOTPService = {
        generateOTPToken: jest.fn().mockImplementation(() => {
          throw new Error('OTP generation failed');
        })
      };
      (authAdapter as any).otpService = mockOTPService;

      const headers = await authAdapter.getAuthHeaders('/test', 'GET');

      // Should still return basic headers
      expect(headers).toHaveProperty('Authorization', BOWPI_CONSTANTS.BASIC_AUTH);
      expect(headers).toHaveProperty('Cache-Control', 'no-cache');
      expect(headers).toHaveProperty('Pragma', 'no-cache');
      expect(headers).toHaveProperty('OTPToken');
    });
  });

  describe('Integration Tests', () => {
    it('should run comprehensive header tests successfully', async () => {
      const testResults = await validationService.runHeaderTests();

      expect(testResults.summary.totalTests).toBeGreaterThan(0);
      expect(testResults.summary.passed).toBeGreaterThan(0);
      expect(testResults.summary.failed).toBe(0);

      // All tests should pass
      testResults.testResults.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });
});
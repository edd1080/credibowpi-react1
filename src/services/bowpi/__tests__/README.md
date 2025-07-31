# Bowpi Services Test Suite

This directory contains comprehensive unit tests for all Bowpi authentication services.

## 📁 Test Structure

```
__tests__/
├── BowpiOTPService.test.ts      # OTP token generation and validation tests
├── BowpiHMACService.test.ts     # HMAC digest generation and verification tests
├── BowpiCryptoService.test.ts   # Token decryption and validation tests
├── BowpiAuthAdapter.test.ts     # Authentication flow integration tests
├── ErrorHandling.test.ts        # Error scenarios and edge cases
├── BowpiServices.test.ts        # End-to-end integration tests
├── setup.ts                     # Test environment setup and mocks
├── jest.config.js              # Jest configuration for Bowpi tests
└── README.md                   # This file
```

## 🧪 Test Categories

### 1. **BowpiOTPService Tests**
- ✅ OTP token generation with proper structure
- ✅ Token validation and expiration handling
- ✅ Cryptographic security validation
- ✅ Performance and concurrency testing
- ✅ Error handling for crypto API failures

### 2. **BowpiHMACService Tests**
- ✅ HMAC digest generation (SHA-256)
- ✅ Digest verification and validation
- ✅ Request digest generation for HTTP requests
- ✅ Security validation (timing attack resistance)
- ✅ Performance testing with large payloads

### 3. **BowpiCryptoService Tests**
- ✅ JWT token decryption and validation
- ✅ Token structure validation
- ✅ Payload extraction from JWT tokens
- ✅ Security validation (issuer, audience, expiration)
- ✅ Error handling for malformed tokens

### 4. **BowpiAuthAdapter Tests**
- ✅ Complete authentication flow testing
- ✅ Login, logout, and token refresh operations
- ✅ Network error handling
- ✅ Service integration validation
- ✅ Concurrent operation handling

### 5. **Error Handling Tests**
- ✅ Network error scenarios (timeout, DNS, SSL)
- ✅ Server error responses (500, 502, 503, 429)
- ✅ Authentication failures (401, 403, 423)
- ✅ Token and crypto error scenarios
- ✅ Data validation error handling

### 6. **Integration Tests**
- ✅ End-to-end authentication flow
- ✅ Service interoperability validation
- ✅ Error propagation testing
- ✅ Performance and reliability testing
- ✅ Security validation

## 🚀 Running Tests

### Run All Bowpi Tests
```bash
npm run test:bowpi
```

### Run Individual Test Suites
```bash
# OTP Service tests
npm run test:bowpi:otp

# HMAC Service tests
npm run test:bowpi:hmac

# Crypto Service tests
npm run test:bowpi:crypto

# Auth Adapter tests
npm run test:bowpi:adapter

# Error handling tests
npm run test:bowpi:errors

# Unit tests only
npm run test:bowpi:unit
```

### Run with Coverage
```bash
npm run test:bowpi:unit -- --coverage
```

### Run in Watch Mode
```bash
npm run test:bowpi:unit -- --watch
```

## 📊 Coverage Requirements

All Bowpi services must maintain **minimum 80% coverage** in:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## 🔧 Test Configuration

### Jest Configuration
- **Environment**: jsdom (for React Native compatibility)
- **Setup**: Comprehensive mocking of React Native APIs
- **Timeout**: 10 seconds per test
- **Coverage**: HTML and LCOV reports generated

### Mocked Dependencies
- React Native core modules
- AsyncStorage
- Expo SecureStore
- Expo Crypto
- NetInfo
- crypto-js
- Web Crypto API
- Fetch API

## 🛡️ Security Testing

### Cryptographic Security
- ✅ Token uniqueness validation
- ✅ Entropy testing for random generation
- ✅ Timing attack resistance
- ✅ Sensitive data exposure prevention

### Authentication Security
- ✅ Credential validation
- ✅ Token structure validation
- ✅ Issuer and audience verification
- ✅ Expiration handling

## 🐛 Error Scenarios Tested

### Network Errors
- Connection timeout
- DNS resolution failure
- Connection refused
- SSL/TLS certificate errors

### Server Errors
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 429 Rate Limiting

### Authentication Errors
- Invalid credentials (401)
- Account locked (423)
- Expired credentials
- Access denied (403)

### Token Errors
- Malformed JWT tokens
- Expired tokens
- Invalid token structure
- Decryption failures

## 📈 Performance Testing

### Benchmarks
- Token generation: < 100ms
- HMAC generation: < 100ms
- Token decryption: < 200ms
- Full auth flow: < 2000ms

### Concurrency Testing
- Multiple simultaneous operations
- Race condition prevention
- Resource cleanup validation

## 🔍 Test Utilities

### Global Test Helpers
```typescript
// Create mock responses
global.testUtils.createMockResponse(data, status, ok)

// Create Bowpi API responses
global.testUtils.createMockBowpiResponse(data, success, code)

// Create mock user data
global.testUtils.createMockUserData(overrides)

// Create mock credentials
global.testUtils.createMockCredentials(overrides)

// Wait for async operations
await global.testUtils.waitFor(ms)
```

## 📝 Writing New Tests

### Test Structure Template
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

### Best Practices
1. **Arrange-Act-Assert** pattern
2. **Descriptive test names** explaining the scenario
3. **Mock external dependencies** completely
4. **Test both success and failure paths**
5. **Validate security implications**
6. **Include performance assertions**
7. **Clean up resources** in afterEach

## 🚨 Common Issues

### Mock Setup Issues
- Ensure all React Native modules are mocked
- Verify crypto API mocks are properly configured
- Check that fetch is mocked correctly

### Async Testing Issues
- Use proper async/await patterns
- Handle Promise rejections correctly
- Set appropriate timeouts for long operations

### Coverage Issues
- Ensure all code paths are tested
- Include error handling branches
- Test edge cases and boundary conditions

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Bowpi API Documentation](../../../docs/bowpi-api.md)
- [Authentication Flow Diagrams](../../../docs/auth-flow.md)

---

**Last Updated**: January 2025  
**Test Coverage**: 80%+ required  
**Maintainer**: CrediBowpi Development Team
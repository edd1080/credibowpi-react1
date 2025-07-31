# Authentication Integration Tests

This directory contains comprehensive integration tests for the complete authentication flow, covering UI to storage interactions, offline/online scenarios, and network connectivity changes.

## 📁 Test Structure

```
integration/
├── LoginFlow.test.ts                    # Complete login flow from UI to storage
├── OfflineOnlineAuth.test.ts           # Offline/online authentication scenarios
├── LogoutFlow.test.ts                  # Logout flow with server invalidation
├── SessionPersistence.test.ts          # Session persistence and recovery
├── NetworkConnectivityAuth.test.ts     # Network connectivity changes during auth
├── AuthenticationIntegration.test.ts   # End-to-end integration scenarios
├── setup.ts                           # Integration test environment setup
├── jest.config.js                     # Jest configuration for integration tests
└── README.md                          # This file
```

## 🧪 Test Categories

### 1. **Login Flow Integration** (`LoginFlow.test.ts`)
Tests the complete login process from credentials input to secure storage:

- ✅ **Complete Login Flow**: UI → Service → Storage integration
- ✅ **Login Failure Handling**: Error states and cleanup
- ✅ **Token Decryption**: JWT processing and validation
- ✅ **Session Metadata**: Proper storage of session information
- ✅ **Concurrent Login Attempts**: Race condition handling
- ✅ **Session Restoration**: App startup session recovery
- ✅ **Data Persistence**: User profile and session data storage
- ✅ **Error Recovery**: Cleanup on partial failures

### 2. **Offline/Online Authentication** (`OfflineOnlineAuth.test.ts`)
Tests authentication behavior across network state changes:

- ✅ **Online Authentication**: Normal authentication flow
- ✅ **Offline Login Blocking**: Prevention of offline login attempts
- ✅ **Offline Session Usage**: Valid session usage without network
- ✅ **Network State Transitions**: Online → Offline → Online flows
- ✅ **Token Refresh Blocking**: Offline token refresh prevention
- ✅ **Network Quality Adaptation**: Performance across connection types
- ✅ **Intermittent Connectivity**: Handling unstable networks
- ✅ **Data Validation**: Offline session data integrity

### 3. **Logout Flow Integration** (`LogoutFlow.test.ts`)
Tests complete logout process with server invalidation:

- ✅ **Online Logout**: Full server invalidation flow
- ✅ **Server Logout Failure**: Graceful handling of server errors
- ✅ **Network Timeout**: Logout during network issues
- ✅ **Proper Headers**: Authentication headers in logout requests
- ✅ **Concurrent Logout**: Multiple logout attempt handling
- ✅ **Offline Logout**: User confirmation and local cleanup
- ✅ **Session Invalidation**: Complete session cleanup
- ✅ **Error Handling**: Storage and service error recovery

### 4. **Session Persistence** (`SessionPersistence.test.ts`)
Tests session data persistence across app restarts and recovery:

- ✅ **App Restart Persistence**: Session restoration after app restart
- ✅ **Expired Session Cleanup**: Automatic cleanup of expired sessions
- ✅ **Corrupted Data Handling**: Recovery from corrupted session data
- ✅ **Profile Data Preservation**: User profile data integrity
- ✅ **Encryption/Decryption**: Secure storage encryption handling
- ✅ **Session Recovery**: Backup and recovery mechanisms
- ✅ **Token Refresh Recovery**: Recovery during token refresh
- ✅ **Background Validation**: Periodic session validation
- ✅ **Data Integrity**: Checksum and validation across restarts

### 5. **Network Connectivity Changes** (`NetworkConnectivityAuth.test.ts`)
Tests authentication during real-time network changes:

- ✅ **Network Disconnection**: Handling mid-request disconnections
- ✅ **Network Restoration**: Retry logic after network recovery
- ✅ **Network Quality Changes**: WiFi ↔ Cellular transitions
- ✅ **Intermittent Connectivity**: Unstable network handling
- ✅ **Timeout Adaptation**: Network-appropriate timeouts
- ✅ **Token Refresh Networks**: Refresh across network changes
- ✅ **Logout Network Changes**: Logout during network transitions
- ✅ **Network Monitoring**: Continuous network state monitoring
- ✅ **Error Recovery**: DNS, SSL, proxy error handling

### 6. **Complete Authentication Integration** (`AuthenticationIntegration.test.ts`)
End-to-end scenarios combining multiple authentication aspects:

- ✅ **Full Lifecycle**: Login → Validation → Refresh → Logout
- ✅ **Offline-to-Online Flow**: Complete offline/online transition
- ✅ **Session Recovery**: Cross-restart recovery scenarios
- ✅ **Concurrent Operations**: Multiple simultaneous auth operations
- ✅ **Network Quality Flows**: Authentication across network types
- ✅ **Error Recovery**: Multi-failure recovery scenarios
- ✅ **Performance Testing**: High-frequency operations
- ✅ **Security Validation**: Data protection throughout flow

## 🚀 Running Integration Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Individual Test Suites
```bash
# Login flow tests
npm run test:integration:login

# Offline/online tests
npm run test:integration:offline

# Logout flow tests
npm run test:integration:logout

# Session persistence tests
npm run test:integration:session

# Network connectivity tests
npm run test:integration:network

# Complete integration tests
npm run test:integration:complete

# Unit integration tests only
npm run test:integration:unit
```

### Run with Coverage
```bash
npm run test:integration:unit -- --coverage
```

### Run in Watch Mode
```bash
npm run test:integration:unit -- --watch
```

## 📊 Coverage Requirements

Integration tests must maintain **minimum 75% coverage** in:
- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 75%
- **Statements**: 75%

## 🔧 Test Configuration

### Jest Configuration
- **Environment**: jsdom (React Native compatibility)
- **Timeout**: 15 seconds per test (longer for integration)
- **Workers**: 1 (sequential execution to avoid conflicts)
- **Setup**: Comprehensive mocking of all external dependencies

### Mocked Dependencies
- React Native core modules (Platform, Dimensions, Alert, AppState)
- AsyncStorage with controllable state
- Expo SecureStore with encryption simulation
- NetInfo with network state control
- React Navigation
- crypto-js and Web Crypto API
- Fetch API with response control

## 🛠️ Integration Test Utilities

### Network State Control
```typescript
// Set network state
integrationTestUtils.setNetworkState({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi'
});

// Simulate network change
integrationTestUtils.simulateNetworkChange({
  isConnected: false,
  type: 'none'
});
```

### Storage Management
```typescript
// Clear all storage
await integrationTestUtils.clearAllStorage();

// Set storage data
integrationTestUtils.setStorageData('key', data, secure);
```

### Server Response Mocking
```typescript
// Mock successful response
integrationTestUtils.mockServerResponse(data, status, ok);

// Mock server error
integrationTestUtils.mockServerError(status, message);

// Mock network error
integrationTestUtils.mockNetworkError(errorMessage);
```

### Test Data Creation
```typescript
// Create mock user data
const userData = integrationTestUtils.createMockUserData(overrides);

// Create Bowpi response
const response = integrationTestUtils.createMockBowpiResponse(data, success);
```

## 🔍 Test Scenarios Covered

### Authentication Flow Scenarios
1. **Happy Path**: Complete successful authentication flow
2. **Error Recovery**: Recovery from various failure types
3. **Network Transitions**: Authentication across network changes
4. **Concurrent Operations**: Multiple simultaneous auth operations
5. **Data Persistence**: Session data across app lifecycle
6. **Security Validation**: Data protection and encryption

### Network Scenarios
1. **Online → Offline**: Network disconnection during operations
2. **Offline → Online**: Network restoration and retry logic
3. **WiFi ↔ Cellular**: Network type transitions
4. **Intermittent**: Unstable network conditions
5. **Quality Changes**: Performance adaptation
6. **Error Conditions**: DNS, SSL, proxy failures

### Session Scenarios
1. **App Restart**: Session restoration after restart
2. **Data Corruption**: Recovery from corrupted data
3. **Token Expiry**: Automatic token refresh and cleanup
4. **Background Validation**: Periodic session checks
5. **Recovery Service**: Session recovery service integration

### Error Scenarios
1. **Network Errors**: Timeout, DNS, SSL failures
2. **Server Errors**: 4xx, 5xx response handling
3. **Storage Errors**: SecureStore and AsyncStorage failures
4. **Service Errors**: Authentication service failures
5. **Data Errors**: Validation and corruption handling

## 📈 Performance Benchmarks

### Response Time Targets
- **Login Flow**: < 3 seconds (including network)
- **Session Validation**: < 500ms (local)
- **Token Refresh**: < 2 seconds (network dependent)
- **Logout Flow**: < 1 second (local cleanup)
- **Session Recovery**: < 1 second (from storage)

### Concurrency Handling
- **Concurrent Logins**: Up to 5 simultaneous attempts
- **Rapid Operations**: Login/logout cycles without memory leaks
- **Memory Pressure**: Stable operation under memory constraints

## 🛡️ Security Testing

### Data Protection
- ✅ **Sensitive Data Logging**: No passwords/tokens in logs
- ✅ **Storage Encryption**: All sensitive data encrypted
- ✅ **Data Integrity**: Checksum validation
- ✅ **Session Security**: Proper session invalidation

### Authentication Security
- ✅ **Token Validation**: JWT structure and expiration
- ✅ **Session Validation**: Server-side validation
- ✅ **Credential Protection**: No credential exposure
- ✅ **Error Sanitization**: No sensitive data in errors

## 🐛 Common Issues and Solutions

### Test Environment Issues
- **Mock Setup**: Ensure all React Native modules are mocked
- **Network State**: Reset network state between tests
- **Storage Cleanup**: Clear storage before each test
- **Async Operations**: Proper async/await handling

### Integration Issues
- **Service Dependencies**: Mock all external services
- **State Management**: Reset stores between tests
- **Network Simulation**: Use proper network state simulation
- **Error Handling**: Test both success and failure paths

### Performance Issues
- **Test Timeouts**: Increase timeout for slow operations
- **Memory Leaks**: Clean up resources after tests
- **Concurrent Tests**: Run integration tests sequentially

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Integration Testing Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Authentication Flow Documentation](../../../docs/auth-flow.md)
- [Network Handling Guide](../../../docs/network-handling.md)

---

**Last Updated**: January 2025  
**Test Coverage**: 75%+ required  
**Maintainer**: CrediBowpi Development Team
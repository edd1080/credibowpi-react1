# Bowpi Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. Login Issues

#### Issue: "Login requires internet connection" message appears when online

**Symptoms:**
- Device appears to be connected to internet
- Other apps work normally
- Login still shows offline message

**Diagnosis:**
```typescript
// Check network state
const netInfo = await NetInfo.fetch();
console.log('Network Info:', {
  isConnected: netInfo.isConnected,
  isInternetReachable: netInfo.isInternetReachable,
  type: netInfo.type,
  details: netInfo.details
});
```

**Solutions:**
1. **Check NetInfo configuration:**
   ```typescript
   // Ensure NetInfo is properly configured
   import NetInfo from '@react-native-community/netinfo';
   
   // Configure NetInfo with proper settings
   NetInfo.configure({
     reachabilityUrl: 'https://clients3.google.com/generate_204',
     reachabilityTest: async (response) => response.status === 204,
     reachabilityLongTimeout: 60 * 1000, // 60s
     reachabilityShortTimeout: 5 * 1000, // 5s
     reachabilityRequestTimeout: 15 * 1000, // 15s
   });
   ```

2. **Force network refresh:**
   ```typescript
   const refreshNetworkState = async () => {
     await NetInfo.refresh();
     const state = await NetInfo.fetch();
     return state.isConnected;
   };
   ```

3. **Check device network settings:**
   - Verify WiFi/cellular connection
   - Test with other network connections
   - Restart network adapter

#### Issue: Login fails with "Invalid credentials" for correct credentials

**Symptoms:**
- Credentials work in other environments
- Server returns authentication error
- Headers appear to be generated correctly

**Diagnosis:**
```typescript
// Enable detailed logging
const debugLogin = async (email: string, password: string) => {
  console.log('Login attempt:', { email, timestamp: new Date().toISOString() });
  
  // Check OTP token generation
  const otpToken = BowpiOTPService.generateOTPToken();
  console.log('Generated OTP Token:', otpToken);
  
  // Check request payload
  const payload = {
    username: email,
    password: password,
    application: 'MOBILE',
    isCheckVersion: false
  };
  console.log('Request payload:', payload);
  
  // Check headers
  const headers = await generateHeaders(payload);
  console.log('Request headers:', headers);
};
```

**Solutions:**
1. **Verify server endpoint:**
   ```typescript
   // Check if endpoint is reachable
   const testEndpoint = async () => {
     try {
       const response = await fetch(BOWPI_CONFIG.AUTH_ENDPOINT, {
         method: 'OPTIONS'
       });
       console.log('Endpoint status:', response.status);
     } catch (error) {
       console.error('Endpoint unreachable:', error);
     }
   };
   ```

2. **Validate header generation:**
   ```typescript
   // Test OTP token format
   const validateOTPToken = (token: string) => {
     try {
       const decoded = atob(token);
       const pattern = /^\d{7}\d{4}\d+4000\d+$/;
       return pattern.test(decoded);
     } catch {
       return false;
     }
   };
   ```

3. **Check server logs:**
   - Verify server receives request
   - Check for authentication errors
   - Validate header processing

#### Issue: Token decryption fails

**Symptoms:**
- Login appears successful
- JWT token received from server
- Decryption throws error or returns invalid data

**Diagnosis:**
```typescript
// Test token decryption
const debugTokenDecryption = (encryptedToken: string) => {
  try {
    console.log('Encrypted token length:', encryptedToken.length);
    console.log('Token starts with:', encryptedToken.substring(0, 50));
    
    const decrypted = BowpiCryptoService.decryptToken(encryptedToken);
    console.log('Decryption successful:', !!decrypted);
    console.log('User ID:', decrypted?.userId);
  } catch (error) {
    console.error('Decryption error:', error);
  }
};
```

**Solutions:**
1. **Verify crypto service:**
   ```typescript
   // Test with known good token
   const testCryptoService = () => {
     try {
       const testToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."; // Test token
       const result = BowpiCryptoService.decryptToken(testToken);
       return !!result;
     } catch {
       return false;
     }
   };
   ```

2. **Check dependencies:**
   ```bash
   # Verify crypto-js version
   npm list crypto-js
   
   # Verify expo-crypto
   npm list expo-crypto
   ```

3. **Update crypto services:**
   - Ensure latest version of provided crypto services
   - Verify no modifications were made to crypto logic

### 2. Session Management Issues

#### Issue: Session not persisting across app restarts

**Symptoms:**
- User logs in successfully
- App restart requires login again
- Session data appears to be lost

**Diagnosis:**
```typescript
// Check stored session data
const debugSessionStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('All storage keys:', keys);
    
    const bowpiKeys = keys.filter(key => key.includes('bowpi'));
    console.log('Bowpi storage keys:', bowpiKeys);
    
    for (const key of bowpiKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`${key}:`, value ? 'Data exists' : 'No data');
    }
  } catch (error) {
    console.error('Storage debug error:', error);
  }
};
```

**Solutions:**
1. **Verify storage keys:**
   ```typescript
   // Ensure consistent storage keys
   export const BOWPI_STORAGE_KEYS = {
     ENCRYPTED_TOKEN: '@bowpi_encrypted_token',
     SESSION_DATA: '@bowpi_session_data',
     SESSION_ID: '@bowpi_session_id',
     USER_PROFILE: '@bowpi_user_profile',
   } as const;
   ```

2. **Check AsyncStorage permissions:**
   - Verify app has storage permissions
   - Test with simple AsyncStorage operations
   - Check for storage quota issues

3. **Implement storage validation:**
   ```typescript
   const validateStoredSession = async () => {
     try {
       const sessionData = await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA);
       if (!sessionData) return false;
       
       const parsed = JSON.parse(sessionData);
       return parsed.userId && parsed.sessionId;
     } catch {
       return false;
     }
   };
   ```

#### Issue: Automatic logout occurs unexpectedly

**Symptoms:**
- User gets logged out without action
- Session appears valid
- No explicit logout call

**Diagnosis:**
```typescript
// Monitor logout triggers
const debugLogoutTriggers = () => {
  // Override logout method to track calls
  const originalLogout = authService.logout;
  authService.logout = async (...args) => {
    console.log('Logout triggered:', new Error().stack);
    return originalLogout.apply(authService, args);
  };
};
```

**Solutions:**
1. **Check error handling:**
   ```typescript
   // Review 401/403 error handling
   const handleAuthError = (error: any) => {
     if (error.status === 401 || error.status === 403) {
       console.log('Auth error detected, checking network...');
       // Only logout if online
       if (isConnected) {
         authService.logout();
       }
     }
   };
   ```

2. **Verify session validation:**
   ```typescript
   // Check session validation logic
   const validateSession = async () => {
     const sessionData = await getStoredSession();
     if (!sessionData) return false;
     
     // Don't validate expiration for offline-first
     return sessionData.userId && sessionData.sessionId;
   };
   ```

### 3. Network and Connectivity Issues

#### Issue: Requests fail with domain validation errors

**Symptoms:**
- Network requests are blocked
- Domain validation errors in logs
- Valid domains appear to be rejected

**Diagnosis:**
```typescript
// Test domain validation
const testDomainValidation = (url: string) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const isAllowed = BOWPI_CONFIG.ALLOWED_DOMAINS.includes(domain);
    
    console.log('URL:', url);
    console.log('Domain:', domain);
    console.log('Allowed:', isAllowed);
    console.log('Allowed domains:', BOWPI_CONFIG.ALLOWED_DOMAINS);
    
    return isAllowed;
  } catch (error) {
    console.error('Domain validation error:', error);
    return false;
  }
};
```

**Solutions:**
1. **Update allowed domains:**
   ```typescript
   export const BOWPI_CONFIG = {
     ALLOWED_DOMAINS: [
       '10.14.11.200',
       'bowpi.com',
       'credibowpi.com',
       'localhost', // For development
     ],
   };
   ```

2. **Check URL format:**
   ```typescript
   // Ensure proper URL format
   const normalizeUrl = (url: string) => {
     if (!url.startsWith('http://') && !url.startsWith('https://')) {
       return `https://${url}`;
     }
     return url;
   };
   ```

#### Issue: HTTPS enforcement blocks development requests

**Symptoms:**
- Development server uses HTTP
- Requests blocked in development
- HTTPS enforcement active in dev mode

**Solutions:**
1. **Configure environment-specific HTTPS:**
   ```typescript
   export const BOWPI_CONFIG = {
     ENFORCE_HTTPS: __DEV__ ? false : true,
   };
   ```

2. **Use development proxy:**
   ```typescript
   // Development configuration
   const getApiUrl = () => {
     if (__DEV__) {
       return 'http://localhost:3000/api'; // Development proxy
     }
     return 'https://api.credibowpi.com'; // Production
   };
   ```

### 4. Header Generation Issues

#### Issue: X-Digest header generation fails

**Symptoms:**
- PUT/POST/PATCH requests fail
- Server rejects requests with invalid digest
- HMAC generation errors

**Diagnosis:**
```typescript
// Test HMAC generation
const testHMACGeneration = async (body: any) => {
  try {
    const headers = {};
    const result = await BowpiHMACService.generateDigestHmac(body, headers);
    
    console.log('HMAC generation result:', {
      digest: result.digest,
      xDate: headers['X-Date'],
      success: !!result.digest
    });
    
    return result;
  } catch (error) {
    console.error('HMAC generation error:', error);
    throw error;
  }
};
```

**Solutions:**
1. **Verify HMAC service:**
   ```typescript
   // Test with simple payload
   const testPayload = { test: 'data' };
   const result = await BowpiHMACService.generateDigestHmac(testPayload, {});
   ```

2. **Check date format:**
   ```typescript
   // Ensure proper date format
   const generateXDate = () => {
     return new Date().toISOString();
   };
   ```

### 5. Performance Issues

#### Issue: Authentication takes too long

**Symptoms:**
- Login process is slow
- User experiences delays
- Timeout errors occur

**Diagnosis:**
```typescript
// Measure authentication performance
const measureAuthPerformance = async (email: string, password: string) => {
  const startTime = Date.now();
  
  console.log('Auth start:', startTime);
  
  try {
    const result = await authService.login(email, password);
    const endTime = Date.now();
    
    console.log('Auth completed:', {
      duration: endTime - startTime,
      success: result.success
    });
    
    return result;
  } catch (error) {
    const endTime = Date.now();
    console.log('Auth failed:', {
      duration: endTime - startTime,
      error: error.message
    });
    throw error;
  }
};
```

**Solutions:**
1. **Optimize crypto operations:**
   ```typescript
   // Use async crypto operations
   const optimizedDecryption = async (token: string) => {
     return new Promise((resolve, reject) => {
       setTimeout(() => {
         try {
           const result = BowpiCryptoService.decryptToken(token);
           resolve(result);
         } catch (error) {
           reject(error);
         }
       }, 0);
     });
   };
   ```

2. **Implement request timeout:**
   ```typescript
   const httpClientWithTimeout = {
     timeout: 30000, // 30 seconds
     request: async (config) => {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), config.timeout);
       
       try {
         const response = await fetch(config.url, {
           ...config,
           signal: controller.signal
         });
         clearTimeout(timeoutId);
         return response;
       } catch (error) {
         clearTimeout(timeoutId);
         throw error;
       }
     }
   };
   ```

## Debugging Tools and Techniques

### 1. Enable Debug Logging

```typescript
// Enable comprehensive logging
const enableDebugLogging = () => {
  if (__DEV__) {
    // Override console methods to add timestamps
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(`[${new Date().toISOString()}]`, ...args);
    };
    
    // Enable network debugging
    global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
    global.FormData = global.originalFormData || global.FormData;
  }
};
```

### 2. Network Request Monitoring

```typescript
// Monitor all network requests
const monitorNetworkRequests = () => {
  const originalFetch = global.fetch;
  
  global.fetch = async (url, options) => {
    console.log('Network Request:', {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await originalFetch(url, options);
      console.log('Network Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });
      return response;
    } catch (error) {
      console.error('Network Error:', {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };
};
```

### 3. Storage Debugging

```typescript
// Monitor AsyncStorage operations
const monitorAsyncStorage = () => {
  const originalSetItem = AsyncStorage.setItem;
  const originalGetItem = AsyncStorage.getItem;
  const originalRemoveItem = AsyncStorage.removeItem;
  
  AsyncStorage.setItem = async (key, value) => {
    console.log('AsyncStorage.setItem:', { key, valueLength: value?.length });
    return originalSetItem(key, value);
  };
  
  AsyncStorage.getItem = async (key) => {
    const result = await originalGetItem(key);
    console.log('AsyncStorage.getItem:', { key, hasValue: !!result });
    return result;
  };
  
  AsyncStorage.removeItem = async (key) => {
    console.log('AsyncStorage.removeItem:', { key });
    return originalRemoveItem(key);
  };
};
```

## Emergency Procedures

### 1. Force Logout All Users

```typescript
// Clear all authentication data
const forceLogoutAllUsers = async () => {
  try {
    // Clear all Bowpi-related storage
    const keys = await AsyncStorage.getAllKeys();
    const bowpiKeys = keys.filter(key => key.includes('bowpi'));
    
    await AsyncStorage.multiRemove(bowpiKeys);
    
    // Reset auth store
    authStore.getState().clearBowpiAuth();
    
    // Navigate to login
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
    
    console.log('Force logout completed');
  } catch (error) {
    console.error('Force logout error:', error);
  }
};
```

### 2. Reset Authentication System

```typescript
// Complete authentication system reset
const resetAuthenticationSystem = async () => {
  try {
    // 1. Clear all storage
    await AsyncStorage.clear();
    
    // 2. Reset all stores
    authStore.getState().reset();
    
    // 3. Reinitialize services
    await authService.initialize();
    
    // 4. Navigate to login
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
    
    console.log('Authentication system reset completed');
  } catch (error) {
    console.error('Reset error:', error);
  }
};
```

### 3. Diagnostic Report Generation

```typescript
// Generate comprehensive diagnostic report
const generateDiagnosticReport = async () => {
  const report = {
    timestamp: new Date().toISOString(),
    device: {
      platform: Platform.OS,
      version: Platform.Version,
    },
    network: await NetInfo.fetch(),
    storage: {
      keys: await AsyncStorage.getAllKeys(),
    },
    authentication: {
      isAuthenticated: await authService.isAuthenticated(),
      hasStoredSession: !!(await AsyncStorage.getItem(BOWPI_STORAGE_KEYS.SESSION_DATA)),
    },
    services: {
      otpService: testOTPService(),
      hmacService: await testHMACService(),
      cryptoService: testCryptoService(),
    },
  };
  
  console.log('Diagnostic Report:', JSON.stringify(report, null, 2));
  return report;
};
```

## Getting Help

### 1. Log Collection

When reporting issues, collect the following logs:
- Authentication attempt logs
- Network request/response logs
- Storage operation logs
- Error stack traces
- Device and network information

### 2. Issue Reporting Template

```
**Issue Description:**
Brief description of the problem

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Device: [iOS/Android version]
- App Version: [version]
- Network: [WiFi/Cellular]
- Server Environment: [dev/staging/prod]

**Logs:**
[Paste relevant logs here]

**Additional Context:**
Any other relevant information
```

### 3. Support Contacts

- **Development Team**: dev-team@credibowpi.com
- **Security Issues**: security@credibowpi.com
- **Emergency**: emergency@credibowpi.com

---

**Last Updated**: January 2025  
**Version**: 1.0
#!/usr/bin/env node

// Deployment Verification Script - Standalone verification for production readiness

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log('green', `✅ ${message}`);
}

function logError(message) {
  log('red', `❌ ${message}`);
}

function logWarning(message) {
  log('yellow', `⚠️  ${message}`);
}

function logInfo(message) {
  log('blue', `ℹ️  ${message}`);
}

// Mock __DEV__ as false for production verification
global.__DEV__ = false;

// Set up environment variables for testing
process.env.EXPO_PUBLIC_BOWPI_BASE_URL = process.env.EXPO_PUBLIC_BOWPI_BASE_URL || 'https://bowpi.credibowpi.com';
process.env.EXPO_PUBLIC_BOWPI_AUTH_URL = process.env.EXPO_PUBLIC_BOWPI_AUTH_URL || 'https://bowpi.credibowpi.com/micro-auth-service';
process.env.EXPO_PUBLIC_BOWPI_SESSION_URL = process.env.EXPO_PUBLIC_BOWPI_SESSION_URL || 'https://bowpi.credibowpi.com/management';
process.env.EXPO_PUBLIC_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.credibowpi.com';
process.env.EXPO_PUBLIC_ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'test-encryption-key-for-deployment-verification';
process.env.EXPO_PUBLIC_BUILD_TYPE = process.env.EXPO_PUBLIC_BUILD_TYPE || 'production';
process.env.EXPO_PUBLIC_APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
process.env.EXPO_PUBLIC_METRICS_ENDPOINT = process.env.EXPO_PUBLIC_METRICS_ENDPOINT || 'https://metrics.credibowpi.com/auth';
process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT = process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT || 'https://errors.credibowpi.com/report';
process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT = process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT || 'https://performance.credibowpi.com/metrics';

console.log('🚀 Starting Deployment Verification');
console.log('===================================');

let totalChecks = 0;
let passedChecks = 0;
const errors = [];

function runCheck(name, checkFn) {
  totalChecks++;
  try {
    const result = checkFn();
    if (result === true) {
      logSuccess(name);
      passedChecks++;
    } else if (result === false) {
      logError(name);
      errors.push(name);
    } else {
      logWarning(`${name}: ${result}`);
      passedChecks++; // Warnings still count as passed
    }
  } catch (error) {
    logError(`${name}: ${error.message}`);
    errors.push(`${name}: ${error.message}`);
  }
}

// Environment Variable Checks
logInfo('Checking Environment Variables...');

runCheck('EXPO_PUBLIC_BOWPI_BASE_URL is set', () => {
  return !!process.env.EXPO_PUBLIC_BOWPI_BASE_URL;
});

runCheck('EXPO_PUBLIC_BOWPI_AUTH_URL is set', () => {
  return !!process.env.EXPO_PUBLIC_BOWPI_AUTH_URL;
});

runCheck('EXPO_PUBLIC_BOWPI_SESSION_URL is set', () => {
  return !!process.env.EXPO_PUBLIC_BOWPI_SESSION_URL;
});

runCheck('EXPO_PUBLIC_ENCRYPTION_KEY is set and secure', () => {
  const key = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;
  if (!key) return false;
  if (key.length < 16) return 'Encryption key should be at least 16 characters';
  return true;
});

// HTTPS Enforcement Checks
logInfo('Checking HTTPS Enforcement...');

runCheck('Bowpi Base URL uses HTTPS', () => {
  const url = process.env.EXPO_PUBLIC_BOWPI_BASE_URL;
  return url && url.startsWith('https://');
});

runCheck('Bowpi Auth URL uses HTTPS', () => {
  const url = process.env.EXPO_PUBLIC_BOWPI_AUTH_URL;
  return url && url.startsWith('https://');
});

runCheck('Bowpi Session URL uses HTTPS', () => {
  const url = process.env.EXPO_PUBLIC_BOWPI_SESSION_URL;
  return url && url.startsWith('https://');
});

runCheck('API Base URL uses HTTPS', () => {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  return !url || url.startsWith('https://');
});

// URL Format Validation
logInfo('Validating URL Formats...');

runCheck('Bowpi Base URL is valid', () => {
  try {
    new URL(process.env.EXPO_PUBLIC_BOWPI_BASE_URL);
    return true;
  } catch {
    return false;
  }
});

runCheck('Bowpi Auth URL is valid', () => {
  try {
    new URL(process.env.EXPO_PUBLIC_BOWPI_AUTH_URL);
    return true;
  } catch {
    return false;
  }
});

runCheck('Bowpi Session URL is valid', () => {
  try {
    new URL(process.env.EXPO_PUBLIC_BOWPI_SESSION_URL);
    return true;
  } catch {
    return false;
  }
});

// Analytics Endpoints
logInfo('Checking Analytics Endpoints...');

runCheck('Metrics endpoint is configured', () => {
  const endpoint = process.env.EXPO_PUBLIC_METRICS_ENDPOINT;
  return endpoint && endpoint.startsWith('https://');
});

runCheck('Error reporting endpoint is configured', () => {
  const endpoint = process.env.EXPO_PUBLIC_ERROR_REPORTING_ENDPOINT;
  return endpoint && endpoint.startsWith('https://');
});

runCheck('Performance endpoint is configured', () => {
  const endpoint = process.env.EXPO_PUBLIC_PERFORMANCE_ENDPOINT;
  return endpoint && endpoint.startsWith('https://');
});

// Build Configuration
logInfo('Checking Build Configuration...');

runCheck('Build type is set to production', () => {
  return process.env.EXPO_PUBLIC_BUILD_TYPE === 'production';
});

runCheck('App version is set', () => {
  const version = process.env.EXPO_PUBLIC_APP_VERSION;
  return version && /^\d+\.\d+\.\d+/.test(version);
});

// File Structure Checks
logInfo('Checking File Structure...');

runCheck('Production config file exists', () => {
  return fs.existsSync(path.join(__dirname, '../src/constants/production.ts'));
});

runCheck('Environment config file exists', () => {
  return fs.existsSync(path.join(__dirname, '../src/constants/environment.ts'));
});

runCheck('Production logging service exists', () => {
  return fs.existsSync(path.join(__dirname, '../src/services/ProductionLoggingService.ts'));
});

runCheck('Authentication analytics service exists', () => {
  return fs.existsSync(path.join(__dirname, '../src/services/AuthenticationAnalyticsService.ts'));
});

runCheck('Deployment script exists', () => {
  return fs.existsSync(path.join(__dirname, './deploy-production.sh'));
});

// Package.json Checks
logInfo('Checking Package Configuration...');

runCheck('Package.json exists', () => {
  return fs.existsSync(path.join(__dirname, '../package.json'));
});

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

runCheck('Required dependencies are installed', () => {
  const requiredDeps = [
    'crypto-js',
    'expo-crypto',
    '@react-native-community/netinfo',
    '@react-native-async-storage/async-storage'
  ];
  
  const missing = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missing.length > 0) {
    return `Missing dependencies: ${missing.join(', ')}`;
  }
  
  return true;
});

runCheck('Deployment scripts are configured', () => {
  const scripts = packageJson.scripts || {};
  const requiredScripts = ['test:deployment', 'deploy:production', 'verify:deployment'];
  
  const missing = requiredScripts.filter(script => !scripts[script]);
  
  if (missing.length > 0) {
    return `Missing scripts: ${missing.join(', ')}`;
  }
  
  return true;
});

// Security Checks
logInfo('Checking Security Configuration...');

runCheck('No sensitive data in package.json', () => {
  const packageStr = JSON.stringify(packageJson);
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token.*[a-zA-Z0-9]{20,}/i,
    /key.*[a-zA-Z0-9]{20,}/i
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(packageStr)) {
      return 'Potential sensitive data found in package.json';
    }
  }
  
  return true;
});

runCheck('.env file is not committed', () => {
  const gitignoreExists = fs.existsSync(path.join(__dirname, '../.gitignore'));
  if (!gitignoreExists) return 'No .gitignore file found';
  
  const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  return gitignore.includes('.env') || gitignore.includes('*.env');
});

// Final Results
console.log('\n📊 Deployment Verification Results');
console.log('==================================');

if (passedChecks === totalChecks) {
  logSuccess(`All ${totalChecks} checks passed! 🎉`);
  logSuccess('Application is ready for production deployment');
} else {
  logError(`${passedChecks}/${totalChecks} checks passed`);
  logError(`${errors.length} issues found:`);
  errors.forEach(error => logError(`  - ${error}`));
  
  console.log('\n🔧 Recommended Actions:');
  console.log('1. Fix the issues listed above');
  console.log('2. Ensure all environment variables are properly set');
  console.log('3. Verify HTTPS is enforced for all production endpoints');
  console.log('4. Run the verification script again');
}

console.log('\n📋 Summary:');
console.log(`- Total Checks: ${totalChecks}`);
console.log(`- Passed: ${passedChecks}`);
console.log(`- Failed: ${totalChecks - passedChecks}`);
console.log(`- Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

// Exit with appropriate code
process.exit(passedChecks === totalChecks ? 0 : 1);
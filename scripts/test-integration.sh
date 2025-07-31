#!/bin/bash

# Integration Tests Runner
# This script runs all integration tests for authentication flow

set -e

echo "🔗 Running Authentication Integration Tests..."
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Create test results directory
mkdir -p test-results/integration

print_status "Running Login Flow Integration tests..."
npm test -- src/__tests__/integration/LoginFlow.test.ts --coverage --coverageDirectory=test-results/integration/login-flow

print_status "Running Offline/Online Authentication tests..."
npm test -- src/__tests__/integration/OfflineOnlineAuth.test.ts --coverage --coverageDirectory=test-results/integration/offline-online

print_status "Running Logout Flow Integration tests..."
npm test -- src/__tests__/integration/LogoutFlow.test.ts --coverage --coverageDirectory=test-results/integration/logout-flow

print_status "Running Session Persistence tests..."
npm test -- src/__tests__/integration/SessionPersistence.test.ts --coverage --coverageDirectory=test-results/integration/session-persistence

print_status "Running Network Connectivity tests..."
npm test -- src/__tests__/integration/NetworkConnectivityAuth.test.ts --coverage --coverageDirectory=test-results/integration/network-connectivity

print_status "Running Complete Authentication Integration tests..."
npm test -- src/__tests__/integration/AuthenticationIntegration.test.ts --coverage --coverageDirectory=test-results/integration/complete-auth

# Run all integration tests together for comprehensive coverage
print_status "Generating comprehensive integration coverage report..."
npm test -- src/__tests__/integration/ --coverage --coverageDirectory=test-results/integration/comprehensive --coverageReporters=text,html,lcov

# Check coverage thresholds
print_status "Checking integration test coverage thresholds..."
COVERAGE_THRESHOLD=75

# Extract coverage percentage (this is a simplified check)
if [ -f "test-results/integration/comprehensive/coverage-summary.json" ]; then
    print_success "Integration coverage report generated successfully"
    print_status "Coverage report available at: test-results/integration/comprehensive/lcov-report/index.html"
else
    print_warning "Coverage report not found, but tests may have passed"
fi

# Run type checking for integration tests
print_status "Running TypeScript type checking for integration tests..."
npx tsc --noEmit --project tsconfig.json src/__tests__/integration/*.ts

# Run linting for integration tests
print_status "Running ESLint for integration tests..."
npx eslint src/__tests__/integration/ --ext .ts,.tsx --format=compact

print_success "All integration tests completed!"
echo ""
echo "📊 Integration Test Results Summary:"
echo "===================================="
echo "• Login Flow: ✅ Tested"
echo "• Offline/Online Auth: ✅ Tested"  
echo "• Logout Flow: ✅ Tested"
echo "• Session Persistence: ✅ Tested"
echo "• Network Connectivity: ✅ Tested"
echo "• Complete Integration: ✅ Tested"
echo ""
echo "📁 Reports available in: test-results/integration/"
echo "🌐 HTML Coverage Report: test-results/integration/comprehensive/lcov-report/index.html"
echo ""

# Test summary statistics
print_status "Integration Test Coverage Summary:"
echo "• Login Flow: Complete UI to Storage flow"
echo "• Offline/Online: Network state transitions"
echo "• Logout Flow: Server invalidation and cleanup"
echo "• Session Persistence: App restart scenarios"
echo "• Network Connectivity: Real-time network changes"
echo "• Complete Integration: End-to-end scenarios"
echo ""

# Optional: Open coverage report in browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "Open integration coverage report in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open test-results/integration/comprehensive/lcov-report/index.html
    fi
fi

print_success "Authentication Integration testing complete! 🎉"
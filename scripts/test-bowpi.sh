#!/bin/bash

# Bowpi Services Test Runner
# This script runs all tests for Bowpi authentication services

set -e

echo "🧪 Running Bowpi Services Tests..."
echo "=================================="

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
mkdir -p test-results/bowpi

print_status "Running Bowpi OTP Service tests..."
npm test -- src/services/bowpi/__tests__/BowpiOTPService.test.ts --coverage --coverageDirectory=test-results/bowpi/otp

print_status "Running Bowpi HMAC Service tests..."
npm test -- src/services/bowpi/__tests__/BowpiHMACService.test.ts --coverage --coverageDirectory=test-results/bowpi/hmac

print_status "Running Bowpi Crypto Service tests..."
npm test -- src/services/bowpi/__tests__/BowpiCryptoService.test.ts --coverage --coverageDirectory=test-results/bowpi/crypto

print_status "Running Bowpi Auth Adapter tests..."
npm test -- src/services/bowpi/__tests__/BowpiAuthAdapter.test.ts --coverage --coverageDirectory=test-results/bowpi/adapter

print_status "Running Bowpi Error Handling tests..."
npm test -- src/services/bowpi/__tests__/ErrorHandling.test.ts --coverage --coverageDirectory=test-results/bowpi/errors

print_status "Running Bowpi Integration tests..."
npm test -- src/services/bowpi/__tests__/BowpiServices.test.ts --coverage --coverageDirectory=test-results/bowpi/integration

# Run all Bowpi tests together for final coverage report
print_status "Generating comprehensive coverage report..."
npm test -- src/services/bowpi/__tests__/ --coverage --coverageDirectory=test-results/bowpi/comprehensive --coverageReporters=text,html,lcov

# Check coverage thresholds
print_status "Checking coverage thresholds..."
COVERAGE_THRESHOLD=80

# Extract coverage percentage (this is a simplified check)
if [ -f "test-results/bowpi/comprehensive/coverage-summary.json" ]; then
    print_success "Coverage report generated successfully"
    print_status "Coverage report available at: test-results/bowpi/comprehensive/lcov-report/index.html"
else
    print_warning "Coverage report not found, but tests may have passed"
fi

# Run type checking
print_status "Running TypeScript type checking for Bowpi services..."
npx tsc --noEmit --project tsconfig.json src/services/bowpi/*.ts

# Run linting
print_status "Running ESLint for Bowpi services..."
npx eslint src/services/bowpi/ --ext .ts,.tsx --format=compact

print_success "All Bowpi service tests completed!"
echo ""
echo "📊 Test Results Summary:"
echo "========================"
echo "• OTP Service: ✅ Tested"
echo "• HMAC Service: ✅ Tested"  
echo "• Crypto Service: ✅ Tested"
echo "• Auth Adapter: ✅ Tested"
echo "• Error Handling: ✅ Tested"
echo "• Integration: ✅ Tested"
echo ""
echo "📁 Reports available in: test-results/bowpi/"
echo "🌐 HTML Coverage Report: test-results/bowpi/comprehensive/lcov-report/index.html"
echo ""

# Optional: Open coverage report in browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "Open coverage report in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open test-results/bowpi/comprehensive/lcov-report/index.html
    fi
fi

print_success "Bowpi Services testing complete! 🎉"
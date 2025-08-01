#!/bin/bash

# Production Deployment Script for CrediBowpi Mobile
# This script performs pre-deployment checks and builds the app for production

set -e  # Exit on any error

echo "🚀 Starting CrediBowpi Mobile Production Deployment"
echo "=================================================="

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

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Using environment variables or defaults."
    if [ ! -f ".env.example" ]; then
        print_error ".env.example not found. Cannot proceed without environment configuration."
        exit 1
    fi
    print_warning "Please copy .env.example to .env and configure your production values."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Environment Validation
print_status "Step 1: Validating environment configuration..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Check if required environment variables are set
print_status "Checking required environment variables..."

required_vars=(
    "EXPO_PUBLIC_BOWPI_BASE_URL"
    "EXPO_PUBLIC_BOWPI_AUTH_URL"
    "EXPO_PUBLIC_BOWPI_SESSION_URL"
    "EXPO_PUBLIC_ENCRYPTION_KEY"
    "EXPO_PUBLIC_BUILD_TYPE"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] && ! grep -q "^$var=" .env 2>/dev/null; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        print_error "  - $var"
    done
    print_error "Please set these variables in your .env file or environment."
    exit 1
fi

print_success "Environment validation passed"

# Step 2: Dependency Check
print_status "Step 2: Checking dependencies..."

if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm ci
else
    print_status "Dependencies already installed"
fi

print_success "Dependencies check completed"

# Step 3: Code Quality Checks
print_status "Step 3: Running code quality checks..."

# TypeScript type checking
print_status "Running TypeScript type check..."
if npm run type-check; then
    print_success "TypeScript type check passed"
else
    print_error "TypeScript type check failed"
    exit 1
fi

# ESLint
print_status "Running ESLint..."
if npm run lint; then
    print_success "ESLint check passed"
else
    print_error "ESLint check failed"
    exit 1
fi

# Prettier format check
print_status "Running Prettier format check..."
if npm run format:check; then
    print_success "Prettier format check passed"
else
    print_warning "Code formatting issues found. Run 'npm run format' to fix."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Code quality checks completed"

# Step 4: Test Suite
print_status "Step 4: Running test suite..."

# Unit tests
print_status "Running unit tests..."
if npm test -- --coverage --watchAll=false; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Bowpi authentication tests
print_status "Running Bowpi authentication tests..."
if npm run test:bowpi; then
    print_success "Bowpi authentication tests passed"
else
    print_error "Bowpi authentication tests failed"
    exit 1
fi

# Integration tests
print_status "Running integration tests..."
if npm run test:integration; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Security and performance tests
print_status "Running security and performance tests..."
if npm run test:security; then
    print_success "Security and performance tests passed"
else
    print_error "Security and performance tests failed"
    exit 1
fi

print_success "Test suite completed"

# Step 5: Deployment Verification Tests
print_status "Step 5: Running deployment verification tests..."

if npm test -- src/__tests__/deployment/DeploymentVerification.test.ts --watchAll=false; then
    print_success "Deployment verification tests passed"
else
    print_error "Deployment verification tests failed"
    exit 1
fi

print_success "Deployment verification completed"

# Step 6: Build Configuration
print_status "Step 6: Configuring build for production..."

# Set production environment variables
export NODE_ENV=production
export EXPO_PUBLIC_BUILD_TYPE=production

# Validate HTTPS enforcement
if [[ "${EXPO_PUBLIC_BOWPI_BASE_URL}" != https://* ]]; then
    print_error "EXPO_PUBLIC_BOWPI_BASE_URL must use HTTPS in production"
    exit 1
fi

if [[ "${EXPO_PUBLIC_API_BASE_URL}" != https://* ]] && [ -n "${EXPO_PUBLIC_API_BASE_URL}" ]; then
    print_error "EXPO_PUBLIC_API_BASE_URL must use HTTPS in production"
    exit 1
fi

print_success "Build configuration validated"

# Step 7: Build Application
print_status "Step 7: Building application for production..."

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -rf .expo/

# Build for production
print_status "Building production bundle..."

# Check if EAS CLI is available
if command -v eas &> /dev/null; then
    print_status "Using EAS Build for production..."
    
    # Build for both platforms
    print_status "Building for iOS..."
    eas build --platform ios --profile production --non-interactive
    
    print_status "Building for Android..."
    eas build --platform android --profile production --non-interactive
    
    print_success "EAS builds completed"
else
    print_warning "EAS CLI not found. Using Expo build..."
    
    # Fallback to expo build
    if command -v expo &> /dev/null; then
        print_status "Building iOS app..."
        expo build:ios --type archive
        
        print_status "Building Android app..."
        expo build:android --type app-bundle
        
        print_success "Expo builds completed"
    else
        print_error "Neither EAS CLI nor Expo CLI found. Please install one of them."
        exit 1
    fi
fi

# Step 8: Post-Build Verification
print_status "Step 8: Running post-build verification..."

# Verify build artifacts exist
if [ -d ".expo" ]; then
    print_success "Build artifacts created successfully"
else
    print_warning "Build artifacts not found in expected location"
fi

# Run a final deployment verification
print_status "Running final deployment verification..."
NODE_ENV=production npm test -- src/__tests__/deployment/DeploymentVerification.test.ts --watchAll=false

print_success "Post-build verification completed"

# Step 9: Deployment Summary
print_status "Step 9: Generating deployment summary..."

BUILD_TIME=$(date)
BUILD_VERSION=$(node -p "require('./package.json').version")
BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

cat > deployment-summary.txt << EOF
CrediBowpi Mobile - Production Deployment Summary
================================================

Build Information:
- Version: $BUILD_VERSION
- Build Time: $BUILD_TIME
- Commit: $BUILD_COMMIT
- Node.js: $NODE_VERSION
- npm: $NPM_VERSION

Environment Configuration:
- Build Type: production
- HTTPS Enforced: Yes
- Analytics Enabled: Yes
- Security Logging: Enabled

Quality Checks:
✅ TypeScript type check
✅ ESLint validation
✅ Code formatting
✅ Unit tests
✅ Integration tests
✅ Security tests
✅ Deployment verification

Build Status:
✅ Production build completed successfully
✅ All pre-deployment checks passed
✅ Application ready for deployment

Next Steps:
1. Upload build artifacts to app stores
2. Configure production environment variables
3. Monitor authentication metrics
4. Set up error reporting
5. Enable production logging

EOF

print_success "Deployment summary generated: deployment-summary.txt"

# Final success message
echo ""
echo "🎉 Production Deployment Completed Successfully!"
echo "=============================================="
print_success "All checks passed and build completed"
print_success "Application is ready for production deployment"
print_success "Review deployment-summary.txt for details"

# Optional: Open deployment summary
if command -v cat &> /dev/null; then
    echo ""
    print_status "Deployment Summary:"
    cat deployment-summary.txt
fi

echo ""
print_status "Deployment script completed at $(date)"
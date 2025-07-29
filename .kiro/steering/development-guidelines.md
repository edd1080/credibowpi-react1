# Development Guidelines

## Overview

Este documento establece las pautas de desarrollo para el proyecto CrediBowpi Mobile, incluyendo estándares de código, procesos de desarrollo, y mejores prácticas.

## Code Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use strict typing
interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ Good: Use proper error handling
const fetchUser = async (id: string): Promise<UserData | null> => {
  try {
    const response = await api.getUser(id);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
};

// ❌ Bad: Using any type
const userData: any = await fetchUser(id);
```

### Component Structure

```typescript
// ✅ Good: Proper component structure
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/components/atoms';
import { colors, spacing } from '@/constants';

interface Props {
  title: string;
  onPress?: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Typography variant="h2">{title}</Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.space16,
    backgroundColor: colors.background.primary,
  },
});
```

### File Organization

```
src/
├── components/
│   ├── atoms/          # Basic UI elements
│   ├── molecules/      # Composite components
│   └── organisms/      # Complex components
├── screens/            # Screen components
├── services/           # Business logic
├── stores/             # State management
├── navigation/         # Navigation setup
├── types/              # TypeScript definitions
├── constants/          # Design tokens
├── hooks/              # Custom hooks
├── utils/              # Utility functions
└── features/           # Feature modules
```

## Development Process

### 1. Feature Development Workflow

1. **Spec Creation**: Follow the spec-driven development process
2. **Branch Strategy**: Create feature branches from `main`
3. **Implementation**: Implement one task at a time
4. **Testing**: Write tests for new functionality
5. **Code Review**: Submit PR for review
6. **Integration**: Merge to main after approval

### 2. Git Workflow

```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make commits with descriptive messages
git commit -m "feat: implement biometric authentication

- Add biometric authentication service
- Integrate with secure storage
- Add fallback to PIN authentication
- Update login screen with biometric option"

# Push and create PR
git push origin feature/user-authentication
```

### 3. Commit Message Format

```
type(scope): description

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Testing Standards

### Unit Testing

```typescript
// ✅ Good: Comprehensive test coverage
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing

```typescript
// ✅ Good: Test service integration
import { databaseService } from '../database';
import { syncService } from '../sync';

describe('Data Sync Integration', () => {
  beforeEach(async () => {
    await databaseService.initialize();
  });

  it('syncs pending applications to server', async () => {
    // Create test data
    const application = await databaseService.createApplication(testData);
    
    // Trigger sync
    await syncService.syncPendingApplications();
    
    // Verify sync status
    const syncedApp = await databaseService.getApplication(application.id);
    expect(syncedApp.syncStatus).toBe('synced');
  });
});
```

## Code Quality

### ESLint Configuration

```json
{
  "extends": ["expo", "@react-native-community"],
  "rules": {
    "prefer-const": "error",
    "no-var": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Performance Guidelines

### 1. Component Optimization

```typescript
// ✅ Good: Use React.memo for expensive components
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => processItem(item));
  }, [data]);

  return <View>{/* render processed data */}</View>;
});

// ✅ Good: Use useCallback for event handlers
const handlePress = useCallback(() => {
  onItemPress(item.id);
}, [item.id, onItemPress]);
```

### 2. Database Optimization

```typescript
// ✅ Good: Use transactions for multiple operations
await databaseService.transaction(async (tx) => {
  await tx.insertApplication(applicationData);
  await tx.insertDocuments(documents);
  await tx.updateSyncStatus(applicationId, 'pending');
});

// ✅ Good: Use indexes for frequent queries
await db.execAsync(`
  CREATE INDEX IF NOT EXISTS idx_applications_status 
  ON applications(status);
`);
```

## Security Guidelines

### 1. Data Protection

```typescript
// ✅ Good: Encrypt sensitive data
const encryptedData = await secureStorageService.encrypt(sensitiveData);
await secureStorageService.store('user_data', encryptedData);

// ✅ Good: Validate input data
const validateApplicationData = (data: unknown): ApplicationData => {
  return applicationSchema.parse(data); // Using Zod validation
};
```

### 2. Authentication

```typescript
// ✅ Good: Implement proper session management
const isAuthenticated = await authService.validateSession();
if (!isAuthenticated) {
  navigation.navigate('Login');
  return;
}
```

## Accessibility Guidelines

### 1. Screen Reader Support

```typescript
// ✅ Good: Add accessibility labels
<TouchableOpacity
  accessibilityLabel="Submit application"
  accessibilityHint="Submits the current application for review"
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 2. Color Contrast

```typescript
// ✅ Good: Ensure proper contrast ratios
export const colors = {
  primary: {
    deepBlue: '#1E3A8A',    // WCAG AA compliant
    lightBlue: '#3B82F6',   // WCAG AA compliant
  },
  text: {
    primary: '#111827',     // High contrast
    secondary: '#6B7280',   // Medium contrast
  },
};
```

## Documentation Standards

### 1. Code Documentation

```typescript
/**
 * Encrypts and stores application data securely
 * @param applicationId - Unique identifier for the application
 * @param data - Application data to be stored
 * @returns Promise that resolves when data is stored
 * @throws {EncryptionError} When encryption fails
 */
export const storeApplicationData = async (
  applicationId: string,
  data: ApplicationData
): Promise<void> => {
  // Implementation
};
```

### 2. README Updates

- Keep README.md current with setup instructions
- Document environment variables
- Include troubleshooting section
- Add contribution guidelines

## Deployment Guidelines

### 1. Build Process

```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Run tests before deployment
npm run test:coverage
npm run lint
npm run type-check
```

### 2. Environment Configuration

```typescript
// ✅ Good: Use environment-specific configs
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    debugMode: true,
  },
  production: {
    apiUrl: 'https://api.credibowpi.com',
    debugMode: false,
  },
};
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **iOS build issues**: Clean build folder and rebuild
3. **Android build issues**: Clean gradle cache
4. **TypeScript errors**: Run `npm run type-check` for detailed errors

### Debug Tools

- React Native Debugger
- Flipper for network inspection
- Console logs with proper prefixes
- Error boundary components

---

*Last Updated: January 2025*
*Version: 1.0*
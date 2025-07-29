# Project Structure & Organization

## Directory Structure

```
credibowpi-mobile/
├── src/                     # Main source code
│   ├── components/          # UI Components (Atomic Design)
│   │   ├── atoms/          # Basic components (Button, Typography, Icon)
│   │   ├── molecules/      # Composite components (MetricCard, SyncStatus)
│   │   └── organisms/      # Complex components (AppShell)
│   ├── screens/            # Screen components
│   ├── services/           # Business logic & external integrations
│   ├── stores/             # Zustand state management
│   ├── navigation/         # React Navigation setup
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # Design tokens & configuration
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── features/           # Feature-based modules
│   └── test/               # Test utilities & setup
├── assets/                 # Static assets (images, fonts)
├── .kiro/                  # Kiro configuration & specs
└── docs/                   # Documentation
```

## Architectural Patterns

### Atomic Design System
- **Atoms**: Basic UI elements (Button, Typography, TextInput, Icon)
- **Molecules**: Combinations of atoms (MetricCard, SyncStatusIndicator)
- **Organisms**: Complex UI sections (AppShell, navigation components)

### Feature-Based Organization
- Each feature has its own directory under `src/features/`
- Features are self-contained with their own components, services, and types
- Current features: auth, dashboard, forms, kyc, settings, signature, sync

### Service Layer Pattern
- All external integrations and business logic in `src/services/`
- Database operations, API calls, file system, security, sync management
- Services are stateless and can be used across the application

### State Management
- Zustand stores for global state management
- Stores are organized by domain (auth, app, sync)
- Persistence layer for offline-first functionality

## File Naming Conventions

### Components
- **PascalCase** for component files: `Button.tsx`, `MetricCard.tsx`
- **Index files** for clean imports: `index.ts` in each component directory
- **Test files**: `ComponentName.test.tsx` in `__tests__` subdirectories

### Services & Utilities
- **camelCase** for service files: `databaseService.ts`, `syncService.ts`
- **Descriptive names** that indicate purpose: `secureStorage.ts`, `metricsService.ts`

### Types & Constants
- **camelCase** for type files: `common.ts`, `database.ts`
- **SCREAMING_SNAKE_CASE** for constants: `API_ENDPOINTS`, `DEFAULT_TIMEOUT`

## Import/Export Patterns

### Barrel Exports
- Each directory has an `index.ts` file for clean imports
- Export all public APIs from the index file
- Use `export *` for re-exports, `export { }` for selective exports

### Path Aliases
- Use `@/` prefix for src imports: `import { Button } from '@/components/atoms'`
- Configured in `tsconfig.json` for clean import paths
- Avoid relative imports beyond one level: `../../../` is discouraged

## Code Organization Rules

### Component Structure
1. Imports (external libraries first, then internal)
2. Type definitions and interfaces
3. Component implementation
4. Styled components (if using styled-components)
5. Default export

### Service Structure
1. Imports and dependencies
2. Type definitions
3. Configuration and constants
4. Private helper functions
5. Public API functions
6. Default export (if single service) or named exports

### Store Structure
1. Imports (Zustand, persist, types)
2. State interface definition
3. Store implementation with actions
4. Persistence configuration
5. Export store and hooks

## Testing Organization
- **Unit tests**: Alongside source files in `__tests__` directories
- **Integration tests**: In `src/services/__tests__/` for service integration
- **Test utilities**: Shared test setup in `src/test/`
- **Coverage**: Aim for >80% coverage on critical business logic
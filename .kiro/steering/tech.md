# Technology Stack & Build System

## Framework & Runtime
- **React Native**: 0.79.5 with Expo SDK 53
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Node.js**: 18+ required

## Key Dependencies
- **State Management**: Zustand with persistence
- **Database**: SQLite (expo-sqlite) with encryption
- **Navigation**: React Navigation v7 (Stack + Bottom Tabs)
- **Security**: Expo SecureStore + Crypto
- **Forms**: React Hook Form with Zod validation
- **Styling**: Styled Components
- **Icons**: Expo Vector Icons + HugeIcons React Native
- **Fonts**: DM Sans via @expo-google-fonts

## Development Tools
- **Linting**: ESLint with Expo config
- **Formatting**: Prettier with consistent rules
- **Testing**: Jest + React Native Testing Library
- **Type Checking**: TypeScript with strict compiler options

## Common Commands

### Development
```bash
npm start                    # Start Expo dev server
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
npm run web                  # Run on web browser
```

### Code Quality
```bash
npm run lint                 # Run ESLint
npm run lint:fix             # Auto-fix ESLint issues
npm run format               # Format with Prettier
npm run format:check         # Check Prettier formatting
npm run type-check           # TypeScript validation
```

### Testing
```bash
npm test                     # Run Jest tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Generate coverage report
```

### Build & Deploy
```bash
npx expo build:ios           # Build for iOS
npx expo build:android       # Build for Android
eas build --platform all     # Build with EAS (requires setup)
```

## Configuration Files
- **TypeScript**: Strict mode with path aliases (`@/*` for src)
- **ESLint**: Expo config with prefer-const and no-var rules
- **Prettier**: Single quotes, 2-space tabs, 80 char width
- **Expo**: Portrait orientation, new architecture enabled
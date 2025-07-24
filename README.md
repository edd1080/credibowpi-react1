# CrediBowpi Mobile

An offline-first React Native mobile application for field credit agents, enabling them to capture, manage, and evaluate credit applications without internet dependency.

## Project Structure

This project follows Feature-Driven Development (FDD) with Atomic Design principles:

```
src/
├── components/          # UI Components (Atomic Design)
│   ├── atoms/          # Basic building blocks (Button, Typography, etc.)
│   ├── molecules/      # Component combinations (FormField, DocumentCard, etc.)
│   └── organisms/      # Complex UI sections (AppShell, FormSection, etc.)
├── features/           # Feature modules
│   ├── auth/          # Authentication
│   ├── dashboard/     # Home dashboard
│   ├── kyc/           # Know Your Customer
│   ├── forms/         # Application forms
│   ├── signature/     # Digital signature
│   ├── sync/          # Offline synchronization
│   └── settings/      # User settings
├── services/          # External services (API, Database, Storage)
├── stores/            # Zustand state management
├── utils/             # Utility functions
├── types/             # TypeScript definitions
├── hooks/             # Custom React hooks
├── navigation/        # Navigation configuration
└── constants/         # App constants (colors, typography, spacing)
```

## Tech Stack

- **Framework:** React Native with Expo SDK
- **Language:** TypeScript with strict configuration
- **State Management:** Zustand
- **Local Database:** SQLite with encryption
- **Secure Storage:** Expo SecureStore
- **Navigation:** React Navigation v6
- **Forms:** React Hook Form with Zod validation
- **Styling:** Styled Components with design tokens

## Design System

### Colors

- Primary Deep Blue: #2A3575
- Secondary Blue: #2973E7
- Tertiary Cyan: #5DBDF9

### Typography

- Font Family: DM Sans
- Scale: H1-H3, Body L/M/S, Label, Caption

### Spacing

- 8pt grid system with 4pt micro-adjustments
- Minimum touch target: 44x44pt

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run on specific platform:

```bash
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

### Development Scripts

```bash
npm run type-check    # TypeScript type checking
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

## Architecture Principles

### Offline-First

- All data is stored locally using encrypted SQLite
- Automatic synchronization when online
- Queue-based retry mechanism for failed syncs

### Feature-Driven Development

- Each feature is self-contained with its own components, hooks, services, and types
- Clear separation of concerns
- Easy to test and maintain

### Clean Architecture

- Presentation Layer: React Native components and screens
- Application Layer: Business logic, state management, and use cases
- Infrastructure Layer: External services, database, and storage

## Core Dependencies

- **zustand**: Lightweight state management
- **expo-sqlite**: Local database with encryption
- **expo-secure-store**: Secure token storage
- **@react-navigation/native**: Navigation framework
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **styled-components**: CSS-in-JS styling

## Next Steps

This is the initial project setup. The next tasks will implement:

1. Design system foundation (colors, typography, spacing)
2. Offline-first data infrastructure
3. Authentication flow
4. Navigation structure
5. Feature modules (KYC, forms, signature, etc.)

## Requirements Addressed

- ✅ 1.6: Secure token storage using SecureStore
- ✅ 6.1: Encrypted SQLite for offline data storage
- ✅ 6.2: Zustand for offline-first state management

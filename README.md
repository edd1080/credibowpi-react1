# 📱 CrediBowpi Mobile App

A React Native mobile application for CrediBowpi field agents to manage credit applications with offline-first capabilities and real-time dashboard metrics.

![CrediBowpi](https://img.shields.io/badge/CrediBowpi-Mobile%20App-2A3575?style=for-the-badge)
![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite)

## 🚀 Features

### 📊 Agent Dashboard
- **Real-time Metrics**: Today's applications, completion rates, sync status
- **KPI Visualization**: Weekly summaries and performance indicators  
- **Sync Management**: Manual sync trigger with status indicators
- **Quick Actions**: Nueva Solicitud CTA and navigation shortcuts

### 🔐 Security & Authentication
- **Secure Login**: Biometric and PIN-based authentication
- **Token Management**: JWT-based session handling
- **Data Encryption**: SecureStore for sensitive information
- **Offline Security**: Encrypted local database

### 📱 Offline-First Architecture
- **SQLite Database**: Local data persistence
- **Automatic Sync**: Background synchronization when online
- **Conflict Resolution**: Smart merge strategies
- **Queue Management**: Pending operations tracking

### 🎨 Design System
- **CrediBowpi Branding**: Deep Blue (#2A3575), Secondary Blue (#2973E7), Cyan (#5DBDF9)
- **8pt Grid System**: Consistent spacing and layout
- **Typography Hierarchy**: Accessible text scaling
- **Component Library**: Reusable atoms, molecules, and organisms

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React Native with Expo SDK 53 |
| **Language** | TypeScript with strict mode |
| **State Management** | Zustand with persistence |
| **Database** | SQLite (expo-sqlite) |
| **Security** | Expo SecureStore + Crypto |
| **Navigation** | React Navigation v6 |
| **Testing** | Jest + React Native Testing Library |
| **Code Quality** | ESLint + Prettier |

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator

### Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd credibowpi-mobile

# Install dependencies
npm install

# Start the development server
npx expo start

# Run on specific platform
npx expo start --ios     # iOS Simulator
npx expo start --android # Android Emulator
```

### 🔑 Testing Credentials

```
Email: test@credibowpi.com
Password: password
```

## 📁 Project Structure

```
credibowpi-mobile/
├── src/
│   ├── components/              # UI Components
│   │   ├── atoms/              # Basic components (Button, Typography)
│   │   ├── molecules/          # Composite components (MetricCard, SyncStatus)
│   │   └── organisms/          # Complex components (AppShell)
│   ├── screens/                # Screen components
│   │   ├── HomeScreen.tsx      # Agent dashboard with metrics
│   │   ├── LoginScreen.tsx     # Authentication screen
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── database.ts         # SQLite operations
│   │   ├── syncService.ts      # Sync management
│   │   ├── metricsService.ts   # KPI calculations
│   │   └── ...
│   ├── stores/                 # State management
│   │   ├── authStore.ts        # Authentication state
│   │   └── appStore.ts         # Application state
│   ├── types/                  # TypeScript definitions
│   ├── constants/              # Design tokens
│   └── navigation/             # Navigation setup
├── .kiro/specs/                # Feature specifications
├── DESIGN_SYSTEM.md            # Design guidelines
├── OFFLINE_INFRASTRUCTURE.md   # Architecture docs
└── README.md
```

## 🎯 Key Implementations

### Dashboard Metrics (Task 6 ✅)
- **MetricCard Component**: Displays KPIs with brand styling
- **Real-time Calculations**: Today's applications, sync status, weekly summaries
- **Interactive Elements**: Tap to sync, pull-to-refresh
- **Status Indicators**: Online/offline, sync progress, error states

### Authentication System
- **Mock Login**: Test credentials for development
- **Secure Storage**: Encrypted token persistence
- **Session Management**: Automatic token refresh
- **Biometric Support**: Ready for production integration

### Offline Infrastructure
- **SQLite Schema**: Applications, documents, sync queue tables
- **Encryption**: AES-256 for sensitive data
- **Sync Queue**: Pending operations management
- **Conflict Resolution**: Last-write-wins strategy

## 🧪 Development

### Running Tests 
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### Code Quality
```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix issues
npm run type-check         # TypeScript validation
npm run format             # Prettier formatting
```

### Building
```bash
npx expo build:ios        # iOS build
npx expo build:android    # Android build
```

## 📊 Dashboard Features

### Metrics Cards
- **Nuevas Hoy**: Today's new applications
- **En Progreso**: Active form submissions  
- **Completadas**: Ready for review
- **Pendientes Sync**: Items awaiting synchronization

### KPI Summary
- **Total Today**: Combined daily metrics
- **Completion Rate**: Weekly success percentage
- **Sync Status**: Real-time sync health

### Interactive Elements
- **Manual Sync**: Tap sync indicator to trigger
- **Pull to Refresh**: Update metrics data
- **Quick Actions**: Nueva Solicitud CTA button

## 🔧 Configuration

### Environment Setup
```bash
# Development
cp .env.example .env.development

# Production  
cp .env.example .env.production
```

### Database Migrations
```bash
# Reset database (development only)
npx expo start --clear
```

## 🚀 Deployment

### Expo Application Services (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for stores
eas build --platform all
```

### Over-the-Air Updates
```bash
# Publish update
eas update --branch production
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation update
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

## 📝 Documentation

- [Design System](./DESIGN_SYSTEM.md) - UI guidelines and components
- [Offline Infrastructure](./OFFLINE_INFRASTRUCTURE.md) - Architecture details
- [API Documentation](./docs/api.md) - Service interfaces
- [Testing Guide](./docs/testing.md) - Testing strategies

## 🐛 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**TypeScript errors:**
```bash
npx tsc --noEmit --skipLibCheck
```

**Dependency conflicts:**
```bash
npm install --legacy-peer-deps
```

## 📄 License

**Private - CrediBowpi Internal Use Only**

This project is proprietary software developed for CrediBowpi's internal use. Unauthorized copying, distribution, or modification is strictly prohibited.

---

## 🎉 Recent Updates

### v1.0.0 - Agent Dashboard Implementation
- ✅ Complete dashboard with real-time metrics
- ✅ Sync status management with manual trigger  
- ✅ MetricCard component with brand styling
- ✅ KPI calculations and weekly summaries
- ✅ Offline/online state indicators
- ✅ Pull-to-refresh functionality

### Next Steps
- [ ] KYC document capture flow
- [ ] Credit application forms
- [ ] Advanced sync conflict resolution
- [ ] Push notifications
- [ ] Biometric authentication integration

---

**Built with ❤️ by the CrediBowpi Development Team**
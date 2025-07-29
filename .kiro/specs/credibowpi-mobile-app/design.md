# Design Document

## Overview

CrediBowpi is an offline-first React Native mobile application built with Expo, designed for field credit agents to capture, manage, and evaluate credit applications without internet dependency. The application follows Clean Architecture principles with Feature-Driven Development (FDD) and implements Atomic Design patterns for component organization.

The core design philosophy centers on "confianza sin frialdad" (trust without coldness) - delivering a modern, elegant interface that maintains institutional credibility while providing an approachable user experience for intensive field work. The design system emphasizes offline-first UX patterns, guided workflows, and accessibility for outdoor usage conditions.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Screens       │ │   Components    │ │   Navigation    ││
│  │   (Features)    │ │   (Atomic)      │ │   (Stack/Tab)   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Use Cases     │ │   State Mgmt    │ │   Services      ││
│  │   (Business)    │ │   (Zustand)     │ │   (API/Sync)    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Local DB      │ │   Secure Store  │ │   File System   ││
│  │   (SQLite)      │ │   (Tokens)      │ │   (Documents)   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework:** React Native with Expo SDK
- **Language:** TypeScript for type safety
- **State Management:** Zustand for lightweight, offline-friendly state
- **Local Database:** SQLite with encryption for sensitive data
- **Secure Storage:** Expo SecureStore for authentication tokens
- **Navigation:** React Navigation v6 with stack and tab navigators
- **Forms:** React Hook Form with Zod validation
- **Styling:** Styled Components with design tokens
- **Testing:** Jest + React Native Testing Library + Detox E2E

## Components and Interfaces

### Design System Architecture

Following Atomic Design principles with CrediBowpi-specific components:

#### Atoms
- **Typography:** H1-H3, Body L/M/S, Label, Button, Link, Caption tokens
- **Colors:** Brand palette with Primary Deep Blue (#2A3575), Secondary Blue (#2973E7), Tertiary Cyan (#5DBDF9)
- **Spacing:** 8pt grid system (4pt micro-adjustments)
- **Icons:** 24pt standard with 2px stroke, rounded corners
- **Buttons:** Primary, Secondary (Outline), Tertiary (Text), Sync/Retry variants

#### Molecules
- **Form Controls:** Input fields with floating labels, validation states
- **Document Cards:** Empty, Loading, Error, Ready states for DPI/Selfie/Attachments
- **Progress Indicators:** Wizard bar, breadcrumbs, onboarding dots
- **Sync Components:** Status banners, offline toasts, pending chips
- **Signature Canvas:** Drawing area with Clear/Save actions

#### Organisms
- **App Shell:** Splash screen, login form, dashboard layout
- **Form Sections:** Modular form components with persistent picker navigation
- **Lists:** Row components with icons, chevrons, press states
- **Modals:** Bottom sheets with 24pt top radius, handle, overlay
- **Navigation:** Tab bar, stack headers with breadcrumb support

### Key Interface Patterns

#### Offline-First UX
- **Connection Status:** Always-visible but non-invasive indicators
- **Sync Queue:** Visual representation of pending operations
- **Local-First:** All interactions work offline, sync when available
- **Progressive Enhancement:** Features gracefully degrade without connection

#### Guided Workflows
- **Wizard Navigation:** Step-by-step progress with visual indicators
- **Persistent Picker:** Section navigation without losing context
- **Breadcrumb Trail:** Clear location awareness throughout flows
- **Auto-save:** Continuous local persistence of form progress

#### Document Capture Flow
```
Empty State → Camera Launch → Capture → Validation → Preview → Confirm/Retake
     ↓              ↓           ↓          ↓         ↓           ↓
  Dashed       Loading      Quality    Error/      Thumbnail   Success
  Border       Overlay      Check      Success     Display     State
```

## Data Models

### Core Entities

#### User (Agent)
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'supervisor';
  preferences: UserPreferences;
  lastSync: Date;
  isActive: boolean;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  autoSync: boolean;
  syncInterval: number; // minutes
}
```

#### Application (Credit Request)
```typescript
interface CreditApplication {
  id: string;
  agentId: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: SyncStatus;
  
  // KYC Section
  kyc: KYCData;
  
  // Form Sections
  identification: IdentificationData;
  finances: FinancialData;
  business: BusinessData;
  guarantees: GuaranteeData;
  attachments: AttachmentData[];
  
  // Process Data
  signature: SignatureData;
  review: ReviewData;
}

type ApplicationStatus = 
  | 'draft' 
  | 'kyc_pending' 
  | 'form_in_progress' 
  | 'ready_for_review' 
  | 'submitted' 
  | 'approved' 
  | 'rejected';

type SyncStatus = 
  | 'local_only' 
  | 'sync_pending' 
  | 'sync_in_progress' 
  | 'synced' 
  | 'sync_failed';
```

#### Document Management
```typescript
interface DocumentCapture {
  id: string;
  type: 'dpi_front' | 'dpi_back' | 'selfie' | 'attachment';
  localPath: string;
  remotePath?: string;
  status: 'captured' | 'validated' | 'uploaded' | 'failed';
  metadata: {
    timestamp: Date;
    quality: number;
    size: number;
    dimensions: { width: number; height: number };
  };
}
```

### Local Database Schema

Using SQLite with encryption for offline storage:

```sql
-- Applications table with JSON columns for complex data
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON blob of application data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER
);

-- Documents table for file management
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  type TEXT NOT NULL,
  local_path TEXT NOT NULL,
  remote_path TEXT,
  status TEXT NOT NULL,
  metadata TEXT NOT NULL, -- JSON blob
  created_at INTEGER NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications (id)
);

-- Sync queue for offline operations
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL, -- 'create', 'update', 'upload'
  entity_type TEXT NOT NULL, -- 'application', 'document'
  entity_id TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON blob
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_attempt INTEGER
);
```

## Error Handling

### Error Categories and Strategies

#### Network Errors
- **Connection Loss:** Queue operations for later sync
- **API Failures:** Exponential backoff retry with user notification
- **Timeout:** Graceful degradation with offline mode continuation

#### Validation Errors
- **Form Validation:** Real-time feedback with specific field errors
- **Document Quality:** Immediate feedback with recapture guidance
- **Business Rules:** Clear messaging with corrective actions

#### Storage Errors
- **Disk Space:** Proactive monitoring with cleanup suggestions
- **Database Corruption:** Recovery mechanisms with data integrity checks
- **File Access:** Permission handling with user guidance

### Error UI Patterns

#### Toast Notifications
```typescript
interface ToastConfig {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration: number; // 3-5s, persistent for critical errors
  action?: {
    label: string;
    onPress: () => void;
  };
}
```

#### Error States in Components
- **Document Cards:** Red border, error icon, "Retry" CTA
- **Form Fields:** Red border, error text below field
- **Sync Banner:** Warning/error background with action button
- **Empty States:** Illustration + message + primary action

#### Offline Error Handling
```typescript
interface OfflineErrorStrategy {
  queueOperation: (operation: SyncOperation) => void;
  showOfflineToast: () => void;
  updateSyncStatus: (status: SyncStatus) => void;
  retryWhenOnline: () => void;
}
```

## Testing Strategy

### Testing Pyramid

#### Unit Tests (70%)
- **Components:** Render, props, user interactions
- **Utilities:** Pure functions, data transformations
- **Hooks:** Custom hooks with various states
- **Services:** API calls, data persistence, sync logic

#### Integration Tests (20%)
- **Form Flows:** Multi-step form completion
- **Document Capture:** Camera integration, file handling
- **Offline Sync:** Queue management, retry logic
- **Navigation:** Screen transitions, deep linking

#### E2E Tests (10%)
- **Critical Paths:** Complete application submission flow
- **Offline Scenarios:** Work without network, sync when available
- **Error Recovery:** Handle failures gracefully
- **Cross-Platform:** iOS and Android behavior consistency

### Testing Tools and Configuration

#### Jest Configuration
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{js,ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### Detox E2E Configuration
```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/CrediBowpi.app',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 14' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_4_API_30' },
    },
  },
};
```

### Offline Testing Strategy

#### Network Simulation
- **No Connection:** Complete offline functionality
- **Intermittent Connection:** Sync reliability under poor conditions
- **Slow Connection:** Performance with limited bandwidth
- **Connection Recovery:** Automatic sync when network returns

#### Data Integrity Testing
- **Concurrent Modifications:** Handle simultaneous local/remote changes
- **Partial Sync Failures:** Maintain consistency during interrupted syncs
- **Storage Limits:** Graceful handling of storage constraints
- **Encryption Validation:** Ensure sensitive data remains encrypted

### Accessibility Testing

#### Automated Testing
- **Screen Reader:** VoiceOver/TalkBack compatibility
- **Color Contrast:** WCAG AA compliance validation
- **Touch Targets:** Minimum 44x44pt requirement verification
- **Dynamic Type:** Layout adaptation to font size changes

#### Manual Testing Scenarios
- **Outdoor Usage:** Readability in bright sunlight conditions
- **One-Handed Operation:** Reachability for large screens
- **Motor Impairments:** Alternative input methods support
- **Cognitive Load:** Clear navigation and error recovery paths
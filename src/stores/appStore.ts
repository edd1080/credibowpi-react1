import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CreditApplication,
  ApplicationStatus,
  SyncStatus,
} from '../types/database';
import { UserData } from '../services/secureStorage';

// App-wide state interface
export interface AppState {
  // User and authentication
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Network and sync status
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingSyncCount: number;

  // Applications
  applications: CreditApplication[];
  currentApplication: CreditApplication | null;

  // UI state
  activeTab: string;
  notifications: AppNotification[];

  // Preferences
  preferences: UserPreferences;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isPersistent: boolean;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  autoSync: boolean;
  syncInterval: number; // minutes
  notifications: {
    enabled: boolean;
    syncSuccess: boolean;
    syncFailure: boolean;
    statusChanges: boolean;
  };
}

// Default state values
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'es',
  autoSync: true,
  syncInterval: 5,
  notifications: {
    enabled: true,
    syncSuccess: true,
    syncFailure: true,
    statusChanges: true,
  },
};

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  pendingSyncCount: 0,
  applications: [],
  currentApplication: null,
  activeTab: 'home',
  notifications: [],
  preferences: defaultPreferences,
};

// Store actions interface
export interface AppActions {
  // Authentication actions
  setUser: (user: UserData | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;

  // Network and sync actions
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncStatus: (isSyncing: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  setPendingSyncCount: (count: number) => void;

  // Application actions
  setApplications: (applications: CreditApplication[]) => void;
  addApplication: (application: CreditApplication) => void;
  updateApplication: (application: CreditApplication) => void;
  removeApplication: (applicationId: string) => void;
  setCurrentApplication: (application: CreditApplication | null) => void;
  updateApplicationStatus: (
    applicationId: string,
    status: ApplicationStatus
  ) => void;
  updateApplicationSyncStatus: (
    applicationId: string,
    syncStatus: SyncStatus
  ) => void;

  // UI actions
  setActiveTab: (tab: string) => void;
  addNotification: (
    notification: Omit<AppNotification, 'id' | 'timestamp'>
  ) => void;
  markNotificationAsRead: (notificationId: string) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;

  // Preferences actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setTheme: (theme: UserPreferences['theme']) => void;
  setLanguage: (language: UserPreferences['language']) => void;

  // Utility actions
  reset: () => void;
}

// Create the store with persistence
export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Authentication actions
      setUser: user => set({ user }),
      setAuthenticated: isAuthenticated => set({ isAuthenticated }),
      setLoading: isLoading => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          applications: [],
          currentApplication: null,
          notifications: [],
        }),

      // Network and sync actions
      setOnlineStatus: isOnline => set({ isOnline }),
      setSyncStatus: isSyncing => set({ isSyncing }),
      setLastSyncTime: lastSyncTime => set({ lastSyncTime }),
      setPendingSyncCount: pendingSyncCount => set({ pendingSyncCount }),

      // Application actions
      setApplications: applications => set({ applications }),
      addApplication: application =>
        set(state => ({
          applications: [...state.applications, application],
        })),
      updateApplication: updatedApplication =>
        set(state => ({
          applications: state.applications.map(app =>
            app.id === updatedApplication.id ? updatedApplication : app
          ),
          currentApplication:
            state.currentApplication?.id === updatedApplication.id
              ? updatedApplication
              : state.currentApplication,
        })),
      removeApplication: applicationId =>
        set(state => ({
          applications: state.applications.filter(
            app => app.id !== applicationId
          ),
          currentApplication:
            state.currentApplication?.id === applicationId
              ? null
              : state.currentApplication,
        })),
      setCurrentApplication: currentApplication => set({ currentApplication }),
      updateApplicationStatus: (applicationId, status) =>
        set(state => ({
          applications: state.applications.map(app =>
            app.id === applicationId
              ? { ...app, status, updatedAt: new Date() }
              : app
          ),
        })),
      updateApplicationSyncStatus: (applicationId, syncStatus) =>
        set(state => ({
          applications: state.applications.map(app =>
            app.id === applicationId ? { ...app, syncStatus } : app
          ),
        })),

      // UI actions
      setActiveTab: activeTab => set({ activeTab }),
      addNotification: notification =>
        set(state => ({
          notifications: [
            {
              ...notification,
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9),
              timestamp: new Date(),
              isRead: false,
            },
            ...state.notifications,
          ],
        })),
      markNotificationAsRead: notificationId =>
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          ),
        })),
      removeNotification: notificationId =>
        set(state => ({
          notifications: state.notifications.filter(
            n => n.id !== notificationId
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Preferences actions
      updatePreferences: newPreferences =>
        set(state => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      setTheme: theme =>
        set(state => ({
          preferences: { ...state.preferences, theme },
        })),
      setLanguage: language =>
        set(state => ({
          preferences: { ...state.preferences, language },
        })),

      // Utility actions
      reset: () => set(initialState),
    }),
    {
      name: 'credibowpi-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain parts of the state
      partialize: state => ({
        preferences: state.preferences,
        activeTab: state.activeTab,
        lastSyncTime: state.lastSyncTime,
        // Don't persist sensitive data like user info or applications
        // Those should be managed by SecureStore and Database respectively
      }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useAppStore(state => state.user);
export const useIsAuthenticated = () =>
  useAppStore(state => state.isAuthenticated);
export const useIsOnline = () => useAppStore(state => state.isOnline);
export const useIsSyncing = () => useAppStore(state => state.isSyncing);
export const useApplications = () => useAppStore(state => state.applications);
export const useCurrentApplication = () =>
  useAppStore(state => state.currentApplication);
export const useNotifications = () => useAppStore(state => state.notifications);
export const usePreferences = () => useAppStore(state => state.preferences);
export const usePendingSyncCount = () =>
  useAppStore(state => state.pendingSyncCount);

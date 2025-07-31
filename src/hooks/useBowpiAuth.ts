// Custom hook for Bowpi Authentication

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authIntegration } from '../services/AuthIntegrationService';
import { BowpiAuthError, NetworkStatus } from '../types/bowpi';

/**
 * Custom hook for Bowpi authentication
 * Provides easy access to authentication state and methods
 */
export const useBowpiAuth = () => {
  const authStore = useAuthStore();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ isConnected: true });

  // Update network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const status = authIntegration.getNetworkStatus();
      setNetworkStatus(status);
    };

    // Update initially
    updateNetworkStatus();

    // Update periodically (every 5 seconds)
    const interval = setInterval(updateNetworkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Login with Bowpi
  const loginWithBowpi = useCallback(async (email: string, password: string) => {
    try {
      await authStore.login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [authStore.login]);

  // Logout with Bowpi
  const logoutWithBowpi = useCallback(async () => {
    try {
      await authStore.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Don't throw error for logout - always succeed locally
    }
  }, [authStore.logout]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      return await authIntegration.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  // Check if user can login (has internet connection)
  const canLogin = useCallback(() => {
    return networkStatus.isConnected;
  }, [networkStatus.isConnected]);

  // Get user-friendly network status message
  const getNetworkStatusMessage = useCallback(() => {
    if (!networkStatus.isConnected) {
      return 'Sin conexión a internet';
    }
    
    if (networkStatus.isInternetReachable === false) {
      return 'Conectado pero sin acceso a internet';
    }
    
    return 'Conectado';
  }, [networkStatus]);

  // Get authentication debug info
  const getDebugInfo = useCallback(() => {
    return authIntegration.getDebugInfo();
  }, []);

  return {
    // Auth state
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    isOfflineMode: authStore.isOfflineMode,
    
    // Bowpi specific state
    bowpiToken: authStore.bowpiToken,
    sessionId: authStore.sessionId,
    
    // Network state
    networkStatus,
    isOnline: networkStatus.isConnected,
    networkStatusMessage: getNetworkStatusMessage(),
    
    // Auth methods
    login: loginWithBowpi,
    logout: logoutWithBowpi,
    refreshToken,
    clearError: authStore.clearError,
    
    // Utility methods
    canLogin: canLogin(),
    getDebugInfo,
    
    // Store methods (for compatibility)
    setLoading: authStore.setLoading,
    setUser: authStore.setUser,
    setAuthenticated: authStore.setAuthenticated,
    setOfflineMode: authStore.setOfflineMode
  };
};

/**
 * Hook for authentication status only (lighter version)
 */
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading, user, isOfflineMode } = useAuthStore();
  
  return {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    isOfflineMode
  };
};

/**
 * Hook for network status only
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ isConnected: true });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const status = authIntegration.getNetworkStatus();
      setNetworkStatus(status);
    };

    updateNetworkStatus();
    const interval = setInterval(updateNetworkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...networkStatus,
    isOnline: networkStatus.isConnected,
    canLogin: networkStatus.isConnected,
    statusMessage: networkStatus.isConnected 
      ? 'Conectado' 
      : 'Sin conexión a internet'
  };
};
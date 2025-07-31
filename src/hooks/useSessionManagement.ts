// Custom hook for Session Management

import { useEffect, useState, useCallback } from 'react';
import { sessionManager, SessionValidationResult } from '../services/SessionManagementService';
import { BowpiSessionData } from '../types/bowpi';

/**
 * Session status information
 */
export interface SessionStatus {
  hasSession: boolean;
  isValid: boolean;
  isExpired: boolean;
  sessionAge?: number;
  timeUntilExpiry?: number;
  sessionId?: string;
  userId?: string;
  lastRenewal?: number;
}

/**
 * Custom hook for session management
 * Provides session status, validation, and management methods
 */
export const useSessionManagement = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    hasSession: false,
    isValid: false,
    isExpired: false
  });
  const [sessionData, setSessionData] = useState<BowpiSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session status
  const loadSessionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get session statistics
      const stats = await sessionManager.getSessionStats();
      
      // Validate session if it exists
      let validation: SessionValidationResult | null = null;
      let currentSessionData: BowpiSessionData | null = null;
      
      if (stats.hasSession) {
        validation = await sessionManager.validateSession();
        currentSessionData = await sessionManager.loadSession();
      }

      // Update state
      setSessionStatus({
        hasSession: stats.hasSession,
        isValid: validation?.isValid ?? false,
        isExpired: validation?.isExpired ?? false,
        sessionAge: stats.sessionAge,
        timeUntilExpiry: stats.timeUntilExpiry,
        sessionId: stats.sessionId,
        userId: stats.userId,
        lastRenewal: stats.lastRenewal
      });

      setSessionData(currentSessionData);

    } catch (error) {
      console.error('Failed to load session status:', error);
      
      // Reset to default state on error
      setSessionStatus({
        hasSession: false,
        isValid: false,
        isExpired: false
      });
      setSessionData(null);
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear session
  const clearSession = useCallback(async () => {
    try {
      await sessionManager.clearSession();
      await loadSessionStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }, [loadSessionStatus]);

  // Get session validation details
  const validateSession = useCallback(async (): Promise<SessionValidationResult> => {
    return await sessionManager.validateSession();
  }, []);

  // Get user profile from session
  const getUserProfile = useCallback(async () => {
    try {
      return await sessionManager.getUserProfile();
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }, []);

  // Get encrypted token from session
  const getEncryptedToken = useCallback(async () => {
    try {
      return await sessionManager.getEncryptedToken();
    } catch (error) {
      console.error('Failed to get encrypted token:', error);
      return null;
    }
  }, []);

  // Format time until expiry for display
  const formatTimeUntilExpiry = useCallback(() => {
    if (!sessionStatus.timeUntilExpiry || sessionStatus.timeUntilExpiry <= 0) {
      return 'Expired';
    }

    const minutes = Math.floor(sessionStatus.timeUntilExpiry / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 minute';
    }
  }, [sessionStatus.timeUntilExpiry]);

  // Format session age for display
  const formatSessionAge = useCallback(() => {
    if (!sessionStatus.sessionAge) {
      return 'Unknown';
    }

    const minutes = Math.floor(sessionStatus.sessionAge / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }, [sessionStatus.sessionAge]);

  // Load session status on mount and set up periodic refresh
  useEffect(() => {
    loadSessionStatus();

    // Refresh session status every 30 seconds
    const interval = setInterval(loadSessionStatus, 30000);

    return () => clearInterval(interval);
  }, [loadSessionStatus]);

  return {
    // Session state
    sessionStatus,
    sessionData,
    isLoading,
    
    // Computed values
    hasValidSession: sessionStatus.hasSession && sessionStatus.isValid,
    isSessionExpired: sessionStatus.isExpired,
    timeUntilExpiryFormatted: formatTimeUntilExpiry(),
    sessionAgeFormatted: formatSessionAge(),
    
    // Session methods
    loadSessionStatus,
    clearSession,
    validateSession,
    getUserProfile,
    getEncryptedToken,
    
    // Utility methods
    refreshStatus: loadSessionStatus
  };
};

/**
 * Lightweight hook for session status only
 */
export const useSessionStatus = () => {
  const [hasSession, setHasSession] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const stats = await sessionManager.getSessionStats();
        const validation = stats.hasSession ? await sessionManager.validateSession() : null;
        
        setHasSession(stats.hasSession);
        setIsValid(validation?.isValid ?? false);
      } catch (error) {
        console.error('Failed to check session status:', error);
        setHasSession(false);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // Check every minute
    const interval = setInterval(checkSession, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    hasSession,
    isValid,
    isLoading,
    hasValidSession: hasSession && isValid
  };
};
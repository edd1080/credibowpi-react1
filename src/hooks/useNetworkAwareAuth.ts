import { useState, useEffect } from 'react';
import { authIntegration } from '../services/AuthIntegrationService';
import NetworkAwareService from '../services/NetworkAwareService';

interface NetworkStatus {
  isConnected: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

interface AuthCapabilities {
  canLogin: boolean;
  canLogout: boolean;
  canRefreshToken: boolean;
  networkQuality: string;
  reason?: string;
}

export const useNetworkAwareAuth = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ 
    isConnected: true, 
    quality: 'excellent' 
  });
  const [authCapabilities, setAuthCapabilities] = useState<AuthCapabilities>({
    canLogin: true,
    canLogout: true,
    canRefreshToken: true,
    networkQuality: 'excellent'
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeNetworkMonitoring = async () => {
      try {
        // Initialize network monitoring
        await NetworkAwareService.initialize();
        
        // Set initial network status
        const initialStatus = NetworkAwareService.getCurrentNetworkStatus();
        const quality = NetworkAwareService.getNetworkQuality();
        const newNetworkStatus = { 
          isConnected: initialStatus.isConnected, 
          quality: quality as NetworkStatus['quality']
        };
        setNetworkStatus(newNetworkStatus);

        // Check initial auth capabilities
        const capabilities = await authIntegration.checkLoginCapabilities();
        setAuthCapabilities(capabilities);

        // Subscribe to network changes
        unsubscribe = NetworkAwareService.addNetworkListener(async (status) => {
          const newQuality = NetworkAwareService.getNetworkQuality();
          const updatedNetworkStatus = { 
            isConnected: status.isConnected, 
            quality: newQuality as NetworkStatus['quality']
          };
          setNetworkStatus(updatedNetworkStatus);

          // Update auth capabilities when network changes
          const updatedCapabilities = await authIntegration.checkLoginCapabilities();
          setAuthCapabilities(updatedCapabilities);
        });

        setIsInitialized(true);
        console.log('✅ [useNetworkAwareAuth] Network monitoring initialized');

      } catch (error) {
        console.error('❌ [useNetworkAwareAuth] Failed to initialize network monitoring:', error);
        // Set fallback values
        setNetworkStatus({ isConnected: true, quality: 'excellent' });
        setAuthCapabilities({
          canLogin: true,
          canLogout: true,
          canRefreshToken: true,
          networkQuality: 'excellent'
        });
        setIsInitialized(true);
      }
    };

    initializeNetworkMonitoring();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const refreshCapabilities = async () => {
    try {
      const capabilities = await authIntegration.checkLoginCapabilities();
      setAuthCapabilities(capabilities);
      return capabilities;
    } catch (error) {
      console.error('❌ [useNetworkAwareAuth] Failed to refresh capabilities:', error);
      return authCapabilities;
    }
  };

  const waitForConnection = async (timeoutMs: number = 30000): Promise<boolean> => {
    try {
      const connected = await NetworkAwareService.waitForConnection(timeoutMs);
      if (connected) {
        // Refresh capabilities after connection is restored
        await refreshCapabilities();
      }
      return connected;
    } catch (error) {
      console.error('❌ [useNetworkAwareAuth] Error waiting for connection:', error);
      return false;
    }
  };

  return {
    networkStatus,
    authCapabilities,
    isInitialized,
    canLogin: authCapabilities.canLogin,
    canLogout: authCapabilities.canLogout,
    canRefreshToken: authCapabilities.canRefreshToken,
    refreshCapabilities,
    waitForConnection,
  };
};

export default useNetworkAwareAuth;
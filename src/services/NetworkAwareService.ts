// Network Aware Service - Handles network-specific authentication logic
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { NetworkStatus } from './bowpi';

/**
 * Service for handling network-aware authentication operations
 */
export class NetworkAwareService {
  private static networkListeners: Array<(status: NetworkStatus) => void> = [];
  private static currentNetworkStatus: NetworkStatus = { isConnected: true };
  private static isMonitoring = false;

  /**
   * Initialize network monitoring
   */
  static async initialize(): Promise<NetworkStatus> {
    if (this.isMonitoring) {
      return this.currentNetworkStatus;
    }

    try {
      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.currentNetworkStatus = this.parseNetInfoState(netInfo);

      console.log('🔍 [NETWORK_AWARE] Initial network status:', this.currentNetworkStatus);

      // Subscribe to network state changes
      NetInfo.addEventListener(this.handleNetworkChange);
      this.isMonitoring = true;

      return this.currentNetworkStatus;
    } catch (error) {
      console.error('❌ [NETWORK_AWARE] Failed to initialize network monitoring:', error);
      // Assume online if network monitoring fails
      this.currentNetworkStatus = { isConnected: true };
      return this.currentNetworkStatus;
    }
  }

  /**
   * Handle network state changes
   */
  private static handleNetworkChange = (state: NetInfoState): void => {
    const previousStatus = this.currentNetworkStatus.isConnected;
    this.currentNetworkStatus = this.parseNetInfoState(state);

    console.log('🔍 [NETWORK_AWARE] Network status changed:', {
      previous: previousStatus,
      current: this.currentNetworkStatus.isConnected,
      type: this.currentNetworkStatus.type,
      isInternetReachable: this.currentNetworkStatus.isInternetReachable
    });

    // Notify all listeners
    this.networkListeners.forEach(listener => {
      try {
        listener(this.currentNetworkStatus);
      } catch (error) {
        console.error('❌ [NETWORK_AWARE] Error in network listener:', error);
      }
    });

    // Show user feedback for significant network changes
    if (previousStatus !== this.currentNetworkStatus.isConnected) {
      this.showNetworkStatusChange(this.currentNetworkStatus.isConnected);
    }
  };

  /**
   * Parse NetInfo state to NetworkStatus
   */
  private static parseNetInfoState(state: NetInfoState): NetworkStatus {
    return {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable ?? undefined
    };
  }

  /**
   * Get current network status
   */
  static getCurrentNetworkStatus(): NetworkStatus {
    return { ...this.currentNetworkStatus };
  }

  /**
   * Check if device is currently online
   */
  static isOnline(): boolean {
    return this.currentNetworkStatus.isConnected;
  }

  /**
   * Check if device is currently offline
   */
  static isOffline(): boolean {
    return !this.currentNetworkStatus.isConnected;
  }

  /**
   * Add network status listener
   */
  static addNetworkListener(listener: (status: NetworkStatus) => void): () => void {
    this.networkListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  /**
   * Validate network connectivity for login operations
   */
  static async validateNetworkForLogin(): Promise<void> {
    console.log('🔍 [NETWORK_AWARE] Validating network for login...');

    // Get fresh network state
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected ?? false;

    console.log('🔍 [NETWORK_AWARE] Fresh network state:', {
      isConnected,
      type: netInfo.type,
      isInternetReachable: netInfo.isInternetReachable
    });

    if (!isConnected) {
      console.log('❌ [NETWORK_AWARE] Login blocked - no network connection');
      throw new Error('OFFLINE_LOGIN_ATTEMPT: Login requires internet connection. Please check your network and try again.');
    }

    // Update current status
    this.currentNetworkStatus = this.parseNetInfoState(netInfo);
  }

  /**
   * Show offline login blocking message
   */
  static showOfflineLoginMessage(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'No Internet Connection',
        'Login requires an internet connection. Please check your network settings and try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔍 [NETWORK_AWARE] User acknowledged offline login message');
              resolve();
            }
          }
        ]
      );
    });
  }

  /**
   * Show network status change notification
   */
  private static showNetworkStatusChange(isOnline: boolean): void {
    // Only show notifications in development or if explicitly enabled
    if (__DEV__) {
      const message = isOnline 
        ? 'Internet connection restored' 
        : 'Internet connection lost';
      
      console.log(`📶 [NETWORK_AWARE] ${message}`);
      
      // Could show a toast notification here in the future
      // Toast.show({ text: message, type: isOnline ? 'success' : 'warning' });
    }
  }

  /**
   * Wait for network connection to be restored
   */
  static waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      // If already connected, resolve immediately
      if (this.isOnline()) {
        resolve(true);
        return;
      }

      let timeoutId: NodeJS.Timeout;
      let unsubscribe: (() => void) | null = null;

      // Set timeout
      timeoutId = setTimeout(() => {
        if (unsubscribe) unsubscribe();
        console.log('⏰ [NETWORK_AWARE] Wait for connection timeout');
        resolve(false);
      }, timeoutMs);

      // Listen for network changes
      unsubscribe = this.addNetworkListener((status) => {
        if (status.isConnected) {
          clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          console.log('✅ [NETWORK_AWARE] Connection restored');
          resolve(true);
        }
      });
    });
  }

  /**
   * Check if network is suitable for authentication operations
   */
  static async isNetworkSuitableForAuth(): Promise<{
    suitable: boolean;
    reason?: string;
  }> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        return {
          suitable: false,
          reason: 'No network connection available'
        };
      }

      if (netInfo.isInternetReachable === false) {
        return {
          suitable: false,
          reason: 'Internet is not reachable'
        };
      }

      // Check for very slow connections that might timeout
      if (netInfo.type === 'cellular' && netInfo.details?.cellularGeneration === '2g') {
        return {
          suitable: false,
          reason: 'Network connection too slow for authentication'
        };
      }

      return { suitable: true };
    } catch (error) {
      console.error('❌ [NETWORK_AWARE] Error checking network suitability:', error);
      return {
        suitable: false,
        reason: 'Unable to determine network status'
      };
    }
  }

  /**
   * Get network quality indicator
   */
  static getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.currentNetworkStatus.isConnected) {
      return 'offline';
    }

    const { type } = this.currentNetworkStatus;

    switch (type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        // Could check cellular generation if available
        return 'good';
      case 'ethernet':
        return 'excellent';
      case 'bluetooth':
        return 'fair';
      default:
        return 'fair';
    }
  }

  /**
   * Cleanup network monitoring
   */
  static cleanup(): void {
    if (this.isMonitoring) {
      // NetInfo doesn't provide a direct way to remove all listeners
      // but we can clear our internal listeners
      this.networkListeners = [];
      this.isMonitoring = false;
      console.log('🔍 [NETWORK_AWARE] Network monitoring cleaned up');
    }
  }
}

export default NetworkAwareService;
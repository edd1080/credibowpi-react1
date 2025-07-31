// Logout Alert Service - Handles user confirmations for logout operations
import { Alert } from 'react-native';

/**
 * Service for handling logout confirmation dialogs
 */
export class LogoutAlertService {
  /**
   * Show offline logout confirmation dialog
   * 
   * @returns Promise<boolean> - true if user confirms logout
   */
  static showOfflineLogoutConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Logout Without Internet',
        'You are currently offline. If you logout now, you will need an internet connection to login again.\n\nAre you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User cancelled offline logout');
              resolve(false);
            }
          },
          {
            text: 'Logout Anyway',
            style: 'destructive',
            onPress: () => {
              console.log('✅ [LOGOUT_ALERT] User confirmed offline logout');
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show logout error dialog
   * 
   * @param error Error message to display
   */
  static showLogoutError(error: string): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Logout Error',
        `There was an error during logout:\n\n${error}\n\nYour session has been cleared locally.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User acknowledged logout error');
              resolve();
            }
          }
        ]
      );
    });
  }

  /**
   * Show logout success message
   */
  static showLogoutSuccess(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Logout Successful',
        'You have been logged out successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User acknowledged logout success');
              resolve();
            }
          }
        ]
      );
    });
  }

  /**
   * Show session expired dialog
   */
  static showSessionExpired(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again to continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User acknowledged session expiry');
              resolve();
            }
          }
        ]
      );
    });
  }

  /**
   * Show network error during logout
   */
  static showNetworkError(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Network Error',
        'Unable to connect to the server for logout. Your session will be cleared locally.\n\nDo you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User cancelled network error logout');
              resolve(false);
            }
          },
          {
            text: 'Continue',
            onPress: () => {
              console.log('✅ [LOGOUT_ALERT] User confirmed network error logout');
              resolve(true);
            }
          }
        ]
      );
    });
  }

  /**
   * Show offline logout warning with detailed explanation
   */
  static showDetailedOfflineLogoutWarning(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Logout While Offline',
        'You are currently offline. If you logout now:\n\n• Your session will be cleared locally\n• You will need internet to login again\n• Any unsaved data may be lost\n\nAre you sure you want to continue?',
        [
          {
            text: 'Stay Logged In',
            style: 'cancel',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User chose to stay logged in while offline');
              resolve(false);
            }
          },
          {
            text: 'Logout Anyway',
            style: 'destructive',
            onPress: () => {
              console.log('✅ [LOGOUT_ALERT] User confirmed detailed offline logout');
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show logout retry options when network fails
   */
  static showLogoutRetryOptions(): Promise<'retry' | 'offline' | 'cancel'> {
    return new Promise((resolve) => {
      Alert.alert(
        'Logout Failed',
        'Unable to logout from the server. What would you like to do?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User cancelled logout retry');
              resolve('cancel');
            }
          },
          {
            text: 'Try Again',
            onPress: () => {
              console.log('🔍 [LOGOUT_ALERT] User chose to retry logout');
              resolve('retry');
            }
          },
          {
            text: 'Logout Locally',
            style: 'destructive',
            onPress: () => {
              console.log('✅ [LOGOUT_ALERT] User chose offline logout');
              resolve('offline');
            }
          }
        ],
        { cancelable: false }
      );
    });
  }
}

export default LogoutAlertService;
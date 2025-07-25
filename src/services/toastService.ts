import { Alert } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export class ToastService {
  /**
   * Show a toast notification
   */
  static show(options: ToastOptions): void {
    const { title, message, type } = options;

    // For now, using Alert as a simple toast implementation
    // In a production app, you might want to use a proper toast library
    const alertTitle = title || this.getDefaultTitle(type);

    Alert.alert(alertTitle, message, [{ text: 'OK', style: 'default' }]);
  }

  /**
   * Show success toast
   */
  static success(message: string, title?: string): void {
    this.show({
      type: 'success',
      message,
      title: title || 'Éxito',
    });
  }

  /**
   * Show error toast
   */
  static error(message: string, title?: string): void {
    this.show({
      type: 'error',
      message,
      title: title || 'Error',
    });
  }

  /**
   * Show info toast
   */
  static info(message: string, title?: string): void {
    this.show({
      type: 'info',
      message,
      title: title || 'Información',
    });
  }

  /**
   * Show warning toast
   */
  static warning(message: string, title?: string): void {
    this.show({
      type: 'warning',
      message,
      title: title || 'Advertencia',
    });
  }

  /**
   * Get default title for toast type
   */
  private static getDefaultTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Éxito';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
      default:
        return 'Información';
    }
  }
}

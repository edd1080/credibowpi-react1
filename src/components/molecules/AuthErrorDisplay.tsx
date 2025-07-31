import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography, Icon, Button } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import AuthErrorHandlingService, { AuthErrorCategory, AuthErrorSeverity } from '../../services/AuthErrorHandlingService';

interface AuthErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  showDismissButton?: boolean;
  style?: any;
}

export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetryButton = true,
  showDismissButton = true,
  style
}) => {
  if (!error) return null;

  const errorInfo = AuthErrorHandlingService.analyzeError(error);

  const getErrorIcon = () => {
    switch (errorInfo.category) {
      case AuthErrorCategory.NETWORK:
        return 'wifi-off';
      case AuthErrorCategory.CREDENTIALS:
        return 'lock-01';
      case AuthErrorCategory.SERVER:
        return 'server-01';
      case AuthErrorCategory.SECURITY:
        return 'shield-alert';
      case AuthErrorCategory.CONFIGURATION:
        return 'settings-01';
      default:
        return 'alert-triangle';
    }
  };

  const getErrorColor = () => {
    switch (errorInfo.severity) {
      case AuthErrorSeverity.CRITICAL:
        return colors.error;
      case AuthErrorSeverity.HIGH:
        return colors.error;
      case AuthErrorSeverity.MEDIUM:
        return colors.warning;
      case AuthErrorSeverity.LOW:
        return colors.info;
      default:
        return colors.error;
    }
  };

  const getBackgroundColor = () => {
    const baseColor = getErrorColor();
    return baseColor + '10'; // 10% opacity
  };

  const getBorderColor = () => {
    return getErrorColor();
  };

  const canShowRetry = showRetryButton && errorInfo.canRetry && onRetry;
  const canShowDismiss = showDismissButton && onDismiss;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: getBackgroundColor(),
        borderLeftColor: getBorderColor()
      },
      style
    ]}>
      <View style={styles.header}>
        <Icon
          name={getErrorIcon()}
          size={20}
          color={getErrorColor()}
          style={styles.icon}
        />
        <View style={styles.titleContainer}>
          <Typography
            variant="bodyM"
            weight="semibold"
            style={[styles.title, { color: getErrorColor() }]}
          >
            {getErrorTitle(errorInfo.category)}
          </Typography>
          {errorInfo.severity === AuthErrorSeverity.CRITICAL && (
            <Typography
              variant="bodyS"
              style={[styles.severity, { color: getErrorColor() }]}
            >
              CRÍTICO
            </Typography>
          )}
        </View>
        {canShowDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Icon name="x" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <Typography
        variant="bodyS"
        color="secondary"
        style={styles.message}
      >
        {errorInfo.userMessage}
      </Typography>

      {errorInfo.suggestedActions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Typography
            variant="bodyS"
            weight="semibold"
            color="secondary"
            style={styles.actionsTitle}
          >
            Acciones sugeridas:
          </Typography>
          {errorInfo.suggestedActions.slice(0, 3).map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Typography variant="bodyS" color="secondary">
                • {action}
              </Typography>
            </View>
          ))}
        </View>
      )}

      {canShowRetry && (
        <View style={styles.buttonContainer}>
          <Button
            title="Reintentar"
            onPress={onRetry}
            variant="outline"
            size="small"
            style={[styles.retryButton, { borderColor: getErrorColor() }]}
            textStyle={{ color: getErrorColor() }}
          />
        </View>
      )}
    </View>
  );
};

const getErrorTitle = (category: AuthErrorCategory): string => {
  switch (category) {
    case AuthErrorCategory.NETWORK:
      return 'Error de Conexión';
    case AuthErrorCategory.CREDENTIALS:
      return 'Credenciales Incorrectas';
    case AuthErrorCategory.SERVER:
      return 'Error del Servidor';
    case AuthErrorCategory.SECURITY:
      return 'Error de Seguridad';
    case AuthErrorCategory.CONFIGURATION:
      return 'Error de Configuración';
    default:
      return 'Error de Autenticación';
  }
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.space16,
    borderRadius: spacing.borderRadius.md,
    borderLeftWidth: 4,
    marginVertical: spacing.space8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.space8,
  },

  icon: {
    marginRight: spacing.space12,
    marginTop: 2,
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    marginBottom: spacing.space2,
  },

  severity: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  dismissButton: {
    padding: spacing.space4,
    marginLeft: spacing.space8,
  },

  message: {
    marginBottom: spacing.space12,
    lineHeight: 20,
  },

  actionsContainer: {
    marginBottom: spacing.space12,
  },

  actionsTitle: {
    marginBottom: spacing.space6,
  },

  actionItem: {
    marginBottom: spacing.space4,
    paddingLeft: spacing.space8,
  },

  buttonContainer: {
    alignItems: 'flex-start',
  },

  retryButton: {
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space8,
  },
});
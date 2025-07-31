import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography, Icon, Button } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { BowpiErrorInfo } from '../../services/BowpiErrorManager';

interface ErrorRecoveryDisplayProps {
  error: BowpiErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  canRetry: boolean;
  canRecover: boolean;
  onRetry?: () => void;
  onRecover?: () => void;
  onDismiss?: () => void;
  style?: any;
}

export const ErrorRecoveryDisplay: React.FC<ErrorRecoveryDisplayProps> = ({
  error,
  isRecovering,
  recoveryAttempts,
  maxRecoveryAttempts,
  canRetry,
  canRecover,
  onRetry,
  onRecover,
  onDismiss,
  style
}) => {
  if (!error && !isRecovering) return null;

  const getErrorIcon = () => {
    if (isRecovering) return 'refresh-cw-01';
    
    if (!error) return 'alert-circle';
    
    switch (error.category) {
      case 'network':
        return 'wifi-off';
      case 'authentication':
        return 'lock-01';
      case 'storage':
        return 'hard-drive';
      case 'security':
        return 'shield-alert';
      case 'validation':
        return 'alert-triangle';
      default:
        return 'alert-circle';
    }
  };

  const getErrorColor = () => {
    if (isRecovering) return colors.info;
    
    if (!error) return colors.text.secondary;
    
    switch (error.severity) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.info;
      default:
        return colors.warning;
    }
  };

  const getBackgroundColor = () => {
    const baseColor = getErrorColor();
    return baseColor + '10'; // 10% opacity
  };

  const getBorderColor = () => {
    return getErrorColor();
  };

  const getTitle = () => {
    if (isRecovering) return 'Recuperando...';
    if (!error) return 'Error del Sistema';
    
    switch (error.category) {
      case 'network':
        return 'Error de Conexión';
      case 'authentication':
        return 'Error de Autenticación';
      case 'storage':
        return 'Error de Almacenamiento';
      case 'security':
        return 'Error de Seguridad';
      case 'validation':
        return 'Error de Validación';
      default:
        return 'Error del Sistema';
    }
  };

  const getMessage = () => {
    if (isRecovering) {
      return `Intentando recuperación automática... (${recoveryAttempts}/${maxRecoveryAttempts})`;
    }
    
    return error?.userMessage || 'Ha ocurrido un error inesperado';
  };

  const showRecoveryProgress = isRecovering && recoveryAttempts > 0;
  const showActions = !isRecovering && (canRetry || canRecover || onDismiss);

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
        <View style={styles.iconContainer}>
          {isRecovering ? (
            <ActivityIndicator size="small" color={getErrorColor()} />
          ) : (
            <Icon
              name={getErrorIcon()}
              size={20}
              color={getErrorColor()}
            />
          )}
        </View>
        
        <View style={styles.titleContainer}>
          <Typography
            variant="bodyM"
            weight="semibold"
            style={[styles.title, { color: getErrorColor() }]}
          >
            {getTitle()}
          </Typography>
          
          {error?.severity === 'critical' && (
            <Typography
              variant="bodyS"
              style={[styles.severity, { color: getErrorColor() }]}
            >
              CRÍTICO
            </Typography>
          )}
        </View>

        {onDismiss && !isRecovering && (
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
        {getMessage()}
      </Typography>

      {showRecoveryProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${(recoveryAttempts / maxRecoveryAttempts) * 100}%`,
                  backgroundColor: getErrorColor()
                }
              ]} 
            />
          </View>
          <Typography variant="bodyXS" color="secondary" style={styles.progressText}>
            Intento {recoveryAttempts} de {maxRecoveryAttempts}
          </Typography>
        </View>
      )}

      {error?.suggestedActions && error.suggestedActions.length > 0 && !isRecovering && (
        <View style={styles.actionsContainer}>
          <Typography
            variant="bodyS"
            weight="semibold"
            color="secondary"
            style={styles.actionsTitle}
          >
            Acciones sugeridas:
          </Typography>
          {error.suggestedActions.slice(0, 3).map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Typography variant="bodyS" color="secondary">
                • {action}
              </Typography>
            </View>
          ))}
        </View>
      )}

      {showActions && (
        <View style={styles.buttonContainer}>
          {canRetry && onRetry && (
            <Button
              title="Reintentar"
              onPress={onRetry}
              variant="outline"
              size="small"
              style={[styles.actionButton, { borderColor: getErrorColor() }]}
              textStyle={{ color: getErrorColor() }}
            />
          )}
          
          {canRecover && onRecover && (
            <Button
              title="Recuperar"
              onPress={onRecover}
              variant="filled"
              size="small"
              style={[styles.actionButton, { backgroundColor: getErrorColor() }]}
            />
          )}
        </View>
      )}

      {error?.code && !isRecovering && (
        <Typography
          variant="bodyXS"
          color="tertiary"
          style={styles.errorCode}
        >
          Código: {error.code}
        </Typography>
      )}
    </View>
  );
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

  iconContainer: {
    marginRight: spacing.space12,
    marginTop: 2,
    minWidth: 20,
    alignItems: 'center',
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

  progressContainer: {
    marginBottom: spacing.space12,
  },

  progressBar: {
    height: 4,
    backgroundColor: colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.space4,
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  progressText: {
    textAlign: 'center',
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
    flexDirection: 'row',
    gap: spacing.space8,
    marginBottom: spacing.space8,
  },

  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
  },

  errorCode: {
    textAlign: 'right',
    fontFamily: 'monospace',
  },
});
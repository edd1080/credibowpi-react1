import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography, Icon, Button } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import type { SessionInfo } from '../../services/SessionRecoveryService';

interface SessionRecoveryIndicatorProps {
  isRecovering: boolean;
  sessionInfo: SessionInfo | null;
  needsAttention: boolean;
  statusMessage: string;
  onForceValidation?: () => void;
  onDismiss?: () => void;
  style?: any;
  compact?: boolean;
}

export const SessionRecoveryIndicator: React.FC<SessionRecoveryIndicatorProps> = ({
  isRecovering,
  sessionInfo,
  needsAttention,
  statusMessage,
  onForceValidation,
  onDismiss,
  style,
  compact = false
}) => {
  // No mostrar si la sesión es válida y no está recuperando
  if (!isRecovering && sessionInfo?.isValid && !needsAttention) {
    return null;
  }

  const getStatusColor = () => {
    if (isRecovering) return colors.info;
    
    if (!sessionInfo) return colors.text.secondary;
    
    switch (sessionInfo.state) {
      case 'valid':
        return colors.success;
      case 'expired':
        return colors.warning;
      case 'corrupted':
      case 'missing':
        return colors.error;
      case 'network_error':
        return colors.warning;
      default:
        return colors.text.secondary;
    }
  };

  const getStatusIcon = () => {
    if (isRecovering) return 'refresh-cw-01';
    
    if (!sessionInfo) return 'help-circle';
    
    switch (sessionInfo.state) {
      case 'valid':
        return 'check-circle';
      case 'expired':
        return 'clock';
      case 'corrupted':
        return 'alert-triangle';
      case 'missing':
        return 'x-circle';
      case 'network_error':
        return 'wifi-off';
      default:
        return 'help-circle';
    }
  };

  const getBackgroundColor = () => {
    const baseColor = getStatusColor();
    return baseColor + '10'; // 10% opacity
  };

  const getBorderColor = () => {
    return getStatusColor();
  };

  const showActions = !isRecovering && needsAttention && onForceValidation;

  if (compact) {
    return (
      <View style={[
        styles.compactContainer,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor()
        },
        style
      ]}>
        <View style={styles.compactContent}>
          {isRecovering ? (
            <ActivityIndicator size="small" color={getStatusColor()} />
          ) : (
            <Icon
              name={getStatusIcon()}
              size={16}
              color={getStatusColor()}
            />
          )}
          
          <Typography
            variant="bodyS"
            style={[styles.compactText, { color: getStatusColor() }]}
          >
            {statusMessage}
          </Typography>
        </View>

        {showActions && (
          <TouchableOpacity onPress={onForceValidation} style={styles.compactAction}>
            <Icon name="refresh-cw-01" size={14} color={getStatusColor()} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

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
            <ActivityIndicator size="small" color={getStatusColor()} />
          ) : (
            <Icon
              name={getStatusIcon()}
              size={20}
              color={getStatusColor()}
            />
          )}
        </View>
        
        <View style={styles.titleContainer}>
          <Typography
            variant="bodyM"
            weight="semibold"
            style={[styles.title, { color: getStatusColor() }]}
          >
            Estado de Sesión
          </Typography>
          
          {needsAttention && (
            <Typography
              variant="bodyS"
              style={[styles.attention, { color: getStatusColor() }]}
            >
              REQUIERE ATENCIÓN
            </Typography>
          )}
        </View>

        {onDismiss && !needsAttention && (
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
        {statusMessage}
      </Typography>

      {sessionInfo && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Typography variant="bodyXS" color="tertiary">
              Fuente: {sessionInfo.source}
            </Typography>
            {sessionInfo.lastActivity && (
              <Typography variant="bodyXS" color="tertiary">
                Última actividad: {new Date(sessionInfo.lastActivity).toLocaleTimeString()}
              </Typography>
            )}
          </View>
          
          {sessionInfo.userId && (
            <Typography variant="bodyXS" color="tertiary" style={styles.userId}>
              Usuario: {sessionInfo.userId}
            </Typography>
          )}
        </View>
      )}

      {showActions && (
        <View style={styles.buttonContainer}>
          <Button
            title="Validar Sesión"
            onPress={onForceValidation}
            variant="outline"
            size="small"
            style={[styles.actionButton, { borderColor: getStatusColor() }]}
            textStyle={{ color: getStatusColor() }}
          />
        </View>
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

  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
  },

  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  compactText: {
    marginLeft: spacing.space8,
    fontSize: 12,
  },

  compactAction: {
    padding: spacing.space4,
    marginLeft: spacing.space8,
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
    marginBottom: spacing.space8,
  },

  attention: {
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
    lineHeight: 18,
  },

  detailsContainer: {
    marginBottom: spacing.space12,
    paddingTop: spacing.space8,
    borderTopWidth: 1,
    borderTopColor: colors.border.medium,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.space4,
  },

  userId: {
    fontFamily: 'monospace',
  },

  buttonContainer: {
    alignItems: 'flex-start',
  },

  actionButton: {
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space8,
  },
});
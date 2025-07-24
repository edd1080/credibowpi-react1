import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Typography } from '../atoms';
import { SimpleIcons } from '../atoms/SimpleIcon';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount?: number;
  lastSyncTime?: Date | null;
  onPress?: () => void;
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  pendingCount = 0,
  lastSyncTime,
  onPress,
  compact = false,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <ActivityIndicator size="small" color={colors.primary.blue} />;
      case 'success':
        return <SimpleIcons.check_circle size={16} color={colors.success} />;
      case 'error':
        return <SimpleIcons.error size={16} color={colors.error} />;
      default:
        return <SimpleIcons.sync size={16} color={colors.text.tertiary} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return lastSyncTime ? `Sincronizado ${formatTime(lastSyncTime)}` : 'Sincronizado';
      case 'error':
        return 'Error de sincronización';
      default:
        return pendingCount > 0 ? `${pendingCount} pendientes` : 'Sincronizado';
    }
  };

  const getStatusColor = (): 'primary' | 'secondary' | 'success' | 'error' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'syncing':
        return 'primary';
      default:
        return pendingCount > 0 ? 'primary' : 'secondary';
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    return date.toLocaleDateString();
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        compact && styles.containerCompact,
        onPress && styles.containerTouchable,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        {getStatusIcon()}
      </View>
      
      {!compact && (
        <View style={styles.textContainer}>
          <Typography
            variant="bodyS"
            color={getStatusColor()}
            weight="medium"
          >
            {getStatusText()}
          </Typography>
          
          {pendingCount > 0 && status !== 'syncing' && (
            <View style={styles.badge}>
              <Typography variant="caption" color="inverse">
                {pendingCount}
              </Typography>
            </View>
          )}
        </View>
      )}
      
      {compact && pendingCount > 0 && (
        <View style={styles.compactBadge}>
          <Typography variant="caption" color="inverse">
            {pendingCount}
          </Typography>
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
  },
  
  containerCompact: {
    paddingHorizontal: spacing.space8,
    paddingVertical: spacing.xs,
  },
  
  containerTouchable: {
    opacity: 1,
  },
  
  iconContainer: {
    marginRight: spacing.space8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  badge: {
    backgroundColor: colors.primary.deepBlue,
    borderRadius: spacing.borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  
  compactBadge: {
    backgroundColor: colors.primary.deepBlue,
    borderRadius: spacing.borderRadius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    marginLeft: spacing.space4,
  },
});
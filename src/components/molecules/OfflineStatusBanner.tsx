import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Typography } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface OfflineStatusBannerProps {
  onSyncPress?: () => void;
  pendingCount?: number;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  onSyncPress,
  pendingCount = 0,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [slideAnim] = useState(new Animated.Value(-60)); // Start hidden above screen

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isConnected === false) {
      // Show banner
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (isConnected === true) {
      // Hide banner
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, slideAnim]);

  if (isConnected !== false) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Typography variant="bodyS" color="inverse" weight="medium">
            📡 Sin conexión
          </Typography>
          {pendingCount > 0 && (
            <Typography variant="caption" color="inverse">
              {pendingCount} cambios pendientes
            </Typography>
          )}
        </View>

        {onSyncPress && pendingCount > 0 && (
          <TouchableOpacity style={styles.syncButton} onPress={onSyncPress}>
            <Typography variant="caption" color="inverse" weight="medium">
              Sincronizar
            </Typography>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.warning,
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
    paddingTop: spacing.space12 + 44, // Add safe area top padding
  },

  leftContent: {
    flex: 1,
  },

  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    borderRadius: spacing.borderRadius.sm,
  },
});

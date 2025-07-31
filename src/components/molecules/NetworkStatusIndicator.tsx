import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography, Icon } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface NetworkStatusIndicatorProps {
  isConnected: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  style?: any;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  isConnected,
  quality,
  style
}) => {
  const getStatusColor = () => {
    if (!isConnected) return colors.error;
    
    switch (quality) {
      case 'excellent':
      case 'good':
        return colors.success;
      case 'fair':
        return colors.warning;
      case 'poor':
        return colors.error;
      default:
        return colors.text.tertiary;
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Sin conexión';
    
    switch (quality) {
      case 'excellent':
        return 'Conexión excelente';
      case 'good':
        return 'Conexión buena';
      case 'fair':
        return 'Conexión regular';
      case 'poor':
        return 'Conexión lenta';
      default:
        return 'Verificando conexión...';
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return 'wifi-off';
    
    switch (quality) {
      case 'excellent':
        return 'wifi';
      case 'good':
        return 'wifi';
      case 'fair':
        return 'wifi-low-signal';
      case 'poor':
        return 'wifi-low-signal';
      default:
        return 'wifi';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Icon
        name={getStatusIcon()}
        size={16}
        color={getStatusColor()}
      />
      <Typography
        variant="bodyS"
        style={[styles.text, { color: getStatusColor() }]}
      >
        {getStatusText()}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },

  text: {
    marginLeft: spacing.space8,
    fontSize: 12,
  },
});
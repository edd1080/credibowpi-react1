import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string | undefined;
  color?: 'primary' | 'success' | 'warning' | 'error';
  iconName?:
    | 'new_applications'
    | 'in_progress'
    | 'completed'
    | 'rejected'
    | 'analytics'
    | 'trending_up';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  color = 'primary',
  iconName,
  onPress,
  size = 'medium',
}) => {
  const getColorScheme = () => {
    switch (color) {
      case 'success':
        return {
          background: colors.background.primary, // White background
          iconBackground: '#E8F5E8', // Light green background for icon
          iconColor: '#22C55E', // Green icon
          valueColor: colors.text.primary, // Dark text for value
        };
      case 'warning':
        return {
          background: colors.background.primary, // White background
          iconBackground: '#FEF3C7', // Light yellow background for icon
          iconColor: '#F59E0B', // Yellow/orange icon
          valueColor: colors.text.primary, // Dark text for value
        };
      case 'error':
        return {
          background: colors.background.primary, // White background
          iconBackground: '#FEE2E2', // Light red background for icon
          iconColor: '#EF4444', // Red icon
          valueColor: colors.text.primary, // Dark text for value
        };
      default:
        return {
          background: colors.background.primary, // White background
          iconBackground: '#EBF4FF', // Light blue background for icon
          iconColor: colors.primary.blue, // Blue icon
          valueColor: colors.text.primary, // Dark text for value
        };
    }
  };

  const colorScheme = getColorScheme();

  const getMetricIcon = () => {
    if (!iconName) return null;

    const iconSize = 24;

    switch (iconName) {
      case 'new_applications':
        return <Feather name="trending-up" size={iconSize} color={colorScheme.iconColor} />;
      case 'in_progress':
        return <Feather name="clock" size={iconSize} color={colorScheme.iconColor} />;
      case 'completed':
        return <MaterialIcons name="check-circle" size={iconSize} color={colorScheme.iconColor} />;
      case 'rejected':
        return <MaterialCommunityIcons name="alert-circle" size={iconSize} color={colorScheme.iconColor} />;
      case 'analytics':
        return <MaterialIcons name="analytics" size={iconSize} color={colorScheme.iconColor} />;
      case 'trending_up':
        return <Feather name="trending-up" size={iconSize} color={colorScheme.iconColor} />;
      default:
        return <MaterialIcons name="dashboard" size={iconSize} color={colorScheme.iconColor} />;
    }
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.container,
        { backgroundColor: colorScheme.background },
        size === 'small' && styles.containerSmall,
        size === 'large' && styles.containerLarge,
        onPress && styles.containerTouchable,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Top row with icon and value */}
      <View style={styles.topRow}>
        {iconName && (
          <View style={[styles.iconContainer, { backgroundColor: colorScheme.iconBackground }]}>
            {getMetricIcon()}
          </View>
        )}
        
        <Typography
          variant="h1"
          weight="bold"
          style={[styles.value, { color: colorScheme.valueColor }] as any}
        >
          {value}
        </Typography>
      </View>

      {/* Bottom title */}
      <View style={styles.bottomRow}>
        <Typography
          variant="bodyM"
          color="secondary"
          weight="medium"
          style={styles.title}
        >
          {title}
        </Typography>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.space20,
    borderRadius: spacing.borderRadius.xl,
    minHeight: 120,
    justifyContent: 'space-between',
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  containerSmall: {
    padding: spacing.space16,
    minHeight: 100,
  },

  containerLarge: {
    padding: spacing.space24,
    minHeight: 140,
  },

  containerTouchable: {
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.space16,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  value: {
    fontSize: 32,
    lineHeight: 40,
  },

  bottomRow: {
    marginTop: 'auto',
  },

  title: {
    // No additional styles needed, using default Typography styles
  },
});

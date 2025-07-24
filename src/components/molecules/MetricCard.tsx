import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Typography } from '../atoms';
import { SimpleIcons } from '../atoms/SimpleIcon';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string | undefined;
  color?: 'primary' | 'success' | 'warning' | 'error';
  iconName?: 'new_applications' | 'in_progress' | 'completed' | 'sync_pending' | 'analytics' | 'trending_up';
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
  subtitle,
  color = 'primary',
  iconName,
  trend,
  onPress,
  size = 'medium',
}) => {
  const getColorScheme = () => {
    switch (color) {
      case 'success':
        return {
          background: colors.background.secondary,
          accent: colors.success,
          text: colors.success,
        };
      case 'warning':
        return {
          background: colors.background.secondary,
          accent: colors.warning,
          text: colors.warning,
        };
      case 'error':
        return {
          background: colors.background.secondary,
          accent: colors.error,
          text: colors.error,
        };
      default:
        return {
          background: colors.background.secondary,
          accent: colors.primary.blue,
          text: colors.primary.deepBlue,
        };
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <SimpleIcons.trending_up size={12} color={colors.success} />;
      case 'down':
        return <SimpleIcons.trending_up size={12} color={colors.error} />;
      default:
        return <SimpleIcons.trending_up size={12} color={colors.text.secondary} />;
    }
  };

  const colorScheme = getColorScheme();

  const getMetricIcon = () => {
    if (!iconName) return null;
    
    const iconColor = colorScheme.accent;
    const iconSize = size === 'large' ? 24 : size === 'small' ? 16 : 20;
    
    switch (iconName) {
      case 'new_applications':
        return <SimpleIcons.add size={iconSize} color={iconColor} />;
      case 'in_progress':
        return <SimpleIcons.hourglass_empty size={iconSize} color={iconColor} />;
      case 'completed':
        return <SimpleIcons.check_circle size={iconSize} color={iconColor} />;
      case 'sync_pending':
        return <SimpleIcons.sync size={iconSize} color={iconColor} />;
      case 'analytics':
        return <SimpleIcons.analytics size={iconSize} color={iconColor} />;
      case 'trending_up':
        return <SimpleIcons.trending_up size={iconSize} color={iconColor} />;
      default:
        return <SimpleIcons.dashboard size={iconSize} color={iconColor} />;
    }
  };

  const getTrendColor = (): 'success' | 'error' | 'secondary' => {
    if (!trend) return 'secondary';
    
    switch (trend.direction) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'secondary';
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
      {/* Header with icon and title */}
      <View style={styles.header}>
        {iconName && (
          <View style={styles.iconContainer}>
            {getMetricIcon()}
          </View>
        )}
        <Typography
          variant={size === 'small' ? 'bodyS' : 'bodyM'}
          color="secondary"
          weight="medium"
          style={styles.title}
        >
          {title}
        </Typography>
      </View>

      {/* Main value */}
      <View style={styles.valueContainer}>
        <Typography
          variant={size === 'large' ? 'h1' : size === 'small' ? 'h3' : 'h2'}
          color="primary"
          weight="bold"
          style={[styles.value, { color: colorScheme.text }] as any}
        >
          {value}
        </Typography>
        
        {trend && (
          <View style={styles.trendContainer}>
            <View style={styles.trendContent}>
              {getTrendIcon()}
              <Typography variant="caption" color={getTrendColor()} style={styles.trendText}>
                {trend.percentage}%
              </Typography>
            </View>
          </View>
        )}
      </View>

      {/* Subtitle */}
      {subtitle && (
        <Typography
          variant={size === 'small' ? 'caption' : 'bodyS'}
          color="tertiary"
          style={styles.subtitle}
        >
          {subtitle}
        </Typography>
      )}

      {/* Accent line */}
      <View
        style={[
          styles.accentLine,
          { backgroundColor: colorScheme.accent },
        ]}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.space16,
    borderRadius: spacing.borderRadius.lg,
    position: 'relative',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  
  containerSmall: {
    padding: spacing.space12,
    minHeight: 80,
  },
  
  containerLarge: {
    padding: spacing.space20,
    minHeight: 120,
  },
  
  containerTouchable: {
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space8,
  },
  
  iconContainer: {
    marginRight: spacing.space8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  title: {
    flex: 1,
  },
  
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.space4,
  },
  
  value: {
    flex: 1,
  },
  
  trendContainer: {
    marginLeft: spacing.space8,
  },
  
  trendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  trendText: {
    marginLeft: spacing.space4,
  },
  
  subtitle: {
    marginBottom: spacing.space8,
  },
  
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: spacing.space16,
    right: spacing.space16,
    height: 3,
    borderRadius: spacing.borderRadius.sm,
  },
});
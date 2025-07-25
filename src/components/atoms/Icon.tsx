import React from 'react';
import { colors } from '../../constants/colors';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps & { name: string }> = ({
  name,
  size = 24,
  color = colors.text.primary,
  ...props
}) => {
  // Map icon names to Expo vector icons
  const iconMap: Record<string, { component: any; name: string }> = {
    'view-02': { component: Feather, name: 'eye' },
    'view-off-02': { component: Feather, name: 'eye-off' },
    'cancel-01': { component: MaterialIcons, name: 'cancel' },
    'add-01': { component: MaterialIcons, name: 'add' },
    'analytics-01': { component: MaterialIcons, name: 'analytics' },
    'trending-up': { component: Feather, name: 'trending-up' },
    'checkmark-circle-01': { component: MaterialIcons, name: 'check-circle' },
    'clock-01': { component: Feather, name: 'clock' },
    'sync-01': { component: MaterialIcons, name: 'sync' },
    'dashboard-01': { component: MaterialIcons, name: 'dashboard' },
  };

  const iconConfig = iconMap[name] || { component: MaterialIcons, name: 'help' };
  const IconComponent = iconConfig.component;
  
  return <IconComponent name={iconConfig.name} size={size} color={color} {...props} />;
};

// Predefined Icons for common use cases
export const Icons = {
  // Dashboard & Metrics
  dashboard: (props?: Partial<IconProps>) => (
    <MaterialIcons name="dashboard" size={24} color={colors.text.primary} {...props} />
  ),
  analytics: (props?: Partial<IconProps>) => (
    <MaterialIcons name="analytics" size={24} color={colors.text.primary} {...props} />
  ),
  trending_up: (props?: Partial<IconProps>) => (
    <Feather name="trending-up" size={24} color={colors.text.primary} {...props} />
  ),

  // Sync & Status
  sync: (props?: Partial<IconProps>) => (
    <MaterialIcons name="sync" size={24} color={colors.text.primary} {...props} />
  ),
  check_circle: (props?: Partial<IconProps>) => (
    <MaterialIcons name="check-circle" size={24} color={colors.text.primary} {...props} />
  ),
  error: (props?: Partial<IconProps>) => (
    <MaterialIcons name="error" size={24} color={colors.text.primary} {...props} />
  ),
  cancel: (props?: Partial<IconProps>) => (
    <MaterialIcons name="cancel" size={24} color={colors.text.primary} {...props} />
  ),

  // Actions
  add: (props?: Partial<IconProps>) => (
    <MaterialIcons name="add" size={24} color={colors.text.primary} {...props} />
  ),

  // Authentication
  visibility: (props?: Partial<IconProps>) => (
    <Feather name="eye" size={24} color={colors.text.primary} {...props} />
  ),
  visibility_off: (props?: Partial<IconProps>) => (
    <Feather name="eye-off" size={24} color={colors.text.primary} {...props} />
  ),

  // Time & Progress
  schedule: (props?: Partial<IconProps>) => (
    <Feather name="clock" size={24} color={colors.text.primary} {...props} />
  ),
  hourglass_empty: (props?: Partial<IconProps>) => (
    <MaterialCommunityIcons name="timer-sand" size={24} color={colors.text.primary} {...props} />
  ),
};

export default Icon;
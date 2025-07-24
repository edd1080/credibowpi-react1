import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export interface SimpleIconProps {
  name: string;
  size?: number;
  color?: string;
}

// Simple fallback icons using text/emojis until HugeIcons is fully working
const iconMap: Record<string, string> = {
  // Dashboard & Metrics
  dashboard: '📊',
  analytics: '📈',
  trending_up: '📈',
  
  // Applications & Forms
  description: '📄',
  assignment: '📋',
  edit: '✏️',
  
  // Sync & Status
  sync: '🔄',
  sync_problem: '⚠️',
  check_circle: '✅',
  error: '❌',
  warning: '⚠️',
  
  // Navigation
  home: '🏠',
  person: '👤',
  settings: '⚙️',
  
  // Actions
  add: '➕',
  refresh: '🔄',
  search: '🔍',
  
  // Status indicators
  wifi_off: '📶',
  cloud_done: '☁️',
  cloud_upload: '☁️',
  
  // Authentication
  visibility: '👁️',
  visibility_off: '🙈',
  fingerprint: '👆',
  
  // Time & Progress
  schedule: '⏰',
  hourglass_empty: '⏳',
  
  // Documents
  folder: '📁',
  attach_file: '📎',
  
  // Communication
  notifications: '🔔',
  mail: '📧',
};

export const SimpleIcon: React.FC<SimpleIconProps> = ({
  name,
  size = 24,
  color = colors.text.primary,
}) => {
  const emoji = iconMap[name] || '❓';
  
  return (
    <Text style={[styles.icon, { fontSize: size, color }]}>
      {emoji}
    </Text>
  );
};

// Simple Icons object for easy use
export const SimpleIcons = {
  // Dashboard & Metrics
  dashboard: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="dashboard" {...props} />
  ),
  analytics: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="analytics" {...props} />
  ),
  trending_up: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="trending_up" {...props} />
  ),
  
  // Applications & Forms
  description: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="description" {...props} />
  ),
  assignment: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="assignment" {...props} />
  ),
  edit: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="edit" {...props} />
  ),
  
  // Sync & Status
  sync: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="sync" {...props} />
  ),
  sync_problem: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="sync_problem" {...props} />
  ),
  check_circle: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="check_circle" {...props} />
  ),
  error: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="error" {...props} />
  ),
  warning: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="warning" {...props} />
  ),
  
  // Navigation
  home: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="home" {...props} />
  ),
  person: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="person" {...props} />
  ),
  settings: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="settings" {...props} />
  ),
  
  // Actions
  add: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="add" {...props} />
  ),
  refresh: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="refresh" {...props} />
  ),
  search: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="search" {...props} />
  ),
  
  // Status indicators
  wifi_off: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="wifi_off" {...props} />
  ),
  cloud_done: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="cloud_done" {...props} />
  ),
  cloud_upload: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="cloud_upload" {...props} />
  ),
  
  // Authentication
  visibility: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="visibility" {...props} />
  ),
  visibility_off: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="visibility_off" {...props} />
  ),
  fingerprint: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="fingerprint" {...props} />
  ),
  
  // Time & Progress
  schedule: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="schedule" {...props} />
  ),
  hourglass_empty: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="hourglass_empty" {...props} />
  ),
  
  // Documents
  folder: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="folder" {...props} />
  ),
  attach_file: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="attach_file" {...props} />
  ),
  
  // Communication
  notifications: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="notifications" {...props} />
  ),
  mail: (props?: Partial<SimpleIconProps>) => (
    <SimpleIcon name="mail" {...props} />
  ),
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default SimpleIcon;
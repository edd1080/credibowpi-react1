import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../constants/colors';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

// Icon mapping from HugeIcons names to Expo Vector Icons
const iconMapping: Record<string, { library: 'Ionicons' | 'MaterialIcons' | 'Feather'; name: string }> = {
  // Common icons
  'home01': { library: 'Ionicons', name: 'home' },
  'settings': { library: 'Ionicons', name: 'settings' },
  'sync01': { library: 'Ionicons', name: 'sync' },
  'notification01': { library: 'Ionicons', name: 'notifications' },
  'helpCircle': { library: 'Ionicons', name: 'help-circle' },
  'informationCircle': { library: 'Ionicons', name: 'information-circle' },
  'googleDoc': { library: 'Ionicons', name: 'document-text' },
  'accountSetting03': { library: 'Ionicons', name: 'settings' },
  // Add more mappings as needed
};

export interface HugeIconProps {
  name: string;
  size?: number;
  color?: string;
  variant?: 'stroke' | 'solid' | 'bulk' | 'duotone' | 'twotone';
}

export const HugeIcon: React.FC<HugeIconProps> = ({
  name,
  size = 24,
  color = colors.text.primary,
  variant = 'stroke',
}) => {
  // Check if we have a mapping for this icon
  const mappedIcon = iconMapping[name];
  
  if (mappedIcon) {
    const { library, name: iconName } = mappedIcon;
    
    try {
      switch (library) {
        case 'Ionicons':
          return <Ionicons name={iconName as any} size={size} color={color} />;
        case 'MaterialIcons':
          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        case 'Feather':
          return <Feather name={iconName as any} size={size} color={color} />;
        default:
          return <Ionicons name={iconName as any} size={size} color={color} />;
      }
    } catch (error) {
      console.warn(`Error rendering mapped icon "${name}":`, error);
    }
  }

  // Fallback to a default icon if no mapping exists
  console.warn(`No mapping found for icon "${name}", using default settings icon`);
  return <Ionicons name="settings" size={size} color={color} />;
};

export default HugeIcon;
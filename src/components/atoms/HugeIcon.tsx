import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../constants/colors';

// Try to import HugeIcons Pro
let HugeIconsProRN: any;
let HugeIconsRN: any;
let availableIcons: string[] = [];

try {
  // Try Pro version first
  HugeIconsProRN = require('@hugeicons/react-native-pro');
  availableIcons = Object.keys(HugeIconsProRN);
  console.log('HugeIcons Pro available with', availableIcons.length, 'icons');
  console.log('Sample Pro icons:', availableIcons.slice(0, 10));
} catch (error) {
  console.log('HugeIcons Pro not available:', error instanceof Error ? error.message : 'Unknown error');
}

try {
  // Try regular version
  HugeIconsRN = require('@hugeicons/react-native');
  if (!HugeIconsProRN) {
    availableIcons = Object.keys(HugeIconsRN);
    console.log('HugeIcons regular available with', availableIcons.length, 'icons');
    console.log('Sample regular icons:', availableIcons.slice(0, 10));
  }
} catch (error) {
  console.log('HugeIcons regular not available:', error instanceof Error ? error.message : 'Unknown error');
}

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
  // Try to get the icon from Pro version first, then regular version
  const iconLibrary = HugeIconsProRN || HugeIconsRN;
  
  if (!iconLibrary) {
    console.warn('No HugeIcons library available');
    // Return a placeholder for debugging
    return (
      <View style={{ width: size, height: size, backgroundColor: '#ff0000', borderRadius: size/2 }}>
        <Text style={{ color: 'white', fontSize: 8, textAlign: 'center' }}>?</Text>
      </View>
    );
  }

  // Try different naming conventions for HugeIcons
  const possibleNames = [
    name,
    `${name}Icon`,
    `${name}StrokeRounded`,
    `${name}Stroke`,
    `${name}${variant.charAt(0).toUpperCase() + variant.slice(1)}`,
    `${name.charAt(0).toUpperCase() + name.slice(1)}`,
    `${name.charAt(0).toUpperCase() + name.slice(1)}Icon`,
    `${name.charAt(0).toUpperCase() + name.slice(1)}StrokeRounded`,
    `${name.charAt(0).toUpperCase() + name.slice(1)}Stroke`,
    // Common HugeIcons patterns
    name.replace(/(\d+)$/, '$1StrokeRounded'),
    name.replace(/(\d+)$/, '$1Stroke'),
    name.replace(/(\d+)$/, '$1Icon'),
  ];

  let IconComponent = null;
  let foundName = '';
  
  for (const possibleName of possibleNames) {
    if (iconLibrary[possibleName]) {
      IconComponent = iconLibrary[possibleName];
      foundName = possibleName;
      break;
    }
  }

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in HugeIcons.`);
    console.warn('Tried names:', possibleNames);
    console.warn('Available icons sample:', availableIcons.slice(0, 20));
    
    // Return a placeholder for debugging
    return (
      <View style={{ width: size, height: size, backgroundColor: '#ff9900', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 6, textAlign: 'center' }}>{name.slice(0, 3)}</Text>
      </View>
    );
  }

  try {
    console.log(`Rendering HugeIcon: ${name} -> ${foundName}`);
    return <IconComponent size={size} color={color} />;
  } catch (error) {
    console.error(`Error rendering icon "${name}" (${foundName}):`, error);
    // Return a placeholder for debugging
    return (
      <View style={{ width: size, height: size, backgroundColor: '#ff0000', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 6, textAlign: 'center' }}>ERR</Text>
      </View>
    );
  }
};

export default HugeIcon;
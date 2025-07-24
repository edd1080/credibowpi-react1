import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing } from '../../constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'sync' | 'retry';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  testID,
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.neutral.white : colors.primary.deepBlue}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
  },
  baseText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodyM,
    lineHeight: typography.lineHeight.bodyM,
    fontWeight: typography.fontWeight.medium,
  },

  // Variant styles
  primary: {
    backgroundColor: colors.primary.deepBlue,
    borderWidth: 0,
  },
  primaryText: {
    color: colors.neutral.white,
  },

  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.deepBlue,
  },
  secondaryText: {
    color: colors.primary.deepBlue,
  },

  tertiary: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tertiaryText: {
    color: colors.primary.deepBlue,
  },

  sync: {
    backgroundColor: colors.primary.blue,
    borderWidth: 0,
  },
  syncText: {
    color: colors.neutral.white,
  },

  retry: {
    backgroundColor: colors.warning,
    borderWidth: 0,
  },
  retryText: {
    color: colors.neutral.white,
  },

  // Size styles
  small: {
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space8,
    minHeight: 36,
  },
  smallText: {
    fontSize: typography.fontSize.bodyS,
    lineHeight: typography.lineHeight.bodyS,
  },

  medium: {
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
    minHeight: spacing.touchTarget,
  },
  mediumText: {
    fontSize: typography.fontSize.bodyM,
    lineHeight: typography.lineHeight.bodyM,
  },

  large: {
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space16,
    minHeight: 52,
  },
  largeText: {
    fontSize: typography.fontSize.bodyL,
    lineHeight: typography.lineHeight.bodyL,
  },

  // State styles
  disabled: {
    backgroundColor: colors.neutral.gray300,
    borderColor: colors.neutral.gray300,
  },
  disabledText: {
    color: colors.neutral.gray500,
  },
});
import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'bodyL' | 'bodyM' | 'bodyS' | 'label' | 'caption';
export type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'success' | 'warning' | 'error';
export type TypographyWeight = 'regular' | 'medium' | 'bold';

export interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  weight?: TypographyWeight;
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
  testID?: string;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'bodyM',
  color = 'primary',
  weight = 'regular',
  children,
  style,
  numberOfLines,
  testID,
}) => {
  const textStyles = [
    styles.base,
    styles[variant],
    styles[`${color}Color`],
    styles[`${weight}Weight`],
    style,
  ];

  return (
    <Text
      style={textStyles}
      numberOfLines={numberOfLines}
      testID={testID}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.primary,
  },

  // Variant styles
  h1: {
    fontSize: typography.fontSize.h1,
    lineHeight: typography.lineHeight.h1,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  h2: {
    fontSize: typography.fontSize.h2,
    lineHeight: typography.lineHeight.h2,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
  h3: {
    fontSize: typography.fontSize.h3,
    lineHeight: typography.lineHeight.h3,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.medium,
  },
  bodyL: {
    fontSize: typography.fontSize.bodyL,
    lineHeight: typography.lineHeight.bodyL,
  },
  bodyM: {
    fontSize: typography.fontSize.bodyM,
    lineHeight: typography.lineHeight.bodyM,
  },
  bodyS: {
    fontSize: typography.fontSize.bodyS,
    lineHeight: typography.lineHeight.bodyS,
  },
  label: {
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.medium,
  },
  caption: {
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
  },

  // Color styles
  primaryColor: {
    color: colors.text.primary,
  },
  secondaryColor: {
    color: colors.text.secondary,
  },
  tertiaryColor: {
    color: colors.text.tertiary,
  },
  inverseColor: {
    color: colors.text.inverse,
  },
  successColor: {
    color: colors.success,
  },
  warningColor: {
    color: colors.warning,
  },
  errorColor: {
    color: colors.error,
  },

  // Weight styles
  regularWeight: {
    fontWeight: typography.fontWeight.regular,
    fontFamily: typography.fontFamily.primary,
  },
  mediumWeight: {
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.medium,
  },
  boldWeight: {
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamily.bold,
  },
});
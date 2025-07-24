import React, { useState, useCallback, useMemo } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing } from '../../constants/spacing';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
}

export const TextInput: React.FC<TextInputProps> = React.memo(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  // Memoize callbacks to prevent unnecessary re-renders
  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  }, [props.onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  }, [props.onBlur]);

  const handleRightIconPress = useCallback(() => {
    onRightIconPress?.();
  }, [onRightIconPress]);

  // Memoize styles to prevent recalculation
  const labelStyle = useMemo(() => [
    styles.label,
    hasError && styles.labelError,
    isFocused && styles.labelFocused,
  ], [hasError, isFocused]);

  const inputContainerStyle = useMemo(() => [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    hasError && styles.inputContainerError,
  ], [isFocused, hasError]);

  const inputTextStyle = useMemo(() => [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    rightIcon && styles.inputWithRightIcon,
    inputStyle,
  ], [leftIcon, rightIcon, inputStyle]);

  const helperTextStyle = useMemo(() => [
    styles.helperText,
    hasError && styles.errorText,
  ], [hasError]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={labelStyle}>
          {label}
        </Text>
      )}
      
      <View style={inputContainerStyle}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        <RNTextInput
          style={inputTextStyle}
          placeholderTextColor={colors.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={handleRightIconPress}
            disabled={!onRightIconPress}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={helperTextStyle}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.space16,
  },
  
  label: {
    fontSize: typography.fontSize.label,
    lineHeight: typography.lineHeight.label,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.space8,
  },
  
  labelFocused: {
    color: colors.primary.deepBlue,
  },
  
  labelError: {
    color: colors.error,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.primary,
    minHeight: spacing.touchTarget,
  },
  
  inputContainerFocused: {
    borderColor: colors.primary.deepBlue,
    borderWidth: 2,
  },
  
  inputContainerError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  
  input: {
    flex: 1,
    fontSize: typography.fontSize.bodyM,
    lineHeight: typography.lineHeight.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
  },
  
  inputWithLeftIcon: {
    paddingLeft: spacing.space8,
  },
  
  inputWithRightIcon: {
    paddingRight: spacing.space8,
  },
  
  leftIconContainer: {
    paddingLeft: spacing.space16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  rightIconContainer: {
    paddingRight: spacing.space16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  helperText: {
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.tertiary,
    marginTop: spacing.space4,
    marginLeft: spacing.space4,
  },
  
  errorText: {
    color: colors.error,
  },
});
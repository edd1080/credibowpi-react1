import React from 'react';
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

export interface SimpleTextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const SimpleTextInput: React.FC<SimpleTextInputProps> = ({
  label,
  error,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const hasError = !!error;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, hasError && styles.labelError]}>
          {label}
        </Text>
      )}

      <View style={[styles.inputContainer, hasError && styles.inputContainerError]}>
        <RNTextInput
          style={[styles.input, rightIcon && styles.inputWithRightIcon, style]}
          placeholderTextColor={colors.text.tertiary}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.space16,
  },

  label: {
    fontSize: typography.fontSize.label,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.space8,
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
    minHeight: 48,
  },

  inputContainerError: {
    borderColor: colors.error,
  },

  input: {
    flex: 1,
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
  },

  inputWithRightIcon: {
    paddingRight: spacing.space8,
  },

  rightIconContainer: {
    paddingRight: spacing.space16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.error,
    marginTop: spacing.space4,
    marginLeft: spacing.space4,
  },
});
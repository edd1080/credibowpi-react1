// Dynamic form field component that renders different field types
// Supports floating labels, validation states, and conditional logic

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,

} from 'react-native';
import { TextInput } from '../../../components/atoms/TextInput';
import { colors } from '../../../constants/colors';
import { typography } from '../../../constants/typography';
import { spacing } from '../../../constants/spacing';
import { FormFieldSchema } from '../types';

export interface FormFieldProps {
  field: FormFieldSchema;
  value: any;
  error?: string;
  onValueChange: (value: any) => void;
  onBlur?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const FormField: React.FC<FormFieldProps> = React.memo(({
  field,
  value,
  error,
  onValueChange,
  onBlur,
  disabled = false,
  autoFocus = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleValueChange = useCallback((newValue: any) => {
    onValueChange(newValue);
  }, [onValueChange]);

  const handlePickerSelect = useCallback((selectedValue: any) => {
    handleValueChange(selectedValue);
    setShowPicker(false);
  }, [handleValueChange]);

  const renderTextInput = () => {
    let keyboardType: any = 'default';
    let autoCapitalize: any = 'sentences';
    let placeholder = field.placeholder || '';

    switch (field.type) {
      case 'email':
        keyboardType = 'email-address';
        autoCapitalize = 'none';
        break;
      case 'phone':
        keyboardType = 'phone-pad';
        break;
      case 'number':
      case 'currency':
        keyboardType = 'numeric';
        break;
    }

    // Format currency display
    if (field.type === 'currency' && value) {
      const numValue = parseFloat(value) || 0;
      placeholder = `Q ${numValue.toFixed(2)}`;
    }

    return (
      <TextInput
        label={field.label}
        value={value || ''}
        onChangeText={handleValueChange}
        onBlur={onBlur}
        placeholder={placeholder}
        error={error || undefined}
        helperText={field.helperText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        autoFocus={autoFocus}
        multiline={field.type === 'textarea'}
        numberOfLines={field.type === 'textarea' ? 4 : 1}
        containerStyle={field.type === 'textarea' && styles.textareaContainer}
      />
    );
  };

  const renderSelectField = () => {
    const selectedOption = field.options?.find(opt => opt.value === value);
    const displayValue = selectedOption?.label || field.placeholder || 'Seleccionar...';

    return (
      <View>
        <TouchableOpacity
          style={[
            styles.selectContainer,
            error && styles.selectContainerError,
            disabled && styles.selectContainerDisabled
          ]}
          onPress={() => !disabled && setShowPicker(true)}
          disabled={disabled}
        >
          <View style={styles.selectContent}>
            {field.label && (
              <Text style={[
                styles.selectLabel,
                error && styles.selectLabelError,
                value && styles.selectLabelFloating
              ]}>
                {field.label}
              </Text>
            )}
            <Text style={[
              styles.selectValue,
              !value && styles.selectPlaceholder,
              disabled && styles.selectValueDisabled
            ]}>
              {displayValue}
            </Text>
          </View>
          <Text style={styles.selectArrow}>▼</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {field.helperText && !error && (
          <Text style={styles.helperText}>{field.helperText}</Text>
        )}

        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{field.label}</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={field.options || []}
                keyExtractor={(item) => String(item.value)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      item.value === value && styles.optionItemSelected
                    ]}
                    onPress={() => handlePickerSelect(item.value)}
                    disabled={item.disabled}
                  >
                    <Text style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                      item.disabled && styles.optionTextDisabled
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderRadioField = () => {
    return (
      <View style={styles.radioContainer}>
        {field.label && (
          <Text style={[styles.radioLabel, error && styles.radioLabelError]}>
            {field.label}
          </Text>
        )}
        
        <View style={styles.radioOptions}>
          {field.options?.map((option) => (
            <TouchableOpacity
              key={String(option.value)}
              style={styles.radioOption}
              onPress={() => !disabled && handleValueChange(option.value)}
              disabled={disabled || option.disabled}
            >
              <View style={[
                styles.radioCircle,
                value === option.value && styles.radioCircleSelected,
                disabled && styles.radioCircleDisabled
              ]}>
                {value === option.value && <View style={styles.radioInner} />}
              </View>
              <Text style={[
                styles.radioOptionText,
                disabled && styles.radioOptionTextDisabled
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {field.helperText && !error && (
          <Text style={styles.helperText}>{field.helperText}</Text>
        )}
      </View>
    );
  };

  const renderCheckboxField = () => {
    const isChecked = Boolean(value);

    return (
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => !disabled && handleValueChange(!isChecked)}
        disabled={disabled}
      >
        <View style={[
          styles.checkbox,
          isChecked && styles.checkboxChecked,
          error && styles.checkboxError,
          disabled && styles.checkboxDisabled
        ]}>
          {isChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[
          styles.checkboxLabel,
          error && styles.checkboxLabelError,
          disabled && styles.checkboxLabelDisabled
        ]}>
          {field.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Don't render hidden fields
  if (field.hidden) {
    return null;
  }

  // Render based on field type
  switch (field.type) {
    case 'select':
      return renderSelectField();
    case 'radio':
      return renderRadioField();
    case 'checkbox':
      return renderCheckboxField();
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'currency':
    case 'textarea':
    default:
      return renderTextInput();
  }
});

const styles = StyleSheet.create({
  // Select field styles
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.primary,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.space16,
    marginBottom: spacing.space16,
  },

  selectContainerError: {
    borderColor: colors.error,
    borderWidth: 2,
  },

  selectContainerDisabled: {
    backgroundColor: colors.neutral.gray100,
    opacity: 0.6,
  },

  selectContent: {
    flex: 1,
    paddingVertical: spacing.space12,
  },

  selectLabel: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.space4,
  },

  selectLabelError: {
    color: colors.error,
  },

  selectLabelFloating: {
    fontSize: typography.fontSize.caption,
    color: colors.primary.deepBlue,
  },

  selectValue: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
  },

  selectPlaceholder: {
    color: colors.text.tertiary,
  },

  selectValueDisabled: {
    color: colors.text.tertiary,
  },

  selectArrow: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: spacing.space8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: spacing.borderRadius.lg,
    borderTopRightRadius: spacing.borderRadius.lg,
    maxHeight: '70%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },

  modalTitle: {
    fontSize: typography.fontSize.h3,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },

  modalCloseButton: {
    padding: spacing.space8,
  },

  modalCloseText: {
    fontSize: 18,
    color: colors.text.secondary,
  },

  optionItem: {
    paddingVertical: spacing.space16,
    paddingHorizontal: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },

  optionItemSelected: {
    backgroundColor: colors.primary.cyan + '20',
  },

  optionText: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
  },

  optionTextSelected: {
    color: colors.primary.deepBlue,
    fontFamily: typography.fontFamily.medium,
  },

  optionTextDisabled: {
    color: colors.text.tertiary,
  },

  // Radio field styles
  radioContainer: {
    marginBottom: spacing.space16,
  },

  radioLabel: {
    fontSize: typography.fontSize.label,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.space12,
  },

  radioLabelError: {
    color: colors.error,
  },

  radioOptions: {
    gap: spacing.space12,
  },

  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    marginRight: spacing.space12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioCircleSelected: {
    borderColor: colors.primary.deepBlue,
  },

  radioCircleDisabled: {
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray100,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.deepBlue,
  },

  radioOptionText: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
  },

  radioOptionTextDisabled: {
    color: colors.text.tertiary,
  },

  // Checkbox field styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space16,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    borderRadius: spacing.borderRadius.sm,
    marginRight: spacing.space12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: colors.primary.deepBlue,
    borderColor: colors.primary.deepBlue,
  },

  checkboxError: {
    borderColor: colors.error,
  },

  checkboxDisabled: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
  },

  checkmark: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },

  checkboxLabel: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.primary,
    flex: 1,
  },

  checkboxLabelError: {
    color: colors.error,
  },

  checkboxLabelDisabled: {
    color: colors.text.tertiary,
  },

  // Textarea styles
  textareaContainer: {
    minHeight: 100,
  },

  // Common styles
  errorText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.error,
    marginTop: spacing.space4,
    marginLeft: spacing.space4,
  },

  helperText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.tertiary,
    marginTop: spacing.space4,
    marginLeft: spacing.space4,
  },
});
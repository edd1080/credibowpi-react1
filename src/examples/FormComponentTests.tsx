// Direct component testing examples
// Use this to test individual form components

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { FormField } from '../features/forms/components/FormField';
import { FormSectionPicker } from '../features/forms/components/FormSectionPicker';
import { FormFieldSchema, FormNavigationState } from '../features/forms/types';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';

export const FormComponentTests: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string>('field-types');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Test field schemas
  const testFields: FormFieldSchema[] = [
    {
      id: 'text-field',
      name: 'textField',
      label: 'Text Field',
      type: 'text',
      placeholder: 'Enter text here',
      required: true,
      section: 'test',
      order: 1,
      validations: [
        { rule: 'required', message: 'This field is required' },
        { rule: 'minLength', value: 3, message: 'Minimum 3 characters' }
      ]
    },
    {
      id: 'email-field',
      name: 'emailField',
      label: 'Email Field',
      type: 'email',
      placeholder: 'Enter email',
      required: false,
      section: 'test',
      order: 2,
      validations: [
        { rule: 'email', message: 'Invalid email format' }
      ]
    },
    {
      id: 'select-field',
      name: 'selectField',
      label: 'Select Field',
      type: 'select',
      required: true,
      section: 'test',
      order: 3,
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' }
      ],
      validations: [
        { rule: 'required', message: 'Please select an option' }
      ]
    },
    {
      id: 'radio-field',
      name: 'radioField',
      label: 'Radio Field',
      type: 'radio',
      required: true,
      section: 'test',
      order: 4,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' }
      ]
    },
    {
      id: 'conditional-field',
      name: 'conditionalField',
      label: 'Conditional Field (shows when radio = yes)',
      type: 'text',
      required: false,
      section: 'test',
      order: 5,
      conditionalLogic: [
        {
          field: 'radioField',
          operator: 'equals',
          value: 'yes',
          action: 'show'
        }
      ]
    }
  ];

  // Mock navigation state for section picker test
  const mockNavigationState: FormNavigationState = {
    sections: [
      { id: 'section1', title: 'Section 1', isComplete: true, isValid: true, hasErrors: false },
      { id: 'section2', title: 'Section 2', isComplete: false, isValid: false, hasErrors: true },
      { id: 'section3', title: 'Section 3', isComplete: false, isValid: true, hasErrors: false }
    ],
    currentSection: 'section2',
    canNavigateNext: true,
    canNavigatePrevious: true
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    console.log(`Field ${fieldName} changed to:`, value);
  };

  const validateField = (field: FormFieldSchema, value: any): string | undefined => {
    if (!field.validations) return undefined;

    for (const validation of field.validations) {
      switch (validation.rule) {
        case 'required':
          if (!value || value === '') return validation.message;
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return validation.message;
          break;
        case 'minLength':
          if (value && value.length < validation.value) return validation.message;
          break;
      }
    }
    return undefined;
  };

  const isFieldVisible = (field: FormFieldSchema): boolean => {
    if (!field.conditionalLogic) return true;

    for (const condition of field.conditionalLogic) {
      if (condition.action === 'show') {
        const fieldValue = fieldValues[condition.field];
        return fieldValue === condition.value;
      }
    }
    return true;
  };

  const renderFieldTypesTest = () => (
    <View style={styles.testSection}>
      <Text style={styles.testTitle}>Field Types & Validation Test</Text>
      <Text style={styles.testDescription}>
        Test different field types, validation, and conditional logic
      </Text>

      {testFields.map(field => {
        if (!isFieldVisible(field)) return null;

        const value = fieldValues[field.name] || '';
        const error = validateField(field, value);

        return (
          <FormField
            key={field.id}
            field={field}
            value={value}
            error={error}
            onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
          />
        );
      })}

      <View style={styles.debugInfo}>
        <Text style={styles.debugTitle}>Current Values:</Text>
        <Text style={styles.debugText}>{JSON.stringify(fieldValues, null, 2)}</Text>
      </View>
    </View>
  );

  const renderSectionPickerTest = () => (
    <View style={styles.testSection}>
      <Text style={styles.testTitle}>Section Picker Test</Text>
      <Text style={styles.testDescription}>
        Test section navigation with different states
      </Text>

      <FormSectionPicker
        navigationState={mockNavigationState}
        onSectionChange={(sectionId) => {
          console.log('Section changed to:', sectionId);
        }}
      />

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Legend:</Text>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>✓</Text>
          <Text style={styles.legendText}>Complete section</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>!</Text>
          <Text style={styles.legendText}>Section with errors</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>●</Text>
          <Text style={styles.legendText}>Current section</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>○</Text>
          <Text style={styles.legendText}>Incomplete section</Text>
        </View>
      </View>
    </View>
  );

  const tests = [
    { id: 'field-types', title: 'Field Types', component: renderFieldTypesTest },
    { id: 'section-picker', title: 'Section Picker', component: renderSectionPickerTest }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Form Component Tests</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
          {tests.map(test => (
            <TouchableOpacity
              key={test.id}
              style={[styles.tab, currentTest === test.id && styles.activeTab]}
              onPress={() => setCurrentTest(test.id)}
            >
              <Text style={[styles.tabText, currentTest === test.id && styles.activeTabText]}>
                {test.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {tests.find(test => test.id === currentTest)?.component()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  header: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    paddingBottom: spacing.space16,
  },

  title: {
    fontSize: typography.fontSize.h1,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    textAlign: 'center',
    paddingVertical: spacing.space16,
  },

  tabContainer: {
    paddingHorizontal: spacing.space16,
  },

  tab: {
    paddingHorizontal: spacing.space20,
    paddingVertical: spacing.space12,
    marginRight: spacing.space8,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.neutral.gray100,
  },

  activeTab: {
    backgroundColor: colors.primary.deepBlue,
  },

  tabText: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
  },

  activeTabText: {
    color: colors.background.primary,
    fontFamily: typography.fontFamily.medium,
  },

  content: {
    flex: 1,
    padding: spacing.space16,
  },

  testSection: {
    gap: spacing.space16,
  },

  testTitle: {
    fontSize: typography.fontSize.h2,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },

  testDescription: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
    marginBottom: spacing.space16,
  },

  debugInfo: {
    marginTop: spacing.space20,
    padding: spacing.space16,
    backgroundColor: colors.neutral.gray100,
    borderRadius: spacing.borderRadius.md,
  },

  debugTitle: {
    fontSize: typography.fontSize.label,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.space8,
  },

  debugText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
  },

  legendContainer: {
    marginTop: spacing.space20,
    padding: spacing.space16,
    backgroundColor: colors.neutral.gray50,
    borderRadius: spacing.borderRadius.md,
  },

  legendTitle: {
    fontSize: typography.fontSize.label,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.space12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space8,
  },

  legendIcon: {
    fontSize: 16,
    marginRight: spacing.space12,
    width: 20,
    textAlign: 'center',
  },

  legendText: {
    fontSize: typography.fontSize.bodyS,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
  },
});
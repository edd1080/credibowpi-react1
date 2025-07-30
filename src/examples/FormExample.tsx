// Example component demonstrating the dynamic form system
// Shows how to use the form infrastructure with the application schema

import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useForm, FormField, FormSectionPicker, applicationFormSchema } from '../features/forms';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';

export const FormExample: React.FC = () => {
  const {
    formState,
    navigationState,
    currentSectionData,
    setFieldValue,
    setCurrentSection,
    getFieldError,
    isFieldVisible,
    isFieldEnabled,

    getSectionProgress,
  } = useForm({
    schema: applicationFormSchema,
    applicationId: 'example-app-id',
    autoSave: {
      enabled: true,
      interval: 5000, // 5 seconds for demo
      onSave: async (formData) => {
        console.log('Auto-saving form data:', formData);
      },
      onError: (error) => {
        console.error('Auto-save error:', error);
      },
    },
    onSectionChange: (sectionId) => {
      console.log('Section changed to:', sectionId);
    },
    onFormComplete: (formData) => {
      console.log('Form completed:', formData);
    },
  });

  // Get current section schema
  const currentSectionSchema = applicationFormSchema.sections.find(
    section => section.id === formState.currentSection
  );

  if (!currentSectionSchema) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Section not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Section Picker */}
      <FormSectionPicker
        navigationState={navigationState}
        onSectionChange={setCurrentSection}
      />

      {/* Form Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentSectionSchema.title}</Text>
          {currentSectionSchema.description && (
            <Text style={styles.sectionDescription}>
              {currentSectionSchema.description}
            </Text>
          )}
          <Text style={styles.progressText}>
            Progreso: {getSectionProgress(formState.currentSection)}%
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.fieldsContainer}>
          {currentSectionSchema.fields.map((field) => {
            if (!isFieldVisible(field.name)) {
              return null;
            }

            return (
              <FormField
                key={field.id}
                field={field}
                value={currentSectionData[field.name] || ''}
                error={getFieldError(field.name) || undefined}
                onValueChange={(value) => setFieldValue(field.name, value)}
                disabled={!isFieldEnabled(field.name)}
              />
            );
          })}
        </View>

        {/* Form State Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Estado del Formulario (Debug)</Text>
          <Text style={styles.debugText}>
            Sección Actual: {formState.currentSection}
          </Text>
          <Text style={styles.debugText}>
            Válido: {formState.isValid ? 'Sí' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Completo: {formState.isComplete ? 'Sí' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Modificado: {formState.isDirty ? 'Sí' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Auto-guardado: {formState.autoSaveEnabled ? 'Habilitado' : 'Deshabilitado'}
          </Text>
          {formState.lastSaved && (
            <Text style={styles.debugText}>
              Último guardado: {formState.lastSaved.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.space16,
  },

  sectionHeader: {
    paddingVertical: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    marginBottom: spacing.space20,
  },

  sectionTitle: {
    fontSize: typography.fontSize.h2,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.space8,
  },

  sectionDescription: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
    marginBottom: spacing.space12,
  },

  progressText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary.deepBlue,
  },

  fieldsContainer: {
    gap: spacing.space16,
  },

  debugContainer: {
    marginTop: spacing.space32,
    padding: spacing.space16,
    backgroundColor: colors.neutral.gray100,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.space20,
  },

  debugTitle: {
    fontSize: typography.fontSize.label,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.space12,
  },

  debugText: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
    marginBottom: spacing.space4,
  },

  errorText: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.error,
    textAlign: 'center',
    margin: spacing.space20,
  },
});
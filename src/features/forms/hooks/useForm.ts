// Main form hook for managing form state, validation, and auto-save
// Provides a complete form management solution with offline support

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FormSchema,
  FormState,
  FormSectionState,
  FormFieldState,
  FormNavigationState,
  FormAutoSaveOptions,
  FormDraftData,
} from '../types';
import {
  validateField,
  validateSection,
  validateForm,
  isSectionComplete,
  getSectionCompletionPercentage,
} from '../utils/validation';
import {
  applyConditionalLogic,
  getFieldsToClear,
} from '../utils/conditionalLogic';

export interface UseFormOptions {
  schema: FormSchema;
  applicationId: string;
  initialData?: Record<string, any>;
  autoSave?: FormAutoSaveOptions;
  onSectionChange?: (sectionId: string) => void;
  onFormComplete?: (formData: Record<string, any>) => void;
}

export interface UseFormReturn {
  // State
  formState: FormState;
  navigationState: FormNavigationState;
  currentSectionData: Record<string, any>;
  
  // Actions
  setFieldValue: (fieldName: string, value: any) => void;
  setCurrentSection: (sectionId: string) => void;
  validateCurrentSection: () => boolean;
  validateForm: () => boolean;
  resetForm: () => void;
  saveForm: () => Promise<void>;
  loadForm: () => Promise<void>;
  
  // Utilities
  getFieldError: (fieldName: string) => string | undefined;
  isFieldVisible: (fieldName: string) => boolean;
  isFieldEnabled: (fieldName: string) => boolean;
  isFieldRequired: (fieldName: string) => boolean;
  getSectionProgress: (sectionId: string) => number;
}

export function useForm(options: UseFormOptions): UseFormReturn {
  const {
    schema,
    applicationId,
    initialData = {},
    autoSave,
    onSectionChange,
    onFormComplete,
  } = options;

  // Initialize form state
  const [formState, setFormState] = useState<FormState>(() => 
    initializeFormState(schema, initialData)
  );

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveDataRef = useRef<string>('');

  // Initialize form state from schema
  function initializeFormState(
    schema: FormSchema,
    initialData: Record<string, any>
  ): FormState {
    const sections: Record<string, FormSectionState> = {};

    schema.sections.forEach(sectionSchema => {
      const fields: Record<string, FormFieldState> = {};
      const sectionData = initialData[sectionSchema.id] || {};

      sectionSchema.fields.forEach(fieldSchema => {
        const value = sectionData[fieldSchema.name] ?? fieldSchema.defaultValue ?? '';
        
        fields[fieldSchema.name] = {
          value,
          touched: false,
          dirty: false,
          visible: !fieldSchema.hidden,
          enabled: !fieldSchema.disabled,
          required: fieldSchema.required || false,
        };
      });

      sections[sectionSchema.id] = {
        id: sectionSchema.id,
        fields,
        isValid: true,
        isComplete: false,
        visible: true,
        enabled: true,
      };
    });

    return {
      id: schema.id,
      sections,
      currentSection: schema.sections[0]?.id || '',
      isValid: true,
      isComplete: false,
      isDirty: false,
      autoSaveEnabled: autoSave?.enabled || schema.autoSave || false,
    };
  }

  // Get current section data
  const currentSectionData = getCurrentSectionData();

  function getCurrentSectionData(): Record<string, any> {
    const currentSection = formState.sections[formState.currentSection];
    if (!currentSection) return {};

    const data: Record<string, any> = {};
    Object.keys(currentSection.fields).forEach(fieldName => {
      data[fieldName] = currentSection.fields[fieldName]?.value;
    });
    return data;
  }

  // Get all form data
  const getAllFormData = useCallback((): Record<string, any> => {
    const data: Record<string, any> = {};
    
    Object.keys(formState.sections).forEach(sectionId => {
      const section = formState.sections[sectionId];
      if (section) {
        data[sectionId] = {};
        
        Object.keys(section.fields).forEach(fieldName => {
          data[sectionId][fieldName] = section.fields[fieldName]?.value;
        });
      }
    });
    
    return data;
  }, [formState.sections]);

  // Set field value with validation and conditional logic
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setFormState(prevState => {
      const currentSectionId = prevState.currentSection;
      const currentSection = prevState.sections[currentSectionId];
      
      if (!currentSection || !currentSection.fields[fieldName]) {
        return prevState;
      }

      // Get current section schema
      const sectionSchema = schema.sections.find(s => s.id === currentSectionId);
      if (!sectionSchema) return prevState;

      // Get field schema
      const fieldSchema = sectionSchema.fields.find(f => f.name === fieldName);
      if (!fieldSchema) return prevState;

      // Create updated form data for conditional logic evaluation
      const updatedFormData = getAllFormData();
      updatedFormData[currentSectionId] = {
        ...updatedFormData[currentSectionId],
        [fieldName]: value,
      };

      // Get fields that should be cleared due to conditional logic changes
      const fieldsToClear = getFieldsToClear(
        sectionSchema.fields,
        updatedFormData[currentSectionId],
        fieldName,
        value
      );

      // Update field states with conditional logic
      const updatedFields = applyConditionalLogic(
        sectionSchema.fields,
        updatedFormData[currentSectionId]
      );

      // Create new section state
      const newFields = { ...currentSection.fields };

      // Update the changed field
      const validation = validateField(value, fieldSchema);
      newFields[fieldName] = {
        ...newFields[fieldName],
        value,
        error: validation.error || undefined,
        touched: true,
        dirty: true,
      };

      // Clear fields that should be cleared
      fieldsToClear.forEach(fieldToClear => {
        if (newFields[fieldToClear]) {
          newFields[fieldToClear] = {
            ...newFields[fieldToClear],
            value: '',
            error: undefined,
            dirty: true,
          };
        }
      });

      // Apply conditional logic to all fields
      updatedFields.forEach(field => {
        if (newFields[field.name]) {
          newFields[field.name] = {
            ...newFields[field.name],
            visible: !field.hidden,
            enabled: !field.disabled,
            required: field.required || false,
          };
        }
      });

      // Validate section
      const sectionData = Object.keys(newFields).reduce((acc, key) => {
        acc[key] = newFields[key]?.value;
        return acc;
      }, {} as Record<string, any>);

      const sectionValidation = validateSection(sectionData, sectionSchema.fields);
      const sectionComplete = isSectionComplete(sectionData, sectionSchema.fields);

      const newSection: FormSectionState = {
        ...currentSection,
        fields: newFields,
        isValid: sectionValidation.isValid,
        isComplete: sectionComplete,
      };

      const newSections = {
        ...prevState.sections,
        [currentSectionId]: newSection,
      };

      // Check overall form validity
      const allFormData = { ...updatedFormData };
      allFormData[currentSectionId] = sectionData;
      
      const formValidation = validateForm(allFormData, schema.sections);
      const formComplete = schema.sections.every(section => {
        const sectionData = allFormData[section.id] || {};
        return isSectionComplete(sectionData, section.fields);
      });

      return {
        ...prevState,
        sections: newSections,
        isValid: formValidation.isValid,
        isComplete: formComplete,
        isDirty: true,
      };
    });
  }, [schema, getAllFormData]);

  // Set current section
  const setCurrentSection = useCallback((sectionId: string) => {
    if (formState.sections[sectionId]) {
      setFormState(prev => ({
        ...prev,
        currentSection: sectionId,
      }));
      onSectionChange?.(sectionId);
    }
  }, [formState.sections, onSectionChange]);

  // Validate current section
  const validateCurrentSection = useCallback((): boolean => {
    const currentSection = formState.sections[formState.currentSection];
    return currentSection?.isValid || false;
  }, [formState.sections, formState.currentSection]);

  // Validate entire form
  const validateFormData = useCallback((): boolean => {
    return formState.isValid;
  }, [formState.isValid]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormState(initializeFormState(schema, initialData));
  }, [schema, initialData]);

  // Save form to database
  const saveForm = useCallback(async () => {
    try {
      const formData = getAllFormData();
      const draftData: FormDraftData = {
        formId: schema.id,
        applicationId,
        sections: formData,
        currentSection: formState.currentSection,
        lastModified: new Date(),
        autoSaved: false,
      };

      // Save to database (implement based on your database schema)
      // This would typically save to a form_drafts table
      console.log('Saving form data:', draftData);
      
      setFormState(prev => ({
        ...prev,
        lastSaved: new Date(),
        isDirty: false,
      }));
    } catch (error) {
      console.error('Failed to save form:', error);
      autoSave?.onError?.(error as Error);
    }
  }, [getAllFormData, schema.id, applicationId, formState.currentSection, autoSave]);

  // Load form from database
  const loadForm = useCallback(async () => {
    try {
      // Load from database (implement based on your database schema)
      // This would typically load from a form_drafts table
      console.log('Loading form data for application:', applicationId);
      
      // For now, use initial data
      setFormState(initializeFormState(schema, initialData));
    } catch (error) {
      console.error('Failed to load form:', error);
    }
  }, [applicationId, schema, initialData]);

  // Auto-save functionality
  useEffect(() => {
    if (!formState.autoSaveEnabled || !formState.isDirty) {
      return;
    }

    const currentDataString = JSON.stringify(getAllFormData());
    if (currentDataString === lastSaveDataRef.current) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    const interval = autoSave?.interval || schema.autoSaveInterval || 30000;
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveForm();
        lastSaveDataRef.current = currentDataString;
      } catch (error) {
        console.error('Auto-save failed:', error);
        autoSave?.onError?.(error as Error);
      }
    }, interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formState.isDirty, formState.autoSaveEnabled, getAllFormData, saveForm, autoSave, schema.autoSaveInterval]);

  // Navigation state
  const navigationState: FormNavigationState = {
    sections: schema.sections.map(section => {
      const sectionState = formState.sections[section.id];
      return {
        id: section.id,
        title: section.title,
        isComplete: sectionState?.isComplete || false,
        isValid: sectionState?.isValid || false,
        hasErrors: sectionState ? !sectionState.isValid : false,
      };
    }),
    currentSection: formState.currentSection,
    canNavigateNext: true, // Could add logic to prevent navigation if current section is invalid
    canNavigatePrevious: true,
  };

  // Utility functions
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const currentSection = formState.sections[formState.currentSection];
    return currentSection?.fields[fieldName]?.error;
  }, [formState.sections, formState.currentSection]);

  const isFieldVisibleUtil = useCallback((fieldName: string): boolean => {
    const currentSection = formState.sections[formState.currentSection];
    return currentSection?.fields[fieldName]?.visible || false;
  }, [formState.sections, formState.currentSection]);

  const isFieldEnabledUtil = useCallback((fieldName: string): boolean => {
    const currentSection = formState.sections[formState.currentSection];
    return currentSection?.fields[fieldName]?.enabled || false;
  }, [formState.sections, formState.currentSection]);

  const isFieldRequiredUtil = useCallback((fieldName: string): boolean => {
    const currentSection = formState.sections[formState.currentSection];
    return currentSection?.fields[fieldName]?.required || false;
  }, [formState.sections, formState.currentSection]);

  const getSectionProgress = useCallback((sectionId: string): number => {
    const section = formState.sections[sectionId];
    if (!section) return 0;

    const sectionSchema = schema.sections.find(s => s.id === sectionId);
    if (!sectionSchema) return 0;

    const sectionData = Object.keys(section.fields).reduce((acc, key) => {
      acc[key] = section.fields[key]?.value;
      return acc;
    }, {} as Record<string, any>);

    return getSectionCompletionPercentage(sectionData, sectionSchema.fields);
  }, [formState.sections, schema.sections]);

  // Check if form is complete and trigger callback
  useEffect(() => {
    if (formState.isComplete && onFormComplete) {
      onFormComplete(getAllFormData());
    }
  }, [formState.isComplete, onFormComplete, getAllFormData]);

  return {
    formState,
    navigationState,
    currentSectionData,
    setFieldValue,
    setCurrentSection,
    validateCurrentSection,
    validateForm: validateFormData,
    resetForm,
    saveForm,
    loadForm,
    getFieldError,
    isFieldVisible: isFieldVisibleUtil,
    isFieldEnabled: isFieldEnabledUtil,
    isFieldRequired: isFieldRequiredUtil,
    getSectionProgress,
  };
}
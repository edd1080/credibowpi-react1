// Form validation utilities
// Provides validation functions for form fields and sections

import { z } from 'zod';
import { FormFieldSchema, FormFieldValidation, FormValidationResult } from '../types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (Guatemala format)
const PHONE_REGEX = /^[0-9]{4}-?[0-9]{4}$/;

// DPI validation regex (Guatemala format)
// const DPI_REGEX = /^[0-9]{4}\s?[0-9]{5}\s?[0-9]{4}$/;

/**
 * Validates a single field value against its schema
 */
export function validateField(
  value: any,
  fieldSchema: FormFieldSchema
): { isValid: boolean; error?: string } {
  // Skip validation if field is not required and value is empty
  if (!fieldSchema.required && (value === '' || value === null || value === undefined)) {
    return { isValid: true };
  }

  // Check required validation first
  if (fieldSchema.required && (value === '' || value === null || value === undefined)) {
    return {
      isValid: false,
      error: 'Este campo es requerido'
    };
  }

  // Apply field-specific validations
  if (fieldSchema.validations) {
    for (const validation of fieldSchema.validations) {
      const result = validateFieldRule(value, validation, fieldSchema.type);
      if (!result.isValid) {
        return result;
      }
    }
  }

  return { isValid: true };
}

/**
 * Validates a single validation rule
 */
function validateFieldRule(
  value: any,
  validation: FormFieldValidation,
  fieldType: string
): { isValid: boolean; error?: string } {
  switch (validation.rule) {
    case 'required':
      if (value === '' || value === null || value === undefined) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'email':
      if (value && !EMAIL_REGEX.test(value)) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'phone':
      if (value && !PHONE_REGEX.test(value)) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'min':
      if (fieldType === 'number' || fieldType === 'currency') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue < validation.value) {
          return { isValid: false, error: validation.message };
        }
      } else if (typeof value === 'string' && value.length < validation.value) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'max':
      if (fieldType === 'number' || fieldType === 'currency') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > validation.value) {
          return { isValid: false, error: validation.message };
        }
      } else if (typeof value === 'string' && value.length > validation.value) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'minLength':
      if (typeof value === 'string' && value.length < validation.value) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'maxLength':
      if (typeof value === 'string' && value.length > validation.value) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'pattern':
      if (value && !new RegExp(validation.value).test(value)) {
        return { isValid: false, error: validation.message };
      }
      break;

    case 'custom':
      // Custom validation would be handled by a provided function
      // For now, we'll assume it's valid
      break;
  }

  return { isValid: true };
}

/**
 * Validates all fields in a form section
 */
export function validateSection(
  sectionData: Record<string, any>,
  fields: FormFieldSchema[]
): FormValidationResult {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const field of fields) {
    // Skip hidden fields
    if (field.hidden) continue;

    const value = sectionData[field.name];
    const validation = validateField(value, field);

    if (!validation.isValid) {
      errors[field.name] = validation.error!;
      isValid = false;
    }
  }

  return {
    isValid,
    errors,
    fieldErrors: { [fields[0]?.section || 'unknown']: errors }
  };
}

/**
 * Validates the entire form
 */
export function validateForm(
  formData: Record<string, Record<string, any>>,
  sections: { id: string; fields: FormFieldSchema[] }[]
): FormValidationResult {
  const fieldErrors: Record<string, Record<string, string>> = {};
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const section of sections) {
    const sectionData = formData[section.id] || {};
    const sectionValidation = validateSection(sectionData, section.fields);

    if (!sectionValidation.isValid) {
      isValid = false;
      fieldErrors[section.id] = sectionValidation.errors;
      
      // Add section-level errors
      Object.keys(sectionValidation.errors).forEach(fieldName => {
        const errorMessage = sectionValidation.errors[fieldName];
        if (errorMessage) {
          errors[`${section.id}.${fieldName}`] = errorMessage;
        }
      });
    }
  }

  return {
    isValid,
    errors,
    fieldErrors
  };
}

/**
 * Creates Zod schema from form field schema
 */
export function createZodSchema(fields: FormFieldSchema[]): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodType<any>> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodType<any>;

    // Base schema based on field type
    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email(field.validations?.find(v => v.rule === 'email')?.message || 'Email inválido');
        break;
      case 'number':
      case 'currency':
        fieldSchema = z.number();
        break;
      case 'date':
        fieldSchema = z.date();
        break;
      default:
        fieldSchema = z.string();
    }

    // Apply validations
    if (field.validations) {
      for (const validation of field.validations) {
        switch (validation.rule) {
          case 'min':
            if (field.type === 'number' || field.type === 'currency') {
              fieldSchema = (fieldSchema as z.ZodNumber).min(validation.value, validation.message);
            } else {
              fieldSchema = (fieldSchema as z.ZodString).min(validation.value, validation.message);
            }
            break;
          case 'max':
            if (field.type === 'number' || field.type === 'currency') {
              fieldSchema = (fieldSchema as z.ZodNumber).max(validation.value, validation.message);
            } else {
              fieldSchema = (fieldSchema as z.ZodString).max(validation.value, validation.message);
            }
            break;
          case 'minLength':
            fieldSchema = (fieldSchema as z.ZodString).min(validation.value, validation.message);
            break;
          case 'maxLength':
            fieldSchema = (fieldSchema as z.ZodString).max(validation.value, validation.message);
            break;
          case 'pattern':
            fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(validation.value), validation.message);
            break;
        }
      }
    }

    // Handle required/optional
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[field.name] = fieldSchema;
  }

  return z.object(schemaFields);
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(
  errors: Record<string, string>
): Record<string, string> {
  const formatted: Record<string, string> = {};

  Object.keys(errors).forEach(key => {
    // Remove section prefix if present
    const fieldName = key.includes('.') ? key.split('.')[1] : key;
    if (fieldName) {
      formatted[fieldName] = errors[key];
    }
  });

  return formatted;
}

/**
 * Checks if a form section is complete
 */
export function isSectionComplete(
  sectionData: Record<string, any>,
  fields: FormFieldSchema[]
): boolean {
  const requiredFields = fields.filter(field => field.required && !field.hidden);
  
  return requiredFields.every(field => {
    const value = sectionData[field.name];
    return value !== '' && value !== null && value !== undefined;
  });
}

/**
 * Gets completion percentage for a form section
 */
export function getSectionCompletionPercentage(
  sectionData: Record<string, any>,
  fields: FormFieldSchema[]
): number {
  const visibleFields = fields.filter(field => !field.hidden);
  if (visibleFields.length === 0) return 100;

  const completedFields = visibleFields.filter(field => {
    const value = sectionData[field.name];
    return value !== '' && value !== null && value !== undefined;
  });

  return Math.round((completedFields.length / visibleFields.length) * 100);
}
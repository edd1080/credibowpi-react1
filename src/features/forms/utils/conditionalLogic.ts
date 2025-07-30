// Conditional logic utilities for dynamic form behavior
// Handles show/hide, enable/disable, and require logic based on field values

import { ConditionalLogic, FormFieldSchema, FormSectionSchema } from '../types';

/**
 * Evaluates a conditional logic rule against form data
 */
export function evaluateCondition(
  condition: ConditionalLogic,
  formData: Record<string, any>
): boolean {
  const fieldValue = getNestedValue(formData, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === conditionValue;
    
    case 'not_equals':
      return fieldValue !== conditionValue;
    
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue);
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(conditionValue);
      }
      return false;
    
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(conditionValue);
      }
      if (typeof fieldValue === 'string') {
        return !fieldValue.includes(conditionValue);
      }
      return true;
    
    case 'greater_than':
      const numValue = parseFloat(fieldValue);
      const numCondition = parseFloat(conditionValue);
      return !isNaN(numValue) && !isNaN(numCondition) && numValue > numCondition;
    
    case 'less_than':
      const numValue2 = parseFloat(fieldValue);
      const numCondition2 = parseFloat(conditionValue);
      return !isNaN(numValue2) && !isNaN(numCondition2) && numValue2 < numCondition2;
    
    default:
      return false;
  }
}

/**
 * Gets nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Applies conditional logic to determine field visibility
 */
export function isFieldVisible(
  field: FormFieldSchema,
  formData: Record<string, any>
): boolean {
  if (!field.conditionalLogic) {
    return !field.hidden;
  }

  // Check all conditional logic rules
  for (const condition of field.conditionalLogic) {
    if (condition.action === 'show' || condition.action === 'hide') {
      const conditionMet = evaluateCondition(condition, formData);
      
      if (condition.action === 'show') {
        return conditionMet;
      } else if (condition.action === 'hide') {
        return !conditionMet;
      }
    }
  }

  return !field.hidden;
}

/**
 * Applies conditional logic to determine field enabled state
 */
export function isFieldEnabled(
  field: FormFieldSchema,
  formData: Record<string, any>
): boolean {
  if (!field.conditionalLogic) {
    return !field.disabled;
  }

  // Check all conditional logic rules
  for (const condition of field.conditionalLogic) {
    if (condition.action === 'enable' || condition.action === 'disable') {
      const conditionMet = evaluateCondition(condition, formData);
      
      if (condition.action === 'enable') {
        return conditionMet;
      } else if (condition.action === 'disable') {
        return !conditionMet;
      }
    }
  }

  return !field.disabled;
}

/**
 * Applies conditional logic to determine if field is required
 */
export function isFieldRequired(
  field: FormFieldSchema,
  formData: Record<string, any>
): boolean {
  let isRequired = field.required || false;

  if (field.conditionalLogic) {
    // Check all conditional logic rules
    for (const condition of field.conditionalLogic) {
      if (condition.action === 'require') {
        const conditionMet = evaluateCondition(condition, formData);
        if (conditionMet) {
          isRequired = true;
        }
      }
    }
  }

  return isRequired;
}

/**
 * Applies conditional logic to determine section visibility
 */
export function isSectionVisible(
  section: FormSectionSchema,
  formData: Record<string, any>
): boolean {
  if (!section.conditionalLogic) {
    return true;
  }

  // Check all conditional logic rules
  for (const condition of section.conditionalLogic) {
    if (condition.action === 'show' || condition.action === 'hide') {
      const conditionMet = evaluateCondition(condition, formData);
      
      if (condition.action === 'show') {
        return conditionMet;
      } else if (condition.action === 'hide') {
        return !conditionMet;
      }
    }
  }

  return true;
}

/**
 * Gets all visible fields in a section based on conditional logic
 */
export function getVisibleFields(
  fields: FormFieldSchema[],
  formData: Record<string, any>
): FormFieldSchema[] {
  return fields.filter(field => isFieldVisible(field, formData));
}

/**
 * Gets all enabled fields in a section based on conditional logic
 */
export function getEnabledFields(
  fields: FormFieldSchema[],
  formData: Record<string, any>
): FormFieldSchema[] {
  return fields.filter(field => 
    isFieldVisible(field, formData) && isFieldEnabled(field, formData)
  );
}

/**
 * Gets all required fields in a section based on conditional logic
 */
export function getRequiredFields(
  fields: FormFieldSchema[],
  formData: Record<string, any>
): FormFieldSchema[] {
  return fields.filter(field => 
    isFieldVisible(field, formData) && isFieldRequired(field, formData)
  );
}

/**
 * Updates field states based on conditional logic
 */
export function applyConditionalLogic(
  fields: FormFieldSchema[],
  formData: Record<string, any>
): FormFieldSchema[] {
  return fields.map(field => ({
    ...field,
    hidden: !isFieldVisible(field, formData),
    disabled: !isFieldEnabled(field, formData),
    required: isFieldRequired(field, formData)
  }));
}

/**
 * Gets fields that should be cleared when conditions change
 */
export function getFieldsToClear(
  fields: FormFieldSchema[],
  formData: Record<string, any>,
  changedField: string,
  newValue: any
): string[] {
  const fieldsToClear: string[] = [];
  
  // Create updated form data with the new value
  const updatedFormData = {
    ...formData,
    [changedField]: newValue
  };

  // Check each field to see if its visibility changed
  for (const field of fields) {
    const wasVisible = isFieldVisible(field, formData);
    const isVisible = isFieldVisible(field, updatedFormData);
    
    // If field became hidden, it should be cleared
    if (wasVisible && !isVisible) {
      fieldsToClear.push(field.name);
    }
  }

  return fieldsToClear;
}

/**
 * Validates that all conditional logic references exist
 */
export function validateConditionalLogic(
  fields: FormFieldSchema[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fieldNames = new Set(fields.map(f => f.name));

  for (const field of fields) {
    if (field.conditionalLogic) {
      for (const condition of field.conditionalLogic) {
        // Check if referenced field exists
        const referencedField = condition.field.split('.')[0];
        if (referencedField && !fieldNames.has(referencedField)) {
          errors.push(
            `Field "${field.name}" references non-existent field "${referencedField}" in conditional logic`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
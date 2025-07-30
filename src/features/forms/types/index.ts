// Form system types and interfaces

import { z } from 'zod';

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'currency'
  | 'percentage';

export type FormValidationRule = 
  | 'required'
  | 'email'
  | 'phone'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom';

export interface FormFieldOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface FormFieldValidation {
  rule: FormValidationRule;
  value?: any;
  message: string;
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require';
}

export interface FormFieldSchema {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helperText?: string;
  defaultValue?: any;
  options?: FormFieldOption[];
  validations?: FormFieldValidation[];
  conditionalLogic?: ConditionalLogic[];
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  autoSave?: boolean;
  section: string;
  order: number;
}

export interface FormSectionSchema {
  id: string;
  name: string;
  title: string;
  description?: string;
  icon?: string;
  order: number;
  fields: FormFieldSchema[];
  conditionalLogic?: ConditionalLogic[];
  required?: boolean;
}

export interface FormSchema {
  id: string;
  name: string;
  title: string;
  description?: string;
  version: string;
  sections: FormSectionSchema[];
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

export interface FormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
  visible: boolean;
  enabled: boolean;
  required: boolean;
}

export interface FormSectionState {
  id: string;
  fields: Record<string, FormFieldState>;
  isValid: boolean;
  isComplete: boolean;
  visible: boolean;
  enabled: boolean;
}

export interface FormState {
  id: string;
  sections: Record<string, FormSectionState>;
  currentSection: string;
  isValid: boolean;
  isComplete: boolean;
  isDirty: boolean;
  lastSaved?: Date;
  autoSaveEnabled: boolean;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  fieldErrors: Record<string, Record<string, string>>;
}

export interface FormAutoSaveOptions {
  enabled: boolean;
  interval: number;
  onSave?: (formData: any) => Promise<void>;
  onError?: (error: Error) => void;
}

export interface FormNavigationState {
  sections: {
    id: string;
    title: string;
    isComplete: boolean;
    isValid: boolean;
    hasErrors: boolean;
  }[];
  currentSection: string;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
}

// Zod schema types for runtime validation
export type FormFieldZodSchema = z.ZodType<any>;
export type FormSectionZodSchema = z.ZodObject<Record<string, FormFieldZodSchema>>;
export type FormZodSchema = z.ZodObject<Record<string, FormSectionZodSchema>>;

// Form submission types
export interface FormSubmissionData {
  formId: string;
  applicationId: string;
  sections: Record<string, any>;
  submittedAt: Date;
  isComplete: boolean;
}

export interface FormDraftData {
  formId: string;
  applicationId: string;
  sections: Record<string, any>;
  currentSection: string;
  lastModified: Date;
  autoSaved: boolean;
}
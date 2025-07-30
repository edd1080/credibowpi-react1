// Integration test for the form system
// Tests the complete form workflow with validation and conditional logic

import { validateField, validateSection } from '../utils/validation';
import { evaluateCondition, isFieldVisible } from '../utils/conditionalLogic';
import { FormFieldSchema } from '../types';

// Mock the application form schema to avoid Expo dependencies
const mockApplicationFormSchema = {
  id: 'credit-application',
  name: 'Credit Application Form',
  title: 'Solicitud de Crédito',
  version: '1.0.0',
  autoSave: true,
  autoSaveInterval: 30000,
  sections: [
    {
      id: 'identification',
      name: 'identification',
      title: 'Identificación',
      order: 1,
      required: true,
      fields: [
        {
          id: 'firstName',
          name: 'firstName',
          label: 'Nombres',
          type: 'text' as const,
          required: true,
          section: 'identification',
          order: 1,
          validations: [
            {
              rule: 'required' as const,
              message: 'Los nombres son requeridos'
            }
          ]
        },
        {
          id: 'email',
          name: 'email',
          label: 'Correo Electrónico',
          type: 'email' as const,
          required: false,
          section: 'identification',
          order: 2,
          validations: [
            {
              rule: 'email' as const,
              message: 'Formato de correo electrónico inválido'
            }
          ]
        }
      ]
    },
    {
      id: 'business',
      name: 'business',
      title: 'Información Laboral',
      order: 2,
      required: true,
      fields: [
        {
          id: 'employmentType',
          name: 'employmentType',
          label: 'Tipo de Empleo',
          type: 'select' as const,
          required: true,
          section: 'business',
          order: 1,
          options: [
            { label: 'Empleado', value: 'employed' },
            { label: 'Desempleado', value: 'unemployed' }
          ]
        },
        {
          id: 'companyName',
          name: 'companyName',
          label: 'Nombre de la Empresa',
          type: 'text' as const,
          required: false,
          section: 'business',
          order: 2,
          conditionalLogic: [
            {
              field: 'employmentType',
              operator: 'equals' as const,
              value: 'employed',
              action: 'show' as const,
            }
          ]
        }
      ]
    }
  ]
};

describe('Forms Integration', () => {
  describe('Validation System', () => {
    it('should validate required fields correctly', () => {
      const field: FormFieldSchema = {
        id: 'test-field',
        name: 'testField',
        label: 'Test Field',
        type: 'text',
        required: true,
        section: 'test',
        order: 1,
        validations: [
          {
            rule: 'required',
            message: 'This field is required',
          },
        ],
      };

      // Test empty value
      const emptyResult = validateField('', field);
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toBe('This field is required');

      // Test valid value
      const validResult = validateField('test value', field);
      expect(validResult.isValid).toBe(true);
      expect(validResult.error).toBeUndefined();
    });

    it('should validate email fields correctly', () => {
      const field: FormFieldSchema = {
        id: 'email-field',
        name: 'email',
        label: 'Email',
        type: 'email',
        required: false,
        section: 'test',
        order: 1,
        validations: [
          {
            rule: 'email',
            message: 'Invalid email format',
          },
        ],
      };

      // Test invalid email
      const invalidResult = validateField('invalid-email', field);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Invalid email format');

      // Test valid email
      const validResult = validateField('test@example.com', field);
      expect(validResult.isValid).toBe(true);
      expect(validResult.error).toBeUndefined();

      // Test empty value (should be valid since not required)
      const emptyResult = validateField('', field);
      expect(emptyResult.isValid).toBe(true);
    });

    it('should validate section data correctly', () => {
      const fields: FormFieldSchema[] = [
        {
          id: 'field1',
          name: 'field1',
          label: 'Field 1',
          type: 'text',
          required: true,
          section: 'test',
          order: 1,
          validations: [
            {
              rule: 'required',
              message: 'Field 1 is required',
            },
          ],
        },
        {
          id: 'field2',
          name: 'field2',
          label: 'Field 2',
          type: 'email',
          required: false,
          section: 'test',
          order: 2,
          validations: [
            {
              rule: 'email',
              message: 'Invalid email',
            },
          ],
        },
      ];

      // Test invalid section data
      const invalidData = {
        field1: '', // Required but empty
        field2: 'invalid-email', // Invalid email
      };

      const invalidResult = validateSection(invalidData, fields);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.field1).toBe('Field 1 is required');
      expect(invalidResult.errors.field2).toBe('Invalid email');

      // Test valid section data
      const validData = {
        field1: 'test value',
        field2: 'test@example.com',
      };

      const validResult = validateSection(validData, fields);
      expect(validResult.isValid).toBe(true);
      expect(Object.keys(validResult.errors)).toHaveLength(0);
    });
  });

  describe('Conditional Logic System', () => {
    it('should evaluate conditions correctly', () => {
      const formData = {
        employmentType: 'employed',
        hasOtherDebts: 'yes',
        monthlyIncome: 5000,
      };

      // Test equals condition
      const equalsCondition = {
        field: 'employmentType',
        operator: 'equals' as const,
        value: 'employed',
        action: 'show' as const,
      };

      expect(evaluateCondition(equalsCondition, formData)).toBe(true);

      // Test not_equals condition
      const notEqualsCondition = {
        field: 'employmentType',
        operator: 'not_equals' as const,
        value: 'unemployed',
        action: 'show' as const,
      };

      expect(evaluateCondition(notEqualsCondition, formData)).toBe(true);

      // Test greater_than condition
      const greaterThanCondition = {
        field: 'monthlyIncome',
        operator: 'greater_than' as const,
        value: 3000,
        action: 'show' as const,
      };

      expect(evaluateCondition(greaterThanCondition, formData)).toBe(true);
    });

    it('should handle field visibility based on conditional logic', () => {
      const field: FormFieldSchema = {
        id: 'conditional-field',
        name: 'conditionalField',
        label: 'Conditional Field',
        type: 'text',
        required: false,
        section: 'test',
        order: 1,
        conditionalLogic: [
          {
            field: 'employmentType',
            operator: 'equals',
            value: 'employed',
            action: 'show',
          },
        ],
      };

      // Field should be visible when condition is met
      const formDataVisible = {
        employmentType: 'employed',
      };

      expect(isFieldVisible(field, formDataVisible)).toBe(true);

      // Field should be hidden when condition is not met
      const formDataHidden = {
        employmentType: 'unemployed',
      };

      expect(isFieldVisible(field, formDataHidden)).toBe(false);
    });
  });

  describe('Mock Application Form Schema', () => {
    it('should have valid schema structure', () => {
      expect(mockApplicationFormSchema.id).toBe('credit-application');
      expect(mockApplicationFormSchema.sections).toHaveLength(2);
      
      // Check section order
      const sectionOrders = mockApplicationFormSchema.sections.map(s => s.order);
      expect(sectionOrders).toEqual([1, 2]);

      // Check that all sections have fields
      mockApplicationFormSchema.sections.forEach(section => {
        expect(section.fields.length).toBeGreaterThan(0);
        
        // Check field order within section
        const fieldOrders = section.fields.map(f => f.order);
        const sortedOrders = [...fieldOrders].sort((a, b) => a - b);
        expect(fieldOrders).toEqual(sortedOrders);
      });
    });

    it('should have proper conditional logic in business section', () => {
      const businessSection = mockApplicationFormSchema.sections.find(
        s => s.id === 'business'
      );

      expect(businessSection).toBeDefined();

      // Check that companyName field has conditional logic
      const companyNameField = businessSection?.fields.find(
        f => f.name === 'companyName'
      );

      expect(companyNameField?.conditionalLogic).toBeDefined();
      expect(companyNameField?.conditionalLogic?.[0].field).toBe('employmentType');
      expect(companyNameField?.conditionalLogic?.[0].value).toBe('employed');
    });

    it('should have proper validation rules', () => {
      const identificationSection = mockApplicationFormSchema.sections.find(
        s => s.id === 'identification'
      );

      // Check firstName field validation
      const firstNameField = identificationSection?.fields.find(f => f.name === 'firstName');
      expect(firstNameField?.validations).toBeDefined();
      expect(firstNameField?.validations?.some(v => v.rule === 'required')).toBe(true);

      // Check email field validation
      const emailField = identificationSection?.fields.find(f => f.name === 'email');
      expect(emailField?.validations?.some(v => v.rule === 'email')).toBe(true);
    });
  });

  describe('Form Field Types', () => {
    it('should support basic field types', () => {
      const usedTypes = new Set<string>();
      
      mockApplicationFormSchema.sections.forEach(section => {
        section.fields.forEach(field => {
          usedTypes.add(field.type);
        });
      });

      // Check that we're using various field types
      expect(usedTypes.has('text')).toBe(true);
      expect(usedTypes.has('email')).toBe(true);
      expect(usedTypes.has('select')).toBe(true);
    });

    it('should have proper options for select fields', () => {
      mockApplicationFormSchema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'select') {
            expect(field.options).toBeDefined();
            expect(field.options!.length).toBeGreaterThan(0);
            
            // Check option structure
            field.options!.forEach(option => {
              expect(option.label).toBeDefined();
              expect(option.value).toBeDefined();
            });
          }
        });
      });
    });
  });
});
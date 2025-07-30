// Tests for the useForm hook
// Verifies form state management, validation, and auto-save functionality

import { renderHook, act } from '@testing-library/react-native';
import { useForm } from '../hooks/useForm';
import { FormSchema } from '../types';

// Mock database service
jest.mock('../../../services/database', () => ({
  databaseService: {
    getInstance: jest.fn().mockResolvedValue({
      // Mock database methods
    }),
  },
}));

// Mock crypto for UUID generation
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random()),
  digestStringAsync: jest.fn().mockResolvedValue('mock-hash'),
}));

const mockFormSchema: FormSchema = {
  id: 'test-form',
  name: 'Test Form',
  title: 'Test Form',
  version: '1.0.0',
  autoSave: true,
  autoSaveInterval: 1000,
  sections: [
    {
      id: 'section1',
      name: 'section1',
      title: 'Section 1',
      order: 1,
      required: true,
      fields: [
        {
          id: 'field1',
          name: 'field1',
          label: 'Field 1',
          type: 'text',
          required: true,
          section: 'section1',
          order: 1,
          validations: [
            {
              rule: 'required',
              message: 'Field 1 is required',
            },
            {
              rule: 'minLength',
              value: 3,
              message: 'Field 1 must be at least 3 characters',
            },
          ],
        },
        {
          id: 'field2',
          name: 'field2',
          label: 'Field 2',
          type: 'email',
          required: false,
          section: 'section1',
          order: 2,
          validations: [
            {
              rule: 'email',
              message: 'Invalid email format',
            },
          ],
        },
      ],
    },
    {
      id: 'section2',
      name: 'section2',
      title: 'Section 2',
      order: 2,
      required: true,
      fields: [
        {
          id: 'field3',
          name: 'field3',
          label: 'Field 3',
          type: 'select',
          required: true,
          section: 'section2',
          order: 1,
          options: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
          ],
          validations: [
            {
              rule: 'required',
              message: 'Field 3 is required',
            },
          ],
        },
        {
          id: 'field4',
          name: 'field4',
          label: 'Field 4',
          type: 'text',
          required: false,
          section: 'section2',
          order: 2,
          conditionalLogic: [
            {
              field: 'field3',
              operator: 'equals',
              value: 'option1',
              action: 'show',
            },
          ],
        },
      ],
    },
  ],
};

describe('useForm', () => {
  const defaultOptions = {
    schema: mockFormSchema,
    applicationId: 'test-app-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    expect(result.current.formState.id).toBe('test-form');
    expect(result.current.formState.currentSection).toBe('section1');
    expect(result.current.formState.isValid).toBe(true);
    expect(result.current.formState.isComplete).toBe(false);
    expect(result.current.formState.isDirty).toBe(false);
  });

  it('should initialize with provided initial data', () => {
    const initialData = {
      section1: {
        field1: 'initial value',
        field2: 'test@example.com',
      },
    };

    const { result } = renderHook(() =>
      useForm({ ...defaultOptions, initialData })
    );

    expect(result.current.currentSectionData.field1).toBe('initial value');
    expect(result.current.currentSectionData.field2).toBe('test@example.com');
  });

  it('should update field values correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    act(() => {
      result.current.setFieldValue('field1', 'test value');
    });

    expect(result.current.currentSectionData.field1).toBe('test value');
    expect(result.current.formState.isDirty).toBe(true);
  });

  it('should validate fields correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Test required field validation
    act(() => {
      result.current.setFieldValue('field1', '');
    });

    expect(result.current.getFieldError('field1')).toBe('Field 1 is required');
    expect(result.current.formState.sections.section1.isValid).toBe(false);

    // Test minimum length validation
    act(() => {
      result.current.setFieldValue('field1', 'ab');
    });

    expect(result.current.getFieldError('field1')).toBe(
      'Field 1 must be at least 3 characters'
    );

    // Test valid value
    act(() => {
      result.current.setFieldValue('field1', 'valid value');
    });

    expect(result.current.getFieldError('field1')).toBeUndefined();
  });

  it('should validate email fields correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Test invalid email
    act(() => {
      result.current.setFieldValue('field2', 'invalid-email');
    });

    expect(result.current.getFieldError('field2')).toBe('Invalid email format');

    // Test valid email
    act(() => {
      result.current.setFieldValue('field2', 'test@example.com');
    });

    expect(result.current.getFieldError('field2')).toBeUndefined();
  });

  it('should handle section navigation', () => {
    const onSectionChange = jest.fn();
    const { result } = renderHook(() =>
      useForm({ ...defaultOptions, onSectionChange })
    );

    act(() => {
      result.current.setCurrentSection('section2');
    });

    expect(result.current.formState.currentSection).toBe('section2');
    expect(onSectionChange).toHaveBeenCalledWith('section2');
  });

  it('should handle conditional logic correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Navigate to section 2
    act(() => {
      result.current.setCurrentSection('section2');
    });

    // Initially field4 should be hidden (field3 is empty)
    expect(result.current.isFieldVisible('field4')).toBe(false);

    // Set field3 to option1, field4 should become visible
    act(() => {
      result.current.setFieldValue('field3', 'option1');
    });

    expect(result.current.isFieldVisible('field4')).toBe(true);

    // Set field3 to option2, field4 should become hidden again
    act(() => {
      result.current.setFieldValue('field3', 'option2');
    });

    expect(result.current.isFieldVisible('field4')).toBe(false);
  });

  it('should calculate section progress correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Initially no fields are filled
    expect(result.current.getSectionProgress('section1')).toBe(0);

    // Fill one field
    act(() => {
      result.current.setFieldValue('field1', 'test');
    });

    expect(result.current.getSectionProgress('section1')).toBe(50);

    // Fill both fields
    act(() => {
      result.current.setFieldValue('field2', 'test@example.com');
    });

    expect(result.current.getSectionProgress('section1')).toBe(100);
  });

  it('should create correct navigation state', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    const navState = result.current.navigationState;

    expect(navState.sections).toHaveLength(2);
    expect(navState.sections[0].id).toBe('section1');
    expect(navState.sections[0].title).toBe('Section 1');
    expect(navState.sections[0].isComplete).toBe(false);
    expect(navState.currentSection).toBe('section1');
  });

  it('should detect form completion', () => {
    const onFormComplete = jest.fn();
    const { result } = renderHook(() =>
      useForm({ ...defaultOptions, onFormComplete })
    );

    // Fill all required fields
    act(() => {
      result.current.setFieldValue('field1', 'test value');
    });

    act(() => {
      result.current.setCurrentSection('section2');
    });

    act(() => {
      result.current.setFieldValue('field3', 'option1');
    });

    expect(result.current.formState.isComplete).toBe(true);
    expect(onFormComplete).toHaveBeenCalled();
  });

  it('should reset form correctly', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Make some changes
    act(() => {
      result.current.setFieldValue('field1', 'test');
      result.current.setCurrentSection('section2');
    });

    expect(result.current.formState.isDirty).toBe(true);
    expect(result.current.formState.currentSection).toBe('section2');

    // Reset form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formState.isDirty).toBe(false);
    expect(result.current.formState.currentSection).toBe('section1');
    expect(result.current.currentSectionData.field1).toBe('');
  });

  it('should validate current section', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Initially section should be invalid (required field is empty)
    expect(result.current.validateCurrentSection()).toBe(false);

    // Fill required field
    act(() => {
      result.current.setFieldValue('field1', 'test value');
    });

    expect(result.current.validateCurrentSection()).toBe(true);
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => useForm(defaultOptions));

    // Initially form should be invalid
    expect(result.current.validateForm()).toBe(false);

    // Fill all required fields
    act(() => {
      result.current.setFieldValue('field1', 'test value');
    });

    act(() => {
      result.current.setCurrentSection('section2');
    });

    act(() => {
      result.current.setFieldValue('field3', 'option1');
    });

    expect(result.current.validateForm()).toBe(true);
  });
});
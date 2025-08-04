# UX Patterns & Guidelines

## Overview

Esta guía establece los patrones de experiencia de usuario (UX) y directrices de diseño para CrediBowpi Mobile, enfocándose en la usabilidad para agentes de campo en Guatemala que trabajan en condiciones de conectividad variable.

## Table of Contents

1. [Form Design Patterns](#form-design-patterns)
2. [Mobile UX Considerations](#mobile-ux-considerations)
3. [Navigation Patterns](#navigation-patterns)
4. [Feedback and Loading States](#feedback-and-loading-states)
5. [Error State Presentations](#error-state-presentations)
6. [Offline UX Patterns](#offline-ux-patterns)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Touch Interactions](#touch-interactions)
9. [Data Entry Optimization](#data-entry-optimization)
10. [Visual Hierarchy](#visual-hierarchy)

## Form Design Patterns

### Multi-Step Form Navigation

#### Progressive Disclosure Pattern
```typescript
// Patrón de revelación progresiva para formularios complejos
interface FormStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isAccessible: boolean;
  validationRules: ValidationRule[];
}

const CREDIT_APPLICATION_STEPS: FormStep[] = [
  {
    id: 'identification',
    title: 'Identificación y Contacto',
    description: 'Información personal básica',
    isCompleted: false,
    isAccessible: true,
    validationRules: ['required_fields', 'dpi_format', 'email_format']
  },
  // ... más pasos
];
```#### S
tep Indicator Component
```typescript
// Indicador de progreso visual para formularios multi-paso
const StepIndicator: React.FC<{
  steps: FormStep[];
  currentStep: number;
  onStepPress?: (stepIndex: number) => void;
}> = ({ steps, currentStep, onStepPress }) => {
  return (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <TouchableOpacity
          key={step.id}
          style={[
            styles.stepItem,
            index === currentStep && styles.activeStep,
            step.isCompleted && styles.completedStep,
            !step.isAccessible && styles.disabledStep
          ]}
          onPress={() => step.isAccessible && onStepPress?.(index)}
          disabled={!step.isAccessible}
          accessibilityLabel={`Paso ${index + 1}: ${step.title}`}
          accessibilityState={{
            selected: index === currentStep,
            disabled: !step.isAccessible
          }}
        >
          <View style={styles.stepNumber}>
            {step.isCompleted ? (
              <Icon name="check" size={16} color="white" />
            ) : (
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            )}
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

#### Navigation Controls Pattern
```typescript
// Controles de navegación consistentes
const FormNavigationControls: React.FC<{
  canGoBack: boolean;
  canGoForward: boolean;
  canSave: boolean;
  onBack: () => void;
  onForward: () => void;
  onSave: () => void;
  isLoading?: boolean;
}> = ({ canGoBack, canGoForward, canSave, onBack, onForward, onSave, isLoading }) => {
  return (
    <View style={styles.navigationControls}>
      <Button
        title="Anterior"
        variant="secondary"
        onPress={onBack}
        disabled={!canGoBack || isLoading}
        icon="arrow-left"
        style={styles.backButton}
      />
      
      <Button
        title="Guardar"
        variant="tertiary"
        onPress={onSave}
        disabled={!canSave || isLoading}
        icon="save"
        style={styles.saveButton}
      />
      
      <Button
        title="Siguiente"
        variant="primary"
        onPress={onForward}
        disabled={!canGoForward}
        loading={isLoading}
        icon="arrow-right"
        iconPosition="right"
        style={styles.forwardButton}
      />
    </View>
  );
};
```#
## Field Validation and Feedback

#### Real-Time Validation Pattern
```typescript
// Validación en tiempo real con feedback visual
const ValidatedTextInput: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  validationRules: ValidationRule[];
  placeholder?: string;
  required?: boolean;
}> = ({ label, value, onChangeText, validationRules, placeholder, required }) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    warnings: []
  });

  const validateField = useCallback((text: string) => {
    const result = validateInput(text, validationRules);
    setValidationState(result);
  }, [validationRules]);

  const handleTextChange = (text: string) => {
    onChangeText(text);
    // Validar después de un pequeño delay para evitar validación excesiva
    debounce(() => validateField(text), 300)();
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, required && styles.requiredLabel]}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      
      <TextInput
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        style={[
          styles.textInput,
          !validationState.isValid && styles.errorInput,
          validationState.warnings.length > 0 && styles.warningInput
        ]}
        accessibilityLabel={label}
        accessibilityRequired={required}
        accessibilityInvalid={!validationState.isValid}
      />
      
      {/* Feedback visual */}
      <ValidationFeedback validationState={validationState} />
    </View>
  );
};

const ValidationFeedback: React.FC<{ validationState: ValidationState }> = ({ validationState }) => {
  if (validationState.isValid && validationState.warnings.length === 0) {
    return null;
  }

  return (
    <View style={styles.feedbackContainer}>
      {validationState.errors.map((error, index) => (
        <View key={index} style={styles.errorMessage}>
          <Icon name="alert-circle" size={16} color={colors.error.primary} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ))}
      
      {validationState.warnings.map((warning, index) => (
        <View key={index} style={styles.warningMessage}>
          <Icon name="alert-triangle" size={16} color={colors.warning.primary} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ))}
    </View>
  );
};
```#
## Auto-Save and Recovery Patterns

#### Auto-Save Implementation
```typescript
// Patrón de auto-guardado para formularios largos
const useAutoSave = (
  formData: any,
  saveFunction: (data: any) => Promise<void>,
  options: {
    interval?: number;
    onSave?: () => void;
    onError?: (error: Error) => void;
  } = {}
) => {
  const { interval = 30000, onSave, onError } = options; // 30 segundos por defecto
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveData = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      await saveFunction(formData);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSave?.();
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, hasUnsavedChanges, isSaving, saveFunction, onSave, onError]);

  // Auto-save interval
  useEffect(() => {
    const intervalId = setInterval(saveData, interval);
    return () => clearInterval(intervalId);
  }, [saveData, interval]);

  // Detectar cambios en el formulario
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  return {
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    saveNow: saveData
  };
};

// Componente de estado de guardado
const SaveStatus: React.FC<{
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}> = ({ lastSaved, isSaving, hasUnsavedChanges }) => {
  if (isSaving) {
    return (
      <View style={styles.saveStatus}>
        <ActivityIndicator size="small" color={colors.primary.deepBlue} />
        <Text style={styles.saveStatusText}>Guardando...</Text>
      </View>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <View style={styles.saveStatus}>
        <Icon name="edit" size={16} color={colors.warning.primary} />
        <Text style={styles.saveStatusText}>Cambios sin guardar</Text>
      </View>
    );
  }

  if (lastSaved) {
    return (
      <View style={styles.saveStatus}>
        <Icon name="check" size={16} color={colors.success.primary} />
        <Text style={styles.saveStatusText}>
          Guardado {formatRelativeTime(lastSaved)}
        </Text>
      </View>
    );
  }

  return null;
};
```## M
obile UX Considerations

### Touch Targets and Gestures

#### Touch Target Guidelines
```typescript
// Directrices para objetivos táctiles
export const TOUCH_TARGET_GUIDELINES = {
  // Tamaños mínimos (en puntos)
  MINIMUM_SIZE: 44,
  RECOMMENDED_SIZE: 48,
  COMFORTABLE_SIZE: 56,
  
  // Espaciado entre objetivos
  MINIMUM_SPACING: 8,
  RECOMMENDED_SPACING: 16,
  
  // Áreas de toque extendidas
  EXTENDED_TOUCH_AREA: 12
};

// Componente con área de toque optimizada
const TouchableArea: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  minTouchSize?: number;
  accessibilityLabel?: string;
}> = ({ onPress, children, minTouchSize = TOUCH_TARGET_GUIDELINES.MINIMUM_SIZE, accessibilityLabel }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.touchableArea,
        { minWidth: minTouchSize, minHeight: minTouchSize }
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {children}
    </TouchableOpacity>
  );
};
```

#### Gesture Patterns
```typescript
// Patrones de gestos para navegación
const useSwipeNavigation = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50
) => {
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > threshold) {
        if (gestureState.dx > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (gestureState.dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    }
  });

  return panResponder.panHandlers;
};

// Implementación en formulario
const FormScreen: React.FC = () => {
  const navigation = useNavigation();
  const swipeHandlers = useSwipeNavigation(
    () => navigation.navigate('NextStep'),
    () => navigation.goBack()
  );

  return (
    <View style={styles.container} {...swipeHandlers}>
      {/* Contenido del formulario */}
    </View>
  );
};
```
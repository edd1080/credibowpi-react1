# Dynamic Form Infrastructure Testing Guide

## 🧪 **Manual Testing Checklist for Task 8**

### **Setup**
1. Add `FormTestScreen` to your navigation
2. Navigate to the test screen
3. Open React Native debugger/console to see logs

---

## **Feature 1: Schema-driven Form System**

### ✅ **Test Cases:**
- [ ] **Form loads with correct sections**: Identificación, Dirección, Información Financiera, Información Laboral
- [ ] **Fields render in correct order** within each section
- [ ] **Field types display correctly**: text, email, select, radio, textarea, currency, date
- [ ] **Required fields show proper indicators**

### 🔍 **How to Test:**
1. Navigate through all 4 sections using the section picker
2. Verify each section has the expected fields
3. Check that field types render appropriately (dropdowns, text inputs, etc.)

---

## **Feature 2: Real-time Validation with Visual Feedback**

### ✅ **Test Cases:**
- [ ] **Required field validation**: Leave required fields empty and check for error messages
- [ ] **Email validation**: Enter invalid email formats in email field
- [ ] **Phone validation**: Enter invalid phone numbers
- [ ] **Length validation**: Test minimum/maximum length constraints
- [ ] **Pattern validation**: Test DPI format validation
- [ ] **Real-time feedback**: Errors appear/disappear as you type

### 🔍 **How to Test:**
1. **Required Fields**: 
   - Go to "Identificación" section
   - Leave "Nombres" field empty and tap another field
   - Should show "Los nombres son requeridos"

2. **Email Validation**:
   - Enter "invalid-email" in email field
   - Should show "Formato de correo electrónico inválido"
   - Enter "test@example.com" - error should disappear

3. **DPI Validation**:
   - Enter "123" in DPI field
   - Should show "Formato de DPI inválido"
   - Enter "1234 12345 1234" - should be valid

---

## **Feature 3: Persistent Section Picker Navigation**

### ✅ **Test Cases:**
- [ ] **Section navigation works**: Can switch between sections
- [ ] **Progress indicators**: Sections show completion status
- [ ] **Error indicators**: Sections with errors show error state
- [ ] **Current section highlighted**: Active section is visually distinct
- [ ] **Completion status**: Completed sections show checkmark

### 🔍 **How to Test:**
1. Fill out some fields in "Identificación" section
2. Switch to "Dirección" section using the picker
3. Return to "Identificación" - data should be preserved
4. Complete all required fields in a section - should show checkmark
5. Leave required fields empty - section should show error indicator

---

## **Feature 4: Conditional Logic**

### ✅ **Test Cases:**
- [ ] **Show/Hide logic**: Fields appear/disappear based on other field values
- [ ] **Require logic**: Fields become required based on conditions
- [ ] **Data clearing**: Hidden fields clear their values

### 🔍 **How to Test:**
1. **Employment Type Conditional Logic**:
   - Go to "Información Laboral" section
   - Select "Empleado" in "Tipo de Empleo"
   - "Nombre de la Empresa" and "Cargo/Posición" fields should appear
   - Select "Desempleado" - these fields should disappear

2. **Other Debts Conditional Logic**:
   - Go to "Información Financiera" section
   - Select "Sí" for "¿Tiene otras deudas?"
   - "Monto de Otras Deudas" field should appear and become required
   - Select "No" - field should disappear

---

## **Feature 5: Auto-save Functionality**

### ✅ **Test Cases:**
- [ ] **Auto-save triggers**: Form saves automatically after changes
- [ ] **Save interval**: Respects configured save interval (5 seconds in test)
- [ ] **Save callbacks**: onSave callback is called
- [ ] **Error handling**: onError callback handles save failures
- [ ] **Dirty state tracking**: Form tracks unsaved changes

### 🔍 **How to Test:**
1. Open React Native debugger console
2. Fill out some form fields
3. Wait 5 seconds - should see "Auto-saving form data:" log
4. Check that form state shows "Modificado: Sí" in debug section
5. After auto-save, should show last saved time

---

## **Feature 6: Form Field Components with Floating Labels**

### ✅ **Test Cases:**
- [ ] **Floating labels**: Labels move up when field is focused/filled
- [ ] **Validation states**: Fields show error/success states visually
- [ ] **Field types**: All field types render correctly
- [ ] **Disabled states**: Disabled fields are not interactive
- [ ] **Placeholder text**: Shows appropriate placeholder text

### 🔍 **How to Test:**
1. **Text Fields**: Tap on "Nombres" field - label should float up
2. **Select Fields**: Tap on "Nacionalidad" - should open picker modal
3. **Radio Fields**: Tap on radio options - should select properly
4. **Error States**: Invalid fields should show red border/text
5. **Currency Fields**: "Ingresos Mensuales" should format as currency

---

## **Debug Information**

The test screen includes a debug section showing:
- Current section
- Form validity status
- Completion status
- Dirty state (unsaved changes)
- Auto-save status
- Last saved timestamp

---

## **Console Logs to Watch For**

When testing, watch for these console logs:
```
Section changed to: [section-id]
Auto-saving form data: [form-data-object]
Form completed: [complete-form-data]
Auto-save error: [error-details]
```

---

## **Expected Behavior Summary**

### ✅ **Working Features:**
1. **Navigation**: Smooth section switching with data persistence
2. **Validation**: Real-time error feedback with visual indicators
3. **Conditional Logic**: Fields show/hide based on other selections
4. **Auto-save**: Automatic data persistence every 5 seconds
5. **Progress Tracking**: Visual completion status for each section
6. **Field Types**: All form field types render and function correctly

### 🚨 **Known Limitations:**
- Auto-save currently logs to console (database integration pending)
- Some TypeScript strict mode warnings (functionality not affected)
- Test environment has Expo dependency issues (manual testing recommended)

---

## **Integration with Navigation**

To add the test screen to your app navigation:

```typescript
// In your navigator file
import { FormTestScreen } from '../screens/FormTestScreen';

// Add to your stack navigator
<Stack.Screen 
  name="FormTest" 
  component={FormTestScreen} 
  options={{ title: 'Form Test' }} 
/>
```

Then navigate to it from anywhere in your app to test the form features.
# Business Logic & Validation Rules

## Overview

Esta guía establece las reglas de negocio y validaciones específicas para CrediBowpi Mobile, incluyendo criterios de evaluación crediticia, validaciones de campos, cálculos financieros y flujos de trabajo para agentes de campo en Guatemala.

## Table of Contents

1. [Credit Application Rules](#credit-application-rules)
2. [Field Validation Requirements](#field-validation-requirements)
3. [Financial Calculation Formulas](#financial-calculation-formulas)
4. [Risk Assessment Criteria](#risk-assessment-criteria)
5. [Document Requirements](#document-requirements)
6. [Workflow Rules](#workflow-rules)
7. [Agent Permissions](#agent-permissions)
8. [Regional Considerations](#regional-considerations)
9. [Business Constants](#business-constants)
10. [Validation Implementation](#validation-implementation)

## Credit Application Rules

### Application Eligibility Criteria

```typescript
// Criterios básicos de elegibilidad
export const ELIGIBILITY_CRITERIA = {
  // Edad mínima y máxima
  MIN_AGE: 18,
  MAX_AGE: 75,
  
  // Ingresos mínimos por tipo de solicitante
  MIN_INCOME: {
    EMPLOYEE: 2500,      // Q2,500 para empleados
    BUSINESS_OWNER: 3000, // Q3,000 para negocio propio
    PENSIONER: 2000,     // Q2,000 para pensionados
    REMITTANCES: 2500    // Q2,500 para remesas
  },
  
  // Tiempo mínimo en actividad laboral
  MIN_WORK_EXPERIENCE: {
    EMPLOYEE: 6,         // 6 meses para empleados
    BUSINESS_OWNER: 12,  // 12 meses para negocio propio
    PENSIONER: 0,        // No aplica para pensionados
    REMITTANCES: 6       // 6 meses para remesas
  },
  
  // Estabilidad domiciliar mínima
  MIN_RESIDENCE_STABILITY: 12, // 12 meses
  
  // Montos de crédito
  MIN_CREDIT_AMOUNT: 1000,     // Q1,000 mínimo
  MAX_CREDIT_AMOUNT: 150000,   // Q150,000 máximo
  
  // Plazos permitidos (en meses)
  ALLOWED_TERMS: [6, 12, 18, 24, 36, 48, 60]
};

// Validación de elegibilidad
class EligibilityValidator {
  static validateApplicant(applicationData: ApplicationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar edad
    const age = this.calculateAge(applicationData.dateOfBirth);
    if (age < ELIGIBILITY_CRITERIA.MIN_AGE) {
      errors.push(`Edad mínima requerida: ${ELIGIBILITY_CRITERIA.MIN_AGE} años`);
    }
    if (age > ELIGIBILITY_CRITERIA.MAX_AGE) {
      errors.push(`Edad máxima permitida: ${ELIGIBILITY_CRITERIA.MAX_AGE} años`);
    }
    
    // Validar ingresos
    const minIncome = ELIGIBILITY_CRITERIA.MIN_INCOME[applicationData.incomeSource];
    if (applicationData.monthlyIncome < minIncome) {
      errors.push(`Ingreso mínimo requerido: Q${minIncome.toLocaleString()}`);
    }
    
    // Validar experiencia laboral
    const minExperience = ELIGIBILITY_CRITERIA.MIN_WORK_EXPERIENCE[applicationData.incomeSource];
    if (applicationData.workExperience < minExperience) {
      errors.push(`Experiencia laboral mínima: ${minExperience} meses`);
    }
    
    // Validar estabilidad domiciliar
    if (applicationData.residenceStability < ELIGIBILITY_CRITERIA.MIN_RESIDENCE_STABILITY) {
      warnings.push(`Se recomienda mínimo ${ELIGIBILITY_CRITERIA.MIN_RESIDENCE_STABILITY} meses de estabilidad domiciliar`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
```## Fiel
d Validation Requirements

### Personal Information Validation

```typescript
// Validaciones para información personal
export const PERSONAL_INFO_VALIDATION = {
  // Nombres y apellidos
  NAME_PATTERN: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  
  // DPI guatemalteco
  DPI_PATTERN: /^\d{4}\s?\d{5}\s?\d{4}$/,
  DPI_LENGTH: 13,
  
  // NIT guatemalteco
  NIT_PATTERN: /^\d{8,12}$/,
  NIT_MIN_LENGTH: 8,
  NIT_MAX_LENGTH: 12,
  
  // Teléfono guatemalteco
  PHONE_PATTERN: /^[2-7]\d{7}$/,
  MOBILE_PATTERN: /^[3-5]\d{7}$/,
  
  // Email
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MAX_LENGTH: 100,
  
  // Dirección
  ADDRESS_MIN_LENGTH: 10,
  ADDRESS_MAX_LENGTH: 200
};

class PersonalInfoValidator {
  static validateNames(names: string): ValidationResult {
    const errors: string[] = [];
    
    if (!names || names.trim().length === 0) {
      errors.push('Los nombres son obligatorios');
    } else {
      if (names.length < PERSONAL_INFO_VALIDATION.NAME_MIN_LENGTH) {
        errors.push(`Los nombres deben tener al menos ${PERSONAL_INFO_VALIDATION.NAME_MIN_LENGTH} caracteres`);
      }
      if (names.length > PERSONAL_INFO_VALIDATION.NAME_MAX_LENGTH) {
        errors.push(`Los nombres no pueden exceder ${PERSONAL_INFO_VALIDATION.NAME_MAX_LENGTH} caracteres`);
      }
      if (!PERSONAL_INFO_VALIDATION.NAME_PATTERN.test(names)) {
        errors.push('Los nombres solo pueden contener letras y espacios');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  static validateDPI(dpi: string): ValidationResult {
    const errors: string[] = [];
    const cleanDPI = dpi.replace(/\s/g, '');
    
    if (!dpi || dpi.trim().length === 0) {
      errors.push('El DPI es obligatorio');
    } else {
      if (cleanDPI.length !== PERSONAL_INFO_VALIDATION.DPI_LENGTH) {
        errors.push(`El DPI debe tener exactamente ${PERSONAL_INFO_VALIDATION.DPI_LENGTH} dígitos`);
      }
      if (!PERSONAL_INFO_VALIDATION.DPI_PATTERN.test(dpi)) {
        errors.push('Formato de DPI inválido. Use: 0000 00000 0000');
      }
      
      // Validación adicional del dígito verificador
      if (cleanDPI.length === 13 && !this.validateDPICheckDigit(cleanDPI)) {
        errors.push('El dígito verificador del DPI es inválido');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  static validatePhone(phone: string, type: 'landline' | 'mobile'): ValidationResult {
    const errors: string[] = [];
    const cleanPhone = phone.replace(/\s|-/g, '');
    
    if (!phone || phone.trim().length === 0) {
      errors.push('El teléfono es obligatorio');
    } else {
      const pattern = type === 'mobile' 
        ? PERSONAL_INFO_VALIDATION.MOBILE_PATTERN 
        : PERSONAL_INFO_VALIDATION.PHONE_PATTERN;
      
      if (!pattern.test(cleanPhone)) {
        const typeText = type === 'mobile' ? 'móvil' : 'fijo';
        errors.push(`Formato de teléfono ${typeText} inválido para Guatemala`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  private static validateDPICheckDigit(dpi: string): boolean {
    // Algoritmo de validación del dígito verificador del DPI guatemalteco
    const digits = dpi.split('').map(Number);
    const checkDigit = digits[12];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (13 - i);
    }
    
    const remainder = sum % 11;
    const expectedCheckDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === expectedCheckDigit;
  }
}
```

### Financial Information Validation

```typescript
// Validaciones financieras
export const FINANCIAL_VALIDATION = {
  // Montos mínimos y máximos
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999.99,
  
  // Porcentajes
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  
  // Precisión decimal
  DECIMAL_PLACES: 2,
  
  // Ratios financieros críticos
  MAX_DEBT_TO_INCOME_RATIO: 0.4,  // 40% máximo
  MIN_AVAILABLE_INCOME_RATIO: 0.2, // 20% mínimo disponible
  MAX_PAYMENT_TO_INCOME_RATIO: 0.35 // 35% máximo para cuota
};

class FinancialValidator {
  static validateAmount(amount: number, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (amount === null || amount === undefined) {
      errors.push(`${fieldName} es obligatorio`);
    } else {
      if (amount < FINANCIAL_VALIDATION.MIN_AMOUNT) {
        errors.push(`${fieldName} debe ser mayor a Q${FINANCIAL_VALIDATION.MIN_AMOUNT}`);
      }
      if (amount > FINANCIAL_VALIDATION.MAX_AMOUNT) {
        errors.push(`${fieldName} no puede exceder Q${FINANCIAL_VALIDATION.MAX_AMOUNT.toLocaleString()}`);
      }
      
      // Validar precisión decimal
      const decimalPlaces = (amount.toString().split('.')[1] || '').length;
      if (decimalPlaces > FINANCIAL_VALIDATION.DECIMAL_PLACES) {
        errors.push(`${fieldName} no puede tener más de ${FINANCIAL_VALIDATION.DECIMAL_PLACES} decimales`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  static validateFinancialCapacity(financialData: FinancialData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const totalIncome = financialData.primaryIncome + (financialData.secondaryIncome || 0);
    const totalExpenses = this.calculateTotalExpenses(financialData.expenses);
    const availableIncome = totalIncome - totalExpenses;
    const requestedPayment = financialData.requestedPayment;
    
    // Validar ratio de endeudamiento
    const debtToIncomeRatio = totalExpenses / totalIncome;
    if (debtToIncomeRatio > FINANCIAL_VALIDATION.MAX_DEBT_TO_INCOME_RATIO) {
      errors.push(`Ratio de endeudamiento muy alto: ${(debtToIncomeRatio * 100).toFixed(1)}% (máximo ${FINANCIAL_VALIDATION.MAX_DEBT_TO_INCOME_RATIO * 100}%)`);
    }
    
    // Validar ingreso disponible
    const availableIncomeRatio = availableIncome / totalIncome;
    if (availableIncomeRatio < FINANCIAL_VALIDATION.MIN_AVAILABLE_INCOME_RATIO) {
      warnings.push(`Ingreso disponible bajo: ${(availableIncomeRatio * 100).toFixed(1)}% (recomendado mínimo ${FINANCIAL_VALIDATION.MIN_AVAILABLE_INCOME_RATIO * 100}%)`);
    }
    
    // Validar capacidad de pago
    const paymentToIncomeRatio = requestedPayment / totalIncome;
    if (paymentToIncomeRatio > FINANCIAL_VALIDATION.MAX_PAYMENT_TO_INCOME_RATIO) {
      errors.push(`Cuota solicitada muy alta: ${(paymentToIncomeRatio * 100).toFixed(1)}% del ingreso (máximo ${FINANCIAL_VALIDATION.MAX_PAYMENT_TO_INCOME_RATIO * 100}%)`);
    }
    
    // Validar que la cuota no exceda el ingreso disponible
    if (requestedPayment > availableIncome) {
      errors.push('La cuota solicitada excede el ingreso disponible');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        debtToIncomeRatio,
        availableIncomeRatio,
        paymentToIncomeRatio,
        availableIncome
      }
    };
  }
  
  private static calculateTotalExpenses(expenses: ExpenseCategories): number {
    return Object.values(expenses).reduce((total, amount) => total + (amount || 0), 0);
  }
}
```## Financ
ial Calculation Formulas

### Credit Scoring Algorithm

```typescript
// Algoritmo de scoring crediticio
export class CreditScoringEngine {
  private static readonly SCORING_WEIGHTS = {
    // Factores de ingresos (30%)
    INCOME_STABILITY: 0.15,
    INCOME_AMOUNT: 0.10,
    INCOME_SOURCE: 0.05,
    
    // Factores financieros (25%)
    DEBT_TO_INCOME: 0.15,
    PAYMENT_CAPACITY: 0.10,
    
    // Factores de estabilidad (20%)
    RESIDENCE_STABILITY: 0.10,
    WORK_EXPERIENCE: 0.10,
    
    // Factores demográficos (15%)
    AGE_FACTOR: 0.08,
    MARITAL_STATUS: 0.04,
    EDUCATION_LEVEL: 0.03,
    
    // Factores de garantías (10%)
    COLLATERAL_VALUE: 0.06,
    GUARANTORS_QUALITY: 0.04
  };
  
  static calculateCreditScore(applicationData: ApplicationData): CreditScoreResult {
    let totalScore = 0;
    const scoreBreakdown: ScoreBreakdown = {};
    
    // 1. Evaluar estabilidad de ingresos
    const incomeStabilityScore = this.evaluateIncomeStability(applicationData);
    totalScore += incomeStabilityScore * this.SCORING_WEIGHTS.INCOME_STABILITY;
    scoreBreakdown.incomeStability = incomeStabilityScore;
    
    // 2. Evaluar monto de ingresos
    const incomeAmountScore = this.evaluateIncomeAmount(applicationData);
    totalScore += incomeAmountScore * this.SCORING_WEIGHTS.INCOME_AMOUNT;
    scoreBreakdown.incomeAmount = incomeAmountScore;
    
    // 3. Evaluar fuente de ingresos
    const incomeSourceScore = this.evaluateIncomeSource(applicationData);
    totalScore += incomeSourceScore * this.SCORING_WEIGHTS.INCOME_SOURCE;
    scoreBreakdown.incomeSource = incomeSourceScore;
    
    // 4. Evaluar ratio de endeudamiento
    const debtToIncomeScore = this.evaluateDebtToIncome(applicationData);
    totalScore += debtToIncomeScore * this.SCORING_WEIGHTS.DEBT_TO_INCOME;
    scoreBreakdown.debtToIncome = debtToIncomeScore;
    
    // 5. Evaluar capacidad de pago
    const paymentCapacityScore = this.evaluatePaymentCapacity(applicationData);
    totalScore += paymentCapacityScore * this.SCORING_WEIGHTS.PAYMENT_CAPACITY;
    scoreBreakdown.paymentCapacity = paymentCapacityScore;
    
    // 6. Evaluar estabilidad residencial
    const residenceStabilityScore = this.evaluateResidenceStability(applicationData);
    totalScore += residenceStabilityScore * this.SCORING_WEIGHTS.RESIDENCE_STABILITY;
    scoreBreakdown.residenceStability = residenceStabilityScore;
    
    // 7. Evaluar experiencia laboral
    const workExperienceScore = this.evaluateWorkExperience(applicationData);
    totalScore += workExperienceScore * this.SCORING_WEIGHTS.WORK_EXPERIENCE;
    scoreBreakdown.workExperience = workExperienceScore;
    
    // 8. Factor de edad
    const ageFactorScore = this.evaluateAgeFactor(applicationData);
    totalScore += ageFactorScore * this.SCORING_WEIGHTS.AGE_FACTOR;
    scoreBreakdown.ageFactor = ageFactorScore;
    
    // Normalizar score a escala 0-1000
    const finalScore = Math.round(totalScore * 1000);
    
    return {
      score: finalScore,
      riskLevel: this.determineRiskLevel(finalScore),
      recommendation: this.generateRecommendation(finalScore, scoreBreakdown),
      breakdown: scoreBreakdown
    };
  }
  
  private static evaluateIncomeStability(data: ApplicationData): number {
    const incomeSourceStability = {
      EMPLOYEE: 0.9,      // Empleado: alta estabilidad
      PENSIONER: 0.95,    // Pensionado: muy alta estabilidad
      BUSINESS_OWNER: 0.7, // Negocio propio: estabilidad media
      REMITTANCES: 0.8    // Remesas: buena estabilidad
    };
    
    return incomeSourceStability[data.incomeSource] || 0.5;
  }
  
  private static evaluateIncomeAmount(data: ApplicationData): number {
    const totalIncome = data.primaryIncome + (data.secondaryIncome || 0);
    
    // Escala basada en múltiplos del salario mínimo guatemalteco (Q2,992)
    const minimumWage = 2992;
    const incomeMultiple = totalIncome / minimumWage;
    
    if (incomeMultiple >= 10) return 1.0;      // 10+ salarios mínimos
    if (incomeMultiple >= 5) return 0.9;       // 5-10 salarios mínimos
    if (incomeMultiple >= 3) return 0.8;       // 3-5 salarios mínimos
    if (incomeMultiple >= 2) return 0.7;       // 2-3 salarios mínimos
    if (incomeMultiple >= 1.5) return 0.6;     // 1.5-2 salarios mínimos
    if (incomeMultiple >= 1) return 0.5;       // 1-1.5 salarios mínimos
    
    return 0.3; // Menos de 1 salario mínimo
  }
  
  private static evaluateDebtToIncome(data: ApplicationData): number {
    const totalIncome = data.primaryIncome + (data.secondaryIncome || 0);
    const totalExpenses = Object.values(data.expenses).reduce((sum, expense) => sum + (expense || 0), 0);
    const debtToIncomeRatio = totalExpenses / totalIncome;
    
    // Invertir la escala: menor ratio = mejor score
    if (debtToIncomeRatio <= 0.2) return 1.0;      // 20% o menos: excelente
    if (debtToIncomeRatio <= 0.3) return 0.8;      // 21-30%: bueno
    if (debtToIncomeRatio <= 0.4) return 0.6;      // 31-40%: aceptable
    if (debtToIncomeRatio <= 0.5) return 0.4;      // 41-50%: riesgoso
    
    return 0.2; // Más del 50%: muy riesgoso
  }
  
  private static determineRiskLevel(score: number): RiskLevel {
    if (score >= 750) return 'LOW';
    if (score >= 600) return 'MEDIUM';
    if (score >= 450) return 'HIGH';
    return 'VERY_HIGH';
  }
  
  private static generateRecommendation(score: number, breakdown: ScoreBreakdown): string {
    if (score >= 750) {
      return 'APROBADO - Cliente de bajo riesgo con excelente perfil crediticio';
    } else if (score >= 600) {
      return 'APROBADO CON CONDICIONES - Cliente de riesgo medio, considerar garantías adicionales';
    } else if (score >= 450) {
      return 'REVISAR - Cliente de alto riesgo, requiere análisis detallado';
    } else {
      return 'RECHAZADO - Cliente de muy alto riesgo, no cumple criterios mínimos';
    }
  }
}
```

### Interest Rate Calculation

```typescript
// Cálculo de tasas de interés
export class InterestRateCalculator {
  private static readonly BASE_RATES = {
    // Tasas base por tipo de crédito (anual)
    PERSONAL: 0.24,        // 24% anual
    BUSINESS: 0.20,        // 20% anual
    AGRICULTURAL: 0.18,    // 18% anual
    MICROFINANCE: 0.28     // 28% anual
  };
  
  private static readonly RISK_ADJUSTMENTS = {
    LOW: -0.02,           // -2% para bajo riesgo
    MEDIUM: 0.00,         // Sin ajuste para riesgo medio
    HIGH: 0.03,           // +3% para alto riesgo
    VERY_HIGH: 0.06       // +6% para muy alto riesgo
  };
  
  static calculateInterestRate(
    creditType: CreditType,
    riskLevel: RiskLevel,
    amount: number,
    term: number
  ): InterestRateResult {
    // Tasa base según tipo de crédito
    let baseRate = this.BASE_RATES[creditType];
    
    // Ajuste por riesgo
    const riskAdjustment = this.RISK_ADJUSTMENTS[riskLevel];
    
    // Ajuste por monto (descuento por volumen)
    const amountAdjustment = this.calculateAmountAdjustment(amount);
    
    // Ajuste por plazo
    const termAdjustment = this.calculateTermAdjustment(term);
    
    // Tasa final
    const finalRate = baseRate + riskAdjustment + amountAdjustment + termAdjustment;
    
    // Aplicar límites mínimos y máximos
    const cappedRate = Math.max(0.12, Math.min(0.35, finalRate)); // Entre 12% y 35%
    
    return {
      baseRate,
      riskAdjustment,
      amountAdjustment,
      termAdjustment,
      finalRate: cappedRate,
      monthlyRate: cappedRate / 12
    };
  }
  
  private static calculateAmountAdjustment(amount: number): number {
    if (amount >= 100000) return -0.015;    // -1.5% para montos altos
    if (amount >= 50000) return -0.01;      // -1% para montos medios-altos
    if (amount >= 25000) return -0.005;     // -0.5% para montos medios
    if (amount >= 10000) return 0;          // Sin ajuste
    return 0.01;                            // +1% para montos bajos
  }
  
  private static calculateTermAdjustment(term: number): number {
    if (term <= 12) return -0.005;          // -0.5% para plazos cortos
    if (term <= 24) return 0;               // Sin ajuste
    if (term <= 36) return 0.005;           // +0.5% para plazos medios
    return 0.01;                            // +1% para plazos largos
  }
}
```

### Payment Calculation

```typescript
// Cálculo de cuotas y amortización
export class PaymentCalculator {
  static calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    termInMonths: number
  ): number {
    const monthlyRate = annualRate / 12;
    
    if (monthlyRate === 0) {
      return principal / termInMonths;
    }
    
    const payment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) /
      (Math.pow(1 + monthlyRate, termInMonths) - 1);
    
    return Math.round(payment * 100) / 100; // Redondear a 2 decimales
  }
  
  static generateAmortizationSchedule(
    principal: number,
    annualRate: number,
    termInMonths: number
  ): AmortizationSchedule[] {
    const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, termInMonths);
    const monthlyRate = annualRate / 12;
    
    const schedule: AmortizationSchedule[] = [];
    let remainingBalance = principal;
    
    for (let month = 1; month <= termInMonths; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      // Ajustar último pago para eliminar residuos de redondeo
      if (month === termInMonths) {
        remainingBalance = 0;
      }
      
      schedule.push({
        paymentNumber: month,
        paymentAmount: monthlyPayment,
        principalPayment: Math.round(principalPayment * 100) / 100,
        interestPayment: Math.round(interestPayment * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100
      });
    }
    
    return schedule;
  }
  
  static calculateTotalInterest(
    principal: number,
    annualRate: number,
    termInMonths: number
  ): number {
    const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, termInMonths);
    const totalPayments = monthlyPayment * termInMonths;
    return Math.round((totalPayments - principal) * 100) / 100;
  }
}
```## Risk 
Assessment Criteria

### Risk Categories and Thresholds

```typescript
// Criterios de evaluación de riesgo
export const RISK_ASSESSMENT_CRITERIA = {
  // Umbrales de score crediticio
  CREDIT_SCORE_THRESHOLDS: {
    EXCELLENT: 800,    // 800-1000: Excelente
    GOOD: 700,         // 700-799: Bueno
    FAIR: 600,         // 600-699: Regular
    POOR: 500,         // 500-599: Malo
    VERY_POOR: 0       // 0-499: Muy malo
  },
  
  // Factores de riesgo automático
  AUTO_REJECTION_CRITERIA: {
    MIN_CREDIT_SCORE: 400,
    MAX_DEBT_TO_INCOME: 0.6,      // 60% máximo
    MIN_AGE: 18,
    MAX_AGE: 75,
    MIN_INCOME: 2000,             // Q2,000 mínimo
    BLACKLIST_CHECK: true
  },
  
  // Señales de alerta
  WARNING_SIGNALS: {
    HIGH_DEBT_RATIO: 0.45,        // 45% o más
    LOW_INCOME_STABILITY: 0.6,    // Score menor a 0.6
    SHORT_WORK_HISTORY: 6,        // Menos de 6 meses
    MULTIPLE_RECENT_INQUIRIES: 3, // 3 o más consultas en 30 días
    RECENT_DEFAULTS: 12           // Defaults en últimos 12 meses
  }
};

class RiskAssessmentEngine {
  static assessApplicationRisk(applicationData: ApplicationData): RiskAssessmentResult {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;
    
    // 1. Evaluar factores de rechazo automático
    const autoRejectReasons = this.checkAutoRejectionCriteria(applicationData);
    if (autoRejectReasons.length > 0) {
      return {
        riskLevel: 'VERY_HIGH',
        recommendation: 'AUTO_REJECT',
        riskScore: 0,
        riskFactors: autoRejectReasons.map(reason => ({
          factor: reason,
          impact: 'CRITICAL',
          description: `Criterio de rechazo automático: ${reason}`
        })),
        requiresManualReview: false
      };
    }
    
    // 2. Evaluar factores financieros
    const financialRisk = this.assessFinancialRisk(applicationData);
    riskScore += financialRisk.score;
    riskFactors.push(...financialRisk.factors);
    
    // 3. Evaluar estabilidad laboral
    const employmentRisk = this.assessEmploymentRisk(applicationData);
    riskScore += employmentRisk.score;
    riskFactors.push(...employmentRisk.factors);
    
    // 4. Evaluar historial crediticio
    const creditHistoryRisk = this.assessCreditHistoryRisk(applicationData);
    riskScore += creditHistoryRisk.score;
    riskFactors.push(...creditHistoryRisk.factors);
    
    // 5. Evaluar factores demográficos
    const demographicRisk = this.assessDemographicRisk(applicationData);
    riskScore += demographicRisk.score;
    riskFactors.push(...demographicRisk.factors);
    
    // Determinar nivel de riesgo final
    const riskLevel = this.determineOverallRiskLevel(riskScore);
    const recommendation = this.generateRiskRecommendation(riskLevel, riskFactors);
    const requiresManualReview = this.requiresManualReview(riskLevel, riskFactors);
    
    return {
      riskLevel,
      recommendation,
      riskScore,
      riskFactors,
      requiresManualReview
    };
  }
  
  private static checkAutoRejectionCriteria(data: ApplicationData): string[] {
    const reasons: string[] = [];
    
    if (data.creditScore < RISK_ASSESSMENT_CRITERIA.AUTO_REJECTION_CRITERIA.MIN_CREDIT_SCORE) {
      reasons.push('Score crediticio muy bajo');
    }
    
    const debtToIncome = this.calculateDebtToIncomeRatio(data);
    if (debtToIncome > RISK_ASSESSMENT_CRITERIA.AUTO_REJECTION_CRITERIA.MAX_DEBT_TO_INCOME) {
      reasons.push('Ratio de endeudamiento excesivo');
    }
    
    const age = this.calculateAge(data.dateOfBirth);
    if (age < RISK_ASSESSMENT_CRITERIA.AUTO_REJECTION_CRITERIA.MIN_AGE || 
        age > RISK_ASSESSMENT_CRITERIA.AUTO_REJECTION_CRITERIA.MAX_AGE) {
      reasons.push('Edad fuera del rango permitido');
    }
    
    const totalIncome = data.primaryIncome + (data.secondaryIncome || 0);
    if (totalIncome < RISK_ASSESSMENT_CRITERIA.AUTO_REJECTION_CRITERIA.MIN_INCOME) {
      reasons.push('Ingresos insuficientes');
    }
    
    if (data.isBlacklisted) {
      reasons.push('Cliente en lista negra');
    }
    
    return reasons;
  }
  
  private static assessFinancialRisk(data: ApplicationData): RiskAssessmentComponent {
    const factors: RiskFactor[] = [];
    let score = 100; // Empezar con score base
    
    // Evaluar ratio de endeudamiento
    const debtToIncome = this.calculateDebtToIncomeRatio(data);
    if (debtToIncome > RISK_ASSESSMENT_CRITERIA.WARNING_SIGNALS.HIGH_DEBT_RATIO) {
      factors.push({
        factor: 'HIGH_DEBT_RATIO',
        impact: 'HIGH',
        description: `Ratio de endeudamiento alto: ${(debtToIncome * 100).toFixed(1)}%`
      });
      score -= 30;
    } else if (debtToIncome > 0.35) {
      factors.push({
        factor: 'MODERATE_DEBT_RATIO',
        impact: 'MEDIUM',
        description: `Ratio de endeudamiento moderado: ${(debtToIncome * 100).toFixed(1)}%`
      });
      score -= 15;
    }
    
    // Evaluar capacidad de pago
    const paymentCapacity = this.calculatePaymentCapacity(data);
    if (paymentCapacity < 0.2) {
      factors.push({
        factor: 'LOW_PAYMENT_CAPACITY',
        impact: 'HIGH',
        description: 'Capacidad de pago limitada'
      });
      score -= 25;
    }
    
    // Evaluar estabilidad de ingresos
    const incomeStability = this.evaluateIncomeStability(data);
    if (incomeStability < RISK_ASSESSMENT_CRITERIA.WARNING_SIGNALS.LOW_INCOME_STABILITY) {
      factors.push({
        factor: 'UNSTABLE_INCOME',
        impact: 'MEDIUM',
        description: 'Ingresos poco estables'
      });
      score -= 20;
    }
    
    return { score: Math.max(0, score), factors };
  }
  
  private static determineOverallRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 80) return 'LOW';
    if (riskScore >= 60) return 'MEDIUM';
    if (riskScore >= 40) return 'HIGH';
    return 'VERY_HIGH';
  }
  
  private static generateRiskRecommendation(
    riskLevel: RiskLevel, 
    riskFactors: RiskFactor[]
  ): string {
    const criticalFactors = riskFactors.filter(f => f.impact === 'CRITICAL').length;
    const highFactors = riskFactors.filter(f => f.impact === 'HIGH').length;
    
    switch (riskLevel) {
      case 'LOW':
        return 'APROBADO - Cliente de bajo riesgo, proceder con condiciones estándar';
      case 'MEDIUM':
        if (highFactors > 0) {
          return 'APROBADO CON CONDICIONES - Requiere garantías adicionales o co-deudor';
        }
        return 'APROBADO CON CONDICIONES - Monitoreo cercano recomendado';
      case 'HIGH':
        return 'REVISAR MANUALMENTE - Alto riesgo, requiere análisis detallado del comité';
      case 'VERY_HIGH':
        return 'RECHAZADO - Riesgo inaceptable, no cumple criterios mínimos';
      default:
        return 'REVISAR MANUALMENTE - Evaluación adicional requerida';
    }
  }
}
```

### Fraud Detection Rules

```typescript
// Reglas de detección de fraude
export class FraudDetectionEngine {
  private static readonly FRAUD_INDICATORS = {
    // Patrones sospechosos en datos personales
    SUSPICIOUS_PATTERNS: {
      REPEATED_PHONE: 3,        // Mismo teléfono en 3+ aplicaciones
      REPEATED_ADDRESS: 5,      // Misma dirección en 5+ aplicaciones
      SIMILAR_NAMES: 0.9,       // Similitud de nombres > 90%
      SEQUENTIAL_DPI: true      // DPIs secuenciales
    },
    
    // Comportamiento sospechoso
    BEHAVIORAL_FLAGS: {
      MULTIPLE_APPLICATIONS: 2,  // 2+ aplicaciones en 24 horas
      RAPID_SUBMISSION: 300,     // Menos de 5 minutos para completar
      OFF_HOURS_SUBMISSION: true, // Fuera de horario laboral
      UNUSUAL_LOCATION: true     // Ubicación inusual
    },
    
    // Inconsistencias en datos
    DATA_INCONSISTENCIES: {
      INCOME_VS_PROFESSION: 0.5, // Variación > 50% del promedio
      AGE_VS_EXPERIENCE: true,   // Experiencia > edad laboral
      DOCUMENT_MISMATCH: true    // Inconsistencia en documentos
    }
  };
  
  static detectFraudIndicators(applicationData: ApplicationData): FraudDetectionResult {
    const indicators: FraudIndicator[] = [];
    let fraudScore = 0;
    
    // 1. Verificar patrones sospechosos
    const patternIndicators = this.checkSuspiciousPatterns(applicationData);
    indicators.push(...patternIndicators);
    fraudScore += patternIndicators.length * 20;
    
    // 2. Verificar comportamiento sospechoso
    const behavioralIndicators = this.checkBehavioralFlags(applicationData);
    indicators.push(...behavioralIndicators);
    fraudScore += behavioralIndicators.length * 15;
    
    // 3. Verificar inconsistencias en datos
    const inconsistencyIndicators = this.checkDataInconsistencies(applicationData);
    indicators.push(...inconsistencyIndicators);
    fraudScore += inconsistencyIndicators.length * 25;
    
    // 4. Verificar contra listas negras
    const blacklistIndicators = this.checkBlacklists(applicationData);
    indicators.push(...blacklistIndicators);
    fraudScore += blacklistIndicators.length * 50;
    
    const riskLevel = this.determineFraudRiskLevel(fraudScore);
    const recommendation = this.generateFraudRecommendation(riskLevel, indicators);
    
    return {
      fraudScore,
      riskLevel,
      indicators,
      recommendation,
      requiresInvestigation: fraudScore >= 50
    };
  }
  
  private static checkSuspiciousPatterns(data: ApplicationData): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    
    // Verificar teléfono repetido
    if (this.isPhoneRepeated(data.phone)) {
      indicators.push({
        type: 'REPEATED_PHONE',
        severity: 'HIGH',
        description: 'Número de teléfono usado en múltiples aplicaciones',
        details: { phone: data.phone }
      });
    }
    
    // Verificar dirección repetida
    if (this.isAddressRepeated(data.address)) {
      indicators.push({
        type: 'REPEATED_ADDRESS',
        severity: 'MEDIUM',
        description: 'Dirección usada en múltiples aplicaciones',
        details: { address: data.address }
      });
    }
    
    // Verificar DPI secuencial
    if (this.isSequentialDPI(data.dpi)) {
      indicators.push({
        type: 'SEQUENTIAL_DPI',
        severity: 'HIGH',
        description: 'DPI con patrón secuencial sospechoso',
        details: { dpi: data.dpi }
      });
    }
    
    return indicators;
  }
  
  private static checkBehavioralFlags(data: ApplicationData): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    
    // Verificar múltiples aplicaciones
    if (this.hasMultipleRecentApplications(data.applicantId)) {
      indicators.push({
        type: 'MULTIPLE_APPLICATIONS',
        severity: 'HIGH',
        description: 'Múltiples aplicaciones en corto período',
        details: { timeframe: '24 horas' }
      });
    }
    
    // Verificar tiempo de llenado sospechosamente rápido
    if (data.completionTime < this.FRAUD_INDICATORS.BEHAVIORAL_FLAGS.RAPID_SUBMISSION) {
      indicators.push({
        type: 'RAPID_SUBMISSION',
        severity: 'MEDIUM',
        description: 'Aplicación completada muy rápidamente',
        details: { completionTime: data.completionTime }
      });
    }
    
    // Verificar horario de envío
    if (this.isOffHoursSubmission(data.submissionTime)) {
      indicators.push({
        type: 'OFF_HOURS_SUBMISSION',
        severity: 'LOW',
        description: 'Aplicación enviada fuera de horario laboral',
        details: { submissionTime: data.submissionTime }
      });
    }
    
    return indicators;
  }
  
  private static determineFraudRiskLevel(fraudScore: number): FraudRiskLevel {
    if (fraudScore >= 100) return 'VERY_HIGH';
    if (fraudScore >= 70) return 'HIGH';
    if (fraudScore >= 40) return 'MEDIUM';
    if (fraudScore >= 20) return 'LOW';
    return 'MINIMAL';
  }
}
```## Documen
t Requirements

### Required Documents by Application Type

```typescript
// Requisitos de documentos por tipo de solicitud
export const DOCUMENT_REQUIREMENTS = {
  // Documentos básicos requeridos para todos
  BASIC_REQUIRED: [
    {
      type: 'DPI_FRONT',
      name: 'DPI (Frente)',
      description: 'Documento Personal de Identificación - lado frontal',
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'pdf']
    },
    {
      type: 'DPI_BACK',
      name: 'DPI (Reverso)',
      description: 'Documento Personal de Identificación - lado posterior',
      required: true,
      maxSize: 5 * 1024 * 1024,
      allowedFormats: ['jpg', 'jpeg', 'png', 'pdf']
    },
    {
      type: 'SELFIE',
      name: 'Selfie con DPI',
      description: 'Fotografía del solicitante sosteniendo su DPI',
      required: true,
      maxSize: 3 * 1024 * 1024,
      allowedFormats: ['jpg', 'jpeg', 'png']
    }
  ],
  
  // Documentos por tipo de ingresos
  INCOME_DOCUMENTS: {
    EMPLOYEE: [
      {
        type: 'PAYROLL',
        name: 'Constancia de Ingresos',
        description: 'Constancia laboral con salario de los últimos 3 meses',
        required: true
      },
      {
        type: 'BANK_STATEMENT',
        name: 'Estado de Cuenta Bancario',
        description: 'Estados de cuenta de los últimos 3 meses',
        required: true
      }
    ],
    BUSINESS_OWNER: [
      {
        type: 'BUSINESS_LICENSE',
        name: 'Patente de Comercio',
        description: 'Patente de comercio vigente',
        required: true
      },
      {
        type: 'FINANCIAL_STATEMENTS',
        name: 'Estados Financieros',
        description: 'Estados financieros de los últimos 6 meses',
        required: true
      },
      {
        type: 'BANK_STATEMENT',
        name: 'Estado de Cuenta Bancario',
        description: 'Estados de cuenta comerciales de los últimos 3 meses',
        required: true
      }
    ],
    PENSIONER: [
      {
        type: 'PENSION_CERTIFICATE',
        name: 'Constancia de Pensión',
        description: 'Constancia de pensión del IGSS o entidad correspondiente',
        required: true
      },
      {
        type: 'BANK_STATEMENT',
        name: 'Estado de Cuenta Bancario',
        description: 'Estados de cuenta donde se deposita la pensión',
        required: true
      }
    ],
    REMITTANCES: [
      {
        type: 'REMITTANCE_PROOF',
        name: 'Comprobante de Remesas',
        description: 'Comprobantes de remesas de los últimos 6 meses',
        required: true
      },
      {
        type: 'SENDER_ID',
        name: 'Identificación del Remitente',
        description: 'Copia de identificación de quien envía las remesas',
        required: true
      }
    ]
  },
  
  // Documentos adicionales por monto
  AMOUNT_BASED_REQUIREMENTS: {
    OVER_25000: [
      {
        type: 'PROPERTY_DEED',
        name: 'Escritura de Propiedad',
        description: 'Escritura de bien inmueble como garantía',
        required: false
      },
      {
        type: 'PROPERTY_VALUATION',
        name: 'Avalúo de Propiedad',
        description: 'Avalúo comercial del bien inmueble',
        required: false
      }
    ],
    OVER_50000: [
      {
        type: 'GUARANTOR_DOCUMENTS',
        name: 'Documentos de Fiador',
        description: 'DPI y constancia de ingresos de fiador solidario',
        required: true
      },
      {
        type: 'COLLATERAL_INSURANCE',
        name: 'Seguro de Garantía',
        description: 'Póliza de seguro sobre la garantía',
        required: true
      }
    ]
  }
};

class DocumentValidator {
  static validateDocumentRequirements(
    applicationData: ApplicationData,
    uploadedDocuments: UploadedDocument[]
  ): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingDocuments: string[] = [];
    
    // 1. Validar documentos básicos
    const basicRequirements = DOCUMENT_REQUIREMENTS.BASIC_REQUIRED;
    for (const requirement of basicRequirements) {
      const document = uploadedDocuments.find(doc => doc.type === requirement.type);
      
      if (!document && requirement.required) {
        missingDocuments.push(requirement.name);
        errors.push(`Documento requerido faltante: ${requirement.name}`);
      } else if (document) {
        const validation = this.validateDocument(document, requirement);
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
        warnings.push(...validation.warnings);
      }
    }
    
    // 2. Validar documentos por tipo de ingresos
    const incomeRequirements = DOCUMENT_REQUIREMENTS.INCOME_DOCUMENTS[applicationData.incomeSource];
    if (incomeRequirements) {
      for (const requirement of incomeRequirements) {
        const document = uploadedDocuments.find(doc => doc.type === requirement.type);
        
        if (!document && requirement.required) {
          missingDocuments.push(requirement.name);
          errors.push(`Documento de ingresos faltante: ${requirement.name}`);
        }
      }
    }
    
    // 3. Validar documentos por monto
    if (applicationData.requestedAmount > 50000) {
      const highAmountRequirements = DOCUMENT_REQUIREMENTS.AMOUNT_BASED_REQUIREMENTS.OVER_50000;
      for (const requirement of highAmountRequirements) {
        const document = uploadedDocuments.find(doc => doc.type === requirement.type);
        
        if (!document && requirement.required) {
          missingDocuments.push(requirement.name);
          errors.push(`Documento requerido para monto alto: ${requirement.name}`);
        }
      }
    } else if (applicationData.requestedAmount > 25000) {
      const mediumAmountRequirements = DOCUMENT_REQUIREMENTS.AMOUNT_BASED_REQUIREMENTS.OVER_25000;
      for (const requirement of mediumAmountRequirements) {
        const document = uploadedDocuments.find(doc => doc.type === requirement.type);
        
        if (!document && !requirement.required) {
          warnings.push(`Documento recomendado para monto medio: ${requirement.name}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingDocuments,
      completionPercentage: this.calculateCompletionPercentage(uploadedDocuments, applicationData)
    };
  }
  
  private static validateDocument(
    document: UploadedDocument,
    requirement: DocumentRequirement
  ): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar tamaño
    if (document.size > requirement.maxSize) {
      errors.push(`${requirement.name}: Archivo muy grande (máximo ${requirement.maxSize / (1024 * 1024)}MB)`);
    }
    
    // Validar formato
    const fileExtension = document.filename.split('.').pop()?.toLowerCase();
    if (fileExtension && !requirement.allowedFormats.includes(fileExtension)) {
      errors.push(`${requirement.name}: Formato no permitido. Use: ${requirement.allowedFormats.join(', ')}`);
    }
    
    // Validar calidad de imagen (si es imagen)
    if (['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
      const qualityCheck = this.validateImageQuality(document);
      if (!qualityCheck.isValid) {
        warnings.push(...qualityCheck.warnings);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static validateImageQuality(document: UploadedDocument): QualityValidationResult {
    const warnings: string[] = [];
    
    // Validaciones básicas de calidad (simuladas)
    if (document.size < 100 * 1024) { // Menos de 100KB
      warnings.push('La imagen parece tener baja resolución');
    }
    
    // En implementación real, aquí se harían validaciones de:
    // - Resolución mínima
    // - Claridad/nitidez
    // - Detección de texto legible
    // - Detección de rostro (para selfies)
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
```

### Regional Document Variations

```typescript
// Variaciones regionales en requisitos de documentos
export const REGIONAL_DOCUMENT_REQUIREMENTS = {
  // Departamentos con requisitos especiales
  GUATEMALA: {
    additionalDocuments: [
      {
        type: 'MUNICIPAL_CERTIFICATE',
        name: 'Certificación Municipal',
        description: 'Certificación de residencia municipal',
        required: false,
        applicableFor: ['BUSINESS_OWNER']
      }
    ]
  },
  
  QUETZALTENANGO: {
    additionalDocuments: [
      {
        type: 'INDIGENOUS_CERTIFICATE',
        name: 'Certificación Indígena',
        description: 'Certificación de comunidad indígena (si aplica)',
        required: false,
        applicableFor: ['ALL']
      }
    ]
  },
  
  PETEN: {
    additionalDocuments: [
      {
        type: 'LAND_CERTIFICATE',
        name: 'Certificación de Tierras',
        description: 'Certificación de posesión de tierras',
        required: false,
        applicableFor: ['BUSINESS_OWNER']
      }
    ],
    relaxedRequirements: {
      BANK_STATEMENT: {
        alternative: 'COOPERATIVE_STATEMENT',
        description: 'Estado de cuenta de cooperativa local'
      }
    }
  },
  
  // Zonas rurales generales
  RURAL_AREAS: {
    alternatives: {
      PAYROLL: {
        alternative: 'EMPLOYER_LETTER',
        description: 'Carta del empleador con sello y firma'
      },
      BANK_STATEMENT: {
        alternative: 'CASH_FLOW_RECORD',
        description: 'Registro manual de flujo de efectivo'
      }
    }
  }
};

class RegionalDocumentValidator {
  static getDocumentRequirements(
    department: string,
    municipality: string,
    applicationType: string
  ): DocumentRequirement[] {
    let requirements = [...DOCUMENT_REQUIREMENTS.BASIC_REQUIRED];
    
    // Agregar requisitos regionales
    const regionalReqs = REGIONAL_DOCUMENT_REQUIREMENTS[department];
    if (regionalReqs?.additionalDocuments) {
      const applicableReqs = regionalReqs.additionalDocuments.filter(req => 
        req.applicableFor.includes('ALL') || req.applicableFor.includes(applicationType)
      );
      requirements.push(...applicableReqs);
    }
    
    // Aplicar alternativas para zonas rurales
    if (this.isRuralArea(department, municipality)) {
      requirements = this.applyRuralAlternatives(requirements);
    }
    
    return requirements;
  }
  
  private static isRuralArea(department: string, municipality: string): boolean {
    // Lista de municipios considerados rurales
    const ruralMunicipalities = [
      'SAN_JUAN_SACATEPEQUEZ',
      'CHIMALTENANGO',
      'TECPAN',
      'PATZUN',
      // ... más municipios rurales
    ];
    
    return ruralMunicipalities.includes(municipality);
  }
  
  private static applyRuralAlternatives(
    requirements: DocumentRequirement[]
  ): DocumentRequirement[] {
    const ruralAlternatives = REGIONAL_DOCUMENT_REQUIREMENTS.RURAL_AREAS.alternatives;
    
    return requirements.map(req => {
      const alternative = ruralAlternatives[req.type];
      if (alternative) {
        return {
          ...req,
          alternativeType: alternative.alternative,
          alternativeDescription: alternative.description,
          hasAlternative: true
        };
      }
      return req;
    });
  }
}
```## Wor
kflow Rules

### Application State Transitions

```typescript
// Estados de la aplicación y transiciones permitidas
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  PENDING_DOCUMENTS = 'pending_documents',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  DISBURSED = 'disbursed',
  COMPLETED = 'completed'
}

export const APPLICATION_WORKFLOW = {
  // Transiciones permitidas por estado
  ALLOWED_TRANSITIONS: {
    [ApplicationStatus.DRAFT]: [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.CANCELLED
    ],
    [ApplicationStatus.SUBMITTED]: [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.PENDING_DOCUMENTS,
      ApplicationStatus.REJECTED,
      ApplicationStatus.CANCELLED
    ],
    [ApplicationStatus.UNDER_REVIEW]: [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.PENDING_DOCUMENTS
    ],
    [ApplicationStatus.PENDING_DOCUMENTS]: [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.REJECTED,
      ApplicationStatus.CANCELLED
    ],
    [ApplicationStatus.APPROVED]: [
      ApplicationStatus.DISBURSED,
      ApplicationStatus.CANCELLED
    ],
    [ApplicationStatus.REJECTED]: [], // Estado final
    [ApplicationStatus.CANCELLED]: [], // Estado final
    [ApplicationStatus.DISBURSED]: [
      ApplicationStatus.COMPLETED
    ],
    [ApplicationStatus.COMPLETED]: [] // Estado final
  },
  
  // Roles que pueden realizar cada transición
  TRANSITION_PERMISSIONS: {
    [`${ApplicationStatus.DRAFT}->${ApplicationStatus.SUBMITTED}`]: ['AGENT'],
    [`${ApplicationStatus.SUBMITTED}->${ApplicationStatus.UNDER_REVIEW}`]: ['SUPERVISOR', 'ANALYST'],
    [`${ApplicationStatus.UNDER_REVIEW}->${ApplicationStatus.APPROVED}`]: ['SUPERVISOR', 'MANAGER'],
    [`${ApplicationStatus.UNDER_REVIEW}->${ApplicationStatus.REJECTED}`]: ['SUPERVISOR', 'ANALYST', 'MANAGER'],
    [`${ApplicationStatus.APPROVED}->${ApplicationStatus.DISBURSED}`]: ['DISBURSEMENT_OFFICER'],
    [`${ApplicationStatus.DISBURSED}->${ApplicationStatus.COMPLETED}`]: ['SYSTEM']
  },
  
  // Validaciones requeridas para cada transición
  TRANSITION_VALIDATIONS: {
    [`${ApplicationStatus.DRAFT}->${ApplicationStatus.SUBMITTED}`]: [
      'COMPLETE_BASIC_INFO',
      'COMPLETE_FINANCIAL_INFO',
      'MINIMUM_DOCUMENTS',
      'VALID_GUARANTORS'
    ],
    [`${ApplicationStatus.SUBMITTED}->${ApplicationStatus.UNDER_REVIEW}`]: [
      'DOCUMENT_VERIFICATION',
      'INITIAL_SCREENING'
    ],
    [`${ApplicationStatus.UNDER_REVIEW}->${ApplicationStatus.APPROVED}`]: [
      'CREDIT_SCORE_MINIMUM',
      'RISK_ASSESSMENT_PASSED',
      'MANAGER_APPROVAL'
    ]
  }
};

class ApplicationWorkflowManager {
  static canTransition(
    currentStatus: ApplicationStatus,
    targetStatus: ApplicationStatus,
    userRole: UserRole,
    applicationData: ApplicationData
  ): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Verificar si la transición está permitida
    const allowedTransitions = APPLICATION_WORKFLOW.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(targetStatus)) {
      errors.push(`Transición no permitida de ${currentStatus} a ${targetStatus}`);
      return { canTransition: false, errors, warnings };
    }
    
    // 2. Verificar permisos del usuario
    const transitionKey = `${currentStatus}->${targetStatus}`;
    const requiredRoles = APPLICATION_WORKFLOW.TRANSITION_PERMISSIONS[transitionKey];
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      errors.push(`Usuario sin permisos para realizar esta transición. Roles requeridos: ${requiredRoles.join(', ')}`);
    }
    
    // 3. Ejecutar validaciones específicas
    const validationRequirements = APPLICATION_WORKFLOW.TRANSITION_VALIDATIONS[transitionKey];
    if (validationRequirements) {
      const validationResult = this.executeTransitionValidations(
        validationRequirements,
        applicationData
      );
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
    }
    
    return {
      canTransition: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static executeTransitionValidations(
    validations: string[],
    applicationData: ApplicationData
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const validation of validations) {
      switch (validation) {
        case 'COMPLETE_BASIC_INFO':
          if (!this.isBasicInfoComplete(applicationData)) {
            errors.push('Información básica incompleta');
          }
          break;
          
        case 'COMPLETE_FINANCIAL_INFO':
          if (!this.isFinancialInfoComplete(applicationData)) {
            errors.push('Información financiera incompleta');
          }
          break;
          
        case 'MINIMUM_DOCUMENTS':
          const docValidation = DocumentValidator.validateDocumentRequirements(
            applicationData,
            applicationData.documents
          );
          if (!docValidation.isValid) {
            errors.push('Documentos mínimos requeridos faltantes');
          }
          break;
          
        case 'VALID_GUARANTORS':
          if (applicationData.guarantors.length < 2) {
            errors.push('Se requieren mínimo 2 fiadores');
          }
          break;
          
        case 'CREDIT_SCORE_MINIMUM':
          if (applicationData.creditScore < 450) {
            errors.push('Score crediticio por debajo del mínimo requerido');
          }
          break;
          
        case 'RISK_ASSESSMENT_PASSED':
          const riskAssessment = RiskAssessmentEngine.assessApplicationRisk(applicationData);
          if (riskAssessment.riskLevel === 'VERY_HIGH') {
            errors.push('Evaluación de riesgo no aprobada');
          }
          break;
          
        case 'MANAGER_APPROVAL':
          if (!applicationData.managerApproval) {
            errors.push('Aprobación de gerente requerida');
          }
          break;
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }
  
  static getNextPossibleStates(
    currentStatus: ApplicationStatus,
    userRole: UserRole
  ): ApplicationStatus[] {
    const allowedTransitions = APPLICATION_WORKFLOW.ALLOWED_TRANSITIONS[currentStatus] || [];
    
    return allowedTransitions.filter(targetStatus => {
      const transitionKey = `${currentStatus}->${targetStatus}`;
      const requiredRoles = APPLICATION_WORKFLOW.TRANSITION_PERMISSIONS[transitionKey];
      
      return !requiredRoles || requiredRoles.includes(userRole);
    });
  }
}
```

### Approval and Rejection Criteria

```typescript
// Criterios de aprobación y rechazo
export const APPROVAL_CRITERIA = {
  // Criterios automáticos de aprobación
  AUTO_APPROVAL: {
    MAX_AMOUNT: 15000,           // Hasta Q15,000
    MIN_CREDIT_SCORE: 750,       // Score mínimo 750
    MAX_DEBT_TO_INCOME: 0.3,     // Máximo 30% de endeudamiento
    MIN_INCOME: 5000,            // Ingresos mínimos Q5,000
    REQUIRED_DOCUMENTS: 'ALL',    // Todos los documentos
    MAX_RISK_LEVEL: 'LOW'        // Solo riesgo bajo
  },
  
  // Criterios que requieren revisión manual
  MANUAL_REVIEW: {
    AMOUNT_RANGE: { min: 15001, max: 50000 },
    CREDIT_SCORE_RANGE: { min: 600, max: 749 },
    RISK_LEVELS: ['MEDIUM', 'HIGH'],
    SPECIAL_CONDITIONS: [
      'FIRST_TIME_BORROWER',
      'IRREGULAR_INCOME',
      'MULTIPLE_GUARANTORS_REQUIRED'
    ]
  },
  
  // Criterios de rechazo automático
  AUTO_REJECTION: {
    MIN_CREDIT_SCORE: 400,
    MAX_DEBT_TO_INCOME: 0.6,
    MIN_AGE: 18,
    MAX_AGE: 75,
    BLACKLIST_STATUS: true,
    FRAUD_INDICATORS: 'HIGH'
  }
};

class ApprovalEngine {
  static evaluateApplication(applicationData: ApplicationData): ApprovalDecision {
    // 1. Verificar criterios de rechazo automático
    const autoRejectResult = this.checkAutoRejectionCriteria(applicationData);
    if (autoRejectResult.shouldReject) {
      return {
        decision: 'REJECTED',
        reason: 'AUTO_REJECTION',
        details: autoRejectResult.reasons,
        requiresManualReview: false,
        conditions: []
      };
    }
    
    // 2. Verificar criterios de aprobación automática
    const autoApprovalResult = this.checkAutoApprovalCriteria(applicationData);
    if (autoApprovalResult.canAutoApprove) {
      return {
        decision: 'APPROVED',
        reason: 'AUTO_APPROVAL',
        details: ['Cumple todos los criterios de aprobación automática'],
        requiresManualReview: false,
        conditions: this.generateStandardConditions(applicationData)
      };
    }
    
    // 3. Requiere revisión manual
    const manualReviewAnalysis = this.analyzeForManualReview(applicationData);
    return {
      decision: 'PENDING_REVIEW',
      reason: 'MANUAL_REVIEW_REQUIRED',
      details: manualReviewAnalysis.reasons,
      requiresManualReview: true,
      conditions: manualReviewAnalysis.suggestedConditions,
      reviewPriority: manualReviewAnalysis.priority
    };
  }
  
  private static checkAutoRejectionCriteria(data: ApplicationData): AutoRejectionResult {
    const reasons: string[] = [];
    
    if (data.creditScore < APPROVAL_CRITERIA.AUTO_REJECTION.MIN_CREDIT_SCORE) {
      reasons.push(`Score crediticio muy bajo: ${data.creditScore}`);
    }
    
    const debtToIncome = this.calculateDebtToIncomeRatio(data);
    if (debtToIncome > APPROVAL_CRITERIA.AUTO_REJECTION.MAX_DEBT_TO_INCOME) {
      reasons.push(`Ratio de endeudamiento excesivo: ${(debtToIncome * 100).toFixed(1)}%`);
    }
    
    const age = this.calculateAge(data.dateOfBirth);
    if (age < APPROVAL_CRITERIA.AUTO_REJECTION.MIN_AGE || age > APPROVAL_CRITERIA.AUTO_REJECTION.MAX_AGE) {
      reasons.push(`Edad fuera del rango permitido: ${age} años`);
    }
    
    if (data.isBlacklisted) {
      reasons.push('Cliente en lista negra');
    }
    
    const fraudAssessment = FraudDetectionEngine.detectFraudIndicators(data);
    if (fraudAssessment.riskLevel === 'HIGH' || fraudAssessment.riskLevel === 'VERY_HIGH') {
      reasons.push('Indicadores de fraude detectados');
    }
    
    return {
      shouldReject: reasons.length > 0,
      reasons
    };
  }
  
  private static checkAutoApprovalCriteria(data: ApplicationData): AutoApprovalResult {
    const criteria = APPROVAL_CRITERIA.AUTO_APPROVAL;
    const failedCriteria: string[] = [];
    
    if (data.requestedAmount > criteria.MAX_AMOUNT) {
      failedCriteria.push(`Monto excede límite de auto-aprobación: Q${data.requestedAmount.toLocaleString()}`);
    }
    
    if (data.creditScore < criteria.MIN_CREDIT_SCORE) {
      failedCriteria.push(`Score crediticio insuficiente: ${data.creditScore}`);
    }
    
    const debtToIncome = this.calculateDebtToIncomeRatio(data);
    if (debtToIncome > criteria.MAX_DEBT_TO_INCOME) {
      failedCriteria.push(`Ratio de endeudamiento alto: ${(debtToIncome * 100).toFixed(1)}%`);
    }
    
    const totalIncome = data.primaryIncome + (data.secondaryIncome || 0);
    if (totalIncome < criteria.MIN_INCOME) {
      failedCriteria.push(`Ingresos insuficientes: Q${totalIncome.toLocaleString()}`);
    }
    
    const riskAssessment = RiskAssessmentEngine.assessApplicationRisk(data);
    if (riskAssessment.riskLevel !== 'LOW') {
      failedCriteria.push(`Nivel de riesgo no califica: ${riskAssessment.riskLevel}`);
    }
    
    return {
      canAutoApprove: failedCriteria.length === 0,
      failedCriteria
    };
  }
  
  private static generateStandardConditions(data: ApplicationData): ApprovalCondition[] {
    const conditions: ApprovalCondition[] = [];
    
    // Condiciones estándar
    conditions.push({
      type: 'INSURANCE_REQUIRED',
      description: 'Seguro de vida requerido',
      mandatory: true
    });
    
    conditions.push({
      type: 'DIRECT_DEBIT',
      description: 'Débito automático de cuenta bancaria',
      mandatory: true
    });
    
    // Condiciones basadas en el perfil
    if (data.requestedAmount > 25000) {
      conditions.push({
        type: 'COLLATERAL_REQUIRED',
        description: 'Garantía real requerida',
        mandatory: true
      });
    }
    
    if (data.incomeSource === 'BUSINESS_OWNER') {
      conditions.push({
        type: 'FINANCIAL_STATEMENTS',
        description: 'Estados financieros actualizados cada 6 meses',
        mandatory: false
      });
    }
    
    return conditions;
  }
}
```## Ag
ent Permissions and Restrictions

### Role-Based Access Control

```typescript
// Definición de roles y permisos
export enum UserRole {
  AGENT = 'agent',
  SUPERVISOR = 'supervisor',
  ANALYST = 'analyst',
  MANAGER = 'manager',
  DISBURSEMENT_OFFICER = 'disbursement_officer',
  ADMIN = 'admin'
}

export const ROLE_PERMISSIONS = {
  [UserRole.AGENT]: {
    // Permisos de aplicaciones
    applications: {
      create: true,
      read: 'OWN_ONLY',        // Solo sus propias aplicaciones
      update: 'DRAFT_ONLY',     // Solo en estado borrador
      delete: false,
      submit: true,
      cancel: 'OWN_ONLY'
    },
    
    // Límites operacionales
    limits: {
      maxApplicationAmount: 50000,    // Q50,000 máximo
      maxDailyApplications: 10,       // 10 aplicaciones por día
      maxMonthlyVolume: 500000,       // Q500,000 volumen mensual
      requiresSupervisorApproval: {
        amount: 25000,                // Montos > Q25,000
        riskLevel: 'HIGH'             // Riesgo alto
      }
    },
    
    // Funcionalidades disponibles
    features: {
      viewReports: 'OWN_ONLY',
      exportData: false,
      manageUsers: false,
      systemConfiguration: false,
      bulkOperations: false
    }
  },
  
  [UserRole.SUPERVISOR]: {
    applications: {
      create: true,
      read: 'TEAM_ONLY',        // Su equipo
      update: 'SUBMITTED_ONLY',  // Solo aplicaciones enviadas
      delete: false,
      submit: true,
      cancel: 'TEAM_ONLY',
      approve: 'LIMITED',        // Hasta cierto monto
      reject: true
    },
    
    limits: {
      maxApplicationAmount: 100000,
      maxDailyApplications: 50,
      maxMonthlyVolume: 2000000,
      canApproveUpTo: 50000,     // Puede aprobar hasta Q50,000
      teamSize: 10               // Máximo 10 agentes
    },
    
    features: {
      viewReports: 'TEAM_ONLY',
      exportData: 'LIMITED',
      manageUsers: 'TEAM_ONLY',
      systemConfiguration: false,
      bulkOperations: 'LIMITED'
    }
  },
  
  [UserRole.MANAGER]: {
    applications: {
      create: true,
      read: 'ALL',
      update: 'ALL',
      delete: 'CANCELLED_ONLY',
      submit: true,
      cancel: 'ALL',
      approve: 'ALL',
      reject: 'ALL'
    },
    
    limits: {
      maxApplicationAmount: 500000,
      maxDailyApplications: 100,
      maxMonthlyVolume: 10000000,
      canApproveUpTo: 500000,
      teamSize: 50
    },
    
    features: {
      viewReports: 'ALL',
      exportData: true,
      manageUsers: 'ALL',
      systemConfiguration: 'LIMITED',
      bulkOperations: true
    }
  }
};

class PermissionManager {
  static hasPermission(
    userRole: UserRole,
    action: string,
    resource: string,
    context?: PermissionContext
  ): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) return false;
    
    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;
    
    const permission = resourcePermissions[action];
    
    // Permiso booleano simple
    if (typeof permission === 'boolean') {
      return permission;
    }
    
    // Permiso condicional
    if (typeof permission === 'string') {
      return this.evaluateConditionalPermission(permission, context);
    }
    
    return false;
  }
  
  private static evaluateConditionalPermission(
    permission: string,
    context?: PermissionContext
  ): boolean {
    if (!context) return false;
    
    switch (permission) {
      case 'OWN_ONLY':
        return context.ownerId === context.currentUserId;
        
      case 'TEAM_ONLY':
        return context.teamMembers?.includes(context.ownerId) || false;
        
      case 'DRAFT_ONLY':
        return context.status === 'draft';
        
      case 'SUBMITTED_ONLY':
        return context.status === 'submitted';
        
      case 'LIMITED':
        return this.evaluateLimitedPermission(context);
        
      default:
        return false;
    }
  }
  
  static checkOperationalLimits(
    userRole: UserRole,
    operation: OperationRequest
  ): LimitCheckResult {
    const limits = ROLE_PERMISSIONS[userRole]?.limits;
    if (!limits) {
      return { allowed: false, reason: 'No limits defined for role' };
    }
    
    const violations: string[] = [];
    
    // Verificar límite de monto
    if (operation.amount > limits.maxApplicationAmount) {
      violations.push(`Monto excede límite: Q${operation.amount.toLocaleString()} > Q${limits.maxApplicationAmount.toLocaleString()}`);
    }
    
    // Verificar límite diario
    if (operation.dailyCount >= limits.maxDailyApplications) {
      violations.push(`Límite diario alcanzado: ${operation.dailyCount}/${limits.maxDailyApplications}`);
    }
    
    // Verificar volumen mensual
    if (operation.monthlyVolume + operation.amount > limits.maxMonthlyVolume) {
      violations.push(`Volumen mensual excedido: Q${(operation.monthlyVolume + operation.amount).toLocaleString()}`);
    }
    
    // Verificar si requiere aprobación de supervisor
    const requiresApproval = this.requiresSupervisorApproval(limits, operation);
    
    return {
      allowed: violations.length === 0,
      violations,
      requiresSupervisorApproval: requiresApproval,
      reason: violations.length > 0 ? violations.join('; ') : undefined
    };
  }
  
  private static requiresSupervisorApproval(
    limits: any,
    operation: OperationRequest
  ): boolean {
    const approvalCriteria = limits.requiresSupervisorApproval;
    if (!approvalCriteria) return false;
    
    return (
      operation.amount > approvalCriteria.amount ||
      operation.riskLevel === approvalCriteria.riskLevel
    );
  }
}
```

### Agent Activity Monitoring

```typescript
// Monitoreo de actividad de agentes
export class AgentActivityMonitor {
  private static readonly ACTIVITY_THRESHOLDS = {
    // Umbrales de actividad sospechosa
    SUSPICIOUS_ACTIVITY: {
      MAX_APPLICATIONS_PER_HOUR: 5,
      MAX_APPLICATIONS_PER_DAY: 15,
      MIN_TIME_BETWEEN_APPLICATIONS: 300, // 5 minutos
      MAX_REJECTION_RATE: 0.8,            // 80% de rechazos
      MAX_INCOMPLETE_RATE: 0.6            // 60% incompletas
    },
    
    // Métricas de rendimiento
    PERFORMANCE_METRICS: {
      MIN_COMPLETION_RATE: 0.7,           // 70% completadas
      MIN_APPROVAL_RATE: 0.3,             // 30% aprobadas
      MAX_AVERAGE_PROCESSING_TIME: 1800,  // 30 minutos
      MIN_DOCUMENT_QUALITY_SCORE: 0.8     // 80% calidad docs
    }
  };
  
  static monitorAgentActivity(
    agentId: string,
    timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ): AgentActivityReport {
    const activities = this.getAgentActivities(agentId, timeframe);
    const metrics = this.calculateActivityMetrics(activities);
    const alerts = this.generateActivityAlerts(metrics);
    
    return {
      agentId,
      timeframe,
      metrics,
      alerts,
      recommendations: this.generateRecommendations(metrics, alerts)
    };
  }
  
  private static calculateActivityMetrics(activities: AgentActivity[]): ActivityMetrics {
    const totalApplications = activities.length;
    const completedApplications = activities.filter(a => a.status !== 'draft').length;
    const approvedApplications = activities.filter(a => a.status === 'approved').length;
    const rejectedApplications = activities.filter(a => a.status === 'rejected').length;
    
    const completionRate = totalApplications > 0 ? completedApplications / totalApplications : 0;
    const approvalRate = completedApplications > 0 ? approvedApplications / completedApplications : 0;
    const rejectionRate = completedApplications > 0 ? rejectedApplications / completedApplications : 0;
    
    // Calcular tiempo promedio de procesamiento
    const processingTimes = activities
      .filter(a => a.completedAt && a.createdAt)
      .map(a => (a.completedAt!.getTime() - a.createdAt.getTime()) / 1000);
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;
    
    return {
      totalApplications,
      completedApplications,
      approvedApplications,
      rejectedApplications,
      completionRate,
      approvalRate,
      rejectionRate,
      averageProcessingTime,
      documentQualityScore: this.calculateDocumentQualityScore(activities)
    };
  }
  
  private static generateActivityAlerts(metrics: ActivityMetrics): ActivityAlert[] {
    const alerts: ActivityAlert[] = [];
    const thresholds = this.ACTIVITY_THRESHOLDS;
    
    // Alerta por alta tasa de rechazo
    if (metrics.rejectionRate > thresholds.SUSPICIOUS_ACTIVITY.MAX_REJECTION_RATE) {
      alerts.push({
        type: 'HIGH_REJECTION_RATE',
        severity: 'HIGH',
        message: `Tasa de rechazo muy alta: ${(metrics.rejectionRate * 100).toFixed(1)}%`,
        recommendation: 'Revisar calidad de aplicaciones y criterios de selección'
      });
    }
    
    // Alerta por baja tasa de completitud
    if (metrics.completionRate < thresholds.PERFORMANCE_METRICS.MIN_COMPLETION_RATE) {
      alerts.push({
        type: 'LOW_COMPLETION_RATE',
        severity: 'MEDIUM',
        message: `Tasa de completitud baja: ${(metrics.completionRate * 100).toFixed(1)}%`,
        recommendation: 'Capacitación en proceso de llenado de aplicaciones'
      });
    }
    
    // Alerta por tiempo de procesamiento alto
    if (metrics.averageProcessingTime > thresholds.PERFORMANCE_METRICS.MAX_AVERAGE_PROCESSING_TIME) {
      alerts.push({
        type: 'SLOW_PROCESSING',
        severity: 'LOW',
        message: `Tiempo de procesamiento alto: ${Math.round(metrics.averageProcessingTime / 60)} minutos`,
        recommendation: 'Optimizar flujo de trabajo y uso de herramientas'
      });
    }
    
    return alerts;
  }
  
  static validateAgentOperation(
    agentId: string,
    operation: AgentOperation
  ): OperationValidationResult {
    const recentActivity = this.getRecentAgentActivity(agentId, '1_HOUR');
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Verificar límite de aplicaciones por hora
    if (recentActivity.length >= this.ACTIVITY_THRESHOLDS.SUSPICIOUS_ACTIVITY.MAX_APPLICATIONS_PER_HOUR) {
      errors.push('Límite de aplicaciones por hora excedido');
    }
    
    // Verificar tiempo mínimo entre aplicaciones
    const lastApplication = recentActivity[0];
    if (lastApplication) {
      const timeSinceLastApp = (Date.now() - lastApplication.createdAt.getTime()) / 1000;
      if (timeSinceLastApp < this.ACTIVITY_THRESHOLDS.SUSPICIOUS_ACTIVITY.MIN_TIME_BETWEEN_APPLICATIONS) {
        warnings.push('Tiempo muy corto desde la última aplicación');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## Regional Considerations

### Guatemala-Specific Business Rules

```typescript
// Reglas específicas para Guatemala
export const GUATEMALA_BUSINESS_RULES = {
  // Regulaciones financieras locales
  FINANCIAL_REGULATIONS: {
    MAX_INTEREST_RATE: 0.35,        // 35% anual máximo
    MIN_INTEREST_RATE: 0.12,        // 12% anual mínimo
    USURY_THRESHOLD: 0.40,          // 40% considerado usura
    REQUIRED_DISCLOSURES: [
      'TOTAL_COST_OF_CREDIT',
      'EFFECTIVE_ANNUAL_RATE',
      'PAYMENT_SCHEDULE',
      'PENALTIES_AND_FEES'
    ]
  },
  
  // Días festivos y no laborables
  NON_WORKING_DAYS: [
    '01-01', // Año Nuevo
    '03-29', // Viernes Santo (variable)
    '03-30', // Sábado Santo (variable)
    '05-01', // Día del Trabajo
    '06-30', // Día del Ejército
    '09-15', // Día de la Independencia
    '10-20', // Día de la Revolución
    '11-01', // Día de Todos los Santos
    '12-24', // Nochebuena
    '12-25', // Navidad
    '12-31'  // Fin de Año
  ],
  
  // Horarios de operación por región
  OPERATING_HOURS: {
    GUATEMALA_CITY: { start: '08:00', end: '18:00' },
    QUETZALTENANGO: { start: '08:00', end: '17:00' },
    RURAL_AREAS: { start: '07:00', end: '16:00' }
  },
  
  // Moneda y formateo
  CURRENCY: {
    CODE: 'GTQ',
    SYMBOL: 'Q',
    DECIMAL_PLACES: 2,
    THOUSAND_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.'
  }
};

class GuatemalaComplianceValidator {
  static validateInterestRate(rate: number): ComplianceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (rate > GUATEMALA_BUSINESS_RULES.FINANCIAL_REGULATIONS.MAX_INTEREST_RATE) {
      errors.push(`Tasa de interés excede el máximo legal: ${(rate * 100).toFixed(2)}%`);
    }
    
    if (rate < GUATEMALA_BUSINESS_RULES.FINANCIAL_REGULATIONS.MIN_INTEREST_RATE) {
      warnings.push(`Tasa de interés muy baja: ${(rate * 100).toFixed(2)}%`);
    }
    
    if (rate > GUATEMALA_BUSINESS_RULES.FINANCIAL_REGULATIONS.USURY_THRESHOLD) {
      errors.push(`Tasa considerada usura: ${(rate * 100).toFixed(2)}%`);
    }
    
    return {
      isCompliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static isWorkingDay(date: Date): boolean {
    // Verificar si es fin de semana
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Domingo o Sábado
      return false;
    }
    
    // Verificar días festivos
    const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return !GUATEMALA_BUSINESS_RULES.NON_WORKING_DAYS.includes(monthDay);
  }
  
  static formatCurrency(amount: number): string {
    const { SYMBOL, DECIMAL_PLACES, THOUSAND_SEPARATOR, DECIMAL_SEPARATOR } = 
      GUATEMALA_BUSINESS_RULES.CURRENCY;
    
    return `${SYMBOL}${amount.toLocaleString('es-GT', {
      minimumFractionDigits: DECIMAL_PLACES,
      maximumFractionDigits: DECIMAL_PLACES
    })}`;
  }
}
```

## Business Constants

```typescript
// Constantes de negocio centralizadas
export const BUSINESS_CONSTANTS = {
  // Límites generales
  GENERAL_LIMITS: {
    MIN_CREDIT_AMOUNT: 1000,
    MAX_CREDIT_AMOUNT: 500000,
    MIN_TERM_MONTHS: 6,
    MAX_TERM_MONTHS: 60,
    MIN_AGE: 18,
    MAX_AGE: 75
  },
  
  // Tasas y porcentajes
  RATES_AND_PERCENTAGES: {
    BASE_INTEREST_RATE: 0.24,
    PROCESSING_FEE_RATE: 0.02,
    INSURANCE_RATE: 0.005,
    LATE_PAYMENT_PENALTY: 0.05
  },
  
  // Timeouts y plazos
  TIMEOUTS: {
    APPLICATION_EXPIRY_DAYS: 30,
    DOCUMENT_VALIDITY_DAYS: 90,
    APPROVAL_VALIDITY_DAYS: 15,
    DISBURSEMENT_DEADLINE_DAYS: 5
  },
  
  // Configuración de scoring
  SCORING_CONFIG: {
    MIN_SCORE: 0,
    MAX_SCORE: 1000,
    APPROVAL_THRESHOLD: 600,
    AUTO_APPROVAL_THRESHOLD: 750,
    REJECTION_THRESHOLD: 400
  }
};
```

---

**Última Actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo de Desarrollo CrediBowpi
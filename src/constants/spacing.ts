// 8pt Grid Spacing System with 4pt micro-adjustments
export const spacing = {
  // Micro spacing (4pt increments)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,

  // Standard spacing (8pt grid)
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space20: 20,
  space24: 24,
  space32: 32,
  space40: 40,
  space48: 48,
  space56: 56,
  space64: 64,
  space72: 72,
  space80: 80,

  // Component specific spacing
  touchTarget: 44, // Minimum touch target size
  iconSize: 24,
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];

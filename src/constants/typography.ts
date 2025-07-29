// DM Sans Typography System
export const typography = {
  // Font Family
  fontFamily: {
    primary: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    bold: 'DMSans-Bold',
  },

  // Font Sizes (8pt grid system)
  fontSize: {
    h1: 32,
    h2: 24,
    h3: 20,
    bodyL: 18,
    bodyM: 16,
    bodyS: 14,
    bodyXS: 12,
    label: 12,
    caption: 10,
    minicaption: 8,
  },

  // Line Heights
  lineHeight: {
    h1: 40,
    h2: 32,
    h3: 28,
    bodyL: 26,
    bodyM: 24,
    bodyS: 20,
    bodyXS: 16,
    label: 16,
    caption: 14,
    minicaption: 12,
  },

  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;

export type TypographyKey = keyof typeof typography;
export type TypographyValue = (typeof typography)[TypographyKey];

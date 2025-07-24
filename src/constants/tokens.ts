// CrediBowpi Design Tokens
// Centralized design system tokens following 8pt grid system

import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

// Design tokens combining all design system elements
export const tokens = {
  colors,
  typography,
  spacing,

  // Component-specific tokens
  components: {
    button: {
      borderRadius: spacing.borderRadius.md,
      minHeight: spacing.touchTarget,
      paddingHorizontal: spacing.space16,
      paddingVertical: spacing.space12,
    },
    card: {
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.space16,
      shadow: {
        shadowColor: colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },
    input: {
      borderRadius: spacing.borderRadius.md,
      minHeight: spacing.touchTarget,
      paddingHorizontal: spacing.space12,
      paddingVertical: spacing.space12,
      borderWidth: 1,
    },
    modal: {
      borderRadius: spacing.space24, // 24pt top radius for bottom sheets
      padding: spacing.space24,
    },
  },

  // Animation tokens
  animation: {
    duration: {
      fast: 150,      // Tap feedback
      normal: 250,    // Screen transitions
      slow: 300,      // Complex animations
    },
    easing: {
      easeInOut: 'ease-in-out',
      spring: 'spring',
    },
  },

  // Accessibility tokens
  accessibility: {
    minTouchTarget: spacing.touchTarget, // 44x44pt minimum
    contrastRatio: {
      aa: 4.5,      // WCAG AA compliance
      aaa: 7,       // WCAG AAA compliance
    },
  },
} as const;

export type Tokens = typeof tokens;
export default tokens;
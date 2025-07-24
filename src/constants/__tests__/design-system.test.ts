import { colors } from '../colors';
import { typography } from '../typography';
import { spacing } from '../spacing';
import { tokens } from '../tokens';

describe('Design System Foundation', () => {
  describe('Colors', () => {
    it('should have CrediBowpi brand colors', () => {
      expect(colors.primary.deepBlue).toBe('#2A3575');
      expect(colors.primary.blue).toBe('#2973E7');
      expect(colors.primary.cyan).toBe('#5DBDF9');
    });

    it('should have semantic colors', () => {
      expect(colors.success).toBe('#10B981');
      expect(colors.warning).toBe('#F59E0B');
      expect(colors.error).toBe('#EF4444');
      expect(colors.info).toBe('#3B82F6');
    });

    it('should have neutral color palette', () => {
      expect(colors.neutral.white).toBe('#FFFFFF');
      expect(colors.neutral.black).toBe('#000000');
      expect(colors.neutral.gray500).toBe('#737373');
    });
  });

  describe('Typography', () => {
    it('should have DM Sans font family', () => {
      expect(typography.fontFamily.primary).toBe('DMSans-Regular');
      expect(typography.fontFamily.medium).toBe('DMSans-Medium');
      expect(typography.fontFamily.bold).toBe('DMSans-Bold');
    });

    it('should have typography scale following 8pt grid', () => {
      expect(typography.fontSize.h1).toBe(32);
      expect(typography.fontSize.h2).toBe(24);
      expect(typography.fontSize.h3).toBe(20);
      expect(typography.fontSize.bodyL).toBe(18);
      expect(typography.fontSize.bodyM).toBe(16);
      expect(typography.fontSize.bodyS).toBe(14);
      expect(typography.fontSize.label).toBe(12);
      expect(typography.fontSize.caption).toBe(10);
    });

    it('should have proper line heights', () => {
      expect(typography.lineHeight.h1).toBe(40);
      expect(typography.lineHeight.bodyM).toBe(24);
      expect(typography.lineHeight.caption).toBe(14);
    });
  });

  describe('Spacing', () => {
    it('should follow 8pt grid system', () => {
      expect(spacing.space8).toBe(8);
      expect(spacing.space16).toBe(16);
      expect(spacing.space24).toBe(24);
      expect(spacing.space32).toBe(32);
    });

    it('should have 4pt micro-adjustments', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(12);
      expect(spacing.lg).toBe(16);
    });

    it('should have accessibility-compliant touch targets', () => {
      expect(spacing.touchTarget).toBe(44);
    });

    it('should have consistent border radius values', () => {
      expect(spacing.borderRadius.sm).toBe(4);
      expect(spacing.borderRadius.md).toBe(8);
      expect(spacing.borderRadius.lg).toBe(12);
      expect(spacing.borderRadius.xl).toBe(16);
    });
  });

  describe('Design Tokens', () => {
    it('should combine all design system elements', () => {
      expect(tokens.colors).toBeDefined();
      expect(tokens.typography).toBeDefined();
      expect(tokens.spacing).toBeDefined();
    });

    it('should have component-specific tokens', () => {
      expect(tokens.components.button.minHeight).toBe(44);
      expect(tokens.components.button.borderRadius).toBe(8);
      expect(tokens.components.card.borderRadius).toBe(12);
    });

    it('should have animation tokens', () => {
      expect(tokens.animation.duration.fast).toBe(150);
      expect(tokens.animation.duration.normal).toBe(250);
      expect(tokens.animation.duration.slow).toBe(300);
    });

    it('should have accessibility tokens', () => {
      expect(tokens.accessibility.minTouchTarget).toBe(44);
      expect(tokens.accessibility.contrastRatio.aa).toBe(4.5);
    });
  });
});
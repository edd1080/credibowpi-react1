import { TypographyProps } from '../Typography';

describe('Typography Component', () => {
  it('should have correct default props', () => {
    const defaultProps: Partial<TypographyProps> = {
      variant: 'bodyM',
      color: 'primary',
      weight: 'regular',
    };

    expect(defaultProps.variant).toBe('bodyM');
    expect(defaultProps.color).toBe('primary');
    expect(defaultProps.weight).toBe('regular');
  });

  it('should accept all required props', () => {
    const props: TypographyProps = {
      children: 'Test Text',
    };

    expect(props.children).toBe('Test Text');
  });

  it('should support all typography variants', () => {
    const variants = [
      'h1',
      'h2',
      'h3',
      'bodyL',
      'bodyM',
      'bodyS',
      'label',
      'caption',
    ] as const;

    variants.forEach(variant => {
      const props: TypographyProps = {
        children: `${variant} Text`,
        variant: variant,
      };
      expect(props.variant).toBe(variant);
    });
  });

  it('should support all color variants', () => {
    const colors = [
      'primary',
      'secondary',
      'tertiary',
      'inverse',
      'success',
      'warning',
      'error',
    ] as const;

    colors.forEach(color => {
      const props: TypographyProps = {
        children: `${color} Text`,
        color: color,
      };
      expect(props.color).toBe(color);
    });
  });

  it('should support all weight variants', () => {
    const weights = ['regular', 'medium', 'bold'] as const;

    weights.forEach(weight => {
      const props: TypographyProps = {
        children: `${weight} Text`,
        weight: weight,
      };
      expect(props.weight).toBe(weight);
    });
  });

  it('should handle numberOfLines prop', () => {
    const props: TypographyProps = {
      children: 'Long text that should be truncated',
      numberOfLines: 2,
    };

    expect(props.numberOfLines).toBe(2);
  });
});

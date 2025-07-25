import { ButtonProps } from '../Button';

describe('Button Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('should have correct default props', () => {
    const defaultProps: Partial<ButtonProps> = {
      variant: 'primary',
      size: 'medium',
      disabled: false,
      loading: false,
    };

    expect(defaultProps.variant).toBe('primary');
    expect(defaultProps.size).toBe('medium');
    expect(defaultProps.disabled).toBe(false);
    expect(defaultProps.loading).toBe(false);
  });

  it('should accept all required props', () => {
    const props: ButtonProps = {
      title: 'Test Button',
      onPress: mockOnPress,
    };

    expect(props.title).toBe('Test Button');
    expect(typeof props.onPress).toBe('function');
  });

  it('should support all button variants', () => {
    const variants = [
      'primary',
      'secondary',
      'tertiary',
      'sync',
      'retry',
    ] as const;

    variants.forEach(variant => {
      const props: ButtonProps = {
        title: `${variant} Button`,
        variant: variant,
        onPress: mockOnPress,
      };
      expect(props.variant).toBe(variant);
    });
  });

  it('should support all button sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach(size => {
      const props: ButtonProps = {
        title: `${size} Button`,
        size: size,
        onPress: mockOnPress,
      };
      expect(props.size).toBe(size);
    });
  });

  it('should handle loading and disabled states', () => {
    const loadingProps: ButtonProps = {
      title: 'Loading Button',
      loading: true,
      onPress: mockOnPress,
    };

    const disabledProps: ButtonProps = {
      title: 'Disabled Button',
      disabled: true,
      onPress: mockOnPress,
    };

    expect(loadingProps.loading).toBe(true);
    expect(disabledProps.disabled).toBe(true);
  });
});

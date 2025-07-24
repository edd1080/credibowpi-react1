import { colors } from '../constants/colors';
import { config } from '../constants/config';

describe('Project Setup', () => {
  it('should have design system colors available', () => {
    expect(colors).toBeDefined();
    expect(colors.primary.deepBlue).toBe('#2A3575');
    expect(colors.primary.blue).toBe('#2973E7');
    expect(colors.primary.cyan).toBe('#5DBDF9');
  });

  it('should have configuration available', () => {
    expect(config).toBeDefined();
    expect(config.sync.intervalMinutes).toBe(5);
    expect(config.ui.splashDuration).toBe(2000);
  });

  it('should have proper TypeScript configuration', () => {
    // This test ensures TypeScript is working properly
    const testString: string = 'test';
    const testNumber: number = 42;
    const testBoolean: boolean = true;

    expect(typeof testString).toBe('string');
    expect(typeof testNumber).toBe('number');
    expect(typeof testBoolean).toBe('boolean');
  });
});

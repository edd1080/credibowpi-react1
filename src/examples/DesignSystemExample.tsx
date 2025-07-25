import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Typography } from '../components/atoms';
import { colors, spacing } from '../constants';

// Example component demonstrating the design system foundation
export const DesignSystemExample: React.FC = () => {
  const handlePress = () => {
    console.log('Button pressed');
  };

  return (
    <View style={styles.container}>
      {/* Typography Examples */}
      <Typography variant="h1" color="primary">
        CrediBowpi Design System
      </Typography>

      <Typography variant="h2" color="secondary">
        Typography Scale
      </Typography>

      <Typography variant="bodyL">
        This is Body Large text using DM Sans font family.
      </Typography>

      <Typography variant="bodyM" color="tertiary">
        This is Body Medium text with tertiary color.
      </Typography>

      <Typography variant="label" weight="medium">
        Label Text - Medium Weight
      </Typography>

      <Typography variant="caption" color="secondary">
        Caption text for additional information
      </Typography>

      {/* Button Examples */}
      <View style={styles.buttonContainer}>
        <Button
          title="Primary Button"
          variant="primary"
          onPress={handlePress}
        />

        <Button
          title="Secondary Button"
          variant="secondary"
          onPress={handlePress}
        />

        <Button
          title="Tertiary Button"
          variant="tertiary"
          onPress={handlePress}
        />

        <Button
          title="Sync Button"
          variant="sync"
          size="small"
          onPress={handlePress}
        />

        <Button
          title="Retry Button"
          variant="retry"
          size="large"
          onPress={handlePress}
        />

        <Button
          title="Loading Button"
          variant="primary"
          loading
          onPress={handlePress}
        />

        <Button
          title="Disabled Button"
          variant="primary"
          disabled
          onPress={handlePress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.space24,
    backgroundColor: colors.background.primary,
    gap: spacing.space16,
  },
  buttonContainer: {
    gap: spacing.space12,
    marginTop: spacing.space24,
  },
});

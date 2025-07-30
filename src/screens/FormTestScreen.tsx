// Test screen for the dynamic form infrastructure
// Add this to your navigation to test all form features

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { FormExample } from '../examples/FormExample';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';

export const FormTestScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Form Infrastructure Test</Text>
        <Text style={styles.subtitle}>
          Test all features of the dynamic form system
        </Text>
      </View>
      
      <FormExample />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  header: {
    padding: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.background.primary,
  },

  title: {
    fontSize: typography.fontSize.h1,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.space8,
  },

  subtitle: {
    fontSize: typography.fontSize.bodyM,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
  },
});
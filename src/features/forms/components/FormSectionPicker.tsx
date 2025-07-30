// Persistent section picker for form navigation
// Allows users to switch between form sections while maintaining context

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { colors } from '../../../constants/colors';
import { typography } from '../../../constants/typography';
import { spacing } from '../../../constants/spacing';
import { FormNavigationState } from '../types';

export interface FormSectionPickerProps {
  navigationState: FormNavigationState;
  onSectionChange: (sectionId: string) => void;
  disabled?: boolean;
}

export const FormSectionPicker: React.FC<FormSectionPickerProps> = React.memo(({
  navigationState,
  onSectionChange,
  disabled = false,
}) => {
  const handleSectionPress = useCallback((sectionId: string) => {
    if (!disabled && sectionId !== navigationState.currentSection) {
      onSectionChange(sectionId);
    }
  }, [disabled, navigationState.currentSection, onSectionChange]);

  const getSectionIcon = (section: typeof navigationState.sections[0]) => {
    if (section.isComplete) {
      return '✓';
    } else if (section.hasErrors) {
      return '!';
    } else if (section.id === navigationState.currentSection) {
      return '●';
    } else {
      return '○';
    }
  };

  const getSectionIconColor = (section: typeof navigationState.sections[0]) => {
    if (section.isComplete) {
      return colors.success;
    } else if (section.hasErrors) {
      return colors.error;
    } else if (section.id === navigationState.currentSection) {
      return colors.primary.deepBlue;
    } else {
      return colors.text.tertiary;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {navigationState.sections.map((section, index) => {
          const isActive = section.id === navigationState.currentSection;
          const isComplete = section.isComplete;
          const hasErrors = section.hasErrors;
          
          return (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionItem,
                isActive && styles.sectionItemActive,
                isComplete && styles.sectionItemComplete,
                hasErrors && styles.sectionItemError,
                disabled && styles.sectionItemDisabled
              ]}
              onPress={() => handleSectionPress(section.id)}
              disabled={disabled}
            >
              <View style={styles.sectionContent}>
                <View style={[
                  styles.sectionIcon,
                  isActive && styles.sectionIconActive,
                  isComplete && styles.sectionIconComplete,
                  hasErrors && styles.sectionIconError
                ]}>
                  <Text style={[
                    styles.sectionIconText,
                    { color: getSectionIconColor(section) }
                  ]}>
                    {getSectionIcon(section)}
                  </Text>
                </View>
                
                <Text style={[
                  styles.sectionTitle,
                  isActive && styles.sectionTitleActive,
                  isComplete && styles.sectionTitleComplete,
                  hasErrors && styles.sectionTitleError,
                  disabled && styles.sectionTitleDisabled
                ]}>
                  {section.title}
                </Text>
              </View>
              
              {/* Connection line to next section */}
              {index < navigationState.sections.length - 1 && (
                <View style={[
                  styles.connectionLine,
                  isComplete && styles.connectionLineComplete
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    paddingVertical: spacing.space12,
  },

  scrollContent: {
    paddingHorizontal: spacing.space16,
    alignItems: 'center',
  },

  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space12,
    borderRadius: spacing.borderRadius.md,
    marginHorizontal: spacing.space4,
    minWidth: 120,
  },

  sectionItemActive: {
    backgroundColor: colors.primary.cyan + '20',
  },

  sectionItemComplete: {
    backgroundColor: colors.success + '10',
  },

  sectionItemError: {
    backgroundColor: colors.error + '10',
  },

  sectionItemDisabled: {
    opacity: 0.5,
  },

  sectionContent: {
    alignItems: 'center',
    flex: 1,
  },

  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space4,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },

  sectionIconActive: {
    borderColor: colors.primary.deepBlue,
    backgroundColor: colors.primary.deepBlue + '20',
  },

  sectionIconComplete: {
    borderColor: colors.success,
    backgroundColor: colors.success + '20',
  },

  sectionIconError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '20',
  },

  sectionIconText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
  },

  sectionTitle: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.caption,
  },

  sectionTitleActive: {
    color: colors.primary.deepBlue,
    fontFamily: typography.fontFamily.medium,
  },

  sectionTitleComplete: {
    color: colors.success,
  },

  sectionTitleError: {
    color: colors.error,
  },

  sectionTitleDisabled: {
    color: colors.text.tertiary,
  },

  connectionLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.neutral.gray300,
    marginHorizontal: spacing.space4,
  },

  connectionLineComplete: {
    backgroundColor: colors.success,
  },
});
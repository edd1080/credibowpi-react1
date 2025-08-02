// Developer Settings Screen - Authentication provider switching and debugging
// This screen allows developers to switch between authentication providers and view debug information

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStoreManager } from '../services/AuthStoreManager';
import { 
  AuthType, 
  AuthProvider, 
  ProviderHealthStatus,
  SwitchValidationResult 
} from '../types/auth-providers';
import { colors, spacing, typography } from '../constants';

interface ProviderInfo {
  type: AuthType;
  name: string;
  description: string;
  isActive: boolean;
  isHealthy: boolean;
  health?: ProviderHealthStatus;
}

export const DeveloperSettings: React.FC = () => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [currentProvider, setCurrentProvider] = useState<AuthProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProviderInfo();
  }, []);

  const loadProviderInfo = async () => {
    try {
      const current = authStoreManager.getCurrentProvider();
      const available = authStoreManager.getAvailableProviders();
      const currentType = authStoreManager.getCurrentAuthType();

      setCurrentProvider(current);

      const providerInfos: ProviderInfo[] = [];
      
      for (const type of available) {
        const isActive = type === currentType;
        let isHealthy = false;
        let health: ProviderHealthStatus | undefined;

        if (isActive && current) {
          try {
            health = await current.healthCheck();
            isHealthy = health.isHealthy;
          } catch (error) {
            console.error(`Health check failed for ${type}:`, error);
          }
        }

        providerInfos.push({
          type,
          name: type === AuthType.LEGACY ? 'Legacy Authentication' : 'Bowpi Authentication',
          description: type === AuthType.LEGACY 
            ? 'Simulated authentication for development' 
            : 'Production Bowpi authentication system',
          isActive,
          isHealthy,
          health
        });
      }

      setProviders(providerInfos);

      // Load debug info
      const debug = authStoreManager.getDebugInfo();
      setDebugInfo(debug);

    } catch (error) {
      console.error('Failed to load provider info:', error);
      Alert.alert('Error', 'Failed to load provider information');
    }
  };

  const handleProviderSwitch = async (targetType: AuthType) => {
    if (targetType === authStoreManager.getCurrentAuthType()) {
      Alert.alert('Info', `Already using ${targetType} provider`);
      return;
    }

    setIsLoading(true);

    try {
      // Validate switch first
      const validation = await authStoreManager.validateProviderSwitch(targetType);
      
      if (!validation.canSwitch) {
        Alert.alert('Cannot Switch', validation.reason || 'Switch validation failed');
        setIsLoading(false);
        return;
      }

      // Show confirmation if required
      if (validation.requiresConfirmation) {
        const confirmed = await showSwitchConfirmation(validation);
        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }

      // Perform switch
      const result = await authStoreManager.switchAuthProvider(targetType);

      if (result.success) {
        Alert.alert(
          'Switch Successful',
          `Successfully switched to ${result.toProvider} provider${result.requiresReauth ? '. You will need to log in again.' : '.'}`
        );
        await loadProviderInfo();
      } else {
        Alert.alert('Switch Failed', result.message);
      }

    } catch (error) {
      console.error('Provider switch failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Switch failed');
    } finally {
      setIsLoading(false);
    }
  };

  const showSwitchConfirmation = (validation: SwitchValidationResult): Promise<boolean> => {
    return new Promise((resolve) => {
      const warningsText = validation.warnings.length > 0 
        ? `\n\nWarnings:\n${validation.warnings.map(w => `• ${w}`).join('\n')}`
        : '';
      
      const requirementsText = validation.requirements.length > 0
        ? `\n\nRequirements:\n${validation.requirements.map(r => `• ${r}`).join('\n')}`
        : '';

      Alert.alert(
        'Confirm Provider Switch',
        `Are you sure you want to switch authentication providers?${warningsText}${requirementsText}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Switch', style: 'destructive', onPress: () => resolve(true) }
        ]
      );
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderInfo();
    setRefreshing(false);
  };

  const renderProviderCard = (provider: ProviderInfo) => (
    <View key={provider.type} style={[
      styles.providerCard,
      provider.isActive && styles.activeProviderCard
    ]}>
      <View style={styles.providerHeader}>
        <View style={styles.providerInfo}>
          <Text style={[
            styles.providerName,
            provider.isActive && styles.activeProviderName
          ]}>
            {provider.name}
          </Text>
          <Text style={styles.providerDescription}>
            {provider.description}
          </Text>
        </View>
        
        <View style={styles.providerStatus}>
          {provider.isActive && (
            <View style={[
              styles.statusBadge,
              provider.isHealthy ? styles.healthyBadge : styles.unhealthyBadge
            ]}>
              <Text style={styles.statusText}>
                {provider.isHealthy ? 'ACTIVE' : 'ISSUES'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {provider.health && (
        <View style={styles.healthInfo}>
          <Text style={styles.healthTitle}>Health Status:</Text>
          <Text style={styles.healthDetail}>
            Success Rate: {(provider.health.performance.successRate * 100).toFixed(1)}%
          </Text>
          <Text style={styles.healthDetail}>
            Avg Response: {provider.health.performance.averageLoginTime}ms
          </Text>
          {provider.health.issues.length > 0 && (
            <Text style={styles.healthIssues}>
              Issues: {provider.health.issues.join(', ')}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.switchButton,
          provider.isActive && styles.disabledButton
        ]}
        onPress={() => handleProviderSwitch(provider.type)}
        disabled={provider.isActive || isLoading}
      >
        <Text style={[
          styles.switchButtonText,
          provider.isActive && styles.disabledButtonText
        ]}>
          {provider.isActive ? 'Current Provider' : `Switch to ${provider.name}`}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDebugInfo = () => {
    if (!debugInfo) return null;

    return (
      <View style={styles.debugSection}>
        <Text style={styles.sectionTitle}>Debug Information</Text>
        
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>Store Manager Status</Text>
          <Text style={styles.debugText}>Initialized: {debugInfo.isInitialized ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Callbacks: {debugInfo.callbackCount}</Text>
          <Text style={styles.debugText}>Switch in Progress: {debugInfo.switchInProgress ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Authenticated: {debugInfo.currentState.isAuthenticated ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Loading: {debugInfo.currentState.isLoading ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Offline Mode: {debugInfo.currentState.isOfflineMode ? 'Yes' : 'No'}</Text>
        </View>

        {debugInfo.currentProvider && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Current Provider</Text>
            <Text style={styles.debugText}>Type: {debugInfo.currentProvider.type}</Text>
            <Text style={styles.debugText}>Name: {debugInfo.currentProvider.name}</Text>
            <Text style={styles.debugText}>Healthy: {debugInfo.currentProvider.isHealthy ? 'Yes' : 'No'}</Text>
          </View>
        )}

        {debugInfo.configuration && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Configuration</Text>
            <Text style={styles.debugText}>Runtime Switch: {debugInfo.configuration.allowRuntimeSwitch ? 'Enabled' : 'Disabled'}</Text>
            <Text style={styles.debugText}>Auto Fallback: {debugInfo.configuration.autoSwitchOnFailure ? 'Enabled' : 'Disabled'}</Text>
            <Text style={styles.debugText}>Confirmation Required: {debugInfo.configuration.requireConfirmationForSwitch ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Fallback Type: {debugInfo.configuration.fallbackType || 'None'}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Developer Settings</Text>
          <Text style={styles.subtitle}>Authentication Provider Management</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Providers</Text>
          {providers.map(renderProviderCard)}
        </View>

        {renderDebugInfo()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This screen is only available in development mode
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[300],
  },
  title: {
    ...typography.h1,
    color: colors.neutral[900],
    marginBottom: spacing.space8,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral[700],
  },
  section: {
    padding: spacing.space20,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.neutral[900],
    marginBottom: spacing.space16,
  },
  providerCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.space16,
    marginBottom: spacing.space12,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  activeProviderCard: {
    borderColor: colors.primary.deepBlue,
    backgroundColor: colors.primary.deepBlue + '10',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.space12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    ...typography.h3,
    color: colors.neutral[900],
    marginBottom: spacing.space4,
  },
  activeProviderName: {
    color: colors.primary.deepBlue,
  },
  providerDescription: {
    ...typography.caption,
    color: colors.neutral[700],
  },
  providerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.space8,
    paddingVertical: spacing.space4,
    borderRadius: 6,
  },
  healthyBadge: {
    backgroundColor: colors.success.green,
  },
  unhealthyBadge: {
    backgroundColor: colors.warning.amber,
  },
  statusText: {
    ...typography.small,
    color: colors.background.primary,
    fontWeight: 'bold',
  },
  healthInfo: {
    marginBottom: spacing.space12,
    padding: spacing.space12,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  healthTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: spacing.space4,
  },
  healthDetail: {
    ...typography.small,
    color: colors.neutral[700],
    marginBottom: spacing.space2,
  },
  healthIssues: {
    ...typography.small,
    color: colors.error.red,
    marginTop: spacing.space4,
  },
  switchButton: {
    backgroundColor: colors.primary.deepBlue,
    paddingVertical: spacing.space12,
    paddingHorizontal: spacing.space16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.neutral[300],
  },
  switchButtonText: {
    ...typography.body,
    color: colors.background.primary,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: colors.neutral[500],
  },
  debugSection: {
    padding: spacing.space20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[300],
  },
  debugCard: {
    backgroundColor: colors.neutral[100],
    padding: spacing.space12,
    borderRadius: 8,
    marginBottom: spacing.space12,
  },
  debugTitle: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: spacing.space8,
  },
  debugText: {
    ...typography.small,
    color: colors.neutral[700],
    marginBottom: spacing.space2,
    fontFamily: 'monospace',
  },
  footer: {
    padding: spacing.space20,
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
    color: colors.neutral[500],
    fontStyle: 'italic',
  },
});
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Typography, Button } from '../components/atoms';
import { MetricCard } from '../components/molecules';
import { AppShell } from '../components/organisms';
import { useAuthStore } from '../stores/authStore';
import {
  useAppStore,
  useApplications,
  useIsOnline,
  useIsSyncing,
} from '../stores/appStore';
import {
  MetricsService,
  DashboardMetrics,
  SyncService,
  ToastService,
} from '../services';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const applications = useApplications();
  const isOnline = useIsOnline();
  const isSyncing = useIsSyncing();

  const { setLastSyncTime, setPendingSyncCount } = useAppStore();

  const [metrics, setMetrics] = useState<DashboardMetrics>(
    MetricsService.generateMockMetrics()
  );
  const [refreshing, setRefreshing] = useState(false);

  // Calculate metrics when applications change
  useEffect(() => {
    const calculatedMetrics =
      applications.length > 0
        ? MetricsService.calculateMetrics(applications)
        : MetricsService.generateMockMetrics();

    setMetrics(calculatedMetrics);
  }, [applications]);

  // Update sync status periodically and handle background sync
  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const syncStatus = await SyncService.getSyncStatus();
        setPendingSyncCount(syncStatus.pendingCount);
        if (syncStatus.lastSyncTime) {
          setLastSyncTime(syncStatus.lastSyncTime);
        }

        // Perform background sync if there are pending items and we're online
        if (isOnline && syncStatus.pendingCount > 0 && !isSyncing) {
          try {
            await SyncService.backgroundSync();
            // Only show success toast if sync was successful and had items to sync
            const newStatus = await SyncService.getSyncStatus();
            if (newStatus.pendingCount < syncStatus.pendingCount) {
              ToastService.success('Datos sincronizados en segundo plano');
            }
          } catch (syncError) {
            // Only show error toast for critical sync failures
            console.error('Background sync failed:', syncError);
          }
        }
      } catch (error) {
        console.error('Failed to update sync status:', error);
      }
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [setPendingSyncCount, setLastSyncTime, isOnline, isSyncing]);

  const handleSync = async () => {
    try {
      await SyncService.manualSync();
      ToastService.success('Sincronización completada exitosamente');
    } catch (error) {
      console.error('Manual sync failed:', error);
      ToastService.error('Error al sincronizar. Inténtalo de nuevo.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh metrics and sync status
      const calculatedMetrics =
        applications.length > 0
          ? MetricsService.calculateMetrics(applications)
          : MetricsService.generateMockMetrics();

      setMetrics(calculatedMetrics);

      // Update sync status
      const syncStatus = await SyncService.getSyncStatus();
      setPendingSyncCount(syncStatus.pendingCount);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewApplication = () => {
    // TODO: Navigate to new application flow
    console.log('Navigate to new application');
  };

  const handleViewApplications = () => {
    // TODO: Navigate to applications list
    console.log('Navigate to applications list');
  };

  const metricCards = MetricsService.getMetricCards(metrics);

  return (
    <AppShell onSyncPress={handleSync}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.blue]}
            tintColor={colors.primary.blue}
          />
        }
      >
        {/* Header with welcome message */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Typography variant="h2" color="primary" weight="bold">
              Bienvenido, {user?.name || 'Edgar'}
            </Typography>
            <Typography variant="bodyM" color="secondary">
              {user?.email}
            </Typography>
          </View>
        </View>

        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
          <Typography
            variant="h3"
            color="primary"
            weight="medium"
            style={styles.sectionTitle}
          >
            Métricas del Día
          </Typography>

          <View style={styles.metricsGrid}>
            {metricCards.map(card => (
              <View key={card.id} style={styles.metricCardContainer}>
                <MetricCard
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  color={card.color}
                  iconName={card.iconName}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Nueva Solicitud"
            variant="primary"
            size="medium"
            onPress={handleNewApplication}
            style={styles.primaryAction}
          />

          <Button
            title="Ver Solicitudes"
            variant="secondary"
            onPress={handleViewApplications}
            style={styles.secondaryAction}
          />
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryContainer}>
          <Typography
            variant="h3"
            color="primary"
            weight="medium"
            style={styles.sectionTitle}
          >
            Resumen Semanal
          </Typography>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Typography variant="bodyM" color="secondary">
                Total de solicitudes
              </Typography>
              <Typography variant="bodyM" color="primary" weight="medium">
                {metrics.weekly.totalApplications}
              </Typography>
            </View>

            <View style={styles.summaryRow}>
              <Typography variant="bodyM" color="secondary">
                Tasa de completación
              </Typography>
              <Typography variant="bodyM" color="success" weight="medium">
                {Math.round(metrics.weekly.completionRate)}%
              </Typography>
            </View>

            <View style={styles.summaryRow}>
              <Typography variant="bodyM" color="secondary">
                Tiempo promedio
              </Typography>
              <Typography variant="bodyM" color="primary" weight="medium">
                {Math.round(metrics.weekly.averageTimePerApplication)}min
              </Typography>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space16,
    backgroundColor: colors.background.app,
  },

  header: {
    marginBottom: spacing.space24,
  },

  welcomeSection: {
    marginBottom: spacing.space8,
  },



  sectionTitle: {
    marginBottom: spacing.space16,
  },

  metricsContainer: {
    marginBottom: spacing.space32,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.space12,
  },

  metricCardContainer: {
    width: '48%',
    marginBottom: spacing.space16,
  },

  actionsContainer: {
    marginBottom: spacing.space32,
  },

  primaryAction: {
    marginBottom: spacing.space16,
  },

  secondaryAction: {
    marginBottom: spacing.space16,
  },

  summaryContainer: {
    marginBottom: spacing.space32,
  },

  summaryCard: {
    backgroundColor: colors.background.primary,
    padding: spacing.space20,
    borderRadius: spacing.borderRadius.xl,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.space8,
  },
});

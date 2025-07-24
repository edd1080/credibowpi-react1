import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Typography, Button } from '../components/atoms';
import { MetricCard, SyncStatusIndicator } from '../components/molecules';
import { AppShell } from '../components/organisms';
import { useAuthStore } from '../stores/authStore';
import { useAppStore, useApplications, useIsOnline, useIsSyncing, usePendingSyncCount } from '../stores/appStore';
import { MetricsService, DashboardMetrics, SyncService } from '../services';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const applications = useApplications();
  const isOnline = useIsOnline();
  const isSyncing = useIsSyncing();
  const pendingSyncCount = usePendingSyncCount();
  const { setLastSyncTime, setPendingSyncCount } = useAppStore();

  const [metrics, setMetrics] = useState<DashboardMetrics>(MetricsService.generateMockMetrics());
  const [refreshing, setRefreshing] = useState(false);

  // Calculate metrics when applications change
  useEffect(() => {
    const calculatedMetrics = applications.length > 0 
      ? MetricsService.calculateMetrics(applications)
      : MetricsService.generateMockMetrics();
    
    setMetrics(calculatedMetrics);
  }, [applications]);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const syncStatus = await SyncService.getSyncStatus();
        setPendingSyncCount(syncStatus.pendingCount);
        if (syncStatus.lastSyncTime) {
          setLastSyncTime(syncStatus.lastSyncTime);
        }
      } catch (error) {
        console.error('Failed to update sync status:', error);
      }
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [setPendingSyncCount, setLastSyncTime]);

  const handleSync = async () => {
    try {
      await SyncService.manualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh metrics and sync status
      const calculatedMetrics = applications.length > 0 
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
  const kpiSummary = MetricsService.getKPISummary(metrics);

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
        {/* Header with welcome message and KPI summary */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Typography variant="h2" color="primary" weight="bold">
              Bienvenido, {user?.name || 'Agente'}
            </Typography>
            <Typography variant="bodyM" color="secondary">
              {user?.email}
            </Typography>
          </View>
          
          <View style={styles.kpiSummary}>
            <Typography variant="bodyS" color="tertiary">
              {kpiSummary.totalToday} solicitudes hoy • {kpiSummary.completionRate} completadas esta semana
            </Typography>
          </View>
        </View>

        {/* Sync Status Section */}
        <View style={styles.syncSection}>
          <SyncStatusIndicator
            status={isSyncing ? 'syncing' : metrics.sync.failedCount > 0 ? 'error' : 'idle'}
            pendingCount={pendingSyncCount}
            lastSyncTime={metrics.sync.lastSyncTime}
            onPress={isOnline && !isSyncing ? handleSync : undefined}
          />
        </View>

        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
          <Typography variant="h3" color="primary" weight="medium" style={styles.sectionTitle}>
            Métricas del Día
          </Typography>
          
          <View style={styles.metricsGrid}>
            {metricCards.map((card) => (
              <View key={card.id} style={styles.metricCardContainer}>
                <MetricCard
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  color={card.color}
                  icon={card.icon}
                  onPress={card.id === 'pending-sync' ? handleSync : undefined}
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
            size="large"
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
          <Typography variant="h3" color="primary" weight="medium" style={styles.sectionTitle}>
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
  },
  
  header: {
    marginBottom: spacing.space24,
  },
  
  welcomeSection: {
    marginBottom: spacing.space8,
  },
  
  kpiSummary: {
    paddingTop: spacing.space8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  
  syncSection: {
    marginBottom: spacing.space24,
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
  },
  
  metricCardContainer: {
    width: '48%',
    marginBottom: spacing.space12,
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
    backgroundColor: colors.background.secondary,
    padding: spacing.space16,
    borderRadius: spacing.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.blue,
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.space8,
  },
});
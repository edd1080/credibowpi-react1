import { CreditApplication } from '../types/database';

export interface DashboardMetrics {
  today: {
    newApplications: number;
    inProgress: number;
    completed: number;
    submitted: number;
  };
  sync: {
    pendingCount: number;
    failedCount: number;
    lastSyncTime: Date | null;
  };
  weekly: {
    totalApplications: number;
    completionRate: number;
    averageTimePerApplication: number; // in minutes
  };
}

export interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  color: 'primary' | 'success' | 'warning' | 'error';
  icon?: string;
}

export class MetricsService {
  /**
   * Calculate dashboard metrics from applications array
   */
  static calculateMetrics(applications: CreditApplication[]): DashboardMetrics {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter applications for today
    const todayApplications = applications.filter(app => 
      new Date(app.createdAt) >= todayStart
    );

    // Filter applications for this week
    const weekApplications = applications.filter(app => 
      new Date(app.createdAt) >= weekStart
    );

    // Calculate today's metrics
    const todayMetrics = {
      newApplications: todayApplications.filter(app => 
        app.status === 'draft' || app.status === 'kyc_pending'
      ).length,
      inProgress: todayApplications.filter(app => 
        app.status === 'form_in_progress'
      ).length,
      completed: todayApplications.filter(app => 
        app.status === 'ready_for_review'
      ).length,
      submitted: todayApplications.filter(app => 
        app.status === 'submitted' || app.status === 'approved'
      ).length,
    };

    // Calculate sync metrics
    const syncMetrics = {
      pendingCount: applications.filter(app => 
        app.syncStatus === 'sync_pending' || app.syncStatus === 'local_only'
      ).length,
      failedCount: applications.filter(app => 
        app.syncStatus === 'sync_failed'
      ).length,
      lastSyncTime: this.getLastSyncTime(applications),
    };

    // Calculate weekly metrics
    const completedWeekApplications = weekApplications.filter(app => 
      app.status === 'submitted' || app.status === 'approved'
    );
    
    const completionRate = weekApplications.length > 0 
      ? (completedWeekApplications.length / weekApplications.length) * 100 
      : 0;

    const averageTimePerApplication = this.calculateAverageCompletionTime(completedWeekApplications);

    return {
      today: todayMetrics,
      sync: syncMetrics,
      weekly: {
        totalApplications: weekApplications.length,
        completionRate,
        averageTimePerApplication,
      },
    };
  }

  /**
   * Convert metrics to display cards
   */
  static getMetricCards(metrics: DashboardMetrics): MetricCard[] {
    return [
      {
        id: 'new-applications',
        title: 'Nuevas Hoy',
        value: metrics.today.newApplications,
        subtitle: 'Solicitudes iniciadas',
        color: 'primary',
        icon: '📝',
      },
      {
        id: 'in-progress',
        title: 'En Progreso',
        value: metrics.today.inProgress,
        subtitle: 'Formularios activos',
        color: 'warning',
        icon: '⏳',
      },
      {
        id: 'completed',
        title: 'Completadas',
        value: metrics.today.completed,
        subtitle: 'Listas para revisar',
        color: 'success',
        icon: '✅',
      },
      {
        id: 'pending-sync',
        title: 'Pendientes Sync',
        value: metrics.sync.pendingCount,
        subtitle: metrics.sync.failedCount > 0 
          ? `${metrics.sync.failedCount} con error` 
          : 'Para sincronizar',
        color: metrics.sync.failedCount > 0 ? 'error' : 'primary',
        icon: '🔄',
      },
    ];
  }

  /**
   * Get KPI summary for dashboard header
   */
  static getKPISummary(metrics: DashboardMetrics): {
    totalToday: number;
    completionRate: string;
    syncStatus: 'good' | 'warning' | 'error';
  } {
    const totalToday = metrics.today.newApplications + 
                      metrics.today.inProgress + 
                      metrics.today.completed + 
                      metrics.today.submitted;

    const completionRate = `${Math.round(metrics.weekly.completionRate)}%`;

    let syncStatus: 'good' | 'warning' | 'error' = 'good';
    if (metrics.sync.failedCount > 0) {
      syncStatus = 'error';
    } else if (metrics.sync.pendingCount > 5) {
      syncStatus = 'warning';
    }

    return {
      totalToday,
      completionRate,
      syncStatus,
    };
  }

  /**
   * Format sync status text
   */
  static formatSyncStatus(metrics: DashboardMetrics): string {
    if (metrics.sync.failedCount > 0) {
      return `${metrics.sync.failedCount} errores de sync`;
    }
    
    if (metrics.sync.pendingCount > 0) {
      return `${metrics.sync.pendingCount} pendientes`;
    }

    if (metrics.sync.lastSyncTime) {
      return `Sincronizado ${this.formatRelativeTime(metrics.sync.lastSyncTime)}`;
    }

    return 'Sin sincronizar';
  }

  /**
   * Format relative time (e.g., "hace 5m", "hace 2h")
   */
  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `hace ${diffDays}d`;
    
    return date.toLocaleDateString();
  }

  /**
   * Get the most recent sync time from applications
   */
  private static getLastSyncTime(applications: CreditApplication[]): Date | null {
    const syncedApps = applications.filter(app => app.syncStatus === 'synced');
    if (syncedApps.length === 0) return null;

    // For now, we'll use the most recent updatedAt as a proxy for sync time
    // In a real implementation, this would come from sync metadata
    return syncedApps.reduce((latest, app) => {
      const appDate = new Date(app.updatedAt);
      return appDate > latest ? appDate : latest;
    }, new Date(0));
  }

  /**
   * Calculate average completion time for applications
   */
  private static calculateAverageCompletionTime(applications: CreditApplication[]): number {
    if (applications.length === 0) return 0;

    const completionTimes = applications.map(app => {
      const created = new Date(app.createdAt).getTime();
      const updated = new Date(app.updatedAt).getTime();
      return (updated - created) / (1000 * 60); // Convert to minutes
    });

    return completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
  }

  /**
   * Generate mock data for development/testing
   */
  static generateMockMetrics(): DashboardMetrics {
    return {
      today: {
        newApplications: 3,
        inProgress: 2,
        completed: 1,
        submitted: 4,
      },
      sync: {
        pendingCount: 2,
        failedCount: 0,
        lastSyncTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
      weekly: {
        totalApplications: 18,
        completionRate: 78.5,
        averageTimePerApplication: 45,
      },
    };
  }
}
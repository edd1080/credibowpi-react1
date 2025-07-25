import { useAppStore } from '../stores/appStore';
import { DatabaseService } from './database';
import { SyncStatus, SyncOperation } from '../types/database';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

export class SyncService {
  private static isRunning = false;

  /**
   * Manually trigger synchronization
   */
  static async manualSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    const store = useAppStore.getState();

    try {
      this.isRunning = true;
      store.setSyncStatus(true);
      store.addNotification({
        type: 'info',
        title: 'Sincronización',
        message: 'Iniciando sincronización manual...',
        isPersistent: false,
        isRead: false,
      });

      // Get pending sync operations
      const pendingOperations = await this.getPendingSyncOperations();

      if (pendingOperations.length === 0) {
        store.addNotification({
          type: 'success',
          title: 'Sincronización',
          message: 'No hay elementos pendientes para sincronizar',
          isPersistent: false,
          isRead: false,
        });

        return {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          errors: [],
        };
      }

      // Process sync operations
      const result = await this.processSyncOperations(pendingOperations);

      // Update sync status
      store.setLastSyncTime(new Date());
      store.setPendingSyncCount(result.failedCount);

      // Show result notification
      if (result.success) {
        store.addNotification({
          type: 'success',
          title: 'Sincronización Exitosa',
          message: `${result.syncedCount} elementos sincronizados`,
          isPersistent: false,
          isRead: false,
        });
      } else {
        store.addNotification({
          type: 'error',
          title: 'Error de Sincronización',
          message: `${result.failedCount} elementos fallaron`,
          isPersistent: true,
          isRead: false,
          action: {
            label: 'Reintentar',
            onPress: () => this.manualSync(),
          },
        });
      }

      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);

      store.addNotification({
        type: 'error',
        title: 'Error de Sincronización',
        message: 'No se pudo completar la sincronización',
        isPersistent: true,
        isRead: false,
        action: {
          label: 'Reintentar',
          onPress: () => this.manualSync(),
        },
      });

      const pendingOperations = await this.getPendingSyncOperations();

      return {
        success: false,
        syncedCount: 0,
        failedCount: pendingOperations.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      this.isRunning = false;
      store.setSyncStatus(false);
    }
  }

  /**
   * Background sync without notifications (silent)
   */
  static async backgroundSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    const store = useAppStore.getState();

    try {
      this.isRunning = true;
      store.setSyncStatus(true);

      // Get pending sync operations
      const pendingOperations = await this.getPendingSyncOperations();

      if (pendingOperations.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          errors: [],
        };
      }

      // Process sync operations silently
      const result = await this.processSyncOperations(pendingOperations);

      // Update sync status
      if (result.success) {
        store.setLastSyncTime(new Date());
      }
      store.setPendingSyncCount(result.failedCount);

      return result;
    } catch (error) {
      console.error('Background sync failed:', error);

      const pendingOperations = await this.getPendingSyncOperations();

      return {
        success: false,
        syncedCount: 0,
        failedCount: pendingOperations.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    } finally {
      this.isRunning = false;
      store.setSyncStatus(false);
    }
  }

  /**
   * Start automatic sync (every 5 minutes when online)
   */
  static startAutoSync(): void {
    const store = useAppStore.getState();

    if (!store.preferences.autoSync) {
      return;
    }

    const interval = store.preferences.syncInterval * 60 * 1000; // Convert to milliseconds

    setInterval(async () => {
      const currentState = useAppStore.getState();

      // Only sync if online and not already syncing
      if (currentState.isOnline && !currentState.isSyncing) {
        try {
          await this.manualSync();
        } catch (error) {
          console.log('Auto sync failed:', error);
          // Don't show notifications for auto sync failures
        }
      }
    }, interval);
  }

  /**
   * Get pending sync operations from database
   */
  private static async getPendingSyncOperations(): Promise<SyncOperation[]> {
    try {
      // In a real implementation, this would query the sync_queue table
      // For now, we'll simulate with applications that need sync
      const db = await DatabaseService.getInstance();
      const applications = await db.getAllApplications();

      const pendingApps = applications.filter(
        app =>
          app.syncStatus === 'sync_pending' ||
          app.syncStatus === 'local_only' ||
          app.syncStatus === 'sync_failed'
      );

      return pendingApps.map(app => ({
        id: `sync-${app.id}`,
        operationType: 'update',
        entityType: 'application',
        entityId: app.id,
        payload: app,
        retryCount: app.syncStatus === 'sync_failed' ? 1 : 0,
        createdAt: new Date(app.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to get pending sync operations:', error);
      return [];
    }
  }

  /**
   * Process sync operations with retry logic
   */
  private static async processSyncOperations(
    operations: SyncOperation[]
  ): Promise<SyncResult> {
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const operation of operations) {
      try {
        // Simulate API call with random success/failure
        const success = await this.simulateApiSync(operation);

        if (success) {
          syncedCount++;
          await this.updateSyncStatus(operation.entityId, 'synced');
        } else {
          failedCount++;
          await this.updateSyncStatus(operation.entityId, 'sync_failed');
          errors.push(
            `Failed to sync ${operation.entityType} ${operation.entityId}`
          );
        }
      } catch (error) {
        failedCount++;
        await this.updateSyncStatus(operation.entityId, 'sync_failed');
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      errors,
    };
  }

  /**
   * Simulate API sync call (replace with real API integration)
   */
  private static async simulateApiSync(
    _operation: SyncOperation
  ): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    // Simulate 85% success rate
    return Math.random() > 0.15;
  }

  /**
   * Update sync status in database and store
   */
  private static async updateSyncStatus(
    entityId: string,
    syncStatus: SyncStatus
  ): Promise<void> {
    try {
      const db = await DatabaseService.getInstance();
      await db.updateApplicationSyncStatus(entityId, syncStatus);

      // Update store
      const store = useAppStore.getState();
      store.updateApplicationSyncStatus(entityId, syncStatus);
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  /**
   * Get sync status summary
   */
  static async getSyncStatus(): Promise<{
    pendingCount: number;
    failedCount: number;
    lastSyncTime: Date | null;
  }> {
    try {
      const db = await DatabaseService.getInstance();
      const applications = await db.getAllApplications();

      const pendingCount = applications.filter(
        app =>
          app.syncStatus === 'sync_pending' || app.syncStatus === 'local_only'
      ).length;

      const failedCount = applications.filter(
        app => app.syncStatus === 'sync_failed'
      ).length;

      const store = useAppStore.getState();

      return {
        pendingCount,
        failedCount,
        lastSyncTime: store.lastSyncTime,
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        pendingCount: 0,
        failedCount: 0,
        lastSyncTime: null,
      };
    }
  }

  /**
   * Check if sync is currently running
   */
  static isSyncRunning(): boolean {
    return this.isRunning;
  }
}

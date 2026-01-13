import { db, DashboardData } from './db';

/**
 * Synchronization Service for Offline-First Architecture
 * Now handles only local data persistence (no external sync)
 */
export class SyncService {
  private static instance: SyncService;
  private syncInProgress = false;

  // Singleton pattern to ensure only one sync service instance
  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Sync all pending records (now only persists locally)
   */
  public async syncPendingRecords(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Since we're only using local storage now, we just update sync status
      await this.updateLocalSyncStatus();
    } catch (error) {
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Update local sync status for records
   */
  private async updateLocalSyncStatus(): Promise<void> {
    // Get all pending dashboard records from local DB
    const allRecords = await db.table('dashboard').toArray();
    const pendingRecords = allRecords.filter((record: any) =>
      record.sync_status === 'pending' || record.sync_status === null
    );

    if (pendingRecords.length === 0) {
      return;
    }

    for (const record of pendingRecords) {
      try {
        // Since we're only using local storage, mark as synced
        if (record.id !== undefined) {
          await db.updateEntry('CLICK_CAFE_DASHBOARD', record.id, {
            sync_status: 'synced',
            synced_at: new Date().toISOString()
          });
        }
      } catch (error: any) {
        // Update local record to failed status if id exists
        if (record.id !== undefined) {
          await db.updateEntry('CLICK_CAFE_DASHBOARD', record.id, { sync_status: 'failed' });
        }
      }
    }
  }

  private syncDebounceTimer: NodeJS.Timeout | null = null;

  /**
   * Queue a dashboard record for sync (now only persists locally)
   */
  public async queueDashboardRecord(dashboardData: Omit<DashboardData, 'id'>): Promise<number> {
    // Add the record to local DB with synced status (since there's no external sync)
    const id = await db.addDashboardData({
      ...dashboardData,
      sync_status: 'synced', // Mark as synced since we're only storing locally
      synced_at: new Date().toISOString(),
      created_at: dashboardData.created_at || new Date().toISOString(),
      updated_at: dashboardData.updated_at || new Date().toISOString()
    });

    // Debounce sync calls to prevent excessive processing
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // Process after a short delay to batch multiple changes
    this.syncDebounceTimer = setTimeout(async () => {
      try {
        await this.syncPendingRecords();
      } catch (error) {
        // Local sync failed, record remains in local storage
      }
    }, 500); // 500ms delay to batch changes

    return id;
  }

  /**
   * Get sync status statistics
   */
  public async getSyncStatus(): Promise<{
    pending: number;
    synced: number;
    failed: number;
  }> {
    // Since we're only using local storage, all records are effectively "synced"
    // But we'll still track the status for compatibility
    const allRecords = await db.table('dashboard').toArray();

    const pending = allRecords.filter((record: any) => record.sync_status === 'pending').length;
    const synced = allRecords.filter((record: any) => record.sync_status === 'synced').length;
    const failed = allRecords.filter((record: any) => record.sync_status === 'failed').length;

    return { pending, synced, failed };
  }

  /**
   * Retry failed sync records
   */
  public async retryFailedSyncs(): Promise<void> {
    // Since we're only using local storage, retrying means just marking failed records as synced
    const allRecords = await db.table('dashboard').toArray();
    const failedRecords = allRecords.filter((record: any) => record.sync_status === 'failed');

    if (failedRecords.length === 0) {
      return;
    }

    // Reset sync status to synced for failed records (since we're only storing locally)
    for (const record of failedRecords) {
      if (record.id !== undefined) {
        await db.updateEntry('CLICK_CAFE_DASHBOARD', record.id, { sync_status: 'synced', synced_at: new Date().toISOString() });
      }
    }
  }

  /**
   * Force sync all records (now only updates local sync status)
   */
  public async forceSyncAllRecords(): Promise<void> {
    // Get all dashboard records from local DB
    const allRecords = await db.table('dashboard').toArray();

    // Update sync status to synced for all records
    for (const record of allRecords) {
      if (record.id !== undefined) {
        await db.updateEntry('CLICK_CAFE_DASHBOARD', record.id, {
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
    }

    // Trigger sync to update status
    await this.syncPendingRecords();
  }

  /**
   * Check if device is online
   */
  public getOnlineStatus(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Clean up resources
   */
  public async destroy(): Promise<void> {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }
}

// Create singleton instance
export const syncService = SyncService.getInstance();

// Setup online/offline event listeners (though they won't trigger external sync anymore)
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      await syncService.syncPendingRecords();
    } catch (error) {
      // Local sync after coming online failed
    }
  });

  window.addEventListener('offline', () => {
    // Device is now offline, continuing with local storage only
  });
}
import { syncService } from './sync-service';

/**
 * Background Sync Worker
 * Runs periodic checks for connectivity and syncs pending records
 */
export class BackgroundSyncWorker {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 2000; // 2 seconds for fast updates
  private isRunning = false;

  /**
   * Start the background sync worker
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    // Perform initial sync
    this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL_MS);

    this.isRunning = true;
  }

  /**
   * Stop the background sync worker
   */
  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform a sync operation
   */
  private async performSync(): Promise<void> {
    if (!syncService.getOnlineStatus()) {
      return;
    }

    try {
      const status = await syncService.getSyncStatus();

      if (status.pending > 0 || status.failed > 0) {
        await syncService.syncPendingRecords();

        // Also retry any failed records
        if (status.failed > 0) {
          await syncService.retryFailedSyncs();
        }
      }
    } catch (error) {
      // Error during background sync check
    }
  }

  /**
   * Get current sync status
   */
  public async getStatus(): Promise<{
    isRunning: boolean;
    online: boolean;
    syncStatus: {
      pending: number;
      synced: number;
      failed: number;
    };
  }> {
    return {
      isRunning: this.isRunning,
      online: syncService.getOnlineStatus(),
      syncStatus: await syncService.getSyncStatus()
    };
  }
}

// Create singleton instance
export const backgroundSyncWorker = new BackgroundSyncWorker();

// Auto-start the worker when module loads (in browser environments)
if (typeof window !== 'undefined') {
  // Wait a bit before starting to allow other initialization to complete
  setTimeout(() => {
    backgroundSyncWorker.start();
  }, 5000); // Start after 5 seconds to allow app to initialize
}
import { LocalDataStorage } from './local-data-storage';

// Interface for backup configuration
interface BackupConfig {
  email: string;
  enabled: boolean;
  scheduleTime: string; // HH:MM format
}

// Interface for backup data
interface BackupData {
  masterData: any;
  archivedData: any[];
  blockList: string[];
  adminPin: string;
  themeIndex: number;
  generatorLogs: any[];
  teaLogs: any[];
  timestamp: string;
}

// Backup service class
export class BackupService {
  private static instance: BackupService;
  private config: BackupConfig;
  private scheduledBackup: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize with default config
    this.config = {
      email: typeof window !== 'undefined' ? localStorage.getItem('backup_email') || 'muhammad.zahid.imam@gmail.com' : 'muhammad.zahid.imam@gmail.com',
      enabled: true,
      scheduleTime: '00:00' // 12:00 AM
    };

    // Initialize the scheduled backup
    this.scheduleNightlyBackup();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  // Schedule nightly backup at the configured time
  private scheduleNightlyBackup(): void {
    if (!this.config.enabled) return;

    const [hours, minutes] = this.config.scheduleTime.split(':').map(Number);

    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNextRun = nextRun.getTime() - now.getTime();

    // Clear any existing scheduled backup
    if (this.scheduledBackup) {
      clearTimeout(this.scheduledBackup);
    }

    this.scheduledBackup = setTimeout(() => {
      this.performScheduledBackup();
      // Reschedule for the next day
      this.scheduleNightlyBackup();
    }, timeUntilNextRun);
  }

  // Perform the actual backup
  private async performScheduledBackup(): Promise<void> {
    try {
      // Create backup data
      const backupData = await this.createBackupData();
      
      // Send backup via email
      await this.sendBackupViaEmail(backupData);
      
      // Nightly backup completed successfully
    } catch (error) {
      // Queue the backup to retry when internet is available
      await this.queueBackupForRetry();
    }
  }

  // Create backup data from local storage
  private async createBackupData(): Promise<BackupData> {
    // Get all data from local storage
    const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
    let parsedData: any = {};
    
    if (savedData) {
      try {
        parsedData = JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }

    return {
      masterData: parsedData.masterData || {},
      archivedData: parsedData.archivedData || [],
      blockList: parsedData.blockList || [],
      adminPin: parsedData.adminPin || '7860',
      themeIndex: parsedData.themeIndex !== undefined ? parsedData.themeIndex : 8,
      generatorLogs: parsedData.generatorLogs || [],
      teaLogs: parsedData.teaLogs || [],
      timestamp: new Date().toISOString()
    };
  }

  // Send backup via email
  private async sendBackupViaEmail(backupData: BackupData): Promise<void> {
    // In a real implementation, this would use nodemailer or similar
    // For now, we'll use the API route to handle email sending

    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendBackup',
          data: backupData,
          email: this.config.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send backup');
      }

      const result = await response.json();
    } catch (error) {
      console.error('Error sending backup via email:', error);
      throw error;
    }
  }

  // Queue backup for retry when internet is available
  private async queueBackupForRetry(): Promise<void> {
    // In a real implementation, this would store the backup in a queue
    // and retry when connectivity is restored
    console.log('Backup queued for retry when internet is available');
    
    // Check for internet connectivity periodically
    const checkConnection = async () => {
      if (navigator.onLine) {
        // Attempt to send the queued backup
        try {
          const backupData = await this.createBackupData();
          await this.sendBackupViaEmail(backupData);
          // Queued backup sent successfully
        } catch (error) {
          // Re-queue if still fails
          setTimeout(checkConnection, 30000); // Retry in 30 seconds
        }
      } else {
        // Still offline, check again in 30 seconds
        setTimeout(checkConnection, 30000);
      }
    };

    // Start checking for connection
    setTimeout(checkConnection, 30000);
  }

  // Manual backup function — throws on failure so UI can show the real error
  public async manualBackup(): Promise<void> {
    const backupData = await this.createBackupData();
    await this.sendBackupViaEmail(backupData); // let errors propagate to caller
  }

  // Import legacy data from backup file (public method for external use)
  public async importLegacyData(backupData: BackupData): Promise<boolean> {
    return this.importLegacyDataFromObject(backupData);
  }

  // Check for and import legacy backup on startup
  public async checkAndImportLegacyBackup(): Promise<void> {
    try {
      // In a browser environment, we'll check for backup files via fetch
      // This simulates checking for backup.json or old_data.json files in the root directory

      // First check for backup.json
      let foundBackup = false;
      try {
        const response = await fetch('/backup.json');
        if (response.ok) {
          const backupData = await response.json();
          await this.importLegacyDataFromObject(backupData);
          foundBackup = true;
        }
      } catch (fetchError) {
        // backup.json doesn't exist, which is fine
      }

      // If backup.json wasn't found, check for old_data.json
      if (!foundBackup) {
        try {
          const response = await fetch('/old_data.json');
          if (response.ok) {
            const backupData = await response.json();
            await this.importLegacyDataFromObject(backupData);
          }
        } catch (fetchError) {
          // old_data.json doesn't exist either, which is fine
        }
      }
    } catch (error) {
      // Error checking for legacy backup
    }
  }

  // Import legacy data from an object (used internally)
  private async importLegacyDataFromObject(backupData: BackupData): Promise<boolean> {
    try {
      if (!backupData || !backupData.timestamp) {
        console.error('Invalid backup data');
        return false;
      }

      // Get current data
      const currentData = localStorage.getItem('CLICK_CAFE_DB_V1');
      let currentParsed: any = {};

      if (currentData) {
        try {
          currentParsed = JSON.parse(currentData);
        } catch (e) {
          console.error('Error parsing current data:', e);
        }
      }

      // Merge the data intelligently - fast merge (under 2 seconds)
      const startTime = performance.now();

      const mergedData = {
        // Preserve current settings
        adminPin: currentParsed.adminPin || backupData.adminPin || '7860',
        themeIndex: currentParsed.themeIndex !== undefined ? currentParsed.themeIndex : backupData.themeIndex !== undefined ? backupData.themeIndex : 8,

        // Merge data - prefer newer data but add older records if not present
        masterData: { ...backupData.masterData, ...currentParsed.masterData },
        archivedData: [...(backupData.archivedData || []), ...(currentParsed.archivedData || [])],
        blockList: [...new Set([...(backupData.blockList || []), ...(currentParsed.blockList || [])])],
        generatorLogs: [...(backupData.generatorLogs || []), ...(currentParsed.generatorLogs || [])],
        teaLogs: [...(backupData.teaLogs || []), ...(currentParsed.teaLogs || [])],
      };

      // Save merged data
      localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(mergedData));

      const endTime = performance.now();
      console.log(`Legacy data imported successfully in ${(endTime - startTime).toFixed(2)}ms`);

      return true;
    } catch (error) {
      console.error('Error importing legacy data:', error);
      return false;
    }
  }

  // Update email configuration
  public updateConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };

    // Save email to localStorage if provided
    if (config.email && typeof window !== 'undefined') {
      localStorage.setItem('backup_email', config.email);
    }

    // Reschedule backup if timing changed
    if (config.scheduleTime) {
      this.scheduleNightlyBackup();
    }
  }

  // Get current configuration
  public getConfig(): BackupConfig {
    return { ...this.config };
  }
}

// Create singleton instance
export const backupService = BackupService.getInstance();

// Initialize the service when the module loads (in browser environments)
if (typeof window !== 'undefined') {
  // Check for legacy backup on startup
  setTimeout(() => {
    backupService.checkAndImportLegacyBackup();
  }, 1000); // Small delay to ensure app is initialized
}
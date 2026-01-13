// Utility functions for backup operations
import { LocalDataStorage } from './local-data-storage';

// Interface for backup data
export interface BackupData {
  masterData: any;
  archivedData: any[];
  blockList: string[];
  adminPin: string;
  themeIndex: number;
  generatorLogs: any[];
  teaLogs: any[];
  timestamp: string;
}

// Create a backup of the current data
export async function createBackup(): Promise<BackupData> {
  // Get all data from local storage
  const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
  let parsedData: any = {};
  
  if (savedData) {
    try {
      parsedData = JSON.parse(savedData);
    } catch (e) {
      // Error parsing saved data
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

// Restore data from a backup
export async function restoreFromBackup(backupData: BackupData): Promise<boolean> {
  try {
    // Get current data to preserve settings
    const currentData = localStorage.getItem('CLICK_CAFE_DB_V1');
    let currentParsed: any = {};
    
    if (currentData) {
      try {
        currentParsed = JSON.parse(currentData);
      } catch (e) {
        console.error('Error parsing current data:', e);
      }
    }

    // Merge the data intelligently - preserve current settings but merge data
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
    
    return true;
  } catch (error) {
    return false;
  }
}

// Check for legacy backup file and import if exists
export async function checkAndImportLegacyBackup(): Promise<boolean> {
  try {
    // In a browser environment, we'll check for a specific localStorage item
    // that would represent a legacy backup being loaded
    const legacyBackup = localStorage.getItem('LEGACY_BACKUP_FILE');
    
    if (legacyBackup) {
      try {
        const backupData: BackupData = JSON.parse(legacyBackup);
        const success = await restoreFromBackup(backupData);
        
        if (success) {
          // Remove the legacy backup after successful import
          localStorage.removeItem('LEGACY_BACKUP_FILE');
          console.log('Legacy backup imported successfully');
          return true;
        }
      } catch (e) {
        console.error('Error parsing legacy backup:', e);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for legacy backup:', error);
    return false;
  }
}

// Export data as JSON file for manual backup
export function exportDataAsFile(filename: string = `click_backup_${new Date().toISOString().split('T')[0]}.json`): void {
  const data = localStorage.getItem('CLICK_CAFE_DB_V1');
  
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Import data from a JSON file
export function importDataFromFile(file: File, callback: (success: boolean) => void): void {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string;
      const backupData: BackupData = JSON.parse(content);
      
      const success = await restoreFromBackup(backupData);
      callback(success);
    } catch (error) {
      console.error('Error importing data from file:', error);
      callback(false);
    }
  };
  
  reader.onerror = () => {
    console.error('Error reading file');
    callback(false);
  };
  
  reader.readAsText(file);
}
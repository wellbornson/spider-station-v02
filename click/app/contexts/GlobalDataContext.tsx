'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncService } from '../../lib/sync-service';

interface GlobalDataContextType {
  masterData: { [key: string]: any };
  setMasterData: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>;
  refreshData: () => Promise<void>;
  isSyncing: boolean;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const [masterData, setMasterData] = useState<{ [key: string]: any }>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load initial data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.masterData) {
          setMasterData(parsed.masterData);
        }
      } catch (e) {
        // Error parsing saved data
      }
    }
  }, []);

  // Function to refresh data from backend
  const refreshData = async () => {
    setIsSyncing(true);
    try {
      // Since we're using local storage only, just reload from localStorage
      const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.masterData) {
            setMasterData(parsed.masterData);
          }
        } catch (e) {
          // Error parsing saved data during refresh
        }
      }
    } catch (error) {
      // Error refreshing data
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen for storage events to sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'CLICK_CAFE_DB_V1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.masterData) {
            setMasterData(parsed.masterData);
          }
        } catch (error) {
          // Error parsing storage change
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <GlobalDataContext.Provider value={{ masterData, setMasterData, refreshData, isSyncing }}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}
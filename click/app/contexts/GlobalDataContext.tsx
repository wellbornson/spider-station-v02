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
    // One-time wipe: strip blank auto-filled rows from all saved days (migration v2)
    if (!localStorage.getItem('CLICK_CAFE_WIPED_V2')) {
      const raw = localStorage.getItem('CLICK_CAFE_DB_V1');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.masterData) {
            Object.keys(parsed.masterData).forEach(key => {
              const day = parsed.masterData[key];
              if (Array.isArray(day.users)) {
                day.users = day.users.filter((u: any) =>
                  u.name?.trim() || u.timeIn?.trim() || u.timeOut?.trim() || String(u.amount ?? '').trim()
                );
              }
              if (Array.isArray(day.workers)) {
                day.workers = day.workers.filter((w: any) =>
                  w.name && w.name !== 'New Worker' && (w.salary || w.advance || w.bonus)
                );
              }
            });
          }
          localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(parsed));
        } catch (_) { /* ignore */ }
      }
      localStorage.setItem('CLICK_CAFE_WIPED_V2', '1');
    }

    // ── Migration v3: strict ghost-row purge ─────────────────────────────
    // V2 kept rows where amount===0 (number) because String(0)==='0' is truthy.
    // V3 uses the same stricter rule as the runtime filter in getCurrentData:
    // a row must have a real name, a real cabin number, OR a real non-zero amount.
    if (!localStorage.getItem('CLICK_CAFE_WIPED_V3')) {
      const raw = localStorage.getItem('CLICK_CAFE_DB_V1');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.masterData) {
            Object.keys(parsed.masterData).forEach(key => {
              const day = parsed.masterData[key];
              if (Array.isArray(day.users)) {
                day.users = day.users.filter((u: any) => {
                  const hasName   = u.name        && String(u.name).trim()        !== '';
                  const hasCabin  = u.cabinNumber && String(u.cabinNumber).trim() !== '';
                  const hasAmount = u.amount      && String(u.amount).trim()      !== '' && String(u.amount).trim() !== '0';
                  return hasName || hasCabin || hasAmount;
                });
              }
            });
          }
          localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(parsed));
        } catch (_) { /* ignore */ }
      }
      localStorage.setItem('CLICK_CAFE_WIPED_V3', '1');
    }

    // ── Migration v4: NUCLEAR PURGE — name-only filter ───────────────────
    // V3 kept rows with a cabin number or amount but no name.
    // V4 enforces the strictest rule: a row MUST have a non-empty name.
    // This matches the save-time sanitizer in page.tsx so the two are in sync.
    if (!localStorage.getItem('CLICK_CAFE_WIPED_V4')) {
      const raw = localStorage.getItem('CLICK_CAFE_DB_V1');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.masterData) {
            Object.keys(parsed.masterData).forEach(key => {
              const day = parsed.masterData[key];
              if (Array.isArray(day.users)) {
                day.users = day.users.filter(
                  (u: any) => u.name && String(u.name).trim() !== ''
                );
              }
            });
          }
          // Also purge archived data of nameless rows
          if (Array.isArray(parsed.archivedData)) {
            parsed.archivedData = parsed.archivedData.map((archive: any) => ({
              ...archive,
              users: Array.isArray(archive.users)
                ? archive.users.filter((u: any) => u.name && String(u.name).trim() !== '')
                : [],
            })).filter((archive: any) => archive.users.length > 0);
          }
          localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(parsed));
        } catch (_) { /* ignore */ }
      }
      localStorage.setItem('CLICK_CAFE_WIPED_V4', '1');
    }
    // ─────────────────────────────────────────────────────────────────────

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
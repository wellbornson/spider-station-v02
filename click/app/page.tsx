"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { syncService } from '../lib/sync-service';
import { backgroundSyncWorker } from '../lib/background-sync-worker';
import { useGlobalData } from './contexts/GlobalDataContext';
import ThreeDAnalytics from '../components/ThreeDAnalytics';
import { backupService } from '../lib/backup-service';
import SettingsModal from './components/SettingsModal';
import { appendMunshiRecord, searchHistory, MunshiSearchResult } from '../lib/munshi-search';
import { Wand2 } from 'lucide-react';

// --- CSS FOR ANIMATIONS ---
const styles = `
  @keyframes bounce-horizontal {
    0% { left: 100%; transform: translateX(-100%) translateZ(0); }
    50% { left: 0%; transform: translateX(0%) translateZ(0); }
    100% { left: 100%; transform: translateX(-100%) translateZ(0); }
  }
  .animate-bounce-text {
    position: absolute;
    animation: bounce-horizontal 15s infinite ease-in-out;
    white-space: nowrap;
    will-change: transform, left;
  }
  @keyframes munshi-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.5); transform: scale(1) translateZ(0); }
    50% { box-shadow: 0 0 22px rgba(251,191,36,0.9), 0 0 38px rgba(251,100,36,0.5); transform: scale(1.1) translateZ(0); }
  }
  .animate-munshi-pulse {
    animation: munshi-pulse 0.8s ease-in-out infinite;
  }
  @keyframes spin-ring {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .animate-spin-ring {
    animation: spin-ring 3s linear infinite;
    will-change: transform;
  }
  @keyframes jadugar-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(0,255,255,0.5), 0 0 24px rgba(139,0,255,0.3); }
    50%       { box-shadow: 0 0 22px rgba(0,255,255,0.9), 0 0 44px rgba(139,0,255,0.6); }
  }
  .animate-jadugar-glow {
    animation: jadugar-glow 2.5s ease-in-out infinite;
  }
  @keyframes pulse-slow {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.3); transform: scale(1) translateZ(0); }
    50% { box-shadow: 0 0 15px rgba(100, 200, 255, 0.6), 0 0 25px rgba(100, 150, 255, 0.4); transform: scale(1.05) translateZ(0); }
  }
  .animate-pulse-slow {
    animation: pulse-slow 4s ease-in-out infinite;
    will-change: transform, box-shadow;
  }
  @keyframes gradient-move {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient-bg {
    background-size: 400% 400%;
    animation: gradient-move 15s ease infinite;
    will-change: background-position;
  }
  @keyframes police-flash {
    0% { background-color: rgba(220, 38, 38, 0.9); }
    50% { background-color: rgba(30, 58, 138, 0.9); }
    100% { background-color: rgba(220, 38, 38, 0.9); }
  }
  .police-alert { animation: police-flash 0.5s infinite; will-change: background-color; }
  @keyframes warning-blink {
    0%, 100% { background-color: rgba(255, 107, 0, 0.1); border-color: rgba(255, 107, 0, 0.3); box-shadow: 0 0 5px rgba(255, 107, 0, 0.3); }
    50% { background-color: rgba(255, 107, 0, 0.4); border-color: rgba(255, 107, 0, 1); box-shadow: 0 0 20px rgba(255, 107, 0, 0.8), 0 0 30px rgba(255, 107, 0, 0.6); }
  }
  .animate-warning { animation: warning-blink 1s infinite; will-change: box-shadow, background-color; }
  @keyframes neon-orange-pulse {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 107, 0, 0.5), 0 0 10px rgba(255, 107, 0, 0.3); }
    50% { box-shadow: 0 0 20px rgba(255, 107, 0, 0.8), 0 0 30px rgba(255, 107, 0, 0.9), 0 0 40px rgba(255, 107, 0, 0.6); }
  }
  .animate-neon-warning { animation: neon-orange-pulse 1.5s ease-in-out infinite alternate; will-change: box-shadow; }
  @keyframes alertPulse {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 107, 0, 0.5), 0 0 10px rgba(255, 107, 0, 0.3); }
    50% { box-shadow: 0 0 20px rgba(255, 107, 0, 0.8), 0 0 30px rgba(255, 107, 0, 0.9), 0 0 40px rgba(255, 107, 0, 0.6); }
  }
  .animate-alert-pulse { animation: alertPulse 1.5s ease-in-out infinite alternate; will-change: box-shadow; }
  @keyframes neon-blink {
    0% { box-shadow: 0 0 5px #ff9900; }
    50% { box-shadow: 0 0 20px #ff0000; }
    100% { box-shadow: 0 0 5px #ff9900; }
  }
  .neon-blink { animation: neon-blink 1.5s ease-in-out infinite alternate; will-change: box-shadow; }
  .bar-grow { animation: grow-up 1s ease-out forwards; }
  @keyframes grow-up { from { height: 0; opacity: 0; } to { opacity: 1; } }
  .perspective-container { perspective: 1000px; }
  .glass-panel { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .writing-vertical { writing-mode: vertical-rl; }
  .custom-scrollbar-no-display::-webkit-scrollbar { display: none; }
  .custom-scrollbar-no-display { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 12px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #FF8C00; border-radius: 10px; border: 3px solid #1a1a1a; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e67e22; }
  .name-input-wrapper { position: relative; display: inline-block; width: 100%; }
  .amount-cell-wrapper { position: relative; display: inline-block; width: 100%; overflow: hidden; }
  @keyframes pulse {
    0%, 100% { transform: scale(1) translateZ(0); }
    50% { transform: scale(1.1) translateZ(0); }
  }
  .rotation-icon { font-size: 60px; margin-bottom: 20px; animation: pulse 1.5s infinite; will-change: transform; }
  /* Position suggestions directly under the name input */
  .name-suggestions-dropdown { position: absolute; top: 100%; left: 0; width: 100%; z-index: 50; margin-top: 2px; }
  /* Mobile Landscape Detection */
  .rotation-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #000; display: flex; flex-direction: column;
    justify-content: center; align-items: center; z-index: 9999; text-align: center; padding: 20px;
  }
  .rotation-message { color: white; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; }
  /* Mobile-specific styles */
  @media (max-width: 768px) {
    .mobile-landscape { transform: rotate(0deg); min-height: 100vh; min-width: 100vw; }
    .mobile-landscape.landscape-mode { transform: rotate(0deg); }
    .mobile-landscape.portrait-mode { transform: rotate(0deg); }
  }
  .mobile-scaler { width: 100%; transform-origin: top left; }
  @media (max-width: 1024px) and (orientation: landscape) {
    .mobile-landscape-scaler { transform: scale(0.85); transform-origin: top left; width: 117.65%; height: 117.65%; }
  }
  @media (max-width: 768px) and (orientation: landscape) {
    .mobile-landscape-scaler { transform: scale(0.75); transform-origin: top left; width: 133.33%; height: 133.33%; }
  }
  @media (max-width: 600px) and (orientation: landscape) {
    .mobile-landscape-scaler { transform: scale(0.65); transform-origin: top left; width: 153.85%; height: 153.85%; }
  }
  input:focus { font-size: 16px !important; }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .shimmer {
    background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%);
    background-size: 1000px 100%;
    animation: shimmer 4s infinite linear;
    will-change: background-position;
    pointer-events: none;
  }
`;

// --- THEME DEFINITIONS ---
const THEMES = [
  { id: 0, name: 'Cyberverse', appBg: 'bg-gradient-to-br from-slate-900 via-blue-900 to-black', panelBg: 'bg-slate-900/90', border: 'border-cyan-500/50', textMain: 'text-white', textAccent: 'text-cyan-400', textHighlight: 'text-emerald-400', button: 'bg-cyan-600 hover:bg-cyan-500', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]' },
  { id: 1, name: 'Monochrome Master', appBg: 'bg-black', panelBg: 'bg-neutral-900', border: 'border-white/40', textMain: 'text-white', textAccent: 'text-gray-300', textHighlight: 'text-white font-black underline decoration-2', button: 'bg-white text-black hover:bg-gray-200', glow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.5)]' },
  { id: 2, name: 'Golden Empire', appBg: 'bg-gradient-to-br from-yellow-950 via-black to-yellow-900', panelBg: 'bg-black/90', border: 'border-yellow-500/60', textMain: 'text-yellow-50', textAccent: 'text-yellow-400', textHighlight: 'text-amber-300', button: 'bg-yellow-600 hover:bg-yellow-500 text-black', glow: 'shadow-[0_0_25px_rgba(234,179,8,0.4)]' },
  { id: 3, name: 'Retro Wave', appBg: 'bg-gradient-to-br from-purple-900 via-black to-pink-900', panelBg: 'bg-black/80', border: 'border-pink-500/60', textMain: 'text-white', textAccent: 'text-cyan-400', textHighlight: 'text-pink-400', button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500', glow: 'shadow-[0_0_25px_rgba(236,72,153,0.5)]' },
  { id: 4, name: 'Crimson Warlord', appBg: 'bg-gradient-to-br from-red-950 via-black to-orange-950', panelBg: 'bg-black/80', border: 'border-red-600/60', textMain: 'text-red-50', textAccent: 'text-red-500', textHighlight: 'text-orange-400', button: 'bg-red-700 hover:bg-red-600', glow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)]' },
  { id: 5, name: 'Neon Jungle', appBg: 'bg-gradient-to-br from-green-950 via-black to-emerald-900', panelBg: 'bg-black/90', border: 'border-green-500/50', textMain: 'text-green-50', textAccent: 'text-green-400', textHighlight: 'text-lime-400', button: 'bg-green-700 hover:bg-green-600', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.3)]' },
  { id: 6, name: 'Royal Amethyst', appBg: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-black', panelBg: 'bg-indigo-950/80', border: 'border-purple-400/50', textMain: 'text-purple-50', textAccent: 'text-fuchsia-400', textHighlight: 'text-yellow-400', button: 'bg-purple-600 hover:bg-purple-500', glow: 'shadow-[0_0_20px_rgba(192,38,211,0.4)]' },
  { id: 7, name: 'Deep Ocean', appBg: 'bg-gradient-to-br from-blue-950 via-cyan-900 to-black', panelBg: 'bg-sky-950/80', border: 'border-sky-400/50', textMain: 'text-sky-50', textAccent: 'text-sky-400', textHighlight: 'text-white', button: 'bg-sky-600 hover:bg-sky-500', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.4)]' },
  { id: 8, name: 'Crystal Glass Edition', appBg: 'bg-gradient-to-br from-indigo-900 via-purple-800 to-white/10', panelBg: 'bg-white/10 backdrop-blur-20 border border-white/20', border: 'border-white/30', textMain: 'text-white', textAccent: 'text-indigo-200', textHighlight: 'text-white font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]', button: 'bg-white/20 hover:bg-white/30 text-white border border-white/30', glow: 'shadow-[0_0_20px_rgba(224,224,224,0.4)]' }
];

type ViewState = 'users' | 'workers' | 'expenses' | 'financials' | 'analytics';
type ModalType = 'generator' | 'tea' | null;
type StatPeriod = 'daily' | 'monthly' | 'yearly';
type ChatMessage = { sender: 'user' | 'ai'; text: string; isSecure?: boolean };
type AuthAction = { type: 'ACCESS_HQ' } | { type: 'UNLOCK_ROW', id: number } | { type: 'RATE_WORKER', workerId: number, rating: number } | { type: 'DELETE_WORKER', id: number } | { type: 'DELETE_EXPENSE', id: number };
type AiContextType = { status: 'IDLE' | 'WAITING_FOR_TYPE' | 'WAITING_FOR_DATE' | 'WAITING_FOR_TOP_PERIOD' | 'WAITING_FOR_FINANCIAL_PERIOD'; targetName: string; intent: 'DETAIL' | 'TOP_USER' | 'TOP_3' | 'FINANCIAL_REPORT' | 'PROFIT_LOSS'; };

export default function ClickDashboard() {
  const [currentView, setCurrentView] = useState<ViewState>('users');
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [themeIndex, setThemeIndex] = useState(8); // Set Crystal Glass Edition as default
  const t = THEMES[themeIndex];
  const [adminPin, setAdminPin] = useState("7860");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<AuthAction>({ type: 'ACCESS_HQ' });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassInput, setNewPassInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ sender: 'ai', text: 'Assalam-o-Alaikum Boss! ❤️\nMain CLICK Cafe ka AI Munshi hun.' }]);
  const [awaitingAiAuth, setAwaitingAiAuth] = useState(false);
  const [aiContext, setAiContext] = useState<AiContextType>({ status: 'IDLE', targetName: '', intent: 'DETAIL' });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Smart Munshi Search ──
  const [showMunshi, setShowMunshi] = useState(false);
  const [munshiQuery, setMunshiQuery] = useState('');
  const [munshiResult, setMunshiResult] = useState<MunshiSearchResult | null>(null);
  const [munshiSearching, setMunshiSearching] = useState(false);
  const munshiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blockList, setBlockList] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState("");
  const [policeAlert, setPoliceAlert] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [statPeriod, setStatPeriod] = useState<StatPeriod>('daily');
  const [now, setNow] = useState(new Date());
  const [graphDate, setGraphDate] = useState(new Date().toISOString().split('T')[0]);
  const { masterData, setMasterData } = useGlobalData();
  const [generatorLogs, setGeneratorLogs] = useState([{ id: 1, date: '2026-01-01', desc: 'Petrol 2 Liters', amount: 600 }]);
  const [teaLogs, setTeaLogs] = useState([{ id: 1, date: '2026-01-01', desc: 'Sugar & Milk', amount: 150 }]);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showRotationOverlay, setShowRotationOverlay] = useState(false);

  // Shimmer is always-on via CSS animation for Crystal Glass theme (no state needed)

  // --- ARCHIVE LOGIC: Store previous day's data when date changes ---
  const [archivedData, setArchivedData] = useState<any[]>([]);

  // Ref so the archive effect always reads latest masterData without depending on it
  const masterDataRef = useRef<{ [key: string]: any }>({});
  useEffect(() => { masterDataRef.current = masterData; }, [masterData]);

  // Stable archive function — wrapped in useCallback so its reference never changes,
  // preventing it from re-triggering the effect on every render.
  const archiveCurrentDayData = useCallback((currentDayData: any, dateKey: string) => {
    if (!currentDayData?.users?.length) return;
    const frozenUsers = currentDayData.users.filter((user: any) =>
      user.timeOut && user.timeOut.trim() !== '' && user.amount && user.amount !== ''
    );
    if (frozenUsers.length === 0) return;
    setArchivedData(prev => {
      // ── Dedup guard: never add a second archive entry for the same date ──
      if (prev.some((a: any) => a.date === dateKey)) return prev;
      return [...prev, { date: dateKey, users: frozenUsers, timestamp: new Date().toISOString() }];
    });
  }, []); // stable — no deps needed; reads state only via setArchivedData updater form

  // --- TODAY'S NAME SUGGESTION SYSTEM ---
  const [todayNames, setTodayNames] = useState<string[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeInputId, setActiveInputId] = useState<number | null>(null); // Track which input is active

  // Archive data when the date changes.
  // IMPORTANT: masterData is intentionally read via masterDataRef (not listed in deps)
  // to prevent this effect from re-firing every time masterData updates, which caused
  // an infinite loop: setArchivedData → re-render → masterData ref changes → effect fires → repeat.
  useEffect(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const currentKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;

    if (todayKey !== currentKey) {
      const currentDayKey = getStorageKey(currentDate, selectedDay);
      const currentDayData = masterDataRef.current[currentDayKey]; // ref — no dep needed
      if (currentDayData) {
        archiveCurrentDayData(currentDayData, currentDayKey);
      }
      setTodayNames([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, selectedDay]); // masterData excluded intentionally — use ref above

  // Handle clicks outside of name inputs to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Element) {
        // Check if the click is outside of any name input wrapper
        const nameInputWrapper = event.target.closest('.name-input-wrapper');
        if (!nameInputWrapper) {
          setSuggestionsVisible(false);
          setActiveInputId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Orientation detection for mobile devices
  useEffect(() => {
    const checkOrientation = () => {
      // Check if device is mobile/tablet
      const isMobile = window.innerWidth <= 768;

      // Check orientation - if height > width, it's portrait
      const currentIsPortrait = window.innerHeight > window.innerWidth;

      setIsPortrait(currentIsPortrait);

      // Show rotation overlay only on mobile devices in portrait mode
      if (isMobile && currentIsPortrait) {
        setShowRotationOverlay(true);
      } else {
        setShowRotationOverlay(false);
      }
    };

    // Initial check
    checkOrientation();

    // Add event listeners
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Clean up
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // --- AUTO-SAVE STATE VARIABLES ---
  const [lastSavedData, setLastSavedData] = useState<{ [key: string]: any }>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // --- SIDE PANEL STATE VARIABLES ---
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [showCafePanel, setShowCafePanel] = useState(false);
  const [hisabDotActive, setHisabDotActive] = useState(false);
  const [cafeItems, setCafeItems] = useState<{ id: number; name: string; price: number }[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  // --- AUTO-SAVE & LOAD SYSTEM (DATABASE SIMULATION) ---
  useEffect(() => {
    // Load non-masterData fields on startup (masterData is handled by GlobalDataContext)
    const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if(parsed.archivedData) setArchivedData(parsed.archivedData);
            if(parsed.blockList) setBlockList(parsed.blockList);
            if(parsed.adminPin) setAdminPin(parsed.adminPin);
            if(parsed.themeIndex !== undefined) setThemeIndex(parsed.themeIndex);
            if(parsed.generatorLogs) setGeneratorLogs(parsed.generatorLogs);
            if(parsed.teaLogs) setTeaLogs(parsed.teaLogs);
        } catch (e) {
            // Error handled silently to avoid console noise in production
        }
    }
  }, []);

  // ── Ghost-row sanitizer: strip nameless rows before ANY write to localStorage ──
  // A row without a name is never worth persisting — it's either a blank shell
  // the user never filled in, or junk from a previous session.
  const sanitizeMasterData = useCallback((md: { [key: string]: any }) => {
    const clean: { [key: string]: any } = {};
    Object.keys(md).forEach(dateKey => {
      const day = md[dateKey];
      if (!day) return;
      clean[dateKey] = {
        ...day,
        users: Array.isArray(day.users)
          ? day.users.filter((u: any) => u.name && String(u.name).trim() !== '')
          : [],
      };
    });
    return clean;
  }, []);

  useEffect(() => {
    // Stealth debounced auto-save — fires 800ms after last change, no UI blocking
    if (Object.keys(masterData).length === 0 && blockList.length === 0) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      const dataToSave = {
        masterData: sanitizeMasterData(masterData), // ← sanitize before write
        blockList, adminPin, themeIndex, generatorLogs, teaLogs,
      };
      localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(dataToSave));
    }, 800);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [masterData, blockList, adminPin, themeIndex, generatorLogs, teaLogs, sanitizeMasterData]);

  // --- AUTO-SAVE EFFECT WITH CHANGE TRACKING ---
  useEffect(() => {
    // Initialize last saved data when component mounts
    const savedData = localStorage.getItem('CLICK_CAFE_DB_V1');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setLastSavedData({
          masterData: parsed.masterData || {},
          archivedData: parsed.archivedData || [], // Load archived data
          blockList: parsed.blockList || [],
          adminPin: parsed.adminPin || "7860",
          themeIndex: parsed.themeIndex !== undefined ? parsed.themeIndex : 0,
          generatorLogs: parsed.generatorLogs || [],
          teaLogs: parsed.teaLogs || []
        });
      } catch (e) {
        // Error handled silently to avoid console noise in production
      }
    }

    // Set up 1-minute auto-save interval
    const autoSaveInterval = setInterval(() => {
      handleIncrementalSave();
    }, 60000); // 1 minute = 60,000 milliseconds

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [masterData, archivedData, blockList, adminPin, themeIndex, generatorLogs, teaLogs]);

  // Function to handle incremental save
  const handleIncrementalSave = async () => {
    setIsAutoSaving(true);

    // Prepare data to save — sanitize masterData to strip nameless ghost rows
    const currentDataToSave = {
      masterData: sanitizeMasterData(masterData), // ← sanitize before write
      archivedData,
      blockList,
      adminPin,
      themeIndex,
      generatorLogs,
      teaLogs,
    };

    // Compare with last saved data to determine what changed
    const hasChanges =
      JSON.stringify(currentDataToSave.masterData) !== JSON.stringify(lastSavedData.masterData) ||
      JSON.stringify(currentDataToSave.archivedData) !== JSON.stringify(lastSavedData.archivedData) ||
      JSON.stringify(currentDataToSave.blockList) !== JSON.stringify(lastSavedData.blockList) ||
      currentDataToSave.adminPin !== lastSavedData.adminPin ||
      currentDataToSave.themeIndex !== lastSavedData.themeIndex ||
      JSON.stringify(currentDataToSave.generatorLogs) !== JSON.stringify(lastSavedData.generatorLogs) ||
      JSON.stringify(currentDataToSave.teaLogs) !== JSON.stringify(lastSavedData.teaLogs);

    if (hasChanges) {
      // Update last saved data
      setLastSavedData(JSON.parse(JSON.stringify(currentDataToSave)));

      // Save only the changed data locally first (offline-first)
      localStorage.setItem('CLICK_CAFE_DB_V1', JSON.stringify(currentDataToSave));

      // Show save indicator
      setShowSaveIndicator(true);
      setTimeout(() => {
        setShowSaveIndicator(false);
      }, 1000); // Hide after 1 second

      // Sync to cloud if online
      if (navigator.onLine) {
        try {
          // Prepare dashboard data for sync
          const dashboardData = {
            date: new Date().toISOString().split('T')[0],
            data: currentDataToSave,
            sync_status: 'pending' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Queue the data for sync
          await syncService.queueDashboardRecord(dashboardData);
        } catch (error) {
          // Still consider the local save successful even if sync fails
        }
      }
    }

    setIsAutoSaving(false);
  };


  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000 * 10); return () => clearInterval(timer); }, []);

  // 30-second interval to check all rows for 10-minute warning
  useEffect(() => {
    const tenMinuteCheckInterval = setInterval(() => {
      // Force a re-render to update the 10-minute warning status for all rows
      setNow(new Date()); // This will trigger the time-dependent calculations
    }, 30000); // 30 seconds

    return () => clearInterval(tenMinuteCheckInterval);
  }, []);

  // Initialize background sync worker and backup service when component mounts
  useEffect(() => {
    // Start background sync worker after a delay to allow app to initialize
    const initSyncWorker = setTimeout(() => {
      backgroundSyncWorker.start();
    }, 2000);

    // Initialize backup service
    const initBackupService = setTimeout(() => {
      backupService.checkAndImportLegacyBackup();
    }, 1000);

    // Cleanup function to stop the worker when component unmounts
    return () => {
      clearTimeout(initSyncWorker);
      clearTimeout(initBackupService);
      backgroundSyncWorker.stop();
    };
  }, []);

  const getStorageKey = (date: Date, day: number) => `${date.getFullYear()}-${date.getMonth()}-${day}`;
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const formatMonthYear = (date: Date) => date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    // Keep the selected day if it exists in the new month, otherwise use the last day of the month
    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    const newSelectedDay = Math.min(selectedDay, daysInNewMonth);
    setSelectedDay(newSelectedDay);
  };
  
  const getFullDateDisplay = () => { 
    const activeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay); 
    return activeDate.toLocaleString('default', { weekday: 'short', day:'2-digit', month: 'short', year: 'numeric' }).toUpperCase(); 
  };
  
  const cycleTheme = () => { setThemeIndex((prev) => (prev + 1) % THEMES.length); };
  const getOverdueMinutes = (timeOutStr: string) => { if (!timeOutStr) return -9999; const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; if (!timeRegex.test(timeOutStr)) return -9999; const [inHours, inMinutes] = timeOutStr.split(':').map(Number); const currentHours = now.getHours(); const currentMinutes = now.getMinutes(); let adjustedInHours = inHours; if (currentHours >= 12 && inHours < 12) { adjustedInHours = inHours + 12; } return ((currentHours * 60) + currentMinutes) - ((adjustedInHours * 60) + inMinutes); };

  // Function to check if a session has 10 minutes or less remaining before timeout
  const getTimeRemainingMinutes = (timeOutStr: string) => {
    if (!timeOutStr) return 9999; // Return a large positive number if no timeout set
    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeOutStr)) return 9999;

    // Parse the timeout time
    const [outHours, outMinutes] = timeOutStr.split(':').map(Number);

    // Get current time
    const now = new Date();

    // Create a date object for the timeout time (assuming it's today)
    const timeoutDate = new Date(now);
    timeoutDate.setHours(outHours, outMinutes, 0, 0); // Set hours, minutes, seconds, milliseconds

    // If the timeout time is earlier than current time, it means it's for tomorrow
    if (timeoutDate <= now) {
      timeoutDate.setDate(timeoutDate.getDate() + 1); // Add one day
    }

    // Calculate the difference in minutes
    const diffMs = timeoutDate.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000); // Convert ms to minutes and round

    return diffMins;
  };

  const calculateHours = (timeIn: string, timeOut: string) => {
    if (!timeIn || !timeOut) return null;

    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeIn) || !timeRegex.test(timeOut)) return null;

    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);

    let totalInMinutes = inHours * 60 + inMinutes;
    let totalOutMinutes = outHours * 60 + outMinutes;

    if (totalOutMinutes < totalInMinutes) {
      totalOutMinutes += 24 * 60;
    }

    const totalMinutes = totalOutMinutes - totalInMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  };

  const calculateTotalTime = (timeIn: string, timeOut: string): string | null => {
    if (!timeIn || !timeOut) return null;
    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeIn) || !timeRegex.test(timeOut)) return null;
    const [inH, inM] = timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    let inMins = inH * 60 + inM;
    let outMins = outH * 60 + outM;
    if (outMins < inMins) outMins += 1440; // Night shift: add 24 hours
    const diff = outMins - inMins;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getCurrentData = (date = currentDate, day = selectedDay) => {
    const key = getStorageKey(date, day);
    const defaultData = {
        users: [] as any[],  // Empty — rows are added manually only
        workers: [] as any[], // Empty — workers are added manually only
        expenses: [ { id: 1, item: 'Shop Rent (Main)', cost: 0, date: '', isSpecial: false }, { id: 2, item: 'Shop Rent (Shop 2)', cost: 0, date: '', isSpecial: false }, { id: 3, item: 'KE Electric Bill', cost: 0, date: '', isSpecial: false }, { id: 4, item: 'Internet Bill', cost: 0, date: '', isSpecial: false }, { id: 5, item: 'Generator Maintenance', cost: 0, date: '', isSpecial: true, type: 'generator' }, { id: 6, item: 'Tea & Refreshment', cost: 0, date: '', isSpecial: true, type: 'tea' } ],
        notes: Array.from({ length: 150 }, (_, i) => ({ id: i + 1, a: '', b: '' }))
    };

    // Get current day's data — only use saved data, never auto-fill
    let currentDayData = { ...defaultData };
    if (masterData[key]) {
      currentDayData = { ...masterData[key] };
      // ── Ghost-row filter (runtime) ──────────────────────────────────────
      // Named rows are always kept. Draft rows (isDraft:true) are kept only
      // when the user has typed ANY data into them (cabin / time / amount);
      // fully-empty draft entries fall through so the pad regenerates them.
      // Old ghost rows (no name, not a draft) are always stripped.
      // NOTE: sanitizeMasterData (save path) still strips ALL nameless rows
      // from localStorage, so only named rows are ever persisted to disk.
      if (Array.isArray(currentDayData.users)) {
        currentDayData.users = currentDayData.users.filter((u: any) => {
          if (u.name && String(u.name).trim() !== '') return true; // named row
          if (u.isDraft) {
            // keep draft rows that have any partial data entered
            const hasPartial =
              (u.cabinNumber && String(u.cabinNumber).trim() !== '') ||
              (u.timeIn     && String(u.timeIn).trim()     !== '') ||
              (u.timeOut    && String(u.timeOut).trim()    !== '') ||
              (u.amount     && String(u.amount).trim()     !== '' && String(u.amount).trim() !== '0');
            return !!hasPartial;
          }
          return false; // pure ghost row — strip it
        });
      }
      // ────────────────────────────────────────────────────────────────────
    }

    // Merge archived rows for this date at the top
    const archivedForDate = archivedData.filter((archive: any) => archive.date === key);
    let combinedUsers = [...(currentDayData.users || [])];

    archivedForDate.forEach((archive: any) => {
      const archivedUsersWithMetadata = archive.users.map((user: any) => ({
        ...user,
        isArchived: true,
        isLocked: true,
      }));
      combinedUsers = [...archivedUsersWithMetadata, ...combinedUsers];
    });

    // Update the currentDayData with the combined users
    const resultData = {
      ...currentDayData,
      users: combinedUsers.map((user: any, index: number) => ({
        ...user,
        id: user.id || index + 1,
        no: user.no || index + 1
      }))
    };

    const safeExpenses = resultData.expenses || defaultData.expenses;
    resultData.expenses = safeExpenses.map((e: any) => {
      if(e.type === 'generator') return {...e, cost: generatorLogs.reduce((s,i)=>s+i.amount,0)};
      if(e.type === 'tea') return {...e, cost: teaLogs.reduce((s,i)=>s+i.amount,0)};
      return e;
    });

    // ── Pad to 200 draft rows (never saved — stripped by sanitizeMasterData) ──
    const namedCount = resultData.users.length;
    const needed = Math.max(0, 200 - namedCount);
    if (needed > 0) {
      // Build a set of all IDs already in use (named rows may have negative IDs
      // if they were promoted from a draft slot)
      const usedIds = new Set<number>(resultData.users.map((u: any) => u.id as number));
      let nextId = -1;
      const draftRows: any[] = [];
      for (let i = 0; i < needed; i++) {
        while (usedIds.has(nextId)) nextId--;
        usedIds.add(nextId);
        draftRows.push({
          id: nextId,
          no: namedCount + i + 1,
          cabinNumber: '', name: '', timeIn: '', timeOut: '', amount: '',
          isManualAmount: false, isLocked: false, isDraft: true,
        });
        nextId--;
      }
      resultData.users = [...resultData.users, ...draftRows];
    }
    // ─────────────────────────────────────────────────────────────────────────

    return resultData;
  };
  const currentData = getCurrentData();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const updateMasterData = (field: string, newData: any) => { const key = getStorageKey(currentDate, selectedDay); setMasterData(prev => ({ ...prev, [key]: { ...getCurrentData(), [field]: newData } })); };

  // Helper function to update today's names when a name is entered
  const updateTodayNames = (name: string) => {
    if (name.trim() !== '') {
      // Auto-capitalize the name
      const capitalized = name.replace(/\b\w/g, l => l.toUpperCase());

      // Add to today's names if it's not already there
      setTodayNames(prev => {
        if (!prev.includes(capitalized)) {
          return [...prev, capitalized];
        }
        return prev;
      });
    }
  };

  // Function to filter suggestions based on input with performance optimization
  const filterSuggestions = (inputValue: string, inputId: number) => {
    if (inputValue.trim() === '') {
      setFilteredSuggestions([]);
      setSuggestionsVisible(false);
      setActiveInputId(null);
      return;
    }

    // Only show suggestions for the active input
    setActiveInputId(inputId);

    const lowerInput = inputValue.toLowerCase();
    // Use a more efficient filtering algorithm with debouncing
    const suggestions = todayNames
      .filter(name => {
        const lowerName = name.toLowerCase();
        return lowerName.includes(lowerInput) && lowerName !== lowerInput;
      })
      .slice(0, 10); // Limit to 10 suggestions for performance

    setFilteredSuggestions(suggestions);
    setSuggestionsVisible(suggestions.length > 0);
    setCurrentSuggestionIndex(0);
  };

  // Function to select a suggestion
  const selectSuggestion = (suggestion: string, id: number) => {
    // Update the user's name field
    updateUser(id, 'name', suggestion);

    // Move focus to the next field (Time In)
    const nextField = 'timeIn';
    const el = document.getElementById(`${nextField}-${id}`);
    if (el) (el as HTMLInputElement).focus();

    // Hide suggestions
    setSuggestionsVisible(false);
    setActiveInputId(null);
  };

  const handleUniversalKeyDown = (e: React.KeyboardEvent, id: number, field: string, dataList: any[], type: 'users' | 'workers' | 'expenses') => {
    const fieldOrder: {[key: string]: string[]} = { 'users': ['cabinNumber', 'name', 'timeIn', 'timeOut', 'amount'], 'workers': ['name', 'salary', 'advance', 'bonus'], 'expenses': ['item', 'date', 'cost'] };
    const currentFields = fieldOrder[type]; const currentIndex = currentFields.indexOf(field); const rowIdx = dataList.findIndex(item => item.id === id);

    // Handle suggestion navigation if suggestions are visible and we're on the name field for the active input
    if (field === 'name' && suggestionsVisible && activeInputId === id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSuggestionIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSuggestionIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredSuggestions.length > 0 && currentSuggestionIndex >= 0) {
          selectSuggestion(filteredSuggestions[currentSuggestionIndex], id);
          return;
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestionsVisible(false);
        setActiveInputId(null);
        return;
      }
    }

    if (e.key === 'Enter' || e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); if (currentIndex < currentFields.length - 1) { const nextField = currentFields[currentIndex + 1]; const el = document.getElementById(`${nextField}-${id}`); if (el) (el as HTMLInputElement).focus(); } else { if (rowIdx < dataList.length - 1) { const nextId = dataList[rowIdx + 1].id; const nextField = currentFields[0]; const el = document.getElementById(`${nextField}-${nextId}`); if (el) (el as HTMLInputElement).focus(); } } }
    else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) { e.preventDefault(); if (currentIndex > 0) { const prevField = currentFields[currentIndex - 1]; const el = document.getElementById(`${prevField}-${id}`); if (el) (el as HTMLInputElement).focus(); } else { if (rowIdx > 0) { const prevId = dataList[rowIdx - 1].id; const prevField = currentFields[currentFields.length - 1]; const el = document.getElementById(`${prevField}-${prevId}`); if (el) (el as HTMLInputElement).focus(); } } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (rowIdx < dataList.length - 1) { const nextId = dataList[rowIdx + 1].id; const el = document.getElementById(`${field}-${nextId}`); if (el) (el as HTMLInputElement).focus(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (rowIdx > 0) { const prevId = dataList[rowIdx - 1].id; const el = document.getElementById(`${field}-${prevId}`); if (el) (el as HTMLInputElement).focus(); } }
    // Handle backspace: if current field is empty, move to previous field
    else if (e.key === 'Backspace') {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0 && input.value === '') {
        e.preventDefault();
        if (currentIndex > 0) {
          const prevField = currentFields[currentIndex - 1];
          const el = document.getElementById(`${prevField}-${id}`);
          if (el) (el as HTMLInputElement).focus();
        } else {
          if (rowIdx > 0) {
            const prevId = dataList[rowIdx - 1].id;
            const prevField = currentFields[currentFields.length - 1];
            const el = document.getElementById(`${prevField}-${prevId}`);
            if (el) (el as HTMLInputElement).focus();
          }
        }
      }
    }
  };
  const updateUser = (id: any, field: string, value: any) => {
    if (field === 'name' && value.trim() !== '') {
      const isBlocked = blockList.some(badName => value.toLowerCase() === badName.toLowerCase());
      if (isBlocked) { setPoliceAlert(true); return; }

      // Update today's names when a name is entered
      updateTodayNames(value);
    }
    const user = currentData.users.find((u:any) => u.id === id);
    if (user && user.isLocked && field !== 'cabinNumber') return;

    // If updating the amount field, set isManualAmount to true
    const newUsers = currentData.users.map((u: any) => {
      if (u.id === id) {
        const updatedUser = { ...u, [field]: value };
        // If the user is manually entering an amount, set isManualAmount to true
        if (field === 'amount' && value !== '') {
          updatedUser.isManualAmount = true;
        }
        // If the user clears the amount, reset isManualAmount to false
        if (field === 'amount' && value === '') {
          updatedUser.isManualAmount = false;
        }

        return updatedUser;
      }
      return u;
    });
    updateMasterData('users', newUsers);
  };

  // Freeze row as soon as Amount is filled (Enter or blur on amount field)
  const checkAndLockRow = (id: any) => {
    const user = currentData.users.find((u: any) => u.id === id);
    if (!user) return;

    const newUsers = currentData.users.map((u: any) => {
      if (u.id === id) {
        // Freeze when amount is non-empty (regardless of timeOut)
        if (u.amount && u.amount.trim() !== '') {
          // Append to Munshi monthly index on first lock (skip re-locks)
          if (!u.isLocked && u.name && u.name.trim()) {
            const dateKey = getStorageKey(currentDate, selectedDay);
            appendMunshiRecord(u, dateKey);
          }
          return { ...u, isLocked: true };
        }
      }
      return u;
    });

    updateMasterData('users', newUsers);
  };

  const toggleSelect = (id: any) => { const newSelected = new Set(selectedIds); if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id); setSelectedIds(newSelected); };
  const updateWorker = (id: any, field: string, value: any) => { const newWorkers = currentData.workers.map((w: any) => w.id === id ? { ...w, [field]: value === '' ? 0 : Number(value) } : w); updateMasterData('workers', newWorkers); };
  const updateWorkerRating = (id: any, newRating: number) => { const newWorkers = currentData.workers.map((w: any) => w.id === id ? { ...w, rating: newRating } : w); updateMasterData('workers', newWorkers); };
  const updateWorkerName = (id: any, value: string) => { const newWorkers = currentData.workers.map((w: any) => w.id === id ? { ...w, name: value } : w); updateMasterData('workers', newWorkers); };
  const updateExpense = (id: any, field: string, value: any) => { const newExpenses = currentData.expenses.map((e: any) => e.id === id ? { ...e, [field]: value } : e); updateMasterData('expenses', newExpenses); };
  const updateNote = (id: number, field: 'a' | 'b', value: string) => { const currentNotes = currentData.notes || Array.from({ length: 150 }, (_: any, i: number) => ({ id: i + 1, a: '', b: '' })); const newNotes = currentNotes.map((n: any) => n.id === id ? { ...n, [field]: value } : n); updateMasterData('notes', newNotes); };
  const addUserRow = useCallback(() => {
    const existing = currentData.users || [];
    const newNo = existing.length + 1;
    const newRow = { id: Date.now(), no: newNo, cabinNumber: '', name: '', timeIn: '', timeOut: '', amount: '', isManualAmount: false, isLocked: false };
    updateMasterData('users', [...existing, newRow]);
  }, [currentData.users, updateMasterData]);
  const addWorker = () => updateMasterData('workers', [...currentData.workers, { id: Date.now(), name: 'New Worker', salary: 0, advance: 0, bonus: 0, rating: 0 }]);
  const addExpense = () => updateMasterData('expenses', [...currentData.expenses, { id: Date.now(), item: 'New Expense', cost: 0, date: '', isSpecial: false }]);
  const addSubLog = (type: 'generator' | 'tea') => { const newItem = { id: Date.now(), date: new Date().toISOString().split('T')[0], desc: '', amount: 0 }; if (type === 'generator') setGeneratorLogs([...generatorLogs, newItem]); if (type === 'tea') setTeaLogs([...teaLogs, newItem]); };
  const updateSubLog = (type: 'generator' | 'tea', id: number, field: string, value: any) => { const setter = type === 'generator' ? setGeneratorLogs : setTeaLogs; const current = type === 'generator' ? generatorLogs : teaLogs; setter(current.map(item => item.id === id ? { ...item, [field]: field === 'amount' ? Number(value) : value } : item)); };
  const addToBlockList = () => { if(blockInput.trim()) { setBlockList([...blockList, blockInput.trim()]); setBlockInput(""); } };
  const removeFromBlockList = (name: string) => { setBlockList(blockList.filter(b => b !== name)); };
  const initiateRating = (workerId: number, rating: number) => { setAuthAction({ type: 'RATE_WORKER', workerId, rating }); setShowAuthModal(true); };
  const initiateDeleteWorker = (id: number) => { setAuthAction({ type: 'DELETE_WORKER', id }); setShowAuthModal(true); };
  const initiateDeleteExpense = (id: number) => { setAuthAction({ type: 'DELETE_EXPENSE', id }); setShowAuthModal(true); };
  const handleLogin = () => { if (passwordInput === "CLICK2026" || passwordInput === adminPin) { performAuthAction(); } else { setAuthError(true); } };
  const performAuthAction = () => { setShowAuthModal(false); setPasswordInput(''); setAuthError(false); if (authAction.type === 'ACCESS_HQ') { setCurrentView('financials'); } else if (authAction.type === 'UNLOCK_ROW') { const newUsers = currentData.users.map((u: any) => u.id === authAction.id ? { ...u, isLocked: false } : u); updateMasterData('users', newUsers); } else if (authAction.type === 'RATE_WORKER') { const currentWorker = currentData.workers.find((w:any) => w.id === authAction.workerId); const finalRating = (currentWorker && currentWorker.rating === authAction.rating) ? 0 : authAction.rating; updateWorkerRating(authAction.workerId, finalRating); } else if (authAction.type === 'DELETE_WORKER') { const newWorkers = currentData.workers.filter((w: any) => w.id !== authAction.id); updateMasterData('workers', newWorkers); } else if (authAction.type === 'DELETE_EXPENSE') { const newExpenses = currentData.expenses.filter((e: any) => e.id !== authAction.id); updateMasterData('expenses', newExpenses); } };
  const handleChangePassword = () => { if(newPassInput.length >= 4) { setAdminPin(newPassInput); setNewPassInput(""); setShowChangePassModal(false); alert("✅ Password Changed!"); } else { alert("❌ Too short!"); } };

  const allUsersTotal = currentData.users.reduce((sum: number, user: any) => sum + (Number(user.amount) || 0), 0);
  const selectedUserTotal = currentData.users.reduce((sum: number, user: any) => sum + (selectedIds.has(user.id) ? (Number(user.amount) || 0) : 0), 0);
  const displayTotal = selectedIds.size > 0 ? selectedUserTotal : allUsersTotal;
  const displayLabel = selectedIds.size > 0 ? "Selection Total" : "Today's Income";
  const totalExpenses = currentData.expenses.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0);
  const totalPayable = currentData.workers.reduce((sum: number, w: any) => sum + ((w.salary + w.bonus) - w.advance), 0);
  const calculateFinancials = () => { let income = 0; let expense = 0; const processDay = (data: any) => { income += data.users.reduce((s:any, u:any) => s + (Number(u.amount) || 0), 0); expense += data.expenses.reduce((s:any, e:any) => s + (Number(e.cost) || 0), 0); expense += data.workers.reduce((s:any, w:any) => s + (w.salary + w.bonus - w.advance), 0); }; if (statPeriod === 'daily') processDay(currentData); else if (statPeriod === 'monthly') { const days = daysInMonth(currentDate); for(let d=1; d<=days; d++) { const key = getStorageKey(currentDate, d); if(masterData[key]) processDay(masterData[key]); } if (Object.keys(masterData).length === 0) processDay(currentData); } else if (statPeriod === 'yearly') { Object.keys(masterData).forEach(key => { if(key.startsWith(currentDate.getFullYear().toString())) processDay(masterData[key]); }); if (Object.keys(masterData).length === 0) processDay(currentData); } return { income, expense, profit: income - expense }; };
  const stats = calculateFinancials();

  // Calculate section totals for reports panel
  const section1Total = currentData.users
    .slice(0, 150)
    .reduce((sum: number, user: any) => sum + (Number(user.amount) || 0), 0);

  const section2Total = currentData.users
    .slice(150, 300)
    .reduce((sum: number, user: any) => sum + (Number(user.amount) || 0), 0);

  const grandTotal = section1Total + section2Total;
  const totalInventoryCost = cafeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const netBalance = grandTotal - totalInventoryCost;

  // ── Sync net balance → CLICK_NET_SALES (feeds HISAB "Daily Sale" column) ──
  // Also writes CLICK_SELECTED_DATE so HISAB knows which date is active.
  useEffect(() => {
    const dateKey = getStorageKey(currentDate, selectedDay); // format: year-month0-day
    try {
      const store: Record<string, number> = JSON.parse(localStorage.getItem('CLICK_NET_SALES') || '{}');
      store[dateKey] = netBalance;
      localStorage.setItem('CLICK_NET_SALES', JSON.stringify(store));
      // Write currently selected date so HISAB can auto-navigate to it
      localStorage.setItem('CLICK_SELECTED_DATE', dateKey);
      window.dispatchEvent(new CustomEvent('click-net-sales-updated', { detail: { dateKey, value: netBalance } }));
      window.dispatchEvent(new CustomEvent('click-selected-date-changed', { detail: { dateKey } }));
    } catch { /* quota */ }
    setHisabDotActive(true);
    const timer = setTimeout(() => setHisabDotActive(false), 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netBalance, selectedDay, currentDate]);

  // Cafe inventory functions
  const addCafeItem = () => {
    if (itemName.trim() && itemPrice.trim()) {
      const newItem = {
        id: Date.now(),
        name: itemName.trim(),
        price: parseFloat(itemPrice) || 0
      };
      setCafeItems([...cafeItems, newItem]);
      setItemName("");
      setItemPrice("");
    }
  };

  const totalCafeSale = cafeItems.reduce((sum, item) => sum + item.price, 0);

  const forceSyncNow = async () => {
    try { await syncService.forceSyncAllRecords(); } catch (_) {}
  };

  // Backup functionality
  const [showBackupNotification, setShowBackupNotification] = useState(false);
  const [backupNotificationMessage, setBackupNotificationMessage] = useState('');
  const [backupNotificationType, setBackupNotificationType] = useState<'success' | 'error'>('success');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleManualBackup = async () => {
    try {
      await backupService.manualBackup();
      // Show success notification
      setBackupNotificationMessage('✅ Backup sent to muhammad.zahid.imam@gmail.com');
      setBackupNotificationType('success');
      setShowBackupNotification(true);

      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setShowBackupNotification(false);
      }, 3000);
    } catch (error) {
      console.error('Manual backup failed:', error);
      setBackupNotificationMessage('Backup failed. Please try again.');
      setBackupNotificationType('error');
      setShowBackupNotification(true);

      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setShowBackupNotification(false);
      }, 3000);
    }
  };

  const scanHistory = (targetName: string, dateFilter: 'today' | 'monthly' | 'yearly' | 'custom', customDate?: string) => {
      let count = 0; let totalAmount = 0; let historyDetails: string[] = []; const lowerName = targetName.toLowerCase();
      const processData = (data: any, dateLabel: string) => { if (!data || !data.users) return; data.users.forEach((u: any) => { if (u.name && u.name.toLowerCase() === lowerName) { count++; const amt = Number(u.amount) || 0; totalAmount += amt; if (u.timeIn && u.timeOut) { historyDetails.push(`• ${dateLabel} | In: ${u.timeIn} - Out: ${u.timeOut} | 💰 ${amt}`); } else { historyDetails.push(`• ${dateLabel} | 💰 ${amt}`); } } }); };
      if (dateFilter === 'today') { processData(currentData, 'Aaj'); } else if (dateFilter === 'monthly') { const days = daysInMonth(currentDate); for(let d=1; d<=days; d++) { const key = getStorageKey(currentDate, d); if(masterData[key]) processData(masterData[key], `${d} Tareekh`); } if (Object.keys(masterData).length === 0) processData(currentData, 'Aaj'); } else if (dateFilter === 'yearly') { Object.keys(masterData).forEach(key => { if(key.startsWith(currentDate.getFullYear().toString())) processData(masterData[key], key); }); }
      return { count, totalAmount, historyDetails };
  };

  const handleAiSubmit = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput; const lowerMsg = userMsg.toLowerCase();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]); setChatInput("");
    if (awaitingAiAuth) { if (userMsg === adminPin) { setAwaitingAiAuth(false); setMessages(prev => [...prev, { sender: 'ai', text: `✅ Verified.\n\nJanab, ab Date batayein (e.g., 4 1 2026)`, isSecure: true }]); setAiContext({ status: 'WAITING_FOR_DATE', targetName: '', intent: aiContext.intent }); } else { setMessages(prev => [...prev, { sender: 'ai', text: `❌ Ghalat Password.` }]); setAwaitingAiAuth(false); } return; }
    if (lowerMsg.includes('profit') || lowerMsg.includes('kamai') || lowerMsg.includes('hq') || lowerMsg.includes('loss') || lowerMsg.includes('lose') || lowerMsg.includes('nuksan') || lowerMsg.includes('bachat')) { setAiContext({ status: 'IDLE', targetName: '', intent: 'PROFIT_LOSS' }); setMessages(prev => [...prev, { sender: 'ai', text: `🔒 Financial Data ke liye Password darj karein:` }]); setAwaitingAiAuth(true); return; }
    if (lowerMsg.includes('graph')) { setMessages(prev => [...prev, { sender: 'ai', text: `📊 **Graph Analysis:**\nGraph Tab dekhein.` }]); return; }

    const workerMatch = currentData.workers.find((w: any) => w.name && lowerMsg.includes(w.name.toLowerCase()));
    
    // Check Current Data first
    let userMatch = [...currentData.users].find(u => u.name && u.name.trim() !== "" && lowerMsg.includes(u.name.toLowerCase()));
    
    // If not found, CHECK MASTER DATA (HISTORY)
    if (!userMatch) {
         Object.values(masterData).forEach((data: any) => {
             if (userMatch) return; // already found
             if (data.users) {
                 const found = data.users.find((u: any) => u.name && u.name.trim() !== "" && lowerMsg.includes(u.name.toLowerCase()));
                 if (found) userMatch = found;
             }
         });
    }

    if (aiContext.status === 'WAITING_FOR_DATE') {
        let d: number | undefined, m: number | undefined, y: number | undefined;
        let isDateInput = false;

        if (lowerMsg.includes('today') || lowerMsg.includes('aaj') || lowerMsg.includes('abhi') || lowerMsg.includes('now')) {
            const nowObj = new Date();
            d = nowObj.getDate();
            m = nowObj.getMonth();
            y = nowObj.getFullYear();
            isDateInput = true;
        } else {
            const specificDateMatch = userMsg.match(/(\d{1,2})[\s\/\-\.]+(\d{1,2})[\s\/\-\.]+(\d{4})/);
            if (specificDateMatch) {
                d = parseInt(specificDateMatch[1]);
                m = parseInt(specificDateMatch[2]) - 1;
                y = parseInt(specificDateMatch[3]);
                isDateInput = true;
            }
        }

        if (isDateInput && d !== undefined && m !== undefined && y !== undefined) {
            if (new Date(y, m, d) > new Date()) { setMessages(prev => [...prev, { sender: 'ai', text: `❌ **${d}/${m+1}/${y}** abhi aayi nahi.` }]); return; }
            const key = `${y}-${m}-${d}`;
            if (aiContext.intent === 'PROFIT_LOSS') {
                 let dayIncome = 0; let dayExpense = 0;
                 if (masterData[key]) { dayIncome = masterData[key].users.reduce((s:any, u:any) => s + (Number(u.amount) || 0), 0); dayExpense = masterData[key].expenses.reduce((s:any, e:any) => s + (Number(e.cost) || 0), 0) + masterData[key].workers.reduce((s:any, w:any) => s + (w.salary + w.bonus - w.advance), 0); } else if (y === now.getFullYear() && m === now.getMonth() && d === now.getDate()) { const res = calculateFinancials(); dayIncome = res.income; dayExpense = res.expense; }
                 setMessages(prev => [...prev, { sender: 'ai', text: `💰 **Report (${d}/${m+1}/${y}):**\n\n🟢 Income: ${dayIncome}\n🔴 Expense: ${dayExpense}\n🏁 **Profit: ${dayIncome - dayExpense}**` }]);
            } else if (aiContext.intent === 'DETAIL' && aiContext.targetName) {
                 if (masterData[key] || (y === now.getFullYear() && m === now.getMonth() && d === now.getDate())) {
                    const dataToScan = masterData[key] || currentData; let count = 0; let totalAmount = 0; let historyDetails: string[] = [];
                    dataToScan.users.forEach((u: any) => { if (u.name && u.name.toLowerCase() === aiContext.targetName.toLowerCase()) { count++; totalAmount += (Number(u.amount) || 0); historyDetails.push(`• Time: ${u.timeIn||'-'} - ${u.timeOut||'-'} | Rs ${u.amount}`); } });
                    setMessages(prev => [...prev, { sender: 'ai', text: `👤 **${aiContext.targetName} (${d}/${m+1}/${y}):**\nTotal Visits: ${count}\nTotal Paid: ${totalAmount}\n${historyDetails.join('\n') || "No record."}` }]);
                 } else { setMessages(prev => [...prev, { sender: 'ai', text: `❌ Record nahi mila.` }]); }
            }
            setAiContext({ status: 'IDLE', targetName: '', intent: 'DETAIL' });
            return;
        } else {
             if (workerMatch || userMatch) {
                 setAiContext({ status: 'IDLE', targetName: '', intent: 'DETAIL' });
             } else {
                 setMessages(prev => [...prev, { sender: 'ai', text: `⚠️ Date samajh nahi aayi. Format: 4 12 2025` }]); 
                 return;
             }
        }
    }

    if (workerMatch && userMatch && lowerMsg.includes(workerMatch.name.toLowerCase())) { setAiContext({ status: 'WAITING_FOR_TYPE', targetName: workerMatch.name, intent: 'DETAIL' }); setMessages(prev => [...prev, { sender: 'ai', text: `🤔 **"${workerMatch.name}"** Worker ya User?` }]); } 
    else if (workerMatch) { const balance = workerMatch.salary + workerMatch.bonus - workerMatch.advance; setMessages(prev => [...prev, { sender: 'ai', text: `👷 **${workerMatch.name}:**\nSalary: ${workerMatch.salary}\nBalance: ${balance}` }]); }
    else if (userMatch) { setAiContext({ status: 'WAITING_FOR_DATE', targetName: userMatch.name, intent: 'DETAIL' }); setMessages(prev => [...prev, { sender: 'ai', text: `👤 **${userMatch.name}** mil gaya.\nKis Date ki detail chahiye? (e.g. 12 1 2026)` }]); }
    else if (aiContext.status === 'WAITING_FOR_TYPE') { if (lowerMsg.includes('worker')) { setMessages(prev => [...prev, { sender: 'ai', text: `👷 Worker Detail shown (Simulated)` }]); } else { setAiContext({ status: 'WAITING_FOR_DATE', targetName: aiContext.targetName, intent: 'DETAIL' }); setMessages(prev => [...prev, { sender: 'ai', text: `👤 User select hua. Date batayein?` }]); } }
    else { setMessages(prev => [...prev, { sender: 'ai', text: "❌ Record nahi mila." }]); }
  };
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Smart Munshi: today-only instant search ──
  useEffect(() => {
    if (!munshiQuery.trim()) { setMunshiResult(null); setMunshiSearching(false); return; }
    setMunshiSearching(true);
    if (munshiDebounceRef.current) clearTimeout(munshiDebounceRef.current);
    munshiDebounceRef.current = setTimeout(() => {
      const target = munshiQuery.trim().toLowerCase();
      const todayKey = getStorageKey(currentDate, selectedDay);
      const todayDisplay = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay)
        .toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

      // Strictly filter only today's rows from live state — no history scan
      const matches: any[] = currentData.users.filter(
        (u: any) => u.name && u.name.trim().toLowerCase().includes(target)
      );

      if (matches.length === 0) {
        setMunshiResult(null);
      } else {
        const totalAmount = matches.reduce((s: number, u: any) => s + (Number(u.amount) || 0), 0);
        const totalVisits = matches.length;
        const avgAmount = totalVisits > 0 ? Math.round(totalAmount / totalVisits) : 0;

        const cabinCounts: { [k: string]: number } = {};
        matches.forEach((u: any) => {
          if (u.cabinNumber?.trim()) cabinCounts[u.cabinNumber] = (cabinCounts[u.cabinNumber] || 0) + 1;
        });
        const commonCabin =
          Object.keys(cabinCounts).sort((a, b) => cabinCounts[b] - cabinCounts[a])[0] || '--';

        const recentVisits = matches.map((u: any) => ({
          name: u.name,
          cabinNumber: u.cabinNumber || '',
          timeIn: u.timeIn || '',
          timeOut: u.timeOut || '',
          amount: Number(u.amount) || 0,
          date: todayDisplay,
          dateKey: todayKey,
          monthKey: '',
        }));

        setMunshiResult({
          name: matches[0].name,
          totalVisits,
          totalAmount,
          avgAmount,
          lastVisitDate: todayDisplay,
          firstVisitDate: todayDisplay,
          commonCabin,
          recentVisits,
        });
      }
      setMunshiSearching(false);
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [munshiQuery]);

  const renderPoliceModal = () => { if (!policeAlert) return null; return (<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300"><div className="w-full max-w-2xl bg-red-950/90 border-4 border-red-500 rounded-3xl p-10 text-center animate-siren shadow-[0_0_100px_rgba(220,38,38,0.5)]"><h1 className="text-8xl mb-6">🚨</h1><h2 className="text-5xl font-black text-white uppercase mb-6 drop-shadow-lg tracking-widest">WARNING!</h2><p className="text-2xl font-bold text-white bg-black/50 p-6 rounded-xl border-2 border-red-400/50 mb-8 leading-relaxed">Admin ki taraf se ye user Allow nh hai foran police ko call karo</p><button onClick={() => setPoliceAlert(false)} className="bg-white text-red-900 font-black px-12 py-4 rounded-full text-2xl hover:scale-110 transition-transform shadow-xl uppercase">OK BOSS</button></div></div>); }
  const renderAuthModal = () => { if (!showAuthModal) return null; let modalTitle = "Security Check"; if (authAction.type === 'UNLOCK_ROW') modalTitle = "Unlock Row"; if (authAction.type === 'RATE_WORKER') modalTitle = "Admin Rating Access"; if (authAction.type === 'DELETE_WORKER' || authAction.type === 'DELETE_EXPENSE') modalTitle = "Confirm Delete"; return (<div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"><div className={`bg-slate-900 border-2 ${authError ? 'border-red-500 animate-pulse' : t.border} p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center ${t.glow}`}><div className="mb-6 bg-slate-800 p-4 rounded-full">{authError ? <span className="text-4xl">⛔</span> : <span className="text-4xl">🔒</span>}</div><h2 className="text-2xl font-black text-white mb-2 tracking-widest uppercase">{modalTitle}</h2><input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="PIN CODE" className="bg-black/50 border border-slate-600 text-center text-3xl text-white font-mono tracking-[0.5em] w-full p-4 rounded-xl focus:outline-none focus:border-cyan-500 mb-6 placeholder-slate-700" maxLength={9}/><button onClick={handleLogin} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${t.button}`}>CONFIRM</button><button onClick={() => { setShowAuthModal(false); setAuthError(false); setPasswordInput(''); }} className="mt-4 text-slate-500 text-xs hover:text-white">Cancel</button></div></div>); };
  const renderChangePassModal = () => { if (!showChangePassModal) return null; return (<div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-slate-900 border border-purple-500 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl"><h2 className="text-xl font-bold text-purple-400 mb-4 uppercase">Change Password</h2><input type="text" value={newPassInput} onChange={(e) => setNewPassInput(e.target.value)} placeholder="New PIN Code" className="bg-black/50 border border-slate-700 text-white text-center text-xl p-3 rounded-lg w-full mb-4 focus:border-purple-500 outline-none"/><div className="flex gap-2"><button onClick={handleChangePassword} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold">Save</button><button onClick={() => setShowChangePassModal(false)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">Cancel</button></div></div></div>); };

  const renderAnalytics = () => {
    return (
      <ThreeDAnalytics theme={t} />
    );
  };

  const renderFinancials = () => (
    <div className={`p-4 h-full flex flex-col items-center justify-center animate-in fade-in duration-500 relative ${t.textMain}`}>
      <button onClick={() => setShowChangePassModal(true)} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold border border-slate-600 flex items-center gap-1 z-50">⚙️ Pass</button>
      <div className="text-center mb-8 animate-in zoom-in duration-1000">
        <h1 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-cyan-500 to-purple-600 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tighter">FINANCIAL HQ</h1>
        <p className={`text-sm font-bold tracking-[0.2em] uppercase text-orange-400`}>Welcome Mr. <span className="text-white font-black">Zahid ImAm</span></p>
      </div>
      <div className="mb-4 flex flex-col items-center gap-3">
        <button
          onClick={forceSyncNow}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-full font-bold shadow-lg border border-white/20 flex items-center gap-2 animate-pulse"
        >
          🔄 SYNC NOW
        </button>
        <button
          onClick={forceSyncNow}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-full font-bold shadow-lg border border-white/20 flex items-center gap-2"
        >
          🚀 FORCE SYNC ALL
        </button>
      </div>
      
      <div className="flex w-full max-w-6xl gap-6 mb-8 items-stretch h-full">
          <div className={`w-1/4 max-w-[200px] ${t.panelBg} p-3 rounded-xl border ${t.border} flex flex-col shadow-lg`}>
            <h3 className="text-red-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-xs"><span className="text-lg">🚫</span> Blacklist</h3>
            <div className="flex gap-1 mb-2">
                <input value={blockInput} onChange={(e)=>setBlockInput(e.target.value)} placeholder="Name..." className="flex-1 bg-black/50 border border-slate-600 rounded px-2 py-1 outline-none text-[10px] text-white"/>
                <button onClick={addToBlockList} className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded font-bold text-[10px] text-white">+</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                {blockList.map((name, i) => (<div key={i} className="bg-red-900/40 border border-red-500/50 p-1.5 rounded flex justify-between items-center hover:bg-red-900/60"><span className="text-red-200 font-bold text-xs truncate w-20">{name}</span><button onClick={()=>removeFromBlockList(name)} className="hover:text-white text-red-400 font-bold text-xs px-1">✕</button></div>))}
                {blockList.length === 0 && <span className="text-slate-500 italic text-[10px] text-center mt-4">No Data</span>}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4">
             <div className="flex justify-center gap-2">{(['daily', 'monthly', 'yearly'] as StatPeriod[]).map(period => (<button key={period} onClick={() => setStatPeriod(period)} className={`px-4 py-1 rounded-full uppercase text-[10px] font-bold tracking-widest transition-all duration-300 ${statPeriod === period ? t.button + ' text-white scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{period}</button>))}</div>
             
             <div className="grid grid-cols-2 gap-4 flex-1">
                <div className={`group relative ${t.panelBg} border ${t.border} rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg hover:bg-white/5 transition-all`}>
                    <h3 className={`font-bold uppercase tracking-widest text-xs mb-1 ${t.textAccent}`}>Revenue</h3>
                    <div className={`text-2xl md:text-3xl font-mono font-black ${t.textMain}`}>{stats.income.toLocaleString()}</div>
                </div>
                <div className={`group relative ${t.panelBg} border ${t.border} rounded-2xl p-4 flex flex-col justify-center items-center shadow-lg hover:bg-white/5 transition-all`}>
                    <h3 className="text-red-400 font-bold uppercase tracking-widest text-xs mb-1">Expenses</h3>
                    <div className={`text-2xl md:text-3xl font-mono font-black ${t.textMain}`}>{stats.expense.toLocaleString()}</div>
                </div>
                <div className={`col-span-2 group relative ${t.panelBg} border-2 ${t.border} rounded-2xl p-6 flex flex-col justify-center items-center shadow-2xl hover:scale-[1.02] transition-transform bg-gradient-to-r from-black/40 via-transparent to-black/40`}>
                    <h3 className={`font-black uppercase tracking-widest text-sm mb-2 ${t.textHighlight}`}>NET PROFIT</h3>
                    <div className={`text-5xl md:text-6xl font-mono font-black ${t.textMain} drop-shadow-lg`}>{stats.profit.toLocaleString()} <span className="text-lg text-slate-500">PKR</span></div>
                </div>
             </div>
          </div>
      </div>
    </div>
  );

  // --- RENDER EXPENSES (FIXED & SAFE) ---
  const renderExpenses = () => (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className={`text-xl ${t.textAccent} mb-4 font-bold border-b ${t.border} pb-2`}>Expenses ({selectedDay} {formatMonthYear(currentDate)})</h2>
      <div className={`${t.panelBg} shadow-lg`}>
        <table className="w-full text-left text-sm text-slate-300">
          <thead className={`bg-black/50 ${t.textAccent} uppercase text-xs`} style={{paddingBottom: '8px'}}><tr><th className="p-4">Expense Item</th><th className="p-4">Date</th><th className="p-4 text-right">Cost (PKR)</th><th className="p-4 text-center">Action</th></tr></thead>
          <tbody>
            {currentData.expenses.map((e: any) => {
               if (e.isSpecial) {
                 const icon = e.type === 'generator' ? '⚡' : '☕';
                 return (
                    <tr key={e.id} onClick={() => setActiveModal(e.type)} className={`group cursor-pointer hover:bg-white/5 relative`}>
                      <td className={`p-4 font-bold ${t.textMain} flex items-center gap-3`}><span className="text-2xl">{icon}</span><span className={`uppercase tracking-widest text-xl font-bold ${t.textAccent}`}>{e.item}</span><span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400">DETAILS</span></td>
                      <td className="p-4 text-slate-500 text-sm italic">Auto-calculated</td>
                      <td className="p-4 text-right"><div className={`font-mono font-black text-2xl ${t.textHighlight}`}>{e.cost.toLocaleString()}</div></td>
                      <td className="p-4 text-center"><span className="text-slate-600">🔒</span></td>
                    </tr>
                 );
               }
               return (
                  <tr key={e.id} className="hover:bg-white/5">
                    <td className="p-4"><input id={`item-${e.id}`} value={e.item} onChange={(ev)=>updateExpense(e.id, 'item', ev.target.value)} onKeyDown={(ev) => handleUniversalKeyDown(ev, e.id, 'item', currentData.expenses, 'expenses')} className={`bg-transparent outline-none w-full text-xl font-bold ${t.textMain} placeholder-slate-700`}/></td>
                    <td className="p-4"><input id={`date-${e.id}`} type="date" value={e.date} onChange={(ev)=>updateExpense(e.id, 'date', ev.target.value)} onKeyDown={(ev) => handleUniversalKeyDown(ev, e.id, 'date', currentData.expenses, 'expenses')} className="bg-transparent outline-none text-slate-400 font-bold"/></td>
                    <td className="p-4 text-right"><input id={`cost-${e.id}`} type="number" value={e.cost === 0 ? '' : e.cost} placeholder="0" onChange={(ev)=>updateExpense(e.id, 'cost', ev.target.value)} onKeyDown={(ev) => handleUniversalKeyDown(ev, e.id, 'cost', currentData.expenses, 'expenses')} className={`bg-transparent text-right outline-none w-40 text-2xl font-black ${t.textHighlight} placeholder-slate-700`}/></td>
                    <td className="p-4 text-center"><button onClick={() => initiateDeleteExpense(e.id)} className="text-slate-500 hover:text-red-500 transition-colors text-xl">🗑️</button></td>
                  </tr>
               );
            })}
            <tr className="bg-black/30"><td className={`p-6 font-bold ${t.textAccent} uppercase tracking-wider text-xl`}>Total</td><td></td><td className={`p-6 text-right font-mono font-black text-4xl ${t.textHighlight}`}>{totalExpenses.toLocaleString()}</td><td></td></tr>
          </tbody>
        </table>
      </div>
      <button onClick={addExpense} className={`mt-4 px-6 py-3 ${t.button} text-white rounded-lg text-sm font-bold border border-white/20 flex items-center gap-2 shadow-lg`}><span className="text-xl">+</span> Add New Expense</button>
    </div>
  );

  const renderDetailsModal = () => { if (!activeModal) return null; const isGen = activeModal === 'generator'; const logs = isGen ? generatorLogs : teaLogs; const modalTotal = logs.reduce((s, i) => s + i.amount, 0); return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"><div className={`relative w-full max-w-4xl ${t.panelBg} border-2 ${t.border} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}><div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20"><div><h2 className={`text-3xl font-black italic tracking-tighter ${t.textAccent} drop-shadow-md`}>{isGen ? "GENERATOR" : "TEA"}</h2></div><button onClick={() => setActiveModal(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 text-white flex items-center justify-center">✕</button></div><div className="p-6 overflow-y-auto custom-scrollbar flex-1"><table className="w-full text-left text-sm text-white/80"><thead className={`uppercase text-xs font-bold ${t.textAccent} border-b border-white/10`}><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3 text-right">Cost</th></tr></thead><tbody className="divide-y divide-white/10">{logs.map((log) => (<tr key={log.id} className="hover:bg-white/5 transition-colors"><td className="p-3"><input type="date" value={log.date} onChange={(e)=>updateSubLog(activeModal, log.id, 'date', e.target.value)} className="bg-transparent outline-none text-white/70"/></td><td className="p-3"><input value={log.desc} placeholder="Item details..." onChange={(e)=>updateSubLog(activeModal, log.id, 'desc', e.target.value)} className="bg-transparent outline-none w-full placeholder-white/20"/></td><td className="p-3 text-right"><input type="number" value={log.amount} onChange={(e)=>updateSubLog(activeModal, log.id, 'amount', e.target.value)} className={`bg-transparent outline-none text-right font-bold text-xl ${t.textAccent} w-32`}/></td></tr>))}</tbody></table><button onClick={() => addSubLog(activeModal)} className={`mt-6 w-full py-3 rounded-xl border border-dashed border-white/30 text-white/50 hover:bg-white/5 hover:text-white transition-all uppercase font-bold tracking-widest`}>+ Add Entry</button></div><div className="p-6 bg-black/40 border-t border-white/10 flex justify-between items-center"><span className="text-white/50 uppercase tracking-widest font-bold">Total Cost</span><span className={`text-4xl font-black ${t.textAccent}`}>{modalTotal.toLocaleString()}</span></div></div></div>); };

  const goToToday = () => {
    const t2 = new Date();
    setCurrentDate(new Date(t2.getFullYear(), t2.getMonth(), 1));
    setSelectedDay(t2.getDate());
    setSelectedIds(new Set());
  };

  const renderMonthNavigator = () => {
    // Build the date string in LOCAL time (avoids UTC-offset shift bug)
    const y  = currentDate.getFullYear();
    const m  = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d  = String(selectedDay).padStart(2, '0');
    const dateValue = `${y}-${m}-${d}`;

    return (
    <div className={`flex items-center gap-2 ${t.panelBg} rounded-lg p-1 border ${t.border} min-w-[200px]`}>
      <button onClick={() => changeMonth(-1)} className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors ${t.textAccent}`}>◀</button>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => {
          const val = e.target.value; // "YYYY-MM-DD"
          if (!val) return;
          // Parse manually — new Date(string) treats it as UTC and shifts the day
          const [ny, nm, nd] = val.split('-').map(Number);
          setCurrentDate(new Date(ny, nm - 1, 1)); // month is 0-indexed
          setSelectedDay(nd);
          setSelectedIds(new Set());
        }}
        className={`bg-transparent text-sm font-bold ${t.textMain} uppercase tracking-widest w-full text-center select-none truncate px-2 py-1 border-none outline-none cursor-pointer`}
      />
      <button onClick={() => changeMonth(1)} className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors ${t.textAccent}`}>▶</button>
      {/* Go to Today */}
      <button
        onClick={goToToday}
        title="Go to Today"
        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/10 text-slate-500 hover:text-white hover:border-white/30 transition-colors whitespace-nowrap ml-1"
      >Today</button>
    </div>
  )};
  const renderCabinsLeftCounter = () => {
    // Collect occupied cabin numbers (1-30 range only)
    const occupiedCabinNumbers = new Set(
      currentData.users
        .filter((user: any) => user.cabinNumber && user.cabinNumber.trim() !== '')
        .map((user: any) => parseInt(user.cabinNumber))
        .filter((num: number) => !isNaN(num) && num >= 1 && num <= 30)
    );

    return (
      <div className={`border-b ${t.border} py-2 px-4 shrink-0 glass-panel`}>
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(cabinNum => {
            const isOccupied = occupiedCabinNumbers.has(cabinNum);
            return (
              <div
                key={cabinNum}
                style={{ visibility: isOccupied ? 'hidden' : 'visible' }}
                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-[4px] border transition-all duration-300 ${t.textHighlight} ${t.button} bg-opacity-20 border-white/50 ${t.glow}`}
              >
                {cabinNum}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNotesColumn = () => {
    const notes = currentData.notes || Array.from({ length: 150 }, (_: any, i: number) => ({ id: i + 1, a: '', b: '' }));
    const inputCls = "w-full h-7 bg-black/20 border border-dotted border-yellow-700/40 text-yellow-400/80 text-[9px] text-center focus:outline-none focus:border-yellow-500 rounded-sm placeholder-yellow-900/30 font-mono";
    return (
      <div className="flex flex-col">
        {/* Header spacer — matches renderUserBlock header height */}
        <div className={`sticky top-0 z-10 ${t.panelBg} flex items-center justify-center`} style={{ height: '38px', paddingBottom: '8px' }}>
          <span className="text-[7px] text-yellow-700/60 uppercase tracking-widest font-bold">rough</span>
        </div>
        {notes.map((note: any) => (
          <div key={note.id} className="h-12 mx-0.5 my-2 flex items-center gap-0.5">
            <input type="text" value={note.a} onChange={(e) => updateNote(note.id, 'a', e.target.value)} className={inputCls} placeholder="·" maxLength={12} />
            <input type="text" value={note.b} onChange={(e) => updateNote(note.id, 'b', e.target.value)} className={inputCls} placeholder="·" maxLength={12} />
          </div>
        ))}
      </div>
    );
  };

  const renderUserBlock = (start: number, end: number, noteField: 'a' | 'b' = 'a') => {
    const notes = (currentData as any).notes || Array.from({ length: 150 }, (_: any, i: number) => ({ id: i + 1, a: '', b: '' }));
    return (
    <div className={`${t.panelBg} backdrop-blur-sm overflow-hidden`} style={{ tableLayout: 'fixed', width: '100%' }}>
      <div className={`flex font-bold text-[10px] uppercase p-2 sticky top-0 z-10 ${t.panelBg} ${t.textAccent}`} style={{paddingBottom: '8px', display: 'flex', width: '100%'}}><div className="text-center" style={{width: '7%'}}>No</div><div className="text-center" style={{width: '7%'}}>Cabin</div><div className="px-1" style={{width: '28%'}}>NAME</div><div className="text-center" style={{width: '11%'}}>In</div><div className="text-center" style={{width: '11%'}}>Out</div><div className="text-center text-cyan-400" style={{width: '12%'}}>DUR</div><div className="text-right" style={{width: '12%'}}>Amt</div><div className="text-center text-yellow-600/70" style={{width: '12%'}}>~</div></div>
      {currentData.users.slice(start, end).map((user: any, sliceIndex: number) => {
        const rowNote = notes[sliceIndex] || { id: sliceIndex + 1, a: '', b: '' };
        const isSelected = selectedIds.has(user.id);
        const overdueMinutes = getOverdueMinutes(user.timeOut);
        const timeRemainingMinutes = getTimeRemainingMinutes(user.timeOut);

        // ** BLINK LOGIC **
        const hasName = user.name && user.name.trim() !== '';
        const hasTime = user.timeOut && user.timeOut.trim() !== '';
        let isTimeUp = false; let isWarning = false;
        if (hasName && hasTime) { isTimeUp = overdueMinutes >= 0; isWarning = overdueMinutes >= -10 && overdueMinutes < 0; }

        // ** NEW 10-MINUTE WARNING LOGIC ** - Blink when 10 minutes or less remaining for active (unlocked) rows
        // Show warning for rows that have a name, timeOut, and have 10 or fewer minutes remaining (regardless of lock status)
        const isTenMinuteWarning = hasName && hasTime && timeRemainingMinutes <= 10 && timeRemainingMinutes > 0;

        // For the 10-minute warning, we want to show it regardless of whether the row is locked/frozen
        // The warning should continue until timeout is reached, even if the row is frozen
        const showTenMinuteWarning = isTenMinuteWarning;

        // For the row class, we distinguish between locked due to timeout and locked due to both fields filled
        const isLockedByTimeout = isTimeUp;
        const isLockedByFields = user.isLocked && user.amount && user.amount.trim() !== '';
        const isLocked = isLockedByTimeout || isLockedByFields;

        const isDraft = !!user.isDraft;
        const isArchived = user.isArchived || false;
        const isConflict = !isLocked && currentData.users.some((u: any) => u.id !== user.id && u.name && u.name.toLowerCase().trim() === user.name.toLowerCase().trim());

        // Determine if this is an active/live session - NEW LOGIC: Name is not empty AND Time Out is empty
        const isActiveSession = user.name && user.name.trim() !== '' && (!user.timeOut || user.timeOut.trim() === '');

        let rowClass = `flex items-center text-sm h-12 cursor-pointer transition-all duration-300 rounded-xl mx-1 my-2 shadow-2xl overflow-hidden `;

        // Apply warning animations first, then override with locked state if needed
        if (isArchived) {
            rowClass += 'bg-slate-800/70 text-slate-400 font-normal opacity-80';
        } // Different style for archived rows
        else if (showTenMinuteWarning) {
            rowClass += 'animate-neon-warning text-orange-300'; // NEW: 10-minute warning animation with neon orange glow
            // Add locked appearance if also locked, but keep the animation
            if (isLockedByFields) {
                rowClass += ' bg-slate-800/90 opacity-95 font-bold';
            } else if (isLockedByTimeout) {
                rowClass += ' bg-red-900/80 text-white opacity-95 font-bold';
            }
        }
        else if (isWarning) {
            rowClass += 'animate-warning text-yellow-200';
            // Add locked appearance if also locked, but keep the animation
            if (isLockedByFields) {
                rowClass += ' bg-slate-800/90 opacity-95 font-bold';
            } else if (isLockedByTimeout) {
                rowClass += ' bg-red-900/80 text-white opacity-95 font-bold';
            }
        }
        else if (isLockedByTimeout) {
            rowClass += 'bg-red-900/80 text-white font-bold opacity-95';
        }
        else if (isLockedByFields) {
            rowClass += 'bg-slate-800/90 text-slate-300 font-bold opacity-95';
        } // Disabled look for locked rows
        else if (isSelected) {
            rowClass += 'bg-cyan-900/40';
        }
        else if (isActiveSession) {
            rowClass += 'bg-emerald-900/30';
        } // Subtle background for active sessions
        else if (isDraft) {
            rowClass += 'bg-transparent border border-white/[0.04] focus-within:border-cyan-500/40 focus-within:ring-1 focus-within:ring-inset focus-within:ring-cyan-500/20 hover:border-white/[0.08]';
        } // Empty draft row — barely visible until focused
        else {
            rowClass += 'bg-slate-900/50 hover:bg-slate-800/60';
        }

        // Always show shimmer for Crystal Glass Edition (pure CSS, no state)
        if (themeIndex === 8) {
            rowClass += ' relative overflow-hidden';
        }

        return (
          <div key={isDraft ? `draft-${user.id}` : user.id} className={`${rowClass} group relative`} style={{ display: 'flex', width: '100%', tableLayout: 'fixed' }}>
            {/* Shimmer overlay — Crystal Glass Edition only, CSS-driven */}
            {themeIndex === 8 && (
              <div className="absolute inset-0 shimmer"></div>
            )}

            {/* Tooltip for active sessions - NEW LOGIC: Show only when Time Out is empty */}
            {isActiveSession && (
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                ONLINE
              </div>
            )}
            <div onClick={() => !isLockedByFields && !isDraft && toggleSelect(user.id)} className={`text-center font-mono`} style={{width: '7%', color: isDraft ? 'rgba(100,116,139,0.25)' : (isSelected || isLockedByFields ? 'white' : undefined), fontWeight: isSelected || isLockedByFields ? 'bold' : undefined}}>
              {user.no}
              {isArchived && <span className="ml-1 text-xs">📋</span>} {/* Indicator for archived rows */}
            </div>
            <input
              id={`cabinNumber-${user.id}`}
              className={`bg-transparent text-center text-lg font-bold focus:outline-none placeholder-slate-700 ${isLockedByFields ? 'ring-1 ring-inset ring-slate-500/60 rounded text-slate-200' : ''}`}
              placeholder="--"
              value={user.cabinNumber}
              onChange={(e) => {
                const value = e.target.value;
                // Validate that it's a number between 1 and 30 with max 2 digits
                if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) >= 1 && parseInt(value) <= 30)) {
                  updateUser(user.id, 'cabinNumber', value);
                }
              }}
              onKeyDown={(e) => handleUniversalKeyDown(e, user.id, 'cabinNumber', currentData.users, 'users')}
              style={{ width: '7%' }}
            />
            <div className="relative name-input-wrapper" style={{ width: '28%' }}>
              <input
                disabled={isLockedByFields}  // Only disable if locked by both fields
                id={`name-${user.id}`}
                className={`w-full bg-transparent px-1 text-lg font-bold focus:outline-none ${isLockedByFields ? 'cursor-not-allowed' : ''} ${isConflict ? 'text-white' : (isActiveSession ? 'text-emerald-400' : t.textMain)} ${isActiveSession ? t.glow : ''}`}
                placeholder="Name"
                value={user.name}
                onChange={(e) => {
                  // Auto-capitalize first letter of each word
                  let value = e.target.value;
                  if (value.trim() !== '') {
                    value = value.replace(/\b\w/g, l => l.toUpperCase());
                  }
                  updateUser(user.id, 'name', value);

                  // Filter suggestions as the user types with the specific input ID
                  filterSuggestions(value, user.id);
                }}
                onKeyDown={(e) => handleUniversalKeyDown(e, user.id, 'name', currentData.users, 'users')}
                onFocus={() => filterSuggestions(user.name, user.id)}
                style={{ width: '100%' }}
              />

              {/* Suggestions dropdown - only show for the active input */}
              {suggestionsVisible && activeInputId === user.id && (
                <div className={`name-suggestions-dropdown rounded-lg shadow-lg max-h-60 overflow-auto ${t.panelBg} border ${t.border} ${t.glow} backdrop-blur-md`}>
                  {filteredSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={`px-4 py-3 cursor-pointer text-sm hover:bg-white/10 transition-colors ${
                        index === currentSuggestionIndex
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-l-4 border-cyan-400'
                          : 'border-l-4 border-transparent'
                      } ${t.textMain}`}
                      onMouseDown={() => selectSuggestion(suggestion, user.id)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              disabled={isLockedByFields}
              id={`timeIn-${user.id}`}
              className="bg-transparent text-center text-base font-bold text-slate-400 focus:outline-none placeholder-slate-700 font-mono disabled:cursor-not-allowed disabled:text-white"
              placeholder="--:--"
              value={user.timeIn}
              onChange={(e) => updateUser(user.id, 'timeIn', e.target.value)}
              onKeyDown={(e) => handleUniversalKeyDown(e, user.id, 'timeIn', currentData.users, 'users')}
              style={{ width: '11%' }}
            />
            <input
              disabled={isLockedByFields}
              id={`timeOut-${user.id}`}
              className={`bg-transparent text-center text-base font-bold focus:outline-none placeholder-slate-700 font-mono disabled:cursor-not-allowed disabled:text-white ${!isLockedByFields && isWarning ? 'text-red-400 font-black' : 'text-slate-400'}`}
              placeholder="--:--"
              value={user.timeOut}
              onChange={(e) => updateUser(user.id, 'timeOut', e.target.value)}
              onBlur={() => checkAndLockRow(user.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') checkAndLockRow(user.id); handleUniversalKeyDown(e, user.id, 'timeOut', currentData.users, 'users') }}
              style={{ width: '11%' }}
            />
            {/* DUR — Dedicated duration display column */}
            {(() => { const dur = calculateTotalTime(user.timeIn, user.timeOut); return (
            <div className="flex items-center justify-center" style={{ width: '12%' }}>
              {dur ? (
                <span className="text-cyan-400 text-xs font-black tracking-wide bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-0.5 leading-none">{dur}</span>
              ) : (
                <span className="text-slate-700 text-xs">—</span>
              )}
            </div>
            );})()}
            <div className="amount-cell-wrapper relative" style={{ width: '12%', paddingLeft: '6px', paddingRight: '6px', boxSizing: 'border-box' }}>
              <input
                disabled={isLockedByTimeout || isLockedByFields}
                id={`amount-${user.id}`}
                type="number"
                className={`w-[100%] bg-transparent text-center text-lg font-black focus:outline-none placeholder-slate-700 disabled:cursor-not-allowed disabled:text-white ${(isLockedByTimeout || (isLockedByFields && !showTenMinuteWarning && !isWarning)) ? '' : t.textHighlight}`}
                placeholder="0"
                value={user.amount}
                onChange={(e) => updateUser(user.id, 'amount', e.target.value)}
                onBlur={() => checkAndLockRow(user.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') checkAndLockRow(user.id); handleUniversalKeyDown(e, user.id, 'amount', currentData.users, 'users') }}
                style={{ width: '100%' }}
              />
            </div>
            {/* Rough Note box — manual scratch pad, no effect on calculations */}
            <div style={{ width: '12%', paddingLeft: '4px', paddingRight: '4px', boxSizing: 'border-box' }} className="flex items-center">
              <input
                type="text"
                value={rowNote[noteField]}
                onChange={(e) => updateNote(rowNote.id, noteField, e.target.value)}
                className="w-full bg-black/20 border border-dotted border-yellow-700/40 text-yellow-400/80 text-center focus:outline-none focus:border-yellow-500 rounded-sm placeholder-yellow-900/40 font-mono"
                placeholder="~"
                maxLength={6}
                style={{
                  fontSize: '12px',       // locked — never inherits parent font-bold or size changes
                  lineHeight: '1',        // fixed line-height prevents vertical shift on freeze
                  height: '28px',         // same as h-7 (1.75rem = 28px), explicit so it can't shift
                  paddingTop: '0',
                  paddingBottom: '0',
                }}
              />
            </div>

          </div>
        );
      })}
    </div>
  )};

  return (
    <>
    <style jsx global>{styles}</style>

    {/* Rotation Overlay for Portrait Mode */}
    {showRotationOverlay && (
      <div className="rotation-overlay">
        <div className="rotation-icon">🔄</div>
        <div className="rotation-message">Please rotate your phone for the best experience</div>
        <div className="text-white text-center text-sm">Hold your phone horizontally<br/>(Landscape mode) to view the dashboard</div>
      </div>
    )}

    <div
      className={`h-screen flex flex-col ${t.appBg} animate-gradient-bg ${t.textMain} font-sans overflow-hidden relative transition-colors duration-1000 ${showRotationOverlay ? 'hidden' : ''}`}
      style={{ minHeight: '100vh', touchAction: 'pan-y' }}
      onClick={(e) => {
        // Close both panels when clicking on main content area (but not on child elements)
        if (e.target === e.currentTarget) {
          setShowCafePanel(false);
          setShowReportsPanel(false);
        }

      }}
    >
      <div className={`flex flex-col h-full ${isPortrait ? '' : 'mobile-landscape-scaler'}`}>
        {renderDetailsModal()} {renderAuthModal()} {renderChangePassModal()} {renderPoliceModal()}

        <header className={`flex justify-between items-center px-4 py-2 ${t.panelBg} border-b ${t.border} shadow-2xl shrink-0 z-50 relative h-[70px] backdrop-blur-md`}>
          <div className="shrink-0 z-20">{renderMonthNavigator()}</div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden"><div className="animate-bounce-text flex items-center"><h1 className="text-3xl md:text-5xl font-black tracking-tightest italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-400 drop-shadow-[0_0_12px_rgba(255,140,0,0.6)] transform skew-x-[-10deg] px-4 opacity-70">⚡ WELCOME SPIDER STATION ⚡</h1></div></div>
          <div className={`flex items-center gap-6 z-20 ${t.panelBg} pl-6 pr-2 rounded-l-2xl border-l ${t.border} py-1 shadow-xl`}>
             <button onClick={cycleTheme} className={`w-10 h-10 rounded-full ${t.button} shadow-lg border border-white/20 flex items-center justify-center text-lg hover:scale-110 transition-transform active:rotate-180 duration-500`} title="Switch Theme">🎨</button>
             <div className="flex flex-col items-end justify-center border-r border-slate-600 pr-6 mr-2">
               <span className="text-[10px] text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Owner</span>
               <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 drop-shadow-[0_2px_8px_rgba(255,120,0,0.7)] font-sans leading-none tracking-widest filter contrast-125">Zahid ImAm</span>
             </div>
             {currentView === 'workers' && <div className="text-right"><p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mb-1">Payable</p><p className={`text-xl font-mono font-black leading-none ${t.textAccent}`}>{totalPayable.toLocaleString()} <span className="text-[10px] text-slate-500">PKR</span></p></div>}
             {currentView === 'expenses' && <div className="text-right"><p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mb-1">Total Exp</p><p className="text-xl font-mono font-black leading-none text-red-400">{totalExpenses.toLocaleString()} <span className="text-[10px] text-slate-500">PKR</span></p></div>}
          </div>
        </header>

        {(currentView !== 'financials' && currentView !== 'analytics') && renderCabinsLeftCounter()}

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 relative" style={{ WebkitOverflowScrolling: 'touch' }}>
          {currentView === 'users' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>{renderUserBlock(0, Math.ceil((currentData.users || []).length / 2), 'a')}</div>
                <div style={{ width: '100%' }}>{renderUserBlock(Math.ceil((currentData.users || []).length / 2), (currentData.users || []).length, 'b')}</div>
              </div>
              <div className="flex justify-center pb-32 pt-4">
                <button
                  onClick={addUserRow}
                  className={`px-6 py-3 ${t.button} text-white rounded-lg font-bold border border-white/20 flex items-center gap-2 hover:opacity-80 transition-opacity`}
                >
                  <span className="text-lg">+</span> Add Row
                </button>
              </div>
            </>
          )}
          {currentView === 'workers' && (
            <div className="pb-32 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-4 max-w-4xl mx-auto">
                <h2 className={`text-xl ${t.textAccent} mb-4 font-bold border-b ${t.border} pb-2`}>Worker Salary Sheet</h2>
                <div className={`${t.panelBg} shadow-lg`}>
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className={`bg-black/50 ${t.textAccent} uppercase text-xs`} style={{paddingBottom: '8px'}}>
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3 text-center">Reputation</th>
                        <th className="p-3 text-right">Salary</th>
                        <th className="p-3 text-right text-red-400">Advance</th>
                        <th className="p-3 text-right text-green-400">Bonus</th>
                        <th className="p-3 text-right text-white">Remaining</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.workers.map((w: any) => {
                        const balance = w.salary + w.bonus - w.advance;
                        return (
                          <tr key={w.id} className="hover:bg-white/5">
                            <td className="p-3">
                              <input
                                id={`name-${w.id}`}
                                value={w.name}
                                onChange={(e)=>updateWorkerName(w.id, e.target.value)}
                                onKeyDown={(e) => handleUniversalKeyDown(e, w.id, 'name', currentData.workers, 'workers')}
                                className={`bg-transparent font-black text-xl ${t.textMain} outline-none w-full`}
                              />
                            </td>
                            <td className="p-3 flex justify-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => initiateRating(w.id, star)}
                                  className={`text-lg transition-transform hover:scale-125 ${star <= w.rating ? 'text-yellow-400' : 'text-slate-600'}`}
                                >
                                  ★
                                </button>
                              ))}
                            </td>
                            <td className="p-3 text-right">
                              <input
                                id={`salary-${w.id}`}
                                type="number"
                                value={w.salary}
                                onChange={(e)=>updateWorker(w.id, 'salary', e.target.value)}
                                onKeyDown={(e) => handleUniversalKeyDown(e, w.id, 'salary', currentData.workers, 'workers')}
                                className="bg-transparent text-right outline-none w-24 font-black text-xl"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                id={`advance-${w.id}`}
                                type="number"
                                value={w.advance}
                                onChange={(e)=>updateWorker(w.id, 'advance', e.target.value)}
                                onKeyDown={(e) => handleUniversalKeyDown(e, w.id, 'advance', currentData.workers, 'workers')}
                                className="bg-transparent text-right outline-none w-20 font-bold text-lg text-red-400"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                id={`bonus-${w.id}`}
                                type="number"
                                value={w.bonus}
                                onChange={(e)=>updateWorker(w.id, 'bonus', e.target.value)}
                                onKeyDown={(e) => handleUniversalKeyDown(e, w.id, 'bonus', currentData.workers, 'workers')}
                                className="bg-transparent text-right outline-none w-20 font-bold text-lg text-green-400"
                              />
                            </td>
                            <td className={`p-3 text-right font-black text-2xl ${t.textHighlight}`}>{balance.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => initiateDeleteWorker(w.id)} className="text-slate-500 hover:text-red-500 transition-colors text-xl">🗑️</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button onClick={addWorker} className={`mt-4 px-4 py-2 ${t.button} text-white rounded-lg text-sm font-bold border border-white/20 flex items-center gap-2 shadow-lg`}>
                  <span className="text-lg font-bold">+</span> Add New Worker
                </button>
              </div>
            </div>
          )}
          {currentView === 'expenses' && (
            <div className="pb-32 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              {renderExpenses()}
            </div>
          )}
          {currentView === 'financials' && renderFinancials()}
          {currentView === 'analytics' && renderAnalytics()}
        </main>

        <nav className={`shrink-0 ${t.panelBg} border-t ${t.border} p-2 flex justify-center items-center gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.8)] z-50 backdrop-blur-md`}>

          {/* ── GROUPED: Users + HISAB ── */}
          <div className="flex flex-row items-center gap-1 px-1 py-1 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
            {/* USERS */}
            <button
              onClick={() => setCurrentView('users')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${currentView === 'users'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.55)] border border-cyan-500/40 -translate-y-0.5'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.8)] hover:-translate-y-0.5 border border-transparent'
                }`}
            >
              👥 Users
            </button>

            {/* DIVIDER */}
            <span className="w-px h-6 bg-white/10 shrink-0" />

            {/* HISAB */}
            <Link
              href="/hisab"
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                text-yellow-400/80 hover:text-yellow-300 hover:bg-yellow-500/10 hover:shadow-[0_0_15px_rgba(251,191,36,0.8)] hover:-translate-y-0.5 border border-transparent hover:border-yellow-500/30`}
              title="Monthly Accounts"
            >
              🧾 Hisab
              {hisabDotActive && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </Link>
          </div>

          {/* ── OTHER NAV ITEMS ── */}
          <button onClick={() => setCurrentView('workers')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentView === 'workers' ? `${t.button} text-white shadow-lg -translate-y-0.5` : 'bg-transparent text-slate-400 hover:text-white'}`}>👷 Workers</button>
          <button onClick={() => setCurrentView('expenses')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentView === 'expenses' ? `${t.button} text-white shadow-lg -translate-y-0.5` : 'bg-transparent text-slate-400 hover:text-white'}`}>📉 Expenses</button>
          <button onClick={() => setCurrentView('analytics')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentView === 'analytics' ? `${t.button} text-white shadow-lg -translate-y-0.5` : 'bg-transparent text-slate-400 hover:text-white'}`}>📊 Graph</button>
          <button onClick={() => { setAuthAction({ type: 'ACCESS_HQ' }); setShowAuthModal(true); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${currentView === 'financials' ? 'bg-purple-600 text-white shadow-lg -translate-y-0.5' : 'bg-transparent text-slate-400 hover:text-white'}`}>🔒 Financials</button>

          {/* BACKUP */}
          <button
            onClick={handleManualBackup}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-transparent text-slate-400 hover:text-white transition-all duration-200 animate-pulse-slow"
            title="Create Manual Backup"
          >
            ☁️ Backup
          </button>

          {/* SETTINGS */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-transparent text-slate-400 hover:text-white transition-all duration-200"
            title="Settings"
          >
            ⚙️ Settings
          </button>

        </nav>

        {/* BACKUP NOTIFICATION */}
        {showBackupNotification && (
          <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border ${
            backupNotificationType === 'success'
              ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
              : 'bg-red-900/90 border-red-500/50 text-red-100'
          } animate-in slide-in-from-top-5 fade-in duration-300`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {backupNotificationType === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-bold">{backupNotificationMessage}</span>
            </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />

        {/* ── SMART MUNSHI PANEL (FIXED BOTTOM RIGHT) ── */}
        {showMunshi && (
          <div className="fixed bottom-[76px] right-4 z-[61] w-80 max-h-[78vh] flex flex-col bg-black/60 backdrop-blur-2xl border border-amber-700/40 rounded-2xl shadow-[0_0_40px_rgba(251,191,36,0.15)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Header */}
            <div className="p-3 border-b border-amber-800/30 flex justify-between items-center bg-gradient-to-r from-amber-950/60 to-orange-950/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-xl ${munshiSearching ? 'animate-munshi-pulse' : ''}`}>📜</span>
                <div>
                  <div className="font-black text-amber-300 text-sm leading-none tracking-wide">Smart Munshi</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="inline-flex items-center gap-0.5 bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 text-[8px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Current Date Mode Active
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setShowMunshi(false); setMunshiQuery(''); setMunshiResult(null); }} className="text-amber-800 hover:text-amber-300 transition-colors text-sm font-bold">✕</button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-amber-900/20 shrink-0">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="Type name..."
                  value={munshiQuery}
                  onChange={(e) => setMunshiQuery(e.target.value)}
                  className="w-full bg-black/50 border border-amber-800/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-amber-950 focus:outline-none focus:border-amber-500/70 font-mono tracking-wide"
                />
                {munshiSearching ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : munshiQuery ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 text-xs">🔍</span>
                ) : null}
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3">
              {/* Empty state */}
              {!munshiQuery && (
                <div className="text-center py-8 text-slate-600">
                  <div className="text-5xl mb-3 opacity-60">🕵️</div>
                  <div className="text-xs text-amber-900/80 font-mono">Kisi bhi guest ka naam likho</div>
                  <div className="text-[10px] text-slate-700 mt-1">10 saal ki history scan ho gi</div>
                </div>
              )}

              {/* No result */}
              {munshiQuery && !munshiSearching && !munshiResult && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 opacity-50">🫤</div>
                  <div className="text-xs text-slate-600 font-mono">"{munshiQuery}" ka koi record nahi mila</div>
                </div>
              )}

              {/* Digital Receipt */}
              {munshiResult && (
                <>
                  {/* Receipt Card */}
                  <div className="bg-gradient-to-b from-amber-950/40 to-black/40 border border-amber-800/30 rounded-xl p-4 relative overflow-hidden">
                    {/* Top shimmer line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                    {/* Receipt dots */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
                      {Array.from({length: 20}).map((_, i) => <div key={i} className="w-0.5 h-1 bg-amber-900/40" />)}
                    </div>

                    <div className="text-center mb-3 mt-1">
                      <div className="text-[9px] text-amber-800/60 uppercase tracking-[0.3em] font-mono">Guest Record</div>
                      <div className="text-lg font-black text-amber-300 mt-0.5 tracking-wide">{munshiResult.name}</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-black/40 rounded-lg p-2 text-center border border-amber-900/20">
                        <div className="text-amber-400 text-xl font-black">{munshiResult.totalVisits}</div>
                        <div className="text-[8px] text-emerald-600/80 uppercase tracking-wider">Today&apos;s Rows</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 text-center border border-emerald-900/20">
                        <div className="text-emerald-400 text-base font-black">Rs {munshiResult.totalAmount.toLocaleString()}</div>
                        <div className="text-[8px] text-emerald-600/80 uppercase tracking-wider">Today&apos;s Total</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 text-center border border-cyan-900/20">
                        <div className="text-cyan-400 text-sm font-black">
                          {munshiResult.commonCabin !== '--' ? `Cabin ${munshiResult.commonCabin}` : '--'}
                        </div>
                        <div className="text-[8px] text-slate-600 uppercase tracking-wider">Fav. Cabin</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 text-center border border-purple-900/20">
                        <div className="text-purple-400 text-[10px] font-bold leading-tight">Rs {munshiResult.avgAmount.toLocaleString()}</div>
                        <div className="text-[8px] text-slate-600 uppercase tracking-wider">Avg / Visit</div>
                      </div>
                    </div>

                    {/* Date range */}
                    <div className="mt-2.5 flex justify-between text-[8px] font-mono text-amber-900/60 border-t border-amber-900/20 pt-2">
                      <span>First: {munshiResult.firstVisitDate}</span>
                      <span>Last: {munshiResult.lastVisitDate}</span>
                    </div>

                    {/* Bottom dots */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                      {Array.from({length: 20}).map((_, i) => <div key={i} className="w-0.5 h-1 bg-amber-900/40" />)}
                    </div>
                  </div>

                  {/* Today's Entries List */}
                  <div>
                    <div className="text-[8px] text-emerald-700/70 uppercase tracking-[0.25em] mb-1.5 pl-0.5 font-mono">Today&apos;s Entries</div>
                    <div className="space-y-1">
                      {munshiResult.recentVisits.map((v, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/[0.04] text-[10px] font-mono">
                          <div className="text-slate-500">{v.date}</div>
                          <div className="flex items-center gap-2">
                            {v.cabinNumber && <span className="text-cyan-800">#{v.cabinNumber}</span>}
                            <span className="text-emerald-500 font-bold">Rs {v.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── DIGITAL JADUGAR — Single AI Munshi Icon (FIXED BOTTOM RIGHT) ── */}
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="relative w-16 h-16 group">

            {/* Spinning gradient ring */}
            <div
              className="absolute inset-0 rounded-full animate-spin-ring pointer-events-none"
              style={{ background: 'conic-gradient(from 0deg, transparent 0%, #00ffff 25%, #a855f7 50%, #3b82f6 75%, transparent 100%)' }}
            />

            {/* Inner mask — creates ring effect */}
            <div className="absolute inset-[2px] rounded-full bg-black/80 pointer-events-none z-[1]" />

            {/* Glass button */}
            <button
              onClick={() => setShowMunshi(!showMunshi)}
              aria-label="AI Munshi — The Magic Search"
              className={`absolute inset-[3px] rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center z-[2] transition-transform duration-200 group-hover:scale-105 ${munshiSearching ? 'animate-jadugar-glow' : 'animate-jadugar-glow'}`}
            >
              <Wand2
                size={22}
                className={`text-cyan-400 transition-all duration-200 group-hover:text-white ${munshiSearching ? 'animate-pulse' : ''}`}
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,255,0.9)) drop-shadow(0 0 12px rgba(139,0,255,0.6))' }}
              />
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[3]">
              <div className="bg-black/90 border border-cyan-500/40 text-cyan-300 text-[9px] px-2.5 py-1.5 rounded-lg font-mono backdrop-blur-md shadow-xl tracking-wide">
                ✨ AI Munshi — The Magic Search
              </div>
            </div>
          </div>
        </div>

        {/* LEFT SIDE PANEL - CAFE INVENTORY */}
        <AnimatePresence>
          {showCafePanel && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed left-0 top-0 h-full w-80 z-[100] ${t.panelBg} border-r ${t.border} shadow-2xl flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 border-b ${t.border} flex justify-between items-center`}>
                <h2 className={`text-xl font-bold ${t.textAccent}`}>Cafe Inventory</h2>
                <button
                  onClick={() => setShowCafePanel(false)}
                  className={`w-8 h-8 rounded-full ${t.button} flex items-center justify-center`}
                >
                  ✕
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-4">
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Item Name (e.g. Tea, Biscuits)"
                    className={`w-full p-2 mb-2 rounded ${t.panelBg} border ${t.border} text-white`}
                  />
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="Price"
                    className={`w-full p-2 mb-2 rounded ${t.panelBg} border ${t.border} text-white`}
                  />
                  <button
                    onClick={addCafeItem}
                    className={`w-full py-2 rounded ${t.button} text-white font-bold`}
                  >
                    Add Item
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className={`font-bold ${t.textAccent} mb-2`}>Added Items:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cafeItems.map(item => (
                      <div key={item.id} className={`p-2 rounded ${t.panelBg} border ${t.border} flex justify-between`}>
                        <span>{item.name}</span>
                        <span>Rs {item.price}</span>
                      </div>
                    ))}
                    {cafeItems.length === 0 && (
                      <p className="text-slate-500 text-center py-4">No items added yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-4 border-t ${t.border} font-bold text-lg ${t.textHighlight}`}>
                Total Cafe Sale: Rs {totalCafeSale.toFixed(2)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT SIDE PANEL - REPORTS */}
        <AnimatePresence>
          {showReportsPanel && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed right-0 top-0 h-full w-80 z-[100] ${t.panelBg} border-l ${t.border} shadow-2xl flex flex-col`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 border-b ${t.border} flex justify-between items-center`}>
                <h2 className={`text-xl font-bold ${t.textAccent}`}>Reports</h2>
                <button
                  onClick={() => setShowReportsPanel(false)}
                  className={`w-8 h-8 rounded-full ${t.button} flex items-center justify-center`}
                >
                  ✕
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <div className={`p-4 rounded-lg ${t.panelBg} border ${t.border} mb-4`}>
                  <h3 className={`font-bold ${t.textMain} mb-2`}>Section 1 Total</h3>
                  <p className={`text-2xl font-black ${t.textHighlight}`}>Rs {section1Total.toFixed(2)}</p>
                </div>

                <div className={`p-4 rounded-lg ${t.panelBg} border ${t.border} mb-4`}>
                  <h3 className={`font-bold ${t.textMain} mb-2`}>Section 2 Total</h3>
                  <p className={`text-2xl font-black ${t.textHighlight}`}>Rs {section2Total.toFixed(2)}</p>
                </div>
              </div>

              <div className={`p-6 bg-gradient-to-r from-black/40 to-transparent border-t ${t.border} font-bold text-center relative`}>
                {/* Gross Sale */}
                <div className="mb-3">
                  <p className={`text-xs uppercase tracking-widest ${t.textAccent} opacity-70 mb-0.5`}>Gross Sale</p>
                  <p className={`text-2xl font-black ${t.textHighlight}`}>Rs {grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                {/* Inventory Expense */}
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-widest text-red-400 opacity-80 mb-0.5">Inventory Expense</p>
                  <p className="text-2xl font-black text-red-400 drop-shadow">- Rs {totalInventoryCost.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                {/* Divider */}
                <div className={`border-t ${t.border} my-2`} />
                {/* Net Balance */}
                <div>
                  <p className={`text-xs uppercase tracking-widest mb-0.5 ${netBalance < 0 ? 'text-red-400' : 'text-yellow-400'} opacity-80`}>Net Balance</p>
                  <p className={`text-4xl font-black drop-shadow-lg ${netBalance < 0 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                    Rs {netBalance.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                {/* Auto-save indicator */}
                {showSaveIndicator && (
                  <div className="absolute -top-2 -right-2 flex items-center justify-center">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                      <span className="text-xs">✓</span> Saved
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRIGGER BUTTONS FOR THE PANELS */}
        <button
          onClick={() => {
            setShowCafePanel(true);
            setShowReportsPanel(false); // Close reports panel if open
          }}
          className={`fixed left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-[99] ${t.panelBg} border ${t.border} px-2 py-4 rounded-l-lg font-bold ${t.textAccent} rotate-180 writing-vertical origin-center`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          CAFE
        </button>

        <button
          onClick={() => {
            setShowReportsPanel(true);
            setShowCafePanel(false); // Close cafe panel if open
          }}
          className={`fixed right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-[99] ${t.panelBg} border ${t.border} px-2 py-4 rounded-r-lg font-bold ${t.textAccent} writing-vertical origin-center`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          REPORTS
        </button>
      </div>
    </div>
    </>
  );
}
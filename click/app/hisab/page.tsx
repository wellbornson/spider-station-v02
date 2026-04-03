'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Calculator, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Plus, Trash2, ArrowLeft,
  Receipt, Banknote, CalendarDays,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────
interface PayoutEntry {
  id: number;
  payoutName: string;
  amountPaid: number;
}

interface DayRecord {
  day: number;
  payouts: PayoutEntry[];
}

interface HisabMonthData {
  records: DayRecord[];
  openingBalance: number;
}

// ─────────────────────────────────────────────────────────────
//  Storage helpers
// ─────────────────────────────────────────────────────────────
const hisabKey = (y: number, m: number) => `HISAB_DATA_${y}-${m}`;

function loadMonth(y: number, m: number): HisabMonthData {
  if (typeof window === 'undefined') return { records: [], openingBalance: 0 };
  try {
    const raw = localStorage.getItem(hisabKey(y, m));
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt data — fall through */ }
  return { records: [], openingBalance: 0 };
}

function saveMonth(y: number, m: number, data: HisabMonthData) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(hisabKey(y, m), JSON.stringify(data)); } catch { /* quota */ }
}

interface DailySalesResult {
  values: Record<number, number>;
  synced: Set<number>;   // days where CLICK_NET_SALES (Report Panel) data was used
}

/** Read daily net sales (gross − inventory) for a given month.
 *  PRIMARY: CLICK_NET_SALES (written by Report Panel whenever netBalance changes).
 *  FALLBACK: raw user-amount sum from masterData (no inventory deduction). */
function getDailySales(y: number, m: number): DailySalesResult {
  const values: Record<number, number> = {};
  const synced = new Set<number>();
  if (typeof window === 'undefined') return { values, synced };

  let netSales: Record<string, number> = {};
  try {
    const raw = localStorage.getItem('CLICK_NET_SALES');
    if (raw) netSales = JSON.parse(raw);
  } catch { /* corrupt — fall through */ }

  try {
    const raw = localStorage.getItem('CLICK_CAFE_DB_V1');
    const md = raw ? (JSON.parse(raw)?.masterData ?? {}) : {};
    for (let d = 1; d <= 31; d++) {
      const dateKey = `${y}-${m}-${d}`;
      if (netSales[dateKey] !== undefined) {
        if (netSales[dateKey] > 0) { values[d] = netSales[dateKey]; synced.add(d); }
      } else {
        const day = md[dateKey];
        if (day?.users) {
          const total = (day.users as any[]).reduce((s: number, u: any) => s + (Number(u.amount) || 0), 0);
          if (total > 0) values[d] = total;
        }
      }
    }
  } catch { /* parse error */ }
  return { values, synced };
}

/** Compute the net closing balance for any given month */
function computeClosing(y: number, m: number): number {
  const data = loadMonth(y, m);
  const { values: sales } = getDailySales(y, m);
  const totalSale = Object.values(sales).reduce((s, v) => s + v, 0);
  const totalPaid = data.records.reduce(
    (s, r) => s + r.payouts.reduce((ps, p) => ps + p.amountPaid, 0), 0
  );
  return data.openingBalance + totalSale - totalPaid;
}

/** Get previous month's closing balance for carry-forward */
function prevMonthClosing(y: number, m: number): number {
  let py = y, pm = m - 1;
  if (pm < 0) { pm = 11; py--; }
  return computeClosing(py, pm);
}

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────
export default function HisabPage() {
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [data, setData]         = useState<HisabMonthData>({ records: [], openingBalance: 0 });
  const [sales, setSales]       = useState<Record<number, number>>({});
  const [syncedDays, setSyncedDays] = useState<Set<number>>(new Set());
  const [animKey, setAnimKey]   = useState(0);
  const [balancePulseKey, setBalancePulseKey] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const todayActual = new Date();
  const isCurrentMonth = year === todayActual.getFullYear() && month0 === todayActual.getMonth();
  const todayDay = todayActual.getDate();

  // ── Load month data ──────────────────────────────────────
  useEffect(() => {
    const loaded = loadMonth(year, month0);
    // Auto-populate opening balance from previous month if not overridden
    if (!loaded.openingBalance) {
      const carry = prevMonthClosing(year, month0);
      if (carry !== 0) loaded.openingBalance = carry;
    }
    setData(loaded);
    const { values, synced } = getDailySales(year, month0);
    setSales(values);
    setSyncedDays(synced);
    setAnimKey(k => k + 1);
    mounted.current = false; // mark as fresh load — skip first auto-save
  }, [year, month0]);

  // ── Debounced auto-save ──────────────────────────────────
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveMonth(year, month0, data), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, year, month0]);

  // ── Helper: refresh sales from storage ──────────────────────
  const refreshSales = useCallback(() => {
    const { values, synced } = getDailySales(year, month0);
    setSales(values);
    setSyncedDays(synced);
  }, [year, month0]);

  // ── Cross-tab: storage event ─────────────────────────────────
  useEffect(() => {
    const handle = (e: StorageEvent) => {
      if (e.key === 'CLICK_NET_SALES' || e.key === 'CLICK_CAFE_DB_V1') refreshSales();
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, [refreshSales]);

  // ── Same-window: custom event from Report Panel ──────────────
  useEffect(() => {
    const handle = () => refreshSales();
    window.addEventListener('click-net-sales-updated', handle);
    return () => window.removeEventListener('click-net-sales-updated', handle);
  }, [refreshSales]);

  // ── Same-tab: refresh when tab becomes visible ───────────────
  useEffect(() => {
    const handle = () => { if (document.visibilityState === 'visible') refreshSales(); };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [refreshSales]);

  // ── Month navigation ─────────────────────────────────────
  const prevMonth = () => {
    if (month0 === 0) { setYear(y => y - 1); setMonth0(11); }
    else setMonth0(m => m - 1);
  };
  const nextMonth = () => {
    if (month0 === 11) { setYear(y => y + 1); setMonth0(0); }
    else setMonth0(m => m + 1);
  };

  // ── Payout mutations ─────────────────────────────────────
  const addPayout = useCallback((day: number) => {
    setData(prev => {
      const records = prev.records.map(r => ({ ...r, payouts: [...r.payouts] }));
      let rec = records.find(r => r.day === day);
      if (!rec) { rec = { day, payouts: [] }; records.push(rec); }
      rec.payouts.push({ id: Date.now(), payoutName: '', amountPaid: 0 });
      return { ...prev, records };
    });
  }, []);

  const updatePayout = useCallback((
    day: number, pid: number, field: 'payoutName' | 'amountPaid', val: string | number
  ) => {
    setData(prev => ({
      ...prev,
      records: prev.records.map(r => {
        if (r.day !== day) return r;
        return { ...r, payouts: r.payouts.map(p => p.id === pid ? { ...p, [field]: val } : p) };
      }),
    }));
  }, []);

  const removePayout = useCallback((day: number, pid: number) => {
    setData(prev => ({
      ...prev,
      records: prev.records
        .map(r => r.day !== day ? r : { ...r, payouts: r.payouts.filter(p => p.id !== pid) })
        .filter(r => r.payouts.length > 0),
    }));
  }, []);

  // ── Computed totals ──────────────────────────────────────
  const totalSale = useMemo(() => Object.values(sales).reduce((s, v) => s + v, 0), [sales]);
  const totalPaid = useMemo(
    () => data.records.reduce((s, r) => s + r.payouts.reduce((ps, p) => ps + p.amountPaid, 0), 0),
    [data.records]
  );
  const netBalance = data.openingBalance + totalSale - totalPaid;

  // ── Pulse the Net Balance card whenever it changes ───────────
  useEffect(() => { setBalancePulseKey(k => k + 1); }, [netBalance]);

  /** Running balance per day */
  const runningBal = useMemo(() => {
    let run = data.openingBalance;
    const res: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      run += (sales[d] || 0);
      const rec = data.records.find(r => r.day === d);
      if (rec) run -= rec.payouts.reduce((s, p) => s + p.amountPaid, 0);
      res[d] = run;
    }
    return res;
  }, [sales, data.openingBalance, data.records, daysInMonth]);

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gradient-to-br from-[#050a1a] via-[#0a0f2e] to-[#060d1f] text-white font-sans flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 shrink-0">
        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-sm group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-mono">Spider Station</span>
        </Link>
        <div className="flex items-center gap-2">
          <Calculator
            size={20}
            className="text-cyan-400"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.8))' }}
          />
          <h1 className="text-lg font-black tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
            Hisab
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-slate-600 font-mono tabular-nums">{year}</div>
          {syncedDays.size > 0 && (
            <span className="flex items-center gap-1 bg-green-900/40 border border-green-700/30 text-green-500 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              {syncedDays.size}d synced
            </span>
          )}
        </div>
      </header>

      {/* ── Month Picker ── */}
      <div className="flex items-center justify-center gap-8 py-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={17} />
        </button>
        <div className="text-center min-w-[160px]">
          <div className="text-xl font-black tracking-[0.2em] text-white">{MONTHS[month0].toUpperCase()}</div>
          <div className="text-[9px] text-slate-600 font-mono">{daysInMonth} days</div>
        </div>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="px-3 pt-2 pb-1.5 shrink-0 space-y-1.5">

        {/* 3 Main Glassmorphism Cards */}
        <div className="grid grid-cols-3 gap-2">

          {/* Total Sale — Neon Green (Live Sync) */}
          <div className="bg-black/30 backdrop-blur-xl border border-green-500/20 rounded-xl p-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.07] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={10} className="text-green-400 shrink-0" />
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold leading-none">Total Sale</span>
                {syncedDays.size > 0 && (
                  <span className="ml-auto text-[5px] bg-green-900/50 border border-green-700/30 text-green-400 px-1 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse inline-block" />live
                  </span>
                )}
              </div>
              <div className="text-lg font-black text-green-400 tabular-nums leading-none"
                style={{ textShadow: '0 0 16px rgba(74,222,128,0.7)' }}>
                Rs {totalSale.toLocaleString()}
              </div>
              <div className="text-[7px] text-slate-700 mt-1 font-mono">{Object.keys(sales).length} days</div>
            </div>
          </div>

          {/* Total Payouts — Soft Neon Red */}
          <div className="bg-black/30 backdrop-blur-xl border border-red-500/20 rounded-xl p-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.07] to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown size={10} className="text-red-400 shrink-0" />
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold leading-none">Payouts</span>
              </div>
              <div className="text-lg font-black text-red-400 tabular-nums leading-none"
                style={{ textShadow: '0 0 16px rgba(248,113,113,0.6)' }}>
                Rs {totalPaid.toLocaleString()}
              </div>
              <div className="text-[7px] text-slate-700 mt-1 font-mono">
                {data.records.reduce((s, r) => s + r.payouts.length, 0)} entries
              </div>
            </div>
          </div>

          {/* Net Balance — Glowing Gold (with pulse on change) */}
          <div className={`bg-black/30 backdrop-blur-xl border rounded-xl p-2 relative overflow-hidden ${netBalance >= 0 ? 'border-yellow-500/25' : 'border-red-600/30'}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${netBalance >= 0 ? 'from-yellow-500/[0.07]' : 'from-red-500/[0.07]'} to-transparent pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <Wallet size={10} className={`shrink-0 ${netBalance >= 0 ? 'text-yellow-400' : 'text-red-400'}`} />
                <span className="text-[7px] text-slate-500 uppercase tracking-widest font-bold leading-none">Net Balance</span>
              </div>
              <div
                key={balancePulseKey}
                className={`text-lg font-black tabular-nums leading-none ${netBalance >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                style={{
                  textShadow: netBalance >= 0
                    ? '0 0 16px rgba(250,204,21,0.8)' : '0 0 16px rgba(248,113,113,0.7)',
                  animation: 'hisabBalancePulse 0.5s ease',
                }}
              >
                {netBalance >= 0 ? '+' : '-'}Rs {Math.abs(netBalance).toLocaleString()}
              </div>
              <div className="text-[7px] text-slate-700 mt-1 font-mono">
                {netBalance >= 0 ? 'carry fwd' : '⚠ deficit'}
              </div>
            </div>
          </div>
        </div>

        {/* Opening Balance — minimal strip */}
        <div className="bg-black/20 border border-yellow-900/20 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[7px] text-slate-600 uppercase tracking-widest font-bold whitespace-nowrap">Opening Balance</span>
            <span className="text-sm font-black text-yellow-500/80 tabular-nums">Rs {data.openingBalance.toLocaleString()}</span>
          </div>
          <input
            type="number"
            value={data.openingBalance || ''}
            onChange={e => setData(prev => ({ ...prev, openingBalance: Number(e.target.value) || 0 }))}
            placeholder="Override..."
            className="shrink-0 w-28 bg-black/30 border border-yellow-900/40 rounded-md px-2 py-0.5 text-yellow-400/80 text-[10px] font-mono focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 placeholder-yellow-950 text-right"
          />
        </div>
      </div>

      {/* ── Scrollable area: table header (sticky) + rows ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* Table Header — sticky inside scroll area */}
        <div className="sticky top-0 z-20 px-3 bg-[#060d1f]/95 backdrop-blur-md border-b border-white/[0.07] shrink-0">
          <div className="grid gap-2 px-4 py-2 text-[8px] uppercase tracking-widest font-bold"
            style={{ gridTemplateColumns: '2.8rem 1fr 1.1fr 0.9fr 0.9fr 1.8rem' }}>
            <div className="flex items-center gap-1 text-slate-600 justify-center">
              <CalendarDays size={9} />
              <span>Day</span>
            </div>
            <div className="flex items-center gap-1 text-green-700">
              <TrendingUp size={9} />
              <span>Daily Sale</span>
              <span className="text-[5px] bg-green-900/40 text-green-600 border border-green-800/30 px-1 py-0.5 rounded font-bold uppercase tracking-wider ml-0.5 flex items-center gap-0.5">
                🔒 sync
              </span>
            </div>
            <div className="flex items-center gap-1 text-red-900">
              <Receipt size={9} />
              <span>Payout To</span>
            </div>
            <div className="flex items-center gap-1 text-red-900">
              <Banknote size={9} />
              <span>Amount</span>
            </div>
            <div className="flex items-center gap-1 text-cyan-900 justify-end">
              <Wallet size={9} />
              <span>Balance</span>
            </div>
            <div />
          </div>
        </div>

      {/* ── Table Rows ── */}
      <div key={animKey} className="px-3 pb-24 space-y-1.5 pt-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day, idx) => {
          const sale    = sales[day] || 0;
          const rec     = data.records.find(r => r.day === day);
          const payouts = rec?.payouts ?? [];
          const bal     = runningBal[day] ?? 0;
          const hasSale = sale > 0;
          const isSynced = syncedDays.has(day);
          const isToday  = isCurrentMonth && day === todayDay;

          return (
            <div
              key={day}
              className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${
                isToday && hasSale
                  ? 'border-green-500/40 bg-green-950/[0.12] shadow-[0_0_16px_rgba(74,222,128,0.08)]'
                  : hasSale
                    ? 'border-green-900/30 bg-green-950/[0.06]'
                    : 'border-white/[0.05] bg-white/[0.015]'
              }`}
              style={{ animation: `hisabFadeIn 0.22s ease ${Math.min(idx * 0.015, 0.35)}s both` }}
            >
              {/* ── Primary day row ── */}
              <div
                className={`grid gap-2 items-center px-4 py-4 ${
                  hasSale ? 'border-l-[3px] border-green-500/50' : 'border-l-[3px] border-transparent'
                }`}
                style={{ gridTemplateColumns: '2.8rem 1fr 1.1fr 0.9fr 0.9fr 1.8rem' }}
              >
                {/* Day number */}
                <div className={`text-center font-mono font-black tabular-nums ${
                  isToday ? 'text-green-400 text-base' : hasSale ? 'text-slate-400 text-sm' : 'text-slate-700 text-sm'
                }`}>
                  {String(day).padStart(2, '0')}
                  {isToday && <div className="text-[6px] text-green-500/70 font-bold tracking-widest uppercase leading-none mt-0.5">today</div>}
                </div>

                {/* ── Daily Sale — KEY HIGHLIGHT, read-only, Report Panel synced ── */}
                <div
                  className={`font-black tabular-nums select-none flex items-center gap-1.5 min-w-0 ${
                    hasSale
                      ? isSynced ? 'text-green-400 text-base' : 'text-emerald-400 text-base'
                      : 'text-slate-700 text-sm'
                  }`}
                  style={hasSale ? {
                    textShadow: isSynced
                      ? '0 0 16px rgba(74,222,128,0.9), 0 0 32px rgba(74,222,128,0.4)'
                      : '0 0 12px rgba(52,211,153,0.6)',
                  } : {}}
                  title={isSynced ? 'Report Panel se auto-synced — Read Only' : 'Raw sale data — Read Only'}
                >
                  {hasSale ? (
                    <>
                      <span className="truncate">Rs {sale.toLocaleString()}</span>
                      {isSynced && isToday && (
                        <span className="shrink-0 text-[6px] bg-green-900/70 text-green-400 border border-green-600/40 px-1.5 py-0.5 rounded-full font-bold tracking-widest uppercase leading-none animate-pulse">LIVE</span>
                      )}
                      {isSynced && !isToday && (
                        <span className="shrink-0 text-[7px] text-green-700/50 leading-none">⚡</span>
                      )}
                    </>
                  ) : <span className="text-slate-800">—</span>}
                </div>

                {/* ── First payout inline ── */}
                {payouts.length > 0 ? (
                  <>
                    <input
                      value={payouts[0].payoutName}
                      onChange={e => updatePayout(day, payouts[0].id, 'payoutName', e.target.value)}
                      placeholder="Payout to..."
                      className="bg-transparent border border-transparent border-b-red-900/30 text-red-400 text-sm font-mono focus:outline-none focus:border-b-cyan-500 focus:ring-0 placeholder-slate-800 w-full px-0 py-0.5 transition-colors duration-150 hisab-input"
                    />
                    <input
                      type="number"
                      value={payouts[0].amountPaid || ''}
                      onChange={e => updatePayout(day, payouts[0].id, 'amountPaid', Number(e.target.value))}
                      placeholder="0"
                      className="bg-transparent border border-transparent border-b-red-900/30 text-red-400 text-sm font-black font-mono focus:outline-none focus:border-b-cyan-500 placeholder-slate-800 w-full px-0 py-0.5 tabular-nums transition-colors duration-150 hisab-input"
                    />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => addPayout(day)}
                      className="text-left text-slate-800 hover:text-red-600/50 text-xs font-mono transition-colors"
                    >
                      + add payout
                    </button>
                    <div className="text-slate-800 text-sm font-mono">—</div>
                  </>
                )}

                {/* ── Running Balance ── */}
                <div
                  className={`text-sm font-black tabular-nums text-right truncate transition-all duration-300 ${bal >= 0 ? 'text-cyan-400' : 'text-red-400'}`}
                  style={{ textShadow: bal >= 0 ? '0 0 10px rgba(34,211,238,0.5)' : '0 0 10px rgba(248,113,113,0.5)' }}
                >
                  {bal !== 0 ? `${bal >= 0 ? '+' : ''}${bal.toLocaleString()}` : <span className="text-slate-700">0</span>}
                </div>

                {/* ── Add payout button ── */}
                <button
                  onClick={() => addPayout(day)}
                  title="Add payout entry"
                  className="text-slate-700 hover:text-green-400 transition-colors flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* ── Extra payout rows (idx 1+) ── */}
              {payouts.slice(1).map(p => (
                <div
                  key={p.id}
                  className="grid gap-2 items-center px-4 py-2.5 bg-black/20 border-t border-white/[0.04]"
                  style={{ gridTemplateColumns: '2.8rem 1fr 1.1fr 0.9fr 0.9fr 1.8rem' }}
                >
                  <div />
                  <div />
                  <input
                    value={p.payoutName}
                    onChange={e => updatePayout(day, p.id, 'payoutName', e.target.value)}
                    placeholder="Payout to..."
                    className="bg-transparent border-b border-red-900/20 text-red-400/70 text-xs font-mono focus:outline-none focus:border-b-cyan-500 placeholder-slate-800 w-full transition-colors hisab-input"
                  />
                  <input
                    type="number"
                    value={p.amountPaid || ''}
                    onChange={e => updatePayout(day, p.id, 'amountPaid', Number(e.target.value))}
                    placeholder="0"
                    className="bg-transparent border-b border-red-900/20 text-red-400/70 text-xs font-mono focus:outline-none focus:border-b-cyan-500 placeholder-slate-800 w-full tabular-nums transition-colors hisab-input"
                  />
                  <div />
                  <button
                    onClick={() => removePayout(day, p.id)}
                    className="text-slate-800 hover:text-red-500 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {/* ── Remove first payout ── */}
              {payouts.length > 0 && (
                <div className="flex justify-end px-4 pb-2 pt-0 gap-3">
                  <button
                    onClick={() => removePayout(day, payouts[0].id)}
                    className="flex items-center gap-0.5 text-[8px] font-mono text-slate-800 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={7} /> clear
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Month Closing Summary ── */}
        <div className="mt-4 p-5 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/[0.08]">
          <div className="text-[9px] text-slate-600 uppercase tracking-[0.3em] font-bold mb-4 text-center">
            {MONTHS[month0]} {year} — Closing Summary
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-400 text-xl font-black tabular-nums" style={{ textShadow: '0 0 16px rgba(74,222,128,0.6)' }}>
                Rs {totalSale.toLocaleString()}
              </div>
              <div className="text-[8px] text-slate-600 uppercase tracking-wider mt-1.5">Total Sale</div>
            </div>
            <div>
              <div className="text-red-400 text-xl font-black tabular-nums" style={{ textShadow: '0 0 16px rgba(248,113,113,0.5)' }}>
                Rs {totalPaid.toLocaleString()}
              </div>
              <div className="text-[8px] text-slate-600 uppercase tracking-wider mt-1.5">Total Paid</div>
            </div>
            <div>
              <div className={`text-xl font-black tabular-nums ${netBalance >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                style={{ textShadow: netBalance >= 0 ? '0 0 16px rgba(250,204,21,0.6)' : '0 0 16px rgba(248,113,113,0.5)' }}>
                Rs {Math.abs(netBalance).toLocaleString()}
              </div>
              <div className="text-[8px] text-slate-600 uppercase tracking-wider mt-1.5">
                {netBalance >= 0 ? '✅ Carry Forward' : '⚠ Deficit'}
              </div>
            </div>
          </div>
        </div>
      </div>{/* end table rows */}
      </div>{/* end scrollable area */}

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes hisabFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hisabBalancePulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .hisab-input:focus {
          border-bottom-color: rgba(34,211,238,0.7) !important;
          box-shadow: 0 2px 0 0 rgba(34,211,238,0.3);
        }
        /* Neon cyan scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34,211,238,0.35);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34,211,238,0.6);
        }
        /* Firefox */
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(34,211,238,0.35) transparent; }
      `}</style>
    </div>
  );
}

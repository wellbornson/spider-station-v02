'use client';

// ─────────────────────────────────────────────
//  SPIDER STATION — Smart Munshi Search Engine
//  10-year deep search over all stored records
// ─────────────────────────────────────────────

export interface MunshiRecord {
  name: string;
  cabinNumber: string;
  timeIn: string;
  timeOut: string;
  amount: number;
  date: string;      // Display e.g. "15 Apr 2026"
  dateKey: string;   // Storage key e.g. "2026-3-15"
  monthKey: string;  // e.g. "2026-04"
}

export interface MunshiSearchResult {
  name: string;
  totalVisits: number;
  totalAmount: number;
  avgAmount: number;
  lastVisitDate: string;
  firstVisitDate: string;
  commonCabin: string;
  recentVisits: MunshiRecord[];
}

// ── Storage key format ──────────────────────────────────────────────────────
// Monthly index:  MUNSHI_RECORDS_2026-04
// masterData key: 2026-3-15  (month is 0-indexed in JS Date)

function toDisplayDate(year: number, month0: number, day: number): string {
  try {
    return new Date(year, month0, day).toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return `${day}/${month0 + 1}/${year}`;
  }
}

function toMonthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`;
}

// ── Append a finalized record to the monthly Munshi index ──────────────────
export function appendMunshiRecord(user: any, dateKey: string): void {
  if (typeof window === 'undefined') return;
  if (!user?.name?.trim() || !user?.amount) return;

  const parts = dateKey.split('-').map(Number);
  if (parts.length < 3) return;
  const [year, month0, day] = parts;

  const storageKey = `MUNSHI_RECORDS_${toMonthKey(year, month0)}`;
  let existing: MunshiRecord[] = [];
  try {
    existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch { existing = []; }

  // Deduplicate: same day + same name + same timeIn
  const alreadyIn = existing.some(
    r => r.dateKey === dateKey && r.name === user.name && r.timeIn === user.timeIn
  );
  if (alreadyIn) return;

  const record: MunshiRecord = {
    name: user.name,
    cabinNumber: user.cabinNumber || '',
    timeIn: user.timeIn || '',
    timeOut: user.timeOut || '',
    amount: Number(user.amount) || 0,
    date: toDisplayDate(year, month0, day),
    dateKey,
    monthKey: toMonthKey(year, month0),
  };

  existing.push(record);
  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch { /* storage full — silently skip */ }
}

// ── Deep 10-year search ─────────────────────────────────────────────────────
export function searchHistory(name: string): MunshiSearchResult | null {
  if (typeof window === 'undefined' || !name.trim()) return null;

  const target = name.trim().toLowerCase();
  const records: MunshiRecord[] = [];
  const seen = new Set<string>(); // dedupe key: dateKey|name|timeIn

  // ── Scan masterData (primary — has all historical saved days) ──
  try {
    const raw = localStorage.getItem('CLICK_CAFE_DB_V1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const md: { [key: string]: any } = parsed.masterData || {};

      Object.keys(md).forEach(dateKey => {
        const dayData = md[dateKey];
        if (!dayData?.users) return;

        const parts = dateKey.split('-').map(Number);
        if (parts.length < 3) return;
        const [year, month0, day] = parts;

        (dayData.users as any[]).forEach(u => {
          if (!u?.name?.trim()) return;
          if (u.name.trim().toLowerCase() !== target) return;
          if (!u.amount || Number(u.amount) === 0) return;

          const dedupeKey = `${dateKey}|${u.name}|${u.timeIn || ''}`;
          if (seen.has(dedupeKey)) return;
          seen.add(dedupeKey);

          records.push({
            name: u.name,
            cabinNumber: u.cabinNumber || '',
            timeIn: u.timeIn || '',
            timeOut: u.timeOut || '',
            amount: Number(u.amount) || 0,
            date: toDisplayDate(year, month0, day),
            dateKey,
            monthKey: toMonthKey(year, month0),
          });
        });
      });

      // Also scan archivedData
      const archived: any[] = parsed.archivedData || [];
      archived.forEach(archive => {
        const dateKey: string = archive.date || '';
        if (!dateKey) return;
        const parts = dateKey.split('-').map(Number);
        if (parts.length < 3) return;
        const [year, month0, day] = parts;

        (archive.users as any[] || []).forEach(u => {
          if (!u?.name?.trim()) return;
          if (u.name.trim().toLowerCase() !== target) return;
          if (!u.amount || Number(u.amount) === 0) return;

          const dedupeKey = `${dateKey}|${u.name}|${u.timeIn || ''}`;
          if (seen.has(dedupeKey)) return;
          seen.add(dedupeKey);

          records.push({
            name: u.name,
            cabinNumber: u.cabinNumber || '',
            timeIn: u.timeIn || '',
            timeOut: u.timeOut || '',
            amount: Number(u.amount) || 0,
            date: toDisplayDate(year, month0, day),
            dateKey,
            monthKey: toMonthKey(year, month0),
          });
        });
      });
    }
  } catch { /* parse error — continue to secondary source */ }

  // ── Scan MUNSHI_RECORDS_* monthly index (secondary — catches recent finalizations) ──
  try {
    Object.keys(localStorage).forEach(key => {
      if (!key.startsWith('MUNSHI_RECORDS_')) return;
      let monthRecords: MunshiRecord[] = [];
      try { monthRecords = JSON.parse(localStorage.getItem(key) || '[]'); } catch { return; }

      monthRecords.forEach(r => {
        if (!r?.name) return;
        if (r.name.trim().toLowerCase() !== target) return;

        const dedupeKey = `${r.dateKey}|${r.name}|${r.timeIn || ''}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        records.push(r);
      });
    });
  } catch { /* localStorage iteration error */ }

  if (records.length === 0) return null;

  // ── Sort descending by date ──
  records.sort((a, b) => {
    const parseKey = (k: string) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    };
    return parseKey(b.dateKey) - parseKey(a.dateKey);
  });

  // ── Aggregate stats ──
  const totalVisits = records.length;
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const avgAmount = Math.round(totalAmount / totalVisits);
  const lastVisitDate = records[0].date;
  const firstVisitDate = records[records.length - 1].date;

  // Most common cabin
  const cabinCounts: { [k: string]: number } = {};
  records.forEach(r => {
    if (r.cabinNumber?.trim()) {
      cabinCounts[r.cabinNumber] = (cabinCounts[r.cabinNumber] || 0) + 1;
    }
  });
  const commonCabin =
    Object.keys(cabinCounts).sort((a, b) => cabinCounts[b] - cabinCounts[a])[0] || '--';

  return {
    name: records[0].name,
    totalVisits,
    totalAmount,
    avgAmount,
    lastVisitDate,
    firstVisitDate,
    commonCabin,
    recentVisits: records.slice(0, 10),
  };
}

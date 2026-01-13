"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { User, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkerSheet() {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await db.getAllWorkerEntries();
        // Sort by date in descending order (most recent first)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(sortedData);
      } catch (error) {
        // Error fetching worker entries
      }
    };

    fetchEntries();

    // Set up a simple interval to refresh data periodically
    const interval = setInterval(fetchEntries, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'salary' | 'advance'>('salary');

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !name) return;
    await db.addWorkerEntry({
      date: new Date().toISOString(),
      name,
      type,
      amount: parseFloat(amount),
      timestamp: Date.now()
    });
    setAmount("");
  };

  const calculateBalance = (workerName: string) => {
    if (!entries) return 0;
    const workerEntries = entries.filter(e => e.name === workerName);
    const salary = workerEntries.filter(e => e.type === 'salary').reduce((acc, c) => acc + c.amount, 0);
    const advances = workerEntries.filter(e => e.type === 'advance').reduce((acc, c) => acc + c.amount, 0);
    return salary - advances;
  };

  // Unique names for balance cards
  const uniqueNames = Array.from(new Set(entries?.map(e => e.name) || []));

  return (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {uniqueNames.map(worker => (
          <div key={worker} className="min-w-[150px] glass p-4 rounded-xl shadow-3d bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
              <User size={40} />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{worker}</p>
            <p className="text-xl font-bold text-neon-pink mt-1">${calculateBalance(worker).toFixed(2)}</p>
            <p className="text-[10px] text-gray-500">Payable Balance</p>
          </div>
        ))}
      </div>

      <form onSubmit={addEntry} className="glass p-4 rounded-xl shadow-3d space-y-3">
        <div className="flex gap-2">
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none"
            placeholder="Worker Name"
          />
          <input 
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-24 bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none"
            placeholder="$ Amount"
          />
        </div>
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={() => setType('salary')}
            className={`flex-1 p-2 rounded text-sm font-bold transition-all ${type === 'salary' ? 'bg-neon-cyan text-black shadow-neon' : 'bg-white/5 text-gray-400'}`}
          >
            Salary
          </button>
          <button 
            type="button" 
            onClick={() => setType('advance')}
            className={`flex-1 p-2 rounded text-sm font-bold transition-all ${type === 'advance' ? 'bg-neon-pink text-black shadow-neon' : 'bg-white/5 text-gray-400'}`}
          >
            Advance
          </button>
        </div>
        <button type="submit" className="w-full bg-white/10 p-2 rounded hover:bg-white/20 text-sm font-bold transition-colors">
          Record Transaction
        </button>
      </form>

      <div className="glass rounded-xl overflow-hidden shadow-3d">
        {entries?.map((entry) => (
          <div key={entry.id} className="flex justify-between items-center p-3 border-b border-gray-800 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              {entry.type === 'salary' ? <ArrowUpCircle className="text-neon-cyan" size={18} /> : <ArrowDownCircle className="text-neon-pink" size={18} />}
              <div>
                <p className="font-bold text-sm">{entry.name}</p>
                <p className="text-[10px] text-gray-500">{format(new Date(entry.date), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            <span className={`font-mono font-bold ${entry.type === 'salary' ? 'text-neon-cyan' : 'text-neon-pink'}`}>
              {entry.type === 'salary' ? '+' : '-'}${entry.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

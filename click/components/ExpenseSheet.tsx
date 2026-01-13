"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { PieChart, Zap, Home, Wrench, MoreHorizontal, Plus } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { name: 'Rent', icon: Home, color: 'text-purple-400', bg: 'bg-purple-400/20' },
  { name: 'Bills', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  { name: 'Maintenance', icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-400/20' },
  { name: 'Others', icon: MoreHorizontal, color: 'text-gray-400', bg: 'bg-gray-400/20' },
] as const;

export default function ExpenseSheet() {
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await db.getAllExpenseEntries();
        // Sort by date in descending order (most recent first)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(sortedData);
      } catch (error) {
        // Error fetching expense entries
      }
    };

    fetchExpenses();

    // Set up a simple interval to refresh data periodically
    const interval = setInterval(fetchExpenses, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]['name']>('Others');

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;
    await db.addExpenseEntry({
      date: new Date().toISOString(),
      category,
      description: desc,
      amount: parseFloat(amount),
      timestamp: Date.now()
    });
    setDesc("");
    setAmount("");
  };

  const getCategoryTotal = (cat: string) => 
    expenses?.filter(e => e.category === cat).reduce((acc, c) => acc + c.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(cat => (
          <div key={cat.name} className={`p-3 rounded-xl border border-white/5 ${cat.bg} flex flex-col items-center justify-center card-3d`}>
            <cat.icon className={`mb-1 ${cat.color}`} size={20} />
            <span className="text-[10px] uppercase font-bold opacity-70">{cat.name}</span>
            <span className="font-bold text-lg">${getCategoryTotal(cat.name).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <form onSubmit={addExpense} className="glass p-4 rounded-xl shadow-3d space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setCategory(cat.name)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                category === cat.name ? `${cat.bg} ${cat.color} ring-1 ring-white/50` : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input 
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="flex-1 bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none"
            placeholder="Expense Description"
          />
          <input 
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-24 bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none"
            placeholder="$"
          />
        </div>
        <button type="submit" className="w-full bg-red-500/80 hover:bg-red-500 text-white p-2 rounded font-bold text-sm transition-colors shadow-neon">
          Add Expense
        </button>
      </form>

      <div className="glass rounded-xl overflow-hidden shadow-3d">
        {expenses?.map((entry) => {
          const CatIcon = CATEGORIES.find(c => c.name === entry.category)?.icon || MoreHorizontal;
          return (
            <div key={entry.id} className="flex justify-between items-center p-3 border-b border-gray-800 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-white/5`}>
                  <CatIcon size={14} className="text-gray-300" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-200">{entry.description}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(entry.date), 'MMM dd')}</p>
                </div>
              </div>
              <span className="font-mono font-bold text-red-400">
                -${entry.amount.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  );
}

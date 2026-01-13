"use client";
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function UserSheet({ onSelectionChange }: { onSelectionChange: (sum: number) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await db.getAllUserEntries();
        // Sort by date in descending order (most recent first)
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setUsers(sortedData);
      } catch (error) {
        // Error fetching user entries
      }
    };

    fetchUsers();

    // Set up a simple interval to refresh data periodically
    const interval = setInterval(fetchUsers, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!users) return;
    const sum = users
      .filter(u => u.id && selectedIds.includes(u.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
    onSelectionChange(sum);
  }, [selectedIds, users, onSelectionChange]);

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newDesc) return;
    await db.addUserEntry({
      date: new Date().toISOString(),
      description: newDesc,
      amount: parseFloat(newAmount),
      timestamp: Date.now()
    });
    setNewDesc("");
    setNewAmount("");
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={addEntry} className="glass p-4 rounded-xl flex gap-2 items-end shadow-3d">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Description</label>
          <input 
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none transition-all"
            placeholder="e.g. Latte x2"
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-gray-400">Amount</label>
          <input 
            type="number"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            className="w-full bg-black/20 border border-neon-cyan/30 rounded p-2 text-sm focus:border-neon-cyan outline-none transition-all"
            placeholder="$0.00"
          />
        </div>
        <button type="submit" className="bg-neon-cyan text-black p-2 rounded-lg hover:bg-neon-pink transition-colors animate-bounce-slow hover:animate-none">
          <Plus size={20} />
        </button>
      </form>

      <div className="glass rounded-xl overflow-hidden shadow-3d max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-12 gap-2 p-3 border-b border-gray-700 font-bold text-neon-cyan text-xs uppercase tracking-wider sticky top-0 bg-[#020617]/90 backdrop-blur">
          <div className="col-span-3">Date</div>
          <div className="col-span-6">Description</div>
          <div className="col-span-3 text-right">Amount</div>
        </div>
        {users?.map((user) => (
          <div 
            key={user.id}
            onClick={() => user.id && toggleSelection(user.id)}
            className={`grid grid-cols-12 gap-2 p-3 border-b border-gray-800 text-sm cursor-pointer transition-colors ${
              user.id && selectedIds.includes(user.id) ? 'bg-neon-cyan/20' : 'hover:bg-white/5'
            }`}
          >
            <div className="col-span-3 text-gray-400 text-xs flex items-center">
              {format(new Date(user.date), 'MMM dd, HH:mm')}
            </div>
            <div className="col-span-6 truncate">{user.description}</div>
            <div className="col-span-3 text-right font-mono text-neon-yellow">
              ${user.amount.toFixed(2)}
            </div>
          </div>
        ))}
        {(!users || users.length === 0) && (
          <div className="p-8 text-center text-gray-500 text-sm">No entries yet! Start selling! 💸</div>
        )}
      </div>
    </div>
  );
}

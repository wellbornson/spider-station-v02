'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGlobalData } from '../contexts/GlobalDataContext';

// Define types for user data
interface UserData {
  id: number;
  name: string;
  amount: string;
  date: string;
}

// Define types for leaderboard data
interface LeaderboardEntry {
  name: string;
  totalAmount: number;
  rank: number;
}

const UserGraphPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { masterData } = useGlobalData();
  
  // Function to calculate leaderboard for a specific period
  const calculateLeaderboard = (dateStr: string) => {
    setLoading(true);

    // Parse the selected date
    const [year, month] = dateStr.split('-').map(Number);
    const currentYear = new Date().getFullYear();

    // Check if the selected date is in the future
    const isInFuture = year > currentYear || (year === currentYear && month > new Date().getMonth() + 1);

    if (isInFuture) {
      // Generate AI predictions for future dates
      generateAIPredictions(year, month);
    } else {
      // Calculate leaderboard from actual data for past/present dates
      calculateActualLeaderboard(year, month);
    }
  };

  // Function to calculate leaderboard from actual data
  const calculateActualLeaderboard = (year: number, month: number) => {
    // Create a map to store user totals
    const userTotals: { [key: string]: number } = {};

    // Iterate through masterData to find entries for the selected period
    Object.keys(masterData).forEach(key => {
      const [dataYear, dataMonth] = key.split('-').map(Number);

      // Check if the entry matches the selected year and month
      if (dataYear === year && dataMonth === month - 1) { // month is 0-indexed in our key
        const dayData = masterData[key];
        if (dayData && dayData.users) {
          dayData.users.forEach((user: any) => {
            if (user.name && user.amount) {
              const cleanAmount = parseFloat(user.amount.toString().replace(/[^\d.-]/g, ''));
              if (!isNaN(cleanAmount)) {
                if (userTotals[user.name]) {
                  userTotals[user.name] += cleanAmount;
                } else {
                  userTotals[user.name] = cleanAmount;
                }
              }
            }
          });
        }
      }
    });

    // Convert to array and sort by total amount
    const sortedUsers = Object.entries(userTotals)
      .map(([name, totalAmount]) => ({ name, totalAmount }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10); // Get top 10 users

    // Create leaderboard with ranks
    const rankedLeaderboard: LeaderboardEntry[] = sortedUsers.map((user, index) => ({
      name: user.name,
      totalAmount: user.totalAmount,
      rank: index + 1
    }));

    setLeaderboard(rankedLeaderboard);
    setLoading(false);
  };

  // Function to generate AI predictions for future dates
  const generateAIPredictions = (year: number, month: number) => {
    // Get historical data to base predictions on
    const historicalUserTotals: { [key: string]: number[] } = {};

    // Collect historical data for each user
    Object.keys(masterData).forEach(key => {
      const [dataYear, dataMonth] = key.split('-').map(Number);
      const dayData = masterData[key];

      if (dayData && dayData.users) {
        dayData.users.forEach((user: any) => {
          if (user.name && user.amount) {
            const cleanAmount = parseFloat(user.amount.toString().replace(/[^\d.-]/g, ''));
            if (!isNaN(cleanAmount) && cleanAmount > 0) {
              if (!historicalUserTotals[user.name]) {
                historicalUserTotals[user.name] = [];
              }
              historicalUserTotals[user.name].push(cleanAmount);
            }
          }
        });
      }
    });

    // Calculate average spending patterns for each user
    const userPatterns: { name: string; avgAmount: number; frequency: number; trend: number }[] = [];

    Object.entries(historicalUserTotals).forEach(([name, amounts]) => {
      const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const frequency = amounts.length; // How often this user appears

      // Calculate trend (simple linear regression slope approximation)
      let trend = 0;
      if (amounts.length > 1) {
        const firstHalfAvg = amounts.slice(0, Math.ceil(amounts.length / 2)).reduce((sum, val) => sum + val, 0) / Math.ceil(amounts.length / 2);
        const secondHalfAvg = amounts.slice(Math.ceil(amounts.length / 2)).reduce((sum, val) => sum + val, 0) / (amounts.length - Math.ceil(amounts.length / 2));
        trend = secondHalfAvg - firstHalfAvg; // Positive means increasing trend
      }

      userPatterns.push({
        name,
        avgAmount,
        frequency,
        trend
      });
    });

    // Sort users by their potential future spending (frequency * avgAmount * trend factor)
    userPatterns.sort((a, b) => {
      // Calculate potential future spending score
      const aScore = a.avgAmount * a.frequency * (1 + a.trend * 0.1); // Apply trend factor
      const bScore = b.avgAmount * b.frequency * (1 + b.trend * 0.1);
      return bScore - aScore;
    });

    // Generate predictions for top users
    const predictedLeaderboard: LeaderboardEntry[] = userPatterns
      .slice(0, 10) // Top 10 potential spenders
      .map((user, index) => {
        // Predict amount with some variation based on historical patterns
        const basePrediction = user.avgAmount * user.frequency * (1 + user.trend * 0.1);
        // Add some random variation based on historical volatility
        const variation = 0.8 + Math.random() * 0.4; // 80% to 120% of base prediction
        const predictedAmount = basePrediction * variation;

        return {
          name: user.name,
          totalAmount: predictedAmount,
          rank: index + 1
        };
      });

    setLeaderboard(predictedLeaderboard);
    setLoading(false);
  };
  
  // Calculate leaderboard when component mounts or selected date changes
  useEffect(() => {
    calculateLeaderboard(selectedDate);
  }, [selectedDate, masterData]);
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
  // Get the top 3 users for the 3D pillars
  const topThree = leaderboard.slice(0, 3);
  
  // Function to get pillar style based on rank
  const getPillarStyle = (rank: number, totalAmount: number) => {
    // Calculate max possible height considering the amount display space
    const maxHeight = 300; // Maximum height for the tallest pillar
    const minHeight = 100; // Minimum height for visibility

    // Find the highest amount among all users to normalize heights
    const maxAmount = Math.max(...leaderboard.map(u => u.totalAmount), 1);

    // Calculate proportional height based on the user's amount relative to the max
    let calculatedHeight = (totalAmount / maxAmount) * maxHeight;

    // Ensure minimum height for visibility
    calculatedHeight = Math.max(calculatedHeight, minHeight);

    // Adjust for the amount badge above the pillar (extra space needed)
    const adjustedHeight = Math.min(calculatedHeight, maxHeight - 60); // Leave space for amount display

    switch(rank) {
      case 1:
        return {
          gradient: 'from-white/30 to-white/10',
          glow: 'shadow-[0_0_20px_rgba(255,215,0,0.7),0_0_40px_rgba(255,215,0,0.5)]',
          height: `h-[${adjustedHeight}px]`,
          medal: '🥇'
        };
      case 2:
        return {
          gradient: 'from-white/25 to-white/5',
          glow: 'shadow-[0_0_20px_rgba(200,200,200,0.7),0_0_40px_rgba(200,200,200,0.5)]',
          height: `h-[${adjustedHeight * 0.85}px]`,
          medal: '🥈'
        };
      case 3:
        return {
          gradient: 'from-white/20 to-white/5',
          glow: 'shadow-[0_0_20px_rgba(205,127,50,0.7),0_0_40px_rgba(205,127,50,0.5)]',
          height: `h-[${adjustedHeight * 0.7}px]`,
          medal: '🥉'
        };
      default:
        return {
          gradient: 'from-white/15 to-white/5',
          glow: 'shadow-[0_0_15px_rgba(100,100,100,0.5)]',
          height: `h-[${adjustedHeight * 0.5}px]`,
          medal: ''
        };
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-white/10 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center transition-colors border border-white/30 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to POS
            </Link>
            <h1 className="text-3xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">USER GRAPH - TOP SPENDERS</h1>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
            <label htmlFor="date-selector" className="text-sm text-white/70">Time Travel:</label>
            <input
              type="month"
              id="date-selector"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-white/20 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/30"
              min="2020-01"
              max="2035-12"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white">Calculating top spenders...</p>
          </div>
        ) : (
          <>
            {/* 3D Leaderboard Section with Crystal Glass Effect */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-200 uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">TOP 3 SPENDERS</h2>
                {new Date(selectedDate + '-01').getFullYear() > new Date().getFullYear() ||
                 (new Date(selectedDate + '-01').getFullYear() === new Date().getFullYear() &&
                  new Date(selectedDate + '-01').getMonth() > new Date().getMonth()) ? (
                  <div className="bg-purple-900/50 border border-purple-500/50 px-3 py-1 rounded-full text-purple-300 text-sm flex items-center">
                    <span className="mr-2">🤖</span> AI Predicted Values
                  </div>
                ) : null}
              </div>

              <div className="flex justify-center items-end gap-12 min-h-[400px] mb-12">
                {topThree.length > 0 ? (
                  topThree.map((user, index) => {
                    const rank = user.rank;
                    const style = getPillarStyle(rank, user.totalAmount);

                    return (
                      <div key={user.name} className="flex flex-col items-center">
                        {/* Medal */}
                        <div className="text-4xl mb-2">{style.medal}</div>

                        {/* 3D Crystal Glass Pillar */}
                        <div
                          className={`w-32 ${style.height} rounded-t-full rounded-b-3xl bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-sm border border-white/30 ${style.glow} transition-all duration-500 flex flex-col items-center justify-end relative overflow-visible shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]`}
                        >
                          {/* Crystal-like internal reflection */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 via-transparent to-transparent rounded-t-full"></div>

                          {/* Light reflection from the bottom */}
                          <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-white/40 via-transparent to-transparent rounded-b-3xl"></div>

                          {/* Mirror reflection below the pillar */}
                          <div
                            className={`absolute top-full left-0 w-full bg-gradient-to-b from-white/20 to-white/5 opacity-30 rounded-t-full transform scale-y-[-1] origin-top backdrop-blur-sm border-t border-white/20`}
                            style={{
                              height: '30%',
                              filter: 'blur(2px)',
                              marginTop: '5px'
                            }}
                          ></div>

                          {/* Amount label in a glowing neon floating bubble above pillar */}
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-yellow-400/50 shadow-[0_0_15px_#FFFF00,0_0_30px_rgba(255,255,0,0.5)]">
                            <span className="text-lg font-black text-[#FFFF00]">₹{user.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* User name */}
                        <div className="mt-4 text-center">
                          <p className="text-lg font-bold text-white truncate max-w-[120px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{user.name}</p>
                          <p className="text-sm text-white/70">Rank #{user.rank}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    <p>No data available for the selected period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Full Leaderboard Table with Crystal Glass Effect */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-white/20 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Complete Leaderboard</h2>
                {new Date(selectedDate + '-01').getFullYear() > new Date().getFullYear() ||
                 (new Date(selectedDate + '-01').getFullYear() === new Date().getFullYear() &&
                  new Date(selectedDate + '-01').getMonth() > new Date().getMonth()) ? (
                  <div className="bg-purple-900/50 border border-purple-500/50 px-3 py-1 rounded-full text-purple-300 text-sm flex items-center">
                    <span className="mr-2">🤖</span> AI Predicted Values
                  </div>
                ) : null}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white">
                  <thead className="bg-white/10 text-indigo-200 uppercase text-xs">
                    <tr>
                      <th className="p-4">Rank</th>
                      <th className="p-4">User Name</th>
                      <th className="p-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((user) => (
                        <tr key={user.name} className="hover:bg-white/10">
                          <td className="p-4 font-mono">
                            {user.rank <= 3 ? (
                              <span className={`font-black ${user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-amber-700'}`}>
                                {user.rank}{user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            ) : (
                              <span className="text-white/70">#{user.rank}</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-white">{user.name}</td>
                          <td className="p-4 text-right font-black text-lg">
                            <span className={user.rank <= 3 ? 'text-yellow-300' : 'text-white'}>
                              ₹{user.totalAmount.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-white/50">No data available for the selected period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserGraphPage;
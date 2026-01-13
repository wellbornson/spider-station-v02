'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface AnalyticsProps {
  theme: {
    panelBg: string;
    border: string;
    textMain: string;
    textAccent: string;
    textHighlight: string;
    button: string;
    glow: string;
  };
}

interface TimeRangeOption {
  id: string;
  label: string;
  value: string;
}

interface SalesDataPoint {
  id: string;
  label: string;
  value: number;
  year?: number;
  month?: number;
  day?: number;
}

const ThreeDAnalytics: React.FC<AnalyticsProps> = ({ theme }) => {
  const [timeRange, setTimeRange] = useState<string>('this-month');
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [viewPosition, setViewPosition] = useState<number>(0); // Track current view position for navigation
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const timeRangeOptions: TimeRangeOption[] = [
    { id: 'this-month', label: 'This Month', value: 'this-month' },
    { id: 'last-6-months', label: 'Last 6 Months', value: 'last-6-months' },
    { id: 'yearly', label: 'Yearly', value: 'yearly' },
    { id: '10-year', label: '10-Year Projection', value: '10-year' },
  ];

  // Simulate data loading
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call delay
    const timer = setTimeout(() => {
      generateSalesData();
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [timeRange, currentOffset]);

  // Generate sales data based on time range
  const generateSalesData = () => {
    const data: SalesDataPoint[] = [];

    if (timeRange === 'this-month') {
      // Generate daily data for current month (30 days)
      for (let i = 1; i <= 30; i++) {
        data.push({
          id: `day-${i}`,
          label: `Day ${i}`,
          value: Math.floor(Math.random() * 50000) + 10000, // Random value between 10,000 and 60,000
          day: i
        });
      }
    } else if (timeRange === 'last-6-months') {
      // Generate monthly data for last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      for (let i = 0; i < 6; i++) {
        data.push({
          id: `month-${i+1}`,
          label: months[i],
          value: Math.floor(Math.random() * 150000) + 50000, // Random value between 50,000 and 200,000
          month: i + 1
        });
      }
    } else if (timeRange === 'yearly') {
      // Generate yearly data for current year and previous years
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 5; i++) {
        data.push({
          id: `year-${currentYear-i}`,
          label: `${currentYear-i}`,
          value: Math.floor(Math.random() * 800000) + 200000, // Random value between 200,000 and 1,000,000
          year: currentYear - i
        });
      }
    } else if (timeRange === '10-year') {
      // Generate 10-year projection with enhanced AI prediction logic
      const currentYear = new Date().getFullYear();

      // Get historical data to base predictions on
      const historicalData = [
        Math.floor(Math.random() * 800000) + 200000, // Base value for current year
        Math.floor(Math.random() * 800000) + 200000, // Previous year
        Math.floor(Math.random() * 800000) + 200000, // Two years ago
      ];

      // Calculate average growth rate from historical data
      let avgGrowthRate = 0;
      for (let i = 0; i < historicalData.length - 1; i++) {
        const growth = (historicalData[i] - historicalData[i + 1]) / historicalData[i + 1];
        avgGrowthRate += growth;
      }
      avgGrowthRate /= (historicalData.length - 1);

      // Apply AI prediction logic to forecast next 10 years
      for (let i = 0; i < 10; i++) {
        let predictedValue;

        if (i === 0) {
          // Use current year's actual value as base
          predictedValue = historicalData[0];
        } else {
          // Apply growth rate with market fluctuation
          const baseValue = data[data.length - 1].value;
          const marketFluctuation = 1 + (Math.random() * 0.1 - 0.05); // ±5% market fluctuation
          const trendFactor = 1 + avgGrowthRate * 0.8; // Slightly dampened trend

          predictedValue = Math.max(
            baseValue * trendFactor * marketFluctuation,
            100000 // Minimum threshold
          );
        }

        // Add seasonal variations and market factors
        const seasonalFactor = 0.95 + (Math.random() * 0.1); // 95-105% seasonal adjustment
        const marketFactor = 0.9 + (Math.random() * 0.2); // 90-110% market factor

        predictedValue = Math.max(predictedValue * seasonalFactor * marketFactor, 100000);

        data.push({
          id: `year-${currentYear+i}`,
          label: `${currentYear+i}`,
          value: Math.round(predictedValue),
          year: currentYear + i
        });
      }
    }

    setSalesData(data);
  };

  // Calculate max value for scaling bars
  const maxValue = useMemo(() => {
    const visibleData = salesData.slice(viewPosition, viewPosition + (timeRange === 'this-month' ? 7 :
                                                                    timeRange === 'last-6-months' ? 3 :
                                                                    timeRange === 'yearly' ? 2 :
                                                                    5));
    return visibleData.length > 0 ? Math.max(...visibleData.map(d => d.value)) : 1;
  }, [salesData, viewPosition, timeRange]);

  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    setCurrentOffset(0); // Reset offset when changing time range
  };

  // Handle navigation based on time range
  const handleNavigation = (direction: 'prev' | 'next') => {
    const increment = timeRange === 'this-month' ? 7 : // 7 days for daily view
                     timeRange === 'last-6-months' ? 3 : // 3 months for 6-month view
                     timeRange === 'yearly' ? 2 : // 2 years for yearly view
                     1; // 1 year for 10-year view

    if (direction === 'prev') {
      setViewPosition(prev => Math.max(prev - increment, 0));
    } else {
      // Calculate max position based on time range
      const maxPosition = timeRange === 'this-month' ? 23 : // Max 30 days, show 7 at a time
                         timeRange === 'last-6-months' ? 3 : // Max 6 months, show 3 at a time
                         timeRange === 'yearly' ? 8 : // Max 10 years, show 2 at a time
                         9; // Max 10 years for projection
      setViewPosition(prev => Math.min(prev + increment, maxPosition));
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`p-6 h-full flex flex-col ${theme.textMain}`}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className={`text-3xl md:text-4xl font-black ${theme.textAccent} tracking-tighter drop-shadow-lg text-center`}>SALES ANALYTICS 📊</h2>
          <div className={`${theme.panelBg} p-2 rounded-xl border ${theme.border} flex items-center gap-2`}>
            <select 
              value={timeRange} 
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className={`bg-transparent border-none text-white font-bold outline-none cursor-pointer ${theme.textMain}`}
            >
              {timeRangeOptions.map(option => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-white">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 h-full flex flex-col ${theme.textMain}`}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className={`text-3xl md:text-4xl font-black ${theme.textAccent} tracking-tighter drop-shadow-lg text-center`}>SALES ANALYTICS 📊</h2>
        <div className={`flex items-center gap-2 ${theme.panelBg} p-2 rounded-xl border ${theme.border}`}>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Time Range:</span>
          <select 
            value={timeRange} 
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className={`bg-transparent border-none text-white font-bold outline-none cursor-pointer ${theme.textMain}`}
          >
            {timeRangeOptions.map(option => (
              <option key={option.id} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className={`flex-1 flex items-end justify-between gap-2 md:gap-4 p-6 ${theme.panelBg} rounded-3xl border ${theme.border} shadow-2xl relative overflow-hidden perspective-container`}>
        <div className="absolute inset-0 flex flex-col justify-between p-6 opacity-20 pointer-events-none">
          <div className="border-t border-white w-full h-0"></div>
          <div className="border-t border-white w-full h-0"></div>
          <div className="border-t border-white w-full h-0"></div>
        </div>
        
        {salesData.slice(viewPosition, viewPosition + (timeRange === 'this-month' ? 7 :
                                                      timeRange === 'last-6-months' ? 3 :
                                                      timeRange === 'yearly' ? 2 :
                                                      5)).map((dataPoint, i) => {
          const heightPercent = (dataPoint.value / maxValue) * 80;
          const delay = i * 150; // Stagger the animation for each bar

          // Define gradient based on time range
          let gradientClass = '';
          let glowClass = '';

          if (timeRange === '10-year') {
            // Special neon purple gradient for 10-year projection
            gradientClass = 'from-purple-900 via-purple-600 to-fuchsia-600';
            glowClass = 'shadow-[0_0_15px_rgba(147,51,234,0.7),0_0_30px_rgba(192,38,211,0.5)]';
          } else {
            // Regular gradients for other time ranges
            const gradients = [
              'from-purple-500 to-pink-500', // Purple to Pink
              'from-cyan-400 to-blue-500',   // Neon Blue
              'from-orange-400 to-yellow-400', // Orange to Yellow
              'from-green-400 to-lime-300', // Green to Light Green
              'from-red-500 to-pink-500',   // Red to Pink
              'from-purple-900 to-fuchsia-600', // Deep Purple to Magenta
              'from-sky-400 to-cyan-300',   // Sky Blue
              'from-amber-400 to-orange-500', // Amber to Orange
              'from-emerald-400 to-teal-300', // Emerald to Teal
              'from-rose-500 to-pink-400'    // Rose to Pink
            ];

            const glows = [
              'shadow-[0_0_15px_rgba(168,85,247,0.7),0_0_30px_rgba(236,72,153,0.5)]', // Purple
              'shadow-[0_0_15px_rgba(56,189,248,0.7),0_0_30px_rgba(34,211,238,0.5)]', // Cyan
              'shadow-[0_0_15px_rgba(249,115,22,0.7),0_0_30px_rgba(251,191,36,0.5)]', // Orange
              'shadow-[0_0_15px_rgba(74,222,128,0.7),0_0_30px_rgba(132,232,108,0.5)]', // Green
              'shadow-[0_0_15px_rgba(239,68,68,0.7),0_0_30px_rgba(244,63,94,0.5)]', // Red
              'shadow-[0_0_15px_rgba(147,51,234,0.7),0_0_30px_rgba(192,38,211,0.5)]', // Purple
              'shadow-[0_0_15px_rgba(56,189,248,0.7),0_0_30px_rgba(103,230,247,0.5)]', // Sky
              'shadow-[0_0_15px_rgba(245,158,11,0.7),0_0_30px_rgba(249,115,22,0.5)]', // Amber
              'shadow-[0_0_15px_rgba(52,211,153,0.7),0_0_30px_rgba(45,212,191,0.5)]', // Emerald
              'shadow-[0_0_15px_rgba(244,63,94,0.7),0_0_30px_rgba(249,15,22,0.5)]' // Rose
            ];

            gradientClass = gradients[i % gradients.length];
            glowClass = glows[i % glows.length];
          }

          return (
            <div
              key={dataPoint.id}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
              style={{ animation: `popUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms both` }}
            >
              {/* Value label on hover */}
              <div className={`text-[10px] md:text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0 ${theme.textMain} z-10`}>
                {dataPoint.value.toLocaleString()}
              </div>

              {/* Main bar with 3D glass cylinder effect */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-8 md:w-10 relative rounded-[40px] bg-gradient-to-b ${gradientClass} ${glowClass} transition-all duration-500 hover:scale-[1.05] overflow-visible`}
              >
                {/* Glossy highlight for glass effect */}
                <div className="absolute top-0 left-1/4 w-1/3 h-full bg-gradient-to-b from-white/30 via-transparent to-transparent rounded-[40px]"></div>

                {/* Mirror reflection below the bar */}
                <div
                  className={`absolute top-full left-0 w-full bg-gradient-to-b ${gradientClass} opacity-30 rounded-[40px] transform scale-y-[-1] origin-top`}
                  style={{
                    height: `${heightPercent * 0.4}%`,
                    filter: 'blur(1px)',
                    marginTop: '2px'
                  }}
                ></div>

                {/* AI Prediction highlight for 10-year view */}
                {timeRange === '10-year' && dataPoint.year && dataPoint.year > new Date().getFullYear() + 4 && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-purple-400 bg-black/70 px-1 rounded">
                    AI
                  </div>
                )}
              </div>

              {/* Label */}
              <div className={`mt-3 text-[10px] md:text-sm font-bold uppercase tracking-widest text-slate-300 group-hover:text-white z-10`}>
                {dataPoint.label}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => handleNavigation('prev')}
          disabled={viewPosition === 0}
          className={`px-4 py-2 rounded-lg ${theme.button} text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          &larr; Prev
        </button>

        <div className="text-center">
          <p className={`text-sm ${theme.textAccent} uppercase tracking-widest`}>
            {timeRange === 'this-month' && 'Daily Sales Overview'}
            {timeRange === 'last-6-months' && 'Monthly Sales Overview'}
            {timeRange === 'yearly' && 'Annual Sales Overview'}
            {timeRange === '10-year' && '10-Year AI Predicted Growth'}
          </p>
          <p className={`text-xs ${theme.textMain} mt-1`}>
            {timeRange === '10-year' && 'AI-Predicted Values Highlighted in Neon Purple'}
          </p>
          <p className={`text-xs ${theme.textMain} mt-1`}>
            Showing {Math.min(viewPosition + (timeRange === 'this-month' ? 7 : timeRange === 'last-6-months' ? 3 : timeRange === 'yearly' ? 2 : 5), salesData.length)} of {salesData.length} items
          </p>
        </div>

        <button
          onClick={() => handleNavigation('next')}
          disabled={viewPosition >= (timeRange === 'this-month' ? 23 : timeRange === 'last-6-months' ? 3 : timeRange === 'yearly' ? 8 : 9)}
          className={`px-4 py-2 rounded-lg ${theme.button} text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Next &rarr;
        </button>
      </div>

      {/* Add CSS for the pop-up animation */}
      <style jsx>{`
        @keyframes popUp {
          0% {
            transform: scaleY(0);
            opacity: 0;
          }
          80% {
            transform: scaleY(1.1);
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ThreeDAnalytics;
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { db } from '../../../lib/db';
import { DashboardData, UserData } from '../../../lib/db';

// Interface for daily reports
interface DailyReport {
  report_date: string;
  total_sales: number;
  total_entries: number;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'dashboard';
    const dateParam = url.searchParams.get('date'); // Allow fetching data for a specific date

    if (type === 'reports') {
      // Fetch data for monthly reports
      console.log('Fetching data for reports endpoint');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch dashboard data from local storage for the last 30 days
      const allDashboardData: DashboardData[] = await db.getAllDashboardData();
      console.log(`Total dashboard records found: ${allDashboardData.length}`);

      // Filter records for the last 30 days based on date string
      const filteredDashboardData = allDashboardData.filter(entry => {
        if (entry.created_at) {
          const entryDate = new Date(entry.created_at);
          return entryDate >= thirtyDaysAgo;
        }
        return false;
      }).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

      console.log(`Filtered dashboard records for last 30 days: ${filteredDashboardData.length}`);

      // Filter out entries without an id (shouldn't happen in practice, but for type safety)
      const validDashboardData = filteredDashboardData.filter(entry => entry.id !== undefined) as (DashboardData & { id: number })[];

      // Aggregate data by date for daily reports
      const dailyReportsMap = new Map<string, { totalSales: number; totalEntries: number }>();

      validDashboardData.forEach(entry => {
        const dateOnly = new Date(entry.created_at!).toISOString().split('T')[0];

        if (!dailyReportsMap.has(dateOnly)) {
          dailyReportsMap.set(dateOnly, { totalSales: 0, totalEntries: 0 });
        }

        const report = dailyReportsMap.get(dateOnly)!;
        report.totalEntries++;

        // Calculate total sales for this date
        if (entry.user_data && Array.isArray(entry.user_data)) {
          entry.user_data.forEach(userData => {
            report.totalSales += Number(userData.amount) || 0;
          });
        } else if (entry.data?.masterData) {
          Object.values(entry.data.masterData).forEach((dayData: any) => {
            if (dayData.users) {
              report.totalSales += dayData.users.reduce((sum: number, user: any) =>
                sum + (Number(user.amount) || 0), 0);
            }
          });
        } else if (entry.data && typeof entry.data.amount !== 'undefined') {
          report.totalSales += Number(entry.data.amount) || 0;
        }
      });

      // Convert map to array of daily reports
      const dailyReports: DailyReport[] = Array.from(dailyReportsMap.entries()).map(([date, data]) => ({
        report_date: date,
        total_sales: data.totalSales,
        total_entries: data.totalEntries,
        created_at: date
      })).slice(0, 30); // Limit to last 30 days

      return new Response(JSON.stringify({
        success: true,
        dailyReports
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Handle fetching data for a specific date
      let dashboardData: DashboardData[] = [];

      if (dateParam) {
        // If a specific date is provided, get data for that exact date string
        // Ignore timezone differences and match the exact date string
        console.log(`Fetching data for exact date: ${dateParam}`);

        // Fetch all dashboard data and filter by date string
        const allDashboardData: DashboardData[] = await db.getAllDashboardData();
        dashboardData = allDashboardData.filter(entry => {
          if (entry.created_at) {
            // Extract date part from the ISO string and compare
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            return entryDate === dateParam;
          }
          return false;
        });

        console.log(`Found ${dashboardData.length} records for date: ${dateParam}`);
      } else {
        // Default behavior: Get the date 24 hours ago from now
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 24);
        const endDate = new Date(); // Current time

        // Fetch dashboard data from local storage for the specified date range
        const allDashboardData: DashboardData[] = await db.getAllDashboardData();
        dashboardData = allDashboardData.filter(entry => {
          if (entry.created_at) {
            const entryDate = new Date(entry.created_at);
            return entryDate >= startDate && entryDate <= endDate;
          }
          return false;
        }).reverse();
      }

      // Filter out entries without an id (shouldn't happen in practice, but for type safety)
      const validDashboardData = dashboardData.filter(entry => entry.id !== undefined) as (DashboardData & { id: number })[];

      console.log(`Valid dashboard data entries found: ${validDashboardData.length}`);

      // Calculate statistics based on dashboard data
      let todayTotalSale = 0;
      let activeSessions = 0;
      const lastEntries = validDashboardData.slice(0, 10);

      // Calculate total sales and active sessions from the fetched data
      validDashboardData.forEach(entry => {
        // If user_data exists, use it for calculations
        if (entry.user_data && Array.isArray(entry.user_data)) {
          // Calculate total sales for the date range
          entry.user_data.forEach(userData => {
            todayTotalSale += Number(userData.amount) || 0;

            // Count active sessions (where time_out is empty)
            if (userData.name && userData.name.trim() !== '' && (!userData.time_out || userData.time_out.trim() === '')) {
              activeSessions++;
            }
          });
        }
        // Fallback to the old method if user_data is not available
        else if (entry.data?.masterData) {
          // Calculate total sales for the date range
          Object.values(entry.data.masterData).forEach((dayData: any) => {
            if (dayData.users) {
              todayTotalSale += dayData.users.reduce((sum: number, user: any) =>
                sum + (Number(user.amount) || 0), 0);
            }
          });

          // Count active sessions (where timeOut is empty)
          Object.values(entry.data.masterData).forEach((dayData: any) => {
            if (dayData.users) {
              dayData.users.forEach((user: any) => {
                if (user.name && user.name.trim() !== '' && (!user.timeOut || user.timeOut.trim() === '')) {
                  activeSessions++;
                }
              });
            }
          });
        }
        // If the entry has an amount field directly (from sync-service), add it
        else if (entry.data && typeof entry.data.amount !== 'undefined') {
          todayTotalSale += Number(entry.data.amount) || 0;
        }
      });

      // Prepare response with calculated stats
      const stats = {
        todayTotalSale,
        activeSessions,
        lastEntries,
        dashboardData: validDashboardData,
        success: true
      };

      // Define date range for response
      let dateRange = {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        requestedDate: dateParam || null
      };

      // If we have valid data, set appropriate date range
      if (validDashboardData.length > 0 && dateParam) {
        // If a specific date was requested, use that for the range
        const specificDate = new Date(dateParam);
        dateRange = {
          start: new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 0, 0, 0).toISOString(),
          end: new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 23, 59, 59).toISOString(),
          requestedDate: dateParam
        };
      } else if (validDashboardData.length > 0) {
        // For default 24-hour range
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 24);
        const endDate = new Date();
        dateRange = {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          requestedDate: null
        };
      }

      return new Response(JSON.stringify({
        ...stats,
        dateRange
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Error fetching stats from local storage:', error);
    // Return empty stats instead of error to handle empty states gracefully
    const emptyStats = {
      todayTotalSale: 0,
      activeSessions: 0,
      lastEntries: [],
      dashboardData: [],
      success: true,
      dateRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        requestedDate: null
      },
      message: 'No data available for the requested date range'
    };

    return new Response(
      JSON.stringify(emptyStats),
      {
        status: 200, // Return 200 instead of 500 to handle gracefully
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
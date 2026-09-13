"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProfitLossReport } from "@/hooks/queries/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
} from "lucide-react";

export function ProfitLossReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: profitLossData, isLoading } = useProfitLossReport(dateRange);

  // Interval state for chart view
  const [intervalOverride, setIntervalOverride] = useState<"daily" | "weekly" | "monthly" | null>(null);

  // Table filtering and pagination state
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySort, setCategorySort] = useState<"profit_desc" | "revenue_desc" | "margin_desc" | "items_desc">("profit_desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Construct combined and aggregated timeline chart data
  const { chartData, effectiveInterval } = useMemo(() => {
    if (!profitLossData) return { chartData: [], effectiveInterval: "daily" };

    const revenueMap = Object.fromEntries(
      (profitLossData.revenue_by_date || []).map((item) => [
        item.date,
        parseFloat(item.revenue) || 0,
      ])
    );
    const expenseMap = Object.fromEntries(
      (profitLossData.expenses_by_date || []).map((item) => [
        item.date,
        parseFloat(item.total) || 0,
      ])
    );

    const allDates = Array.from(
      new Set([...Object.keys(revenueMap), ...Object.keys(expenseMap)])
    ).sort();

    // Determine default interval based on date span if user hasn't overridden
    const autoInterval: "daily" | "weekly" | "monthly" =
      allDates.length > 70 ? "monthly" : allDates.length > 28 ? "weekly" : "daily";

    const activeInterval = intervalOverride || autoInterval;

    if (activeInterval === "daily") {
      const dailyData = allDates.map((date) => {
        const rev = revenueMap[date] || 0;
        const exp = expenseMap[date] || 0;
        const d = new Date(date);
        const formattedLabel = !isNaN(d.getTime())
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : date;
        return {
          date: formattedLabel,
          fullDate: date,
          revenue: rev,
          expense: exp,
          netProfit: rev - exp,
        };
      });
      return { chartData: dailyData, effectiveInterval: activeInterval };
    }

    if (activeInterval === "monthly") {
      const monthlyGroups: Record<string, { revenue: number; expense: number; label: string }> = {};
      allDates.forEach((date) => {
        const monthKey = date.slice(0, 7); // YYYY-MM
        if (!monthlyGroups[monthKey]) {
          const [year, month] = monthKey.split("-");
          const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const label = !isNaN(monthDate.getTime())
            ? monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
            : monthKey;
          monthlyGroups[monthKey] = { revenue: 0, expense: 0, label };
        }
        monthlyGroups[monthKey].revenue += revenueMap[date] || 0;
        monthlyGroups[monthKey].expense += expenseMap[date] || 0;
      });

      const aggregated = Object.keys(monthlyGroups).sort().map((key) => ({
        date: monthlyGroups[key].label,
        fullDate: key,
        revenue: Math.round(monthlyGroups[key].revenue),
        expense: Math.round(monthlyGroups[key].expense),
        netProfit: Math.round(monthlyGroups[key].revenue - monthlyGroups[key].expense),
      }));

      return { chartData: aggregated, effectiveInterval: activeInterval };
    }

    // Weekly aggregation
    const weeklyGroups: Record<string, { revenue: number; expense: number; label: string }> = {};
    allDates.forEach((date) => {
      const d = new Date(date);
      // Group by nearest Sunday or week key
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekKey = `${d.getFullYear()}-W${weekNum < 10 ? `0${weekNum}` : weekNum}`;

      if (!weeklyGroups[weekKey]) {
        const label = `W${weekNum} ${d.toLocaleDateString("en-US", { month: "short" })}`;
        weeklyGroups[weekKey] = { revenue: 0, expense: 0, label };
      }
      weeklyGroups[weekKey].revenue += revenueMap[date] || 0;
      weeklyGroups[weekKey].expense += expenseMap[date] || 0;
    });

    const aggregated = Object.keys(weeklyGroups).sort().map((key) => ({
      date: weeklyGroups[key].label,
      fullDate: key,
      revenue: Math.round(weeklyGroups[key].revenue),
      expense: Math.round(weeklyGroups[key].expense),
      netProfit: Math.round(weeklyGroups[key].revenue - weeklyGroups[key].expense),
    }));

    return { chartData: aggregated, effectiveInterval: activeInterval };
  }, [profitLossData, intervalOverride]);

  // Filtered & Sorted Category Data
  const { filteredCategories, categoryTotals, totalPages } = useMemo(() => {
    if (!profitLossData?.profit_by_category) {
      return {
        filteredCategories: [],
        categoryTotals: { revenue: 0, cost: 0, profit: 0, items: 0 },
        totalPages: 1,
      };
    }

    const searchLower = categorySearch.toLowerCase().trim();
    let list = profitLossData.profit_by_category.map((item) => {
      const rev = parseFloat(item.revenue) || 0;
      const cost = parseFloat(item.cost) || 0;
      const profit = parseFloat(item.profit) || 0;
      const items = item.items_sold || 0;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      return {
        ...item,
        numRevenue: rev,
        numCost: cost,
        numProfit: profit,
        numItems: items,
        numMargin: margin,
      };
    });

    if (searchLower) {
      list = list.filter((c) => c.category_name.toLowerCase().includes(searchLower));
    }

    // Sort
    list.sort((a, b) => {
      if (categorySort === "revenue_desc") return b.numRevenue - a.numRevenue;
      if (categorySort === "margin_desc") return b.numMargin - a.numMargin;
      if (categorySort === "items_desc") return b.numItems - a.numItems;
      return b.numProfit - a.numProfit; // profit_desc default
    });

    const totals = list.reduce(
      (acc, curr) => {
        acc.revenue += curr.numRevenue;
        acc.cost += curr.numCost;
        acc.profit += curr.numProfit;
        acc.items += curr.numItems;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, items: 0 }
    );

    const pages = Math.ceil(list.length / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedList = list.slice(startIndex, startIndex + pageSize);

    return {
      filteredCategories: paginatedList,
      categoryTotals: totals,
      totalPages: pages,
    };
  }, [profitLossData, categorySearch, categorySort, page]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-slate-200/80 shadow-2xs p-5 bg-white">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs p-6 bg-white">
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!profitLossData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white shadow-2xs">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Financial Records Available</h3>
        <p className="text-xs text-slate-500 mt-1">
          No revenue or expense records found for the selected time window.
        </p>
      </Card>
    );
  }

  const totalRev = parseFloat(profitLossData.total_revenue || "0");
  const totalExp = parseFloat(profitLossData.total_expenses || "0");
  const netProf = parseFloat(profitLossData.net_profit || "0");
  const marginVal = parseFloat(profitLossData.profit_margin || "0");

  return (
    <div className="space-y-6">
      {/* 4-Column Balanced Executive KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gross Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ${totalRev.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{profitLossData.revenue_by_date?.length || 0} active sales days</span>
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ${totalExp.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-2">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{profitLossData.expenses_by_date?.length || 0} expense days</span>
          </div>
        </Card>

        {/* Net Profit */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Profit
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              netProf >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            ${netProf.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-2">
            {netProf >= 0 ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Profitable Operations
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                Net Operating Loss
              </Badge>
            )}
          </div>
        </Card>

        {/* Profit Margin */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Margin
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {marginVal.toFixed(2)}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {marginVal > 25
                ? "Outstanding yield"
                : marginVal > 10
                ? "Healthy return"
                : "Standard margin"}
            </span>
          </div>
        </Card>
      </div>

      {/* Revenue vs Expenses Comparative Performance */}
      <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Revenue vs Expenses Trajectory
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative inflow vs outflow with net margin trends
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Interval Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setIntervalOverride("daily")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  effectiveInterval === "daily"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setIntervalOverride("weekly")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  effectiveInterval === "weekly"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setIntervalOverride("monthly")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  effectiveInterval === "monthly"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Legend indicators */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Expense
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="h-[320px] sm:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pnlRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pnlExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const rev = Number(payload.find((p) => p.dataKey === "revenue")?.value || 0);
                      const exp = Number(payload.find((p) => p.dataKey === "expense")?.value || 0);
                      const net = rev - exp;
                      return (
                        <div className="bg-white text-slate-800 px-4 py-3 rounded-xl shadow-xl text-xs border border-slate-200 space-y-1.5 min-w-[180px]">
                          <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
                          <div className="flex items-center justify-between text-emerald-600">
                            <span>Revenue:</span>
                            <span className="font-bold">${rev.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-600">
                            <span>Expense:</span>
                            <span className="font-bold">${exp.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-900 pt-1 border-t border-slate-100 font-semibold">
                            <span>Net Profit:</span>
                            <span className={net >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              ${net.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#pnlRevGrad)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#pnlExpGrad)"
                  name="Expense"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Profitability Leaderboard & Table */}
      <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Category Profitability & Return
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Net yield, cost structure, and gross margin per product vertical
              </p>
            </div>

            {/* Filter and Sorting Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Filter category..."
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 w-[180px] sm:w-[220px] text-xs bg-white rounded-xl border-slate-200"
                />
              </div>

              <Select
                value={categorySort}
                onValueChange={(val: any) => {
                  setCategorySort(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs bg-white rounded-xl border-slate-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="text-xs rounded-xl">
                  <SelectItem value="profit_desc">Top Net Profit</SelectItem>
                  <SelectItem value="revenue_desc">Top Revenue</SelectItem>
                  <SelectItem value="margin_desc">Highest Margin %</SelectItem>
                  <SelectItem value="items_desc">Most Items Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-100">
                <TableHead className="text-xs font-bold uppercase text-slate-500 pl-6">
                  Category
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                  Revenue
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                  Cost
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                  Net Profit
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                  Units Sold
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500 pr-6 min-w-[160px]">
                  Gross Margin %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                    No categories found matching "{categorySearch}"
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((item) => {
                  const rev = item.numRevenue;
                  const cost = item.numCost;
                  const profit = item.numProfit;
                  const margin = item.numMargin.toFixed(1);
                  const numMargin = item.numMargin;

                  return (
                    <TableRow key={item.category_name} className="hover:bg-slate-50/70 border-b border-slate-100/80 transition-colors">
                      <TableCell className="text-xs font-bold text-slate-900 pl-6">
                        {item.category_name}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-800">
                        ${rev.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-500">
                        ${cost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          ${profit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-600">
                        {item.items_sold}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                numMargin >= 35
                                  ? "bg-emerald-500"
                                  : numMargin > 15
                                  ? "bg-blue-500"
                                  : numMargin > 0
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(Math.max(numMargin, 0), 100)}%` }}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-bold px-2 py-0.5 ${
                              numMargin >= 30
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : numMargin > 15
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : numMargin > 0
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {margin}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Table Summary & Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30 text-xs">
            <div className="text-slate-500">
              Showing <span className="font-semibold text-slate-800">{filteredCategories.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{profitLossData.profit_by_category?.length || 0}</span> categories
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

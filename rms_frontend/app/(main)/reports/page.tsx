"use client";

import { useState, useMemo } from "react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SalesReport } from "@/components/reports/sales-report";
import { ExpenseReport } from "@/components/reports/expense-report";
import { InventoryReport } from "@/components/reports/inventory-report";
import { CustomerReport } from "@/components/reports/customer-report";
import { CategoryReport } from "@/components/reports/category-report";
import { ProfitLossReport } from "@/components/reports/profit-loss-report";
import { ProductPerformanceReport } from "@/components/reports/product-performance-report";
import { DateRange } from "react-day-picker";
import { useOverviewReport } from "@/hooks/queries/use-reports";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PreorderReport } from "@/components/reports/preorder-report";
import { OnlinePreorderAnalytics } from "@/components/reports/online-preorder-analytics";
import { TaxReport } from "@/components/reports/tax-report";
import { ReturnsReport } from "@/components/reports/returns-report";
import { DuesAgingReport } from "@/components/reports/dues-aging-report";
import { CashReconciliationReport } from "@/components/reports/cash-reconciliation-report";
import { reportsApi, formatDateRange } from "@/lib/api/reports";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Layers,
  BarChart3,
  Package,
  Users,
  Percent,
  Clock,
  Globe,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Receipt,
  RotateCcw,
  Wallet,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";

// Preset filter options
const PRESET_FILTERS = [
  { label: "All Time", value: "all-time" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "This Year", value: "this-year" },
  { label: "Last 7 Days", value: "last-7-days" },
  { label: "Last 30 Days", value: "last-30-days" },
  { label: "Last 90 Days", value: "last-90-days" },
];

export default function ReportsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all-time");
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [overviewIntervalOverride, setOverviewIntervalOverride] = useState<"daily" | "weekly" | "monthly" | null>(null);

  // Calculate date range based on selected filter
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (selectedFilter) {
      case "all-time":
        return {
          from: new Date(2020, 0, 1),
          to: now,
        };
      case "today":
        return {
          from: today,
          to: today,
        };
      case "this-week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          from: startOfWeek,
          to: now,
        };
      case "this-month":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: now,
        };
      case "this-year":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: now,
        };
      case "last-7-days":
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        return {
          from: last7,
          to: now,
        };
      case "last-30-days":
        const last30 = new Date(today);
        last30.setDate(today.getDate() - 30);
        return {
          from: last30,
          to: now,
        };
      case "last-90-days":
        const last90 = new Date(today);
        last90.setDate(today.getDate() - 90);
        return {
          from: last90,
          to: now,
        };
      case "custom":
        return customDateRange;
      default:
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: now,
        };
    }
  }, [selectedFilter, customDateRange]);

  const { data: overviewData, isLoading: isLoadingOverview } =
    useOverviewReport(dateRange);

  const { chartData: combinedChartData, effectiveInterval: overviewEffectiveInterval } = useMemo(() => {
    if (!overviewData || !overviewData.sales_by_date) return { chartData: [], effectiveInterval: "daily" as const };

    const salesMap = Object.fromEntries(
      (overviewData.sales_by_date || []).map((s) => [s.date, parseFloat(s.total) || 0])
    );
    const expenseMap = Object.fromEntries(
      (overviewData.expenses_by_date || []).map((e) => [e.date, parseFloat(e.total) || 0])
    );

    const allDates = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(expenseMap)])).sort();

    const autoInterval: "daily" | "weekly" | "monthly" =
      allDates.length > 70 ? "monthly" : allDates.length > 28 ? "weekly" : "daily";

    const activeInterval = overviewIntervalOverride || autoInterval;

    if (activeInterval === "daily") {
      const daily = allDates.map((date) => {
        const sales = salesMap[date] || 0;
        const expenses = expenseMap[date] || 0;
        const d = new Date(date);
        const formattedLabel = !isNaN(d.getTime())
          ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : date;
        return {
          date: formattedLabel,
          fullDate: date,
          sales,
          expenses,
          netProfit: sales - expenses,
        };
      });
      return { chartData: daily, effectiveInterval: activeInterval };
    }

    if (activeInterval === "monthly") {
      const monthlyGroups: Record<string, { sales: number; expenses: number; label: string }> = {};
      allDates.forEach((date) => {
        const monthKey = date.slice(0, 7);
        if (!monthlyGroups[monthKey]) {
          const [year, month] = monthKey.split("-");
          const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const label = !isNaN(monthDate.getTime())
            ? monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
            : monthKey;
          monthlyGroups[monthKey] = { sales: 0, expenses: 0, label };
        }
        monthlyGroups[monthKey].sales += salesMap[date] || 0;
        monthlyGroups[monthKey].expenses += expenseMap[date] || 0;
      });

      const aggregated = Object.keys(monthlyGroups).sort().map((key) => ({
        date: monthlyGroups[key].label,
        fullDate: key,
        sales: Math.round(monthlyGroups[key].sales),
        expenses: Math.round(monthlyGroups[key].expenses),
        netProfit: Math.round(monthlyGroups[key].sales - monthlyGroups[key].expenses),
      }));

      return { chartData: aggregated, effectiveInterval: activeInterval };
    }

    // Weekly
    const weeklyGroups: Record<string, { sales: number; expenses: number; label: string }> = {};
    allDates.forEach((date) => {
      const d = new Date(date);
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekKey = `${d.getFullYear()}-W${weekNum < 10 ? `0${weekNum}` : weekNum}`;

      if (!weeklyGroups[weekKey]) {
        const label = `W${weekNum} ${d.toLocaleDateString("en-US", { month: "short" })}`;
        weeklyGroups[weekKey] = { sales: 0, expenses: 0, label };
      }
      weeklyGroups[weekKey].sales += salesMap[date] || 0;
      weeklyGroups[weekKey].expenses += expenseMap[date] || 0;
    });

    const aggregated = Object.keys(weeklyGroups).sort().map((key) => ({
      date: weeklyGroups[key].label,
      fullDate: key,
      sales: Math.round(weeklyGroups[key].sales),
      expenses: Math.round(weeklyGroups[key].expenses),
      netProfit: Math.round(weeklyGroups[key].sales - weeklyGroups[key].expenses),
    }));

    return { chartData: aggregated, effectiveInterval: activeInterval };
  }, [overviewData, overviewIntervalOverride]);

  const formattedDateRange = useMemo(
    () => ({
      from: dateRange?.from,
      to: dateRange?.to,
    }),
    [dateRange]
  );

  // Format date range for display
  const formatDateRangeDisplay = (range: DateRange) => {
    if (!range.from) return "Select dates";
    const fromDate = range.from.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const toDate = range.to
      ? range.to.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : fromDate;
    return fromDate === toDate ? fromDate : `${fromDate} - ${toDate}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Executive Header & Quick Filter Toolbar */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Reports & Business Analytics
                  </h1>
                  <Badge
                    variant="outline"
                    className="hidden sm:inline-flex bg-indigo-50 text-indigo-700 border-indigo-200/80 text-[11px] font-semibold"
                  >
                    Enterprise Suite
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                  Real-time revenue, expense metrics, and operational performance
                </p>
              </div>
            </div>

            {/* Action Bar: Export & Date Picker */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 px-3 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Export CSV</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs font-bold text-slate-500">
                    Export Financials & Data
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => reportsApi.exportReport("sales", formatDateRange(dateRange))}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                    Sales Transactions CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => reportsApi.exportReport("inventory")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                    Inventory Valuation CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => reportsApi.exportReport("expenses", formatDateRange(dateRange))}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <DollarSign className="h-3.5 w-3.5 mr-2 text-rose-600" />
                    Expense Audit CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => reportsApi.exportReport("profit_loss", formatDateRange(dateRange))}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-2 text-amber-600" />
                    Profit & Loss Statement CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Range Badge & Custom Trigger */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>{formatDateRangeDisplay(dateRange)}</span>
                <Button
                  variant={selectedFilter === "custom" || showCustomPicker ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setShowCustomPicker(!showCustomPicker);
                    if (!showCustomPicker) setSelectedFilter("custom");
                  }}
                  className="h-7 px-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  {showCustomPicker ? "Hide Picker" : "Custom Date"}
                </Button>
              </div>
            </div>
          </div>

          {/* Preset Period Pills */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Period:
              </span>
              {PRESET_FILTERS.map((filter) => {
                const isActive = selectedFilter === filter.value && !showCustomPicker;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setSelectedFilter(filter.value);
                      setShowCustomPicker(false);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Range Picker Container */}
            {showCustomPicker && (
              <div className="flex items-center gap-2 bg-indigo-50/70 p-1.5 rounded-xl border border-indigo-100">
                <DatePickerWithRange
                  value={customDateRange}
                  onChange={(range) => {
                    setCustomDateRange(range || { from: new Date(), to: new Date() });
                    setSelectedFilter("custom");
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Unified Tab Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="overflow-x-auto no-scrollbar pb-1">
            <TabsList className="bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200/80 flex w-max min-w-full gap-1 shadow-inner">
              <TabsTrigger
                value="overview"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="sales"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Sales
              </TabsTrigger>
              <TabsTrigger
                value="profit-loss"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Profit & Loss
              </TabsTrigger>
              <TabsTrigger
                value="tax"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Tax & VAT
              </TabsTrigger>
              <TabsTrigger
                value="returns"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Returns & Refunds
              </TabsTrigger>
              <TabsTrigger
                value="dues-aging"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Dues Aging
              </TabsTrigger>
              <TabsTrigger
                value="reconciliation"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Cash Drawer
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Customers
              </TabsTrigger>
              <TabsTrigger
                value="product-performance"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Products
              </TabsTrigger>
              <TabsTrigger
                value="online-preorder"
                className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
              >
                Online Preorders
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Content Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoadingOverview ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : overviewData ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Sales */}
                <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Revenue
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      ${parseFloat(overviewData.total_sales || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{overviewData.total_orders || 0} completed orders</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Expenses */}
                <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Expenses
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      ${parseFloat(overviewData.total_expenses || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>{overviewData.expenses_by_date?.length || 0} expenditure days</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Profit */}
                <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Net Profit
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className={`text-2xl font-black tracking-tight ${
                      parseFloat(overviewData.net_profit || "0") >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      ${parseFloat(overviewData.net_profit || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Net return after all costs</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Profit Margin */}
                <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all rounded-2xl">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Profit Margin
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                      <Percent className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                      {parseFloat(String(overviewData.profit_margin || "0")).toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Return on revenue</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Sales vs Expenses Visual Performance Chart */}
            <Card className="border border-slate-200/90 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Revenue & Expenditure Analysis
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Comparative inflow versus expenditure with margin trends
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Aggregation interval toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {(["daily", "weekly", "monthly"] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setOverviewIntervalOverride(interval)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                          overviewEffectiveInterval === interval
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sales
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Expenses
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {isLoadingOverview ? (
                  <Skeleton className="h-80 rounded-xl" />
                ) : combinedChartData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-slate-400">
                    <BarChart3 className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No transactions in selected period</p>
                    <p className="text-xs text-slate-400">Try selecting a broader date range or All Time</p>
                  </div>
                ) : (
                  <div className="h-[320px] sm:h-[380px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="repSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="repExpGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
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
                              const sales = Number(payload.find((p) => p.dataKey === "sales")?.value || 0);
                              const exp = Number(payload.find((p) => p.dataKey === "expenses")?.value || 0);
                              const net = sales - exp;
                              return (
                                <div className="bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800 space-y-1.5 min-w-[170px]">
                                  <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
                                  <div className="flex items-center justify-between text-emerald-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sales:
                                    </span>
                                    <span className="font-black">${sales.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-rose-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses:
                                    </span>
                                    <span className="font-black">${exp.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-slate-200 pt-1 border-t border-slate-800/80">
                                    <span className="font-medium text-slate-400">Net Margin:</span>
                                    <span className={`font-black ${net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                      ${net.toFixed(2)}
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
                          dataKey="sales"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#repSalesGrad)"
                          name="Sales"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#F43F5E"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#repExpGrad)"
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sub-Reports Tabs */}
          <TabsContent value="sales">
            <SalesReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="profit-loss">
            <ProfitLossReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="tax">
            <TaxReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="returns">
            <ReturnsReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="dues-aging">
            <DuesAgingReport />
          </TabsContent>
          <TabsContent value="reconciliation">
            <CashReconciliationReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpenseReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryReport />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="product-performance">
            <ProductPerformanceReport dateRange={formattedDateRange} />
          </TabsContent>
          <TabsContent value="online-preorder" className="space-y-8">
            <OnlinePreorderAnalytics dateRange={dateRange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

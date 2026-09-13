"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Calendar,
  ShoppingBag,
  Clock,
  CheckCircle2,
  CheckCheck,
  XCircle,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "@/hooks/queries/use-dashboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/error-boundary";

// Curated luxury palette for Donut Pie Chart
const DONUT_COLORS = [
  "#6366F1", // Indigo
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Violet
  "#3B82F6", // Blue
  "#64748B", // Slate
];

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

// Custom dark glass tooltip component for charts
function CustomChartTooltip({ active, payload, label, prefix = "", suffix = "", isCurrency = true }: any) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const formattedVal = isCurrency ? formatCurrency(val) : `${val} ${suffix}`;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-1">
        {label && <p className="text-slate-400 font-medium">{label}</p>}
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: payload[0].color || payload[0].fill || "#6366F1" }}
          />
          <span className="text-slate-300">{payload[0].name || "Value"}:</span>
          <span className="font-bold text-white tracking-wide">
            {prefix}{formattedVal}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function DashboardContent() {
  const { data: stats, isLoading, error, refetch, isFetching } = useDashboard();
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-56 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-[350px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Failed to load dashboard data</h2>
          <p className="text-sm text-slate-500">
            Please check your connection and try fetching the data again.
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-2 gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!stats || !isClient) {
    return null;
  }

  // Safe data access with fallbacks
  const safeStats = {
    today: {
      sales: stats.today?.sales || 0,
      expenses: stats.today?.expenses || 0,
      profit: stats.today?.profit || (stats.today?.sales || 0) - (stats.today?.expenses || 0),
      online_preorders_count:
        stats.today?.online_preorders_count ??
        stats.online_preorders?.today_count ??
        0,
      online_preorders_amount:
        stats.today?.online_preorders_amount ??
        stats.online_preorders?.today_amount ??
        0,
    },
    monthly: {
      sales: stats.monthly?.sales || 0,
      expenses: stats.monthly?.expenses || 0,
      profit: stats.monthly?.profit || (stats.monthly?.sales || 0) - (stats.monthly?.expenses || 0),
    },
    counts: {
      customers: stats.counts?.customers || 0,
      products: stats.counts?.products || 0,
      suppliers: stats.counts?.suppliers || 0,
      online_preorders:
        stats.counts?.online_preorders ??
        stats.online_preorders?.total_count ??
        0,
    },
    online_preorders: {
      today_count:
        stats.online_preorders?.today_count ??
        stats.today?.online_preorders_count ??
        0,
      today_amount:
        stats.online_preorders?.today_amount ??
        stats.today?.online_preorders_amount ??
        0,
      total_count:
        stats.online_preorders?.total_count ??
        stats.counts?.online_preorders ??
        0,
      total_amount: stats.online_preorders?.total_amount ?? 0,
      today_status_breakdown: stats.online_preorders?.today_status_breakdown ?? {
        PENDING: 0,
        CONFIRMED: 0,
        DELIVERED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
      status_breakdown: stats.online_preorders?.status_breakdown ?? {
        PENDING: 0,
        CONFIRMED: 0,
        DELIVERED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    },
    sales_trend: Array.isArray(stats.sales_trend) ? stats.sales_trend : [],
    expense_trend: Array.isArray(stats.expense_trend) ? stats.expense_trend : [],
    top_products: Array.isArray(stats.top_products) ? stats.top_products : [],
    expense_categories: Array.isArray(stats.expense_categories)
      ? stats.expense_categories.filter((cat) => cat.amount !== null)
      : [],
    low_stock_items: Array.isArray(stats.low_stock_items) ? stats.low_stock_items : [],
    recent_suppliers: Array.isArray(stats.recent_suppliers) ? stats.recent_suppliers : [],
  };

  // Calculate expense categories total
  const topCategories = safeStats.expense_categories.slice(0, 6);
  const totalCategoryExpenses = topCategories.reduce(
    (sum, cat) => sum + (Number(cat.amount) || 0),
    0
  );

  return (
    <motion.div
      className="min-h-screen bg-[#F8FAFC] pb-16"
      variants={container}
      initial={false}
      animate="show"
    >
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <motion.div variants={item}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-white">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Business Dashboard
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    Live Analytics
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5 text-xs sm:text-sm font-medium">
                  Real-time sales, ecommerce fulfillment, and business performance metrics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="gap-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
                <span>{isFetching ? "Refreshing..." : "Refresh Data"}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics - Today's & Monthly Overview (Modern Cohesive Cards) */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-5"
          variants={item}
        >
          {/* Today's Sales */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Sales
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(safeStats.today.sales)}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Today's revenue</span>
            </div>
          </Card>

          {/* Today's Expenses */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-rose-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Expenses
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                <TrendingDown className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(safeStats.today.expenses)}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50/80 border border-rose-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Operating cost</span>
            </div>
          </Card>

          {/* Today's Online Preorders */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-indigo-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Today's Preorders
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {safeStats.online_preorders.today_count}{" "}
              <span className="text-xs font-normal text-slate-400">orders</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{formatCurrency(safeStats.online_preorders.today_amount)} today</span>
            </div>
          </Card>

          {/* Monthly Sales */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Sales
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(safeStats.monthly.sales)}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Month to date</span>
            </div>
          </Card>

          {/* Monthly Expenses */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-pink-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Expenses
              </span>
              <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(safeStats.monthly.expenses)}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-pink-700 bg-pink-50/80 border border-pink-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Total spent</span>
            </div>
          </Card>
        </motion.div>

        {/* Business Counts Row */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5"
          variants={item}
        >
          {/* Total Customers */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-4.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Customers</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {safeStats.counts.customers}
              </p>
              <span className="text-[11px] text-amber-600 font-medium">Registered client accounts</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </Card>

          {/* Total Products */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-4.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Products</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {safeStats.counts.products}
              </p>
              <span className="text-[11px] text-cyan-600 font-medium">Active SKU items</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
              <Package className="h-5 w-5" />
            </div>
          </Card>

          {/* Total Suppliers */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-4.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Suppliers</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {safeStats.counts.suppliers}
              </p>
              <span className="text-[11px] text-slate-600 font-medium">Verified vendor partners</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
          </Card>

          {/* Total Preorders */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-4.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500">Total Preorders</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {safeStats.counts.online_preorders}
              </p>
              <span className="text-[11px] text-violet-600 font-medium truncate">
                {formatCurrency(safeStats.online_preorders.total_amount)} total value
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </Card>
        </motion.div>

        {/* Online Preorders Status Overview Widget */}
        <motion.div variants={item}>
          <Card className="border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                        Online Preorder Status
                      </CardTitle>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-xs font-semibold px-2 py-0.5">
                        Ecommerce COD
                      </Badge>
                    </div>
                    <CardDescription className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Fulfillment tracking & status distribution across all orders
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link href="/online-preorders">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 text-xs sm:text-sm font-medium h-9 gap-1.5 rounded-xl shadow-2xs"
                    >
                      <span>Manage Preorders</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Summary KPIs Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 p-3.5 sm:p-4.5 bg-slate-50/80 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Today's Preorders</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {safeStats.online_preorders.today_count} <span className="text-xs font-normal text-slate-500">orders</span>
                  </p>
                  <p className="text-xs text-indigo-600 font-bold">{formatCurrency(safeStats.online_preorders.today_amount)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Pending Action</span>
                  <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                    {safeStats.online_preorders.status_breakdown.PENDING} <span className="text-xs font-normal text-slate-500">orders</span>
                  </p>
                  <p className="text-xs text-slate-500">{safeStats.online_preorders.today_status_breakdown.PENDING} new today</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">In Transit (Delivered)</span>
                  <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
                    {safeStats.online_preorders.status_breakdown.DELIVERED} <span className="text-xs font-normal text-slate-500">orders</span>
                  </p>
                  <p className="text-xs text-slate-500">{safeStats.online_preorders.today_status_breakdown.DELIVERED} shipped today</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Completed All-Time</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                    {safeStats.online_preorders.status_breakdown.COMPLETED} <span className="text-xs font-normal text-slate-500">orders</span>
                  </p>
                  <p className="text-xs text-slate-500">{safeStats.online_preorders.total_count} total orders</p>
                </div>
              </div>

              {/* Status Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {/* PENDING */}
                <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-amber-50/20 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-900">
                    {safeStats.online_preorders.status_breakdown.PENDING}
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-700 mt-1.5 pt-1.5 border-t border-amber-200/60">
                    <span>Today:</span>
                    <span className="font-bold">{safeStats.online_preorders.today_status_breakdown.PENDING}</span>
                  </div>
                </div>

                {/* CONFIRMED */}
                <div className="p-3.5 rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/80 to-blue-50/20 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Confirmed</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-blue-700" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-blue-900">
                    {safeStats.online_preorders.status_breakdown.CONFIRMED}
                  </div>
                  <div className="flex items-center justify-between text-xs text-blue-700 mt-1.5 pt-1.5 border-t border-blue-200/60">
                    <span>Today:</span>
                    <span className="font-bold">{safeStats.online_preorders.today_status_breakdown.CONFIRMED}</span>
                  </div>
                </div>

                {/* DELIVERED */}
                <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/80 to-indigo-50/20 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">Delivered</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-indigo-700" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-indigo-900">
                    {safeStats.online_preorders.status_breakdown.DELIVERED}
                  </div>
                  <div className="flex items-center justify-between text-xs text-indigo-700 mt-1.5 pt-1.5 border-t border-indigo-200/60">
                    <span>Today:</span>
                    <span className="font-bold">{safeStats.online_preorders.today_status_breakdown.DELIVERED}</span>
                  </div>
                </div>

                {/* COMPLETED */}
                <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-emerald-50/20 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Completed</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCheck className="w-4 h-4 text-emerald-700" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    {safeStats.online_preorders.status_breakdown.COMPLETED}
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-700 mt-1.5 pt-1.5 border-t border-emerald-200/60">
                    <span>Today:</span>
                    <span className="font-bold">{safeStats.online_preorders.today_status_breakdown.COMPLETED}</span>
                  </div>
                </div>

                {/* CANCELLED */}
                <div className="p-3.5 rounded-xl border border-rose-200/80 bg-gradient-to-b from-rose-50/80 to-rose-50/20 hover:shadow-md transition-all col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Cancelled</span>
                    <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-rose-700" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-rose-900">
                    {safeStats.online_preorders.status_breakdown.CANCELLED}
                  </div>
                  <div className="flex items-center justify-between text-xs text-rose-700 mt-1.5 pt-1.5 border-t border-rose-200/60">
                    <span>Today:</span>
                    <span className="font-bold">{safeStats.online_preorders.today_status_breakdown.CANCELLED}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row 1 - Sales Trend & Expense Trend (Modern Gradient Graphs) */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
          variants={item}
        >
          {/* Sales Trend (Gradient Bar Chart) */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Sales Trend
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Daily sales revenue performance for the current month
                  </CardDescription>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-[260px] sm:h-[300px]">
                {safeStats.sales_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeStats.sales_trend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#818CF8" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date__date"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          value
                            ? new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : ""
                        }
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                      <Bar
                        dataKey="total"
                        name="Daily Sales"
                        fill="url(#salesBarGradient)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No sales trend data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Trend (Modern Smooth Area Chart) */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Expense Trend
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Daily expense cash outflow trajectory
                  </CardDescription>
                </div>
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <TrendingDown className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-[260px] sm:h-[300px]">
                {safeStats.expense_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={safeStats.expense_trend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="expenseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          value
                            ? new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : ""
                        }
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="Daily Expense"
                        stroke="#F43F5E"
                        strokeWidth={2.5}
                        fill="url(#expenseAreaGradient)"
                        activeDot={{ r: 6, fill: "#F43F5E", stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No expense trend data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row 2 - Top Products, Donut Pie Chart & Low Stock Items */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={item}
        >
          {/* Top Products */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Top Selling Products
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Top performers by units sold
                  </CardDescription>
                </div>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                  <ShoppingCart className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {safeStats.top_products.length > 0 ? (
                  safeStats.top_products.map((prod, index) => {
                    const maxUnits = Math.max(...safeStats.top_products.map((p) => p.total_sales || 1));
                    const percentage = Math.round(((prod.total_sales || 0) / maxUnits) * 100);
                    return (
                      <div
                        key={index}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 truncate" title={prod.name}>
                              {prod.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 shrink-0">
                            {prod.total_sales} sold
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-sky-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Revenue: {formatCurrency(prod.total_revenue || 0)}</span>
                          <span className="text-emerald-600 font-medium">Profit: {formatCurrency(prod.total_profit || 0)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                    No product data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Categories (Modern Donut Chart with Sleek Legend) */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Expense Distribution
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Breakdown by top spending categories
                  </CardDescription>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Layers className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {topCategories.length > 0 ? (
                <div className="space-y-4">
                  {/* Donut Chart with Center KPI */}
                  <div className="h-[180px] sm:h-[190px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius="65%"
                          outerRadius="88%"
                          paddingAngle={3}
                          cornerRadius={5}
                          dataKey="amount"
                          stroke="none"
                        >
                          {topCategories.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip isCurrency={true} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Donut Summary */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Top Categories
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                        {formatCurrency(totalCategoryExpenses)}
                      </span>
                    </div>
                  </div>

                  {/* Modern Category Legend List */}
                  <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                    {topCategories.map((cat, index) => {
                      const amount = Number(cat.amount) || 0;
                      const pct = totalCategoryExpenses > 0 ? Math.round((amount / totalCategoryExpenses) * 100) : 0;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                            />
                            <span className="font-medium text-slate-800 truncate" title={cat.name}>
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {pct}%
                            </span>
                            <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-56 text-slate-400 text-sm">
                  No expense category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Inventory items reaching minimum stock threshold
                  </CardDescription>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {safeStats.low_stock_items.length > 0 ? (
                  safeStats.low_stock_items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-900 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[11px] font-bold text-rose-600">
                            {item.stock_quantity} left in stock
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200/70 px-2 py-0.5 rounded-full shrink-0">
                        Min: {item.minimum_stock}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-48 text-emerald-600 text-sm font-medium">
                    All products are adequately stocked!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Suppliers Row */}
        <motion.div variants={item}>
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Active Suppliers
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Key supply chain partners and contact details
                  </CardDescription>
                </div>
                <Link href="/inventory/suppliers">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600 hover:text-slate-900">
                    View All Suppliers
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {safeStats.recent_suppliers.length > 0 ? (
                  safeStats.recent_suppliers.map((supplier, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all space-y-2.5"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs uppercase">
                          {supplier.name?.charAt(0) || "S"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {supplier.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            {supplier.phone || "No phone"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <p className="truncate"><span className="font-medium text-slate-700">Email:</span> {supplier.email || "N/A"}</p>
                        <p className="truncate"><span className="font-medium text-slate-700">Address:</span> {supplier.address || "N/A"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-8 col-span-full text-sm">
                    No supplier records available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

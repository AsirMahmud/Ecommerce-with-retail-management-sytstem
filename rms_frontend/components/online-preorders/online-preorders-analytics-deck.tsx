"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import { useOnlinePreorderMetrics } from "@/hooks/queries/use-online-preorders";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#10B981", // Emerald
  DELIVERED: "#6366F1", // Indigo
  CONFIRMED: "#3B82F6", // Blue
  PENDING: "#F59E0B",   // Amber
  HOLD: "#EA580C",      // Orange
  RETURNED: "#A855F7",  // Purple
  CANCELLED: "#EF4444", // Red
};

const COURIER_COLORS: Record<string, string> = {
  STEADFAST: "#059669",
  PATHAO: "#DC2626",
  REDX: "#EA580C",
  CARRYBEE: "#2563EB",
  UNASSIGNED: "#94A3B8",
};

interface AnalyticsDeckProps {
  onSelectStatus?: (status: string) => void;
  className?: string;
}

export function OnlinePreordersAnalyticsDeck({ onSelectStatus, className = "" }: AnalyticsDeckProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "month" | "all">("30d");

  // Dynamic date range for reports analytics
  const dateRange: DateRange = useMemo(() => {
    const now = new Date();
    if (timeframe === "7d") {
      return { from: subDays(now, 7), to: now };
    } else if (timeframe === "30d") {
      return { from: subDays(now, 30), to: now };
    } else if (timeframe === "month") {
      return { from: startOfMonth(now), to: now };
    }
    // "all"
    return { from: new Date(2020, 0, 1), to: now };
  }, [timeframe]);

  const { data: analytics, isLoading: isReportsLoading } = useOnlinePreorderAnalytics(dateRange);
  const { data: metrics, isLoading: isMetricsLoading } = useOnlinePreorderMetrics();

  const isLoading = isReportsLoading || isMetricsLoading;

  // Process sales by date for Area/Bar Chart
  const salesTimeline = useMemo(() => {
    if (!analytics?.sales_by_date || !Array.isArray(analytics.sales_by_date)) return [];
    return analytics.sales_by_date.map((item: any) => {
      const d = item.date ? new Date(item.date) : new Date();
      return {
        dateStr: item.date || "",
        label: !isNaN(d.getTime()) ? format(d, "MMM dd") : item.date,
        revenue: parseFloat(String(item.total || 0)),
        orders: parseInt(String(item.orders_count || 0), 10),
      };
    });
  }, [analytics?.sales_by_date]);

  // Process status distribution for Donut Chart
  const statusDistribution = useMemo(() => {
    const breakdown = metrics?.status_breakdown || analytics?.status_breakdown || {};
    const total = Object.values(breakdown).reduce((a: number, b: any) => a + Number(b || 0), 0) as number;

    return Object.entries(breakdown)
      .filter(([_, count]) => Number(count) > 0)
      .map(([key, count]) => {
        const val = Number(count);
        return {
          name: key,
          label: key.charAt(0) + key.slice(1).toLowerCase(),
          value: val,
          percent: total > 0 ? ((val / total) * 100).toFixed(1) : "0",
          color: STATUS_COLORS[key] || "#64748B",
        };
      });
  }, [metrics?.status_breakdown, analytics?.status_breakdown]);

  // Process courier distribution
  const courierData = useMemo(() => {
    const couriers = metrics?.couriers || {};
    return Object.entries(couriers).map(([carrier, count]) => ({
      name: carrier,
      count: Number(count),
      color: COURIER_COLORS[carrier.toUpperCase()] || "#64748B",
    }));
  }, [metrics?.couriers]);

  // Top products
  const topProducts = useMemo(() => {
    if (!analytics?.top_products) return [];
    return analytics.top_products.slice(0, 5);
  }, [analytics?.top_products]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-lg border border-indigo-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              Preorder Analytics &amp; Performance
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                Live Insights
              </Badge>
            </h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Comprehensive conversion velocity, fulfillment rates, and logistics metrics.
            </p>
          </div>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10 self-start sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTimeframe("7d")}
            className={`h-7 px-3 text-xs rounded-lg font-semibold transition-all ${
              timeframe === "7d"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            7 Days
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTimeframe("30d")}
            className={`h-7 px-3 text-xs rounded-lg font-semibold transition-all ${
              timeframe === "30d"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            30 Days
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTimeframe("month")}
            className={`h-7 px-3 text-xs rounded-lg font-semibold transition-all ${
              timeframe === "month"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            This Month
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTimeframe("all")}
            className={`h-7 px-3 text-xs rounded-lg font-semibold transition-all ${
              timeframe === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-indigo-200 hover:text-white hover:bg-white/10"
            }`}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Row 1: Revenue Timeline (Area Chart) + Status Funnel (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Revenue & Volume Chart */}
        <Card className="lg:col-span-2 border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Preorder Revenue &amp; Daily Order Volume
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Daily revenue trend with overlaid completed preorder volume
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                  Revenue (৳)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Orders
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            ) : salesTimeline.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 gap-2">
                <Calendar className="w-8 h-8 opacity-40" />
                <p className="text-xs font-medium">No sales recorded for this date window.</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748B", fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                              <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
                              <p className="text-indigo-400 font-semibold">
                                Revenue: {formatCurrency(payload[0]?.value as number)}
                              </p>
                              {payload[1] && (
                                <p className="text-emerald-400 font-semibold">
                                  Orders: {payload[1]?.value}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#ordersGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Status Distribution Donut Chart */}
        <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Status Distribution
              </span>
              <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                {metrics?.total_orders || 0} Total
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Breakdown of all orders across lifecycle
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="w-36 h-36 rounded-full" />
              </div>
            ) : statusDistribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-xs">
                No status data available
              </div>
            ) : (
              <div className="relative h-[190px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs shadow-lg font-medium">
                              <span style={{ color: item.color }}>●</span> {item.label}: {item.value} ({item.percent}%)
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900 leading-tight">
                    {metrics?.total_orders ?? 0}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Orders
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Status Legend Badges */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
              {statusDistribution.map((st) => (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => onSelectStatus?.(st.name)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                >
                  <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="group-hover:text-indigo-600 transition-colors">{st.label}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {st.value}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Courier Performance + Top Selling Products Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Courier Performance */}
        <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Courier Delivery Performance
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Consignments dispatched per courier partner
                </CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                {metrics?.rates?.fulfillment_rate || 0}% Success
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Courier Breakdown Bars */}
            <div className="space-y-3">
              {courierData.map((c) => {
                const totalDispatched = metrics?.total_orders || 1;
                const sharePct = Math.round((c.count / totalDispatched) * 100);
                return (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-mono text-slate-600 font-semibold">
                        {c.count} parcels ({sharePct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, sharePct)}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick KPI Meters */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
              <div className="p-2 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <span className="text-[10px] text-emerald-700 font-semibold block">Fulfillment</span>
                <span className="text-sm font-black text-emerald-800">
                  {metrics?.rates?.fulfillment_rate || 0}%
                </span>
              </div>
              <div className="p-2 bg-purple-50/70 border border-purple-100 rounded-xl">
                <span className="text-[10px] text-purple-700 font-semibold block">Return Rate</span>
                <span className="text-sm font-black text-purple-800">
                  {metrics?.rates?.return_rate || 0}%
                </span>
              </div>
              <div className="p-2 bg-rose-50/70 border border-rose-100 rounded-xl">
                <span className="text-[10px] text-rose-700 font-semibold block">Cancelled</span>
                <span className="text-sm font-black text-rose-800">
                  {metrics?.rates?.cancellation_rate || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 2 Cols: Top Preordered Products Leaderboard */}
        <Card className="lg:col-span-2 border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  Top Selling Preorder Products
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Highest volume and revenue drivers in online preorders
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-indigo-600">Top 5 Leaderboard</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No product sales data recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topProducts.map((p: any, idx: number) => {
                  return (
                    <div
                      key={p.product_id || idx}
                      className="p-3.5 sm:px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700 shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {p.product_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {p.category_name || "Uncategorized"} •{" "}
                            <span className="font-semibold text-slate-700">{p.quantity_sold} units sold</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-black text-slate-900">
                          {formatCurrency(p.total_sales)}
                        </p>
                        {Number(p.total_profit || 0) > 0 && (
                          <p className="text-[10px] font-bold text-emerald-600">
                            +{formatCurrency(p.total_profit)} profit
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

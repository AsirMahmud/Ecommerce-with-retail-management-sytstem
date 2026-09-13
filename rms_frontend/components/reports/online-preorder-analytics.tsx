"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import React, { useState, useMemo } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Tag,
  BarChart3,
  Package,
  Users,
  XCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Search,
  Clock,
  Truck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import { DateRange } from "react-day-picker";

interface OnlinePreorderAnalyticsProps {
  dateRange: DateRange;
}

export function OnlinePreorderAnalytics({ dateRange }: OnlinePreorderAnalyticsProps) {
  const { data: analyticsData, isLoading, error } = useOnlinePreorderAnalytics(dateRange);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "high_risk" | "repeat" | "reliable">("all");

  // Process chart data with error handling
  const chartData = useMemo(() => {
    if (!analyticsData?.sales_by_date || !Array.isArray(analyticsData.sales_by_date)) {
      return [];
    }
    
    return analyticsData.sales_by_date
      .filter((item: any) => item && item.date)
      .map((item: any) => {
        try {
          let date: Date;
          if (typeof item.date === 'string') {
            date = new Date(item.date);
          } else if (item.date instanceof Date) {
            date = item.date;
          } else {
            return null;
          }
          
          if (isNaN(date.getTime())) {
            return null;
          }
          
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: parseFloat(String(item.total || '0')),
            orders: parseInt(String(item.orders_count || '0'), 10),
          };
        } catch (e) {
          return null;
        }
      })
      .filter((item: any) => item !== null && item !== undefined);
  }, [analyticsData?.sales_by_date]);

  // Derived customer metrics
  const customers = useMemo(() => {
    return analyticsData?.top_customers || [];
  }, [analyticsData?.top_customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const nameMatch = c.customer_name?.toLowerCase().includes(customerSearch.toLowerCase());
      const phoneMatch = c.customer_phone?.includes(customerSearch);
      
      let addressString = "";
      if (typeof c.customer_address === "string") {
        addressString = c.customer_address;
      } else if (c.customer_address && typeof c.customer_address === "object") {
        addressString = Object.values(c.customer_address).join(" ");
      }
      const addressMatch = addressString.toLowerCase().includes(customerSearch.toLowerCase());

      const matchesSearch = !customerSearch || nameMatch || phoneMatch || addressMatch;
      if (!matchesSearch) return false;

      if (customerFilter === "high_risk") {
        return c.cancelled_orders >= 2 || Number(c.cancellation_rate) >= 30;
      }
      if (customerFilter === "repeat") {
        return c.total_orders > 1;
      }
      if (customerFilter === "reliable") {
        return c.cancelled_orders === 0 && c.completed_orders > 0;
      }
      return true;
    });
  }, [customers, customerSearch, customerFilter]);

  const formatAddress = (addr: string | Record<string, any> | undefined | null) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    const parts = [addr.district, addr.division].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return addr.address || "Address Provided";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-slate-100 p-4">
              <Skeleton className="h-4 w-[100px] mb-3" />
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No analytics data available</p>
        {error && (
          <p className="text-red-500 text-sm mt-2">Error: {error.message || 'Failed to load data'}</p>
        )}
      </div>
    );
  }

  const totalOrders = analyticsData.total_orders || 0;
  const totalSalesCount = analyticsData.total_sales_count || 0;
  const cancelledOrdersCount = analyticsData.cancelled_orders_count ?? analyticsData.status_breakdown?.CANCELLED ?? 0;
  const cancellationRate = analyticsData.cancellation_rate ?? (totalOrders ? ((cancelledOrdersCount / totalOrders) * 100).toFixed(1) : 0);
  const fulfillmentRate = totalOrders ? Math.round((totalSalesCount / totalOrders) * 100) : 0;
  const uniqueCustomers = analyticsData.customer_stats?.total_unique_customers ?? customers.length;
  const repeatCustomers = analyticsData.customer_stats?.repeat_customers ?? customers.filter(c => c.total_orders > 1).length;
  const repeatRate = analyticsData.customer_stats?.repeat_rate ?? (uniqueCustomers ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1) : 0);

  const statusBreakdown = analyticsData.status_breakdown || {};

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards - Row 1: Sales & Orders */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalOrders}</div>
            <p className="text-[11px] text-slate-400 mt-1">All online preorders</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalSalesCount}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Completed orders</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(analyticsData.total_revenue)}
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-1">From completed orders</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(analyticsData.average_order_value)}
            </div>
            <p className="text-[11px] text-purple-600 font-medium mt-1">Per completed order</p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary Cards - Row 2: Customer & Cancellation Analytics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unique Customers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{uniqueCustomers}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total online buyers</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Repeat Customers</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{repeatCustomers}</div>
            <p className="text-[11px] text-cyan-600 font-medium mt-1">{repeatRate}% repeat buyer rate</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelled Orders</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <XCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-rose-600 tracking-tight">{cancelledOrdersCount}</div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">{cancellationRate}% cancellation rate</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fulfillment Rate</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{fulfillmentRate}%</div>
            <p className="text-[11px] text-teal-600 font-medium mt-1">{totalSalesCount} of {totalOrders} completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            Sales Trend Over Time
          </CardTitle>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Revenue ($)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Orders
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-[320px] sm:h-[360px] w-full">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    fontSize={11}
                    stroke="#94a3b8"
                    tickMargin={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="#94a3b8"
                    tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="#94a3b8"
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/90 text-white px-3.5 py-2.5 rounded-xl shadow-xl backdrop-blur-md text-xs border border-slate-800 space-y-1">
                            <p className="font-semibold text-slate-300 mb-1">{label}</p>
                            {payload.map((p: any, idx: number) => (
                              <p key={idx} className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: p.color || p.fill }}
                                />
                                <span className="text-slate-400 capitalize">{p.name}:</span>
                                <span className="font-bold text-white">
                                  {p.dataKey === 'revenue' ? formatCurrency(p.value) : `${p.value} orders`}
                                </span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="revenue" 
                    fill="#6366f1" 
                    name="Revenue"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="orders" 
                    fill="#10b981" 
                    name="Orders"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChart3 className="h-10 w-10 mb-2 opacity-40 text-slate-400" />
                <p className="text-xs">No sales data available for the selected period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown and Cancellation Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status Breakdown */}
        <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Order Status Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Breakdown of all {totalOrders} orders in period
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {[
              { label: "Completed", key: "COMPLETED", count: statusBreakdown.COMPLETED || 0, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Confirmed", key: "CONFIRMED", count: statusBreakdown.CONFIRMED || 0, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
              { label: "Delivered", key: "DELIVERED", count: statusBreakdown.DELIVERED || 0, color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
              { label: "Pending", key: "PENDING", count: statusBreakdown.PENDING || 0, color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
              { label: "Cancelled", key: "CANCELLED", count: statusBreakdown.CANCELLED || 0, color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
            ].map((st) => {
              const pct = totalOrders ? Math.round((st.count / totalOrders) * 100) : 0;
              return (
                <div key={st.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className={`w-2 h-2 rounded-full ${st.color}`}></span>
                      {st.label}
                    </span>
                    <span className="text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded-md font-bold ${st.bg} ${st.text} mr-1.5`}>{st.count}</span>
                      ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${st.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Cancellation Insights & Reasons */}
        <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Cancellation Insights &amp; Reasons
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Analysis of {cancelledOrdersCount} cancelled orders ({cancellationRate}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {analyticsData.cancel_reasons && analyticsData.cancel_reasons.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.cancel_reasons.map((cr: any, idx: number) => {
                  const pct = cancelledOrdersCount ? Math.round((cr.count / cancelledOrdersCount) * 100) : 0;
                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-800">{cr.cancel_reason || "Unspecified"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{cr.count} orders affected</div>
                      </div>
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs">
                        {pct}% of cancels
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700">Cancellation Monitoring Active</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  {cancelledOrdersCount > 0 
                    ? `${cancelledOrdersCount} cancellations recorded. Reasons logged on order sheets will appear here.`
                    : "Excellent fulfillment record with zero cancellations in this period!"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Online Customer Analysis & Cancellation History Table */}
      <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Online Customer Analysis &amp; Cancellation Track Record
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                Analyze frequent shoppers, completed vs cancelled orders, and detect high-risk buyer profiles
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, phone, area..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 h-9 bg-white border-slate-200 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-semibold">
                <Button
                  variant={customerFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCustomerFilter("all")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${customerFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All ({customers.length})
                </Button>
                <Button
                  variant={customerFilter === "repeat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCustomerFilter("repeat")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${customerFilter === "repeat" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Repeat ({repeatCustomers})
                </Button>
                <Button
                  variant={customerFilter === "high_risk" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCustomerFilter("high_risk")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${customerFilter === "high_risk" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  High Cancel Risk
                </Button>
                <Button
                  variant={customerFilter === "reliable" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCustomerFilter("reliable")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${customerFilter === "reliable" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Reliable
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-semibold text-slate-600 text-sm">No customers found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[550px]">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Customer</TableHead>
                    <TableHead className="font-bold text-slate-700">Location</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Total Orders</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Completed</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Cancelled</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Risk Assessment</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Total Spent</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c, idx) => {
                    const cancelRate = Number(c.cancellation_rate) || 0;
                    const isHighRisk = c.cancelled_orders >= 2 || cancelRate >= 30;
                    const isCaution = c.cancelled_orders === 1;

                    return (
                      <TableRow key={c.customer_phone || idx} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                              {(c.customer_name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">{c.customer_name || "Guest Customer"}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {c.customer_phone}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 max-w-[160px] truncate">
                          <span title={typeof c.customer_address === "string" ? c.customer_address : JSON.stringify(c.customer_address)}>
                            {formatAddress(c.customer_address)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-black text-slate-800 text-xs sm:text-sm">
                          {c.total_orders}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {c.completed_orders}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          {c.cancelled_orders > 0 ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              {c.cancelled_orders} ({cancelRate}%)
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">0 (0%)</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {isHighRisk ? (
                            <Badge className="bg-rose-100 text-rose-800 border-none font-semibold text-[10px] sm:text-[11px] px-2 py-0.5">
                              <ShieldAlert className="w-3 h-3 mr-1 text-rose-600" />
                              High Cancel Risk
                            </Badge>
                          ) : isCaution ? (
                            <Badge className="bg-amber-100 text-amber-800 border-none font-semibold text-[10px] sm:text-[11px] px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                              Caution
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[10px] sm:text-[11px] px-2 py-0.5">
                              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                              Reliable
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-bold text-slate-900 text-xs sm:text-sm">
                          {formatCurrency(c.total_spent || 0)}
                        </TableCell>

                        <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                          {c.last_order_date || "N/A"}
                          {c.last_order_id && (
                            <span className="block text-[10px] text-indigo-600 font-semibold">#{c.last_order_id}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products and Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-5 border-b">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Package className="h-5 w-5 text-indigo-600" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analyticsData.top_products && analyticsData.top_products.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.top_products.map((product: any, idx: number) => (
                    <TableRow key={product.product_id || idx} className="hover:bg-slate-50/60">
                      <TableCell className="font-semibold text-slate-900 text-xs">{product.product_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{product.category_name || 'Uncategorized'}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-700">{product.quantity_sold || 0}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-slate-900">
                        {formatCurrency(product.total_sales || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Package className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-xs">No product data available for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-5 border-b">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Tag className="h-5 w-5 text-indigo-600" />
              Top Categories by Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analyticsData.top_categories && analyticsData.top_categories.length > 0 ? (
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.top_categories.map((category: any, idx: number) => (
                    <TableRow key={category.category_name || idx} className="hover:bg-slate-50/60">
                      <TableCell className="font-semibold text-slate-900 text-xs">{category.category_name || 'Uncategorized'}</TableCell>
                      <TableCell className="text-right text-xs text-slate-600">{category.order_count || 0}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-700">{category.quantity_sold || 0}</TableCell>
                      <TableCell className="text-right font-bold text-xs text-slate-900">
                        {formatCurrency(category.total_sales || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Tag className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-xs">No category data available for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

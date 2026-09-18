"use client";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ShoppingCart,
  Package,
  Filter,
  Users,
  Target,
  Calendar,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { useDashboardStats } from "@/hooks/queries/use-sales";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

interface SalesTrendDataPoint {
  date: string;
  sales: number;
  profit: number;
  orders: number;
}

interface PaymentMethodDataPoint {
  method: string;
  count: number;
  total: number;
}

interface SalesByHourDataPoint {
  hour: number;
  count: number;
  total: number;
}

export default function SalesOverview() {
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "90d">("7d");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const {
    data: stats,
    isLoading,
    error,
  } = useDashboardStats({
    period: timeFilter,
    status: status || undefined,
    payment_method: paymentMethod || undefined,
    customer_phone: customerPhone || undefined,
    start_date: dateRange.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    end_date: dateRange.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : undefined,
  });

  const anyStats = stats as any;

  const metrics = {
    totalRevenue: anyStats?.monthly?.total_sales || 0,
    totalOrders: anyStats?.monthly?.total_transactions || 0,
    totalProfit: anyStats?.monthly?.total_profit || 0,
    totalDiscount: anyStats?.monthly?.total_discount || 0,
    avgTransactionValue: anyStats?.monthly?.average_transaction_value || 0,
    totalCustomers: anyStats?.monthly?.total_customers || 0,
    todayRevenue: anyStats?.today?.total_sales || 0,
    todayOrders: anyStats?.today?.total_transactions || 0,
    todayProfit: anyStats?.today?.total_profit || 0,
    todayCustomers: anyStats?.today?.total_customers || 0,
  };

  // Format sales trend data for the chart
  const salesTrendData = useMemo<SalesTrendDataPoint[]>(() => {
    if (!anyStats?.sales_trend) return [];
    return anyStats.sales_trend.map((item: any) => ({
      date: item.date__date,
      sales: item.sales,
      profit: item.profit,
      orders: item.orders,
    }));
  }, [anyStats?.sales_trend]);

  // Format payment method distribution data
  const paymentMethodData = useMemo<PaymentMethodDataPoint[]>(() => {
    if (!anyStats?.payment_method_distribution) return [];
    return anyStats.payment_method_distribution.map((item: any) => ({
      method: item.payment_method,
      count: item.count,
      total: item.total,
    }));
  }, [anyStats?.payment_method_distribution]);

  // Format sales by hour data (filter out zero values for better visualization)
  const salesByHourData = useMemo<SalesByHourDataPoint[]>(() => {
    if (!anyStats?.sales_by_hour) return [];
    return anyStats.sales_by_hour.filter(
      (item: any) => item.count > 0 || item.total > 0
    );
  }, [anyStats?.sales_by_hour]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">Error loading sales data</p>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-2 sm:p-4 md:p-6 space-y-6 sm:space-y-8 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Sales Overview
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              Track your sales performance and key metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select
              value={timeFilter}
              onValueChange={(value: "7d" | "30d" | "90d") =>
                setTimeFilter(value)
              }
            >
              <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200 shadow-sm text-xs sm:text-sm">
                <Calendar className="w-4 h-4 mr-2 text-gray-500 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white border-gray-200 shadow-sm hover:bg-gray-50 text-xs sm:text-sm"
              onClick={() => setAdvancedOpen(true)}
            >
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filter Modal */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="p-4 sm:p-6 w-[95vw] max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Advanced Filters</h2>
            <div className="space-y-2">
              <label>Status</label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <label>Payment Method</label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
              <label>Customer Phone</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
              />
              <label>Date Range</label>
              <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdvancedOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setAdvancedOpen(false)}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Today's Key Metrics (4 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Live Performance
            </h2>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Real-Time
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5">
            {/* Today's Sales */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Today's Sales
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ${metrics.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Daily sales revenue
              </div>
            </Card>

            {/* Today's Orders */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Today's Orders
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.todayOrders}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Transactions processed today
              </div>
            </Card>

            {/* Today's Profit */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Today's Profit
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                ${metrics.todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-emerald-600 mt-2">
                Net operational profit
              </div>
            </Card>

            {/* Avg Transaction */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Avg Ticket Size
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ${metrics.avgTransactionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Average value per order
              </div>
            </Card>
          </div>
        </div>

        {/* Monthly Performance (4 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Cumulative Overview
            </h2>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Current Month
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5">
            {/* Monthly Revenue */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Revenue
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Monthly gross revenue
              </div>
            </Card>

            {/* Monthly Orders */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Orders
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalOrders}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Monthly orders completed
              </div>
            </Card>

            {/* Monthly Profit */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Profit
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                ${metrics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-emerald-600 mt-2">
                Monthly net margin
              </div>
            </Card>

            {/* Total Discount */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Discounts
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ${metrics.totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Promotions and concessions
              </div>
            </Card>
          </div>
        </div>

        {/* Top Products and Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Top Products */}
          <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Top Selling Products
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Best performing products this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.top_products?.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                        <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {product.product__name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.total_quantity} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${product.total_revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-emerald-600">
                        ${product.total_profit.toLocaleString()} profit
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Top Customers
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Highest spending customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anyStats?.customer_analytics?.top_customers?.map(
                  (customer: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                          <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            {customer.customer_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {customer.customer__phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${customer.total_spent.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.visit_count} visits
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Trend Chart */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
              Sales & Profit Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daily sales and profit trajectory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[350px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesTrendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorProfit"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Orders") {
                        return [value.toLocaleString(), name];
                      }
                      return [`$${value.toLocaleString()}`, name];
                    }}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#f59e0b"
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
              Payment Method Distribution
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Revenue breakdown and volume across payment channels
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {paymentMethodData && paymentMethodData.length > 0 ? (
              <div className="space-y-4">
                {/* Donut Chart with Center Total */}
                <div className="h-[220px] sm:h-[250px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="88%"
                        paddingAngle={3}
                        cornerRadius={5}
                        dataKey="total"
                        stroke="none"
                      >
                        {paymentMethodData.map((entry, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          `$${value.toLocaleString()}`,
                          "Revenue",
                        ]}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#f8fafc",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.25)",
                        }}
                        itemStyle={{ color: "#38bdf8", fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Metric */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Total Revenue
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                      ${paymentMethodData.reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Modern Legend Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                  {paymentMethodData.map((item, index) => {
                    const totalRev = paymentMethodData.reduce((sum, p) => sum + (p.total || 0), 0);
                    const pct = totalRev > 0 ? Math.round(((item.total || 0) / totalRev) * 100) : 0;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 uppercase tracking-wide truncate">
                              {item.method}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.count} orders
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-slate-900">${(item.total || 0).toLocaleString()}</p>
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                No payment method data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Analytics (4 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer & Audience Growth
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              Client Base Metrics
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-5">
            {/* Total Customers */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Clients
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalCustomers.toLocaleString()}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Total registered accounts
              </div>
            </Card>

            {/* New Customers Today */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  New Clients Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {anyStats?.customer_analytics?.new_customers_today || 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Acquired in current session
              </div>
            </Card>

            {/* Active Customers Today */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Transacting
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {anyStats?.customer_analytics?.active_customers_today || 0}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Made purchases today
              </div>
            </Card>

            {/* Retention Rate */}
            <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Retention Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {(anyStats?.customer_analytics?.customer_retention_rate || 0).toFixed(1)}%
              </div>
              <div className="text-xs font-medium text-slate-500 mt-2">
                Returning customer percentage
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

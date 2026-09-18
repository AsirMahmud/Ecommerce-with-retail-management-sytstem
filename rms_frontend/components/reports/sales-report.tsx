"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSalesReport } from "@/hooks/queries/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Tag,
  CreditCard,
  TrendingUp,
  Award,
  Package,
  Sparkles,
  ArrowUpRight,
  Layers,
} from "lucide-react";

// Curated luxury palette for charts
const LUXURY_PALETTE = [
  "#6366F1", // Indigo
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Rose Pink
  "#8B5CF6", // Violet
  "#3B82F6", // Sky Blue
  "#64748B", // Slate
];

export function SalesReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: salesData, isLoading } = useSalesReport(dateRange);

  const totalCategorySales = useMemo(() => {
    if (!salesData?.sales_by_category) return 0;
    return salesData.sales_by_category.reduce(
      (acc, curr) => acc + (parseFloat(curr.total) || 0),
      0
    );
  }, [salesData]);

  const maxProductSales = useMemo(() => {
    if (!salesData?.top_products || salesData.top_products.length === 0) return 1;
    return Math.max(
      ...salesData.top_products.map((p) => parseFloat(p.total_sales) || 0),
      1
    );
  }, [salesData]);

  const totalPaymentSales = useMemo(() => {
    if (!salesData?.payment_methods) return 0;
    return salesData.payment_methods.reduce(
      (acc, curr) => acc + (parseFloat(curr.total) || 0),
      0
    );
  }, [salesData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-slate-100 shadow-xs p-5">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border border-slate-100 shadow-xs p-6">
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!salesData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Sales Data Available</h3>
        <p className="text-xs text-slate-500 mt-1">
          There are no completed sales recorded for this selected time window.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Executive Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Sales */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gross Sales Volume
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${parseFloat(salesData.total_sales || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{salesData.total_orders || 0} orders completed</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Order Value (AOV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${parseFloat(salesData.average_order_value || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>{salesData.total_items_sold || 0} total units sold</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Item Price */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Item Price
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${parseFloat(salesData.average_item_price || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Weighted across catalog units</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retail Sales Accounting Waterfall Strip */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase">Gross Sales:</span>
            <span className="font-extrabold text-slate-800">
              ${parseFloat(salesData.gross_sales || salesData.total_sales || "0").toFixed(2)}
            </span>
          </div>
          <span className="text-slate-300 font-bold">−</span>
          <div className="flex items-center gap-1.5">
            <span className="text-rose-500 font-bold uppercase">Discounts:</span>
            <span className="font-extrabold text-rose-600">
              ${parseFloat(salesData.total_discounts || "0").toFixed(2)}
            </span>
          </div>
          <span className="text-slate-300 font-bold">+</span>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-500 font-bold uppercase">Taxes:</span>
            <span className="font-extrabold text-blue-600">
              ${parseFloat(salesData.total_tax || "0").toFixed(2)}
            </span>
          </div>
          <span className="text-slate-300 font-bold">−</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold uppercase">Refunds:</span>
            <span className="font-extrabold text-amber-600">
              ${parseFloat(salesData.total_refunds || "0").toFixed(2)}
            </span>
          </div>
          <span className="text-slate-300 font-bold">=</span>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span className="text-emerald-700 font-extrabold uppercase">Net Realized Revenue:</span>
            <span className="font-black text-emerald-800 text-sm">
              ${parseFloat(salesData.net_sales || salesData.total_sales || "0").toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Main Analysis Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="bg-slate-200/60 p-1 rounded-xl border border-slate-200/80 inline-flex gap-1 text-xs sm:text-sm">
            <TabsTrigger
              value="products"
              className="rounded-lg px-3 py-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
            >
              Top Products Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value="channels"
              className="rounded-lg px-3 py-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
            >
              Sales Channels
            </TabsTrigger>
            <TabsTrigger
              value="trend"
              className="rounded-lg px-3 py-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
            >
              Sales Timeline
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="rounded-lg px-3 py-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
            >
              Category Distribution
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-lg px-3 py-1.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
            >
              Payment Channels
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Top Selling Products Leaderboard */}
        <TabsContent value="products">
          <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Product Performance Leaderboard
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked by gross sales volume with contribution share and profit margin
                </p>
              </div>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-xs w-fit">
                {salesData.top_products?.length || 0} Ranked Items
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {salesData.top_products?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No product sales recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
                        <TableHead className="w-14 text-center text-xs font-bold uppercase text-slate-500">
                          Rank
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 min-w-[180px]">
                          Product
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500">
                          Category
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-slate-500 min-w-[140px]">
                          Sales & Share
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                          Units Sold
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                          Avg Price
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                          Net Profit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.top_products.map((product, idx) => {
                        const salesVal = parseFloat(product.total_sales) || 0;
                        const profitVal = parseFloat(product.profit) || 0;
                        const pctOfMax = Math.min(100, Math.round((salesVal / maxProductSales) * 100));

                        // Medal badge style
                        const rankBadge =
                          idx === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs shadow-xs border border-amber-300">
                              🥇
                            </span>
                          ) : idx === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-xs shadow-xs border border-slate-300">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-black text-xs shadow-xs border border-orange-300">
                              🥉
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                              {idx + 1}
                            </span>
                          );

                        return (
                          <TableRow
                            key={product.product_name || idx}
                            className="hover:bg-indigo-50/30 transition-colors border-b border-slate-100"
                          >
                            <TableCell className="text-center">{rankBadge}</TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                {product.product_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 hover:bg-slate-100 font-medium text-[11px]"
                              >
                                {product.category_name || "Uncategorized"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                ${salesVal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${pctOfMax}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-700 text-xs sm:text-sm">
                              {product.quantity_sold}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-600 text-xs sm:text-sm">
                              ${parseFloat(product.average_price || "0").toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  profitVal >= 0
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                    : "bg-rose-50 text-rose-700 border border-rose-200/60"
                                }`}
                              >
                                ${profitVal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
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
        </TabsContent>

        {/* 2. Sales by Channel (POS vs Online vs Offline Preorder) */}
        <TabsContent value="channels">
          <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Sales by Channel Matrix
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparison between in-store POS register and online/offline preorders
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Channel</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Gross Sales</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Orders</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Items Sold</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">AOV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(salesData.sales_by_channel || []).map((ch, idx) => {
                    const totalVal = parseFloat(ch.total) || 0;
                    const aov = ch.orders > 0 ? totalVal / ch.orders : 0;
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50/80">
                        <TableCell className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                          {ch.channel}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                          ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{ch.orders}</TableCell>
                        <TableCell className="text-right font-medium text-slate-700">{ch.items}</TableCell>
                        <TableCell className="text-right font-bold text-indigo-600">
                          ${aov.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Sales Trend Timeline */}
        <TabsContent value="trend">
          <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  Sales Volume Trend Over Time
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily fluctuations and gross sales curve
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {salesData.sales_by_date?.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  No timeline data points for the selected window.
                </div>
              ) : (
                <div className="h-[320px] sm:h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesData.sales_by_date}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
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
                            const val = parseFloat(String(payload[0].value || 0));
                            return (
                              <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800 space-y-1">
                                <p className="font-semibold text-slate-400 border-b border-slate-800 pb-1">
                                  {label}
                                </p>
                                <p className="font-black text-indigo-300 text-sm">
                                  ${val.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={(data) => parseFloat(data.total)}
                        stroke="#6366F1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#salesTrendGrad)"
                        name="Sales"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Category Breakdown */}
        <TabsContent value="categories">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-5 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Category Share
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[280px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const itemData = payload[0];
                            const val = parseFloat(String(itemData.value));
                            const pct =
                              totalCategorySales > 0
                                ? ((val / totalCategorySales) * 100).toFixed(1)
                                : 0;
                            return (
                              <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                                <p className="font-semibold text-slate-300">{itemData.name}</p>
                                <p className="font-bold text-indigo-400 mt-0.5">
                                  ${val.toFixed(2)}
                                </p>
                                <p className="text-[11px] text-slate-400">{pct}% of revenue</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={salesData.sales_by_category}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="88%"
                        paddingAngle={3}
                        cornerRadius={5}
                        dataKey={(data) => parseFloat(data.total)}
                        nameKey="category_name"
                      >
                        {salesData.sales_by_category.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={LUXURY_PALETTE[index % LUXURY_PALETTE.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Catalog Total
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      ${totalCategorySales.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-7 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900">
                  Category Breakdown Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 border-b border-slate-100">
                      <TableHead className="text-xs font-bold uppercase text-slate-500">
                        Category
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Gross Sales
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Share
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Qty Sold
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.sales_by_category.map((category, idx) => {
                      const catSales = parseFloat(category.total) || 0;
                      const sharePct =
                        totalCategorySales > 0
                          ? ((catSales / totalCategorySales) * 100).toFixed(1)
                          : "0";
                      const color = LUXURY_PALETTE[idx % LUXURY_PALETTE.length];

                      return (
                        <TableRow key={category.category_name} className="hover:bg-slate-50/80">
                          <TableCell className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            {category.category_name}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-900">
                            ${catSales.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-slate-500">
                            <div className="flex items-center justify-end gap-2">
                              <span>{sharePct}%</span>
                              <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${sharePct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-slate-700">
                            {category.quantity_sold}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. Payment Channels */}
        <TabsContent value="payments">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-6 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Payment Channels Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesData.payment_methods}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="payment_method"
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
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                                <p className="font-semibold text-slate-300 capitalize">{label}</p>
                                <p className="font-black text-indigo-400 mt-1 text-sm">
                                  ${parseFloat(String(payload[0].value)).toFixed(2)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey={(data) => parseFloat(data.total)}
                        fill="#6366F1"
                        radius={[8, 8, 0, 0]}
                        name="Total Sales"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-6 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
              <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900">
                  Payment Method Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 border-b border-slate-100">
                      <TableHead className="text-xs font-bold uppercase text-slate-500">
                        Method
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Total Volume
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Share
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                        Orders
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.payment_methods.map((method) => {
                      const methodTotal = parseFloat(method.total) || 0;
                      const sharePct =
                        totalPaymentSales > 0
                          ? ((methodTotal / totalPaymentSales) * 100).toFixed(1)
                          : "0";
                      return (
                        <TableRow key={method.payment_method} className="hover:bg-slate-50/80">
                          <TableCell className="text-xs font-bold text-slate-900 capitalize flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            {method.payment_method}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-slate-900">
                            ${methodTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-slate-600">
                            {sharePct}%
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-slate-500">
                            {method.orders_count}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

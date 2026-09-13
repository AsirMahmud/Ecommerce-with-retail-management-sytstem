"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Plus,
  Package,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { usePreorderStats } from "@/hooks/queries/use-preorder";
import { PreorderList } from "@/components/preorder/preorder-list";

import { PreorderStats } from "@/types/preorder";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

export default function PreorderPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data: stats, isLoading: statsLoading } = usePreorderStats();

  const isLoading = statsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "DEPOSIT_PAID":
        return "bg-orange-100 text-orange-800";
      case "FULLY_PAID":
        return "bg-green-100 text-green-800";
      case "ARRIVED":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-indigo-100 text-indigo-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const typedStats = stats as PreorderStats | undefined;

  // Prepare chart data
  const statusChartData = typedStats?.status_breakdown
    ? Object.entries(typedStats.status_breakdown).map(([status, count]) => ({
        status,
        count,
        color: getStatusColor(status).split(" ")[0].replace("bg-", ""),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200/90 shadow-2xs animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Package className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Preorder Management</h1>
          </div>
          <p className="text-sm text-slate-500">
            Track and process advance customer bookings, allocations, and fulfillment statuses.
          </p>
        </div>
        <Button
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
        >
          <Link href="/preorder/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Preorder
          </Link>
        </Button>
      </div>

      <Tabs
        value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-1">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Modern Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Orders
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {typedStats?.total_orders || 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    All-time preorders count
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Revenue
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(typedStats?.total_revenue || 0)}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Expected preorder revenue
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pending Orders
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                    <Calendar className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {typedStats?.pending_orders || 0}
                  </div>
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    Awaiting processing/arrival
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Completed Orders
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                    <Package className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {typedStats?.completed_orders || 0}
                  </div>
                  <p className="text-[11px] text-purple-600 font-medium mt-1">
                    Delivered & finished
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modern Status Distribution Donut */}
              <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                    Order Status Distribution
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Preorder breakdown by current processing stage
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-7 h-[250px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0];
                                return (
                                  <div className="bg-slate-900/90 text-white px-3 py-2 rounded-xl shadow-xl backdrop-blur-md text-xs border border-slate-800">
                                    <p className="font-semibold text-slate-300">{data.name}</p>
                                    <p className="font-bold text-indigo-400 mt-0.5">
                                      {data.value} orders
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Pie
                            data={statusChartData}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius="65%"
                            outerRadius="88%"
                            paddingAngle={3}
                            cornerRadius={5}
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Total
                        </span>
                        <span className="text-xl font-extrabold text-slate-900">
                          {typedStats?.total_orders || 0}
                        </span>
                        <span className="text-[10px] text-slate-400">Orders</span>
                      </div>
                    </div>

                    <div className="sm:col-span-5 max-h-[250px] overflow-y-auto space-y-2 pr-1">
                      {statusChartData.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No status data</p>
                      ) : (
                        statusChartData.map((entry, idx) => (
                          <div
                            key={entry.status}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              <span className="font-medium text-slate-800 truncate">
                                {entry.status}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900 ml-2">
                              {entry.count}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Breakdown Detailed Cards */}
              {typedStats?.status_breakdown && (
                <Card className="border border-slate-100/80 shadow-md bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                  <CardHeader className="p-5 border-b border-slate-100">
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" />
                      Detailed Status Matrix
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Quick overview of active pipeline status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(typedStats.status_breakdown).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            className="flex flex-col p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all hover:border-slate-200"
                          >
                            <Badge className={`${getStatusColor(status)} w-fit text-[10px] px-2 py-0.5 rounded-md font-medium mb-2`}>
                              {status}
                            </Badge>
                            <span className="text-xl font-black text-slate-900">
                              {count}
                            </span>
                            <span className="text-[10px] text-slate-400">Total orders</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <PreorderList />
          </TabsContent>
        </Tabs>
    </div>
  );
}

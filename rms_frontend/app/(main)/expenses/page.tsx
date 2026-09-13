"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { ExpenseForm } from "@/components/expense/expense-form";
import { ExpenseList } from "@/components/expense/expense-list";
import { CategoryManager } from "@/components/expense/category-manager";
import { ReportsPage } from "@/components/expense/reports-page";
import { useDashboardStats } from "@/hooks/queries/use-expenses";
import { formatCurrency } from "@/lib/utils";

const DONUT_COLORS = [
  "#6366F1",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#64748B",
];

export default function ExpenseManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-0 sm:p-2 md:p-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Expense Management
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                Comprehensive retail expense tracking and management
              </p>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 sm:space-y-8"
        >
          <TabsList className="flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 w-full bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-1 h-auto">
            <TabsTrigger
              value="dashboard"
              className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="add-expense"
              className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Add Expense
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 sm:space-y-8">
            {/* Modern Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Expenses
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <DollarSign className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(stats?.monthly.total_amount || 0)}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>This month's total</span>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Today's Expenses
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(stats?.today.total_amount || 0)}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
                  <span>{stats?.today.total_count || 0} expenses logged today</span>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-amber-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pending Expenses
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stats?.today.pending_count || 0}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
                  <span>Awaiting approval</span>
                </div>
              </Card>

              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-violet-300/80 transition-all duration-300 p-5 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Approved Expenses
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stats?.today.approved_count || 0}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50/80 border border-violet-200/60 px-2 py-0.5 rounded-full w-fit mt-2.5">
                  <span>Approved today</span>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Monthly Trend (Smooth Area Chart) */}
              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Monthly Expense Trend
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Expense trends over the last 6 months
                      </CardDescription>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="h-[260px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.monthly_trend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="expenseMonthlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                        />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value as number), "Expenses"]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid #334155",
                            borderRadius: "12px",
                            color: "#f8fafc",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.25)",
                          }}
                          itemStyle={{ color: "#818cf8", fontWeight: 600 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          name="Expenses"
                          stroke="#6366F1"
                          strokeWidth={2.5}
                          fill="url(#expenseMonthlyAreaGrad)"
                          activeDot={{ r: 6, fill: "#6366F1", stroke: "#FFFFFF", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution (Sleek Donut Chart) */}
              <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Category Distribution
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Expenses broken down by category this month
                      </CardDescription>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                      <Layers className="h-4.5 w-4.5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {stats?.category_distribution && stats.category_distribution.length > 0 ? (
                    <div className="space-y-4">
                      {/* Donut Chart with Center KPI */}
                      <div className="h-[180px] sm:h-[190px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.category_distribution}
                              dataKey="total"
                              nameKey="category__name"
                              cx="50%"
                              cy="50%"
                              innerRadius="65%"
                              outerRadius="88%"
                              paddingAngle={3}
                              cornerRadius={5}
                              stroke="none"
                            >
                              {stats.category_distribution.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.category__color ||
                                    DONUT_COLORS[index % DONUT_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [formatCurrency(value as number), "Amount"]}
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
                        {/* Centered Donut Summary */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Total
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                            {formatCurrency(
                              stats.category_distribution.reduce(
                                (sum, c) => sum + (Number(c.total) || 0),
                                0
                              )
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Modern Category Legend List */}
                      <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                        {stats.category_distribution.map((cat, index) => {
                          const totalVal = stats.category_distribution.reduce(
                            (sum, c) => sum + (Number(c.total) || 0),
                            0
                          );
                          const amount = Number(cat.total) || 0;
                          const pct = totalVal > 0 ? Math.round((amount / totalVal) * 100) : 0;
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      cat.category__color ||
                                      DONUT_COLORS[index % DONUT_COLORS.length],
                                  }}
                                />
                                <span className="font-medium text-slate-800 truncate" title={cat.category__name}>
                                  {cat.category__name}
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
                      No category expense data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseList />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPage />
          </TabsContent>

          <TabsContent value="add-expense">
            <ExpenseForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

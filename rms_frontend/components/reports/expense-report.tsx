"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useExpenseReport } from "@/hooks/queries/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingDown,
  Tag,
  Layers,
  Calendar,
  AlertCircle,
  Receipt,
  ArrowDownRight,
} from "lucide-react";

const EXPENSE_PALETTE = [
  "#F43F5E", // Rose
  "#FB7185", // Pink-rose
  "#F59E0B", // Amber
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

export function ExpenseReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: expenseData, isLoading } = useExpenseReport(dateRange);

  const totalExpenseAmount = useMemo(() => {
    if (!expenseData?.total_expenses) return 0;
    return parseFloat(expenseData.total_expenses) || 0;
  }, [expenseData]);

  const largestExpense = useMemo(() => {
    if (!expenseData?.expenses_by_category || expenseData.expenses_by_category.length === 0) {
      return { category_name: "None", total: "0" };
    }
    return expenseData.expenses_by_category.reduce(
      (max, cat) => (parseFloat(cat.total) > parseFloat(max.total) ? cat : max),
      { category_name: "N/A", total: "0" }
    );
  }, [expenseData]);

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

  if (!expenseData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Expense Records Available</h3>
        <p className="text-xs text-slate-500 mt-1">
          No expenditure transactions found for the selected period.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Executive Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Expenses */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Expenditure
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${totalExpenseAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{expenseData.expenses_by_date?.length || 0} active expenditure days</span>
            </div>
          </CardContent>
        </Card>

        {/* Largest Category */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Primary Cost Driver
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${parseFloat(largestExpense.total || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold mt-1.5">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200/80 text-[10px] font-bold">
                {largestExpense.category_name}
              </Badge>
              <span className="text-slate-400">
                {totalExpenseAmount > 0
                  ? `(${((parseFloat(largestExpense.total) / totalExpenseAmount) * 100).toFixed(1)}% of total)`
                  : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Categories Count */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cost Categories
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {expenseData.expenses_by_category?.length || 0}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold mt-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Categorized budget allocations</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts: Donut Share & Timeline */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Category Share Donut */}
        <Card className="md:col-span-5 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-600" />
              Expense Distribution
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
                          totalExpenseAmount > 0
                            ? ((val / totalExpenseAmount) * 100).toFixed(1)
                            : 0;
                        return (
                          <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                            <p className="font-semibold text-slate-300">{itemData.name}</p>
                            <p className="font-bold text-rose-400 mt-0.5">
                              ${val.toFixed(2)}
                            </p>
                            <p className="text-[11px] text-slate-400">{pct}% of total costs</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={expenseData.expenses_by_category}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="88%"
                    paddingAngle={3}
                    cornerRadius={5}
                    dataKey={(data) => parseFloat(data.total)}
                    nameKey="category_name"
                  >
                    {expenseData.expenses_by_category.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={EXPENSE_PALETTE[index % EXPENSE_PALETTE.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Costs
                </span>
                <span className="text-xl font-black text-slate-900">
                  ${totalExpenseAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Timeline Area Chart */}
        <Card className="md:col-span-7 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Daily Expenditure Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={expenseData.expenses_by_date}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
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
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                            <p className="font-semibold text-slate-400">{label}</p>
                            <p className="font-black text-rose-400 mt-1 text-sm">
                              ${parseFloat(String(payload[0].value)).toFixed(2)}
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
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expTimelineGrad)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Expense Category Breakdown
          </CardTitle>
          <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-xs">
            {expenseData.expenses_by_category?.length || 0} Categories
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60 border-b border-slate-100">
                <TableHead className="text-xs font-bold uppercase text-slate-500">
                  Category Name
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                  Total Spent
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-slate-500 min-w-[160px]">
                  Share of Budget
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseData.expenses_by_category.map((category, idx) => {
                const catSpent = parseFloat(category.total) || 0;
                const sharePct =
                  totalExpenseAmount > 0
                    ? ((catSpent / totalExpenseAmount) * 100).toFixed(1)
                    : "0";
                const color = EXPENSE_PALETTE[idx % EXPENSE_PALETTE.length];

                return (
                  <TableRow key={category.category_name} className="hover:bg-slate-50/80">
                    <TableCell className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {category.category_name}
                    </TableCell>
                    <TableCell className="text-right text-xs font-black text-slate-900">
                      ${catSpent.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-slate-500">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-slate-700">{sharePct}%</span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useReturnsReport } from "@/hooks/queries/use-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "recharts";
import { RotateCcw, PackageX, DollarSign, Percent, AlertCircle } from "lucide-react";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

export function ReturnsReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: returnsData, isLoading } = useReturnsReport(dateRange);

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
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!returnsData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white shadow-2xs">
        <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Returns Recorded</h3>
        <p className="text-xs text-slate-500 mt-1">There are no approved or completed customer returns in this period.</p>
      </Card>
    );
  }

  const refundTotal = parseFloat(returnsData.total_refund_amount || "0");
  const returnRate = parseFloat(String(returnsData.return_rate_percentage || "0"));

  const reasonsChartData = (returnsData.reasons_breakdown || []).map((item) => ({
    name: item.reason || "Unspecified",
    value: item.count,
    amount: parseFloat(item.total_refund || "0"),
  }));

  return (
    <div className="space-y-6">
      {/* 4 Executive KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Return Orders</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{returnsData.total_returns_count || 0}</div>
          <div className="text-xs text-slate-500 mt-2 font-medium">Processed return requests</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Items Returned</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">{returnsData.total_items_returned || 0} units</div>
          <div className="text-xs text-amber-600 mt-2 font-medium">Restocked or salvaged</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Refunded</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 tracking-tight">
            ${refundTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-red-600 mt-2 font-medium">Cash/credit refunded</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Return Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 tracking-tight">{returnRate.toFixed(1)}%</div>
          <div className="text-xs text-indigo-600 mt-2 font-medium">Percent of total orders</div>
        </Card>
      </div>

      {/* Visual Analytics: Reasons & Top Returned Products */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Reasons Chart */}
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-slate-900">Return Reasons Breakdown</CardTitle>
          </CardHeader>
          <div className="h-[280px] w-full flex items-center justify-center">
            {reasonsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonsChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {reasonsChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} returns ($${item.payload.amount.toFixed(2)})`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No return reasons documented</div>
            )}
          </div>
        </Card>

        {/* Top Returned Products */}
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden flex flex-col">
          <CardHeader className="px-6 py-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Most Frequently Returned Items</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Product</TableHead>
                  <TableHead className="font-bold text-slate-700">Category</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Returned Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(returnsData.top_returned_products || []).slice(0, 5).map((prod, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/80">
                    <TableCell className="font-medium text-slate-900">{prod.product_name}</TableCell>
                    <TableCell className="text-slate-600 text-xs">{prod.category_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
                        {prod.returned_quantity} units
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

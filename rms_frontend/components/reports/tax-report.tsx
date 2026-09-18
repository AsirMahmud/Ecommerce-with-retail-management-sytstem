"use client";

import { useTaxReport } from "@/hooks/queries/use-reports";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Receipt, DollarSign, ShieldAlert, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";

export function TaxReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: taxData, isLoading } = useTaxReport(dateRange);

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

  if (!taxData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white shadow-2xs">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Tax Data Available</h3>
        <p className="text-xs text-slate-500 mt-1">No completed transactions with tax were recorded for this period.</p>
      </Card>
    );
  }

  const taxableSales = parseFloat(taxData.taxable_sales || "0");
  const totalTaxCollected = parseFloat(taxData.total_tax_collected || "0");
  const taxRefunded = parseFloat(taxData.tax_refunded || "0");
  const netTaxPayable = parseFloat(taxData.net_tax_payable || "0");

  const chartData = (taxData.tax_by_date || []).map((item) => ({
    date: item.date,
    taxCollected: parseFloat(item.tax_collected) || 0,
    taxableAmount: parseFloat(item.taxable_amount) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* 4 Executive KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Taxable Sales</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${taxableSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-2 font-medium">Eligible sales subtotal</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Tax Collected</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 tracking-tight">
            ${totalTaxCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-600 mt-2 font-medium">Collected via invoices</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tax Refunded</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            ${taxRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-rose-600 mt-2 font-medium">Refunded on returns</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Tax Payable</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ${netTaxPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 mt-2 font-medium">Liability for remittance</div>
        </Card>
      </div>

      {/* Tax Collection Timeline Chart */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">Tax Collection Timeline</CardTitle>
        </CardHeader>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Tax Collected"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
              />
              <Area type="monotone" dataKey="taxCollected" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#taxGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily Tax Log Table */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Daily Tax Audit Log</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Date</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Taxable Sales</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Tax Collected</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Effective Tax Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(taxData.tax_by_date || []).map((row, idx) => {
              const taxable = parseFloat(row.taxable_amount) || 0;
              const tax = parseFloat(row.tax_collected) || 0;
              const rate = taxable > 0 ? ((tax / taxable) * 100).toFixed(1) : "0.0";
              return (
                <TableRow key={idx} className="hover:bg-slate-50/80">
                  <TableCell className="font-medium text-slate-900">{row.date}</TableCell>
                  <TableCell className="text-right font-medium text-slate-700">${taxable.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold text-indigo-600">${tax.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-xs font-semibold text-slate-600 bg-slate-50">
                      {rate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

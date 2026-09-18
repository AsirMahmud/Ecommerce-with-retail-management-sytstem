"use client";

import { useReconciliationReport } from "@/hooks/queries/use-reports";
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
import { Wallet, DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Smartphone, CheckCircle2 } from "lucide-react";

export function CashReconciliationReport({
  dateRange,
}: {
  dateRange: { from: Date | undefined; to: Date | undefined };
}) {
  const { data: reconData, isLoading } = useReconciliationReport(dateRange);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-slate-200/80 shadow-2xs p-5 bg-white">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs p-6 bg-white">
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!reconData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white shadow-2xs">
        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Cash Register Records</h3>
        <p className="text-xs text-slate-500 mt-1">No register activities were recorded for the selected window.</p>
      </Card>
    );
  }

  const cashSales = parseFloat(reconData.cash_sales || "0");
  const cashRefunds = parseFloat(reconData.cash_refunds || "0");
  const cashExpenses = parseFloat(reconData.cash_expenses || "0");
  const dueCollections = parseFloat(reconData.due_payments_collected || "0");
  const netDrawer = parseFloat(reconData.net_cash_in_drawer || "0");

  return (
    <div className="space-y-6">
      {/* 5 Column Cash Ledger KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            +${cashSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">In-store cash intake</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dues Collected</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            +${dueCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">Customer dues recovered</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Refunds</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            -${cashRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">Cash paid for returns</div>
        </Card>

        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 tracking-tight">
            -${cashExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">Petty cash payouts</div>
        </Card>

        <Card className="bg-indigo-900 border border-indigo-800 shadow-md rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Net Drawer Cash</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-800 text-indigo-200 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${netDrawer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-indigo-200 mt-1.5 font-medium">Expected physical cash</div>
        </Card>
      </div>

      {/* Non-Cash Electronic Collections Summary */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-slate-900">
            Electronic & Tender Settlements (Direct to Bank / Gateway)
          </CardTitle>
        </CardHeader>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {Object.entries(reconData.non_cash_totals || {}).map(([method, amount]) => (
            <div key={method} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {method.toLowerCase() === "card" ? (
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                )}
                <span className="text-sm font-bold text-slate-800 capitalize">{method}</span>
              </div>
              <span className="text-base font-black text-slate-900">
                ${parseFloat(amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useDuesAgingReport } from "@/hooks/queries/use-reports";
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
import { Clock, DollarSign, AlertTriangle, UserCheck, ShieldAlert, Phone } from "lucide-react";

export function DuesAgingReport() {
  const { data: duesData, isLoading } = useDuesAgingReport();

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
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!duesData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white shadow-2xs">
        <UserCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Zero Outstanding Dues</h3>
        <p className="text-xs text-slate-500 mt-1">All customer accounts and sales invoices are fully paid.</p>
      </Card>
    );
  }

  const totalReceivable = parseFloat(duesData.total_receivable || "0");
  const currentDue = parseFloat(duesData.current_due || "0");
  const due1to30 = parseFloat(duesData.due_1_to_30_days || "0");
  const due31to60 = parseFloat(duesData.due_31_to_60_days || "0");
  const due60Plus = parseFloat(duesData.due_60_plus_days || "0");

  return (
    <div className="space-y-6">
      {/* 5 Column Aging Buckets */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Receivables</span>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            ${totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">All pending customer dues</div>
        </Card>

        <Card className="bg-white border border-emerald-200/80 shadow-2xs rounded-2xl p-5 bg-emerald-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Current (Not Due)</span>
          <div className="text-2xl font-black text-emerald-700 tracking-tight mt-2">
            ${currentDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 mt-1.5 font-medium">Within payment terms</div>
        </Card>

        <Card className="bg-white border border-blue-200/80 shadow-2xs rounded-2xl p-5 bg-blue-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">1 - 30 Days Past</span>
          <div className="text-2xl font-black text-blue-700 tracking-tight mt-2">
            ${due1to30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-600 mt-1.5 font-medium">Early follow-up window</div>
        </Card>

        <Card className="bg-white border border-amber-200/80 shadow-2xs rounded-2xl p-5 bg-amber-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">31 - 60 Days Past</span>
          <div className="text-2xl font-black text-amber-700 tracking-tight mt-2">
            ${due31to60.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-amber-600 mt-1.5 font-medium">Overdue collection</div>
        </Card>

        <Card className="bg-white border border-rose-200/80 shadow-2xs rounded-2xl p-5 bg-rose-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700">60+ Days Past (Critical)</span>
          <div className="text-2xl font-black text-rose-700 tracking-tight mt-2">
            ${due60Plus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-rose-600 mt-1.5 font-medium">Delinquent risk</div>
        </Card>
      </div>

      {/* Customer Aging Breakdown Table */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Customer Outstanding Balance Ledger</CardTitle>
          <Badge variant="outline" className="text-xs font-semibold text-slate-600">
            {duesData.aging_customers?.length || 0} Accounts with Balance
          </Badge>
        </CardHeader>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Customer</TableHead>
              <TableHead className="font-bold text-slate-700">Phone</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Invoices</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Current</TableHead>
              <TableHead className="text-right font-bold text-slate-700">1-30 Days</TableHead>
              <TableHead className="text-right font-bold text-slate-700">31-60 Days</TableHead>
              <TableHead className="text-right font-bold text-slate-700">60+ Days</TableHead>
              <TableHead className="text-right font-bold text-slate-900">Total Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(duesData.aging_customers || []).map((cust, idx) => (
              <TableRow key={idx} className="hover:bg-slate-50/80">
                <TableCell className="font-bold text-slate-900">{cust.customer_name}</TableCell>
                <TableCell className="text-slate-600 text-xs font-mono">{cust.customer_phone || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-slate-700">{cust.invoices_count}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  ${Number(cust.current || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-blue-600 font-medium">
                  ${Number(cust.days_1_30 || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-amber-600 font-medium">
                  ${Number(cust.days_31_60 || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-bold">
                  ${Number(cust.days_60_plus || 0).toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-black text-slate-900">
                  ${Number(cust.total_due || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

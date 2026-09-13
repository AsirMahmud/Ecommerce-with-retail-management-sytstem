"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  ArrowRight,
} from "lucide-react";

interface PreorderReportProps {
  overviewData: any;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badgeBg: string; textCol: string }
> = {
  PENDING: { label: "Pending", color: "bg-amber-500", badgeBg: "bg-amber-50", textCol: "text-amber-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-500", badgeBg: "bg-blue-50", textCol: "text-blue-700" },
  DEPOSIT_PAID: { label: "Deposit Paid", color: "bg-indigo-500", badgeBg: "bg-indigo-50", textCol: "text-indigo-700" },
  FULLY_PAID: { label: "Fully Paid", color: "bg-emerald-500", badgeBg: "bg-emerald-50", textCol: "text-emerald-700" },
  ARRIVED: { label: "Arrived", color: "bg-cyan-500", badgeBg: "bg-cyan-50", textCol: "text-cyan-700" },
  DELIVERED: { label: "Delivered", color: "bg-teal-500", badgeBg: "bg-teal-50", textCol: "text-teal-700" },
  COMPLETED: { label: "Completed", color: "bg-green-600", badgeBg: "bg-green-50", textCol: "text-green-700" },
  CANCELLED: { label: "Cancelled", color: "bg-rose-500", badgeBg: "bg-rose-50", textCol: "text-rose-700" },
};

export function PreorderReport({
  overviewData,
  isLoading,
}: PreorderReportProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="rounded-2xl border border-slate-100 shadow-xs p-5">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!overviewData) return null;

  const totalOrders = overviewData.preorder_total_orders || 0;
  const totalRevenue = parseFloat(overviewData.preorder_total_revenue || 0);
  const totalProfit = parseFloat(overviewData.preorder_profit || 0);

  const statusEntries = overviewData.preorder_status_breakdown
    ? Object.entries(overviewData.preorder_status_breakdown)
    : [];

  return (
    <div className="space-y-6">
      {/* 3 Executive Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Preorders */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Preorder Bookings
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalOrders}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold mt-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Customer advance orders recorded</span>
            </div>
          </CardContent>
        </Card>

        {/* Preorder Gross Revenue */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Preorder Gross Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${totalRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold mt-1.5">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Committed advance order volume</span>
            </div>
          </CardContent>
        </Card>

        {/* Estimated Profit */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estimated Net Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ${totalProfit.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Projected gross yield upon fulfillment</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Grid */}
      <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Preorder Fulfillment Pipeline
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribution of preorders by current lifecycle status
            </p>
          </div>
          <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-xs">
            {totalOrders} Total Orders
          </Badge>
        </CardHeader>

        <CardContent className="p-5">
          {statusEntries.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-6">
              No status records available.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {statusEntries.map(([status, count]) => {
                const countNum = Number(count) || 0;
                const config = STATUS_CONFIG[status] || {
                  label: status,
                  color: "bg-slate-400",
                  badgeBg: "bg-slate-50",
                  textCol: "text-slate-700",
                };
                const pct = totalOrders > 0 ? ((countNum / totalOrders) * 100).toFixed(0) : 0;

                return (
                  <div
                    key={status}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${config.color}`} />
                        {config.label}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${config.badgeBg} ${config.textCol}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xl font-black text-slate-900">{countNum}</span>
                      <span className="text-[11px] text-slate-400 font-medium">orders</span>
                    </div>

                    <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-1 rounded-full ${config.color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

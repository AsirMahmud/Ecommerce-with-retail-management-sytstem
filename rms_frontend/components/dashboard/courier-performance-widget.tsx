"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  CheckCircle2,
  RotateCcw,
  Clock,
  Compass,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { CourierPerformance } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CourierPerformanceWidgetProps {
  courierData?: CourierPerformance;
}

export function CourierPerformanceWidget({ courierData }: CourierPerformanceWidgetProps) {
  if (!courierData) return null;

  const {
    period_orders = 0,
    period_amount = 0,
    status_breakdown = { PENDING: 0, CONFIRMED: 0, DELIVERED: 0, COMPLETED: 0, CANCELLED: 0, HOLD: 0, RETURNED: 0 },
    completed_count = 0,
    returned_count = 0,
    in_transit_count = 0,
    success_rate = 100,
    return_rate = 0,
    marketing_sources = [],
  } = courierData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Courier Delivery Performance (7 cols) */}
      <Card className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Courier & Logistics Health
                  </CardTitle>
                  <Badge variant="secondary" className="bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800 text-[11px] font-semibold px-2 py-0.5">
                    Steadfast & 3PL
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  COD fulfillment rate, live in-transit packages & return prevention
                </CardDescription>
              </div>
            </div>
            <Link href="/online-preorders">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-xl border-slate-200 dark:border-slate-800 gap-1.5 self-start sm:self-auto"
              >
                <span>Live Preorders</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Rate Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                <span>Success Rate</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {success_rate}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {completed_count} delivered & paid
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-400 font-medium">
                <span>In Transit</span>
                <Truck className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {in_transit_count}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                With courier partner
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
              <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-400 font-medium">
                <span>Return Rate</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {return_rate}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {returned_count} parcels returned
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 font-medium">
                <span>Pending Action</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {status_breakdown.PENDING || 0}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Needs confirmation
              </p>
            </div>
          </div>

          {/* Fulfillment Pipeline Progression Bar */}
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active Order Funnel: {period_orders} Total Orders ({formatCurrency(period_amount)})
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1 font-medium text-amber-600">
                Pending ({status_breakdown.PENDING || 0})
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1 font-medium text-blue-600">
                Confirmed ({status_breakdown.CONFIRMED || 0})
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1 font-medium text-indigo-600">
                Delivering ({status_breakdown.DELIVERED || 0})
              </span>
              <span className="text-slate-300">→</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                Collected ({status_breakdown.COMPLETED || 0})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing / Acquisition Attribution (5 cols) */}
      <Card className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-pink-600 to-rose-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Marketing Attribution
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Traffic sources generating preorder revenue
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
          {marketing_sources.length > 0 ? (
            <div className="space-y-3">
              {marketing_sources.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] uppercase">
                      {item.source.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate capitalize">
                        {item.source}
                      </p>
                      <p className="text-[11px] text-slate-400">{item.orders} orders</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-slate-400 text-center space-y-1">
              <Compass className="w-6 h-6 text-slate-300 dark:text-slate-700" />
              <p className="text-xs">No campaign UTM tag recorded</p>
              <p className="text-[11px] text-slate-400">All preorders originated from direct or walk-in channels</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

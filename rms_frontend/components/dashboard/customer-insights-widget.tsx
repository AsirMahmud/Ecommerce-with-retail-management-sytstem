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
  Users2,
  Crown,
  UserPlus,
  ArrowRight,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { CustomerInsights } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CustomerInsightsWidgetProps {
  customerInsights?: CustomerInsights;
}

export function CustomerInsightsWidget({ customerInsights }: CustomerInsightsWidgetProps) {
  if (!customerInsights) return null;

  const { new_customers = 0, top_spenders = [] } = customerInsights;

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Customer Loyalty & VIP Spenders
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 text-[11px] font-semibold px-2 py-0.5">
                  Retention
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Top revenue contributors & client acquisition in this timeframe
              </CardDescription>
            </div>
          </div>
          <Link href="/customers">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 rounded-xl border-slate-200 dark:border-slate-800 gap-1.5 self-start sm:self-auto"
            >
              <span>View All Customers</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Acquisition & Retention Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Customers Acquired</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {new_customers}
              </p>
              <span className="text-[11px] text-slate-500">Registered in this period</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active VIP Clientele</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {top_spenders.length}
              </p>
              <span className="text-[11px] text-slate-500">Top contributors in period</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Top VIP Spenders List */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
            Top Spenders Leaderboard
          </span>
          {top_spenders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {top_spenders.map((cust, idx) => (
                <div
                  key={cust.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-200 dark:hover:border-amber-800 transition-all space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      {cust.orders_count} orders
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={cust.name}>
                      {cust.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      {cust.phone}
                    </p>
                  </div>
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      {formatCurrency(cust.total_spent)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No customer-linked purchases in this period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

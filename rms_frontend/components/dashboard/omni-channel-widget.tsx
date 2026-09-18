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
  Store,
  Globe,
  Clock,
  CreditCard,
  Wallet,
  Coins,
  Gift,
  Split,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ChannelBreakdownItem, PaymentMethodItem } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface OmniChannelWidgetProps {
  channels?: ChannelBreakdownItem[];
  paymentMethods?: PaymentMethodItem[];
  totalSales?: number;
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#10B981", // Emerald
  card: "#3B82F6", // Blue
  mobile: "#EC4899", // Pink (bKash style)
  split: "#8B5CF6", // Violet
  gift: "#F59E0B", // Amber
  credit: "#64748B", // Slate
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  shop: <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  online_preorder: <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
  offline_preorder: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
};

export function OmniChannelWidget({
  channels = [],
  paymentMethods = [],
  totalSales = 0,
}: OmniChannelWidgetProps) {
  const paymentChartData = paymentMethods
    .filter((p) => p.total > 0)
    .map((p) => ({
      name: p.name,
      value: p.total,
      count: p.count,
      method: p.method,
      percentage: p.percentage,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Omni-Channel Breakdown Card (7 cols) */}
      <Card className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-sky-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Omni-Channel Sales Mix
                  </CardTitle>
                  <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 text-[11px] font-semibold px-2 py-0.5">
                    Channels
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  POS counter sales vs ecommerce online orders & custom preorders
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {channels.map((ch) => (
              <div
                key={ch.channel}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    {CHANNEL_ICONS[ch.channel] || <Store className="h-4 w-4" />}
                    {ch.name}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                    {ch.percentage}%
                  </span>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {formatCurrency(ch.revenue)}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>{ch.orders} orders</span>
                    <span>AOV: {formatCurrency(ch.aov)}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-sky-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(ch.percentage, ch.revenue > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick channel summary footer banner */}
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Channel Gross Profitability:</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium text-xs">
              {channels.map((ch) => (
                <span key={ch.channel} className="text-slate-700 dark:text-slate-300">
                  {ch.name.split(" ")[0]}: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(ch.profit)}</strong>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Distribution Card (5 cols) */}
      <Card className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Payment Channels
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Collection split across Cash, MFS & Cards
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
          {paymentChartData.length > 0 ? (
            <div className="space-y-3">
              {/* Payment Methods Progress Bars */}
              <div className="space-y-2.5">
                {paymentChartData.map((p) => {
                  const color = PAYMENT_COLORS[p.method] || "#6366F1";
                  return (
                    <div key={p.method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-400">({p.count} txns)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {p.percentage}%
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(p.value)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(p.percentage, 4)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-36 text-slate-400 text-xs">
              No payment records for this timeframe
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

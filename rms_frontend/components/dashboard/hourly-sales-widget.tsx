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
import { Clock, Flame, Users, Sparkles } from "lucide-react";
import { HourlySalesItem } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface HourlySalesWidgetProps {
  hourlySales?: HourlySalesItem[];
}

function CustomHourlyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-2xl text-xs space-y-1">
        <p className="text-slate-400 font-medium">{label} ({data.hour}:00 - {data.hour + 1}:00)</p>
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-slate-300">Sales Volume:</span>
          <span className="font-bold text-indigo-400">{formatCurrency(data.total)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">Transactions:</span>
          <span className="font-bold text-white">{data.orders} orders</span>
        </div>
      </div>
    );
  }
  return null;
}

export function HourlySalesWidget({ hourlySales = [] }: HourlySalesWidgetProps) {
  // Find peak hour
  const peakHour = React.useMemo(() => {
    if (!hourlySales || hourlySales.length === 0) return null;
    return hourlySales.reduce((max, curr) => (curr.total > max.total ? curr : max), hourlySales[0]);
  }, [hourlySales]);

  const maxTotal = React.useMemo(() => {
    if (!hourlySales || hourlySales.length === 0) return 1;
    return Math.max(...hourlySales.map((h) => h.total), 1);
  }, [hourlySales]);

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Peak Trading Hours Heatmap
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 text-[11px] font-semibold px-2 py-0.5">
                  Store Traffic
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hourly sales volume & transaction density across store hours
              </CardDescription>
            </div>
          </div>

          {peakHour && peakHour.total > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800 px-3 py-1.5 rounded-xl text-xs">
              <Flame className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <div className="text-slate-800 dark:text-slate-200">
                <span>Peak Rush: </span>
                <strong className="text-amber-700 dark:text-amber-400 font-bold">{peakHour.label}</strong>
                <span className="text-slate-500 text-[11px]"> ({formatCurrency(peakHour.total)} • {peakHour.orders} sales)</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <div className="h-[230px] sm:h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlySales} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#334155" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomHourlyTooltip />} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {hourlySales.map((entry, index) => {
                  const isPeak = peakHour && entry.hour === peakHour.hour && entry.total > 0;
                  const ratio = entry.total / maxTotal;
                  let fill = "#818CF8"; // default soft indigo
                  if (isPeak) fill = "#F59E0B"; // Amber for peak
                  else if (ratio > 0.6) fill = "#4F46E5"; // Deep indigo for high
                  else if (entry.total === 0) fill = "#E2E8F0"; // Slate for empty
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Peak Hour
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              Heavy Traffic
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-300" />
              Moderate Traffic
            </span>
          </div>
          <span className="font-medium text-slate-600 dark:text-slate-300">
            Use this data to schedule cashier shifts and store staff coverage.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

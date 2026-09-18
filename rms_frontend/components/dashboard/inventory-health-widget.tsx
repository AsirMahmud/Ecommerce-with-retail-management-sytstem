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
  Warehouse,
  Coins,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { InventoryHealth } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InventoryHealthWidgetProps {
  inventoryHealth?: InventoryHealth;
}

export function InventoryHealthWidget({ inventoryHealth }: InventoryHealthWidgetProps) {
  if (!inventoryHealth) return null;

  const totalProducts =
    inventoryHealth.healthy_count +
    inventoryHealth.low_stock_count +
    inventoryHealth.out_of_stock_count;

  const healthyPct = totalProducts > 0 ? Math.round((inventoryHealth.healthy_count / totalProducts) * 100) : 0;
  const lowStockPct = totalProducts > 0 ? Math.round((inventoryHealth.low_stock_count / totalProducts) * 100) : 0;
  const outOfStockPct = totalProducts > 0 ? Math.round((inventoryHealth.out_of_stock_count / totalProducts) * 100) : 0;

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Inventory Capital & Stock Health
                </CardTitle>
                <Badge variant="secondary" className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800 text-[11px] font-semibold px-2 py-0.5">
                  Valuation Radar
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Working capital tied in warehouse stock, reorder alerts & dead inventory
              </CardDescription>
            </div>
          </div>
          <Link href="/inventory">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 rounded-xl border-slate-200 dark:border-slate-800 gap-1.5 self-start sm:self-auto"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Financial Valuation Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Retail Potential Value */}
          <div className="p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-gradient-to-b from-cyan-50/60 to-transparent dark:from-cyan-950/20">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Retail Value
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {formatCurrency(inventoryHealth.total_retail_value)}
            </p>
            <p className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium mt-1">
              {inventoryHealth.total_stock_units} total units on shelves
            </p>
          </div>

          {/* Cost Capital Value */}
          <div className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Purchase Cost Value
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {formatCurrency(inventoryHealth.total_cost_value)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              Locked procurement capital
            </p>
          </div>

          {/* Potential Gross Profit */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/20">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              Expected Gross Profit
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(inventoryHealth.potential_profit)}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
              Margin if current stock sells out
            </p>
          </div>

          {/* Trapped Capital / Dead Stock */}
          <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-b from-rose-50/70 to-transparent dark:from-rose-950/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                Aging / Dead Capital
              </span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(inventoryHealth.dead_stock_capital)}
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
              {inventoryHealth.dead_stock_count} SKUs with 0 sales in 30d
            </p>
          </div>
        </div>

        {/* Stock Health Progress Triad */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Healthy Stock: {inventoryHealth.healthy_count} ({healthyPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Low Stock Reorder: {inventoryHealth.low_stock_count} ({lowStockPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                Stockout: {inventoryHealth.out_of_stock_count} ({outOfStockPct}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {totalProducts} Total Catalog SKUs
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${healthyPct}%` }}
              title={`Healthy: ${healthyPct}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${lowStockPct}%` }}
              title={`Low Stock: ${lowStockPct}%`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${outOfStockPct}%` }}
              title={`Stockout: ${outOfStockPct}%`}
            />
          </div>
        </div>

        {/* Dead Stock Action List */}
        {inventoryHealth.dead_stock_samples && inventoryHealth.dead_stock_samples.length > 0 && (
          <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                Top Trapped Working Capital SKUs (Recommend Promotion / Discount):
              </span>
              <span className="text-[11px] text-rose-600 font-semibold">
                Clearance Recommendations
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {inventoryHealth.dead_stock_samples.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 shadow-2xs"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{item.stock} in stock</span>
                    <span className="font-bold text-rose-600">{formatCurrency(item.cost_value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

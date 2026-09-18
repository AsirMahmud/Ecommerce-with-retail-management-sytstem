"use client";

import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  PieChart,
  ShoppingBag,
  Truck,
  RotateCcw,
  Check,
  Calendar,
  Clock,
  Warehouse,
  Users2,
  GitFork,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface DashboardWidgetConfig {
  kpiCards: boolean;
  quickStats: boolean;
  omniChannel: boolean;
  hourlyHeatmap: boolean;
  inventoryValuation: boolean;
  courierPerformance: boolean;
  customerInsights: boolean;
  preorderOps: boolean;
  revenueTrends: boolean;
  expenseDonut: boolean;
  lowStock: boolean;
  topProducts: boolean;
  recentSuppliers: boolean;
}

export const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  kpiCards: true,
  quickStats: true,
  omniChannel: true,
  hourlyHeatmap: true,
  inventoryValuation: true,
  courierPerformance: true,
  customerInsights: true,
  preorderOps: true,
  revenueTrends: true,
  expenseDonut: true,
  lowStock: true,
  topProducts: true,
  recentSuppliers: true,
};

interface DashboardCustomizerProps {
  config: DashboardWidgetConfig;
  onChange: (newConfig: DashboardWidgetConfig) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export function DashboardCustomizer({
  config,
  onChange,
  dateRange,
  onDateRangeChange,
}: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<DashboardWidgetConfig>(config);

  useEffect(() => {
    setTempConfig(config);
  }, [config, open]);

  const toggleWidget = (key: keyof DashboardWidgetConfig) => {
    setTempConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (preset: "all" | "executive" | "operations" | "ecommerce" | "minimal") => {
    switch (preset) {
      case "all":
        setTempConfig(DEFAULT_WIDGET_CONFIG);
        break;
      case "executive":
        setTempConfig({
          kpiCards: true,
          quickStats: false,
          omniChannel: true,
          hourlyHeatmap: false,
          inventoryValuation: true,
          courierPerformance: false,
          customerInsights: true,
          preorderOps: false,
          revenueTrends: true,
          expenseDonut: true,
          lowStock: false,
          topProducts: true,
          recentSuppliers: false,
        });
        break;
      case "operations":
        setTempConfig({
          kpiCards: true,
          quickStats: true,
          omniChannel: false,
          hourlyHeatmap: true,
          inventoryValuation: true,
          courierPerformance: true,
          customerInsights: false,
          preorderOps: true,
          revenueTrends: false,
          expenseDonut: false,
          lowStock: true,
          topProducts: true,
          recentSuppliers: true,
        });
        break;
      case "ecommerce":
        setTempConfig({
          kpiCards: true,
          quickStats: true,
          omniChannel: true,
          hourlyHeatmap: true,
          inventoryValuation: false,
          courierPerformance: true,
          customerInsights: true,
          preorderOps: true,
          revenueTrends: true,
          expenseDonut: false,
          lowStock: false,
          topProducts: true,
          recentSuppliers: false,
        });
        break;
      case "minimal":
        setTempConfig({
          kpiCards: true,
          quickStats: true,
          omniChannel: false,
          hourlyHeatmap: false,
          inventoryValuation: false,
          courierPerformance: false,
          customerInsights: false,
          preorderOps: false,
          revenueTrends: false,
          expenseDonut: false,
          lowStock: false,
          topProducts: false,
          recentSuppliers: false,
        });
        break;
    }
  };

  const handleSave = () => {
    onChange(tempConfig);
    try {
      localStorage.setItem("rms_dashboard_widgets_v2", JSON.stringify(tempConfig));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleReset = () => {
    setTempConfig(DEFAULT_WIDGET_CONFIG);
    onChange(DEFAULT_WIDGET_CONFIG);
    try {
      localStorage.setItem("rms_dashboard_widgets_v2", JSON.stringify(DEFAULT_WIDGET_CONFIG));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const activeWidgetCount = Object.values(config).filter(Boolean).length;
  const totalWidgetCount = Object.keys(DEFAULT_WIDGET_CONFIG).length;

  const widgetsList: {
    key: keyof DashboardWidgetConfig;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: "kpiCards",
      label: "Financial KPI Cards",
      description: "Period sales, expenses, net profit, and profit margin rate with growth %",
      icon: DollarSign,
    },
    {
      key: "quickStats",
      label: "Directory Counts",
      description: "Overview of customer count, live products, active suppliers",
      icon: LayoutGrid,
    },
    {
      key: "omniChannel",
      label: "Omni-Channel & Payments",
      description: "In-store POS vs online preorders, plus payment method distributions",
      icon: GitFork,
    },
    {
      key: "hourlyHeatmap",
      label: "Peak Store Hours Heatmap",
      description: "Hourly sales and foot-traffic breakdown (00:00 - 23:00) for staffing",
      icon: Clock,
    },
    {
      key: "inventoryValuation",
      label: "Inventory Capital & Health",
      description: "Retail valuation, locked capital, and dead / aging stock detection",
      icon: Warehouse,
    },
    {
      key: "courierPerformance",
      label: "Courier & Preorder Fulfillment",
      description: "Delivery success rate, in-transit items, and courier return rates",
      icon: Truck,
    },
    {
      key: "customerInsights",
      label: "Customer Retention & VIPs",
      description: "New customer acquisition rate and top spending VIP clientele",
      icon: Users2,
    },
    {
      key: "preorderOps",
      label: "Preorder Status Funnel",
      description: "Pending, confirmed, and courier fulfillment tracking metrics",
      icon: ShoppingBag,
    },
    {
      key: "revenueTrends",
      label: "Revenue vs Expense Trends",
      description: "Daily chart tracking cashflow performance over selected timeframe",
      icon: TrendingUp,
    },
    {
      key: "expenseDonut",
      label: "Expense Category Donut",
      description: "Distribution of expenditures by supplier, logistics, and rent",
      icon: PieChart,
    },
    {
      key: "lowStock",
      label: "Low Stock Inventory Alert",
      description: "Critical SKUs approaching safety threshold for reorder",
      icon: AlertTriangle,
    },
    {
      key: "topProducts",
      label: "Top Selling Products",
      description: "Top revenue generating apparel items & sales velocity",
      icon: Package,
    },
    {
      key: "recentSuppliers",
      label: "Supplier Operations List",
      description: "Active vendor directory and recent replenishment partners",
      icon: Truck,
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range Selector */}
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="h-9 w-[145px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
          <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs">
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Customize Widgets Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Customize</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800"
            >
              {activeWidgetCount}/{totalWidgetCount}
            </Badge>
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-600" />
                Customize Dashboard View
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {Object.values(tempConfig).filter(Boolean).length} Visible
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select which analytics modules and widgets appear on your retail dashboard.
            </DialogDescription>
          </DialogHeader>

          {/* Preset Buttons */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Layout Presets
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("all")}
                className="text-[11px] h-8 rounded-lg border-slate-200 dark:border-slate-800"
              >
                All ({totalWidgetCount})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("executive")}
                className="text-[11px] h-8 rounded-lg border-slate-200 dark:border-slate-800"
              >
                Executive
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("operations")}
                className="text-[11px] h-8 rounded-lg border-slate-200 dark:border-slate-800"
              >
                Operations
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("ecommerce")}
                className="text-[11px] h-8 rounded-lg border-slate-200 dark:border-slate-800"
              >
                Ecommerce
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("minimal")}
                className="text-[11px] h-8 rounded-lg border-slate-200 dark:border-slate-800"
              >
                Minimal
              </Button>
            </div>
          </div>

          {/* Widgets Toggle List */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 my-3 divide-y divide-slate-100 dark:divide-slate-800">
            {widgetsList.map((widget) => {
              const Icon = widget.icon;
              const isChecked = tempConfig[widget.key];

              return (
                <div
                  key={widget.key}
                  className="flex items-center justify-between pt-2.5 first:pt-0"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                        {widget.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                        {widget.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() => toggleWidget(widget.key)}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-rose-600 gap-1 rounded-xl h-9"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Default</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs rounded-xl h-9 border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="text-xs rounded-xl h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save View</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

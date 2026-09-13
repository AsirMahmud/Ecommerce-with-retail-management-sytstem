"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Package,
  Tag,
  Users,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  BarChart3,
  ShoppingCart,
  Activity,
  ArrowUpRight,
  Eye,
  Settings,
  LineChart,
  PieChart,
  ArrowDownRight,
  Clock,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useDashboardOverview } from "@/hooks/queries/useInventory";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCharts } from "@/components/inventory/dashboard-charts";
import { StockAlerts } from "@/components/inventory/stock-alerts";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function InventoryPage() {
  const { data: overview, isLoading } = useDashboardOverview("month");
  const { toast } = useToast();

  // Add toast notifications when data loads
  React.useEffect(() => {
    if (!isLoading && overview) {
      // Show stock health status
      const stockHealth =
        (overview?.metrics?.total_products || 0) > 0
          ? (((overview?.metrics?.total_products || 0) -
              (overview?.metrics?.out_of_stock_products || 0)) /
              (overview?.metrics?.total_products || 1)) *
            100
          : 0;

      if (stockHealth <= 60) {
        toast({
          variant: "destructive",
          title: "Critical Stock Health",
          description: `Your inventory health is at ${stockHealth.toFixed(
            1
          )}%. Immediate action required.`,
        });
      }

      // Show low stock warning
      if (overview?.metrics?.low_stock_products > 0) {
        toast({
          variant: "default",
          title: "Low Stock Alert",
          description: `${overview.metrics.low_stock_products} items are running low on stock.`,
        });
      }

      // Show out of stock warning
      if (overview?.metrics?.out_of_stock_products > 0) {
        toast({
          variant: "destructive",
          title: "Out of Stock Alert",
          description: `${overview.metrics.out_of_stock_products} items are out of stock.`,
        });
      }
    }
  }, [isLoading, overview, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 p-2 sm:p-4 md:p-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stockHealth =
    (overview?.metrics?.total_products || 0) > 0
      ? (((overview?.metrics?.total_products || 0) -
          (overview?.metrics?.out_of_stock_products || 0)) /
          (overview?.metrics?.total_products || 1)) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Inventory Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor stock levels, track valuations, and manage product inventory performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/add-product">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium">
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
          <Link href="/inventory/products">
            <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
              View All Products
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Products
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.metrics.total_products || 0}
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {overview?.metrics.active_products || 0} Active Products
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Value
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${(overview?.metrics.total_inventory_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Current Inventory Value
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.metrics.low_stock_products || 0}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Out of Stock
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {overview?.metrics.out_of_stock_products || 0}
            </div>
            <p className="text-xs text-rose-600 font-medium mt-1">
              Zero inventory units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div>
        <DashboardCharts />
      </div>

      {/* Stock Alerts */}
      <div>
        <StockAlerts />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  ExternalLink,
  Phone,
  MapPin,
  TrendingUp,
  Filter,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import { DateRange } from "react-day-picker";

interface OnlineCustomersTabProps {
  onFilterCustomerOrders: (customerPhone: string) => void;
}

export function OnlineCustomersTab({ onFilterCustomerOrders }: OnlineCustomersTabProps) {
  // Use a wide date range for all-time customer analytics
  const allTimeDateRange: DateRange = useMemo(() => ({
    from: new Date("2020-01-01"),
    to: new Date("2026-12-31"),
  }), []);

  const { data: analyticsData, isLoading } = useOnlinePreorderAnalytics(allTimeDateRange);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "high_risk" | "repeat" | "reliable">("all");

  const customers = useMemo(() => {
    return analyticsData?.top_customers || [];
  }, [analyticsData]);

  // Compute aggregate metrics
  const metrics = useMemo(() => {
    const totalCustomers = analyticsData?.customer_stats?.total_unique_customers ?? customers.length;
    const repeatCustomers = analyticsData?.customer_stats?.repeat_customers ?? customers.filter(c => c.total_orders > 1).length;
    const repeatRate = analyticsData?.customer_stats?.repeat_rate ?? (totalCustomers ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0);
    const cancelledOrders = analyticsData?.customer_stats?.cancelled_orders ?? analyticsData?.cancelled_orders_count ?? 0;
    const cancellationRate = analyticsData?.customer_stats?.cancellation_rate ?? analyticsData?.cancellation_rate ?? 0;

    const highRiskCount = customers.filter(c => c.cancelled_orders >= 2 || Number(c.cancellation_rate) >= 30).length;
    const reliableCount = customers.filter(c => c.cancelled_orders === 0 && c.completed_orders > 0).length;

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate,
      cancelledOrders,
      cancellationRate,
      highRiskCount,
      reliableCount,
    };
  }, [analyticsData, customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const nameMatch = c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = c.customer_phone?.includes(searchTerm);
      const emailMatch = c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let addressString = "";
      if (typeof c.customer_address === "string") {
        addressString = c.customer_address;
      } else if (c.customer_address && typeof c.customer_address === "object") {
        addressString = Object.values(c.customer_address).join(" ");
      }
      const addressMatch = addressString.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSearch = !searchTerm || nameMatch || phoneMatch || emailMatch || addressMatch;
      if (!matchesSearch) return false;

      if (activeFilter === "high_risk") {
        return c.cancelled_orders >= 2 || Number(c.cancellation_rate) >= 30;
      }
      if (activeFilter === "repeat") {
        return c.total_orders > 1;
      }
      if (activeFilter === "reliable") {
        return c.cancelled_orders === 0 && c.completed_orders > 0;
      }
      return true;
    });
  }, [customers, searchTerm, activeFilter]);

  const formatAddress = (addr: string | Record<string, any> | undefined | null) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    const parts = [addr.district, addr.division].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return addr.address || "Address Provided";
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Online Customers</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-16" /> : metrics.totalCustomers}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unique shoppers by phone</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Repeat Customers</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-16" /> : metrics.repeatCustomers}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {metrics.repeatRate}% repeat buyer rate
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelled Preorders</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <XCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-16" /> : metrics.cancelledOrders}
            </div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">
              {metrics.cancellationRate}% overall cancellation rate
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white border border-slate-100/80 shadow-md hover:shadow-lg transition-all rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">High Risk Profiles</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4">
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              {isLoading ? <Skeleton className="h-8 w-16" /> : metrics.highRiskCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">≥2 cancellations or ≥30% rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Directory & Analysis Card */}
      <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50 p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Online Customers Directory &amp; History
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                Detailed purchase track record, fulfillment rates, and cancellation history per customer
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, phone, area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white border-slate-200 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-semibold">
                <Button
                  variant={activeFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${activeFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  All ({customers.length})
                </Button>
                <Button
                  variant={activeFilter === "repeat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("repeat")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${activeFilter === "repeat" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Repeat ({metrics.repeatCustomers})
                </Button>
                <Button
                  variant={activeFilter === "high_risk" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("high_risk")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${activeFilter === "high_risk" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  High Risk ({metrics.highRiskCount})
                </Button>
                <Button
                  variant={activeFilter === "reliable" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter("reliable")}
                  className={`h-7 px-2.5 text-xs rounded-lg ${activeFilter === "reliable" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Reliable
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-semibold text-slate-600 text-sm">No customers found</p>
              <p className="text-xs text-slate-400 mt-1">Try refining your search or clearing active filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px]">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Customer</TableHead>
                    <TableHead className="font-bold text-slate-700">Location</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Total Orders</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Completed</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Cancelled</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Trust Status</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Total Spent</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Last Order</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c, idx) => {
                    const cancelRate = Number(c.cancellation_rate) || 0;
                    const isHighRisk = c.cancelled_orders >= 2 || cancelRate >= 30;
                    const isCaution = c.cancelled_orders === 1;

                    return (
                      <TableRow key={c.customer_phone || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Customer info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                              {(c.customer_name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{c.customer_name || "Guest Customer"}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <a
                                  href={`tel:${c.customer_phone}`}
                                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {c.customer_phone}
                                </a>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Location */}
                        <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                          <span title={typeof c.customer_address === "string" ? c.customer_address : JSON.stringify(c.customer_address)}>
                            {formatAddress(c.customer_address)}
                          </span>
                        </TableCell>

                        {/* Total Orders */}
                        <TableCell className="text-center font-black text-slate-800">
                          {c.total_orders}
                        </TableCell>

                        {/* Completed Orders */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {c.completed_orders}
                          </Badge>
                        </TableCell>

                        {/* Cancelled Orders */}
                        <TableCell className="text-center">
                          {c.cancelled_orders > 0 ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              {c.cancelled_orders} ({cancelRate}%)
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">0 (0%)</span>
                          )}
                        </TableCell>

                        {/* Trust / Risk Badge */}
                        <TableCell className="text-center">
                          {isHighRisk ? (
                            <Badge className="bg-rose-100 text-rose-800 border-none font-semibold text-[11px] px-2 py-0.5">
                              <ShieldAlert className="w-3 h-3 mr-1 text-rose-600" />
                              High Cancel Risk
                            </Badge>
                          ) : isCaution ? (
                            <Badge className="bg-amber-100 text-amber-800 border-none font-semibold text-[11px] px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                              Caution
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[11px] px-2 py-0.5">
                              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                              Reliable
                            </Badge>
                          )}
                        </TableCell>

                        {/* Total Spent */}
                        <TableCell className="text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(c.total_spent || 0)}
                        </TableCell>

                        {/* Last Order */}
                        <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                          {c.last_order_date || "N/A"}
                          {c.last_order_id && (
                            <span className="block text-[10px] text-indigo-600 font-semibold">#{c.last_order_id}</span>
                          )}
                        </TableCell>

                        {/* Quick Action: Filter Their Orders */}
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 shadow-sm"
                            onClick={() => onFilterCustomerOrders(c.customer_phone)}
                            title="Filter orders list by this customer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                            View Orders
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

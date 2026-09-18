"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History,
  Search,
  ShoppingBag,
  Package,
  RotateCcw,
  ShieldCheck,
  Clock,
  ArrowRight,
  Tag,
  RefreshCw,
  X,
  Receipt,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { DataExportButton } from "@/components/data-export-button";
import { useActivityLog } from "@/hooks/queries/use-activity-log";
import { type ActivityEntry } from "@/lib/api/activityLog";
import { useDebounce } from "@/hooks/use-debounce";
import { format, formatDistanceToNow } from "date-fns";

export default function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useActivityLog({
    category: categoryFilter,
    search: debouncedSearch,
    role: userFilter,
    limit: 100,
  });

  const activities: ActivityEntry[] = useMemo(() => {
    return data?.results || [];
  }, [data]);

  const metrics = useMemo(() => {
    return data?.metrics || {
      total_24h: 0,
      sales_24h: 0,
      stock_24h: 0,
      expenses_and_other_24h: 0,
    };
  }, [data]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Sales":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          icon: ShoppingBag,
        };
      case "Inventory":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
          icon: Package,
        };
      case "Pricing":
      case "Expenses":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          icon: Tag,
        };
      case "Returns":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
          icon: RotateCcw,
        };
      case "Security":
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          icon: ShieldCheck,
        };
    }
  };

  const formatRelativeTime = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr);
      if (isNaN(date.getTime())) return "recently";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const formatExactDate = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr);
      if (isNaN(date.getTime())) return timestampStr;
      return format(date, "PPpp");
    } catch {
      return timestampStr;
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setUserFilter("all");
  };

  const isFiltered = categoryFilter !== "all" || userFilter !== "all" || searchQuery !== "";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-white">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Activity Log &amp; Audit Trail
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Live Feed
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm font-medium">
              Real-time audit records of retail transactions, stock adjustments, and staff operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
            title="Refresh live activity feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <DataExportButton
            title="Activity Audit Log"
            headers={["Timestamp", "User", "Role", "Category", "Action", "Description", "Target Entity", "Device / IP"]}
            getData={() =>
              activities.map((a) => [
                formatExactDate(a.timestamp),
                a.user.name,
                a.user.role,
                a.category,
                a.action,
                a.description,
                a.target || "-",
                `${a.device} (${a.ipAddress})`,
              ])
            }
            className="bg-white dark:bg-slate-900 h-9 rounded-xl text-xs sm:text-sm font-medium border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Logged 24h */}
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Logged (24h)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {isLoading ? "..." : metrics.total_24h}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Operational events recorded</p>
        </Card>

        {/* Metric 2: Sales & Preorders */}
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sales &amp; Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {isLoading ? "..." : metrics.sales_24h}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">POS &amp; preorders (24h)</p>
        </Card>

        {/* Metric 3: Stock Movements */}
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Changes
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {isLoading ? "..." : metrics.stock_24h}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Movements &amp; adjustments</p>
        </Card>

        {/* Metric 4: Expenses & Others */}
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expenses &amp; Returns
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {isLoading ? "..." : metrics.expenses_and_other_24h}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Accounts &amp; returns (24h)</p>
        </Card>
      </div>

      {/* Main Filter & Feed Card */}
      <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Live Audit Stream
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {data?.count ?? activities.length} entries
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed timeline of user actions, modified values, and actual timestamps from the database
              </CardDescription>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Filter by action, invoice, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs h-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs h-9 font-semibold">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales">Sales &amp; Orders</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="pricing">Expenses</SelectItem>
                  <SelectItem value="returns">Returns</SelectItem>
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs h-9 font-semibold">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="inventory lead">Inventory Lead</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            {isLoading ? (
              // Loading Skeletons
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 gap-4"
                >
                  <div className="flex items-center gap-3.5 w-full">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="space-y-2 w-full max-w-md">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24 shrink-0 hidden sm:block" />
                </div>
              ))
            ) : error ? (
              <div className="text-center py-12 text-rose-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto opacity-70" />
                <p className="text-sm font-semibold">Failed to load activity logs</p>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                  Try Again
                </Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <History className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No activity logs found
                  </p>
                  <p className="text-xs text-slate-400">
                    {isFiltered
                      ? "No records match your selected filters. Try clearing filters."
                      : "No operational activities have been recorded yet."}
                  </p>
                </div>
                {isFiltered && (
                  <Button size="sm" variant="outline" onClick={clearFilters} className="text-xs">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              activities.map((act) => {
                const badgeInfo = getCategoryBadge(act.category);
                const Icon = badgeInfo.icon;
                const relTime = formatRelativeTime(act.timestamp);
                const exactTime = formatExactDate(act.timestamp);

                return (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-4 group"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                        <AvatarFallback className="bg-gradient-to-tr from-slate-900 to-indigo-900 text-white text-xs font-bold">
                          {act.user.initials || "RS"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {act.user.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                            {act.user.role}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${badgeInfo.bg}`}>
                            <Icon className="w-3 h-3" />
                            <span>{act.action}</span>
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {act.description}
                          {act.target && (
                            <span className="font-semibold text-slate-900 dark:text-slate-100 ml-1">
                              • {act.target}
                            </span>
                          )}
                        </p>

                        {act.diff && (
                          <div className="flex items-center gap-2 text-[11px] font-mono bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 w-fit mt-1 shadow-2xs">
                            <span className="text-slate-400 line-through">{act.diff.before}</span>
                            <ArrowRight className="w-3 h-3 text-indigo-500" />
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{act.diff.after}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-right text-xs shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <span
                        className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 cursor-help"
                        title={exactTime}
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {relTime}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5" title={exactTime}>
                        {act.device} {act.ipAddress ? `(${act.ipAddress})` : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  Package,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  X,
  Loader2,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
  Trash2,
  Filter,
  ExternalLink,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
  useClearAllRead,
} from "@/hooks/queries/use-notifications";
import type { Notification } from "@/lib/api/notifications";
import { formatDistanceToNowStrict, format } from "date-fns";

const typeConfigs: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
    actionLabel: string;
  }
> = {
  low_stock: {
    icon: Package,
    label: "LOW STOCK",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    actionLabel: "Manage Stock",
  },
  new_order: {
    icon: ShoppingCart,
    label: "ONLINE PREORDER",
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/60",
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    actionLabel: "View Preorder",
  },
  payment: {
    icon: CreditCard,
    label: "DUE PAYMENT",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    actionLabel: "Collect Payment",
  },
  return: {
    icon: RotateCcw,
    label: "RETURN",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/60",
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
    actionLabel: "View Return",
  },
  warning: {
    icon: AlertTriangle,
    label: "WARNING",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeText: "text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/60",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
    actionLabel: "Inspect Issue",
  },
  system: {
    icon: Sparkles,
    label: "SYSTEM",
    badgeBg: "bg-slate-500/10 dark:bg-slate-500/20",
    badgeText: "text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800/60",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    actionLabel: "View Details",
  },
};

function getConfig(type: string) {
  return typeConfigs[type] || typeConfigs.system;
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return "Recently";
  }
}

type TabKey = "all" | "unread" | "orders" | "inventory" | "finance";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismissMutation = useDismissNotification();
  const clearAllReadMutation = useClearAllRead();

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );
  const readCount = useMemo(
    () => notifications.filter((n) => n.is_read).length,
    [notifications]
  );

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      orders: notifications.filter(
        (n) => n.category === "orders" || n.type === "new_order"
      ).length,
      inventory: notifications.filter(
        (n) => n.category === "inventory" || n.type === "low_stock"
      ).length,
      finance: notifications.filter(
        (n) =>
          n.category === "finance" ||
          n.type === "payment" ||
          n.type === "return"
      ).length,
    };
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === "unread" && item.is_read) return false;
      if (
        activeTab === "orders" &&
        item.category !== "orders" &&
        item.type !== "new_order"
      )
        return false;
      if (
        activeTab === "inventory" &&
        item.category !== "inventory" &&
        item.type !== "low_stock"
      )
        return false;
      if (
        activeTab === "finance" &&
        item.category !== "finance" &&
        item.type !== "payment" &&
        item.type !== "return"
      )
        return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMsg = item.message.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    markAllRead.mutate(unreadIds);
  };

  const handleClearRead = () => {
    const readIds = notifications.filter((n) => n.is_read).map((n) => n.id);
    if (readIds.length > 0) {
      clearAllReadMutation.mutate(readIds);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Notification Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Real-time operational alerts, stock triggers, and order updates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5"
            >
              {markAllRead.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              <span>Mark All as Read</span>
            </Button>
          )}

          {readCount > 0 && (
            <Button
              onClick={handleClearRead}
              variant="outline"
              size="sm"
              className="text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear Read ({readCount})</span>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs border-slate-200 dark:border-slate-800 rounded-xl gap-1.5"
          >
            <Link href="/activity-log">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>Audit Log</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Total Alerts</span>
              <Bell className="w-4 h-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {counts.all}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Logged across all categories</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Unread</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {counts.unread}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Require your acknowledgement</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Stock Triggers</span>
              <Package className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {counts.inventory}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Below reorder levels</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Online Orders</span>
              <ShoppingCart className="w-4 h-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {counts.orders}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Preorders & checkout events</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & List Container */}
      <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: "all", label: "All", count: counts.all },
                { key: "unread", label: "Unread", count: counts.unread },
                { key: "orders", label: "Orders", count: counts.orders },
                { key: "inventory", label: "Stock", count: counts.inventory },
                { key: "finance", label: "Finance", count: counts.finance },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="h-8 text-xs pl-8 pr-7 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List Feed */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Loading operational alerts...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-indigo-500/80" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {searchQuery
                  ? "No matching alerts found"
                  : activeTab === "unread"
                  ? "You are completely caught up!"
                  : "No notifications in this view"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {searchQuery
                  ? `No alerts match your filter "${searchQuery}".`
                  : "There are currently no active alerts requiring your attention."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const config = getConfig(item.type);
              const Icon = config.icon;
              const isUnread = !item.is_read;

              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 transition-colors ${
                    isUnread
                      ? "bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                  }`}
                >
                  {/* Left edge indicator */}
                  {isUnread && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-full" />
                  )}

                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${config.iconBg} ${config.badgeText}`}
                    >
                      <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border leading-none ${config.badgeBg} ${config.badgeText}`}
                        >
                          {config.label}
                        </span>

                        {item.priority === "urgent" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white leading-none animate-pulse">
                            CRITICAL
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatRelativeTime(item.created_at)}</span>
                        </span>

                        {isUnread && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-full">
                            UNREAD
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm leading-tight ${
                          isUnread
                            ? "font-bold text-slate-900 dark:text-slate-100"
                            : "font-semibold text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:self-center pl-13 sm:pl-0">
                    {item.link && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1"
                      >
                        <Link href={item.link}>
                          <span>{config.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    )}

                    {isUnread && (
                      <Button
                        onClick={() => markRead.mutate(item.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Acknowledge</span>
                      </Button>
                    )}

                    <Button
                      onClick={() => dismissMutation.mutate(item.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

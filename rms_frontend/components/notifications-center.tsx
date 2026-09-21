"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  ExternalLink,
  Loader2,
  Volume2,
  VolumeX,
  Search,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
  Trash2,
  TrendingDown,
  BellRing,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
  useClearAllRead,
} from "@/hooks/queries/use-notifications";
import {
  type Notification,
  isSoundEnabled,
  setSoundEnabled as persistSoundSetting,
} from "@/lib/api/notifications";
import { formatDistanceToNowStrict } from "date-fns";

// ─── Play Synthesized Audio Chime ─────────────────────────────────────────────
function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.07, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  } catch {
    // AudioContext blocked or not allowed — silently ignore
  }
}

// ─── Type Visual Configurations ───────────────────────────────────────────────
interface ConfigItem {
  icon: React.ElementType;
  label: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  actionLabel: string;
}

const typeConfigs: Record<string, ConfigItem> = {
  low_stock: {
    icon: Package,
    label: "LOW STOCK",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/60",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
    actionLabel: "Restock",
  },
  new_order: {
    icon: ShoppingCart,
    label: "PREORDER",
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/60",
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    actionLabel: "View Order",
  },
  payment: {
    icon: CreditCard,
    label: "DUE PAYMENT",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/60",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    actionLabel: "Collect Due",
  },
  return: {
    icon: RotateCcw,
    label: "RETURN",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/60",
    iconBg: "bg-purple-100 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
    actionLabel: "Review",
  },
  warning: {
    icon: AlertTriangle,
    label: "WARNING",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeText: "text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/60",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
    actionLabel: "Inspect",
  },
  system: {
    icon: Sparkles,
    label: "SYSTEM",
    badgeBg: "bg-slate-500/10 dark:bg-slate-500/20",
    badgeText: "text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800/60",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
    actionLabel: "Details",
  },
};

function getConfig(type: string): ConfigItem {
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

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismissMutation = useDismissNotification();
  const clearAllReadMutation = useClearAllRead();
  const router = useRouter();
  const push = usePushNotifications();

  // Initialize sound settings
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundOn;
    setSoundOn(next);
    persistSoundSetting(next);
  };

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // Play audio chime when new unread notifications arrive
  const prevUnreadRef = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && soundOn) {
      playNotificationChime();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, soundOn]);

  // Counts per tab
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

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Tab filter
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

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMsg = item.message.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleNotificationClick = (item: Notification) => {
    if (!item.is_read) {
      markRead.mutate(item.id);
    }
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    dismissMutation.mutate(id);
  };

  const handleToggleRead = (e: React.MouseEvent, item: Notification) => {
    e.stopPropagation();
    if (!item.is_read) {
      markRead.mutate(item.id);
    }
  };

  const handleClearRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const readIds = notifications.filter((n) => n.is_read).map((n) => n.id);
    if (readIds.length > 0) {
      clearAllReadMutation.mutate(readIds);
    }
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    markAllRead.mutate(unreadIds);
  };

  const readCount = notifications.filter((n) => n.is_read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative group flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px] transition-transform duration-300 group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[430px] max-w-[calc(100vw-20px)] p-0 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-slate-100 overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                  Notifications
                </h3>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                    All caught up
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundOn ? "Mute notification chime" : "Unmute notification chime"}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                soundOn
                  ? "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {soundOn ? (
                <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg px-2 font-semibold transition-all gap-1"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                <span>Mark all read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/20 overflow-x-auto no-scrollbar">
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Push Notification Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-2 w-2 rounded-full transition-colors ${
                push.isEnabled
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Push Alerts:{" "}
              <strong
                className={
                  push.isEnabled
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-slate-500 font-normal"
                }
              >
                {!push.isSupported
                  ? "Add to Home Screen (iOS)"
                  : push.isEnabled
                  ? "Active"
                  : "Off"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1">
            {push.isSupported && push.isEnabled && (
              <button
                type="button"
                onClick={push.sendTestNotification}
                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                title="Send a test notification to your desktop or device"
              >
                Test Push
              </button>
            )}
            {push.isSupported && (
              <button
                type="button"
                onClick={() => push.toggleNotifications(!push.isEnabled)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                  push.isEnabled
                    ? "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                }`}
              >
                {push.isEnabled ? "Turn Off" : "Enable"}
              </button>
            )}
          </div>
        </div>

        {/* Search Filter Bar */}
        {notifications.length > 4 && (
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by product, SKU, or order #..."
                className="h-7 text-xs pl-8 pr-7 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notification Stream */}
        <ScrollArea className="max-h-[380px] divide-y divide-slate-100 dark:divide-slate-800/70">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <p className="text-xs">Checking real-time alerts...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-indigo-500/80" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {searchQuery
                  ? "No matching notifications"
                  : activeTab === "unread"
                  ? "Zero unread alerts!"
                  : activeTab === "inventory"
                  ? "Healthy inventory levels"
                  : "All clear!"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                {searchQuery
                  ? `No alerts match "${searchQuery}". Try a different keyword.`
                  : activeTab === "unread"
                  ? "You have acknowledged all active system notifications."
                  : activeTab === "inventory"
                  ? "No products currently trigger low stock thresholds."
                  : "No operational alerts requiring immediate attention."}
              </p>
            </div>
          ) : (
            <div>
              {filteredNotifications.map((item) => {
                const config = getConfig(item.type);
                const Icon = config.icon;
                const isUnread = !item.is_read;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative flex items-start gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer border-b border-slate-100/80 dark:border-slate-800/60 last:border-b-0 ${
                      isUnread
                        ? "bg-indigo-50/35 dark:bg-indigo-950/20 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40"
                        : "hover:bg-slate-50/90 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    {/* Unread Left Border Accent */}
                    {isUnread && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full" />
                    )}

                    {/* Left Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${config.iconBg} ${config.badgeText}`}
                    >
                      <Icon className={`w-4 h-4 ${config.iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border leading-none ${config.badgeBg} ${config.badgeText}`}
                          >
                            {config.label}
                          </span>
                          {item.priority === "urgent" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white leading-none animate-pulse">
                              CRITICAL
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                          <span>{formatRelativeTime(item.created_at)}</span>
                        </div>
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug line-clamp-1 ${
                          isUnread
                            ? "text-slate-900 dark:text-slate-100 font-bold"
                            : "text-slate-700 dark:text-slate-300 font-semibold"
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Quick Action Link / Button */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        {item.link ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group-hover:underline">
                            <span>{config.actionLabel}</span>
                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        ) : (
                          <span />
                        )}

                        {/* Row action icons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {isUnread && (
                            <button
                              onClick={(e) => handleToggleRead(e, item)}
                              title="Mark as read"
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDismiss(e, item.id)}
                            title="Dismiss notification"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold px-2 rounded-lg gap-1.5"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">
              <span>View All Notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>

          {readCount > 0 && (
            <button
              onClick={handleClearRead}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
              title="Dismiss read notifications"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

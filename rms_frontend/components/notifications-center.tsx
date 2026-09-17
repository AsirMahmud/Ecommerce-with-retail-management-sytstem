"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Package,
  ShoppingCart,
  CreditCard,
  CheckCheck,
  Loader2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/queries/use-notifications";
import type { Notification } from "@/lib/api/notifications";
import { formatDistanceToNow } from "date-fns";

// ─── Icon & Color mapping ────────────────────────────────────────────────────
const typeConfig: Record<
  string,
  { icon: React.ElementType; bgColor: string; textColor: string }
> = {
  low_stock: {
    icon: Package,
    bgColor: "bg-amber-100",
    textColor: "text-amber-600",
  },
  new_order: {
    icon: ShoppingCart,
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  payment: {
    icon: CreditCard,
    bgColor: "bg-violet-100",
    textColor: "text-violet-600",
  },
  success: {
    icon: CheckCircle2,
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-orange-100",
    textColor: "text-orange-600",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-100",
    textColor: "text-red-600",
  },
  info: {
    icon: Info,
    bgColor: "bg-sky-100",
    textColor: "text-sky-600",
  },
  system: {
    icon: Info,
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
  },
};

function getConfig(type: string) {
  return (
    typeConfig[type] || typeConfig.info
  );
}

function formatTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "Just now";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const router = useRouter();

  const unreadCount = data?.unread ?? 0;
  const notifications = data?.notifications ?? [];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors outline-none"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0 rounded-2xl shadow-2xl border-slate-200/80 bg-white"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 bg-red-50 text-red-600 border-red-100"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg px-2 font-semibold"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[380px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <p className="text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">All caught up!</p>
              <p className="text-xs text-slate-400">
                No new notifications right now.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification, idx) => {
                const config = getConfig(notification.type);
                const Icon = config.icon;
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors ${
                      !notification.is_read ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${config.bgColor}`}
                    >
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            !notification.is_read
                              ? "text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-100 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-slate-500 hover:text-slate-700 rounded-lg font-medium"
              onClick={() => {
                setOpen(false);
                // Can navigate to a full notifications page later
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

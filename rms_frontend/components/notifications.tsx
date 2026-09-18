"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  Package,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { formatDistanceToNowStrict } from "date-fns";

const typeConfigs: Record<
  string,
  {
    icon: React.ElementType;
    bg: string;
    text: string;
    border: string;
    tag: string;
  }
> = {
  low_stock: {
    icon: Package,
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/60 dark:border-amber-900/60",
    tag: "STOCK",
  },
  new_order: {
    icon: ShoppingCart,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200/60 dark:border-indigo-900/60",
    tag: "ORDER",
  },
  payment: {
    icon: CreditCard,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/60 dark:border-emerald-900/60",
    tag: "DUE",
  },
  return: {
    icon: RotateCcw,
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200/60 dark:border-purple-900/60",
    tag: "RETURN",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/60 dark:border-rose-900/60",
    tag: "ALERT",
  },
  system: {
    icon: Sparkles,
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200/60 dark:border-slate-800/60",
    tag: "SYSTEM",
  },
};

function formatTime(dateStr?: string) {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function Notifications() {
  const { data, isLoading } = useNotifications();
  const notifications = useMemo(() => data?.notifications?.slice(0, 5) ?? [], [data]);
  const unreadCount = data?.unread ?? 0;

  return (
    <Card className="shadow-xs border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Store Alerts & Notifications</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Live operational updates and inventory alerts
          </CardDescription>
        </div>
        {unreadCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60"
          >
            {unreadCount} unread
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pb-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <p className="text-xs">Syncing notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No pending alerts
            </p>
            <p className="text-[11px] text-slate-400">All systems operating normally</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const config = typeConfigs[item.type] || typeConfigs.system;
              const Icon = config.icon;

              return (
                <Link
                  key={item.id}
                  href={item.link || "/notifications"}
                  className="flex items-start gap-3 p-2.5 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800"
                >
                  <div
                    className={`mt-0.5 rounded-xl p-2 shrink-0 border ${config.bg} ${config.text} ${config.border}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-bold leading-tight truncate ${
                          !item.is_read
                            ? "text-slate-900 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatTime(item.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.message}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold gap-1.5"
          asChild
        >
          <Link href="/notifications">
            <span>View all notifications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

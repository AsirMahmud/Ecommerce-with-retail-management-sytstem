"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LucideIcon, PackageOpen } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 my-4 ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4 ring-8 ring-indigo-50/40 dark:ring-indigo-950/20 shadow-2xs">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && actionHref && (
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          )}

          {actionLabel && !actionHref && onAction && (
            <Button
              onClick={onAction}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              className="rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

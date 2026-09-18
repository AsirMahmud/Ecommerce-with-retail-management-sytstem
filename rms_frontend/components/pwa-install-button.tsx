"use client";

import React from "react";
import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaContext } from "@/components/pwa-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PwaInstallButtonProps {
  className?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  showLabel?: boolean;
}

export function PwaInstallButton({
  className,
  variant = "outline",
  showLabel = true,
}: PwaInstallButtonProps) {
  const { pwa } = usePwaContext();

  if (pwa.isInstalled) {
    return null;
  }

  if (!pwa.canInstall) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            onClick={pwa.installApp}
            className={`h-8 sm:h-9 border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl gap-1.5 shadow-2xs font-semibold text-xs transition-all ${className}`}
          >
            <Download className="w-3.5 h-3.5 animate-bounce text-indigo-600 dark:text-indigo-400" />
            {showLabel && <span>Install App</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Install RMS as a desktop or mobile application
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

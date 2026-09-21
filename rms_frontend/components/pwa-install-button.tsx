"use client";

import React, { useState } from "react";
import { Download, Share, PlusSquare, Smartphone, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaContext } from "@/components/pwa-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [iosDialogOpen, setIosDialogOpen] = useState(false);

  if (pwa.isInstalled) {
    return null;
  }

  // If neither standard install prompt nor iOS device, hide button
  if (!pwa.canInstall && !pwa.isIOS) {
    return null;
  }

  const handleClick = () => {
    if (pwa.isIOS) {
      setIosDialogOpen(true);
    } else {
      pwa.installApp();
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size="sm"
              onClick={handleClick}
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

      {/* iOS Step-by-Step Installation Modal */}
      {pwa.isIOS && (
        <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <DialogHeader className="text-left space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
                <Smartphone className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Install Raw Stitch RMS on iOS
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Follow these two steps in Safari to add the app to your iPhone or iPad home screen:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Tap the Share Button
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    At the bottom of Safari, tap the <Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share icon.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Select &quot;Add to Home Screen&quot;
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-emerald-600 inline" /> <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                💡 <strong>Important for iOS Push Alerts:</strong> Apple requires opening the app directly from your Home Screen icon to receive native push notifications!
              </div>
            </div>

            <Button
              onClick={() => setIosDialogOpen(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
            >
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

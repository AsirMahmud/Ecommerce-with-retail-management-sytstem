"use client";

import React from "react";

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto py-4 px-4 sm:px-6 border-t border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs text-xs text-slate-500 dark:text-slate-400">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="text-[11px] sm:text-xs">
          © {currentYear} Raw Stitch RMS. All rights reserved.
        </p>
        <a
          href="https://site.torongox.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 group text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span className="text-xs sm:text-sm font-medium">Powered by</span>
          <span className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 px-3 py-1 rounded-xl shadow-xs transition-transform group-hover:scale-105">
            <img
              src="/images/torongox-logo-transparent.png"
              alt="torongoX"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </span>
        </a>
      </div>
    </footer>
  );
}

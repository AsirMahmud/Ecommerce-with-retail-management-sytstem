"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition-colors gap-1.5"
          title="Change language / ভাষা পরিবর্তন"
        >
          <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {language === "en" ? "EN" : "বাং"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-lg"
      >
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={`rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between ${
            language === "en"
              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          <span>English</span>
          {language === "en" && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("bn")}
          className={`rounded-lg text-xs font-medium cursor-pointer flex items-center justify-between ${
            language === "bn"
              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          <span>বাংলা (Bengali)</span>
          {language === "bn" && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

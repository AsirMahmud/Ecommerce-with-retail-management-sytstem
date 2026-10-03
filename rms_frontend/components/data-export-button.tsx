"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  FileCode,
  Loader2,
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils";

export interface CustomExportOption {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  onClick: () => Promise<void> | void;
  className?: string;
}

export interface DataExportButtonProps {
  title: string;
  filename?: string;
  subtitle?: string;
  headers: string[];
  getData: () => (string | number | boolean | null | undefined)[][] | Promise<(string | number | boolean | null | undefined)[][]>;
  orientation?: "portrait" | "landscape";
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
  customOptions?: CustomExportOption[];
}

export function DataExportButton({
  title,
  filename,
  subtitle,
  headers,
  getData,
  orientation,
  size = "sm",
  variant = "outline",
  className = "",
  customOptions,
}: DataExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const baseFilename = filename || title.toLowerCase().replace(/\s+/g, "_");

  const handleExport = async (type: "excel" | "csv" | "pdf" | "print") => {
    try {
      setLoading(true);
      const rows = await Promise.resolve(getData());

      if (!rows || rows.length === 0) {
        alert("No data available to export.");
        return;
      }

      if (type === "excel") {
        exportToExcel(baseFilename, title.slice(0, 31), headers, rows);
      } else if (type === "csv") {
        exportToCSV(baseFilename, headers, rows);
      } else if (type === "pdf") {
        exportToPDF(title, headers, rows, {
          subtitle,
          filename: `${baseFilename}.pdf`,
          orientation,
        });
      } else if (type === "print") {
        window.print();
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={loading}
          className={`gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-2xs ${className}`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
          ) : (
            <Download className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="font-semibold text-xs">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${customOptions && customOptions.length > 0 ? "w-64" : "w-48"} p-1.5 rounded-xl border-slate-200 shadow-lg`}>
        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
          Export {title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-slate-100" />

        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          className="cursor-pointer text-xs rounded-lg flex items-center gap-2 text-slate-700 hover:text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50/70"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Excel (.xlsx)</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          className="cursor-pointer text-xs rounded-lg flex items-center gap-2 text-slate-700 hover:text-blue-700 focus:text-blue-700 focus:bg-blue-50/70"
        >
          <FileCode className="w-4 h-4 text-blue-600" />
          <span>CSV Spreadsheet</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          className="cursor-pointer text-xs rounded-lg flex items-center gap-2 text-slate-700 hover:text-rose-700 focus:text-rose-700 focus:bg-rose-50/70"
        >
          <FileText className="w-4 h-4 text-rose-600" />
          <span>PDF Document</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("print")}
          className="cursor-pointer text-xs rounded-lg flex items-center gap-2 text-slate-700 hover:text-slate-900 focus:bg-slate-100"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Document</span>
        </DropdownMenuItem>

        {customOptions && customOptions.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1 bg-slate-100" />
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
              Marketing & Ad Audiences
            </DropdownMenuLabel>
            {customOptions.map((opt, i) => (
              <DropdownMenuItem
                key={i}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await opt.onClick();
                  } catch (e) {
                    console.error("Custom export error:", e);
                    alert("Failed to export audience data. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className={`cursor-pointer text-xs rounded-lg flex items-center justify-between gap-2 p-2 hover:bg-indigo-50/80 focus:bg-indigo-50/80 ${opt.className || ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon}
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-xs text-slate-800">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] text-slate-400 leading-tight">{opt.description}</span>
                    )}
                  </div>
                </div>
                {opt.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 shrink-0">
                    {opt.badge}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

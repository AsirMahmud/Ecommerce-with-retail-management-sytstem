"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard, Command, Compass, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts, SHORTCUTS_LIST } from "@/hooks/use-keyboard-shortcuts";

export function KeyboardShortcutsDialog() {
  const { isOpen, setIsOpen } = useKeyboardShortcuts();

  const generalShortcuts = SHORTCUTS_LIST.filter((s) => s.category === "General");
  const navShortcuts = SHORTCUTS_LIST.filter((s) => s.category === "Navigation");
  const actionShortcuts = SHORTCUTS_LIST.filter((s) => s.category === "Actions");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="Keyboard Shortcuts (Press ? or Ctrl+/)"
          className="h-8 sm:h-9 w-8 sm:w-9 p-0 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hidden sm:flex items-center justify-center transition-colors shadow-2xs"
        >
          <Keyboard className="w-4 h-4" />
          <span className="sr-only">Keyboard Shortcuts</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl bg-white">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Speed up your retail workflow with quick navigation and system commands
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* General */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Command className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Global & Search
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {generalShortcuts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {s.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-white border border-slate-200 text-slate-700 rounded-md shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Navigation (Press in sequence)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {navShortcuts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {s.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-md shadow-2xs ${
                          k === "then"
                            ? "text-slate-400 bg-transparent border-0 font-sans text-[9px]"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Fast Actions (Press in sequence)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {actionShortcuts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-700">
                    {s.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-md shadow-2xs ${
                          k === "then"
                            ? "text-slate-400 bg-transparent border-0 font-sans text-[9px]"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Tip: Press <kbd className="px-1 py-0.5 font-mono font-semibold bg-white border border-slate-200 rounded text-[10px]">?</kbd> anywhere anytime to show this sheet
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-7 text-xs font-medium hover:bg-slate-200/60"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

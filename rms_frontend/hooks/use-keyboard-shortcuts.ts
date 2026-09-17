"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export interface ShortcutItem {
  id: string;
  category: "Navigation" | "General" | "Actions";
  description: string;
  keys: string[]; // e.g. ["Ctrl", "K"] or ["G", "then", "D"]
}

export const SHORTCUTS_LIST: ShortcutItem[] = [
  {
    id: "command-palette",
    category: "General",
    description: "Open Command Palette / Search",
    keys: ["Ctrl", "K"],
  },
  {
    id: "shortcuts-help",
    category: "General",
    description: "Open Keyboard Shortcuts Help",
    keys: ["?"],
  },
  {
    id: "shortcuts-help-alt",
    category: "General",
    description: "Alternative Shortcuts Help",
    keys: ["Ctrl", "/"],
  },
  {
    id: "nav-dashboard",
    category: "Navigation",
    description: "Go to Dashboard",
    keys: ["G", "then", "D"],
  },
  {
    id: "nav-pos",
    category: "Navigation",
    description: "Open POS Register",
    keys: ["G", "then", "P"],
  },
  {
    id: "nav-sales",
    category: "Navigation",
    description: "Go to Sales History",
    keys: ["G", "then", "S"],
  },
  {
    id: "nav-inventory",
    category: "Navigation",
    description: "Go to Inventory Products",
    keys: ["G", "then", "I"],
  },
  {
    id: "nav-customers",
    category: "Navigation",
    description: "Go to Customer Directory",
    keys: ["G", "then", "C"],
  },
  {
    id: "nav-reports",
    category: "Navigation",
    description: "Go to Analytics & Reports",
    keys: ["G", "then", "R"],
  },
  {
    id: "nav-preorders",
    category: "Navigation",
    description: "Go to Preorders",
    keys: ["G", "then", "O"],
  },
  {
    id: "act-new-sale",
    category: "Actions",
    description: "Start New Sale (POS)",
    keys: ["N", "then", "S"],
  },
  {
    id: "act-new-customer",
    category: "Actions",
    description: "Quick Add / View Customers",
    keys: ["N", "then", "C"],
  },
  {
    id: "act-new-product",
    category: "Actions",
    description: "Quick Manage Products",
    keys: ["N", "then", "P"],
  },
];

export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const sequenceBufferRef = useRef<{ key: string; time: number }[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if in input, textarea, select or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // Allow Ctrl+/ even in inputs
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      // Handle '?' to toggle shortcuts modal
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Handle sequence buffering for Vim/SaaS style combos: "g then d", "n then s", etc.
      const now = Date.now();
      // Purge entries older than 1000ms
      sequenceBufferRef.current = sequenceBufferRef.current.filter(
        (item) => now - item.time < 1000
      );

      const pressedKey = e.key.toLowerCase();
      sequenceBufferRef.current.push({ key: pressedKey, time: now });

      const buffer = sequenceBufferRef.current.map((item) => item.key);
      const len = buffer.length;

      if (len >= 2) {
        const first = buffer[len - 2];
        const second = buffer[len - 1];

        if (first === "g") {
          if (second === "d") {
            e.preventDefault();
            router.push("/");
            sequenceBufferRef.current = [];
          } else if (second === "p") {
            e.preventDefault();
            router.push("/pos");
            sequenceBufferRef.current = [];
          } else if (second === "s") {
            e.preventDefault();
            router.push("/sales/history");
            sequenceBufferRef.current = [];
          } else if (second === "i") {
            e.preventDefault();
            router.push("/inventory/products");
            sequenceBufferRef.current = [];
          } else if (second === "c") {
            e.preventDefault();
            router.push("/customers");
            sequenceBufferRef.current = [];
          } else if (second === "r") {
            e.preventDefault();
            router.push("/reports");
            sequenceBufferRef.current = [];
          } else if (second === "o") {
            e.preventDefault();
            router.push("/preorders");
            sequenceBufferRef.current = [];
          }
        } else if (first === "n") {
          if (second === "s") {
            e.preventDefault();
            router.push("/pos");
            sequenceBufferRef.current = [];
          } else if (second === "c") {
            e.preventDefault();
            router.push("/customers");
            sequenceBufferRef.current = [];
          } else if (second === "p") {
            e.preventDefault();
            router.push("/inventory/products");
            sequenceBufferRef.current = [];
          }
        }
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    isOpen,
    setIsOpen,
    openShortcuts: () => setIsOpen(true),
    closeShortcuts: () => setIsOpen(false),
    shortcuts: SHORTCUTS_LIST,
  };
}

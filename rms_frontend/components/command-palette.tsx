"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  ShoppingBag,
  LineChart,
  Users,
  Package,
  Clock,
  DollarSign,
  ChartBarBig,
  Settings,
  Search,
  Globe,
  Truck,
  Plus,
  FileText,
  ArrowRight,
  History,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { productsApi } from "@/lib/api/inventory";
import { searchCustomers, type Customer } from "@/lib/api/customer";
import { useDebounce } from "@/hooks/use-debounce";

// ─── Page Navigation Items ──────────────────────────────────────────────────
const pages = [
  { name: "Dashboard", href: "/", icon: Home, keywords: ["home", "overview", "main"] },
  { name: "POS Register", href: "/pos", icon: ShoppingBag, keywords: ["point of sale", "sell", "checkout", "cash register"] },
  { name: "Sales Overview", href: "/sales", icon: LineChart, keywords: ["revenue", "income"] },
  { name: "Sales History", href: "/sales/sales-history", icon: LineChart, keywords: ["transactions", "past sales"] },
  { name: "Due Payments", href: "/sales/due", icon: LineChart, keywords: ["unpaid", "pending", "credit"] },
  { name: "Customers", href: "/customers", icon: Users, keywords: ["buyer", "client"] },
  { name: "Inventory Dashboard", href: "/inventory", icon: Package, keywords: ["stock", "warehouse"] },
  { name: "Products", href: "/inventory/products", icon: Package, keywords: ["catalog", "items"] },
  { name: "Add Product", href: "/inventory/add-product", icon: Package, keywords: ["new product", "create product"] },
  { name: "Categories", href: "/inventory/categories", icon: Package, keywords: ["group", "organize"] },
  { name: "Suppliers", href: "/inventory/suppliers", icon: Package, keywords: ["vendor", "manufacturer"] },
  { name: "Preorders", href: "/preorder", icon: Clock, keywords: ["advance order", "booking"] },
  { name: "Online Preorders", href: "/online-preorders", icon: Clock, keywords: ["web orders", "ecommerce orders"] },
  { name: "Create Preorder", href: "/preorder/create", icon: Clock, keywords: ["new preorder"] },
  { name: "Courier Partners", href: "/courier-partners", icon: Truck, keywords: ["delivery", "shipping"] },
  { name: "Expenses", href: "/expenses", icon: DollarSign, keywords: ["cost", "spending"] },
  { name: "Reports", href: "/reports", icon: ChartBarBig, keywords: ["analytics", "statistics", "profit", "loss"] },
  { name: "Ecommerce Settings", href: "/ecommerce-settings/home-page", icon: Globe, keywords: ["website", "online store"] },
  { name: "Settings", href: "/settings", icon: Settings, keywords: ["preferences", "config"] },
  { name: "Tasks", href: "/tasks/my-tasks", icon: FileText, keywords: ["todo", "work"] },
];

// ─── Quick Actions ──────────────────────────────────────────────────────────
const quickActions = [
  { name: "Open POS", href: "/pos", icon: ShoppingBag, shortcut: "G → P" },
  { name: "Add New Product", href: "/inventory/add-product", icon: Plus, shortcut: "G → N" },
  { name: "Create Preorder", href: "/preorder/create", icon: Plus, shortcut: "" },
  { name: "View Reports", href: "/reports", icon: ChartBarBig, shortcut: "G → R" },
];

// ─── Recent Searches ────────────────────────────────────────────────────────
const RECENT_KEY = "rms_command_palette_recent";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  if (!term.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// ─── Component ──────────────────────────────────────────────────────────────
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<
    { id: number; name: string; sku: string; stock: number }[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();
  const debouncedSearch = useDebounce(search, 300);

  // ── Keyboard shortcut (Ctrl+K / ⌘K) ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load recent on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setSearch("");
      setProducts([]);
      setCustomers([]);
    }
  }, [open]);

  // ── Search products & customers when query changes ───────────────────
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setProducts([]);
      setCustomers([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const searchAll = async () => {
      try {
        const [productRes, customerRes] = await Promise.allSettled([
          productsApi.getAll({
            search: debouncedSearch,
            page: 1,
            page_size: 5,
          }),
          searchCustomers(debouncedSearch, 1, 5),
        ]);

        if (!controller.signal.aborted) {
          if (productRes.status === "fulfilled") {
            setProducts(
              productRes.value.results.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || "",
                stock: p.total_stock ?? p.stock ?? 0,
              }))
            );
          }
          if (customerRes.status === "fulfilled") {
            setCustomers(customerRes.value.results.slice(0, 5));
          }
        }
      } catch {
        // Silently handle errors — the palette should never break the app
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    };

    searchAll();
    return () => controller.abort();
  }, [debouncedSearch]);

  // ── Navigate & close ─────────────────────────────────────────────────
  const navigate = useCallback(
    (href: string, term?: string) => {
      if (term) addRecentSearch(term);
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // ── Filter pages ────────────────────────────────────────────────────
  const filteredPages = useMemo(() => {
    if (!search) return pages.slice(0, 8);
    const q = search.toLowerCase();
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.includes(q))
    );
  }, [search]);

  return (
    <>
      {/* Search trigger button (upper-nav integration) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 text-xs text-slate-500 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 rounded-xl transition-all cursor-pointer group"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
        <span className="text-slate-500 group-hover:text-slate-700 font-medium">Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white/80 border border-slate-200/80 rounded-md shadow-[0_1px_0_1px_rgba(0,0,0,0.02)]">
          Ctrl K
        </kbd>
      </button>

      {/* Command dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search pages, products, customers..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <Search className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                {isSearching ? "Searching..." : "No results found."}
              </p>
              <p className="text-xs text-slate-400">
                Try searching for a product, customer, or page.
              </p>
            </div>
          </CommandEmpty>

          {/* Recent Searches */}
          {!search && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((term) => (
                <CommandItem
                  key={term}
                  value={`recent-${term}`}
                  onSelect={() => setSearch(term)}
                  className="gap-3 py-2.5"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Actions (when no search) */}
          {!search && (
            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.href}
                  value={action.name}
                  onSelect={() => navigate(action.href)}
                  className="gap-3 py-2.5"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">{action.name}</span>
                  {action.shortcut && (
                    <CommandShortcut>{action.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Products */}
          {products.length > 0 && (
            <CommandGroup heading="Products">
              {products.map((product) => (
                <CommandItem
                  key={`product-${product.id}`}
                  value={`product-${product.name}-${product.sku}`}
                  onSelect={() =>
                    navigate(
                      `/inventory/edit-product/${product.id}`,
                      product.name
                    )
                  }
                  className="gap-3 py-2.5"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-xs text-slate-400">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={product.stock > 0 ? "secondary" : "destructive"}
                    className="text-[10px] shrink-0"
                  >
                    Stock: {product.stock}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={`customer-${customer.id}`}
                  value={`customer-${customer.first_name}-${customer.phone}`}
                  onSelect={() =>
                    navigate(
                      `/customers?highlight=${customer.id}`,
                      `${customer.first_name} ${customer.last_name}`
                    )
                  }
                  className="gap-3 py-2.5"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-xs text-slate-400">{customer.phone}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {customer.sales_count} orders
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Pages */}
          <CommandGroup heading="Pages">
            {filteredPages.map((page) => (
              <CommandItem
                key={page.href}
                value={`page-${page.name}-${page.keywords.join("-")}`}
                onSelect={() => navigate(page.href)}
                className="gap-3 py-2"
              >
                <page.icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm">{page.name}</span>
                <ArrowRight className="w-3 h-3 ml-auto text-slate-300" />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

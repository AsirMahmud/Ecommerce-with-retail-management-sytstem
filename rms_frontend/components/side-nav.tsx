"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  Home,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Users,
  LineChart,
  LogOut,
  ChartBarBigIcon,
  Clock,
  Globe,
  ChevronDown,
  ExternalLink,
  Truck,
  History,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { homePageSettingsApi, HomePageSettings } from "@/lib/api/ecommerce";
import { BrandLogos } from "./brand-logos";
import { NotificationsCenter } from "@/components/notifications-center";

const mainNavItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/",
  },
  {
    title: "POS",
    icon: ShoppingBag,
    href: "/pos",
  },
  {
    title: "Sales",
    icon: LineChart,
    href: "/sales",
    subItems: [
      { title: "Overview", href: "/sales" },
      { title: "Sales History", href: "/sales/sales-history" },
      { title: "Due", href: "/sales/due" },
      { title: "Returns & Refunds", href: "/sales/returns" },
    ],
  },
  {
    title: "Customers",
    icon: Users,
    href: "/customers",
  },
  {
    title: "Inventory",
    icon: Package,
    href: "/inventory",
    subItems: [
      { title: "Dashboard", href: "/inventory" },
      { title: "Products", href: "/inventory/products" },
      { title: "Add Product", href: "/inventory/add-product" },
      { title: "Categories", href: "/inventory/categories" },
      { title: "Online Categories", href: "/inventory/online-category" },
      { title: "Suppliers", href: "/inventory/suppliers" },
    ],
  },
  {
    title: "Preorders",
    icon: Clock,
    href: "/preorder",
    subItems: [
      { title: "Dashboard", href: "/preorder" },
      { title: "Create Preorder", href: "/preorder/create" },
      { title: "Add Product", href: "/preorder?tab=add-product" },
      { title: "Online Preorders", href: "/online-preorders" },
    ],
  },
  {
    title: "Courier Partners",
    icon: Truck,
    href: "/courier-partners",
  },
  {
    title: "Expenses",
    icon: DollarSign,
    href: "/expenses",
  },
  {
    title: "Reports",
    icon: ChartBarBigIcon,
    href: "/reports",
  },
  {
    title: "Ecommerce Settings",
    icon: Globe,
    href: "/ecommerce-settings",
    subItems: [
      { title: "Home Page Settings", href: "/ecommerce-settings/home-page" },
      { title: "Hero Settings", href: "/ecommerce-settings/hero-slides" },
      { title: "Discount Management", href: "/ecommerce-settings/discounts" },
      { title: "Coupon Management", href: "/ecommerce-settings/coupons" },
      { title: "Product Status", href: "/ecommerce-settings/product-status" },
      { title: "Delivery Charges", href: "/ecommerce-settings/delivery-charges" },
      { title: "Promotional Modals", href: "/ecommerce-settings/promotional-modals" },
      { title: "Open Ecommerce Site", href: "https://rawstitch.com.bd" },
    ],
  },
];

const utilityNavItems = [
  {
    title: "Activity Log",
    icon: History,
    href: "/activity-log",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

import { useTranslations } from "next-intl";
import { getRoleBadge } from "@/lib/permissions";

export function SideNav() {
  const [open, setOpen] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, role, canAccess } = useAuth();
  const t = useTranslations();
  const [branding, setBranding] = useState<HomePageSettings | null>(null);

  const filteredMainNavItems = mainNavItems
    .filter((item) => (canAccess ? canAccess(item.href) : true))
    .map((item) => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((sub) => (canAccess ? canAccess(sub.href) : true)),
        };
      }
      return item;
    });

  const filteredUtilityNavItems = utilityNavItems.filter((item) =>
    canAccess ? canAccess(item.href) : true
  );


  const getNavLabel = (title: string) => {
    const map: Record<string, string> = {
      "Dashboard": "nav.dashboard",
      "POS": "nav.pos",
      "Sales": "nav.sales",
      "Overview": "nav.overview",
      "Sales History": "nav.sales_history",
      "Due": "nav.due",
      "Returns & Refunds": "nav.returns",
      "Customers": "nav.customers",
      "Inventory": "nav.inventory",
      "Products": "nav.products",
      "Add Product": "nav.add_product",
      "Categories": "nav.categories",
      "Online Categories": "nav.online_categories",
      "Suppliers": "nav.suppliers",
      "Preorders": "nav.preorders",
      "Create Preorder": "nav.create_preorder",
      "Online Preorders": "nav.online_preorders",
      "Courier Partners": "nav.courier_partners",
      "Expenses": "nav.expenses",
      "Reports": "nav.reports",
      "Ecommerce Settings": "nav.ecommerce_settings",
      "Home Page Settings": "nav.home_page_settings",
      "Hero Settings": "nav.hero_settings",
      "Discount Management": "nav.discounts",
      "Coupon Management": "nav.coupons",
      "Product Status": "nav.product_status",
      "Delivery Charges": "nav.delivery_charges",
      "Promotional Modals": "nav.promotional_modals",
      "Open Ecommerce Site": "nav.open_ecommerce",
      "Activity Log": "nav.activity",
      "Settings": "nav.settings",
    };
    const key = map[title];
    if (key) {
      try {
        return t(key);
      } catch {
        return title;
      }
    }
    return title;
  };

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const data = await homePageSettingsApi.get();
        setBranding(data);
      } catch (error) {
        console.error("Failed to fetch branding:", error);
      }
    };
    fetchBranding();
  }, []);

  const toggleCollapsible = (title: string) => {
    setOpenCollapsibles((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isSubItemActive = (href: string) => {
    return pathname === href;
  };

  const renderNavList = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200">
      {/* Brand Header */}
      <div className="flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3 w-full">
          {branding?.logo_image_url ? (
            <img
              src={branding.logo_image_url}
              alt={branding.logo_text || "Logo"}
              className="h-9 w-auto max-w-[130px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                RS
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {branding?.logo_text || "RAW STITCH"}
                </h2>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                  {t("brand.tagline")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <ScrollArea className="flex-1 py-3 px-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
            {t("nav.menu")}
          </p>
          {filteredMainNavItems.map((item) => {
            const active = isActive(item.href);
            const isOpen = openCollapsibles[item.title] !== undefined
              ? openCollapsibles[item.title]
              : active;

            if (item.subItems) {
              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleCollapsible(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            "h-4.5 w-4.5 shrink-0 transition-colors",
                            active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span>{getNavLabel(item.title)}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform duration-200",
                          isOpen ? "rotate-180 text-slate-600" : ""
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                      {item.subItems.map((subItem) => {
                        const isSubActive = isSubItemActive(subItem.href);
                        const isExternal = subItem.href.startsWith("http");
                        const itemClass = cn(
                          "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                          isSubActive
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        );

                        return isExternal ? (
                          <a
                            key={subItem.title}
                            href={subItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={itemClass}
                          >
                            <span>{getNavLabel(subItem.title)}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            onClick={() => isMobile && setOpen(false)}
                            className={itemClass}
                          >
                            <span>{getNavLabel(subItem.title)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={() => isMobile && setOpen(false)}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors",
                      active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span>{getNavLabel(item.title)}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredUtilityNavItems.length > 0 && (
          <>
            <Separator className="my-3 mx-1 bg-slate-100" />

            {/* System Settings */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">
                {t("nav.system")}
              </p>
              {filteredUtilityNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => isMobile && setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    <span>{getNavLabel(item.title)}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Our Brands */}
        <div className="px-2 py-4 mt-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {t("nav.brands")}
          </p>
          <BrandLogos
            className="justify-start gap-2.5 px-1"
            itemClassName="opacity-60 hover:opacity-100"
          />
        </div>
      </ScrollArea>

      {/* User Status & Logout Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs uppercase">
              {user?.username ? user.username.slice(0, 2) : "RS"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user?.username || t("user.admin")}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border capitalize", getRoleBadge(role).className)}>
                  {getRoleBadge(role).label}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title={t("buttons.logout")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Powered by torongoX */}
        <div className="mt-2.5 flex items-center justify-center">
          <a
            href="https://site.torongox.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors group"
          >
            <span className="text-[11px] font-medium">Powered by</span>
            <span className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2.5 py-1 rounded-lg shadow-2xs transition-transform group-hover:scale-105">
              <img
                src="/images/torongox-logo-transparent.png"
                alt="torongoX"
                className="h-5 w-auto object-contain"
              />
            </span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 h-14 flex items-center justify-between shadow-2xs gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 h-9 w-9 rounded-lg shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {branding?.logo_image_url ? (
              <img
                src={branding.logo_image_url}
                alt={branding.logo_text || "Logo"}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[130px] sm:max-w-none">
                {branding?.logo_text || "RAW STITCH RMS"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationsCenter />
          <Link
            href="/pos"
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">POS</span>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[280px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-50 text-slate-800 dark:text-slate-100"
        >
          {renderNavList(true)}
        </SheetContent>
      </Sheet>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden md:flex flex-col w-[270px] h-screen fixed top-0 left-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-40">
        {renderNavList(false)}
      </aside>
    </>
  );
}

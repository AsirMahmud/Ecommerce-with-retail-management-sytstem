"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Sparkles,
  ShoppingBag,
  LogOut,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

export function UpperNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Generate breadcrumb items from pathname
  const breadcrumbs = useMemo(() => {
    if (!pathname || pathname === "/") {
      return [{ label: "Dashboard", href: "/" }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "Home", href: "/" }];

    let currentPath = "";
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      const formattedLabel = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label: formattedLabel, href: currentPath });
    });

    return crumbs;
  }, [pathname]);

  return (
    <header className="hidden md:flex sticky top-0 z-30 h-16 w-full items-center justify-between px-6 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      {/* Left: Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs sm:text-sm">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <div key={crumb.href} className="flex items-center space-x-1.5">
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {isLast ? (
                <span className="font-bold text-slate-900 tracking-tight">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Live Status indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Store Sync</span>
        </div>

        {/* Quick New Sale button */}
        <Button
          asChild
          size="sm"
          className="h-8 sm:h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 rounded-xl shadow-xs gap-1.5 transition-all"
        >
          <Link href="/pos">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>POS Register</span>
          </Link>
        </Button>

        {/* Store Link */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 sm:h-9 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-3 rounded-xl hidden xl:flex gap-1.5"
        >
          <a href="https://rawstitch.com.bd" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Online Store</span>
          </a>
        </Button>

        {/* User Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 outline-none">
              <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                <AvatarFallback className="bg-gradient-to-tr from-slate-900 to-indigo-900 text-white text-xs font-bold">
                  RS
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden 2xl:block">
                <p className="text-xs font-bold text-slate-800 leading-none">Rawstitch Admin</p>
                <p className="text-[10px] text-slate-500 leading-none mt-1">Superuser</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-slate-200">
            <DropdownMenuLabel className="font-normal px-2 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold text-slate-900">Rawstitch RMS</p>
                <p className="text-[11px] text-slate-500">admin@rawstitch.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-slate-100" />
            <DropdownMenuItem asChild className="cursor-pointer text-xs rounded-lg">
              <Link href="/settings">
                <ShieldCheck className="w-4 h-4 mr-2 text-slate-500" />
                <span>System Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer text-xs rounded-lg">
              <Link href="/reports">
                <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                <span>Financial Reports</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-slate-100" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-xs rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

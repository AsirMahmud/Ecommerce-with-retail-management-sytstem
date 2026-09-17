"use client";
import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { MainNav } from "@/components/main-nav";
import { SideNav } from "@/components/side-nav";
import { UpperNav } from "@/components/upper-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { TaskProvider } from "@/context/task-context";
import { AuthProvider } from "@/contexts/auth-context";
import { BismillahProvider } from "@/contexts/bismillah-context";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { BismillahLogo } from "@/components/bismillah-logo";

const inter = Inter({ subsets: ["latin"] });

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TaskProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <BismillahProvider>
            <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full max-w-full overflow-x-hidden">
            <SideNav />
            <div className="flex-1 min-w-0 w-full max-w-full md:ml-[270px] flex flex-col">
              <UpperNav />
              <BismillahLogo />
              <main className="flex-1 p-3 sm:p-5 md:p-6 min-w-0 w-full max-w-full">
                {children}
              </main>
              <Toaster />
              <SonnerToaster position="top-right" richColors />
            </div>
          </div>
        </BismillahProvider>
        </LanguageProvider>
      </ThemeProvider>
    </TaskProvider>
  );
}

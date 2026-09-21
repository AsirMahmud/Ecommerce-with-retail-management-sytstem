"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePwa() {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect iOS devices (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosPlatform =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIosPlatform);

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if running as installed standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      setIsSupported(true);
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setRegistration(reg);
          console.log("[RMS PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("[RMS PWA] Service Worker registration failed:", err);
        });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log("[RMS PWA] App was successfully installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[RMS PWA] Error triggering install prompt:", err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isSupported,
    isInstalled,
    isIOS,
    canInstall,
    isOnline,
    registration,
    installApp,
  };
}

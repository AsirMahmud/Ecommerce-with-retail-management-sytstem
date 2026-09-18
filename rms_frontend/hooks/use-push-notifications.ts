"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

const PUSH_ENABLED_STORAGE_KEY = "rms_push_notifications_enabled";

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  priority?: "urgent" | "high" | "medium" | "low";
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const currentPermission = Notification.permission as PushPermissionState;
    setPermission(currentPermission);

    const storedPref = localStorage.getItem(PUSH_ENABLED_STORAGE_KEY);
    const prefEnabled = storedPref !== null ? storedPref === "true" : currentPermission === "granted";
    setIsEnabled(currentPermission === "granted" && prefEnabled);
  }, []);

  /**
   * Request browser permission for push notifications
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Push notifications are not supported by this browser.");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result === "granted") {
        setIsEnabled(true);
        localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, "true");
        toast.success("Push notifications enabled!", {
          description: "You will now receive store alerts even in background.",
        });
        return true;
      } else if (result === "denied") {
        setIsEnabled(false);
        localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, "false");
        toast.error("Notifications were blocked", {
          description: "Please allow notifications in your browser settings to receive alerts.",
        });
        return false;
      }
      return false;
    } catch (err) {
      console.error("[RMS Push] Permission request error:", err);
      toast.error("Failed to request notification permission");
      return false;
    }
  }, []);

  /**
   * Toggle push notification state
   */
  const toggleNotifications = useCallback(
    async (enable: boolean) => {
      if (enable) {
        if (permission === "granted") {
          setIsEnabled(true);
          localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, "true");
          toast.success("Push notifications enabled");
        } else {
          await requestPermission();
        }
      } else {
        setIsEnabled(false);
        localStorage.setItem(PUSH_ENABLED_STORAGE_KEY, "false");
        toast.info("Push notifications paused");
      }
    },
    [permission, requestPermission]
  );

  /**
   * Display a native system notification via Service Worker or Notification API
   */
  const showNativeNotification = useCallback(
    async (payload: PushNotificationPayload) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const title = payload.title || "Raw Stitch RMS";
      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/badge-72x72.png",
        tag: payload.tag || "rms-alert-" + Date.now(),
        data: {
          url: payload.url || "/",
        },
        requireInteraction: payload.priority === "urgent" || payload.priority === "high",
        silent: false,
      };

      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, options);
            return;
          }
        }
        // Fallback to standard Notification constructor
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          if (payload.url) {
            window.location.href = payload.url;
          }
          notif.close();
        };
      } catch (err) {
        console.error("[RMS Push] Failed to trigger notification:", err);
      }
    },
    []
  );

  /**
   * Send a test push notification to verify setup
   */
  const sendTestNotification = useCallback(async () => {
    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }

    await showNativeNotification({
      title: "Raw Stitch RMS • Push Active",
      body: "Test notification successful! You will receive alerts for new orders, low stock, and returns.",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      url: "/",
      tag: "test-push",
    });

    toast.success("Test notification dispatched!", {
      description: "Check your desktop or device notification center.",
    });
  }, [permission, requestPermission, showNativeNotification]);

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    toggleNotifications,
    showNativeNotification,
    sendTestNotification,
  };
}

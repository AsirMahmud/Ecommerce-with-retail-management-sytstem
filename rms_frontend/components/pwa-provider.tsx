"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePwa } from "@/hooks/use-pwa";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { toast } from "sonner";

interface PwaContextType {
  pwa: ReturnType<typeof usePwa>;
  push: ReturnType<typeof usePushNotifications>;
}

const PwaContext = createContext<PwaContextType | null>(null);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const pwa = usePwa();
  const push = usePushNotifications();
  const { data: notificationsData } = useNotifications();
  const previousUnreadIdsRef = useRef<Set<string | number>>(new Set());
  const initialLoadRef = useRef(true);

  // Online / Offline state alerts
  useEffect(() => {
    if (!pwa.isOnline) {
      toast.warning("Network connection lost", {
        description: "RMS is operating in offline mode. Changes may not sync until reconnected.",
        duration: 5000,
      });
    }
  }, [pwa.isOnline]);

  // Synchronize new unread store notifications to native push alerts
  useEffect(() => {
    const notifications = notificationsData?.notifications || [];
    const currentUnread = notifications.filter((n) => !n.is_read);
    const currentUnreadIds = new Set(currentUnread.map((n) => n.id));

    // Skip on initial load to avoid spamming existing unread notifications
    if (initialLoadRef.current) {
      previousUnreadIdsRef.current = currentUnreadIds;
      initialLoadRef.current = false;
      return;
    }

    // Find genuinely new unread notifications that just arrived
    const newlyArrived = currentUnread.filter(
      (n) => !previousUnreadIdsRef.current.has(n.id)
    );

    if (newlyArrived.length > 0 && push.isEnabled) {
      // Trigger native push notification for each new alert (or latest if multiple)
      const latest = newlyArrived[0];
      push.showNativeNotification({
        title: latest.title,
        body: latest.message,
        url: latest.link || "/",
        tag: `notif-${latest.id}`,
        priority: latest.priority,
      });
    }

    previousUnreadIdsRef.current = currentUnreadIds;
  }, [notificationsData, push]);

  return (
    <PwaContext.Provider value={{ pwa, push }}>
      {children}
    </PwaContext.Provider>
  );
}

export function usePwaContext() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error("usePwaContext must be used within a PWAProvider");
  }
  return context;
}

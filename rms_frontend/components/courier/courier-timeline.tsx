"use client";

import { useState } from "react";
import { OnlinePreorder } from "@/lib/api/onlinePreorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Navigation,
  MapPin,
  PackageCheck,
  AlertCircle,
  Banknote,
} from "lucide-react";

interface CourierTimelineProps {
  order: OnlinePreorder;
  onSyncStatus?: (orderId: number) => Promise<void> | void;
  isSyncing?: boolean;
  className?: string;
  showCardWrapper?: boolean;
}

const PROVIDER_METAS: Record<
  string,
  { label: string; badgeClass: string; trackUrl: (code: string) => string }
> = {
  STEADFAST: {
    label: "Steadfast Courier",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    trackUrl: (_code) => `https://steadfast.com.bd/tracking`,
  },
  PATHAO: {
    label: "Pathao Courier",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    trackUrl: (code) => `https://merchant.pathao.com/tracking?consignment_id=${code}`,
  },
  REDX: {
    label: "RedX Logistics",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    trackUrl: (code) => `https://redx.com.bd/track-parcel/?trackingId=${code}`,
  },
  CARRYBEE: {
    label: "Carrybee Courier",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    trackUrl: (_code) => `https://carrybee.com/track`,
  },
};

export function CourierTimeline({
  order,
  onSyncStatus,
  isSyncing = false,
  className = "",
  showCardWrapper = true,
}: CourierTimelineProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const providerKey = (order.courier_partner || "STEADFAST").toUpperCase();
  const provider = PROVIDER_METAS[providerKey] || PROVIDER_METAS.STEADFAST;

  const consignmentId =
    order.courier_consignment_id || order.steadfast_consignment_id || "";
  const trackingCode =
    order.courier_tracking_code || order.steadfast_tracking_code || "";
  const rawStatus = (
    order.courier_status ||
    order.steadfast_status ||
    order.status ||
    "in_review"
  ).toLowerCase();

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied to Clipboard",
      description: `${label}: ${code}`,
    });
  };

  const trackingLink = trackingCode
    ? provider.trackUrl(trackingCode)
    : consignmentId
    ? provider.trackUrl(consignmentId)
    : null;

  // Determine stage flags
  const isDelivered =
    rawStatus.includes("delivered") ||
    rawStatus.includes("completed") ||
    order.status === "DELIVERED" ||
    order.status === "COMPLETED";

  const isReturnedOrCancelled =
    rawStatus.includes("cancel") ||
    rawStatus.includes("return") ||
    rawStatus.includes("fail") ||
    order.status === "CANCELLED" ||
    order.status === "RETURNED";

  const isInTransit =
    rawStatus.includes("transit") ||
    rawStatus.includes("picked") ||
    rawStatus.includes("process") ||
    rawStatus.includes("hub") ||
    isDelivered ||
    isReturnedOrCancelled;

  const isPickedUp =
    rawStatus.includes("picked") ||
    isInTransit ||
    isDelivered ||
    isReturnedOrCancelled;

  const isOutForDelivery =
    rawStatus.includes("out_for_delivery") ||
    rawStatus.includes("assigned_for_delivery") ||
    isDelivered;

  // Timestamps
  const dispatchDate = order.courier_dispatched_at
    ? new Date(order.courier_dispatched_at)
    : new Date(order.created_at);

  const updatedDate = order.updated_at
    ? new Date(order.updated_at)
    : new Date();

  const addressStr =
    typeof order.shipping_address === "string"
      ? order.shipping_address
      : order.shipping_address?.address ||
        order.shipping_address?.city ||
        "Address on file";

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Provider Info & Sync */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Courier Delivery Timeline
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${provider.badgeClass}`}>
                {provider.label}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Real-time consignment tracking & status updates
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {trackingLink && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
            >
              <a
                href={trackingLink}
                target="_blank"
                rel="noopener noreferrer"
                title="Open courier portal tracker"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Track</span>
              </a>
            </Button>
          )}

          {onSyncStatus && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300"
              onClick={() => onSyncStatus(order.id)}
              disabled={isSyncing}
              title="Synchronize live status from courier gateway"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Consignment & Tracking Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between gap-1">
          <span className="text-slate-500 font-medium">Consignment ID:</span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {consignmentId || "N/A"}
            </span>
            {consignmentId && (
              <button
                type="button"
                onClick={() => handleCopy(consignmentId, "Consignment ID")}
                className="text-slate-400 hover:text-slate-600"
                title="Copy Consignment ID"
              >
                {copiedCode === consignmentId ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1">
          <span className="text-slate-500 font-medium">Tracking Code:</span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {trackingCode || "Pending"}
            </span>
            {trackingCode && (
              <button
                type="button"
                onClick={() => handleCopy(trackingCode, "Tracking Code")}
                className="text-slate-400 hover:text-slate-600"
                title="Copy Tracking Code"
              >
                {copiedCode === trackingCode ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1">
          <span className="text-slate-500 font-medium">COD Collection:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            ৳{Number(order.total_amount || 0).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <span className="text-slate-500 font-medium">Live Status:</span>
          <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
            {rawStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Vertical Timeline Steps */}
      <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800 pt-1">
        
        {/* Step 1: Consignment Booked & Dispatched */}
        <div className="relative pl-8">
          <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
            <Package className="w-3 h-3 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Consignment Booked & Registered
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dispatched with {provider.label}
              {order.courier_dispatched_at && (
                <> • {format(dispatchDate, "MMM dd, yyyy • hh:mm a")}</>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Courier Pickup (Sent to Hub) */}
        <div className="relative pl-8">
          <div
            className={`absolute left-0 top-1 w-[24px] h-[24px] rounded-full border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center ${
              isPickedUp ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {isPickedUp ? (
              <CheckCircle2 className="w-3 h-3 text-white" />
            ) : (
              <Clock className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <div>
            <div
              className={`text-sm font-bold ${
                isPickedUp ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              Parcel Picked Up by Courier
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isPickedUp
                ? "Handed over to courier rider / sorting center (Sent Today)"
                : "Awaiting courier pickup rider arrival at store"}
            </div>
          </div>
        </div>

        {/* Step 3: In Transit & Regional Hub Sorting */}
        <div className="relative pl-8">
          <div
            className={`absolute left-0 top-1 w-[24px] h-[24px] rounded-full border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center ${
              isInTransit ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {isInTransit ? (
              <Navigation className="w-3 h-3 text-white" />
            ) : (
              <Clock className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <div>
            <div
              className={`text-sm font-bold ${
                isInTransit ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              In Transit / Regional Sorting Hub
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isInTransit
                ? `Consignment moving through ${provider.label} delivery network`
                : "Pending transfer to central transit hub"}
            </div>
          </div>
        </div>

        {/* Step 4: Out for Delivery */}
        <div className="relative pl-8">
          <div
            className={`absolute left-0 top-1 w-[24px] h-[24px] rounded-full border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center ${
              isOutForDelivery ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {isOutForDelivery ? (
              <MapPin className="w-3 h-3 text-white" />
            ) : (
              <Clock className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <div>
            <div
              className={`text-sm font-bold ${
                isOutForDelivery ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              Out for Doorstep Delivery
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
              {isOutForDelivery
                ? `Delivery agent dispatched to: ${addressStr}`
                : "Will be dispatched once received at destination hub"}
            </div>
          </div>
        </div>

        {/* Step 5: Final Resolution (Delivered OR Returned) */}
        {isDelivered && (
          <div className="relative pl-8">
            <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-emerald-600 border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
              <PackageCheck className="w-3 h-3 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                Delivered & COD Collected
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  <Banknote className="w-3 h-3" /> ৳{Number(order.total_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Delivery confirmed by courier • {format(updatedDate, "MMM dd, yyyy • hh:mm a")}
              </div>
            </div>
          </div>
        )}

        {isReturnedOrCancelled && (
          <div className="relative pl-8">
            <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-red-600 border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
              <XCircle className="w-3 h-3 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                Delivery Cancelled / Returned
                {order.return_reason && (
                  <span className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                    ({order.return_reason})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Parcel could not be delivered and is returned to merchant
              </div>
            </div>
          </div>
        )}

        {!isDelivered && !isReturnedOrCancelled && (
          <div className="relative pl-8">
            <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
              <Clock className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-400 dark:text-slate-500">
                Final Delivery & Settlement
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Awaiting final confirmation from {provider.label}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {content}
    </div>
  );
}

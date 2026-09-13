"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlinePreorder, onlinePreordersApi, type SteadfastFraudResult } from "@/lib/api/onlinePreorder";
import {
    Package,
    User,
    MapPin,
    CreditCard,
    Clock,
    CheckCircle2,
    Truck,
    XCircle,
    AlertCircle,
    Edit,
    Copy,
    Check,
    ExternalLink,
    Zap,
    RefreshCw,
    ShieldCheck,
    ShieldAlert,
    MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrderDetailsSheetProps {
    order: OnlinePreorder | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
    onEdit: (order: OnlinePreorder) => void;
    onStartVerification?: (order: OnlinePreorder) => void;
}

const statusConfig: Record<string, { color: string; icon: any }> = {
    PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    CONFIRMED: { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
    DELIVERED: { color: "bg-indigo-100 text-indigo-800", icon: Truck },
    COMPLETED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    CANCELLED: { color: "bg-red-100 text-red-800", icon: XCircle },
};

import { useState, useEffect } from "react";
import Link from "next/link";
import { courierApi, type ActiveCourier, type CourierFraudResult } from "@/lib/api/courier";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendAdminPurchaseConfirmed, sendAdminPurchaseCancelled } from "@/lib/gtm";

export function OrderDetailsSheet({ order, isOpen, onClose, onRefresh, onEdit, onStartVerification }: OrderDetailsSheetProps) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("Fake Customer / Fake Order");
    const [isFakeCustomer, setIsFakeCustomer] = useState(true);
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    // Multi-Courier States
    const [activeCouriers, setActiveCouriers] = useState<ActiveCourier[]>([]);
    const [selectedCourierProvider, setSelectedCourierProvider] = useState<string>("STEADFAST");
    const [steadfastDialogOpen, setSteadfastDialogOpen] = useState(false);
    const [isDispatchingSteadfast, setIsDispatchingSteadfast] = useState(false);
    const [isCheckingSteadfastStatus, setIsCheckingSteadfastStatus] = useState(false);
    const [isCheckingFraud, setIsCheckingFraud] = useState(false);
    const [fraudData, setFraudData] = useState<CourierFraudResult | null>(null);
    const [selectedFraudProvider, setSelectedFraudProvider] = useState<string>("ALL");
    const [copiedTracking, setCopiedTracking] = useState(false);
    const [codAmount, setCodAmount] = useState("");
    const [dispatchNote, setDispatchNote] = useState("");
    const [dispatchAddress, setDispatchAddress] = useState("");
    const [dispatchPhone, setDispatchPhone] = useState("");

    const fetchCouriers = async () => {
        try {
            const res = await courierApi.getActiveCouriers();
            setActiveCouriers(res.data);
            if (res.data.length > 0) {
                setSelectedCourierProvider(prev => {
                    if (res.data.some(c => c.provider === prev)) return prev;
                    const def = res.data.find(c => c.is_default);
                    return def ? def.provider : res.data[0].provider;
                });
            }
            return res.data;
        } catch (err) {
            console.error("Failed to load active couriers:", err);
            return [];
        }
    };

    useEffect(() => {
        if (isOpen) {
            void fetchCouriers();
        }
    }, [isOpen]);

    const formatAddressString = (addr: any): string => {
        if (!addr) return "";
        if (typeof addr === "string") return addr;
        const parts = [
            addr.address,
            addr.place,
            addr.thana,
            addr.city_corporation,
            addr.union,
            addr.upazila,
            addr.district,
            addr.division,
            addr.city,
            addr.area
        ].filter(Boolean);
        return Array.from(new Set(parts)).join(", ");
    };

    const openFastDispatch = async (courierProvider?: string) => {
        if (!order) return;
        setCodAmount(String(order.total_amount || 0));
        setDispatchNote(order.notes || `Online Preorder #${order.id}`);
        setDispatchAddress(formatAddressString(order.shipping_address));
        setDispatchPhone(order.customer_phone || "");

        const fresh = await fetchCouriers();
        if (courierProvider) {
            setSelectedCourierProvider(courierProvider);
        } else if (fresh.length > 0 && !fresh.some(c => c.provider === selectedCourierProvider)) {
            const def = fresh.find(c => c.is_default);
            setSelectedCourierProvider(def ? def.provider : fresh[0].provider);
        }
        setSteadfastDialogOpen(true);
    };

    const openFastSteadfastDialog = () => {
        void openFastDispatch();
    };

    const handleFastDispatch = async () => {
        if (!order) return;
        setIsDispatchingSteadfast(true);
        try {
            const res = await courierApi.dispatchOrder(order.id, {
                courier_partner: selectedCourierProvider,
                cod_amount: Number(codAmount) >= 0 ? Number(codAmount) : Number(order.total_amount) || 0,
                note: dispatchNote,
                address: dispatchAddress,
                phone: dispatchPhone,
            });
            const courierName = activeCouriers.find(c => c.provider === selectedCourierProvider)?.name || selectedCourierProvider;
            toast({
                title: `Dispatched to ${courierName}!`,
                description: `Consignment ID: ${res.data.consignment_id || 'N/A'} | Tracking: ${res.data.tracking_code || 'N/A'}`,
            });
            setSteadfastDialogOpen(false);
            onRefresh();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.response?.data?.detail || "Failed to dispatch order";
            toast({
                title: "Dispatch Failed",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setIsDispatchingSteadfast(false);
        }
    };

    const handleRefreshSteadfastStatus = async () => {
        if (!order) return;
        setIsCheckingSteadfastStatus(true);
        try {
            const res = await courierApi.getOrderStatus(order.id);
            toast({
                title: "Courier Status Refreshed",
                description: `Current delivery status: ${res.data.status || 'Updated'}`,
            });
            onRefresh();
        } catch (error: any) {
            toast({
                title: "Status Check Failed",
                description: error?.response?.data?.message || error?.response?.data?.detail || "Failed to fetch courier status",
                variant: "destructive",
            });
        } finally {
            setIsCheckingSteadfastStatus(false);
        }
    };

    const handleCheckCourierFraud = async (provider?: string) => {
        if (!order) return;
        const targetProvider = provider || selectedFraudProvider || order.courier_partner || (activeCouriers[0]?.provider) || "ALL";
        setSelectedFraudProvider(targetProvider);
        setIsCheckingFraud(true);
        try {
            const res = await courierApi.checkCourierFraud({ orderId: order.id, provider: targetProvider });
            setFraudData(res.data);
            toast({
                title: `${res.data.provider_name} Loaded`,
                description: `Total parcels: ${res.data.total_parcels}, Success rate: ${res.data.success_rate}%`,
            });
        } catch (error: any) {
            toast({
                title: "Fraud Check Failed",
                description: error?.response?.data?.message || "Could not retrieve courier record",
                variant: "destructive",
            });
        } finally {
            setIsCheckingFraud(false);
        }
    };

    const copyTrackingCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedTracking(true);
        toast({ title: "Copied!", description: `Tracking code ${code} copied to clipboard.` });
        setTimeout(() => setCopiedTracking(false), 2000);
    };


    if (!order) return null;

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === "CANCELLED") {
            setCancelReason("Fake Customer / Fake Order");
            setIsFakeCustomer(true);
            setCancelDialogOpen(true);
            return;
        }

        try {
            await onlinePreordersApi.updateStatus(order.id, newStatus);
            toast({ title: "Success", description: `Order status updated to ${newStatus}` });
            
            if (newStatus === "CONFIRMED") {
                sendAdminPurchaseConfirmed({ ...order, status: newStatus });
            }

            onRefresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleConfirmCancel = async () => {
        if (!order) return;
        setIsSubmittingCancel(true);
        try {
            await onlinePreordersApi.updateStatus(order.id, "CANCELLED");
            sendAdminPurchaseCancelled(order, cancelReason, isFakeCustomer);
            toast({ 
                title: isFakeCustomer ? "Order Cancelled & Flagged as Fake" : "Order Cancelled", 
                description: `Order #${order.id} status updated to CANCELLED.` 
            });
            setCancelDialogOpen(false);
            onRefresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to cancel order", variant: "destructive" });
        } finally {
            setIsSubmittingCancel(false);
        }
    };

    const status = statusConfig[order.status] || { color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const StatusIcon = status.icon;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col h-full bg-slate-50">
                <SheetHeader className="p-4 sm:p-6 bg-white border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <SheetTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                Order #{order.id}
                            </SheetTitle>
                            <SheetDescription className="text-xs sm:text-sm">
                                Placed on {format(new Date(order.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                            </SheetDescription>
                        </div>
                        <div className="flex flex-wrap sm:flex-col sm:items-end gap-2">
                            <Badge className={`${status.color} px-3 py-1 text-sm font-medium border-none`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                {order.status}
                            </Badge>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(order)}
                                    className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                    <Edit className="w-3 h-3 mr-1.5" />
                                    Edit Order
                                </Button>
                                {onStartVerification && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => onStartVerification(order)}
                                        className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                                    >
                                        Verify Order
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {/* Status Management Section */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                                    <Clock className="w-4 h-4" />
                                    <span>Order Status</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    Click a step to update
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["PENDING", "CONFIRMED", "DELIVERED", "COMPLETED", "CANCELLED"].map((statusValue) => {
                                    const isActive = order.status === statusValue;
                                    const isDisabled =
                                        (statusValue === "COMPLETED" && order.status !== "DELIVERED");

                                    const baseClasses =
                                        "px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors min-h-[36px] flex items-center justify-center";

                                    const activeClasses = "bg-indigo-600 text-white border-indigo-600";
                                    const inactiveClasses =
                                        "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
                                    const disabledClasses = "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed";

                                    let classes = baseClasses + " " + (isActive ? activeClasses : inactiveClasses);
                                    if (isDisabled && !isActive) {
                                        classes = baseClasses + " " + disabledClasses;
                                    }

                                    const handleClick = () => {
                                        if (isDisabled || isActive) return;
                                        handleStatusChange(statusValue);
                                    };

                                    return (
                                        <button
                                            key={statusValue}
                                            type="button"
                                            className={classes}
                                            onClick={handleClick}
                                            disabled={isDisabled}
                                        >
                                            {statusValue.charAt(0) + statusValue.slice(1).toLowerCase()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Customer & Address Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-1">
                                    <User className="w-4 h-4" />
                                    Customer
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">{order.customer_name}</div>
                                    <div className="text-sm text-gray-500">{order.customer_phone}</div>
                                    {order.customer_email && <div className="text-sm text-gray-500">{order.customer_email}</div>}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-1">
                                    <MapPin className="w-4 h-4" />
                                    Shipping
                                </div>
                                <div className="text-sm text-gray-600">
                                    {order.shipping_address ? (
                                        <div className="whitespace-pre-line">
                                            {order.shipping_address.address}<br />
                                            {order.shipping_address.city || order.shipping_address.thana || ""}{order.shipping_address.district ? `, ${order.shipping_address.district}` : ""}
                                        </div>
                                    ) : (
                                        "No shipping address provided"
                                    )}
                                    {order.delivery_method && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-700 font-medium">
                                            <Truck className="w-3 h-3" />
                                            {order.delivery_method}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Courier Partner Integration Card */}
                        {(() => {
                            const partnerKey = (order.courier_partner || (order.steadfast_consignment_id ? "STEADFAST" : "")).toUpperCase();
                            const consignmentId = order.courier_consignment_id || order.steadfast_consignment_id;
                            const trackingCode = order.courier_tracking_code || order.steadfast_tracking_code;
                            const courierStatus = order.courier_status || order.steadfast_status;

                            const courierName =
                                partnerKey === "STEADFAST"
                                    ? "Steadfast Courier"
                                    : partnerKey === "PATHAO"
                                    ? "Pathao Courier"
                                    : partnerKey === "REDX"
                                    ? "RedX Logistics"
                                    : partnerKey === "CARRYBEE"
                                    ? "Carrybee Courier"
                                    : partnerKey || "Delivery Agent";

                            const trackingUrl =
                                trackingCode || consignmentId
                                    ? partnerKey === "STEADFAST"
                                        ? `https://steadfast.com.bd/tracking`
                                        : partnerKey === "PATHAO"
                                        ? `https://merchant.pathao.com/tracking?consignment_id=${trackingCode || consignmentId}`
                                        : partnerKey === "REDX"
                                        ? `https://redx.com.bd/track-parcel/?trackingId=${trackingCode || consignmentId}`
                                        : `https://carrybee.com/track`
                                    : null;

                            return (
                                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-sm">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                                                    {courierName}
                                                    {partnerKey && (
                                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide">
                                                            {partnerKey}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500">Integrated Delivery Partner</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {consignmentId ? (
                                                <>
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold uppercase tracking-wider">
                                                        {courierStatus || 'In Review'}
                                                    </Badge>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleRefreshSteadfastStatus}
                                                        disabled={isCheckingSteadfastStatus}
                                                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-indigo-600 border-slate-200"
                                                        title="Refresh Live Status"
                                                    >
                                                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isCheckingSteadfastStatus ? 'animate-spin' : ''}`} />
                                                        Refresh
                                                    </Button>
                                                </>
                                            ) : order.status !== "CANCELLED" ? (
                                                activeCouriers.length <= 1 ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openFastDispatch(activeCouriers[0]?.provider)}
                                                        className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5"
                                                    >
                                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                                        ⚡ {activeCouriers.length === 1 ? `Dispatch via ${activeCouriers[0].name}` : "Fast Dispatch"}
                                                    </Button>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button
                                                              size="sm"
                                                              className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5"
                                                          >
                                                              <Zap className="w-3.5 h-3.5 fill-current" />
                                                              ⚡ Dispatch Order
                                                              <MoreHorizontal className="w-3.5 h-3.5 ml-1 opacity-70" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel className="text-xs">Select Delivery Partner</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {activeCouriers.map((c) => (
                                                                <DropdownMenuItem
                                                                    key={c.provider}
                                                                    onClick={() => openFastDispatch(c.provider)}
                                                                    className="text-xs font-semibold cursor-pointer"
                                                                >
                                                                    <Truck className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                                                    Dispatch via {c.name}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs">
                                                    Order Cancelled
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Consignment Details If Booked */}
                                    {consignmentId ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                                            <div>
                                                <span className="text-slate-400 text-[11px] font-medium block">Consignment ID</span>
                                                <span className="font-mono font-bold text-slate-900 text-sm">
                                                    #{consignmentId}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 text-[11px] font-medium block">Tracking Code</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono font-bold text-indigo-600 text-sm">
                                                        {trackingCode || 'N/A'}
                                                    </span>
                                                    {trackingCode && (
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-500 hover:text-slate-900"
                                                                onClick={() => copyTrackingCode(trackingCode)}
                                                                title="Copy Tracking Code"
                                                            >
                                                                {copiedTracking ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                            </Button>
                                                            {trackingUrl && (
                                                                <a
                                                                    href={trackingUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    onClick={() => {
                                                                        if (trackingCode) {
                                                                            copyTrackingCode(trackingCode);
                                                                        }
                                                                    }}
                                                                    className="h-6 px-1.5 inline-flex items-center text-[10px] font-medium bg-white border border-slate-200 rounded text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                                                                    title="Open Live Courier Tracker (Copies tracking code)"
                                                                >
                                                                    Track <ExternalLink className="w-2.5 h-2.5 ml-1" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                                            <div className="text-amber-900">
                                                <span className="font-bold">Not yet booked with a delivery agent.</span>
                                                <p className="text-amber-700/90 text-[11px] mt-0.5">
                                                    Click <strong>Fast Dispatch</strong> to book this parcel with Steadfast, Pathao, RedX, or Carrybee.
                                                </p>
                                            </div>
                                            {order.status !== "CANCELLED" && (
                                                <Button
                                                    size="sm"
                                                    onClick={openFastSteadfastDialog}
                                                    className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                                                >
                                                    Dispatch Now
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                     {/* Respective Delivery Method Fraud & Delivery Record */}
                                     <div className="pt-2 border-t border-slate-100 space-y-2">
                                         <div className="flex flex-wrap items-center justify-between gap-2">
                                             <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                 <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                                 Delivery Method Verification
                                                 {fraudData && (
                                                     <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 ml-1">
                                                         {fraudData.provider_name}
                                                     </Badge>
                                                 )}
                                             </div>
                                             {!fraudData ? (
                                                 <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     onClick={() => handleCheckCourierFraud(order.courier_partner || undefined)}
                                                     disabled={isCheckingFraud}
                                                     className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium px-2"
                                                 >
                                                     {isCheckingFraud ? (
                                                         <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                                     ) : (
                                                         <Zap className="w-3 h-3 mr-1" />
                                                     )}
                                                     {isCheckingFraud ? "Checking..." : `Check ${order.courier_partner || "Courier"} History`}
                                                 </Button>
                                             ) : (
                                                 <Badge
                                                     className={`text-[10px] font-bold px-2 py-0.5 border-none ${
                                                         fraudData.risk_level === 'HIGH_RISK' ? 'bg-red-100 text-red-800' :
                                                         fraudData.risk_level === 'SAFE' ? 'bg-emerald-100 text-emerald-800' :
                                                         'bg-slate-100 text-slate-800'
                                                     }`}
                                                 >
                                                     {fraudData.risk_level === 'HIGH_RISK' ? '⚠️ High Risk of Return' :
                                                      fraudData.risk_level === 'SAFE' ? '✓ Verified Safe Customer' : 'Normal Record'}
                                                 </Badge>
                                             )}
                                         </div>

                                         {/* Courier Selector Tabs when record loaded */}
                                         {fraudData && (
                                             <div className="flex flex-wrap items-center gap-1 pt-1">
                                                 <span className="text-[10px] text-slate-400 font-medium mr-1">Method:</span>
                                                 <Button
                                                     type="button"
                                                     variant={selectedFraudProvider === "ALL" ? "default" : "outline"}
                                                     size="sm"
                                                     className={`h-5 text-[10px] px-1.5 ${selectedFraudProvider === "ALL" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                                                     onClick={() => handleCheckCourierFraud("ALL")}
                                                     disabled={isCheckingFraud}
                                                 >
                                                     All
                                                 </Button>
                                                 {activeCouriers.map((c) => (
                                                     <Button
                                                         key={c.provider}
                                                         type="button"
                                                         variant={selectedFraudProvider === c.provider ? "default" : "outline"}
                                                         size="sm"
                                                         className={`h-5 text-[10px] px-1.5 ${selectedFraudProvider === c.provider ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                                                         onClick={() => handleCheckCourierFraud(c.provider)}
                                                         disabled={isCheckingFraud}
                                                     >
                                                         {c.name.replace(" Courier", "").replace(" Logistics", "")}
                                                     </Button>
                                                 ))}
                                                 {!activeCouriers.some(c => c.provider === "STEADFAST") && (
                                                     <Button
                                                         type="button"
                                                         variant={selectedFraudProvider === "STEADFAST" ? "default" : "outline"}
                                                         size="sm"
                                                         className={`h-5 text-[10px] px-1.5 ${selectedFraudProvider === "STEADFAST" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                                                         onClick={() => handleCheckCourierFraud("STEADFAST")}
                                                         disabled={isCheckingFraud}
                                                     >
                                                         Steadfast
                                                     </Button>
                                                 )}
                                             </div>
                                         )}

                                         {fraudData && (
                                             <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs border border-slate-100">
                                                 <div>
                                                     <span className="text-slate-400 text-[10px] block">Parcels</span>
                                                     <span className="font-bold text-slate-900 text-xs">{fraudData.total_parcels}</span>
                                                 </div>
                                                 <div>
                                                     <span className="text-slate-400 text-[10px] block">Delivered</span>
                                                     <span className="font-bold text-emerald-700 text-xs">{fraudData.total_delivered}</span>
                                                 </div>
                                                 <div>
                                                     <span className="text-slate-400 text-[10px] block">Cancelled</span>
                                                     <span className="font-bold text-rose-700 text-xs">{fraudData.total_cancelled}</span>
                                                 </div>
                                                 <div>
                                                     <span className="text-slate-400 text-[10px] block">Success Rate</span>
                                                     <span className="font-extrabold text-indigo-700 text-xs">{fraudData.success_rate}%</span>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                </div>
                            );
                        })()}

                        {/* Fraud Risk & Customer History Card */}
                        {order.fraud_summary && (
                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                                        <AlertCircle className="w-4 h-4 text-indigo-600" />
                                        <span>Fraud Risk & Customer History</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-medium">Score: {order.fraud_summary.risk_score}/100</span>
                                        <Badge className={`px-2.5 py-0.5 text-xs font-bold border-none ${
                                            order.fraud_summary.risk_level === 'HIGH' ? 'bg-red-100 text-red-800' :
                                            order.fraud_summary.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                                            'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            Risk: {order.fraud_summary.risk_level}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg text-center text-xs">
                                    <div>
                                        <div className="text-slate-400 font-medium">Total Orders</div>
                                        <div className="font-bold text-slate-900 text-sm mt-0.5">{order.fraud_summary.customer_stats.total_orders}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-medium">Delivered</div>
                                        <div className="font-bold text-emerald-700 text-sm mt-0.5">{order.fraud_summary.customer_stats.delivered_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-medium">Cancelled</div>
                                        <div className="font-bold text-amber-700 text-sm mt-0.5">{order.fraud_summary.customer_stats.cancelled_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 font-medium">Refused/Fake</div>
                                        <div className="font-bold text-red-700 text-sm mt-0.5">{order.fraud_summary.customer_stats.returned_refused_count}</div>
                                    </div>
                                </div>

                                {order.fraud_summary.matching_signals.length > 0 && (
                                    <div className="space-y-1 text-xs">
                                        <div className="font-medium text-slate-500">Risk Signals:</div>
                                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                                            {order.fraud_summary.matching_signals.map((sig, idx) => (
                                                <li key={idx} className="text-amber-800">{sig}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Marketing & Meta Attribution Signals Card */}
                        {(order.utm_source || order.fbp || order.fbc || order.fbclid) && (
                            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                    <span>Attribution & Tracking Signals</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    {order.utm_source && (
                                        <div className="bg-slate-50 p-2 rounded border">
                                            <span className="text-slate-400 block font-medium">UTM Source</span>
                                            <span className="font-semibold text-slate-800">{order.utm_source}</span>
                                        </div>
                                    )}
                                    {order.utm_medium && (
                                        <div className="bg-slate-50 p-2 rounded border">
                                            <span className="text-slate-400 block font-medium">UTM Medium</span>
                                            <span className="font-semibold text-slate-800">{order.utm_medium}</span>
                                        </div>
                                    )}
                                    {order.utm_campaign && (
                                        <div className="bg-slate-50 p-2 rounded border">
                                            <span className="text-slate-400 block font-medium">UTM Campaign</span>
                                            <span className="font-semibold text-slate-800">{order.utm_campaign}</span>
                                        </div>
                                    )}
                                    {order.fbp && (
                                        <div className="bg-slate-50 p-2 rounded border truncate" title={order.fbp}>
                                            <span className="text-slate-400 block font-medium">Meta _fbp</span>
                                            <span className="font-mono text-[10px] text-slate-700">{order.fbp}</span>
                                        </div>
                                    )}
                                    {order.fbc && (
                                        <div className="bg-slate-50 p-2 rounded border truncate" title={order.fbc}>
                                            <span className="text-slate-400 block font-medium">Meta _fbc</span>
                                            <span className="font-mono text-[10px] text-slate-700">{order.fbc}</span>
                                        </div>
                                    )}
                                    {order.purchase_event_sent && (
                                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                                            <span className="text-emerald-600 block font-medium">Meta Purchase CAPI</span>
                                            <span className="font-bold text-emerald-800">Sent ✓</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Section */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                                <CreditCard className="w-4 h-4" />
                                Billing details
                            </div>
                            <div className="space-y-2">
                                {Number(order.automatic_discount_amount || 0) > 0 && <div className="flex justify-between text-sm text-rose-600"><span>Automatic discount</span><span>-{formatCurrency(order.automatic_discount_amount)}</span></div>}
                                {Number(order.coupon_discount_amount || 0) > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Coupon ({order.coupon_code})</span><span>-{formatCurrency(order.coupon_discount_amount)}</span></div>}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-semibold text-slate-800">{formatCurrency(Number(order.total_amount) - Number(order.delivery_charge || 0))}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Shipping</span>
                                    <span>{formatCurrency(order.delivery_charge || 0)}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-base text-slate-900">
                                    <span>Grand Total</span>
                                    <span className="text-indigo-600 font-extrabold">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-4">
                                <Package className="w-4 h-4" />
                                Items ({order.items.length})
                            </div>
                            <div className="space-y-4">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-3 rounded-lg border bg-slate-50/50">
                                        <div className="w-16 h-16 bg-white border rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {item.product_image ? (
                                                <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-8 h-8 opacity-20 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 break-words whitespace-normal line-clamp-2" title={item.product_name || `Product ID: ${item.product_id}`}>
                                                {item.product_name || `Product ID: ${item.product_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                                {item.color} / {item.size} • Qty: {item.quantity}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {formatCurrency(Number(item.unit_price) * item.quantity - (item.discount || 0))}
                                                    </div>
                                                    {item.discount! > 0 && (
                                                        <div className="text-[10px] text-rose-500 font-bold">
                                                            Discount: -{formatCurrency(item.discount)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 line-through">
                                                    {formatCurrency(Number(item.unit_price) * item.quantity)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Internal Notes */}
                        {order.notes && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                                <div className="text-amber-800 font-semibold text-sm mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Notes
                                </div>
                                <div className="text-sm text-amber-900 leading-relaxed">
                                    {order.notes}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-6">
                                <Clock className="w-4 h-4" />
                                Order Timeline
                            </div>
                            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                                <div className="relative pl-8">
                                    <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-green-500 border-4 border-white shadow-sm flex items-center justify-center">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">Order Placed</div>
                                        <div className="text-xs text-slate-500">{format(new Date(order.created_at), "MMM dd, yyyy • hh:mm a")}</div>
                                    </div>
                                </div>
                                <div className="relative pl-8">
                                    <div className={`absolute left-0 top-1 w-[24px] h-[24px] rounded-full border-4 border-white shadow-sm flex items-center justify-center ${['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'bg-indigo-600' : 'bg-slate-200'
                                        }`}>
                                        {['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(order.status) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold ${['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'text-slate-900' : 'text-slate-400'}`}>
                                            Confirmed & Processing
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {['CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(order.status) ? 'Order has been confirmed' : 'Wait for confirmation'}
                                        </div>
                                    </div>
                                </div>
                                {order.status === 'CANCELLED' && (
                                    <div className="relative pl-8">
                                        <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-red-500 border-4 border-white shadow-sm flex items-center justify-center">
                                            <XCircle className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-red-600">Order Cancelled</div>
                                            <div className="text-xs text-slate-500">Order was cancelled by admin</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Cancel Order Confirmation Modal */}
                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-600" />
                                Cancel Order #{order.id}
                            </DialogTitle>
                            <DialogDescription>
                                Specify the reason for cancelling this order. This event will be logged and dispatched to Meta GTM tracking.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">Quick Reason Preset</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: "Fake Customer / Fake Order", isFake: true },
                                        { label: "Unreachable / Invalid Phone", isFake: true },
                                        { label: "Customer Cancelled", isFake: false },
                                        { label: "Out of Stock", isFake: false },
                                    ].map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all ${
                                                cancelReason === preset.label
                                                    ? "bg-red-50 text-red-700 border-red-300 font-bold"
                                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                            }`}
                                            onClick={() => {
                                                setCancelReason(preset.label);
                                                setIsFakeCustomer(preset.isFake);
                                            }}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cancelReason" className="font-semibold text-slate-700">Custom Reason</Label>
                                <Input
                                    id="cancelReason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Enter cancellation reason..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isFakeCheckbox"
                                    checked={isFakeCustomer}
                                    onChange={(e) => setIsFakeCustomer(e.target.checked)}
                                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                                />
                                <Label htmlFor="isFakeCheckbox" className="text-sm font-semibold text-red-700 cursor-pointer">
                                    Flag as Fake Customer / Fake Order (Dispatches `is_fake: true` to Meta)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                                Keep Order
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleConfirmCancel}
                                disabled={isSubmittingCancel}
                                className="bg-red-600 hover:bg-red-700 font-bold"
                            >
                                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Fast Courier Dispatch Dialog */}
                <Dialog open={steadfastDialogOpen} onOpenChange={setSteadfastDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg text-slate-900 font-bold">
                                <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                                    <Zap className="w-4 h-4 fill-current" />
                                </div>
                                Fast Dispatch to Courier Partner
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Confirm delivery information for automated booking with your integrated courier.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5 py-2">
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border text-xs">
                                <div>
                                    <span className="text-slate-400 block font-medium">Customer</span>
                                    <span className="font-bold text-slate-900">{order.customer_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block font-medium">Order Invoice</span>
                                    <span className="font-bold text-indigo-600">#{order.id}</span>
                                </div>
                            </div>

                            {/* Delivery Agent Options */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-slate-700">Delivery Agent / Courier Partner</Label>
                                    <Link href="/settings" className="text-[11px] text-indigo-600 hover:underline">
                                        Manage Keys in Settings
                                    </Link>
                                </div>
                                {activeCouriers.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                                        <p className="font-semibold flex items-center gap-1 text-amber-800">
                                            <Truck className="h-3.5 w-3.5" />
                                            No Delivery Agent API Keys Configured
                                        </p>
                                        <p className="text-[11px] text-amber-700">
                                            Please enter your API keys for Pathao, Steadfast, RedX, or Carrybee in Settings to enable 1-click dispatch.
                                        </p>
                                        <Button asChild size="sm" variant="outline" className="h-7 text-xs mt-1 border-amber-300 bg-white">
                                            <Link href="/settings">Configure in Settings</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {activeCouriers.map((c) => {
                                            const isSelected = selectedCourierProvider === c.provider;
                                            return (
                                                <div
                                                    key={c.provider}
                                                    onClick={() => setSelectedCourierProvider(c.provider)}
                                                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                                        isSelected
                                                            ? "border-amber-500 bg-amber-50/80 ring-2 ring-amber-400/40 shadow-xs font-bold text-amber-950"
                                                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Truck className={`h-4 w-4 ${isSelected ? "text-amber-600" : "text-slate-400"}`} />
                                                        <span>{c.name}</span>
                                                    </div>
                                                    {isSelected ? (
                                                        <Check className="h-4 w-4 text-amber-600" />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">Select</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatchPhone" className="text-xs font-semibold text-slate-700">Recipient Phone (11 digits)</Label>
                                <Input
                                    id="dispatchPhone"
                                    value={dispatchPhone}
                                    onChange={(e) => setDispatchPhone(e.target.value)}
                                    placeholder="01XXXXXXXXX"
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="codAmount" className="text-xs font-semibold text-slate-700">Cash on Delivery (COD) Amount (৳)</Label>
                                <Input
                                    id="codAmount"
                                    type="number"
                                    value={codAmount}
                                    onChange={(e) => setCodAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="h-9 text-sm font-semibold"
                                />
                                <p className="text-[11px] text-slate-400">Default is full order amount (৳{order.total_amount}). Set to 0 if paid in advance.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatchAddress" className="text-xs font-semibold text-slate-700">Delivery Address</Label>
                                <Textarea
                                    id="dispatchAddress"
                                    value={dispatchAddress}
                                    onChange={(e) => setDispatchAddress(e.target.value)}
                                    placeholder="Customer street address, thana, district..."
                                    rows={2}
                                    className="text-xs resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dispatchNote" className="text-xs font-semibold text-slate-700">Courier Note</Label>
                                <Input
                                    id="dispatchNote"
                                    value={dispatchNote}
                                    onChange={(e) => setDispatchNote(e.target.value)}
                                    placeholder="Special delivery instructions..."
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" size="sm" onClick={() => setSteadfastDialogOpen(false)} disabled={isDispatchingSteadfast}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleFastDispatch}
                                disabled={isDispatchingSteadfast || !dispatchPhone || !dispatchAddress || activeCouriers.length === 0}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5"
                            >
                                {isDispatchingSteadfast ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                                        Booking Consignment...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                        Confirm &amp; Dispatch via {activeCouriers.find(c => c.provider === selectedCourierProvider)?.name || 'Courier'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SheetContent>
        </Sheet>

    );
}

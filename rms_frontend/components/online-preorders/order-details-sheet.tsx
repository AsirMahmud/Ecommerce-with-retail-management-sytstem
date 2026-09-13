"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlinePreorder, onlinePreordersApi } from "@/lib/api/onlinePreorder";
import { Package, User, MapPin, CreditCard, Clock, CheckCircle2, Truck, XCircle, AlertCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendAdminPurchaseConfirmed, sendAdminPurchaseCancelled } from "@/lib/gtm";

export function OrderDetailsSheet({ order, isOpen, onClose, onRefresh, onEdit, onStartVerification }: OrderDetailsSheetProps) {
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("Fake Customer / Fake Order");
    const [isFakeCustomer, setIsFakeCustomer] = useState(true);
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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
            </SheetContent>
        </Sheet>
    );
}

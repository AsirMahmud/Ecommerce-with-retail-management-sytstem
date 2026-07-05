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

export function OrderDetailsSheet({ order, isOpen, onClose, onRefresh, onEdit, onStartVerification }: OrderDetailsSheetProps) {
    if (!order) return null;

    const handleStatusChange = async (newStatus: string) => {
        // Simple status update; verification can be triggered via separate button
        try {
            await onlinePreordersApi.updateStatus(order.id, newStatus);
            toast({ title: "Success", description: `Order status updated to ${newStatus}` });
            onRefresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const status = statusConfig[order.status] || { color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const StatusIcon = status.icon;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col h-full bg-slate-50">
                <SheetHeader className="p-6 bg-white border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                Order #{order.id}
                            </SheetTitle>
                            <SheetDescription>
                                Placed on {format(new Date(order.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                            </SheetDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge className={`${status.color} px-3 py-1 text-sm font-medium border-none`}>
                                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                                {order.status}
                            </Badge>
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
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        {/* Status Management Section */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                                    <Clock className="w-4 h-4" />
                                    <span>Order Status</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                    Click a step to update the status
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["PENDING", "CONFIRMED", "DELIVERED", "COMPLETED", "CANCELLED"].map((statusValue) => {
                                    const isActive = order.status === statusValue;
                                    const isDisabled =
                                        (statusValue === "COMPLETED" && order.status !== "DELIVERED") ||
                                        (statusValue === "DELIVERED" && !!onStartVerification); // encourage using Verify Order

                                    const baseClasses =
                                        "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors";

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                            {order.shipping_address.city}, {order.shipping_address.upazila}
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

                        {/* Payment Section */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                                <CreditCard className="w-4 h-4" />
                                Billing details
                            </div>
                            <div className="space-y-2">
                                {Number(order.automatic_discount_amount || 0) > 0 && <div className="flex justify-between text-sm text-red-600"><span>Automatic discount</span><span>-৳{Number(order.automatic_discount_amount).toLocaleString()}</span></div>}
                                {Number(order.coupon_discount_amount || 0) > 0 && <div className="flex justify-between text-sm text-green-700"><span>Coupon ({order.coupon_code})</span><span>-৳{Number(order.coupon_discount_amount).toLocaleString()}</span></div>}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium">৳{(Number(order.total_amount) - Number(order.delivery_charge || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Shipping</span>
                                    <span>৳{Number(order.delivery_charge || 0).toLocaleString()}</span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-bold text-lg text-slate-900">
                                    <span>Grand Total</span>
                                    <span>৳{Number(order.total_amount).toLocaleString()}</span>
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
                                            <div className="font-semibold text-slate-900 truncate">
                                                {item.product_name || `Product ID: ${item.product_id}`}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 font-medium">
                                                {item.color} / {item.size} • Qty: {item.quantity}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        ৳{(Number(item.unit_price) * item.quantity - (item.discount || 0)).toLocaleString()}
                                                    </div>
                                                    {item.discount! > 0 && (
                                                        <div className="text-[10px] text-red-500 font-bold">
                                                            Discount: -৳{Number(item.discount).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 line-through">
                                                    ৳{(Number(item.unit_price) * item.quantity).toLocaleString()}
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
            </SheetContent>
        </Sheet>
    );
}

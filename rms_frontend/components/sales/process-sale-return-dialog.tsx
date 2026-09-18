"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  ArrowRight,
  Loader2,
  DollarSign,
  Undo2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SaleItemWithReturns {
  id: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
    price?: number | string;
  };
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number | string;
  discount: number | string;
  total: number | string;
  returned_quantity?: number;
  returnable_quantity?: number;
}

interface SaleForReturn {
  id: number;
  invoice_number: string;
  total: number | string;
  status: string;
  date: string;
  customer?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  customer_phone?: string;
  items?: SaleItemWithReturns[];
}

interface ProcessSaleReturnDialogProps {
  sale: SaleForReturn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COMMON_REASONS = [
  "Defective / Damaged item",
  "Incorrect size / fit issue",
  "Customer changed mind",
  "Color / style mismatch",
  "Exchange requested",
  "Other",
];

export function ProcessSaleReturnDialog({
  sale,
  open,
  onOpenChange,
  onSuccess,
}: ProcessSaleReturnDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [returnType, setReturnType] = useState<"full" | "partial">("partial");
  const [selectedItems, setSelectedItems] = useState<
    Record<
      number,
      {
        selected: boolean;
        quantity: number;
        reason: string;
      }
    >
  >({});
  const [reasonCategory, setReasonCategory] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [customRefundAmount, setCustomRefundAmount] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [deliveryChargePaidByCustomer, setDeliveryChargePaidByCustomer] = useState(true);
  const [returnChargeAmount, setReturnChargeAmount] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize returnable items when dialog opens
  useEffect(() => {
    if (sale?.items) {
      const initial: Record<
        number,
        { selected: boolean; quantity: number; reason: string }
      > = {};

      sale.items.forEach((item) => {
        const alreadyReturned = Number(item.returned_quantity || 0);
        const returnable =
          item.returnable_quantity !== undefined
            ? Number(item.returnable_quantity)
            : Math.max(0, Number(item.quantity) - alreadyReturned);

        initial[item.id] = {
          selected: returnable > 0,
          quantity: returnable > 0 ? returnable : 0,
          reason: "",
        };
      });

      setSelectedItems(initial);
      setCustomRefundAmount("");
      setCustomReason("");
      setRefundMethod("cash");
      setDeliveryChargePaidByCustomer(true);
      setReturnChargeAmount("0");
      setReturnNotes("");
    }
  }, [sale, open]);

  // Calculate maximum returnable and price for each item
  const itemDetails = useMemo(() => {
    if (!sale?.items) return [];
    return sale.items.map((item) => {
      const alreadyReturned = Number(item.returned_quantity || 0);
      const totalQty = Number(item.quantity) || 1;
      const returnable =
        item.returnable_quantity !== undefined
          ? Number(item.returnable_quantity)
          : Math.max(0, totalQty - alreadyReturned);

      const unitPrice = Number(item.unit_price) || 0;
      const totalDiscount = Number(item.discount) || 0;
      const discountPerUnit = totalDiscount / totalQty;
      const effectiveUnitRefund = Math.max(0, unitPrice - discountPerUnit);

      return {
        ...item,
        alreadyReturned,
        returnable,
        effectiveUnitRefund,
      };
    });
  }, [sale]);

  // Calculate computed refund amount
  const computedRefundAmount = useMemo(() => {
    if (!sale?.items) return 0;
    if (returnType === "full") {
      // Full return sums all returnable quantities
      return itemDetails.reduce((acc, item) => {
        return acc + item.effectiveUnitRefund * item.returnable;
      }, 0);
    }

    // Partial return sums only selected items with chosen quantities
    return itemDetails.reduce((acc, item) => {
      const state = selectedItems[item.id];
      if (state?.selected && state.quantity > 0) {
        return acc + item.effectiveUnitRefund * state.quantity;
      }
      return acc;
    }, 0);
  }, [returnType, itemDetails, selectedItems, sale]);

  const finalRefundAmount =
    customRefundAmount.trim() !== ""
      ? Math.max(0, Number(customRefundAmount) || 0)
      : computedRefundAmount;

  const totalReturnableUnits = useMemo(() => {
    return itemDetails.reduce((sum, item) => sum + item.returnable, 0);
  }, [itemDetails]);

  const selectedUnitsCount = useMemo(() => {
    if (returnType === "full") return totalReturnableUnits;
    return itemDetails.reduce((sum, item) => {
      const state = selectedItems[item.id];
      return state?.selected ? sum + (state.quantity || 0) : sum;
    }, 0);
  }, [returnType, itemDetails, selectedItems, totalReturnableUnits]);

  const handleToggleItem = (itemId: number, checked: boolean) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] || {
        selected: false,
        quantity: 1,
        reason: "",
      };
      return {
        ...prev,
        [itemId]: {
          ...current,
          selected: checked,
          quantity:
            checked && current.quantity <= 0
              ? itemDetails.find((i) => i.id === itemId)?.returnable || 1
              : current.quantity,
        },
      };
    });
  };

  const handleQuantityChange = (itemId: number, qty: number) => {
    const item = itemDetails.find((i) => i.id === itemId);
    const max = item?.returnable || 1;
    const clamped = Math.max(1, Math.min(qty, max));

    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: clamped,
      },
    }));
  };

  const handleSubmitReturn = async () => {
    if (!sale) return;

    if (totalReturnableUnits <= 0) {
      toast({
        title: "Cannot Return",
        description: "All items in this sale have already been returned.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUnitsCount <= 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item and quantity to return.",
        variant: "destructive",
      });
      return;
    }

    // Build payload items
    const itemsPayload: {
      sale_item_id: number;
      quantity: number;
      reason: string;
    }[] = [];

    const finalReason =
      reasonCategory === "Other" && customReason.trim()
        ? customReason.trim()
        : reasonCategory;

    if (returnType === "full") {
      itemDetails.forEach((item) => {
        if (item.returnable > 0) {
          itemsPayload.push({
            sale_item_id: item.id,
            quantity: item.returnable,
            reason: finalReason,
          });
        }
      });
    } else {
      itemDetails.forEach((item) => {
        const state = selectedItems[item.id];
        if (state?.selected && state.quantity > 0) {
          itemsPayload.push({
            sale_item_id: item.id,
            quantity: Math.min(state.quantity, item.returnable),
            reason: state.reason.trim() || finalReason,
          });
        }
      });
    }

    if (itemsPayload.length === 0) {
      toast({
        title: "No items to return",
        description: "Please select valid items to return.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/sales/returns/", {
        sale_id: sale.id,
        reason: finalReason,
        refund_amount: finalRefundAmount,
        refund_method: refundMethod,
        delivery_charge_paid_by_customer: deliveryChargePaidByCustomer,
        return_charge_amount: Number(returnChargeAmount) || 0,
        notes: returnNotes.trim() || undefined,
        status: "completed",
        items: itemsPayload,
      });

      toast({
        title: "Return Processed Successfully",
        description: `Return for ${sale.invoice_number} processed. Stock has been restored to inventory.`,
      });

      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Error processing return:", err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Failed to process return. Please try again.";
      toast({
        title: "Return Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Process Sale Return
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Invoice #{sale.invoice_number} &bull; Customer:{" "}
                {sale.customer
                  ? `${sale.customer.first_name} ${sale.customer.last_name}`
                  : sale.customer_phone || "Guest"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Stock Restoration Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed">
              <span className="font-semibold">Automatic Stock Restock:</span>{" "}
              Returned items will be automatically credited back to their
              corresponding product variations and total stock, and an incoming{" "}
              <span className="font-semibold">StockMovement</span> record will
              be created.
            </div>
          </div>

          {/* Return Type Selector */}
          <Tabs
            value={returnType}
            onValueChange={(val) => setReturnType(val as "full" | "partial")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="partial" className="font-medium">
                Partial Return (Select Items)
              </TabsTrigger>
              <TabsTrigger value="full" className="font-medium">
                Full Return (All {totalReturnableUnits} Items)
              </TabsTrigger>
            </TabsList>

            {/* Partial Return Tab */}
            <TabsContent value="partial" className="space-y-4 pt-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select items and quantities to return:
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {itemDetails.map((item) => {
                  const state = selectedItems[item.id] || {
                    selected: false,
                    quantity: 1,
                    reason: "",
                  };
                  const isAvailable = item.returnable > 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !isAvailable
                          ? "bg-slate-50/60 border-slate-200 opacity-60"
                          : state.selected
                          ? "bg-amber-50/40 border-amber-300 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={state.selected}
                            disabled={!isAvailable}
                            onCheckedChange={(checked) =>
                              handleToggleItem(item.id, Boolean(checked))
                            }
                            className="mt-1"
                          />
                          <div>
                            <label
                              htmlFor={`item-${item.id}`}
                              className="font-semibold text-slate-900 text-sm cursor-pointer block"
                            >
                              {item.product?.name || "Product"}
                            </label>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500">
                              {item.size && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                                  Color: {item.color}
                                </span>
                              )}
                              <span>Sold: {item.quantity}</span>
                              {item.alreadyReturned > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-red-50 text-red-700 border-red-200"
                                >
                                  {item.alreadyReturned} returned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity selector & refund per unit */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {isAvailable ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Return Qty:
                              </span>
                              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  disabled={!state.selected || state.quantity <= 1}
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      state.quantity - 1
                                    )
                                  }
                                  className="px-2 py-1 hover:bg-slate-100 text-slate-600 disabled:opacity-40 text-xs font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.returnable}
                                  value={state.quantity}
                                  disabled={!state.selected}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-10 text-center text-xs font-semibold py-1 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    !state.selected ||
                                    state.quantity >= item.returnable
                                  }
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      state.quantity + 1
                                    )
                                  }
                                  className="px-2 py-1 hover:bg-slate-100 text-slate-600 disabled:opacity-40 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              Fully returned
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-600">
                            Refund: ৳
                            {(
                              item.effectiveUnitRefund *
                              (state.selected ? state.quantity : 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Full Return Tab */}
            <TabsContent value="full" className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Full Order Return</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  This will mark all remaining {totalReturnableUnits} returnable
                  items as returned, restore all items to inventory stock, and
                  set the sale status to <span className="font-semibold">Refunded</span>.
                </p>
                <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center text-sm font-semibold text-amber-900">
                  <span>Full Refund Amount:</span>
                  <span>৳{computedRefundAmount.toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Reason Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="reason-cat" className="text-xs font-semibold text-slate-700">
                  Return Reason
                </Label>
                <Select
                  value={reasonCategory}
                  onValueChange={setReasonCategory}
                >
                  <SelectTrigger id="reason-cat" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="refund-amount" className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Refund Amount (৳)</span>
                  {customRefundAmount !== "" && (
                    <button
                      type="button"
                      onClick={() => setCustomRefundAmount("")}
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      Reset to auto
                    </button>
                  )}
                </Label>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={customRefundAmount !== "" ? customRefundAmount : computedRefundAmount.toFixed(2)}
                  onChange={(e) => setCustomRefundAmount(e.target.value)}
                  className="mt-1 font-semibold"
                  placeholder={computedRefundAmount.toFixed(2)}
                />
              </div>
            </div>

            {reasonCategory === "Other" && (
              <div>
                <Label htmlFor="custom-reason" className="text-xs font-semibold text-slate-700">
                  Custom Notes / Reason Details
                </Label>
                <Textarea
                  id="custom-reason"
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain reason for return..."
                  className="mt-1 text-xs"
                />
              </div>
            )}

            {/* Refund Method & Delivery Charge Accounting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <Label htmlFor="refund-method" className="text-xs font-semibold text-slate-700">
                  Refund Method
                </Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger id="refund-method" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="return-charge-paid" className="text-xs font-semibold text-slate-700">
                  Return Delivery Charge Accounting
                </Label>
                <Select
                  value={deliveryChargePaidByCustomer ? "customer" : "store"}
                  onValueChange={(val) => setDeliveryChargePaidByCustomer(val === "customer")}
                >
                  <SelectTrigger id="return-charge-paid" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer Paid Fee</SelectItem>
                    <SelectItem value="store">Store Bears Fee (Log Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!deliveryChargePaidByCustomer && (
              <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="return-charge-amount" className="text-xs font-semibold text-red-900">
                    Courier Return Charge Amount (৳)
                  </Label>
                  <span className="text-[11px] text-red-700 font-medium">Auto-recorded as Courier Return Expense</span>
                </div>
                <Input
                  id="return-charge-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={returnChargeAmount}
                  onChange={(e) => setReturnChargeAmount(e.target.value)}
                  className="bg-white border-red-200 text-red-900 font-semibold"
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <Label htmlFor="return-notes" className="text-xs font-semibold text-slate-700">
                Return Notes / Remarks
              </Label>
              <Textarea
                id="return-notes"
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Additional details for records..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Return Summary */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Total Items Returning</div>
              <div className="text-xl font-bold">{selectedUnitsCount} Units</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Net Refund Payable</div>
              <div className="text-2xl font-black text-amber-400">
                ৳{finalRefundAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitReturn}
            disabled={isSubmitting || selectedUnitsCount <= 0}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Restock...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Return & Restock</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

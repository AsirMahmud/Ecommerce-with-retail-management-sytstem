"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Plus,
  Eye,
  Printer,
  PackageCheck,
  AlertCircle,
  Truck,
  Store,
  ArrowRight,
  Loader2,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DataExportButton } from "@/components/data-export-button";
import { onlinePreorderApi } from "@/lib/api/onlinePreorder";

// Normalized Return Item structure
export interface NormalizedReturnItem {
  id: number | string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  reason?: string;
}

// Normalized Return Record (combining Store Sales returns and Online Preorder returns)
export interface NormalizedReturn {
  id: string; // Return # or Preorder Return ID
  rawId: number | string;
  source: "store_sale" | "online_preorder";
  sourceLabel: string;
  date: string;
  referenceNumber: string; // Invoice number or Courier Consignment ID / Tracking code
  orderId?: number | string;
  customerName: string;
  customerPhone: string;
  items: NormalizedReturnItem[];
  totalQuantity: number;
  refundAmount: number;
  refundMethod: string;
  deliveryChargePaidByCustomer: boolean;
  returnChargeAmount: number;
  hasExpense: boolean;
  courierPartner?: string;
  courierConsignmentId?: string;
  courierTrackingCode?: string;
  status: "Completed" | "Processing" | "Rejected";
  rawStatus: string;
  isStockRestored: boolean;
  reason: string;
  notes?: string;
  originalRecord: any;
}

const COMMON_REASONS = [
  "Wrong Size / Fit Issue",
  "Defective / Damaged Item",
  "Customer Changed Mind",
  "Color / Style Mismatch",
  "Exchange Requested",
  "Other",
];

export default function SalesReturnsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & Search
  const [sourceFilter, setSourceFilter] = useState<"all" | "store" | "preorder">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet / Modal View
  const [selectedReturn, setSelectedReturn] = useState<NormalizedReturn | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Process Return Dialog State
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [processSource, setProcessSource] = useState<"store" | "preorder">("store");

  // Store Return Form States
  const [saleSearchQuery, setSaleSearchQuery] = useState("");
  const [isSearchingSales, setIsSearchingSales] = useState(false);
  const [salesSearchResults, setSalesSearchResults] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<
    Record<number, { selected: boolean; quantity: number; reason: string }>
  >({});
  const [storeRefundMethod, setStoreRefundMethod] = useState("cash");
  const [storeDeliveryPaidByCustomer, setStoreDeliveryPaidByCustomer] = useState(true);
  const [storeReturnChargeAmount, setStoreReturnChargeAmount] = useState("0");
  const [storeCustomRefundAmount, setStoreCustomRefundAmount] = useState("");
  const [storeReasonCategory, setStoreReasonCategory] = useState(COMMON_REASONS[0]);
  const [storeCustomReason, setStoreCustomReason] = useState("");
  const [storeNotes, setStoreNotes] = useState("");
  const [isSubmittingStoreReturn, setIsSubmittingStoreReturn] = useState(false);

  // Preorder Return Form States
  const [preorderSearchQuery, setPreorderSearchQuery] = useState("");
  const [isSearchingPreorders, setIsSearchingPreorders] = useState(false);
  const [preorderSearchResults, setPreorderSearchResults] = useState<any[]>([]);
  const [selectedPreorder, setSelectedPreorder] = useState<any | null>(null);
  const [preorderDeliveryPaidByCustomer, setPreorderDeliveryPaidByCustomer] = useState(true);
  const [preorderReturnChargeAmount, setPreorderReturnChargeAmount] = useState("0");
  const [preorderReason, setPreorderReason] = useState("Customer refused delivery / RTO");
  const [isSubmittingPreorderReturn, setIsSubmittingPreorderReturn] = useState(false);

  // 1. Fetch Store Sales Returns from backend API
  const {
    data: rawSalesReturns = [],
    isLoading: isLoadingSalesReturns,
    refetch: refetchSalesReturns,
  } = useQuery({
    queryKey: ["returns", "sales"],
    queryFn: async () => {
      const res = await api.get("/sales/returns/", { params: { page_size: 250 } });
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    },
  });

  // 2. Fetch Online Preorder Returns from backend API
  const {
    data: rawPreorderReturns = [],
    isLoading: isLoadingPreorders,
    refetch: refetchPreorders,
  } = useQuery({
    queryKey: ["returns", "preorders"],
    queryFn: async () => {
      const res = await api.get("/online-preorder/orders/", {
        params: { status: "RETURNED", page_size: 250 },
      });
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    },
  });

  // Unify and normalize records
  const normalizedReturns: NormalizedReturn[] = useMemo(() => {
    const list: NormalizedReturn[] = [];

    // Normalize Store Sales Returns
    (rawSalesReturns || []).forEach((item: any) => {
      const saleDetails = item.sale_details || {};
      const customerName =
        saleDetails.customer_name ||
        (item.sale?.customer
          ? `${item.sale.customer.first_name || ""} ${item.sale.customer.last_name || ""}`.trim()
          : "Walk-in Customer");
      const customerPhone =
        saleDetails.customer_phone || item.sale?.customer?.phone || "";
      const invoiceNo =
        saleDetails.invoice_number ||
        item.sale?.invoice_number ||
        (item.sale ? `Sale #${item.sale}` : "N/A");

      const items: NormalizedReturnItem[] = (item.items || []).map((it: any) => {
        const pName =
          it.product_name ||
          it.sale_item?.product?.name ||
          it.sale_item?.product_name ||
          "Returned Product";
        const sku = it.sku || it.sale_item?.product?.sku || it.sale_item?.sku || "";
        const size = it.size || it.sale_item?.size || "";
        const color = it.color || it.sale_item?.color || "";
        const unitPrice = Number(it.unit_price || it.sale_item?.unit_price || 0);
        const qty = Number(it.quantity || 1);
        return {
          id: it.id,
          product_name: pName,
          sku,
          size,
          color,
          quantity: qty,
          unit_price: unitPrice,
          refund_amount: unitPrice * qty,
          reason: it.reason || item.reason,
        };
      });

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const deliveryPaid = item.delivery_charge_paid_by_customer ?? true;
      const returnCharge = Number(item.return_charge_amount || 0);

      const statusMap: Record<string, "Completed" | "Processing" | "Rejected"> = {
        completed: "Completed",
        approved: "Completed",
        pending: "Processing",
        rejected: "Rejected",
      };

      list.push({
        id: item.return_number || `RET-${item.id}`,
        rawId: item.id,
        source: "store_sale",
        sourceLabel: "Store Sale",
        date: item.processed_date || item.created_at || new Date().toISOString(),
        referenceNumber: invoiceNo,
        orderId: item.sale,
        customerName,
        customerPhone,
        items,
        totalQuantity: totalQty,
        refundAmount: Number(item.refund_amount || 0),
        refundMethod: item.refund_method || "cash",
        deliveryChargePaidByCustomer: deliveryPaid,
        returnChargeAmount: returnCharge,
        hasExpense: !deliveryPaid && returnCharge > 0,
        status: statusMap[item.status?.toLowerCase()] || "Completed",
        rawStatus: item.status,
        isStockRestored: item.status === "completed" || item.status === "approved",
        reason: item.reason || "Customer return",
        notes: item.notes,
        originalRecord: item,
      });
    });

    // Normalize Online Preorder Returns
    (rawPreorderReturns || []).forEach((item: any) => {
      const items: NormalizedReturnItem[] = (item.items || []).map(
        (it: any, idx: number) => {
          const pName = it.product_name || it.name || "Preorder Product";
          const sku = it.sku || "";
          const size = it.size || "";
          const color = it.color || "";
          const unitPrice = Number(it.unit_price || 0);
          const qty = Number(it.quantity || 1);
          return {
            id: it.product_id || idx,
            product_name: pName,
            sku,
            size,
            color,
            quantity: qty,
            unit_price: unitPrice,
            refund_amount: unitPrice * qty,
            reason: item.return_reason,
          };
        }
      );

      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const deliveryPaid = item.return_delivery_charge_paid_by_customer ?? true;
      const returnCharge = Number(item.return_charge_amount || 0);

      list.push({
        id: `PRE-RET-${item.id}`,
        rawId: item.id,
        source: "online_preorder",
        sourceLabel: "Online Preorder",
        date: item.returned_at || item.updated_at || item.created_at || new Date().toISOString(),
        referenceNumber: item.courier_consignment_id || item.courier_tracking_code || `ORD-${item.id}`,
        orderId: item.id,
        customerName: item.customer_name || "Online Customer",
        customerPhone: item.customer_phone || "",
        courierPartner: item.courier_partner,
        courierConsignmentId: item.courier_consignment_id,
        courierTrackingCode: item.courier_tracking_code,
        items,
        totalQuantity: totalQty,
        refundAmount: Number(item.total_amount || 0),
        refundMethod: "Courier / Store Balance",
        deliveryChargePaidByCustomer: deliveryPaid,
        returnChargeAmount: returnCharge,
        hasExpense: !deliveryPaid && returnCharge > 0,
        status: "Completed",
        rawStatus: item.status,
        isStockRestored: Boolean(item.is_stock_restored),
        reason: item.return_reason || "Online Order Return / Undelivered",
        notes: item.notes || item.hold_reason,
        originalRecord: item,
      });
    });

    // Sort newest first
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [rawSalesReturns, rawPreorderReturns]);

  // Filtered List
  const filteredReturns = useMemo(() => {
    return normalizedReturns.filter((r) => {
      // Source filter
      if (sourceFilter === "store" && r.source !== "store_sale") return false;
      if (sourceFilter === "preorder" && r.source !== "online_preorder") return false;

      // Status filter
      if (statusFilter !== "all" && r.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Live search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesRef = r.referenceNumber.toLowerCase().includes(q);
        const matchesCustomer =
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q);
        const matchesProduct = r.items.some(
          (i) =>
            i.product_name.toLowerCase().includes(q) ||
            i.sku.toLowerCase().includes(q)
        );
        if (!matchesId && !matchesRef && !matchesCustomer && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedReturns, sourceFilter, statusFilter, searchQuery]);

  // Aggregate Metrics Calculations
  const metrics = useMemo(() => {
    const totalCount = normalizedReturns.length;
    const storeCount = normalizedReturns.filter((r) => r.source === "store_sale").length;
    const preorderCount = normalizedReturns.filter((r) => r.source === "online_preorder").length;

    const totalRefundAmount = normalizedReturns.reduce((acc, curr) => acc + curr.refundAmount, 0);
    const storeRefundAmount = normalizedReturns
      .filter((r) => r.source === "store_sale")
      .reduce((acc, curr) => acc + curr.refundAmount, 0);

    const courierReturnExpenses = normalizedReturns
      .filter((r) => !r.deliveryChargePaidByCustomer && r.returnChargeAmount > 0)
      .reduce((acc, curr) => acc + curr.returnChargeAmount, 0);

    const courierReturnExpenseCount = normalizedReturns.filter(
      (r) => !r.deliveryChargePaidByCustomer && r.returnChargeAmount > 0
    ).length;

    const totalRestockedUnits = normalizedReturns
      .filter((r) => r.isStockRestored)
      .reduce((acc, curr) => acc + curr.totalQuantity, 0);

    return {
      totalCount,
      storeCount,
      preorderCount,
      totalRefundAmount,
      storeRefundAmount,
      courierReturnExpenses,
      courierReturnExpenseCount,
      totalRestockedUnits,
    };
  }, [normalizedReturns]);

  // Live Sale Search for Store Return Dialog
  useEffect(() => {
    if (!saleSearchQuery.trim() || saleSearchQuery.trim().length < 2) {
      setSalesSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingSales(true);
        const res = await api.get("/sales/sales/", {
          params: { search: saleSearchQuery.trim(), page_size: 10 },
        });
        const data = res.data;
        const results = Array.isArray(data) ? data : data?.results || [];
        setSalesSearchResults(results);
      } catch (err) {
        console.error("Failed to search sales:", err);
      } finally {
        setIsSearchingSales(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [saleSearchQuery]);

  // When a sale is selected in the store return dialog, initialize its returnable items
  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
    const initialItems: Record<
      number,
      { selected: boolean; quantity: number; reason: string }
    > = {};

    (sale.items || []).forEach((item: any) => {
      const alreadyReturned = Number(item.returned_quantity || 0);
      const returnable =
        item.returnable_quantity !== undefined
          ? Number(item.returnable_quantity)
          : Math.max(0, Number(item.quantity) - alreadyReturned);

      initialItems[item.id] = {
        selected: returnable > 0,
        quantity: returnable > 0 ? returnable : 0,
        reason: "",
      };
    });

    setSelectedSaleItems(initialItems);
    setStoreCustomRefundAmount("");
    setStoreCustomReason("");
    setStoreRefundMethod(sale.payment_method || "cash");
    setStoreDeliveryPaidByCustomer(true);
    setStoreReturnChargeAmount("0");
    setStoreNotes("");
  };

  // Live Preorder Search for Preorder Return Dialog
  useEffect(() => {
    if (!preorderSearchQuery.trim() || preorderSearchQuery.trim().length < 2) {
      setPreorderSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPreorders(true);
        const res = await api.get("/online-preorder/orders/", {
          params: { search: preorderSearchQuery.trim(), page_size: 10 },
        });
        const data = res.data;
        const results = (Array.isArray(data) ? data : data?.results || []).filter(
          (o: any) => o.status !== "RETURNED"
        );
        setPreorderSearchResults(results);
      } catch (err) {
        console.error("Failed to search preorders:", err);
      } finally {
        setIsSearchingPreorders(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [preorderSearchQuery]);

  const handleSelectPreorder = (order: any) => {
    setSelectedPreorder(order);
    setPreorderReturnChargeAmount(String(order.delivery_charge || "120"));
    setPreorderDeliveryPaidByCustomer(true);
    setPreorderReason("Customer refused delivery / RTO");
  };

  // Computed refund for selected sale items
  const storeComputedRefund = useMemo(() => {
    if (!selectedSale?.items) return 0;
    return selectedSale.items.reduce((acc: number, item: any) => {
      const state = selectedSaleItems[item.id];
      if (state?.selected && state.quantity > 0) {
        const unitPrice = Number(item.unit_price) || 0;
        const totalDiscount = Number(item.discount) || 0;
        const totalQty = Number(item.quantity) || 1;
        const discountPerUnit = totalDiscount / totalQty;
        const effectivePrice = Math.max(0, unitPrice - discountPerUnit);
        return acc + effectivePrice * state.quantity;
      }
      return acc;
    }, 0);
  }, [selectedSale, selectedSaleItems]);

  const storeFinalRefundAmount =
    storeCustomRefundAmount.trim() !== ""
      ? Math.max(0, Number(storeCustomRefundAmount) || 0)
      : storeComputedRefund;

  const storeSelectedUnitsCount = useMemo(() => {
    if (!selectedSale?.items) return 0;
    return Object.values(selectedSaleItems).reduce(
      (sum, s) => (s.selected ? sum + (s.quantity || 0) : sum),
      0
    );
  }, [selectedSale, selectedSaleItems]);

  // Submit Store Sale Return
  const handleSubmitStoreReturn = async () => {
    if (!selectedSale) return;

    if (storeSelectedUnitsCount <= 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item with a quantity to return.",
        variant: "destructive",
      });
      return;
    }

    const finalReason =
      storeReasonCategory === "Other" && storeCustomReason.trim()
        ? storeCustomReason.trim()
        : storeReasonCategory;

    const itemsPayload: { sale_item_id: number; quantity: number; reason: string }[] = [];
    selectedSale.items.forEach((item: any) => {
      const state = selectedSaleItems[item.id];
      if (state?.selected && state.quantity > 0) {
        itemsPayload.push({
          sale_item_id: item.id,
          quantity: state.quantity,
          reason: state.reason.trim() || finalReason,
        });
      }
    });

    try {
      setIsSubmittingStoreReturn(true);
      await api.post("/sales/returns/", {
        sale_id: selectedSale.id,
        reason: finalReason,
        refund_amount: storeFinalRefundAmount,
        refund_method: storeRefundMethod,
        delivery_charge_paid_by_customer: storeDeliveryPaidByCustomer,
        return_charge_amount: Number(storeReturnChargeAmount) || 0,
        notes: storeNotes.trim() || undefined,
        status: "completed",
        items: itemsPayload,
      });

      toast({
        title: "Store Return Processed",
        description: `Return for Invoice ${selectedSale.invoice_number} processed and stock restored to inventory.`,
      });

      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });

      setIsProcessOpen(false);
      setSelectedSale(null);
      setSaleSearchQuery("");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Process Return Failed",
        description: err.response?.data?.error || err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingStoreReturn(false);
    }
  };

  // Submit Online Preorder Return
  const handleSubmitPreorderReturn = async () => {
    if (!selectedPreorder) return;

    try {
      setIsSubmittingPreorderReturn(true);
      await onlinePreorderApi.processReturn(selectedPreorder.id, {
        return_delivery_charge_paid_by_customer: preorderDeliveryPaidByCustomer,
        return_charge_amount: Number(preorderReturnChargeAmount) || 0,
        return_reason: preorderReason.trim(),
      });

      toast({
        title: "Preorder Return Processed",
        description: `Preorder #${selectedPreorder.id} marked as RETURNED and stock restocked to inventory.`,
      });

      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["preorders"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });

      setIsProcessOpen(false);
      setSelectedPreorder(null);
      setPreorderSearchQuery("");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Preorder Return Failed",
        description:
          err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to process return.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPreorderReturn(false);
    }
  };

  // Print Formatted Return Voucher
  const printReturnSlip = (item: NormalizedReturn) => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) {
      alert("Please allow popups to generate and print vouchers.");
      return;
    }

    const formattedDate = new Date(item.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsRows = item.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a;">${it.product_name}</div>
            <div style="font-size: 11px; color: #64748b;">
              ${[it.sku ? `SKU: ${it.sku}` : null, it.size ? `Size: ${it.size}` : null, it.color ? `Color: ${it.color}` : null]
                .filter(Boolean)
                .join(" • ")}
            </div>
            ${it.reason ? `<div style="font-size: 10px; color: #f59e0b; margin-top: 2px;">Reason: ${it.reason}</div>` : ""}
          </td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
            ${it.quantity}
          </td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
            ৳${it.unit_price.toFixed(2)}
          </td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
            ৳${(it.unit_price * it.quantity).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Voucher - ${item.id}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 30px;
              color: #1e293b;
              max-width: 680px;
              margin: 0 auto;
              background: #fff;
            }
            .header {
              border-bottom: 3px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .brand {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.5px;
              color: #0f172a;
            }
            .brand-sub {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .voucher-badge {
              text-align: right;
            }
            .v-title {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              color: #0f172a;
            }
            .v-id {
              font-size: 18px;
              font-weight: 900;
              color: #2563eb;
              font-family: monospace;
            }
            .v-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .info-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
            }
            .info-title {
              font-weight: 700;
              color: #475569;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
            }
            .info-row {
              margin-bottom: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 12px;
            }
            th {
              background: #f1f5f9;
              padding: 10px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
            }
            .summary-box {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 15px;
              background: #fafafa;
              margin-bottom: 30px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 6px;
            }
            .summary-row.total {
              border-top: 2px solid #0f172a;
              padding-top: 8px;
              margin-top: 8px;
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .restock-tag {
              display: inline-block;
              background: #ecfdf5;
              color: #065f46;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 20px;
            }
            .sig-box {
              text-align: center;
              font-size: 11px;
              color: #475569;
            }
            .sig-line {
              width: 180px;
              border-bottom: 1px solid #94a3b8;
              margin-bottom: 6px;
            }
            @media print {
              body { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">RAW STITCH</div>
              <div class="brand-sub">Retail & Online Apparel Co.</div>
            </div>
            <div class="voucher-badge">
              <div class="v-title">Return & Refund Voucher</div>
              <div class="v-id">${item.id}</div>
              <div class="v-date">Issued: ${formattedDate}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Customer & Order Details</div>
              <div class="info-row"><b>Customer:</b> ${item.customerName}</div>
              <div class="info-row"><b>Phone:</b> ${item.customerPhone || "N/A"}</div>
              <div class="info-row"><b>Source:</b> ${item.sourceLabel}</div>
              <div class="info-row"><b>Reference:</b> ${item.referenceNumber}</div>
            </div>

            <div class="info-box">
              <div class="info-title">Return Accounting</div>
              <div class="info-row"><b>Reason:</b> ${item.reason}</div>
              <div class="info-row"><b>Refund Method:</b> ${item.refundMethod.toUpperCase()}</div>
              <div class="info-row"><b>Restock Status:</b> <span class="restock-tag">Stock Restored (Inward)</span></div>
              <div class="info-row"><b>Return Delivery Fee:</b> ${
                item.deliveryChargePaidByCustomer
                  ? "Customer Paid"
                  : `Store Borne (৳${item.returnChargeAmount.toFixed(2)} Expense)`
              }</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Returned Item Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Total Units Returned:</span>
              <span style="font-weight: 700;">${item.totalQuantity} Units</span>
            </div>
            ${
              !item.deliveryChargePaidByCustomer && item.returnChargeAmount > 0
                ? `
              <div class="summary-row" style="color: #dc2626;">
                <span>Courier Return Charge (Store Expense):</span>
                <span>- ৳${item.returnChargeAmount.toFixed(2)}</span>
              </div>
            `
                : ""
            }
            <div class="summary-row total">
              <span>Net Customer Refund Paid:</span>
              <span>৳${item.refundAmount.toFixed(2)}</span>
            </div>
          </div>

          ${
            item.notes
              ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 20px;"><b>Notes:</b> ${item.notes}</div>`
              : ""
          }

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div>Customer Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div>Store Manager / Authorized Sign</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isAnyLoading = isLoadingSalesReturns || isLoadingPreorders;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Returns & Refunds
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified management for Store Sales returns and Online Preorder courier returns with automated inventory restocking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSalesReturns();
              refetchPreorders();
            }}
            disabled={isAnyLoading}
            className="rounded-xl gap-2 font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isAnyLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Sync</span>
          </Button>

          <DataExportButton
            title="Rawstitch Returns & Refunds"
            filename="returns-refunds-report"
            headers={[
              "Return ID",
              "Source",
              "Date",
              "Reference Number",
              "Customer Name",
              "Customer Phone",
              "Total Qty",
              "Refund Amount (৳)",
              "Refund Method",
              "Delivery Charge Borne By Store",
              "Courier Return Fee (৳)",
              "Stock Restored",
              "Reason",
            ]}
            getData={() =>
              filteredReturns.map((r) => [
                r.id,
                r.sourceLabel,
                new Date(r.date).toLocaleDateString(),
                r.referenceNumber,
                r.customerName,
                r.customerPhone,
                r.totalQuantity,
                r.refundAmount,
                r.refundMethod,
                !r.deliveryChargePaidByCustomer ? "Yes" : "No",
                r.returnChargeAmount,
                r.isStockRestored ? "Yes" : "No",
                r.reason,
              ])
            }
          />

          <Button
            onClick={() => setIsProcessOpen(true)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Process Return</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Returns
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{metrics.totalCount}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              <span className="text-indigo-600 font-semibold">{metrics.storeCount} Store</span> •{" "}
              <span className="text-sky-600 font-semibold">{metrics.preorderCount} Preorders</span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Refunds
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              ৳{metrics.totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              ৳{metrics.storeRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })} in-store customer refunds
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Courier Return Expenses
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">
              ৳{metrics.courierReturnExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {metrics.courierReturnExpenseCount} store-borne return fees logged
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Restocked Inventory
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{metrics.totalRestockedUnits} Units</div>
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> StockMovement Inward Confirmed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between pt-2">
        {/* Source Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setSourceFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sourceFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Returns ({normalizedReturns.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("store")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              sourceFilter === "store"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store Sales ({metrics.storeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("preorder")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              sourceFilter === "preorder"
                ? "bg-white text-sky-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Online Preorders ({metrics.preorderCount})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search invoice, customer, item, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 rounded-xl text-xs bg-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-xl text-xs bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Returns Table */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Return Ticket</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Source</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Reference / Order</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Customer</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Restocked Items</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Financials</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAnyLoading && normalizedReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <p className="text-xs font-semibold">Loading returns and preorder records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No returns found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? "Try modifying your search or filter criteria."
                          : "Process your first return ticket using the '+ Process Return' button."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((r) => (
                  <TableRow key={`${r.source}-${r.id}`} className="hover:bg-slate-50/70 transition-colors">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-indigo-600">{r.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(r.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>

                    <TableCell>
                      {r.source === "store_sale" ? (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/60 font-semibold gap-1 text-[11px] rounded-md hover:bg-indigo-100">
                          <Store className="w-3 h-3" />
                          <span>Store Sale</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-sky-50 text-sky-700 border-sky-200/60 font-semibold gap-1 text-[11px] rounded-md hover:bg-sky-100">
                          <Truck className="w-3 h-3" />
                          <span>Preorder</span>
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-slate-800 font-mono">
                        {r.referenceNumber}
                      </div>
                      {r.courierPartner && (
                        <div className="text-[10px] text-slate-500 uppercase font-medium">
                          {r.courierPartner}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{r.customerName}</div>
                      <div className="text-[11px] text-slate-400">{r.customerPhone || "—"}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[240px]">
                        {r.items.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="text-xs text-slate-700 truncate">
                            <span className="font-semibold">{it.quantity}x</span> {it.product_name}
                            {(it.size || it.color) && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({[it.size, it.color].filter(Boolean).join("/")})
                              </span>
                            )}
                          </div>
                        ))}
                        {r.items.length > 2 && (
                          <div className="text-[10px] text-indigo-600 font-semibold">
                            +{r.items.length - 2} more items ({r.totalQuantity} units total)
                          </div>
                        )}
                        {r.isStockRestored && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                            <PackageCheck className="w-3 h-3" /> Restocked
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">
                        ৳{r.refundAmount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {r.refundMethod}
                      </div>
                      {r.hasExpense && (
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                          Courier Exp: ৳{r.returnChargeAmount.toFixed(0)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {r.status === "Completed" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-semibold text-[11px] rounded-md">
                          Completed
                        </Badge>
                      ) : r.status === "Processing" ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200/60 font-semibold text-[11px] rounded-md">
                          Processing
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200/60 font-semibold text-[11px] rounded-md">
                          Rejected
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(r);
                            setIsDetailOpen(true);
                          }}
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printReturnSlip(r)}
                          className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          title="Print Return Voucher"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Return Details Sheet / Modal */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto p-6">
          {selectedReturn && (
            <div className="space-y-6">
              <SheetHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  {selectedReturn.source === "store_sale" ? (
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/60 font-semibold gap-1 text-xs">
                      <Store className="w-3.5 h-3.5" /> Store Sale Return
                    </Badge>
                  ) : (
                    <Badge className="bg-sky-50 text-sky-700 border-sky-200/60 font-semibold gap-1 text-xs">
                      <Truck className="w-3.5 h-3.5" /> Online Preorder Return
                    </Badge>
                  )}
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 font-semibold text-xs">
                    {selectedReturn.status}
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-black text-slate-900 mt-2">
                  Return Ticket: {selectedReturn.id}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Processed on{" "}
                  {new Date(selectedReturn.date).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </SheetDescription>
              </SheetHeader>

              {/* Customer & Reference Info */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Info
                  </div>
                  <div className="font-bold text-slate-900 mt-1">{selectedReturn.customerName}</div>
                  <div className="text-slate-500 mt-0.5">{selectedReturn.customerPhone || "N/A"}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Original Reference
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono">
                    {selectedReturn.referenceNumber}
                  </div>
                  {selectedReturn.courierPartner && (
                    <div className="text-slate-500 mt-0.5">
                      Courier: {selectedReturn.courierPartner}
                    </div>
                  )}
                </div>
              </div>

              {/* Restocked Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Restocked Items ({selectedReturn.totalQuantity} units)
                  </h3>
                  {selectedReturn.isStockRestored && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[10px] gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Restocked to Inventory
                    </Badge>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold">Product</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">Qty</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">Price</TableHead>
                        <TableHead className="text-[11px] font-bold text-right">Refund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-2.5">
                            <div className="font-semibold text-xs text-slate-900">
                              {it.product_name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {[it.sku ? `SKU: ${it.sku}` : null, it.size ? `Size: ${it.size}` : null, it.color ? `Color: ${it.color}` : null]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs py-2.5">
                            {it.quantity}
                          </TableCell>
                          <TableCell className="text-right text-xs py-2.5">
                            ৳{it.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs py-2.5 text-slate-900">
                            ৳{(it.unit_price * it.quantity).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial & Courier Accounting Breakdown */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Refund Method</span>
                  <span className="font-semibold text-white uppercase">{selectedReturn.refundMethod}</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Return Delivery Fee</span>
                  <span className="font-semibold text-white">
                    {selectedReturn.deliveryChargePaidByCustomer
                      ? "Paid by Customer"
                      : `Store Borne (৳${selectedReturn.returnChargeAmount.toFixed(2)})`}
                  </span>
                </div>

                {selectedReturn.hasExpense && (
                  <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800/80 text-red-200 text-[11px]">
                    ⚠️ Store bore courier fee of <b>৳{selectedReturn.returnChargeAmount.toFixed(2)}</b>. An automated Expense was created under category &quot;Courier Return Charges&quot;.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-amber-400">
                  <span>Total Refund Amount:</span>
                  <span className="text-lg">৳{selectedReturn.refundAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Return Reason & Notes */}
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Return Reason & Notes
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-700">
                  <p className="font-semibold">{selectedReturn.reason}</p>
                  {selectedReturn.notes && (
                    <p className="mt-1 text-slate-500 italic">&quot;{selectedReturn.notes}&quot;</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-xl text-xs font-semibold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => printReturnSlip(selectedReturn)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Voucher</span>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dynamic "Process Return" Dialog */}
      <Dialog open={isProcessOpen} onOpenChange={setIsProcessOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              <span>Process New Return</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select whether this return originates from an in-store POS sale or an online courier preorder.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switch Tabs */}
          <Tabs
            value={processSource}
            onValueChange={(val) => {
              setProcessSource(val as "store" | "preorder");
              setSelectedSale(null);
              setSelectedPreorder(null);
            }}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-4">
              <TabsTrigger
                value="store"
                className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 gap-1.5"
              >
                <Store className="w-4 h-4" />
                <span>Store POS Sale Return</span>
              </TabsTrigger>
              <TabsTrigger
                value="preorder"
                className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-sky-700 gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Online Preorder Return (RTO)</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Store POS Sale Return */}
            <TabsContent value="store" className="space-y-4">
              {!selectedSale ? (
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-700">
                    Find Sale by Invoice Number or Customer Phone
                  </Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="e.g. INV-2024-001 or 017..."
                      value={saleSearchQuery}
                      onChange={(e) => setSaleSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl text-xs bg-slate-50"
                    />
                    {isSearchingSales && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600" />
                    )}
                  </div>

                  {/* Results List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                    {salesSearchResults.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            {sale.invoice_number}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {sale.customer
                              ? `${sale.customer.first_name || ""} ${sale.customer.last_name || ""}`.trim() ||
                                "Walk-in"
                              : "Walk-in Customer"}{" "}
                            • {sale.customer?.phone || "No phone"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(sale.created_at).toLocaleDateString()} • {sale.items?.length || 0} items
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xs text-indigo-600">
                            ৳{Number(sale.total || 0).toFixed(2)}
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600">
                            Select <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {saleSearchQuery.length >= 2 && !isSearchingSales && salesSearchResults.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No sales matching &quot;{saleSearchQuery}&quot; found.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Sale Header */}
                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        Sale: {selectedSale.invoice_number}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Customer: {selectedSale.customer ? `${selectedSale.customer.first_name} ${selectedSale.customer.last_name}` : "Walk-in"} • Total: ৳{Number(selectedSale.total).toFixed(2)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSale(null)}
                      className="text-xs text-slate-600 hover:text-slate-900 h-7"
                    >
                      Change Sale
                    </Button>
                  </div>

                  {/* Items to return */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Select Items to Return</Label>
                    <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200/80 rounded-xl p-2 bg-slate-50/50">
                      {selectedSale.items?.map((item: any) => {
                        const alreadyRet = Number(item.returned_quantity || 0);
                        const returnable = Math.max(0, Number(item.quantity) - alreadyRet);
                        const state = selectedSaleItems[item.id] || { selected: false, quantity: 1, reason: "" };

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-lg border transition-all ${
                              state.selected
                                ? "bg-white border-indigo-300 shadow-xs"
                                : "bg-white/60 border-slate-200 opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={state.selected}
                                  disabled={returnable <= 0}
                                  onChange={(e) =>
                                    setSelectedSaleItems((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        selected: e.target.checked,
                                        quantity: e.target.checked ? (prev[item.id]?.quantity || returnable) : 0,
                                      },
                                    }))
                                  }
                                  className="mt-1 rounded text-indigo-600"
                                />
                                <div>
                                  <div className="font-semibold text-xs text-slate-900">
                                    {item.product?.name || item.product_name}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Size: {item.size || "N/A"} • Color: {item.color || "N/A"} • Unit: ৳{Number(item.unit_price).toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Returnable: <b>{returnable}</b> / {item.quantity} units
                                  </div>
                                </div>
                              </div>

                              {returnable > 0 && state.selected && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-500">Qty:</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={returnable}
                                    value={state.quantity}
                                    onChange={(e) =>
                                      setSelectedSaleItems((prev) => ({
                                        ...prev,
                                        [item.id]: {
                                          ...prev[item.id],
                                          quantity: Math.min(returnable, Math.max(1, parseInt(e.target.value) || 1)),
                                        },
                                      }))
                                    }
                                    className="w-14 h-7 text-xs font-bold text-center p-1"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial & Accounting Controls */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Refund Method</Label>
                      <Select value={storeRefundMethod} onValueChange={setStoreRefundMethod}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
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
                      <Label className="text-xs font-semibold text-slate-700">Delivery Fee Accounting</Label>
                      <Select
                        value={storeDeliveryPaidByCustomer ? "customer" : "store"}
                        onValueChange={(val) => setStoreDeliveryPaidByCustomer(val === "customer")}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer Paid Fee</SelectItem>
                          <SelectItem value="store">Store Bears Fee (Log Expense)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!storeDeliveryPaidByCustomer && (
                    <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-1.5">
                      <Label className="text-xs font-semibold text-red-900">
                        Courier Return Charge (৳) — Recorded as Expense
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={storeReturnChargeAmount}
                        onChange={(e) => setStoreReturnChargeAmount(e.target.value)}
                        className="bg-white text-xs text-red-900 font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Return Reason</Label>
                      <Select value={storeReasonCategory} onValueChange={setStoreReasonCategory}>
                        <SelectTrigger className="mt-1 h-8 text-xs">
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
                      <Label className="text-xs font-semibold text-slate-700">Refund Amount (৳)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          storeCustomRefundAmount !== ""
                            ? storeCustomRefundAmount
                            : storeComputedRefund.toFixed(2)
                        }
                        onChange={(e) => setStoreCustomRefundAmount(e.target.value)}
                        className="mt-1 h-8 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Internal Return Notes</Label>
                    <Textarea
                      rows={2}
                      value={storeNotes}
                      onChange={(e) => setStoreNotes(e.target.value)}
                      placeholder="Notes for records..."
                      className="mt-1 text-xs"
                    />
                  </div>

                  {/* Summary Footer */}
                  <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Selected Returning Units:</span>{" "}
                      <span className="font-bold">{storeSelectedUnitsCount} Units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 mr-1">Net Refund:</span>
                      <span className="font-bold text-amber-400 text-base">
                        ৳{storeFinalRefundAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <DialogFooter className="pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProcessOpen(false)}
                      disabled={isSubmittingStoreReturn}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitStoreReturn}
                      disabled={isSubmittingStoreReturn || storeSelectedUnitsCount <= 0}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold"
                    >
                      {isSubmittingStoreReturn ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Restocking &amp; Saving...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Process &amp; Restock Sale</span>
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Online Preorder Return */}
            <TabsContent value="preorder" className="space-y-4">
              {!selectedPreorder ? (
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-700">
                    Find Preorder by Order #, Customer Phone or Consignment ID
                  </Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="e.g. 1024, 017..., or consignment ID"
                      value={preorderSearchQuery}
                      onChange={(e) => setPreorderSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl text-xs bg-slate-50"
                    />
                    {isSearchingPreorders && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-sky-600" />
                    )}
                  </div>

                  {/* Results List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                    {preorderSearchResults.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleSelectPreorder(order)}
                        className="p-3 rounded-xl border border-slate-200/80 hover:border-sky-400 hover:bg-sky-50/40 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            Preorder #{order.id}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {order.customer_name} • {order.customer_phone}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Status: <b>{order.status}</b> • Courier: {order.courier_partner || "N/A"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-xs text-sky-600">
                            ৳{Number(order.total_amount || 0).toFixed(2)}
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-sky-600">
                            Select <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {preorderSearchQuery.length >= 2 &&
                      !isSearchingPreorders &&
                      preorderSearchResults.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400">
                          No active preorders matching &quot;{preorderSearchQuery}&quot; found.
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Preorder Header */}
                  <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        Preorder #{selectedPreorder.id}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {selectedPreorder.customer_name} • {selectedPreorder.customer_phone} • Courier: {selectedPreorder.courier_partner || "N/A"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPreorder(null)}
                      className="text-xs text-slate-600 hover:text-slate-900 h-7"
                    >
                      Change Order
                    </Button>
                  </div>

                  {/* Preorder Items Preview */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Items to be Restocked</Label>
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1.5 max-h-40 overflow-y-auto">
                      {(selectedPreorder.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800">
                            {it.quantity}x {it.product_name || it.name}
                          </span>
                          <span className="text-slate-500 font-mono">
                            {[it.size, it.color].filter(Boolean).join("/")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Courier Fee Accounting */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Return Courier Fee Accounting
                      </Label>
                      <Select
                        value={preorderDeliveryPaidByCustomer ? "customer" : "store"}
                        onValueChange={(val) => setPreorderDeliveryPaidByCustomer(val === "customer")}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer Paid Fee</SelectItem>
                          <SelectItem value="store">Store Bears Fee (Log Expense)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Return Charge (৳)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={preorderReturnChargeAmount}
                        onChange={(e) => setPreorderReturnChargeAmount(e.target.value)}
                        className="mt-1 h-8 text-xs font-bold"
                        placeholder="120"
                      />
                    </div>
                  </div>

                  {!preorderDeliveryPaidByCustomer && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                      ⚠️ An automated Expense will be created under category <b>Courier Return Charges</b> for ৳{preorderReturnChargeAmount || "0"}.
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Return Reason / RTO Note</Label>
                    <Input
                      value={preorderReason}
                      onChange={(e) => setPreorderReason(e.target.value)}
                      placeholder="e.g. Customer refused delivery, incomplete address..."
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProcessOpen(false)}
                      disabled={isSubmittingPreorderReturn}
                      className="rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitPreorderReturn}
                      disabled={isSubmittingPreorderReturn}
                      className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white gap-2 text-xs font-semibold"
                    >
                      {isSubmittingPreorderReturn ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Restocking Preorder Stock...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Confirm Return &amp; Restock</span>
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

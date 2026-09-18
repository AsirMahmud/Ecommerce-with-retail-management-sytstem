"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  ShoppingBag,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  BarChart3,
  MoreHorizontal,
  Clock,
  XCircle,
  Truck,
  Zap,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  PhoneCall,
  ArrowUpDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  onlinePreordersApi,
  type OnlinePreorder,
  type SteadfastFraudResult,
  COURIER_SPECIFIC_STATUSES,
  UNIFIED_DELIVERY_STATUSES,
} from "@/lib/api/onlinePreorder";
import { courierApi, type ActiveCourier, type CourierProvider, type CourierFraudResult } from "@/lib/api/courier";
import { OrderDetailsSheet } from "@/components/online-preorders/order-details-sheet";
import { OnlinePreorderVerificationModal } from "@/components/online-preorders/verification-modal";
import { ManualOrderForm } from "@/components/online-preorders/manual-order-form";
import { OnlineCustomersTab } from "@/components/online-preorders/online-customers-tab";
import { OnlinePreordersAnalyticsDeck } from "@/components/online-preorders/online-preorders-analytics-deck";
import { OrderProductThumbnail } from "@/components/online-preorders/order-product-thumbnail";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import {
  useOnlinePreorders,
  useOnlinePreorderMetrics,
  ONLINE_PREORDERS_QUERY_KEY,
} from "@/hooks/queries/use-online-preorders";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendAdminPurchaseCancelled } from "@/lib/gtm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function OnlinePreordersPage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();

  // Pagination, Filter & Sorting States
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [deliveryStatus, setDeliveryStatus] = useState<string>("all");
  const [ordering, setOrdering] = useState<string>("-created_at");
  const [showKpis, setShowKpis] = useState<boolean>(true);

  // Reset to page 1 whenever search query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleDeliveryStatusChange = (newDeliveryStatus: string) => {
    setDeliveryStatus(newDeliveryStatus);
    setPage(1);
  };

  const handleCourierFilterChange = (newCourier: string) => {
    setCourierFilter(newCourier);
    setDeliveryStatus("all");
    setPage(1);
  };

  const applyPreset = (orderSt: string, delivSt: string, courierSt?: string) => {
    setStatus(orderSt);
    setDeliveryStatus(delivSt);
    if (courierSt) {
      setCourierFilter(courierSt);
    }
    setPage(1);
  };

  const {
    orders: rows = [],
    totalCount,
    totalPages,
    isLoading: loading,
    isFetching,
    refetch: refetchOrders,
  } = useOnlinePreorders({
    page,
    pageSize,
    status,
    deliveryStatus,
    search: debouncedSearch,
    courierPartner: courierFilter,
    ordering,
  });

  const { data: metrics, isLoading: isMetricsLoading } = useOnlinePreorderMetrics();
  const [selectedOrder, setSelectedOrder] = useState<OnlinePreorder | null>(null);
  const [editingOrder, setEditingOrder] = useState<OnlinePreorder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OnlinePreorder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verificationOrder, setVerificationOrder] = useState<OnlinePreorder | null>(null);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  // Steadfast Multi-Select & Fast Actions State
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [isBulkDispatching, setIsBulkDispatching] = useState(false);

  // Multi-Delivery Agent States
  const [activeCouriers, setActiveCouriers] = useState<ActiveCourier[]>([]);
  const [selectedCourierProvider, setSelectedCourierProvider] = useState<string>("STEADFAST");
  const [fastSteadfastOrder, setFastSteadfastOrder] = useState<OnlinePreorder | null>(null);
  const [fastSteadfastDialogOpen, setFastSteadfastDialogOpen] = useState(false);
  const [steadfastCod, setSteadfastCod] = useState("");
  const [steadfastPhone, setSteadfastPhone] = useState("");
  const [steadfastAddress, setSteadfastAddress] = useState("");
  const [steadfastNote, setSteadfastNote] = useState("");
  const [isDispatchingFast, setIsDispatchingFast] = useState(false);

  const fetchActiveCouriers = async () => {
    try {
      const res = await courierApi.getActiveCouriers();
      setActiveCouriers(res.data);
      if (res.data.length > 0) {
        setSelectedCourierProvider((prev) => {
          if (res.data.some((c) => c.provider === prev)) return prev;
          const def = res.data.find((c) => c.is_default);
          return def ? def.provider : res.data[0].provider;
        });
      }
      return res.data;
    } catch (err) {
      console.error("Failed to load active delivery agents:", err);
      return [];
    }
  };

  useEffect(() => {
    void fetchActiveCouriers();
  }, []);

  // Multi-Courier Fraud Check Dialog State
  const [fraudCheckOrder, setFraudCheckOrder] = useState<OnlinePreorder | null>(null);
  const [fraudCheckDialogOpen, setFraudCheckDialogOpen] = useState(false);
  const [fraudData, setFraudData] = useState<CourierFraudResult | null>(null);
  const [selectedFraudProvider, setSelectedFraudProvider] = useState<string>("ALL");
  const [isFetchingFraud, setIsFetchingFraud] = useState(false);
  const [isSyncingCouriers, setIsSyncingCouriers] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);

  // Quick Cancel Order state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OnlinePreorder | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Fake Customer / Fake Order");
  const [isFakeCustomer, setIsFakeCustomer] = useState(true);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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

  const openFastDispatchDialog = async (o: OnlinePreorder, courierProvider?: string) => {
    setFastSteadfastOrder(o);
    setSteadfastCod(String(o.total_amount || 0));
    setSteadfastPhone(o.customer_phone || "");
    setSteadfastAddress(formatAddressString(o.shipping_address) || "Customer Address");
    setSteadfastNote(o.notes || `Online Preorder #${o.id}`);

    // Always fetch fresh active couriers when opening dialog
    const fresh = await fetchActiveCouriers();
    if (courierProvider) {
      setSelectedCourierProvider(courierProvider);
    } else if (fresh.length > 0 && !fresh.some((c) => c.provider === selectedCourierProvider)) {
      const def = fresh.find((c) => c.is_default);
      setSelectedCourierProvider(def ? def.provider : fresh[0].provider);
    }
    setFastSteadfastDialogOpen(true);
  };

  const openFastSteadfastDialog = (o: OnlinePreorder) => {
    void openFastDispatchDialog(o);
  };

  const handleConfirmFastDispatch = async () => {
    if (!fastSteadfastOrder) return;
    setIsDispatchingFast(true);
    try {
      const res = await courierApi.dispatchOrder(fastSteadfastOrder.id, {
        courier_partner: selectedCourierProvider,
        cod_amount: Number(steadfastCod) >= 0 ? Number(steadfastCod) : Number(fastSteadfastOrder.total_amount) || 0,
        phone: steadfastPhone,
        address: steadfastAddress,
        note: steadfastNote,
      });

      const matchedCourier = activeCouriers.find((c) => c.provider === selectedCourierProvider);
      const courierLabel = matchedCourier?.name || selectedCourierProvider;

      toast({
        title: `Dispatched to ${courierLabel}!`,
        description: `Consignment: ${res.data.consignment_id || "N/A"} | Tracking: ${res.data.tracking_code || "N/A"}`,
      });
      setFastSteadfastDialogOpen(false);
      setFastSteadfastOrder(null);
      void loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to dispatch to courier";
      toast({
        title: "Dispatch Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsDispatchingFast(false);
    }
  };

  const handleBulkDispatch = async (provider?: string) => {
    if (selectedOrderIds.length === 0) return;
    const targetProvider = provider || selectedCourierProvider || (activeCouriers[0]?.provider) || "STEADFAST";
    setIsBulkDispatching(true);
    try {
      const res = await courierApi.bulkDispatch(selectedOrderIds, targetProvider);
      const provName = activeCouriers.find(c => c.provider === targetProvider)?.name || targetProvider;
      toast({
        title: `Bulk Dispatch to ${provName} Completed`,
        description: `Dispatched ${res.data.dispatched_count} orders successfully.${res.data.failed_count > 0 ? ` Failed: ${res.data.failed_count}` : ''}`,
      });
      setSelectedOrderIds([]);
      void loadData();
    } catch (err: any) {
      toast({
        title: "Bulk Dispatch Failed",
        description: err?.response?.data?.detail || "Failed to dispatch orders to courier",
        variant: "destructive",
      });
    } finally {
      setIsBulkDispatching(false);
    }
  };

  const handleSyncAllCouriers = async () => {
    setIsSyncingCouriers(true);
    try {
      const res = await courierApi.syncCourierStatuses();
      toast({
        title: "Courier Statuses Synced",
        description: `Refreshed ${res.data.synced_count} parcel(s) successfully.${res.data.failed_count > 0 ? ` (${res.data.failed_count} skipped)` : ""}`,
      });
      await queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err?.response?.data?.message || err?.response?.data?.detail || "Failed to sync courier statuses",
        variant: "destructive",
      });
    } finally {
      setIsSyncingCouriers(false);
    }
  };

  const handleSyncSingleCourier = async (orderId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSyncingOrderId(orderId);
    try {
      const res = await courierApi.getOrderStatus(orderId);
      toast({
        title: "Status Refreshed",
        description: `Order #${orderId} courier status: ${res.data.status || "Updated"}`,
      });
      await queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
    } catch (err: any) {
      toast({
        title: "Status Refresh Failed",
        description: err?.response?.data?.message || err?.response?.data?.detail || "Failed to fetch courier status",
        variant: "destructive",
      });
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleOpenFraudCheck = async (o: OnlinePreorder, providerOverride?: string) => {
    setFraudCheckOrder(o);
    setFraudCheckDialogOpen(true);
    setIsFetchingFraud(true);
    setFraudData(null);

    // Default to the order's respective courier partner, or the first active courier, or ALL
    const initialProvider = providerOverride || o.courier_partner || (activeCouriers.length > 0 ? activeCouriers[0].provider : "ALL");
    setSelectedFraudProvider(initialProvider);

    try {
      const res = await courierApi.checkCourierFraud({ orderId: o.id, provider: initialProvider });
      setFraudData(res.data);
    } catch (err: any) {
      toast({
        title: "Fraud Check Failed",
        description: err?.response?.data?.message || "Could not retrieve delivery history",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFraud(false);
    }
  };

  const handleChangeFraudProvider = async (provider: string) => {
    if (!fraudCheckOrder) return;
    setSelectedFraudProvider(provider);
    setIsFetchingFraud(true);
    try {
      const res = await courierApi.checkCourierFraud({ orderId: fraudCheckOrder.id, provider });
      setFraudData(res.data);
    } catch (err: any) {
      toast({
        title: "Fraud Check Failed",
        description: err?.response?.data?.message || `Could not retrieve ${provider} records`,
        variant: "destructive",
      });
    } finally {
      setIsFetchingFraud(false);
    }
  };


  const handleQuickCancel = async () => {
    if (!cancelOrderTarget) return;
    setIsSubmittingCancel(true);
    try {
      await onlinePreordersApi.updateStatus(cancelOrderTarget.id, "CANCELLED");
      sendAdminPurchaseCancelled(cancelOrderTarget, cancelReason, isFakeCustomer);
      toast({
        title: isFakeCustomer ? "Order Cancelled & Flagged Fake" : "Order Cancelled",
        description: `Order #${cancelOrderTarget.id} status updated to CANCELLED.`,
      });
      setCancelDialogOpen(false);
      setCancelOrderTarget(null);
      void loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.detail || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Calculate date range for analytics (all time)
  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(2020, 0, 1),
      to: now,
    };
  }, []);

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useOnlinePreorderAnalytics(dateRange);

  // Calculate stats from current rows
  const stats = useMemo(() => {
    const totalOrders = rows.length;
    const totalRevenue = rows
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const completedCount = rows.filter((o) => o.status === "COMPLETED").length;
    const averageOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;
    const totalProfit = rows
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + Number(o.profit || 0), 0);

    return {
      totalOrders,
      totalRevenue,
      completedCount,
      averageOrderValue,
      totalProfit,
    };
  }, [rows]);

  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: [ONLINE_PREORDERS_QUERY_KEY] });
  };

  const handleEdit = (order: OnlinePreorder) => {
    setEditingOrder(order);
    setIsSheetOpen(false);
    setActiveTab("manual");
  };

  const handleStartVerification = (order: OnlinePreorder) => {
    setVerificationOrder(order);
    setIsVerificationOpen(true);
  };

  const clearEditing = () => {
    setEditingOrder(null);
    setActiveTab("orders");
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await onlinePreordersApi.delete(orderToDelete.id);
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      void loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.detail || "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (order: OnlinePreorder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (order: OnlinePreorder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleEdit(order);
  };


  const getStatusBadge = (s: string) => {
    const config: Record<string, { bg: string; text: string; dot: string; border: string }> = {
      PENDING: { bg: "bg-amber-50/90", text: "text-amber-800", dot: "bg-amber-500 animate-pulse", border: "border-amber-200/80" },
      CONFIRMED: { bg: "bg-blue-50/90", text: "text-blue-800", dot: "bg-blue-500", border: "border-blue-200/80" },
      HOLD: { bg: "bg-orange-50/90", text: "text-orange-900", dot: "bg-orange-500", border: "border-orange-300" },
      DELIVERED: { bg: "bg-indigo-50/90", text: "text-indigo-800", dot: "bg-indigo-500", border: "border-indigo-200/80" },
      COMPLETED: { bg: "bg-emerald-50/90", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-200/80" },
      RETURNED: { bg: "bg-purple-50/90", text: "text-purple-800", dot: "bg-purple-500", border: "border-purple-300" },
      CANCELLED: { bg: "bg-rose-50/90", text: "text-rose-800", dot: "bg-rose-500", border: "border-rose-200/80" },
    };
    const c = config[s] || { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "border-slate-200" };
    return (
      <Badge className={`${c.bg} ${c.text} ${c.border} border px-2.5 py-0.5 rounded-full capitalize font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
        {s.toLowerCase()}
      </Badge>
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDeliveryStatus("all");
    setCourierFilter("all");
    setOrdering("-created_at");
    setPage(1);
  };

  const isFiltered =
    status !== "all" ||
    deliveryStatus !== "all" ||
    search !== "" ||
    courierFilter !== "all" ||
    ordering !== "-created_at";

  // Dynamic delivery status options based on selected courier partner
  const deliveryStatusOptions = useMemo(() => {
    if (courierFilter !== "all" && COURIER_SPECIFIC_STATUSES[courierFilter]) {
      return [
        { value: "all", label: `All ${courierFilter} Deliveries`, count: undefined },
        ...COURIER_SPECIFIC_STATUSES[courierFilter].map((s) => ({
          value: s.value,
          label: s.label,
          count: undefined,
        })),
      ];
    }
    return [
      { value: "all", label: "All Deliveries", count: metrics?.delivery_breakdown?.all ?? totalCount },
      { value: "not_dispatched", label: "Not Dispatched", count: metrics?.delivery_breakdown?.not_dispatched ?? 0 },
      { value: "in_transit", label: "In Transit", count: metrics?.delivery_breakdown?.in_transit ?? 0 },
      { value: "in_review", label: "In Review", count: metrics?.delivery_breakdown?.in_review ?? 0 },
      { value: "delivered", label: "Delivered / Completed", count: metrics?.delivery_breakdown?.delivered ?? 0 },
      { value: "cancelled_returned", label: "Returned / Cancelled", count: metrics?.delivery_breakdown?.cancelled_returned ?? 0 },
    ];
  }, [courierFilter, metrics, totalCount]);

  // Pagination calculation
  const fromRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, totalCount);

  // Helper for customer initials avatar
  const getCustomerInitials = (name?: string) => {
    if (!name) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* 1. Sleek Compact Header — matches Dashboard header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-white">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Online Preorders
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {metrics?.total_orders ?? totalCount} Orders
              </span>
              {(metrics?.today_orders || 0) > 0 && (
                <span className="text-[11px] text-emerald-600 font-semibold hidden sm:inline">
                  +{metrics?.today_orders} today
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm font-medium">
              Consignment dispatching, live courier syncing &amp; inventory fulfillment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKpis((prev) => !prev)}
            className="gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
            title="Toggle KPI Summary Ribbon"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {showKpis ? "Hide Stats" : "Show Stats"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
            onClick={handleSyncAllCouriers}
            disabled={isSyncingCouriers}
            title="Sync live status from Steadfast, Pathao & all couriers"
          >
            <Truck className="h-3.5 w-3.5" />
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingCouriers ? "animate-spin text-amber-600" : ""}`} />
            <span>{isSyncingCouriers ? "Syncing..." : "Sync Live Status"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
            onClick={loadData}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm h-9 rounded-xl shadow-md shadow-indigo-500/20"
            onClick={() => {
              setEditingOrder(null);
              setActiveTab("manual");
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Order</span>
          </Button>
        </div>
      </div>

      {/* 2. Compact Horizontal Executive Ribbon (Only ~50px tall, collapsible) */}
      {showKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 animate-in fade-in duration-200">
          {/* Metric 1: Total Orders */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-indigo-300/80 dark:hover:border-indigo-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preorders
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isMetricsLoading ? "..." : (metrics?.total_orders ?? totalCount)}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{metrics?.today_orders || 0} today</span>
            </div>
          </Card>

          {/* Metric 2: Completed Revenue */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-emerald-300/80 dark:hover:border-emerald-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completed COD
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isMetricsLoading ? "..." : formatCurrency(metrics?.financials?.completed_revenue ?? 0)}
              {" "}<span className="text-xs font-normal text-slate-400">({metrics?.status_breakdown?.COMPLETED ?? 0} del.)</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Total revenue</span>
            </div>
          </Card>

          {/* Metric 3: Fulfillment Rate */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-blue-300/80 dark:hover:border-blue-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Delivery Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Truck className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isMetricsLoading ? "..." : `${metrics?.rates?.fulfillment_rate ?? 0}%`}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <Truck className="h-3.5 w-3.5" />
              <span>{metrics?.rates?.return_rate ?? 0}% ret.</span>
            </div>
          </Card>

          {/* Metric 4: Avg Order Value */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-pink-300/80 dark:hover:border-pink-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Order Value
              </span>
              <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-100 dark:border-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isMetricsLoading ? "..." : formatCurrency(metrics?.financials?.average_order_value ?? 0)}
              {" "}<span className="text-xs font-normal text-slate-400">/ {formatCurrency(metrics?.financials?.total_revenue ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-pink-700 dark:text-pink-400 bg-pink-50/80 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-800 px-2 py-0.5 rounded-full w-fit mt-2.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Per order avg</span>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (v !== "manual") setEditingOrder(null);
        }}
        className="w-full space-y-3"
      >
        <TabsList className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1 h-10 shadow-xs rounded-2xl inline-flex">
          <TabsTrigger
            value="orders"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Orders
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold bg-white/20">
              {metrics?.total_orders ?? totalCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics &amp; Trends
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            {editingOrder ? <Edit className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {editingOrder ? "Edit Order" : "Manual Order"}
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            Customers
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="space-y-4 mt-0">
          <OnlinePreordersAnalyticsDeck
            onSelectStatus={(s) => {
              handleStatusChange(s);
              setActiveTab("orders");
            }}
          />
        </TabsContent>

        {/* Master Orders Tab Content */}
        <TabsContent value="orders" className="space-y-3 mt-0">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
            {/* Unified Filter & Toolbar Header */}
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 sm:p-5 space-y-3">
              {/* Row 1: Order Status Pills Strip */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Order Status</span>
                  </div>
                  {status !== "all" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("all")}
                      className="text-indigo-600 hover:text-indigo-700 text-[10px] font-semibold lowercase"
                    >
                      reset order status
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {[
                    { key: "all", label: "All Orders", count: metrics?.total_orders ?? totalCount },
                    { key: "PENDING", label: "Pending", count: metrics?.status_breakdown?.PENDING ?? 0 },
                    { key: "CONFIRMED", label: "Confirmed", count: metrics?.status_breakdown?.CONFIRMED ?? 0 },
                    { key: "HOLD", label: "Hold", count: metrics?.status_breakdown?.HOLD ?? 0 },
                    { key: "DELIVERED", label: "Delivered", count: metrics?.status_breakdown?.DELIVERED ?? 0 },
                    { key: "COMPLETED", label: "Completed", count: metrics?.status_breakdown?.COMPLETED ?? 0 },
                    { key: "RETURNED", label: "Returned", count: metrics?.status_breakdown?.RETURNED ?? 0 },
                    { key: "CANCELLED", label: "Cancelled", count: metrics?.status_breakdown?.CANCELLED ?? 0 },
                  ].map((item) => {
                    const isActive = status === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleStatusChange(item.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Delivery Order Status Pills Strip */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      Delivery Status
                      {courierFilter !== "all" && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {courierFilter}
                        </span>
                      )}
                    </span>
                  </div>
                  {deliveryStatus !== "all" && (
                    <button
                      type="button"
                      onClick={() => handleDeliveryStatusChange("all")}
                      className="text-blue-600 hover:text-blue-700 text-[10px] font-semibold lowercase"
                    >
                      reset delivery status
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {deliveryStatusOptions.map((item) => {
                    const isActive = deliveryStatus === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleDeliveryStatusChange(item.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Active Filters & Smart Quick Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                {/* Active Filter Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                    Active:
                  </span>
                  {status !== "all" ? (
                    <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium gap-1 pl-2 pr-1 py-0.5">
                      <span>Order: <strong>{status}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleStatusChange("all")}
                        className="hover:bg-indigo-200/60 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">All Orders</span>
                  )}

                  <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>

                  {deliveryStatus !== "all" ? (
                    <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-medium gap-1 pl-2 pr-1 py-0.5">
                      <span>Delivery: <strong>{deliveryStatus.replace(/_/g, " ")}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleDeliveryStatusChange("all")}
                        className="hover:bg-blue-200/60 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-slate-400">All Deliveries</span>
                  )}

                  {courierFilter !== "all" && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                      <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium gap-1 pl-2 pr-1 py-0.5">
                        <span>Courier: <strong>{courierFilter}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCourierFilterChange("all")}
                          className="hover:bg-emerald-200/60 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    </>
                  )}

                  {(status !== "all" && deliveryStatus !== "all") && (
                    <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-bold uppercase tracking-wider ml-1 shadow-2xs">
                      Filtered by Both
                    </Badge>
                  )}
                </div>

                {/* 1-Click Quick Presets */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hidden sm:inline">
                    Presets:
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("CONFIRMED", "not_dispatched")}
                    className="h-7 px-2 text-[11px] font-semibold border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-amber-900 flex items-center gap-1 shadow-2xs"
                    title="Filter: Order Confirmed + Not Dispatched"
                  >
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>Ready to Dispatch</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("CONFIRMED", "in_transit")}
                    className="h-7 px-2 text-[11px] font-semibold border-blue-300 bg-blue-50/60 hover:bg-blue-100 text-blue-900 flex items-center gap-1 shadow-2xs"
                    title="Filter: Confirmed & In Transit"
                  >
                    <Truck className="w-3 h-3 text-blue-600" />
                    <span>In Transit</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("DELIVERED", "completed")}
                    className="h-7 px-2 text-[11px] font-semibold border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 flex items-center gap-1 shadow-2xs"
                    title="Filter: Delivered & Completed"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Delivered & Completed</span>
                  </Button>
                </div>
              </div>

              {/* Row 4: Search Input & Dropdowns */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by ID (#123), customer, phone, tracking..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Delivery Partner Select */}
                  <Select value={courierFilter} onValueChange={handleCourierFilterChange}>
                    <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold">
                      <Truck className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="Delivery Partner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Couriers</SelectItem>
                      <SelectItem value="STEADFAST">Steadfast</SelectItem>
                      <SelectItem value="PATHAO">Pathao</SelectItem>
                      <SelectItem value="REDX">RedX</SelectItem>
                      <SelectItem value="CARRYBEE">Carrybee</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Delivery Status Dropdown Select */}
                  <Select value={deliveryStatus} onValueChange={handleDeliveryStatusChange}>
                    <SelectTrigger className="w-[155px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold">
                      <Package className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="Delivery Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort Order Select */}
                  <Select value={ordering} onValueChange={(val) => { setOrdering(val); setPage(1); }}>
                    <SelectTrigger className="w-[135px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-created_at">Newest First</SelectItem>
                      <SelectItem value="created_at">Oldest First</SelectItem>
                      <SelectItem value="-total_amount">Amount: High-Low</SelectItem>
                      <SelectItem value="total_amount">Amount: Low-High</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("analytics")}
                    className="h-9 px-2.5 rounded-lg text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    View Charts
                  </Button>

                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-9 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Bulk Selection Action Bar */}
              {selectedOrderIds.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600 text-white font-bold text-xs">
                      {selectedOrderIds.length} Selected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrderIds([])}
                      className="h-6 text-[11px] text-amber-900 hover:text-amber-950 hover:bg-amber-200/60"
                    >
                      Deselect All
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCouriers.length <= 1 ? (
                      <Button
                        size="sm"
                        onClick={() => handleBulkDispatch(activeCouriers[0]?.provider)}
                        disabled={isBulkDispatching || activeCouriers.length === 0}
                        className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        {isBulkDispatching
                          ? "Dispatching..."
                          : `⚡ Bulk Dispatch via ${activeCouriers[0]?.name || "Courier"} (${selectedOrderIds.length})`}
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            disabled={isBulkDispatching}
                            className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            {isBulkDispatching ? "Dispatching..." : `⚡ Bulk Dispatch (${selectedOrderIds.length})`}
                            <MoreHorizontal className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Select Delivery Partner</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {activeCouriers.map((c) => (
                            <DropdownMenuItem
                              key={c.provider}
                              onClick={() => handleBulkDispatch(c.provider)}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5 mr-2 text-amber-600" />
                              Dispatch via {c.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )}

              {/* Table Data View */}
              {loading && rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="animate-spin rounded-full h-9 w-9 border-3 border-indigo-600 border-t-transparent shadow-md" />
                  <p className="text-xs text-slate-500 font-medium">Loading preorders from database...</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-w-0">
                  <Table>
                    <TableHeader className="bg-slate-50/90 sticky top-0 z-10 backdrop-blur-xs border-b border-slate-200/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10 pl-4">
                          <input
                            type="checkbox"
                            checked={rows.length > 0 && selectedOrderIds.length === rows.filter((r) => r.status !== "CANCELLED").length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(rows.filter((r) => r.status !== "CANCELLED").map((r) => r.id));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Preview</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Order ID</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Customer</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-center">Items</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Amount</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Discount</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Courier Partner</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((o) => {
                        const totalDiscount = o.items?.reduce((sum, item) => sum + (Number(item.discount) || 0), 0) || 0;
                        const images = o.items?.map((i) => i.product_image).filter(Boolean) as string[] || [];
                        const customerCity = (o.shipping_address as any)?.city || (o.shipping_address as any)?.thana || (o.shipping_address as any)?.district || "";

                        return (
                          <TableRow
                            key={o.id}
                            className="cursor-pointer hover:bg-indigo-50/30 transition-colors border-b border-slate-100 last:border-none"
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsSheetOpen(true);
                            }}
                          >
                            {/* Checkbox */}
                            <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(o.id)}
                                disabled={o.status === "CANCELLED"}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds((prev) => [...prev, o.id]);
                                  } else {
                                    setSelectedOrderIds((prev) => prev.filter((id) => id !== o.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
                              />
                            </TableCell>

                            {/* Product Image Thumbnail */}
                            <TableCell>
                              <OrderProductThumbnail
                                images={images}
                                orderId={o.id}
                                productName={o.items?.[0]?.product_name}
                              />
                            </TableCell>

                            {/* Order ID */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs font-mono text-indigo-600">
                                  #{o.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(String(o.id));
                                    toast({ title: `Copied #${o.id}` });
                                  }}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Copy Order ID"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </TableCell>

                            {/* Customer Column */}
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center text-[11px] font-black text-slate-700 shrink-0">
                                  {getCustomerInitials(o.customer_name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate max-w-[160px]">
                                    {o.customer_name}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                    <span>{o.customer_phone}</span>
                                    {customerCity && (
                                      <span className="text-[10px] text-slate-400 font-sans truncate max-w-[90px]">
                                        • {customerCity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Items count badge */}
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold border-none text-[11px] px-2 py-0.5">
                                {o.items?.length || 0} unit{o.items?.length === 1 ? "" : "s"}
                              </Badge>
                            </TableCell>

                            {/* Total Price */}
                            <TableCell>
                              <div className="font-black text-xs text-slate-900">
                                {formatCurrency(o.total_amount)}
                              </div>
                              {Number(o.delivery_charge || 0) > 0 && (
                                <div className="text-[10px] text-slate-400 font-medium">
                                  incl. {formatCurrency(o.delivery_charge)} del.
                                </div>
                              )}
                            </TableCell>

                            {/* Discount */}
                            <TableCell>
                              {totalDiscount > 0 ? (
                                <span className="text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                  -{formatCurrency(totalDiscount)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell>{getStatusBadge(o.status)}</TableCell>

                            {/* Courier Partner */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {o.courier_consignment_id || o.steadfast_consignment_id || o.courier_tracking_code || o.steadfast_tracking_code ? (
                                (() => {
                                  const p = (o.courier_partner || (o.steadfast_consignment_id ? "STEADFAST" : "COURIER")).toUpperCase();
                                  const trk = o.courier_tracking_code || o.steadfast_tracking_code || o.courier_consignment_id || o.steadfast_consignment_id;
                                  const st = o.courier_status || o.steadfast_status || "In Review";
                                  const badgeClass =
                                    p === "STEADFAST"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : p === "PATHAO"
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : p === "REDX"
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200";

                                  const trackUrl =
                                    p === "STEADFAST"
                                      ? `https://steadfast.com.bd/tracking`
                                      : p === "PATHAO"
                                      ? `https://merchant.pathao.com/tracking?consignment_id=${trk}`
                                      : p === "REDX"
                                      ? `https://redx.com.bd/track-parcel/?trackingId=${trk}`
                                      : `https://carrybee.com/track`;

                                  return (
                                    <div className="flex flex-col items-start gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className={`${badgeClass} text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs`}>
                                          <Truck className="w-3 h-3" />
                                          {p}
                                        </Badge>
                                        <span className="text-[10px] text-slate-500 font-semibold capitalize">
                                          ({st.replace(/_/g, " ")})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => handleSyncSingleCourier(o.id, e)}
                                          disabled={syncingOrderId === o.id}
                                          title={`Sync live status from ${p}`}
                                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center"
                                        >
                                          <RefreshCw className={`w-3 h-3 ${syncingOrderId === o.id ? "animate-spin text-indigo-600" : ""}`} />
                                        </button>
                                      </div>
                                      {trk && (
                                        <a
                                          href={trackUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={() => {
                                            try { navigator.clipboard.writeText(trk); } catch {}
                                          }}
                                          className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                                          title={`Track on ${p} (Click to copy)`}
                                        >
                                          {trk}
                                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline opacity-70" />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : o.status !== "CANCELLED" ? (
                                activeCouriers.length <= 1 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 flex items-center gap-1 shadow-2xs transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openFastDispatchDialog(o, activeCouriers[0]?.provider);
                                    }}
                                  >
                                    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    Dispatch
                                  </Button>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-xs font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 flex items-center gap-1 shadow-2xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                                        Dispatch
                                        <MoreHorizontal className="w-3 h-3 ml-0.5 opacity-60" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48">
                                      <DropdownMenuLabel className="text-[11px] text-slate-500">Choose Delivery Agent</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {activeCouriers.map((c) => (
                                        <DropdownMenuItem
                                          key={c.provider}
                                          className="text-xs font-semibold cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void openFastDispatchDialog(o, c.provider);
                                          }}
                                        >
                                          <Truck className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                          Dispatch via {c.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-slate-500 text-xs font-medium whitespace-nowrap">
                              {format(new Date(o.created_at), "MMM dd, yyyy")}
                            </TableCell>

                            {/* Row Action Dropdown */}
                            <TableCell className="text-right pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel className="text-xs font-bold text-slate-600">
                                    Order #{o.id}
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setIsSheetOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4 text-slate-500" />
                                    View &amp; Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStartVerification(o)}>
                                    <Package className="mr-2 h-4 w-4 text-indigo-600" />
                                    Verify &amp; Deliver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setIsSheetOpen(true);
                                    }}
                                  >
                                    <Clock className="mr-2 h-4 w-4 text-amber-600" />
                                    Change Status
                                  </DropdownMenuItem>

                                  {/* Courier partner actions */}
                                  {o.status !== "CANCELLED" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {!(o.courier_consignment_id || o.steadfast_consignment_id) ? (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void openFastDispatchDialog(o);
                                          }}
                                          className="text-amber-800 font-semibold cursor-pointer"
                                        >
                                          <Zap className="mr-2 h-4 w-4 fill-amber-500 text-amber-600" />
                                          Dispatch Consignment
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void handleSyncSingleCourier(o.id, e);
                                          }}
                                          className="cursor-pointer font-medium"
                                        >
                                          <RefreshCw className={`mr-2 h-4 w-4 text-emerald-600 ${syncingOrderId === o.id ? "animate-spin" : ""}`} />
                                          Check Status ({o.courier_partner || "Courier"})
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleOpenFraudCheck(o);
                                        }}
                                      >
                                        <ShieldCheck className="mr-2 h-4 w-4 text-slate-500" />
                                        Courier Fraud Check
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {o.status !== "CANCELLED" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation?.();
                                          setCancelOrderTarget(o);
                                          setCancelReason("Fake Customer / Fake Order");
                                          setIsFakeCustomer(true);
                                          setCancelDialogOpen(true);
                                        }}
                                        className="text-amber-600 focus:text-amber-700 font-semibold"
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel Order
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation?.();
                                      openDeleteDialog(o);
                                    }}
                                    className="text-red-600 focus:text-red-700 font-semibold"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {rows.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-20">
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <ShoppingBag className="w-7 h-7 text-slate-400" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-extrabold text-slate-800 text-sm">No online preorders found</p>
                                <p className="text-xs text-slate-500">
                                  {isFiltered ? "Try adjusting your filters or search keywords" : "No orders have been placed yet."}
                                </p>
                              </div>
                              {isFiltered && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={clearFilters}
                                  className="h-8 text-xs font-semibold mt-1"
                                >
                                  Reset Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Backend Pagination Footer Controls */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <span className="font-bold text-slate-900">{fromRecord}</span> to{" "}
                  <span className="font-bold text-slate-900">{toRecord}</span> of{" "}
                  <span className="font-black text-slate-900">{totalCount}</span> preorders
                  {isFetching && (
                    <span className="ml-2 inline-flex items-center gap-1 text-indigo-600">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Updating...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Page Navigation */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-white border-slate-200"
                      onClick={() => setPage(1)}
                      disabled={page <= 1 || loading}
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-white border-slate-200"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || loading}
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          return Math.abs(p - page) <= 1;
                        })
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <React.Fragment key={p}>
                              {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                              <Button
                                variant={p === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(p)}
                                disabled={loading}
                                className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${
                                  p === page
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {p}
                              </Button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-white border-slate-200"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || loading}
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg bg-white border-slate-200"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages || loading}
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">Rows:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[72px] h-8 bg-white border-slate-200 text-xs font-bold rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <ManualOrderForm
            initialData={editingOrder || undefined}
            onSuccess={() => { clearEditing(); void loadData(); }}
            onCancel={clearEditing}
          />
        </TabsContent>

        <TabsContent value="customers">
          <OnlineCustomersTab
            onFilterCustomerOrders={(customerPhone) => {
              setSearch(customerPhone);
              setActiveTab("orders");
            }}
          />
        </TabsContent>
      </Tabs>

      <OrderDetailsSheet
        order={selectedOrder}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onRefresh={() => { void loadData(); setIsSheetOpen(false); }}
        onEdit={handleEdit}
        onStartVerification={handleStartVerification}
      />

      <OnlinePreorderVerificationModal
        order={verificationOrder}
        open={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        onCompleted={() => {
          void loadData();
          if (selectedOrder && selectedOrder.id === verificationOrder?.id) {
            setSelectedOrder(prev => prev ? { ...prev, status: "DELIVERED" } : null);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order #{orderToDelete?.id}? This action cannot be undone.
              {orderToDelete && (
                <div className="mt-2 text-sm text-slate-600">
                  <p>Customer: {orderToDelete.customer_name}</p>
                  <p>Total: {formatCurrency(orderToDelete.total_amount)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              Cancel Preorder #{cancelOrderTarget?.id}
            </DialogTitle>
            <DialogDescription>
              Provide the cancellation reason and decide whether to flag this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {cancelOrderTarget && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="font-bold text-slate-800">Customer: {cancelOrderTarget.customer_name}</p>
                <p className="text-slate-500">Phone: {cancelOrderTarget.customer_phone}</p>
                <p className="font-semibold text-slate-700">Amount: {formatCurrency(cancelOrderTarget.total_amount)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">Cancellation Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fake Customer / Fake Order">Fake Customer / Fake Order</SelectItem>
                  <SelectItem value="Customer Unreachable">Customer Unreachable</SelectItem>
                  <SelectItem value="Customer Requested Cancellation">Customer Requested Cancellation</SelectItem>
                  <SelectItem value="Out of Stock / Delivery Issue">Out of Stock / Delivery Issue</SelectItem>
                  <SelectItem value="Duplicate Order">Duplicate Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customReason" className="font-semibold text-slate-700">Custom Details (Optional)</Label>
              <Input
                id="customReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter custom cancellation notes..."
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="pageFakeCheckbox"
                checked={isFakeCustomer}
                onChange={(e) => setIsFakeCustomer(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
              />
              <Label htmlFor="pageFakeCheckbox" className="text-xs font-semibold text-rose-700 cursor-pointer">
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
              onClick={handleQuickCancel}
              disabled={isSubmittingCancel}
              className="bg-rose-600 hover:bg-rose-700 font-bold"
            >
              {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fast Courier Dispatch Dialog */}
      <Dialog open={fastSteadfastDialogOpen} onOpenChange={setFastSteadfastDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-slate-900 font-bold">
              <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              Fast Dispatch to Courier Partner
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quick 1-click consignment booking with integrated delivery agents.
            </DialogDescription>
          </DialogHeader>

          {fastSteadfastOrder && (
            <div className="space-y-3.5 py-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Customer</span>
                  <span className="font-bold text-slate-900">{fastSteadfastOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Invoice ID</span>
                  <span className="font-bold text-indigo-600">#{fastSteadfastOrder.id}</span>
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
                <Label htmlFor="pageDispatchPhone" className="text-xs font-semibold text-slate-700">Recipient Phone (11 digits)</Label>
                <Input
                  id="pageDispatchPhone"
                  value={steadfastPhone}
                  onChange={(e) => setSteadfastPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pageCodAmount" className="text-xs font-semibold text-slate-700">Cash on Delivery (COD) Amount (৳)</Label>
                <Input
                  id="pageCodAmount"
                  type="number"
                  value={steadfastCod}
                  onChange={(e) => setSteadfastCod(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-sm font-semibold"
                />
                <p className="text-[11px] text-slate-400">Total order amount: ৳{fastSteadfastOrder.total_amount}. Adjust if advance paid.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pageDispatchAddress" className="text-xs font-semibold text-slate-700">Delivery Address</Label>
                <Textarea
                  id="pageDispatchAddress"
                  value={steadfastAddress}
                  onChange={(e) => setSteadfastAddress(e.target.value)}
                  placeholder="Delivery address..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pageDispatchNote" className="text-xs font-semibold text-slate-700">Courier Note</Label>
                <Input
                  id="pageDispatchNote"
                  value={steadfastNote}
                  onChange={(e) => setSteadfastNote(e.target.value)}
                  placeholder="Special instructions..."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setFastSteadfastDialogOpen(false)} disabled={isDispatchingFast}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmFastDispatch}
              disabled={isDispatchingFast || !steadfastPhone || !steadfastAddress || activeCouriers.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5"
            >
              {isDispatchingFast ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Booking Consignment...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Dispatch Consignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Courier Fraud & Delivery History Dialog */}
      <Dialog open={fraudCheckDialogOpen} onOpenChange={setFraudCheckDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-slate-900 font-bold">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Delivery &amp; Fraud Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Delivery success and return record for this customer across integrated courier networks.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {fraudCheckOrder && (
              <div className="bg-slate-50 p-3 rounded-lg border text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">{fraudCheckOrder.customer_name}</span>
                  <span className="text-slate-500 font-mono">{fraudCheckOrder.customer_phone}</span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-indigo-600 border-indigo-200 block mb-0.5">
                    Order #{fraudCheckOrder.id}
                  </Badge>
                  {fraudCheckOrder.courier_partner && (
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Assigned: {fraudCheckOrder.courier_partner}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Courier Selection Tabs */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Select Courier Method to Check
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Button
                  type="button"
                  variant={selectedFraudProvider === "ALL" ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs px-2.5 ${selectedFraudProvider === "ALL" ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : "text-slate-700"}`}
                  onClick={() => handleChangeFraudProvider("ALL")}
                >
                  All Couriers
                </Button>
                {activeCouriers.map((c) => (
                  <Button
                    key={c.provider}
                    type="button"
                    variant={selectedFraudProvider === c.provider ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs px-2.5 ${selectedFraudProvider === c.provider ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : "text-slate-700"}`}
                    onClick={() => handleChangeFraudProvider(c.provider)}
                  >
                    <Truck className="w-3 h-3 mr-1" />
                    {c.name.replace(" Courier", "").replace(" Logistics", "")}
                  </Button>
                ))}
                {!activeCouriers.some(c => c.provider === "STEADFAST") && (
                  <Button
                    type="button"
                    variant={selectedFraudProvider === "STEADFAST" ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs px-2.5 ${selectedFraudProvider === "STEADFAST" ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : "text-slate-700"}`}
                    onClick={() => handleChangeFraudProvider("STEADFAST")}
                  >
                    Steadfast Network
                  </Button>
                )}
              </div>
            </div>

            {isFetchingFraud ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500">Querying {selectedFraudProvider} records...</p>
              </div>
            ) : fraudData ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs font-bold bg-slate-100 text-slate-800">
                      {fraudData.provider_name}
                    </Badge>
                  </div>
                  <Badge
                    className={`text-xs font-bold px-2.5 py-0.5 border-none ${
                      fraudData.risk_level === 'HIGH_RISK' ? 'bg-rose-100 text-rose-800' :
                      fraudData.risk_level === 'SAFE' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {fraudData.risk_level === 'HIGH_RISK' ? '⚠️ High Risk of Return' :
                     fraudData.risk_level === 'SAFE' ? '✓ Verified Safe Customer' : 'Normal Record'}
                  </Badge>
                </div>

                {selectedFraudProvider === "PATHAO" ? (
                  /* Dedicated Pathao Customer Rating & Trust System */
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-red-50/90 via-white to-amber-50/40 border border-red-200/80 rounded-xl p-3.5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Pathao Customer Rating</span>
                            <span className="text-[10px] text-slate-500 font-medium">Delivery Behavior &amp; Reliability Score</span>
                          </div>
                        </div>
                        <Badge
                          className={`text-[11px] font-bold px-2 py-0.5 border-none ${
                            fraudData.risk_level === 'HIGH_RISK'
                              ? 'bg-rose-100 text-rose-800'
                              : (fraudData.rating ?? 5.0) >= 4.0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {fraudData.rating_label || (fraudData.risk_level === 'SAFE' ? 'Verified Safe Buyer' : 'Normal Rating')}
                        </Badge>
                      </div>

                      {/* Large Star & Trust Score Card */}
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-100 shadow-2xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
                            Customer Rating
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                              {(fraudData.rating ?? 5.0).toFixed(1)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">/ 5.0</span>
                            <div className="flex items-center ml-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((starIdx) => {
                                const r = fraudData.rating ?? 5.0;
                                const isFull = r >= starIdx;
                                const isHalf = !isFull && r >= starIdx - 0.5;
                                return (
                                  <Star
                                    key={starIdx}
                                    className={`w-3.5 h-3.5 ${
                                      isFull
                                        ? "fill-amber-400 text-amber-400"
                                        : isHalf
                                        ? "fill-amber-300/60 text-amber-400"
                                        : "text-slate-200"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
                            COD Acceptance
                          </span>
                          <span className="text-lg font-black text-indigo-600">
                            {Math.round(fraudData.trust_score ?? fraudData.success_rate ?? 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Pathao Recommendation */}
                      {fraudData.recommendation && (
                        <div className="text-[11px] p-2.5 rounded-lg bg-red-50/70 border border-red-100 text-red-950 flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <p className="leading-relaxed font-medium">{fraudData.recommendation}</p>
                        </div>
                      )}

                      {/* Mini Parcel Counts if any records */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-0.5">
                        <div className="bg-white/80 p-2 rounded border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-medium">History Parcels</span>
                          <span className="font-bold text-slate-800">{fraudData.total_parcels}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-medium">Delivered</span>
                          <span className="font-bold text-emerald-700">{fraudData.total_delivered}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-medium">Returned</span>
                          <span className="font-bold text-rose-700">{fraudData.total_cancelled}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Steadfast and General Couriers Parcel Grid */
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg text-center border">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Total Parcels</span>
                      <span className="font-bold text-slate-900 text-sm">{fraudData.total_parcels}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Delivered</span>
                      <span className="font-bold text-emerald-700 text-sm">{fraudData.total_delivered}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Cancelled</span>
                      <span className="font-bold text-rose-700 text-sm">{fraudData.total_cancelled}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Success Rate</span>
                      <span className="font-extrabold text-indigo-700 text-sm">{fraudData.success_rate}%</span>
                    </div>
                  </div>
                )}

                {/* Fraud Reports Warning If Any Recorded on Courier Network */}
                {fraudData.fraud_reports && fraudData.fraud_reports.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                    <div className="font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Reported Courier Fraud Incident ({fraudData.fraud_reports.length})</span>
                    </div>
                    {fraudData.fraud_reports.map((rep, idx) => (
                      <div key={idx} className="text-[11px] text-rose-700 bg-white/80 p-2 rounded border border-rose-100">
                        {rep.details && <p className="font-medium text-rose-900">{rep.details}</p>}
                        {rep.name && <p className="text-[10px] text-rose-600 mt-0.5">Reported by / as: {rep.name}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Per-courier breakdown if multi-courier data available */}
                {fraudData.provider_breakdown && Object.keys(fraudData.provider_breakdown).length > 0 && (
                  <div className="p-2.5 bg-slate-50/70 rounded-lg border text-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 block">Performance by Delivery Agent:</span>
                    {Object.entries(fraudData.provider_breakdown).map(([code, stats]: [string, any]) => (
                      <div key={code} className="flex items-center justify-between text-[11px] border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                        <span className="font-medium text-slate-700">{stats.name || code}</span>
                        <span className="text-slate-500 font-mono">
                          {stats.total} parcels ({stats.delivered} delivered, {stats.cancelled} returned)
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {fraudData.network_data && (
                  <p className="text-[11px] text-slate-400 italic">
                    * Cross-referenced with Steadfast courier network database.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No fraud check record found for this number.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFraudCheckDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}





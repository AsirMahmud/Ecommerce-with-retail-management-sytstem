"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { onlinePreordersApi, type OnlinePreorder, type SteadfastFraudResult } from "@/lib/api/onlinePreorder";
import { courierApi, type ActiveCourier, type CourierProvider, type CourierFraudResult } from "@/lib/api/courier";
import { OrderDetailsSheet } from "@/components/online-preorders/order-details-sheet";
import { OnlinePreorderVerificationModal } from "@/components/online-preorders/verification-modal";
import { ManualOrderForm } from "@/components/online-preorders/manual-order-form";
import { OnlineCustomersTab } from "@/components/online-preorders/online-customers-tab";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import { useMemo } from "react";
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
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OnlinePreorder[]>([]);
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

  const debouncedSearch = useDebounce(search, 500);

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
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const completedCount = rows.filter(o => o.status === 'COMPLETED').length;
    const averageOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;
    const totalProfit = rows
      .filter(o => o.status === 'COMPLETED')
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
    setLoading(true);
    try {
      const res = await onlinePreordersApi.getAll(status, debouncedSearch);
      const data = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
      setRows(data as OnlinePreorder[]);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch]);

  const getStatusBadge = (s: string) => {
    const config: any = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      DELIVERED: "bg-indigo-100 text-indigo-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return <Badge className={`${config[s] || "bg-gray-100"} border-none capitalize`}>{s.toLowerCase()}</Badge>;
  };

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Online Preorders</h1>
          <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-sm font-medium">Manage and track your ecommerce COD orders from one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button variant="outline" className="bg-white text-xs sm:text-sm h-9" onClick={loadData}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 text-xs sm:text-sm h-9" onClick={() => { setEditingOrder(null); setActiveTab("manual"); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoadingAnalytics ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              analyticsData?.total_orders ?? stats.totalOrders
            )}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">All online preorders</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoadingAnalytics ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              formatCurrency(analyticsData?.total_revenue ?? stats.totalRevenue)
            )}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Completed orders</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Total Sales</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoadingAnalytics ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              analyticsData?.total_sales_count ?? stats.completedCount
            )}
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-1">Completed orders</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Avg Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoadingAnalytics ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              formatCurrency(analyticsData?.average_order_value ?? stats.averageOrderValue)
            )}
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">Per completed order</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "manual") setEditingOrder(null); }} className="w-full">
        <TabsList className="bg-white border p-1 h-auto flex flex-wrap sm:inline-flex sm:h-12 shadow-sm rounded-xl mb-6">
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-3 sm:px-6 py-2 sm:py-0 text-xs sm:text-sm font-semibold transition-all">
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-3 sm:px-6 py-2 sm:py-0 text-xs sm:text-sm font-semibold transition-all">
            {editingOrder ? <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
            {editingOrder ? "Edit Order" : "Manual Order"}
          </TabsTrigger>
          <TabsTrigger value="customers" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-3 sm:px-6 py-2 sm:py-0 text-xs sm:text-sm font-semibold transition-all">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by customer, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-10 bg-white border-slate-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200">
                      <Filter className="w-4 h-4 mr-2 text-slate-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Bulk Selection Action Bar */}
              {selectedOrderIds.length > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top duration-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">
                      {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? "s" : ""} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOrderIds([])}
                      className="h-6 text-[11px] text-slate-500 hover:text-slate-800"
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
                        {isBulkDispatching ? "Dispatching..." : `⚡ Bulk Dispatch via ${activeCouriers[0]?.name || 'Courier'} (${selectedOrderIds.length})`}
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

              {loading && rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent shadow-md"></div>
                  <p className="text-slate-500 font-medium">Loading orders...</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] min-w-0">
                  <Table>
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={rows.length > 0 && selectedOrderIds.length === rows.filter(r => r.status !== "CANCELLED").length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(rows.filter(r => r.status !== "CANCELLED").map(r => r.id));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="font-bold text-slate-700">Preview</TableHead>
                        <TableHead className="font-bold text-slate-700">Order ID</TableHead>
                        <TableHead className="font-bold text-slate-700">Customer</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Items</TableHead>
                        <TableHead className="font-bold text-slate-700">Total Price</TableHead>
                        <TableHead className="font-bold text-slate-700">Discount</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                        <TableHead className="font-bold text-slate-700">Courier Partner</TableHead>
                        <TableHead className="font-bold text-slate-700">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((o) => {
                        const totalDiscount = o.items?.reduce((sum, item) => sum + (Number(item.discount) || 0), 0) || 0;
                        const images = o.items?.map(i => i.product_image).filter(Boolean) || [];
                        const displayImages = images.slice(0, 3);
                        const remainingCount = images.length - 3;
                        const isMulti = images.length > 1;

                        return (
                          <TableRow
                            key={o.id}
                            className="cursor-pointer hover:bg-slate-50/90 transition-colors odd:bg-white even:bg-slate-50/40"
                            onClick={() => { setSelectedOrder(o); setIsSheetOpen(true); }}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(o.id)}
                                disabled={o.status === "CANCELLED"}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, o.id]);
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5 items-center">
                                {images.length > 0 ? (
                                  <>
                                    <div
                                      className="w-14 h-16 sm:w-16 sm:h-20 rounded-md border bg-white overflow-hidden flex-shrink-0 relative transition-all"
                                    >
                                      <img src={images[0]} alt="Order preview" className="w-full h-full object-cover" />
                                      {images.length > 1 && (
                                        <div className="sm:hidden absolute inset-0 bg-black/60 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">+{images.length - 1}</span>
                                        </div>
                                      )}
                                    </div>
                                    {displayImages.slice(1).map((img, idx) => (
                                      <div
                                        key={idx}
                                        className="hidden sm:block w-16 h-20 rounded-md border bg-white overflow-hidden flex-shrink-0 relative transition-all"
                                      >
                                        <img src={img} alt="Order preview" className="w-full h-full object-cover" />
                                        {idx === 1 && remainingCount > 0 && (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">+{remainingCount}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="w-14 h-16 sm:w-20 sm:h-24 rounded-md border bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <Package className="w-6 h-6 text-slate-300" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-indigo-600">#{o.id}</TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-900">{o.customer_name}</div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5">{o.customer_phone}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-none">
                                {o.items?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900">{formatCurrency(o.total_amount)}</TableCell>
                            <TableCell>
                              {totalDiscount > 0 ? (
                                <span className="text-rose-600 font-semibold text-sm">{formatCurrency(totalDiscount)}</span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(o.status)}</TableCell>
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
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className={`${badgeClass} text-[10px] font-bold uppercase tracking-wider flex items-center gap-1`}>
                                          <Truck className="w-3 h-3" />
                                          {p}
                                        </Badge>
                                        <span className="text-[10px] text-slate-500 font-medium">({st})</span>
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
                                          title={`Track on ${p} (Copies code)`}
                                        >
                                          {trk}
                                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline opacity-70" />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : o.status !== "CANCELLED" ? (
                                activeCouriers.length === 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-bold border-amber-300 bg-amber-50/70 text-amber-800 hover:bg-amber-100 flex items-center gap-1 shadow-sm transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openFastDispatchDialog(o);
                                    }}
                                  >
                                    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    Setup Courier
                                  </Button>
                                ) : activeCouriers.length === 1 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 hover:border-amber-400 flex items-center gap-1 shadow-sm transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void openFastDispatchDialog(o, activeCouriers[0].provider);
                                    }}
                                    title={`Fast Dispatch via ${activeCouriers[0].name}`}
                                  >
                                    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    Dispatch ({activeCouriers[0].name.replace(" Courier", "").replace(" Logistics", "")})
                                  </Button>
                                ) : (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs font-bold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 flex items-center gap-1 shadow-sm"
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
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-500 font-medium whitespace-nowrap">
                              {format(new Date(o.created_at), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Order #{o.id}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setIsSheetOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    View &amp; Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStartVerification(o)}
                                  >
                                    <Package className="mr-2 h-4 w-4" />
                                    Verify &amp; Deliver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedOrder(o);
                                      setIsSheetOpen(true);
                                    }}
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Change Status
                                  </DropdownMenuItem>

                                  {/* Delivery Partner Actions */}
                                  {o.status !== "CANCELLED" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {!(o.courier_consignment_id || o.steadfast_consignment_id) ? (
                                        <>
                                          {activeCouriers.length > 0 ? (
                                            activeCouriers.map((c) => (
                                              <DropdownMenuItem
                                                key={c.provider}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  void openFastDispatchDialog(o, c.provider);
                                                }}
                                                className="text-amber-800 focus:text-amber-900 font-semibold cursor-pointer"
                                              >
                                                <Zap className="mr-2 h-4 w-4 fill-amber-500 text-amber-600" />
                                                Dispatch via {c.name}
                                              </DropdownMenuItem>
                                            ))
                                          ) : (
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                void openFastDispatchDialog(o);
                                              }}
                                              className="text-amber-700 focus:text-amber-800 font-semibold cursor-pointer"
                                            >
                                              <Zap className="mr-2 h-4 w-4 fill-amber-500 text-amber-600" />
                                              Dispatch to Courier Partner
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const res = await courierApi.getOrderStatus(o.id);
                                              toast({
                                                title: `${o.courier_partner || "Courier"} Status Refreshed`,
                                                description: `Current status: ${res.data.status}`,
                                              });
                                              void loadData();
                                            } catch (err: any) {
                                              toast({
                                                title: "Status Check Failed",
                                                description: err?.response?.data?.message || "Failed to fetch courier status",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <RefreshCw className="mr-2 h-4 w-4 text-emerald-600" />
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
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation?.();
                                        setCancelOrderTarget(o);
                                        setCancelReason("Fake Customer / Fake Order");
                                        setIsFakeCustomer(true);
                                        setCancelDialogOpen(true);
                                      }}
                                      className="text-amber-600 focus:text-amber-700 font-medium"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel Order
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      // e is the synthetic event from menu; stop menu closing from bubbling to row
                                      e.stopPropagation?.();
                                      openDeleteDialog(o);
                                    }}
                                    className="text-red-600 focus:text-red-700"
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
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-20">
                            <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                              <ShoppingBag className="w-16 h-16" />
                              <p className="font-bold text-lg">No online preorders found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
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





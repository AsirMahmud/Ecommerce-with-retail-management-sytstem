"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { onlinePreordersApi, type OnlinePreorder } from "@/lib/api/onlinePreorder";
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

  // Quick Cancel Order state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OnlinePreorder | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Fake Customer / Fake Order");
  const [isFakeCustomer, setIsFakeCustomer] = useState(true);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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
                        <TableHead className="font-bold text-slate-700">Preview</TableHead>
                        <TableHead className="font-bold text-slate-700">Order ID</TableHead>
                        <TableHead className="font-bold text-slate-700">Customer</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Items</TableHead>
                        <TableHead className="font-bold text-slate-700">Total Price</TableHead>
                        <TableHead className="font-bold text-slate-700">Discount</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
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
                                <DropdownMenuContent align="end" className="w-44">
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
                          <TableCell colSpan={9} className="text-center py-20">
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
    </div>
  );
}




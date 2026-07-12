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
} from "lucide-react";
import { onlinePreordersApi, type OnlinePreorder } from "@/lib/api/onlinePreorder";
import { OrderDetailsSheet } from "@/components/online-preorders/order-details-sheet";
import { OnlinePreorderVerificationModal } from "@/components/online-preorders/verification-modal";
import { ManualOrderForm } from "@/components/online-preorders/manual-order-form";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { useOnlinePreorderAnalytics } from "@/hooks/queries/use-reports";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="min-h-screen space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Online Preorders</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and track your ecommerce COD orders from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white" onClick={loadData}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200" onClick={() => { setEditingOrder(null); setActiveTab("manual"); }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-900">Total Orders</CardTitle>
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                analyticsData?.total_orders ?? stats.totalOrders
              )}
            </div>
            <p className="text-xs text-indigo-700 mt-1">All online preorders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `৳${Number(analyticsData?.total_revenue ?? stats.totalRevenue).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-emerald-700 mt-1">From completed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Total Sales</CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                analyticsData?.total_sales_count ?? stats.completedCount
              )}
            </div>
            <p className="text-xs text-blue-700 mt-1">Completed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-900">Avg Order Value</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {isLoadingAnalytics ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `৳${Number(analyticsData?.average_order_value ?? stats.averageOrderValue).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-purple-700 mt-1">Per completed order</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== "manual") setEditingOrder(null); }} className="w-full">
        <TabsList className="bg-white border p-1 h-12 shadow-sm rounded-xl mb-6">
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-6 font-semibold transition-all">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-6 font-semibold transition-all">
            {editingOrder ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {editingOrder ? "Edit Order" : "Manual Order"}
          </TabsTrigger>
          <TabsTrigger value="customers" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 px-6 font-semibold transition-all">
            <User className="w-4 h-4 mr-2" />
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
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Filter className="w-4 h-4" />
                    Status:
                  </div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
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
                <div className="overflow-x-auto max-h-[600px]">
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
                              <div className="flex gap-2 items-center">
                                {images.length > 0 ? (
                                  displayImages.map((img, idx) => (
                                    <div
                                      key={idx}
                                      className={`${isMulti ? 'w-16 h-20' : 'w-20 h-24'} rounded-md border bg-white overflow-hidden flex-shrink-0 relative transition-all`}
                                    >
                                      <img src={img} alt="Order preview" className="w-full h-full object-cover" />
                                      {isMulti && idx === 2 && remainingCount > 0 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">+{remainingCount}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="w-20 h-24 rounded-md border bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <Package className="w-8 h-8 text-slate-300" />
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
                            <TableCell className="font-extrabold text-slate-900">৳{Number(o.total_amount).toLocaleString()}</TableCell>
                            <TableCell>
                              {totalDiscount > 0 ? (
                                <span className="text-red-500 font-bold text-sm">৳{totalDiscount.toLocaleString()}</span>
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
          <Card className="border-none shadow-xl bg-white min-h-[400px]">
            <CardHeader>
              <CardTitle>Frequent Online Customers</CardTitle>
              <CardDescription>View customers who frequently place online orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-40">
                <User className="w-16 h-16" />
                <p className="font-bold text-lg">Customer history will appear here</p>
              </div>
            </CardContent>
          </Card>
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
                  <p>Total: ৳{Number(orderToDelete.total_amount).toLocaleString()}</p>
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
    </div>
  );
}




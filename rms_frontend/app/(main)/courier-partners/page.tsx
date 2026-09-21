"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CourierTimeline } from "@/components/courier/courier-timeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  courierApi,
  CourierParcelsResponse,
  CourierParcelSummary,
  CourierProvider,
} from "@/lib/api/courier";
import { OnlinePreorder } from "@/lib/api/onlinePreorder";
import {
  Truck,
  Search,
  RefreshCw,
  ExternalLink,
  Settings,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  ArrowUpRight,
  Copy,
  Check,
  AlertCircle,
  X,
  PackageCheck,
} from "lucide-react";
import { format } from "date-fns";

const PROVIDER_INFO: Record<
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

export default function CourierPartnersPage() {
  const { toast } = useToast();
  const [selectedCourier, setSelectedCourier] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [parcels, setParcels] = useState<OnlinePreorder[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({
    ALL: 0,
    STEADFAST: 0,
    PATHAO: 0,
    REDX: 0,
    CARRYBEE: 0,
  });
  const [summary, setSummary] = useState<CourierParcelSummary>({
    total_booked: 0,
    in_transit: 0,
    in_transit_cod_amount: 0,
    delivered: 0,
    delivered_cod_amount: 0,
    cancelled: 0,
    cancelled_cod_amount: 0,
    total_cod_amount: 0,
    today_picked_count: 0,
    today_picked_cod_amount: 0,
    today_delivered_count: 0,
    today_delivered_cod_amount: 0,
  });
  const [selectedParcelForTimeline, setSelectedParcelForTimeline] = useState<OnlinePreorder | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: { courier?: string; courier_partner?: string; status?: string; search?: string } = {};
      if (selectedCourier !== "ALL") {
        params.courier = selectedCourier;
        params.courier_partner = selectedCourier;
      }
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await courierApi.getCourierParcels(params);
      setSummary(res.data.summary);
      setParcels(res.data.results);
      if (res.data.provider_counts) {
        setProviderCounts(res.data.provider_counts);
      }
    } catch (err: any) {
      toast({
        title: "Failed to load courier parcels",
        description: err.response?.data?.detail || "Network error fetching data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCourier, statusFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchData();
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied", description: `${code} copied to clipboard` });
  };

  const handleSyncStatus = async (orderId: number) => {
    try {
      setRefreshingId(orderId);
      const res = await courierApi.getOrderStatus(orderId);
      if (res.data.success) {
        toast({
          title: "Status Synchronized",
          description: `Latest status: ${res.data.status || "Updated"}`,
        });
        fetchData();
      } else {
        toast({
          title: "Sync Failed",
          description: res.data.message || "Could not refresh tracking status",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Sync Error",
        description: err.response?.data?.message || "Failed to contact courier gateway",
        variant: "destructive",
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const getStatusBadge = (statusStr?: string) => {
    const s = (statusStr || "in_review").toLowerCase();
    if (s.includes("delivered") || s.includes("completed")) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          Delivered
        </Badge>
      );
    }
    if (s.includes("transit") || s.includes("picked") || s.includes("process") || s.includes("dispatch")) {
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
          In Transit
        </Badge>
      );
    }
    if (s.includes("cancel") || s.includes("return") || s.includes("fail")) {
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">
          Cancelled / Returned
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
        {statusStr || "In Review"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Courier Partners
            </h1>
            <Badge variant="outline" className="text-xs">
              Multi-Agent Hub
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized hub for all parcels dispatched via Steadfast, Pathao, RedX, and Carrybee.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild size="sm" variant="default" className="gap-1.5 text-xs">
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5" />
              Configure API Keys
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Today Picked (Sent Today) */}
        <Card 
          onClick={() => setStatusFilter("today_picked")}
          className="cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-700 transition-all bg-white dark:bg-slate-900 border-indigo-200/80 dark:border-indigo-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">Today Picked (Sent)</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400 truncate">
                {summary.today_picked_count ?? 0}
              </h3>
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5 truncate">
                ৳{(summary.today_picked_cod_amount ?? 0).toLocaleString()} sent today
              </p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Today Delivered */}
        <Card 
          onClick={() => setStatusFilter("today_delivered")}
          className="cursor-pointer hover:shadow-md hover:border-teal-400 dark:hover:border-teal-700 transition-all bg-white dark:bg-slate-900 border-teal-200/80 dark:border-teal-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">Today Delivered</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400 truncate">
                {summary.today_delivered_count ?? 0}
              </h3>
              <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mt-0.5 truncate">
                ৳{(summary.today_delivered_cod_amount ?? 0).toLocaleString()} collected
              </p>
            </div>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 shrink-0">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: In Transit / Floating COD */}
        <Card 
          onClick={() => setStatusFilter("in_transit")}
          className="cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-700 transition-all bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">In Transit</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400 truncate">
                {summary.in_transit}
              </h3>
              <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 mt-0.5 truncate">
                ৳{(summary.in_transit_cod_amount ?? 0).toLocaleString()} floating COD
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Completed Deliveries */}
        <Card 
          onClick={() => setStatusFilter("delivered")}
          className="cursor-pointer hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-700 transition-all bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">Delivered (All Time)</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 truncate">
                {summary.delivered}
              </h3>
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                ৳{(summary.delivered_cod_amount ?? 0).toLocaleString()} collected
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Cancelled / Returned */}
        <Card 
          onClick={() => setStatusFilter("cancelled")}
          className="cursor-pointer hover:shadow-md hover:border-red-400 dark:hover:border-red-700 transition-all bg-white dark:bg-slate-900 border-red-200/80 dark:border-red-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">Cancelled/Returned</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-red-600 dark:text-red-400 truncate">
                {summary.cancelled}
              </h3>
              <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 mt-0.5 truncate">
                ৳{(summary.cancelled_cod_amount ?? 0).toLocaleString()} lost COD
              </p>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Total Booked Parcels */}
        <Card 
          onClick={() => setStatusFilter("all")}
          className="cursor-pointer hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600 transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground font-medium truncate">Total Booked</p>
              <h3 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100 truncate">
                {summary.total_booked}
              </h3>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                ৳{summary.total_cod_amount.toLocaleString()} total COD
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Courier Selector Tabs */}
          <Tabs
            value={selectedCourier}
            onValueChange={setSelectedCourier}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 h-auto flex-wrap">
                <TabsTrigger value="ALL" className="text-xs py-1.5 px-3 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs">
                  All Couriers
                  {providerCounts.ALL > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {providerCounts.ALL}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="STEADFAST" className="text-xs py-1.5 px-3 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs">
                  Steadfast
                  {providerCounts.STEADFAST > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {providerCounts.STEADFAST}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="PATHAO" className="text-xs py-1.5 px-3 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs">
                  Pathao
                  {providerCounts.PATHAO > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                      {providerCounts.PATHAO}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="REDX" className="text-xs py-1.5 px-3 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs">
                  RedX
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-500">
                    {providerCounts.REDX || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="CARRYBEE" className="text-xs py-1.5 px-3 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs">
                  Carrybee
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-500">
                    {providerCounts.CARRYBEE || 0}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ID, phone, tracking..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-8 pr-7 h-8 text-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        const params: { courier?: string; courier_partner?: string; status?: string } = {};
                        if (selectedCourier !== "ALL") {
                          params.courier = selectedCourier;
                          params.courier_partner = selectedCourier;
                        }
                        if (statusFilter !== "all") params.status = statusFilter;
                        courierApi.getCourierParcels(params).then((res) => {
                          setSummary(res.data.summary);
                          setParcels(res.data.results);
                          if (res.data.provider_counts) setProviderCounts(res.data.provider_counts);
                        }).catch(() => {});
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="today_picked">Today Picked ({summary.today_picked_count ?? 0})</SelectItem>
                    <SelectItem value="today_delivered">Today Delivered ({summary.today_delivered_count ?? 0})</SelectItem>
                    <SelectItem value="in_transit">In Transit ({summary.in_transit ?? 0})</SelectItem>
                    <SelectItem value="delivered">Delivered (All Time) ({summary.delivered ?? 0})</SelectItem>
                    <SelectItem value="cancelled">Cancelled/Returned ({summary.cancelled ?? 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs">Order ID</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Delivery Agent</TableHead>
                  <TableHead className="text-xs">Consignment & Tracking</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">COD Amount</TableHead>
                  <TableHead className="text-xs">Dispatched At</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">
                        Loading parcels data...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : parcels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-2">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                          <Package className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-semibold">
                          {selectedCourier === "ALL"
                            ? "No Parcels Dispatched Yet"
                            : `No Parcels Dispatched via ${PROVIDER_INFO[selectedCourier]?.label || selectedCourier}`}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {selectedCourier === "ALL"
                            ? "When you dispatch orders from the Online Preorders screen using Steadfast, Pathao, RedX, or Carrybee, they will automatically appear here."
                            : `No booked consignments currently exist for ${PROVIDER_INFO[selectedCourier]?.label || selectedCourier}.`}
                        </p>
                        <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
                          <Link href="/online-preorders">Go to Online Preorders</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  parcels.map((order) => {
                    const providerKey = (order.courier_partner || "STEADFAST").toUpperCase();
                    const info = PROVIDER_INFO[providerKey] || {
                      label: providerKey,
                      badgeClass: "bg-slate-100 text-slate-700",
                      trackUrl: (_code: string) => `https://steadfast.com.bd/tracking`,
                    };

                    const trackingCode =
                      order.courier_tracking_code || order.steadfast_tracking_code || "";
                    const consignmentId =
                      order.courier_consignment_id || order.steadfast_consignment_id || "";
                    const activeStatus =
                      order.courier_status || order.steadfast_status || order.status;

                    const trackingLink = trackingCode
                      ? info.trackUrl(trackingCode)
                      : consignmentId
                      ? info.trackUrl(consignmentId)
                      : null;

                    const addressStr =
                      typeof order.shipping_address === "string"
                        ? order.shipping_address
                        : order.shipping_address?.address ||
                          order.shipping_address?.city ||
                          "Address on file";

                    return (
                      <TableRow key={order.id} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        {/* Order ID */}
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          <Link
                            href={`/online-preorders?search=${order.id}`}
                            className="hover:text-blue-600 hover:underline flex items-center gap-1"
                          >
                            #{order.id}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </TableCell>

                        {/* Customer Details */}
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {order.customer_name}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {order.customer_phone}
                          </div>
                          <div className="text-muted-foreground text-[11px] truncate max-w-[180px]">
                            {addressStr}
                          </div>
                        </TableCell>

                        {/* Delivery Agent Badge */}
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold ${info.badgeClass}`}>
                            {info.label}
                          </Badge>
                        </TableCell>

                        {/* Consignment & Tracking */}
                        <TableCell>
                          <div className="space-y-1">
                            {consignmentId && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono font-medium">{consignmentId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(consignmentId)}
                                  className="text-slate-400 hover:text-slate-600 ml-0.5"
                                  title="Copy Consignment ID"
                                >
                                  {copiedCode === consignmentId ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            )}

                            {trackingCode && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-muted-foreground">Trk:</span>
                                <span className="font-mono font-medium">{trackingCode}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(trackingCode)}
                                  className="text-slate-400 hover:text-slate-600 ml-0.5"
                                  title="Copy Tracking Code"
                                >
                                  {copiedCode === trackingCode ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            )}

                            {!consignmentId && !trackingCode && (
                              <span className="text-muted-foreground italic text-[11px]">
                                Dispatched
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(activeStatus)}</TableCell>

                        {/* COD Amount */}
                        <TableCell className="text-right font-mono font-medium">
                          ৳{Number(order.total_amount || 0).toLocaleString()}
                        </TableCell>

                        {/* Dispatched At */}
                        <TableCell className="text-muted-foreground text-[11px]">
                          {order.courier_dispatched_at ? (
                            <div>
                              <div>{format(new Date(order.courier_dispatched_at), "dd MMM yyyy")}</div>
                              <div className="text-[10px] text-slate-400">
                                {format(new Date(order.courier_dispatched_at), "hh:mm a")}
                              </div>
                            </div>
                          ) : (
                            format(new Date(order.created_at), "dd MMM yyyy")
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {trackingLink && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] gap-1 text-blue-600 hover:text-blue-700"
                              >
                                <a
                                  href={trackingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    const codeToCopy = trackingCode || consignmentId;
                                    if (codeToCopy) {
                                      handleCopy(codeToCopy);
                                    }
                                  }}
                                  title="Live Courier Tracker (Copies tracking code)"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Track
                                </a>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 border-indigo-200 dark:border-indigo-800"
                              onClick={() => setSelectedParcelForTimeline(order)}
                              title="View Courier Delivery Timeline"
                            >
                              <Clock className="h-3 w-3" />
                              Timeline
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] gap-1"
                              onClick={() => handleSyncStatus(order.id)}
                              disabled={refreshingId === order.id}
                              title="Sync Latest Status with Courier"
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${
                                  refreshingId === order.id ? "animate-spin" : ""
                                }`}
                              />
                              Sync
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Parcel Courier Timeline Sheet */}
      <Sheet
        open={!!selectedParcelForTimeline}
        onOpenChange={(open) => {
          if (!open) setSelectedParcelForTimeline(null);
        }}
      >
        <SheetContent className="sm:max-w-xl w-full p-4 sm:p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <SheetHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              Parcel #{selectedParcelForTimeline?.id} Delivery Journey
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Customer: {selectedParcelForTimeline?.customer_name} ({selectedParcelForTimeline?.customer_phone})
            </p>
          </SheetHeader>

          {selectedParcelForTimeline && (
            <div className="mt-4 space-y-4">
              <CourierTimeline
                order={selectedParcelForTimeline}
                onSyncStatus={async (orderId) => {
                  await handleSyncStatus(orderId);
                  try {
                    const res = await courierApi.getOrderStatus(orderId);
                    if (res.data?.order) {
                      setSelectedParcelForTimeline(res.data.order);
                    }
                  } catch (e) {}
                }}
                isSyncing={refreshingId === selectedParcelForTimeline.id}
                showCardWrapper={false}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

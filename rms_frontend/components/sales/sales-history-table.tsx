"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Eye,
  Calendar,
  User,
  Package,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  FileText,
  TrendingUp,
  Trash2,
  Loader2,
  X,
  CreditCard,
  DollarSign,
  Gift,
  Clock,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Zap,
  Printer,
  RotateCcw,
  Store,
  Truck,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Coins,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSales } from "@/hooks/queries/use-sales";
import type {
  SaleStatus,
  PaymentMethod,
  Sale,
  SaleItem,
  SalePayment,
  DuePayment,
  SaleType,
} from "@/types/sales";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addPayment } from "@/lib/api/sales";
import { useQueryClient } from "@tanstack/react-query";
import { DataExportButton } from "@/components/data-export-button";
import { printThermalReceipt, printA4Invoice } from "@/lib/print-utils";
import { ProcessSaleReturnDialog } from "@/components/sales/process-sale-return-dialog";

// The backend returns customer details in a nested object
interface SaleWithCustomerDetails extends Omit<Sale, "customer"> {
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  } | null;
}

// Helper function to safely convert to number
const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return value;
};

// Format currency using BDT (৳)
const formatBDT = (amount: number | string | undefined) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return `৳${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleType | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "all" | "unpaid" | "partially_paid" | "fully_paid" | "due"
  >("all");
  const [quickFilter, setQuickFilter] = useState<
    "all" | "completed" | "due" | "in_store" | "preorders" | "refunded"
  >("all");

  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [selectedOrder, setSelectedOrder] = useState<SaleWithCustomerDetails | null>(null);
  const [saleToReturn, setSaleToReturn] = useState<SaleWithCustomerDetails | null>(null);
  const [selectedDuePayment, setSelectedDuePayment] = useState<SaleWithCustomerDetails | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [saleToDelete, setSaleToDelete] = useState<SaleWithCustomerDetails | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showCompletePaymentDialog, setShowCompletePaymentDialog] = useState(false);
  const [completeSaleData, setCompleteSaleData] = useState<{
    saleId: number;
    amount: number;
    paymentMethod: string;
    notes: string;
  }>({
    saleId: 0,
    amount: 0,
    paymentMethod: "cash",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Fetch sales and accurate summary totals from custom hook
  const {
    sales = [],
    pagination,
    summary,
    isLoading,
    isFetching,
    refetch,
    error,
    deleteSale,
    deleteAllSales,
    isDeleting,
    isDeletingAll,
  } = useSales({
    status: statusFilter !== "all" ? statusFilter : undefined,
    sale_type: saleTypeFilter !== "all" ? saleTypeFilter : undefined,
    payment_method: paymentFilter !== "all" ? paymentFilter : undefined,
    payment_status: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
    search: debouncedSearchTerm || undefined,
    ordering: sortOrder === "desc" ? `-${sortBy}` : sortBy,
    page,
    page_size: pageSize,
    start_date: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  // Searching indicator
  useEffect(() => {
    setIsSearching(searchTerm !== debouncedSearchTerm);
  }, [searchTerm, debouncedSearchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    statusFilter,
    saleTypeFilter,
    paymentFilter,
    paymentStatusFilter,
    debouncedSearchTerm,
    dateRange,
  ]);

  const typedSales = (sales as unknown as SaleWithCustomerDetails[]) || [];

  // Calculate Accurate Ledger Metrics from Backend Summary
  const metrics = useMemo(() => {
    if (summary) {
      return {
        totalTransactions: summary.total_transactions,
        grossRevenue: summary.gross_revenue,
        totalPaid: summary.total_paid,
        totalDue: summary.total_due,
        totalProfit: summary.total_profit,
        avgTicket: summary.avg_ticket,
        inStoreCount: summary.in_store_count,
        preorderCount: summary.preorder_count,
        dueCount: summary.due_count,
        pillCounts: summary.pill_counts,
      };
    }

    // Fallback while summary loads
    const totalTransactions = pagination?.count || typedSales.length;
    const grossRevenue = typedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const totalPaid = typedSales.reduce((acc, s) => {
      const paid =
        s.amount_paid !== undefined && s.amount_paid !== null
          ? Number(s.amount_paid)
          : s.status === "completed"
          ? Number(s.total)
          : 0;
      return acc + paid;
    }, 0);
    const totalDue = typedSales.reduce((acc, s) => acc + (Number(s.amount_due) || 0), 0);
    const dueCount = typedSales.filter((s) => (Number(s.amount_due) || 0) > 0).length;
    const inStoreCount = typedSales.filter(
      (s) => s.sale_type === "shop" || !s.sale_type
    ).length;
    const preorderCount = typedSales.filter(
      (s) => s.sale_type === "online_preorder" || s.sale_type === "offline_preorder"
    ).length;

    return {
      totalTransactions,
      grossRevenue,
      totalPaid,
      totalDue,
      totalProfit: 0,
      avgTicket: totalTransactions > 0 ? grossRevenue / totalTransactions : 0,
      dueCount,
      inStoreCount,
      preorderCount,
      pillCounts: {
        all: totalTransactions,
        completed: 0,
        due: dueCount,
        in_store: inStoreCount,
        preorders: preorderCount,
        refunded: 0,
      },
    };
  }, [summary, typedSales, pagination]);

  // Handle Quick Filter Switch
  const handleQuickFilter = (
    filter: "all" | "completed" | "due" | "in_store" | "preorders" | "refunded"
  ) => {
    setQuickFilter(filter);
    switch (filter) {
      case "all":
        setStatusFilter("all");
        setSaleTypeFilter("all");
        setPaymentStatusFilter("all");
        break;
      case "completed":
        setStatusFilter("completed");
        setSaleTypeFilter("all");
        setPaymentStatusFilter("all");
        break;
      case "due":
        setStatusFilter("all");
        setSaleTypeFilter("all");
        setPaymentStatusFilter("due");
        break;
      case "in_store":
        setStatusFilter("all");
        setSaleTypeFilter("shop");
        setPaymentStatusFilter("all");
        break;
      case "preorders":
        setStatusFilter("all");
        setSaleTypeFilter("online_preorder");
        setPaymentStatusFilter("all");
        break;
      case "refunded":
        setStatusFilter("refunded");
        setSaleTypeFilter("all");
        setPaymentStatusFilter("all");
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSaleTypeFilter("all");
    setPaymentFilter("all");
    setPaymentStatusFilter("all");
    setQuickFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    saleTypeFilter !== "all" ||
    paymentFilter !== "all" ||
    paymentStatusFilter !== "all" ||
    Boolean(searchTerm) ||
    Boolean(dateRange.from) ||
    Boolean(dateRange.to);

  // Status Badge Rendering
  const getStatusBadge = (status: SaleStatus) => {
    const statusConfig: Record<
      SaleStatus,
      { bg: string; text: string; border: string; label: string }
    > = {
      completed: {
        bg: "bg-emerald-50 dark:bg-emerald-950/60",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200/80 dark:border-emerald-800",
        label: "Completed",
      },
      pending: {
        bg: "bg-amber-50 dark:bg-amber-950/60",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200/80 dark:border-amber-800",
        label: "Pending",
      },
      partially_paid: {
        bg: "bg-orange-50 dark:bg-orange-950/60",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-200/80 dark:border-orange-800",
        label: "Partially Paid",
      },
      gifted: {
        bg: "bg-purple-50 dark:bg-purple-950/60",
        text: "text-purple-700 dark:text-purple-400",
        border: "border-purple-200/80 dark:border-purple-800",
        label: "Gifted",
      },
      cancelled: {
        bg: "bg-rose-50 dark:bg-rose-950/60",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-200/80 dark:border-rose-800",
        label: "Cancelled",
      },
      refunded: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-300/80 dark:border-slate-700",
        label: "Refunded",
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge
        className={`${config.bg} ${config.text} ${config.border} font-semibold text-[11px] rounded-md border shadow-2xs hover:${config.bg}`}
      >
        {config.label}
      </Badge>
    );
  };

  // Sale Channel / Type Badge
  const getSaleTypeBadge = (type: SaleType | undefined) => {
    switch (type) {
      case "online_preorder":
        return (
          <Badge className="bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-800 font-semibold gap-1 text-[11px] rounded-md border hover:bg-sky-50">
            <Truck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>Online Order</span>
          </Badge>
        );
      case "offline_preorder":
        return (
          <Badge className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200/80 dark:border-purple-800 font-semibold gap-1 text-[11px] rounded-md border hover:bg-purple-50">
            <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Preorder</span>
          </Badge>
        );
      case "shop":
      default:
        return (
          <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800 font-semibold gap-1 text-[11px] rounded-md border hover:bg-indigo-50">
            <Store className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>In-Store POS</span>
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Payment method icon
  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "cash":
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5 text-indigo-600" />;
      case "mobile":
      case "mobile_money":
        return <Smartphone className="w-3.5 h-3.5 text-pink-600" />;
      case "gift":
        return <Gift className="w-3.5 h-3.5 text-purple-600" />;
      case "split":
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Coins className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const calculateGiftCostPrice = (sale: SaleWithCustomerDetails) => {
    if (!sale.items) return 0;
    return sale.items.reduce((total, item: any) => {
      const costPrice = item.product?.cost_price || 0;
      const quantity = item.quantity || 0;
      return total + costPrice * quantity;
    }, 0);
  };

  // Due payment handler
  const handleMakePayment = async () => {
    if (!selectedDuePayment || !paymentAmount) return;

    const paymentAmountNum = parseFloat(paymentAmount);
    const amountDue = selectedDuePayment.amount_due || 0;

    if (paymentAmountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmountNum > amountDue) {
      toast({
        title: "Amount Too High",
        description: `Payment amount cannot exceed the due amount of ${formatBDT(amountDue)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      await addPayment(selectedDuePayment.id!, {
        amount: paymentAmountNum,
        payment_method: paymentMethod as any,
        notes: paymentNotes,
      });

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast({
        title: "Payment Recorded",
        description: `Successfully collected ${formatBDT(paymentAmountNum)} for invoice ${selectedDuePayment.invoice_number}`,
      });

      setSelectedDuePayment(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("cash");
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Failed",
        description: err.response?.data?.message || err.message || "Failed to process payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Complete pending sale payment
  const handleCompleteSale = (sale: SaleWithCustomerDetails) => {
    const amount =
      sale.status === "pending"
        ? Number(sale.total)
        : Number(sale.amount_due || sale.total);
    setCompleteSaleData({
      saleId: sale.id!,
      amount: amount,
      paymentMethod: sale.payment_method || "cash",
      notes: "Settled payment from transaction history",
    });
    setShowCompletePaymentDialog(true);
  };

  const handleCompletePayment = async () => {
    if (!completeSaleData.saleId || completeSaleData.amount <= 0) return;

    setIsProcessingPayment(true);
    try {
      await addPayment(completeSaleData.saleId, {
        amount: completeSaleData.amount,
        payment_method: completeSaleData.paymentMethod as any,
        notes: completeSaleData.notes,
      });

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast({
        title: "Sale Completed",
        description: `Payment of ${formatBDT(completeSaleData.amount)} collected successfully.`,
      });

      setShowCompletePaymentDialog(false);
      if (selectedOrder && selectedOrder.id === completeSaleData.saleId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Payment Failed",
        description: err.response?.data?.message || err.message || "Failed to record payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Delete sale handler
  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await deleteSale(saleToDelete.id!);
      setSaleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllClick = () => {
    setShowDeleteAllDialog(true);
  };

  const handleConfirmDeleteAll = async () => {
    try {
      await deleteAllSales();
      setShowDeleteAllDialog(false);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err) {
      console.error(err);
    }
  };

  // Sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const totalPages = pagination?.count ? Math.ceil(pagination.count / pageSize) : 1;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#F8FAFC] dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Failed to load sales history</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            There was an issue connecting to the sales backend. Please check your connection and try fetching the data again.
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="mt-2 gap-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-16 pt-2 px-3 sm:px-6 md:px-8"
      variants={container}
      initial={false}
      animate="show"
    >
      <div className="max-w-[1700px] mx-auto space-y-6 sm:space-y-8">
        {/* Header Section matching Dashboard Aesthetic */}
        <motion.div variants={item}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 text-white">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Sales History
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Records ({metrics.totalTransactions})
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm font-medium">
                  Real-time ledger of POS registers, preorders, payment reconciliations, and customer receipts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
              <DatePickerWithRange value={dateRange} onChange={setDateRange} />

              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium h-9 rounded-xl shadow-2xs"
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
                <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
              </Button>

              <DataExportButton
                title="Rawstitch Sales History Report"
                subtitle={`Filtered Sales Transactions (${typedSales.length} on this page)`}
                headers={[
                  "Invoice #",
                  "Customer Name",
                  "Customer Phone",
                  "Channel",
                  "Date",
                  "Status",
                  "Payment Method",
                  "Total Amount (৳)",
                  "Amount Paid (৳)",
                  "Amount Due (৳)",
                  "Profit (৳)",
                ]}
                getData={() =>
                  typedSales.map((sale) => [
                    sale.invoice_number,
                    sale.customer
                      ? `${sale.customer.first_name || ""} ${sale.customer.last_name || ""}`.trim()
                      : "Walk-in Guest",
                    sale.customer_phone || sale.customer?.phone || "—",
                    sale.sale_type || "Shop",
                    formatDate(sale.date),
                    sale.status,
                    sale.payment_method,
                    sale.total,
                    sale.amount_paid || 0,
                    sale.amount_due || 0,
                    sale.total_profit || 0,
                  ])
                }
              />

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllClick}
                disabled={isLoading || isDeletingAll || typedSales.length === 0}
                className="rounded-xl border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 gap-1.5 text-xs font-semibold h-9"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Executive KPI Cards matching Main Dashboard */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5"
          variants={item}
        >
          {/* Card 1: Total Transactions */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-blue-300/80 dark:hover:border-blue-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Transactions
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Receipt className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
              {metrics.totalTransactions.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800 px-2.5 py-0.5 rounded-full w-fit mt-2.5">
              <Store className="h-3.5 w-3.5" />
              <span>{metrics.inStoreCount} POS In-Store • {metrics.preorderCount} Preorders</span>
            </div>
          </Card>

          {/* Card 2: Gross Sales Revenue */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-emerald-300/80 dark:hover:border-emerald-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gross Sales (Loaded)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <DollarSign className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
              {formatBDT(metrics.grossRevenue)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 px-2.5 py-0.5 rounded-full w-fit mt-2.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>
                {metrics.totalTransactions > 0
                  ? `Avg ${formatBDT(metrics.avgTicket || metrics.grossRevenue / metrics.totalTransactions)} per ticket`
                  : "No sales in current view"}
              </span>
            </div>
          </Card>

          {/* Card 3: Collected Payments */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-indigo-300/80 dark:hover:border-indigo-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cash &amp; Digital Collected
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
              {formatBDT(metrics.totalPaid)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 px-2.5 py-0.5 rounded-full w-fit mt-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                {metrics.grossRevenue > 0
                  ? `${Math.round((metrics.totalPaid / metrics.grossRevenue) * 100)}% realization rate`
                  : "Settled in full"}
              </span>
            </div>
          </Card>

          {/* Card 4: Outstanding Dues */}
          <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-amber-300/80 dark:hover:border-amber-800 transition-all duration-300 p-5 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Outstanding Dues
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                <Clock className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${metrics.totalDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
              {formatBDT(metrics.totalDue)}
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full w-fit mt-2.5 ${
              metrics.dueCount > 0
                ? "text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800"
                : "text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800"
            }`}>
              {metrics.dueCount > 0 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
              <span>{metrics.dueCount > 0 ? `${metrics.dueCount.toLocaleString()} pending customer balances` : "Zero pending balances"}</span>
            </div>
          </Card>
        </motion.div>

        {/* Modern Filter Toolbar */}
        <motion.div variants={item} className="space-y-3">
          {/* Quick Filter Segmented Pills with Exact Database Counts */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs w-fit">
            <button
              type="button"
              onClick={() => handleQuickFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                quickFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              All Sales ({metrics.pillCounts.all.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("completed")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quickFilter === "completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${quickFilter === "completed" ? "bg-white" : "bg-emerald-500"}`}></span>
              <span>Completed ({metrics.pillCounts.completed.toLocaleString()})</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("due")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quickFilter === "due"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${quickFilter === "due" ? "bg-white" : "bg-amber-500"}`}></span>
              <span>With Dues ({metrics.pillCounts.due.toLocaleString()})</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("in_store")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quickFilter === "in_store"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>POS In-Store ({metrics.pillCounts.in_store.toLocaleString()})</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("preorders")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quickFilter === "preorders"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Preorders ({metrics.pillCounts.preorders.toLocaleString()})</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFilter("refunded")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                quickFilter === "refunded"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refunded ({metrics.pillCounts.refunded.toLocaleString()})</span>
            </button>
          </div>

          {/* Live Search & Secondary Filters Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Live Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <Input
                placeholder="Live search by invoice, customer name, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-10 h-10 bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearching && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val: SaleStatus | "all") => {
                  setStatusFilter(val);
                  setQuickFilter("all");
                }}
              >
                <SelectTrigger className="w-36 h-10 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 text-xs">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="gifted">Gifted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={saleTypeFilter}
                onValueChange={(val: SaleType | "all") => {
                  setSaleTypeFilter(val);
                  setQuickFilter("all");
                }}
              >
                <SelectTrigger className="w-36 h-10 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 text-xs">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="shop">POS In-Store</SelectItem>
                  <SelectItem value="online_preorder">Online Preorder</SelectItem>
                  <SelectItem value="offline_preorder">Offline Preorder</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentFilter}
                onValueChange={(val: PaymentMethod | "all") => setPaymentFilter(val)}
              >
                <SelectTrigger className="w-36 h-10 text-xs bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 text-xs">
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="mobile">Mobile / bKash</SelectItem>
                  <SelectItem value="gift">Gift Card</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-10 px-3 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold rounded-xl"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Transactions Table Card */}
        <motion.div variants={item}>
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[950px]">
                <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <TableRow>
                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleSort("invoice_number")}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <span>Invoice / Date</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleSort("customer")}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <span>Customer</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Channel
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Items
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Payment Method
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleSort("total")}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <span>Financials (Total / Due)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status
                    </TableHead>

                    <TableHead className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/60">
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-4 w-28 mb-1.5" />
                          <Skeleton className="h-3 w-20" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-4 w-32 mb-1.5" />
                          <Skeleton className="h-3 w-24" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-6 w-16 rounded-md" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-5 w-24" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right">
                          <Skeleton className="h-8 w-16 ml-auto rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : typedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-56 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                          <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No transactions found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                            {searchTerm
                              ? `No sales matched "${searchTerm}". Try resetting your search or filters.`
                              : "No sales records currently match the selected criteria."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    typedSales.map((sale) => {
                      const customerName = sale.customer
                        ? `${sale.customer.first_name || ""} ${sale.customer.last_name || ""}`.trim() ||
                          "Walk-in Guest"
                        : "Walk-in Guest";
                      const customerPhone = sale.customer_phone || sale.customer?.phone || "";
                      const initials = customerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      const total = Number(sale.total || 0);
                      const due = Number(sale.amount_due || 0);

                      return (
                        <TableRow
                          key={sale.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border-b border-slate-100/90 dark:border-slate-800/80 transition-colors group"
                        >
                          {/* Invoice & Date */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/80">
                                {sale.invoice_number}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{formatDate(sale.date)}</span>
                            </div>
                          </TableCell>

                          {/* Customer */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                {initials || "G"}
                              </div>
                              <div className="truncate max-w-[170px]">
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {customerName}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
                                  {customerPhone || "No contact"}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Channel */}
                          <TableCell className="py-3 px-4">
                            {getSaleTypeBadge(sale.sale_type)}
                          </TableCell>

                          {/* Items */}
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                            >
                              {sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? "s" : ""}
                            </Badge>
                          </TableCell>

                          {/* Payment Method */}
                          <TableCell className="py-3 px-4">
                            {sale.sale_payments && sale.sale_payments.length > 1 ? (
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200/80 dark:border-purple-800 text-[10px] font-bold w-fit gap-1">
                                  <Zap className="w-3 h-3 text-purple-600" />
                                  <span>Split ({sale.sale_payments.length})</span>
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {getPaymentMethodIcon(sale.payment_method)}
                                <span className="capitalize">
                                  {sale.payment_method === "mobile_money"
                                    ? "Mobile"
                                    : sale.payment_method || "Cash"}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* Financials (Total / Due) */}
                          <TableCell className="py-3 px-4">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                              {formatBDT(total)}
                            </div>
                            {sale.status === "gifted" ? (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                Gifted (Cost: {formatBDT(calculateGiftCostPrice(sale))})
                              </div>
                            ) : due > 0 ? (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span>Due: {formatBDT(due)}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Paid in full</span>
                              </div>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 px-4">
                            {sale.status && getStatusBadge(sale.status)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick View Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrder(sale)}
                                className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                                title="View Invoice Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {/* Print Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    title="Print Receipt / Invoice"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs dark:bg-slate-900 dark:border-slate-800">
                                  <DropdownMenuItem
                                    onClick={() => printThermalReceipt(sale as any)}
                                    className="cursor-pointer gap-2 dark:hover:bg-slate-800"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Thermal POS Receipt</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => printA4Invoice(sale as any)}
                                    className="cursor-pointer gap-2 dark:hover:bg-slate-800"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>A4 Tax Invoice</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* More Options Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs dark:bg-slate-900 dark:border-slate-800">
                                  {/* Collect Due Payment */}
                                  {((sale.amount_due && sale.amount_due > 0) ||
                                    sale.status === "pending" ||
                                    sale.status === "partially_paid") && (
                                    <DropdownMenuItem
                                      onClick={() => setSelectedDuePayment(sale)}
                                      className="cursor-pointer text-emerald-700 dark:text-emerald-400 font-semibold gap-2 dark:hover:bg-slate-800"
                                    >
                                      <Coins className="w-3.5 h-3.5" />
                                      <span>Collect Due Payment</span>
                                    </DropdownMenuItem>
                                  )}

                                  {/* Process Return */}
                                  {sale.status !== "refunded" && sale.status !== "cancelled" && (
                                    <DropdownMenuItem
                                      onClick={() => setSaleToReturn(sale)}
                                      className="cursor-pointer text-amber-700 dark:text-amber-400 font-semibold gap-2 dark:hover:bg-slate-800"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Process Return</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator className="dark:bg-slate-800" />

                                  {/* Delete Sale */}
                                  <DropdownMenuItem
                                    onClick={() => setSaleToDelete(sale)}
                                    className="cursor-pointer text-red-600 focus:text-red-700 dark:text-rose-400 dark:focus:text-rose-300 gap-2 font-medium dark:hover:bg-slate-800"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Record</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Polished Pagination Footer */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                <span>Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-18 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800 text-xs">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-slate-400 dark:text-slate-500">
                  Showing {(page - 1) * pageSize + 1} -{" "}
                  {Math.min(page * pageSize, pagination?.count || typedSales.length)} of{" "}
                  {pagination?.count || typedSales.length}
                </span>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page === 1 || isLoading ? "pointer-events-none opacity-40" : "cursor-pointer dark:hover:bg-slate-800"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${p}`}>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setPage(p)}
                                isActive={page === p}
                                className="cursor-pointer rounded-lg dark:hover:bg-slate-800"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      }
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={page === p}
                            className="cursor-pointer rounded-lg dark:hover:bg-slate-800"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={
                        page === totalPages || isLoading
                          ? "pointer-events-none opacity-40"
                          : "cursor-pointer dark:hover:bg-slate-800"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Due Payment Collection Dialog */}
      {selectedDuePayment && (
        <Dialog
          open={!!selectedDuePayment}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDuePayment(null);
              setPaymentAmount("");
              setPaymentNotes("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Collect Due Payment</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Invoice {selectedDuePayment.invoice_number} • Customer:{" "}
                {selectedDuePayment.customer
                  ? `${selectedDuePayment.customer.first_name} ${selectedDuePayment.customer.last_name}`
                  : "Walk-in Guest"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Invoice Amount:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatBDT(selectedDuePayment.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Already Paid:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatBDT(selectedDuePayment.amount_paid || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 dark:border-slate-700 pt-2 text-sm">
                  <span className="font-bold text-amber-900 dark:text-amber-300">Remaining Due:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatBDT(selectedDuePayment.amount_due || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="payment-amount" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payment Amount to Collect (৳)
                  </Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    max={selectedDuePayment.amount_due}
                    className="mt-1 h-9 text-xs font-bold font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaymentAmount((selectedDuePayment.amount_due || 0).toString())
                      }
                      className="text-xs rounded-lg h-7 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      Pay Full Due
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaymentAmount(
                          ((selectedDuePayment.amount_due || 0) / 2).toString()
                        )
                      }
                      className="text-xs rounded-lg h-7 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                    >
                      Pay 50%
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment-method" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method" className="mt-1 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 text-xs">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit / Debit Card</SelectItem>
                      <SelectItem value="mobile_money">bKash / Nagad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Remarks / Notes
                  </Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Cleared via bKash trxFed..."
                    rows={2}
                    className="mt-1 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDuePayment(null)}
                  disabled={isProcessingPayment}
                  className="rounded-xl text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMakePayment}
                  disabled={
                    !paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessingPayment
                  }
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Collect {formatBDT(paymentAmount)}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-200/80 dark:border-indigo-800">
                  {selectedOrder.invoice_number}
                </span>
                {selectedOrder.status && getStatusBadge(selectedOrder.status)}
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                Order &amp; Receipt Summary
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Processed on {formatDate(selectedOrder.date)} • Channel:{" "}
                {selectedOrder.sale_type || "In-Store POS"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Customer Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Customer
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedOrder.customer
                      ? `${selectedOrder.customer.first_name} ${selectedOrder.customer.last_name}`
                      : "Walk-in Customer"}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {selectedOrder.customer_phone || selectedOrder.customer?.phone || "No phone"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Payment Method
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-1 capitalize">
                    {selectedOrder.payment_method === "mobile_money"
                      ? "Mobile"
                      : selectedOrder.payment_method || "Cash"}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Total: {formatBDT(selectedOrder.total)}
                  </div>
                </div>
              </div>

              {/* Items Purchased Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Purchased Items ({selectedOrder.items?.length || 0})
                </div>
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                      <TableRow>
                        <TableHead className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Item</TableHead>
                        <TableHead className="text-[11px] font-bold text-center text-slate-600 dark:text-slate-400">Qty</TableHead>
                        <TableHead className="text-[11px] font-bold text-right text-slate-600 dark:text-slate-400">Price</TableHead>
                        <TableHead className="text-[11px] font-bold text-right text-slate-600 dark:text-slate-400">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <TableRow key={idx} className="text-xs border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="py-2.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {item.product?.name || item.product_name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {[
                                item.product?.sku ? `SKU: ${item.product.sku}` : null,
                                item.size ? `Size: ${item.size}` : null,
                                item.color ? `Color: ${item.color}` : null,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatBDT(item.unit_price)}
                          </TableCell>
                          <TableCell className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatBDT(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Outstanding / Complete payment prompt if due */}
              {selectedOrder.amount_due && Number(selectedOrder.amount_due) > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                  <div>
                    <div className="font-bold">Pending Customer Balance</div>
                    <div>Remaining balance: {formatBDT(selectedOrder.amount_due)}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const order = selectedOrder;
                      setSelectedOrder(null);
                      setSelectedDuePayment(order);
                    }}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8"
                  >
                    Collect Payment
                  </Button>
                </div>
              )}

              {/* Summary Totals */}
              <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-white">
                    {formatBDT(selectedOrder.subtotal)}
                  </span>
                </div>
                {Number(selectedOrder.discount || 0) > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount</span>
                    <span className="font-mono font-bold text-emerald-400">
                      - {formatBDT(selectedOrder.discount)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-amber-400">
                  <span>Total Amount Paid</span>
                  <span className="text-lg font-mono">{formatBDT(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedOrder.status !== "refunded" && selectedOrder.status !== "cancelled" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const order = selectedOrder;
                      setSelectedOrder(null);
                      setSaleToReturn(order);
                    }}
                    className="rounded-xl border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 gap-1.5 text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Process Return</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => printThermalReceipt(selectedOrder as any)}
                  className="rounded-xl text-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700 gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thermal Receipt</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => printA4Invoice(selectedOrder as any)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 Tax Invoice</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!saleToDelete}
        onOpenChange={(open) => {
          if (!open) setSaleToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Delete Transaction Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete invoice{" "}
              <b className="text-slate-800 dark:text-slate-200">{saleToDelete?.invoice_number}</b>? This action will
              permanently erase the sale ledger record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Transaction"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Alert */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-red-600 dark:text-rose-400">
              Delete All Sales Transactions
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Warning: This will permanently wipe all sale ledger records. This action cannot be
              reversed. Are you sure you wish to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Wiping...
                </>
              ) : (
                "Yes, Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Process Sale Return Dialog */}
      <ProcessSaleReturnDialog
        sale={saleToReturn as any}
        open={!!saleToReturn}
        onOpenChange={(open) => !open && setSaleToReturn(null)}
      />
    </motion.div>
  );
}

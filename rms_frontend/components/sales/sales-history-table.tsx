"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Download,
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
} from "lucide-react";
import { useSales } from "@/hooks/queries/use-sales";
import type { SaleStatus, PaymentMethod, Sale, SaleItem, SalePayment, DuePayment, SaleType } from "@/types/sales";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addPayment } from "@/lib/api/sales";
import { useQueryClient } from '@tanstack/react-query';

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

export default function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleType | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">(
    "all"
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "unpaid" | "partially_paid" | "fully_paid">("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedOrder, setSelectedOrder] =
    useState<SaleWithCustomerDetails | null>(null);
  const [selectedDuePayment, setSelectedDuePayment] =
    useState<SaleWithCustomerDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [saleToDelete, setSaleToDelete] =
    useState<SaleWithCustomerDetails | null>(null);
  const [salesToDelete, setSalesToDelete] = useState<number[]>([]);
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
    paymentMethod: 'cash',
    notes: ''
  });

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    sales,
    pagination,
    isLoading,
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
    start_date: dateRange.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  // Show searching indicator when user is typing
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentFilter, paymentStatusFilter, debouncedSearchTerm, dateRange]);

  // Cast the sales array to the correct type since we know the backend returns customer details
  const typedSales = sales as unknown as SaleWithCustomerDetails[];

  const getStatusBadge = (status: SaleStatus) => {
    const statusConfig: Record<SaleStatus, { color: string; label: string }> = {
      completed: {
        color:
          "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
        label: "Completed",
      },
      pending: {
        color:
          "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
        label: "Pending",
      },
      partially_paid: {
        color:
          "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200",
        label: "Partially Paid",
      },
      gifted: {
        color:
          "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200",
        label: "Gifted",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
        label: "Cancelled",
      },
      refunded: {
        color: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
        label: "Refunded",
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={`${config.color}`}>{config.label}</Badge>;
  };

  const getSaleTypeBadge = (type: SaleType | undefined) => {
    // Determine icon and label based on sale type
    let icon, label, style;

    switch (type) {
      case "online_preorder":
        style = "bg-indigo-100 text-indigo-800 border-indigo-200";
        label = "Online Order";
        icon = <Smartphone className="w-3 h-3 mr-1" />;
        break;
      case "offline_preorder":
        style = "bg-purple-100 text-purple-800 border-purple-200";
        label = "Preorder";
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case "shop":
      default:
        style = "bg-gray-100 text-gray-800 border-gray-200";
        label = "In-Store";
        icon = <Package className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <Badge className={`${style} flex items-center w-fit whitespace-nowrap`}>
        {icon} {label}
      </Badge>
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateOrderProfit = (items: SaleItem[]) => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  // Payment system helper functions
  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'mobile':
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'gift':
        return <Gift className="w-4 h-4" />;
      case 'split':
        return <Zap className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentStatusBadge = (sale: SaleWithCustomerDetails) => {
    // If sale status is completed, consider it as paid regardless of payment records
    if (sale.status === 'completed') {
      const hasSplitPayments = sale.sale_payments && sale.sale_payments.length > 1;
      if (hasSplitPayments) {
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Zap className="w-3 h-3 mr-1" />
          Split Completed
        </Badge>;
      } else {
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>;
      }
    }

    if (sale.status === 'gifted') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200">
        <Gift className="w-3 h-3 mr-1" />
        Gifted
      </Badge>;
    }

    // Calculate actual payment totals from individual payments (most reliable)
    const actualPaymentsTotal = sale.sale_payments && sale.sale_payments.length > 0 ?
      sale.sale_payments
        .filter(payment => payment.status === 'completed') // Only count completed payments
        .reduce((sum: number, payment: SalePayment) => sum + (parseFloat(payment.amount.toString()) || 0), 0) : 0;

    // Check different payment scenarios
    const hasSplitPayments = sale.sale_payments && sale.sale_payments.length > 1;
    const hasAnyPayments = sale.sale_payments && sale.sale_payments.length > 0;
    const totalPaidAmount = sale.amount_paid || 0;

    // Use the most reliable payment total (prefer calculated from individual payments)
    const effectivePaymentTotal = hasAnyPayments ? actualPaymentsTotal : totalPaidAmount;

    // Determine if payment is complete (with small tolerance for decimal precision)
    const isPaymentComplete = effectivePaymentTotal >= (sale.total - 0.01);

    // Calculate remaining amount
    const remainingAmount = Math.max(0, sale.total - effectivePaymentTotal);

    // Split payment completed
    if (hasSplitPayments && isPaymentComplete) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <Zap className="w-3 h-3 mr-1" />
        Split Completed
      </Badge>;
    }

    // Regular payment completed
    if (isPaymentComplete && !hasSplitPayments) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>;
    }

    // Partially paid (has some payment but not complete)
    if (effectivePaymentTotal > 0 && remainingAmount > 0) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">
        <Clock className="w-3 h-3 mr-1" />
        ${remainingAmount.toFixed(2)} Due
      </Badge>;
    }

    // Completely unpaid
    return <Badge className="bg-red-100 text-red-800 border-red-200">
      <AlertCircle className="w-3 h-3 mr-1" />
      Unpaid
    </Badge>;
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return `$${num.toFixed(2)}`;
  };

  const calculateGiftCostPrice = (sale: SaleWithCustomerDetails) => {
    if (!sale.items) return 0;
    return sale.items.reduce((total, item: any) => {
      const costPrice = item.product?.cost_price || 0;
      const quantity = item.quantity || 0;
      return total + (costPrice * quantity);
    }, 0);
  };

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
        description: `Payment amount cannot exceed the due amount of ${formatCurrency(amountDue)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Call the API to add payment to the sale
      await addPayment(selectedDuePayment.id!, {
        amount: paymentAmountNum,
        payment_method: paymentMethod as any,
        notes: paymentNotes || `${paymentMethod} payment on due amount`,
        status: 'completed'
      });

      // Determine if this completes the payment
      const isCompletePayment = paymentAmountNum >= amountDue;

      toast({
        title: isCompletePayment ? "Payment Completed" : "Partial Payment Processed",
        description: isCompletePayment
          ? `Payment of ${formatCurrency(paymentAmountNum)} completed. Sale status updated to completed.`
          : `Partial payment of ${formatCurrency(paymentAmountNum)} processed. Remaining due: ${formatCurrency(amountDue - paymentAmountNum)}.`,
      });

      setSelectedDuePayment(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("cash");

      // Refresh the sales data to show updated status
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleViewSale = (sale: SaleWithCustomerDetails) => {
    setSelectedOrder(sale);
  };

  const handleCompleteSale = (sale: SaleWithCustomerDetails) => {
    const amountDue = sale.status === 'pending' ? sale.total : (sale.amount_due || 0);
    setCompleteSaleData({
      saleId: sale.id!,
      amount: amountDue,
      paymentMethod: 'cash',
      notes: ''
    });
    setShowCompletePaymentDialog(true);
  };

  const handleCompletePayment = async () => {
    try {
      setIsProcessingPayment(true);

      // Call the API to add payment to the sale
      await addPayment(completeSaleData.saleId, {
        amount: completeSaleData.amount,
        payment_method: completeSaleData.paymentMethod as any,
        notes: completeSaleData.notes,
        status: 'completed'
      });

      toast({
        title: "Payment Completed",
        description: `Payment of ${formatCurrency(completeSaleData.amount)} has been processed successfully.`,
      });

      setShowCompletePaymentDialog(false);
      // Refresh the sales data
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    } catch (error) {
      console.error('Error completing payment:', error);
      toast({
        title: "Error",
        description: "Failed to complete payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDeleteSaleClick = (sale: SaleWithCustomerDetails) => {
    setSaleToDelete(sale);
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete?.id) {
      return;
    }
    try {
      await deleteSale(saleToDelete.id);
      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
      setSaleToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sale. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllClick = () => {
    setShowDeleteAllDialog(true);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteAllSales();
      setShowDeleteAllDialog(false);
    } catch (error) {
      console.error("Error in delete all:", error);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPaymentStatusFilter("all");
    setDateRange({ from: undefined, to: undefined });
    setPage(1);
  };

  const totalPages = Math.ceil((pagination?.count || 0) / pageSize);

  // CSV Export utility
  function salesToCSV(sales: SaleWithCustomerDetails[]) {
    const header = [
      "Invoice Number",
      "Customer Name",
      "Customer Phone",
      "Date",
      "Status",
      "Payment Method",
      "Total",
      "Profit",
      "Items",
    ];
    const rows = sales.map((sale) => [
      sale.invoice_number,
      sale.customer
        ? `${sale.customer.first_name} ${sale.customer.last_name}`
        : "Guest",
      sale.customer_phone || sale.customer?.phone || "",
      formatDate(sale.date),
      sale.status,
      sale.payment_method,
      sale.total,
      sale.total_profit,
      sale.items?.length || 0,
    ]);
    return [header, ...rows].map((row) => row.join(",")).join("\n");
  }

  function handleExport() {
    const csv = salesToCSV(typedSales);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `sales_export_${Date.now()}.csv`);
  }

  function handleReport() {
    const doc = new jsPDF();
    doc.text("Sales Report", 14, 16);
    const tableColumn = [
      "Invoice Number",
      "Customer Name",
      "Customer Phone",
      "Date",
      "Status",
      "Payment Method",
      "Total",
      "Profit",
      "Items",
    ];
    const tableRows = typedSales.map((sale) => [
      sale.invoice_number,
      sale.customer
        ? `${sale.customer.first_name} ${sale.customer.last_name}`
        : "Guest",
      sale.customer_phone || sale.customer?.phone || "",
      formatDate(sale.date),
      sale.status,
      sale.payment_method,
      sale.total,
      sale.total_profit,
      sale.items?.length || 0,
    ]);
    // @ts-ignore: jsPDF autotable is attached at runtime
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 24 });
    doc.save(`sales_report_${Date.now()}.pdf`);
  }

  // Loading skeleton for table rows
  const TableSkeleton = () => (
    <>
      {[...Array(pageSize)].map((_, i) => (
        <TableRow key={i} className="border-gray-100">
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-lg font-medium">
              Error loading sales history
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header - Always visible */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 md:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Sales History
            </h1>
            <p className="text-xs sm:text-sm md:text-lg text-gray-600">
              View and manage all sales transactions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="bg-white border-gray-200 shadow-sm hover:bg-gray-50 text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              onClick={handleExport}
              disabled={isLoading}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Export
            </Button>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              onClick={handleReport}
              disabled={isLoading}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Report
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 shadow-lg flex items-center text-xs sm:text-sm h-8 sm:h-9 md:h-10"
              onClick={handleDeleteAllClick}
              disabled={isLoading || isDeletingAll}
            >
              {isDeletingAll ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              )}
              Delete All
            </Button>
          </div>
        </div>

        {/* Filters - Always visible */}
        <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by invoice, customer name, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 h-9 sm:h-10 md:h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                  />
                  {/* Search indicators */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {isSearching && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Search results indicator */}
                {debouncedSearchTerm && (
                  <div className="mt-2 text-sm text-gray-600">
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Searching...
                      </span>
                    ) : (
                      <span>
                        Found {pagination?.count || 0} results for "
                        {debouncedSearchTerm}"
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: SaleStatus | "all") =>
                  setStatusFilter(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-36 md:w-48 h-9 sm:h-10 md:h-12 bg-gray-50 border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
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
                onValueChange={(value: SaleType | "all") =>
                  setSaleTypeFilter(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-36 md:w-48 h-9 sm:h-10 md:h-12 bg-gray-50 border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Sale Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="shop">In-Store</SelectItem>
                  <SelectItem value="online_preorder">Online Preorder</SelectItem>
                  <SelectItem value="offline_preorder">Offline Preorder</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentFilter}
                onValueChange={(value: PaymentMethod | "all") =>
                  setPaymentFilter(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-36 md:w-48 h-9 sm:h-10 md:h-12 bg-gray-50 border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="gift">Gift Card</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentStatusFilter}
                onValueChange={(value: "all" | "unpaid" | "partially_paid" | "fully_paid") =>
                  setPaymentStatusFilter(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-36 md:w-48 h-9 sm:h-10 md:h-12 bg-gray-50 border-gray-200 text-xs sm:text-sm">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-9 sm:h-10 md:h-12 px-3 sm:px-4 md:px-6 bg-gray-50 border-gray-200 hover:bg-gray-100 text-xs sm:text-sm w-full sm:w-auto"
                disabled={isLoading}
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                More Filters
              </Button>
              {(statusFilter !== "all" || saleTypeFilter !== "all" || paymentFilter !== "all" || paymentStatusFilter !== "all" || searchTerm || dateRange.from || dateRange.to) && (
                <Button
                  variant="outline"
                  className="h-9 sm:h-10 md:h-12 px-3 sm:px-4 bg-red-50 border-red-200 hover:bg-red-100 text-red-600 text-xs sm:text-sm w-full sm:w-auto"
                  onClick={clearAllFilters}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-5 bg-slate-50/40 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div>
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                  Transaction History
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Showing ${sales.length} of ${pagination?.count || 0
                    } transactions`
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-500">Sort:</span>
                <Select
                  value={sortBy}
                  onValueChange={setSortBy}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="total">Amount</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 md:px-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0 scrollbar-thin">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("invoice_number")}
                        className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                        disabled={isLoading}
                      >
                        Invoice
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("customer")}
                        className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                        disabled={isLoading}
                      >
                        Customer
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("date")}
                        className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                        disabled={isLoading}
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Type
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Items
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Payment Method
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("total")}
                        className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                        disabled={isLoading}
                      >
                        Total / Paid
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Payment Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : typedSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="space-y-3">
                          <div className="text-gray-500 text-lg">
                            No sales found
                          </div>
                          {debouncedSearchTerm && (
                            <div className="text-sm text-gray-400">
                              Try adjusting your search terms or filters
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    typedSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="hover:bg-gray-50 transition-colors border-gray-100"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {sale.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">
                              {sale.customer
                                ? `${sale.customer.first_name} ${sale.customer.last_name}`
                                : "Guest"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sale.customer_phone || sale.customer?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(sale.date)}
                        </TableCell>
                        <TableCell>
                          {getSaleTypeBadge(sale.sale_type)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-semibold px-2 py-0.5"
                          >
                            {sale.items?.length || 0} item
                            {sale.items?.length !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.sale_payments && sale.sale_payments.length > 1 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {sale.sale_payments.map((payment: SalePayment, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs">
                                    {getPaymentMethodIcon(payment.payment_method)}
                                    <span className="capitalize">
                                      {payment.payment_method === 'mobile_money' ? 'Mobile' : payment.payment_method}
                                    </span>
                                    <span className="text-gray-600">
                                      {formatCurrency(payment.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-blue-600 font-medium">
                                Split Payment ({sale.sale_payments.length} methods)
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(sale.payment_method)}
                              <span className="capitalize text-gray-700 text-sm">
                                {sale.payment_method === 'mobile_money' ? 'Mobile' : sale.payment_method}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(sale.total)}
                            </div>
                            {sale.status === 'gifted' ? (
                              <div className="text-sm text-purple-600">
                                Add as expense {formatCurrency(calculateGiftCostPrice(sale))}
                              </div>
                            ) : sale.status === 'completed' ? (
                              <div className="text-sm text-green-600">
                                Paid: {formatCurrency(sale.total)}
                              </div>
                            ) : (
                              <>
                                {sale.amount_paid !== undefined && sale.amount_paid > 0 && (
                                  <div className="text-sm text-green-600">
                                    Paid: {formatCurrency(sale.amount_paid)}
                                  </div>
                                )}
                                {sale.amount_due !== undefined && sale.amount_due > 0 && (
                                  <div className="text-sm text-red-600">
                                    Due: {formatCurrency(sale.amount_due)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(sale)}
                        </TableCell>
                        <TableCell>
                          {sale.status && getStatusBadge(sale.status)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewSale(sale)}
                                className="cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {((sale.amount_due && sale.amount_due > 0) || sale.status === 'pending') && (
                                <DropdownMenuItem
                                  onClick={() => setSelectedDuePayment(sale)}
                                  className="cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                                >
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Make Payment
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteSaleClick(sale)}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Sale
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page === 1 || isLoading
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 || p === totalPages || Math.abs(p - page) <= 1
                      );
                    })
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
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        page === totalPages || isLoading
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!saleToDelete}
        onOpenChange={(open) => {
          if (!open) setSaleToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sale{" "}
              {saleToDelete?.invoice_number}. This action cannot be undone. Are
              you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSale}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Sale"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Dialog */}
      <AlertDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Sales</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL sales data from the system, including
              completed, pending, and cancelled sales. This action cannot be
              undone. Are you absolutely sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Sales"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Make Payment Dialog */}
      {selectedDuePayment && (
        <Dialog
          open={!!selectedDuePayment}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDuePayment(null);
              setPaymentAmount("");
              setPaymentNotes("");
              setPaymentMethod("cash");
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Make Payment - {selectedDuePayment.invoice_number}
              </DialogTitle>
              <DialogDescription>
                Process payment for outstanding balance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Payment Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedDuePayment.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedDuePayment.amount_paid || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Amount Due:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(selectedDuePayment.amount_due || 0)}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="payment-amount">Payment Amount</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    step="0.01"
                    min="0"
                    max={selectedDuePayment.amount_due}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount((selectedDuePayment.amount_due || 0).toString())}
                      className="text-xs"
                    >
                      Pay Full Amount
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(((selectedDuePayment.amount_due || 0) / 2).toString())}
                      className="text-xs"
                    >
                      Pay Half
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Payment notes..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Payment Status Indicator */}
              {paymentAmount && parseFloat(paymentAmount) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm">
                    {parseFloat(paymentAmount) >= (selectedDuePayment.amount_due || 0) ? (
                      <div className="text-green-700 font-medium">
                        ✅ This will complete the payment and mark the sale as completed
                      </div>
                    ) : (
                      <div className="text-orange-700">
                        ⏳ This will be a partial payment. Remaining due: {formatCurrency((selectedDuePayment.amount_due || 0) - parseFloat(paymentAmount))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDuePayment(null);
                    setPaymentAmount("");
                    setPaymentNotes("");
                    setPaymentMethod("cash");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMakePayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessingPayment}
                  className="flex-1"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency(paymentAmount)}`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Order Details - {selectedOrder.invoice_number}
              </DialogTitle>
              <DialogDescription>
                Complete transaction information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      Customer
                    </span>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="font-medium text-gray-900">
                      {selectedOrder.customer
                        ? `${selectedOrder.customer.first_name} ${selectedOrder.customer.last_name}`
                        : "Guest Customer"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedOrder.customer_phone ||
                        selectedOrder.customer?.phone}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-900">
                      Date & Time
                    </span>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">
                      {formatDate(selectedOrder.date)}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Status</span>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    {selectedOrder.status &&
                      getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-gray-900">
                    Items Purchased
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">
                          {item.product?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="bg-gray-200 px-2 py-1 rounded mr-2">
                            {item.size}
                          </span>
                          <span className="bg-gray-200 px-2 py-1 rounded mr-2">
                            {item.color}
                          </span>
                          <span className="font-medium">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {item.product?.sku}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-semibold text-gray-900">
                          ${toNumber(item.total).toFixed(2)}
                        </div>
                        <div className="text-sm text-emerald-600 font-medium">
                          Profit: ${toNumber(item.profit).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              {selectedOrder.sale_payments && selectedOrder.sale_payments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-900">Payment Methods</span>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.sale_payments.map((payment: SalePayment, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="capitalize font-medium">
                            {payment.payment_method === 'mobile_money' ? 'Mobile' : payment.payment_method}
                          </span>
                          {payment.is_gift_payment && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              Gift
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-gray-500">{payment.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Due Payment Information */}
              {selectedOrder.amount_due && selectedOrder.amount_due > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-gray-900">Outstanding Balance</span>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(selectedOrder.amount_paid || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="font-semibold">Amount Due:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(selectedOrder.amount_due)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gift Information */}
              {selectedOrder.gift_amount && selectedOrder.gift_amount > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">Gift Information</span>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="space-y-2">
                      <div className="text-sm text-purple-800">
                        This sale includes a gift amount of <span className="font-semibold">{formatCurrency(selectedOrder.gift_amount)}</span>
                      </div>
                      <div className="text-xs text-purple-600">
                        Gift payments are recorded as expenses and do not count toward sales revenue.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Sale Button for Pending/Due Sales */}
              {(selectedOrder.status === 'pending' || (selectedOrder.amount_due && selectedOrder.amount_due > 0)) && (
                <div className="border-t pt-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">Complete Payment</h4>
                        <p className="text-sm text-blue-700">
                          {selectedOrder.status === 'pending'
                            ? `Complete the payment of ${formatCurrency(selectedOrder.total)}`
                            : `Pay remaining balance of ${formatCurrency(selectedOrder.amount_due)}`
                          }
                        </p>
                      </div>
                      <Button
                        onClick={() => handleCompleteSale(selectedOrder)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Complete Sale
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="border-t pt-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedOrder.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedOrder.tax)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium">
                        -{formatCurrency(selectedOrder.discount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Primary Payment:</span>
                      <span className="font-medium capitalize">
                        {selectedOrder.payment_method === 'mobile_money' ? 'Mobile' : selectedOrder.payment_method}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-green-300 mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        Total:
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(selectedOrder.total)}
                      </span>
                    </div>
                    {selectedOrder.total_profit !== undefined && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-semibold text-emerald-700">
                          Total Profit:
                        </span>
                        <span className="text-2xl font-bold text-emerald-700">
                          {formatCurrency(selectedOrder.total_profit)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Complete Payment Dialog */}
      <Dialog open={showCompletePaymentDialog} onOpenChange={setShowCompletePaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>
              Complete the payment for this sale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Amount to Pay</Label>
              <Input
                type="number"
                value={completeSaleData.amount}
                onChange={(e) => setCompleteSaleData(prev => ({
                  ...prev,
                  amount: parseFloat(e.target.value) || 0
                }))}
                className="mt-1"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select
                value={completeSaleData.paymentMethod}
                onValueChange={(value) => setCompleteSaleData(prev => ({
                  ...prev,
                  paymentMethod: value
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                value={completeSaleData.notes}
                onChange={(e) => setCompleteSaleData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                className="mt-1"
                placeholder="Add any notes about this payment..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompletePaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePayment}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isProcessingPayment}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessingPayment ? "Processing..." : "Complete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

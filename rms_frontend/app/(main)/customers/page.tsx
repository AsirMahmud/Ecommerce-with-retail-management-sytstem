"use client";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { DataExportButton, type CustomExportOption } from "@/components/data-export-button";
import { exportToMetaAudienceCSV } from "@/lib/export-utils";
import axiosInstance from "@/lib/api/axios-config";
import {
  Download,
  Search,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Filter,
  ArrowUpDown,
  Trash2,
  Crown,
  Trophy,
  Medal,
  Award,
  Star,
  Users,
  TrendingUp,
  Target,
  Zap,
  Upload,
  Store,
  Globe,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  CustomerCsvImportModal,
  downloadCustomerCsvTemplateFile,
} from "@/components/customers/customer-csv-import-modal";
import {
  useCustomers,
  useActiveCustomers,
  useSearchCustomers,
  useDeleteCustomer,
  usePermanentDeleteCustomer,
  useBulkDeleteCustomers,
  useCustomerAnalytics,
} from "@/hooks/queries/use-customer";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteAllCustomers } from "@/lib/api/customer";
import { TopCustomersAnalysis } from "@/components/customers/top-customers-analysis";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";

type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  total_sales: number;
  sales_count: number;
  last_sale_date: string | null;
  is_active: boolean;
  ranking?: number;
  is_top_customer?: boolean;
  customer_type?: "shop" | "online" | "both";
};

const rankingIcons = [
  { icon: Crown, color: "text-yellow-500", bgColor: "bg-yellow-100", label: "Top 5" },
  { icon: Trophy, color: "text-gray-500", bgColor: "bg-gray-100", label: "Top 10" },
  { icon: Medal, color: "text-amber-600", bgColor: "bg-amber-100", label: "Top 20" },
  { icon: Award, color: "text-blue-500", bgColor: "bg-blue-100", label: "Top 30" },
  { icon: Star, color: "text-purple-500", bgColor: "bg-purple-100", label: "Top 50" },
];

const getRankingIcon = (ranking: number) => {
  if (ranking <= 5) return rankingIcons[0];
  if (ranking <= 10) return rankingIcons[1];
  if (ranking <= 20) return rankingIcons[2];
  if (ranking <= 30) return rankingIcons[3];
  if (ranking <= 50) return rankingIcons[4];
  if (ranking <= 100) return { icon: Users, color: "text-green-500", bgColor: "bg-green-100", label: "Top 100" };
  return null;
};

const columns: ColumnDef<Customer>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "ranking",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Rank
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const ranking = row.getValue("ranking") as number;
      
      if (!ranking) return "-";
      
      const rankingIcon = getRankingIcon(ranking);
      
      if (rankingIcon) {
        const IconComponent = rankingIcon.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full ${rankingIcon.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${rankingIcon.color}`} />
            </div>
            <Badge variant="secondary" className="text-xs">
              #{ranking}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {rankingIcon.label}
            </span>
          </div>
        );
      }
      
      return (
        <Badge variant="outline" className="text-xs">
          #{ranking}
        </Badge>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = `${row.original.first_name} ${row.original.last_name}`;
      const isTopCustomer = row.original.is_top_customer;
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={`https://avatar.vercel.sh/${row.original.id}`}
              alt={name}
            />
            <AvatarFallback>
              {name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <Link
              href={`/customers/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {name}
            </Link>
            {isTopCustomer && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "total_sales",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Total Sales
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue("total_sales"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
      return formatted;
    },
  },
  {
    accessorKey: "sales_count",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Sales Count
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "last_sale_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-medium"
        >
          Last Sale
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("last_sale_date");
      return date ? new Date(date as string).toLocaleDateString() : "No sales";
    },
  },
  {
    accessorKey: "customer_type",
    header: "Channel",
    cell: ({ row }) => {
      const type = row.original.customer_type || "shop";
      if (type === "both") {
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs gap-1 py-0.5 font-medium">
            <Sparkles className="h-3 w-3 text-purple-600" />
            Omni (Both)
          </Badge>
        );
      }
      if (type === "online") {
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs gap-1 py-0.5 font-medium">
            <Globe className="h-3 w-3 text-indigo-600" />
            Online
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs gap-1 py-0.5 font-medium">
          <Store className="h-3 w-3 text-blue-600" />
          Offline (Shop)
        </Badge>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("is_active") as boolean;
      return (
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
            status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {status ? "Active" : "Inactive"}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original;
      const permanentDeleteCustomer = usePermanentDeleteCustomer();
      const { toast } = useToast();

      const handlePermanentDeleteCustomer = async (customerId: number) => {
        try {
          await permanentDeleteCustomer.mutateAsync(customerId);
          toast({
            title: "Success",
            description: "Customer permanently deleted",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete customer",
            variant: "destructive",
          });
        }
      };

      return (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/customers/${customer.id}`}>View</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  customer and all associated data from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handlePermanentDeleteCustomer(customer.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("ranking");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [channelTab, setChannelTab] = useState<"all" | "shop" | "online">("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  useEffect(() => {
    setDebouncedSearchQuery(debouncedQuery);
    setCurrentPage(1); // Reset to first page when searching
  }, [debouncedQuery]);
  
  // Prepare filters for API
  const apiFilters = useMemo(() => {
    const filters: any = {};

    if (channelTab !== "all") {
      filters.customer_type = channelTab;
    }
    
    if (filterBy !== "all") {
      if (filterBy.startsWith("top-")) {
        filters.ranking_filter = filterBy;
      } else if (filterBy === "high-value" || filterBy === "low-value") {
        filters.sales_filter = filterBy;
      } else if (filterBy === "recent") {
        filters.recent_filter = filterBy;
      }
    }
    
    if (sortBy) {
      const orderPrefix = sortOrder === "desc" ? "-" : "";
      filters.ordering = `${orderPrefix}${sortBy}`;
    }
    
    return filters;
  }, [channelTab, filterBy, sortBy, sortOrder]);
  
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(currentPage, pageSize, apiFilters);
  const { data: searchResults, isLoading: isLoadingSearch } = useSearchCustomers(debouncedSearchQuery, currentPage, pageSize, apiFilters);
  const { data: analytics, isLoading: isLoadingAnalytics } = useCustomerAnalytics();
  
  const bulkDeleteCustomers = useBulkDeleteCustomers();
  const { toast } = useToast();

  // Determine which data to display based on search
  let displayData = customersData;
  let isLoading = isLoadingCustomers;
  
  if (debouncedSearchQuery) {
    displayData = searchResults;
    isLoading = isLoadingSearch;
  }

  const customers = displayData?.results || [];
  const totalItems = displayData?.count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).map(
      (index) => customers[parseInt(index)].id
    );

    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one customer to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      await bulkDeleteCustomers.mutateAsync(selectedIds);
      setRowSelection({});
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleDeleteAllCustomers = async () => {
    try {
      await deleteAllCustomers();
      toast({
        title: "Success",
        description: "All customers have been deleted successfully",
      });
      // Refresh the customers list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete all customers",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setRowSelection({});
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setRowSelection({});
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const customerExportHeaders = [
    "Rank",
    "Customer Name",
    "Phone",
    "Email",
    "Channel",
    "Total Spent (BDT)",
    "Orders Count",
    "Last Purchase",
    "Status",
  ];

  const formatCustomerExportRow = (c: any) => {
    const name = c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer";
    const channel = c.customer_type === "online" ? "Online" : c.customer_type === "both" ? "Both" : "Offline";
    const totalSpent = c.total_sales != null ? `BDT ${Number(c.total_sales).toLocaleString()}` : "BDT 0";
    const lastPurchase = c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : "No sales";
    const status = c.is_active ? "Active" : "Inactive";

    return [
      c.ranking ? `#${c.ranking}` : "-",
      name,
      c.phone || "-",
      c.email || "-",
      channel,
      totalSpent,
      c.sales_count ?? 0,
      lastPurchase,
      status,
    ];
  };

  const getCustomerExportData = async () => {
    // If rows are selected with checkboxes, export only selected rows
    const selectedRowKeys = Object.keys(rowSelection).filter(
      (k) => (rowSelection as Record<string, boolean>)[k]
    );

    if (selectedRowKeys.length > 0 && customers.length > 0) {
      const selectedCustomers = selectedRowKeys
        .map((idx) => customers[parseInt(idx, 10)])
        .filter(Boolean);

      if (selectedCustomers.length > 0) {
        return selectedCustomers.map(formatCustomerExportRow);
      }
    }

    // Otherwise, fetch all matching customers using high-performance export endpoint
    try {
      const params: Record<string, any> = { ...apiFilters };
      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery;
      }

      const res = await axiosInstance.get("/customer/customers/export_data/", { params });
      const records = Array.isArray(res.data) ? res.data : (res.data?.results || []);

      if (records.length > 0) {
        return records.map(formatCustomerExportRow);
      }
    } catch (err) {
      console.warn("Export endpoint error, falling back to current page data:", err);
    }

    // Fallback: export current page customers
    if (customers.length > 0) {
      return customers.map(formatCustomerExportRow);
    }

    return [];
  };

  const handleExportMetaAudience = async () => {
    // 1. If rows are selected via table checkboxes, export only selected rows
    const selectedRowKeys = Object.keys(rowSelection).filter(
      (k) => (rowSelection as Record<string, boolean>)[k]
    );

    let recordsToExport: any[] = [];

    if (selectedRowKeys.length > 0 && customers.length > 0) {
      recordsToExport = selectedRowKeys
        .map((idx) => customers[parseInt(idx, 10)])
        .filter(Boolean);
    } else {
      // Fetch all matching customers from export_data endpoint
      try {
        const params: Record<string, any> = { ...apiFilters };
        if (debouncedSearchQuery) {
          params.search = debouncedSearchQuery;
        }

        const res = await axiosInstance.get("/customer/customers/export_data/", { params });
        recordsToExport = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      } catch (err) {
        console.warn("Failed to fetch full customer list for Meta export:", err);
        recordsToExport = customers;
      }
    }

    if (!recordsToExport || recordsToExport.length === 0) {
      toast({
        title: "No Data",
        description: "No customer records available to export for Meta Audience.",
        variant: "destructive",
      });
      return;
    }

    const filename = `meta_custom_audience_value_based_${channelTab}_${new Date().toISOString().split("T")[0]}`;
    exportToMetaAudienceCSV(filename, recordsToExport);

    toast({
      title: "Meta Audience Export Ready",
      description: `Exported ${recordsToExport.length} value-based customer records matching Meta Custom Audience template.`,
    });
  };

  const metaAudienceExportOption: CustomExportOption[] = [
    {
      label: "Meta / Facebook Audience (Value-Based CSV)",
      description: "19-col LTV template for Meta Ad Manager & re-importing",
      icon: <Target className="w-4 h-4 text-indigo-600 shrink-0" />,
      badge: "Meta Ads",
      onClick: handleExportMetaAudience,
    },
  ];

  return (
    <div className="container mx-auto py-3 sm:py-6 px-2 sm:px-4 space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" />
            Customer Portal (Offline &amp; Online)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your offline in-store customers and online audience in one unified portal
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCustomerCsvTemplateFile}
            className="text-xs font-semibold gap-1.5 rounded-xl border-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            CSV Template
          </Button>
          <Button
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs font-semibold gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <DataExportButton
            title="Customers Directory"
            filename={`customers_${channelTab}_${new Date().toISOString().split("T")[0]}`}
            subtitle={`Rawstitch CRM Customer Export (${channelTab.toUpperCase()} Channel) • Total Records: ${totalItems || customers.length}`}
            headers={customerExportHeaders}
            getData={getCustomerExportData}
            customOptions={metaAudienceExportOption}
            orientation="landscape"
          />
          <Button asChild size="sm" className="text-xs font-semibold rounded-xl">
            <Link href="/customers/new">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.total_customers || 0}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={15} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    +15% from last month
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics?.active_customers || 0}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress
                    value={analytics ? (analytics.active_customers / analytics.total_customers) * 100 : 0}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {analytics ? Math.round((analytics.active_customers / analytics.total_customers) * 100) : 0}% of total
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(analytics?.total_sales || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={5} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    +5% from last month
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(analytics?.average_order_value || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={5} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    +5% from last month
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Analysis */}
      <TopCustomersAnalysis />

      {/* Channel Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
        <div className="grid grid-cols-3 w-full sm:w-[460px] bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              setChannelTab("all");
              setCurrentPage(1);
            }}
            className={`text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 py-2 transition-all ${
              channelTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            All Customers ({analytics?.total_customers || totalItems})
          </button>
          <button
            type="button"
            onClick={() => {
              setChannelTab("shop");
              setCurrentPage(1);
            }}
            className={`text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 py-2 transition-all ${
              channelTab === "shop"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Store className="h-3.5 w-3.5 text-blue-600" />
            Offline (Shop)
          </button>
          <button
            type="button"
            onClick={() => {
              setChannelTab("online");
              setCurrentPage(1);
            }}
            className={`text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 py-2 transition-all ${
              channelTab === "online"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600" />
            Online
          </button>
        </div>
        <div className="flex items-center gap-2 px-2">
          <Badge variant="outline" className="text-[11px] font-medium bg-white/80 dark:bg-slate-900/80">
            Current Filter:{" "}
            {channelTab === "all"
              ? "All Channels"
              : channelTab === "shop"
              ? "Offline / Shop POS"
              : "Online Preorders & Web"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        {Object.keys(rowSelection).length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({Object.keys(rowSelection).length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  {Object.keys(rowSelection).length === 1
                    ? " the selected customer"
                    : ` ${
                        Object.keys(rowSelection).length
                      } selected customers`}{" "}
                  and all associated data from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Customer List
            {debouncedSearchQuery && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Search results for "{debouncedSearchQuery}" ({totalItems} found)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Manage your customers and view their purchase history.
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers by name, email, or phone..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {debouncedSearchQuery && isLoadingSearch && (
                <div className="absolute right-2.5 top-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-full sm:w-[160px] flex-1 sm:flex-initial">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="recent">Recent Customers</SelectItem>
                  <SelectItem value="high-value">High Value</SelectItem>
                  <SelectItem value="low-value">Low Value</SelectItem>
                  <SelectItem value="top-20">Top 20</SelectItem>
                  <SelectItem value="top-30">Top 30</SelectItem>
                  <SelectItem value="top-50">Top 50</SelectItem>
                  <SelectItem value="top-100">Top 100</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[140px] flex-1 sm:flex-initial">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranking">Rank</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="total_sales">Total Sales</SelectItem>
                  <SelectItem value="sales_count">Sales Count</SelectItem>
                  <SelectItem value="last_sale_date">Last Sale</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                className="shrink-0"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title="Toggle Sort Direction"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <DataExportButton
                title="Customer Directory"
                filename={`customers_${channelTab}_${new Date().toISOString().split("T")[0]}`}
                subtitle={`Rawstitch CRM Customer Export (${channelTab.toUpperCase()} Channel) • Total Records: ${totalItems || customers.length}`}
                headers={customerExportHeaders}
                getData={getCustomerExportData}
                customOptions={metaAudienceExportOption}
                orientation="landscape"
                className="shrink-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={customers || []}
                enableRowSelection
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Customers
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  customers and their associated data from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllCustomers}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete All Customers
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button asChild>
            <Link href="/customers/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* CSV Import Modal */}
      <CustomerCsvImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        defaultCustomerType={channelTab === "online" ? "online" : "shop"}
        onImportComplete={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}

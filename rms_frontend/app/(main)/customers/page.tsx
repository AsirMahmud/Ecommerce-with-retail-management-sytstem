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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { DataExportButton } from "@/components/data-export-button";
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
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  
  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  useEffect(() => {
    setDebouncedSearchQuery(debouncedQuery);
    setCurrentPage(1); // Reset to first page when searching
  }, [debouncedQuery]);
  
  // Prepare filters for API
  const apiFilters = useMemo(() => {
    const filters: any = {};
    
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
  }, [filterBy, sortBy, sortOrder]);
  
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

  return (
    <div className="container mx-auto py-3 sm:py-6 px-2 sm:px-4 space-y-4 sm:space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Customer Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your customer relationships and track their activity
          </p>
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
                subtitle={`Showing ${customers.length} customer records`}
                headers={["Rank", "Customer Name", "Email", "Phone", "Total Spent ($)", "Sales Count", "Last Sale", "Status"]}
                getData={() =>
                  customers.map((c: any) => [
                    c.ranking || "-",
                    c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer",
                    c.email || "-",
                    c.phone || "-",
                    c.total_sales || 0,
                    c.sales_count || 0,
                    c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : "-",
                    c.is_active ? "Active" : "Inactive",
                  ])
                }
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
          <Button asChild>
            <Link href="/customers/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

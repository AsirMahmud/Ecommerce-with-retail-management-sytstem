"use client";

import React, { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Search,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { useDueSales } from "@/hooks/queries/use-sales";
import { addPayment } from "@/lib/api/sales";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Sale } from "@/types/sales";

interface ExpandedSale extends Omit<Sale, 'customer'> {
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  } | null;
}

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function DueSalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedCustomerSales, setSelectedCustomerSales] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showCustomerSalesDialog, setShowCustomerSalesDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch due sales data (any sale with amount_due > 0 regardless of status)
  const { sales: salesData, isLoading } = useDueSales({
    page_size: 1000,
  });

  // Filter and process due sales data
  const dueSales = useMemo(() => {
    if (!salesData) return [];
    
    return salesData.filter((sale: Sale) => {
      // Additional frontend filtering for due sales
      const isUnpaid = sale.amount_due && sale.amount_due > 0;
      const isPending = sale.status === 'pending';
      
      if (!isUnpaid && !isPending) return false;
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesInvoice = sale.invoice_number?.toLowerCase().includes(searchLower);
        const customer = typeof sale.customer === 'object' ? sale.customer : null;
        const matchesCustomer = customer?.first_name?.toLowerCase().includes(searchLower) ||
                               customer?.last_name?.toLowerCase().includes(searchLower) ||
                               sale.customer_phone?.toLowerCase().includes(searchLower);
        if (!matchesInvoice && !matchesCustomer) return false;
      }
      
             // Apply customer filter
       const customerId = typeof sale.customer === 'object' ? sale.customer?.id : sale.customer;
       if (selectedCustomer && selectedCustomer !== "all" && selectedCustomer !== customerId?.toString()) {
         return false;
       }
      
      // Apply time filter
      if (timeFilter !== "all") {
        const dateString = sale.date || sale.created_at;
        if (!dateString) return false;
        const saleDate = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - saleDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch (timeFilter) {
          case "week":
            if (diffDays > 7) return false;
            break;
          case "month":
            if (diffDays > 30) return false;
            break;
          case "quarter":
            if (diffDays > 90) return false;
            break;
        }
      }
      
      return true;
    });
  }, [salesData, searchTerm, selectedCustomer, timeFilter]);

  // Calculate analytics data
  const analytics = useMemo(() => {
    const totalDue = dueSales.reduce((sum, sale) => {
      const amount = parseFloat(sale.amount_due?.toString() || '0') || 0;
      return sum + amount;
    }, 0);
    const totalSales = dueSales.length;
    const uniqueCustomers = new Set(
      dueSales.map((sale) => {
        const id = typeof sale.customer === 'object' ? sale.customer?.id : sale.customer;
        return id ?? 'unknown';
      })
    ).size;
    
    // Monthly due analysis
    const monthlyData = dueSales.reduce((acc, sale) => {
      const date = new Date((sale.date ?? sale.created_at) || '');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
             acc[monthKey].amount += parseFloat(sale.amount_due?.toString() || '0') || 0;
      acc[monthKey].count += 1;
      return acc;
    }, {} as Record<string, { month: string; amount: number; count: number }>);

    // Age analysis
    const ageAnalysis = dueSales.reduce((acc, sale) => {
      const saleDate = new Date((sale.date ?? sale.created_at) || '');
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let ageGroup = "";
      if (diffDays <= 7) ageGroup = "0-7 days";
      else if (diffDays <= 30) ageGroup = "8-30 days";
      else if (diffDays <= 60) ageGroup = "31-60 days";
      else ageGroup = "60+ days";
      
      if (!acc[ageGroup]) {
        acc[ageGroup] = { name: ageGroup, value: 0, amount: 0 };
      }
      acc[ageGroup].value += 1;
             acc[ageGroup].amount += parseFloat(sale.amount_due?.toString() || '0') || 0;
      return acc;
    }, {} as Record<string, { name: string; value: number; amount: number }>);

    return {
      totalDue,
      totalSales,
      uniqueCustomers,
      monthlyData: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
      ageAnalysis: Object.values(ageAnalysis)
    };
  }, [dueSales]);

  // Group sales by customer
  const customerGroups = useMemo(() => {
    const groups = dueSales.reduce((acc, sale) => {
      const customerKey = String(
        typeof sale.customer === 'object' ? (sale.customer?.id ?? 'unknown') : (sale.customer ?? 'unknown')
      );
      const customerName = typeof sale.customer === 'object' && sale.customer
        ? `${sale.customer.first_name} ${sale.customer.last_name}`
        : 'Walk-in Customer';
      
      if (!acc[customerKey]) {
        acc[customerKey] = {
          customer: typeof sale.customer === 'object' ? sale.customer : null,
          customerName,
          customerPhone: sale.customer_phone || (typeof sale.customer === 'object' ? sale.customer?.phone : undefined),
          sales: [],
          totalDue: 0,
          oldestSale: sale,
        };
      }
      
      acc[customerKey].sales.push(sale);
      acc[customerKey].totalDue += parseFloat(sale.amount_due?.toString() || '0') || 0;
      
      // Track oldest sale
      const currentOldest = new Date((acc[customerKey].oldestSale.date ?? acc[customerKey].oldestSale.created_at) || '');
      const thisSale = new Date((sale.date ?? sale.created_at) || '');
      if (thisSale < currentOldest) {
        acc[customerKey].oldestSale = sale;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(groups).sort((a: any, b: any) => b.totalDue - a.totalDue);
  }, [dueSales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

     const handleSelectCustomerSales = (customerGroup: any) => {
     setSelectedCustomerSales(customerGroup);
     setShowCustomerSalesDialog(true);
   };

   const handleSelectSaleForPayment = (sale: Sale) => {
     setSelectedSale(sale);
     setShowCustomerSalesDialog(false);
     setPaymentAmount("");
     setPaymentNotes("");
     setPaymentMethod("cash");
   };

       const handleCompletePayment = async () => {
      if (!selectedSale || !paymentAmount) return;
     
     const paymentAmountNum = parseFloat(paymentAmount);
     const amountDue = parseFloat(selectedSale.amount_due?.toString() || '0') || 0;
    
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
      await addPayment(selectedSale.id!, {
        amount: paymentAmountNum,
        payment_method: paymentMethod as any,
        notes: paymentNotes || `${paymentMethod} payment on due amount`,
        status: 'completed'
      });
      
      const isCompletePayment = paymentAmountNum >= amountDue;
      
      toast({
        title: isCompletePayment ? "Payment Completed" : "Partial Payment Processed",
        description: isCompletePayment 
          ? `Payment of ${formatCurrency(paymentAmountNum)} completed. Sale status updated.`
          : `Partial payment of ${formatCurrency(paymentAmountNum)} processed. Remaining due: ${formatCurrency(amountDue - paymentAmountNum)}.`,
      });
      
      setSelectedSale(null);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("cash");
      
      queryClient.invalidateQueries({ queryKey: ['due-sales'] });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Due Sales</h1>
          <p className="text-muted-foreground">
            Manage outstanding payments and track due amounts
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Due Amount</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(analytics.totalDue)}
            </div>
            <p className="text-xs text-rose-600 font-medium mt-1">
              Across {analytics.totalSales} pending sales
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Sales Count</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{analytics.totalSales}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Outstanding transactions
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers with Due</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{analytics.uniqueCustomers}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Unique customer accounts
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Due</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(analytics.totalSales > 0 ? analytics.totalDue / analytics.totalSales : 0)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Per outstanding transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search invoice, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Time Period</label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 rounded-xl text-sm">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customerGroups.map((group: any) => (
                    <SelectItem 
                      key={group.customer?.id || 'unknown'} 
                      value={group.customer?.id?.toString() || 'unknown'}
                    >
                      {group.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">&nbsp;</label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setTimeFilter("all");
                  setSelectedCustomer("all");
                }}
                className="w-full rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs text-xs font-medium">Monthly Trends</TabsTrigger>
          <TabsTrigger value="aging" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs text-xs font-medium">Aging Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
                <CardTitle className="text-base font-semibold text-slate-900">Monthly Due Amount</CardTitle>
                <CardDescription className="text-xs text-slate-500">Outstanding amounts by month</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} stroke="#94a3b8" fontSize={12} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
                <CardTitle className="text-base font-semibold text-slate-900">Monthly Due Count</CardTitle>
                <CardDescription className="text-xs text-slate-500">Number of due sales by month</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
                <CardTitle className="text-base font-semibold text-slate-900">Due Age Distribution</CardTitle>
                <CardDescription className="text-xs text-slate-500">Sales count by age groups</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.ageAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.ageAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
                <CardTitle className="text-base font-semibold text-slate-900">Due Amount by Age</CardTitle>
                <CardDescription className="text-xs text-slate-500">Outstanding amounts by age groups</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.ageAnalysis} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={12} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Cards */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Due Sales by Customer</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {customerGroups.length} customers with outstanding payments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {customerGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-base font-semibold text-slate-800 mb-1">No Due Sales Found</h3>
              <p className="text-sm text-slate-500">
                {searchTerm || selectedCustomer || timeFilter !== "all" 
                  ? "Try adjusting your filters to see more results."
                  : "All sales are paid up! Great job."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customerGroups.map((group: any) => (
                <Card key={group.customer?.id || 'unknown'} className="rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/40 border-b border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold text-slate-900">{group.customerName}</CardTitle>
                        {group.customerPhone && (
                          <div className="flex items-center text-xs text-slate-500">
                            <Phone className="h-3 w-3 mr-1 text-slate-400" />
                            {group.customerPhone}
                          </div>
                        )}
                        {group.customer?.email && (
                          <div className="flex items-center text-xs text-slate-500">
                            <Mail className="h-3 w-3 mr-1 text-slate-400" />
                            {group.customer.email}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200/60 font-semibold text-xs px-2.5 py-0.5">
                        {formatCurrency(group.totalDue)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-xs space-y-1.5 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sales Count:</span>
                        <span className="font-semibold text-slate-800">{group.sales.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Oldest Due:</span>
                        <span className="font-semibold text-slate-800">
                          {formatDate((group.oldestSale.date ?? group.oldestSale.created_at) || new Date().toISOString())}
                        </span>
                      </div>
                    </div>
                    
                    {/* Due Sales List */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-700">Due Sales ({group.sales.length}):</h4>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {group.sales.map((sale: Sale) => (
                          <div key={sale.id} className="flex justify-between items-center text-xs bg-slate-50/70 border border-slate-100 rounded-lg p-2">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-medium text-slate-800 truncate">{sale.invoice_number}</div>
                              <div className="text-[11px] text-slate-400">
                                {formatDate((sale.date ?? sale.created_at) || new Date().toISOString())}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-slate-900">{formatCurrency(parseFloat(sale.amount_due?.toString() || '0') || 0)}</div>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white text-slate-600 border-slate-200">
                                {sale.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {group.sales.length === 1 ? (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium text-xs h-8"
                          onClick={() => setSelectedSale(group.sales[0])}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Pay Now
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium text-xs h-8"
                          onClick={() => handleSelectCustomerSales(group)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          Select & Pay ({group.sales.length})
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8"
                        onClick={() => {
                          window.open(`/customers/${group.customer?.id}`, '_blank');
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Completion Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Process payment for {selectedSale?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(selectedSale.total || 0)}</span>
                </div>
                                 <div className="flex justify-between text-sm">
                   <span>Already Paid:</span>
                   <span className="font-medium">{formatCurrency((selectedSale.total || 0) - (parseFloat(selectedSale.amount_due?.toString() || '0') || 0))}</span>
                 </div>
                 <div className="flex justify-between text-sm font-semibold">
                   <span>Remaining Due:</span>
                   <span className="text-red-600">{formatCurrency(parseFloat(selectedSale.amount_due?.toString() || '0') || 0)}</span>
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Amount</label>
                                 <Input
                   type="number"
                   step="0.01"
                   min="0"
                   max={parseFloat(selectedSale.amount_due?.toString() || '0') || 0}
                   value={paymentAmount}
                   onChange={(e) => setPaymentAmount(e.target.value)}
                   placeholder="Enter payment amount"
                 />
                <div className="flex gap-2">
                                     <Button
                     size="sm"
                     variant="outline"
                     onClick={() => setPaymentAmount(((parseFloat(selectedSale.amount_due?.toString() || '0') || 0) / 2).toFixed(2))}
                   >
                     Pay Half
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => setPaymentAmount((parseFloat(selectedSale.amount_due?.toString() || '0') || 0).toFixed(2))}
                   >
                     Pay Full
                   </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes..."
                />
              </div>

              {paymentAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-sm">
                    <div className="font-medium">Payment Summary:</div>
                    <div className="flex justify-between">
                      <span>Amount to pay:</span>
                      <span>{formatCurrency(parseFloat(paymentAmount) || 0)}</span>
                    </div>
                                         <div className="flex justify-between">
                       <span>Remaining after payment:</span>
                       <span>{formatCurrency((parseFloat(selectedSale.amount_due?.toString() || '0') || 0) - (parseFloat(paymentAmount) || 0))}</span>
                     </div>
                     <div className="mt-1 text-xs text-blue-700">
                       {(parseFloat(paymentAmount) || 0) >= (parseFloat(selectedSale.amount_due?.toString() || '0') || 0) 
                         ? "✅ This will complete the payment" 
                         : "⚠️ This is a partial payment"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSale(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompletePayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isProcessingPayment}
            >
              {isProcessingPayment ? "Processing..." : "Process Payment"}
            </Button>
                     </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Customer Sales Selection Dialog */}
       <Dialog open={showCustomerSalesDialog} onOpenChange={setShowCustomerSalesDialog}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Select Sale to Pay - {selectedCustomerSales?.customerName}</DialogTitle>
             <DialogDescription>
               Choose which sale you want to process payment for
             </DialogDescription>
           </DialogHeader>
           
           {selectedCustomerSales && (
             <div className="space-y-4">
               {/* Customer Summary */}
               <div className="bg-muted rounded-lg p-4">
                 <div className="flex justify-between items-start">
                   <div>
                     <h3 className="font-semibold">{selectedCustomerSales.customerName}</h3>
                     {selectedCustomerSales.customerPhone && (
                       <p className="text-sm text-muted-foreground flex items-center">
                         <Phone className="h-3 w-3 mr-1" />
                         {selectedCustomerSales.customerPhone}
                       </p>
                     )}
                   </div>
                   <div className="text-right">
                     <div className="text-lg font-bold text-red-600">
                       {formatCurrency(selectedCustomerSales.totalDue)}
                     </div>
                     <p className="text-sm text-muted-foreground">Total Due</p>
                   </div>
                 </div>
               </div>

               {/* Sales List */}
               <div className="space-y-2 max-h-96 overflow-y-auto">
                 <h4 className="font-medium">Due Sales ({selectedCustomerSales.sales.length})</h4>
                 {selectedCustomerSales.sales.map((sale: Sale) => (
                   <Card key={sale.id} className="cursor-pointer hover:shadow-md transition-shadow">
                     <CardContent className="p-4">
                       <div className="flex justify-between items-start">
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <h5 className="font-semibold">{sale.invoice_number}</h5>
                             <Badge variant="outline" className="text-xs">
                               {sale.status}
                             </Badge>
                           </div>
                           <div className="text-sm text-muted-foreground">
                              <div>Date: {formatDate((sale.date ?? sale.created_at) || new Date().toISOString())}</div>
                             <div>Total: {formatCurrency(sale.total || 0)}</div>
                             <div>Paid: {formatCurrency((sale.total || 0) - (parseFloat(sale.amount_due?.toString() || '0') || 0))}</div>
                           </div>
                           {sale.items && sale.items.length > 0 && (
                             <div className="text-xs text-muted-foreground">
                               Items: {sale.items.slice(0, 2).map((item: any) => item.product?.name || 'Unknown').join(', ')}
                               {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                             </div>
                           )}
                         </div>
                         <div className="text-right space-y-2">
                           <div className="text-lg font-bold text-red-600">
                             {formatCurrency(parseFloat(sale.amount_due?.toString() || '0') || 0)}
                           </div>
                           <Button 
                             size="sm"
                             onClick={() => handleSelectSaleForPayment(sale)}
                             className="w-full"
                           >
                             <CreditCard className="h-3 w-3 mr-1" />
                             Pay This Sale
                           </Button>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             </div>
           )}

           <DialogFooter>
             <Button variant="outline" onClick={() => setShowCustomerSalesDialog(false)}>
               Cancel
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }

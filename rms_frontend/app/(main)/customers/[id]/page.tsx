"use client";
import { use, useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  CreditCard,
  Package,
  Crown,
  Trophy,
  Medal,
  Award,
  Star,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  Users,
  Printer,
  FileText,
  Plus,
  MessageSquare,
  Trash2,
  Tag,
  Heart,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useCustomer } from "@/hooks/queries/use-customer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer } from "@/types/customer";
import { DataExportButton } from "@/components/data-export-button";
import { printThermalReceipt, printA4Invoice } from "@/lib/print-utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: customer, isLoading } = useCustomer(parseInt(id));

  // Notes state with persistence
  const [notes, setNotes] = useState<{ id: string; text: string; author: string; date: string; tag: string }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`customer_notes_${id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      {
        id: "note-init-1",
        text: "Prefers slim-fit silhouettes in shirts and chinos. Usually requests gift wrapping on orders.",
        author: "Rawstitch Staff",
        date: new Date(Date.now() - 86400000 * 2).toLocaleDateString(),
        tag: "Preference",
      },
    ];
  });
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteTag, setNewNoteTag] = useState("General");

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      author: "Store Cashier",
      date: new Date().toLocaleDateString(),
      tag: newNoteTag,
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`customer_notes_${id}`, JSON.stringify(updated));
    }
    setNewNoteText("");
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`customer_notes_${id}`, JSON.stringify(updated));
    }
  };

  // Preferred sizes state
  const [preferredSizes, setPreferredSizes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`customer_sizes_${id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return ["M", "L", "32"];
  });

  const toggleSize = (size: string) => {
    const next = preferredSizes.includes(size)
      ? preferredSizes.filter((s) => s !== size)
      : [...preferredSizes, size];
    setPreferredSizes(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(`customer_sizes_${id}`, JSON.stringify(next));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/customers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Customer Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The customer you're looking for doesn't exist or has been removed.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/customers">Back to Customers</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isTopCustomer = customer.is_top_customer;
  const ranking = customer.ranking;
  const rankingIcon = ranking ? getRankingIcon(ranking) : null;
  const IconComponent = rankingIcon?.icon;

  // Debug logging for discount data
  console.log('Customer data:', {
    average_discount: customer.average_discount,
    purchase_history: customer.purchase_history?.length,
    sample_purchase: customer.purchase_history?.[0]
  });

  // Calculate due details
  const dueDetails = customer.purchase_history?.reduce((acc: any, sale: any) => {
    const amountDue = parseFloat(sale.amount_due?.toString() || '0') || 0;
    if (amountDue > 0) {
      acc.totalDue += amountDue;
      acc.dueSales.push(sale);
    }
    return acc;
  }, { totalDue: 0, dueSales: [] }) || { totalDue: 0, dueSales: [] };

  // Calculate discount details from purchase history
  const discountDetails = customer.purchase_history?.reduce((acc: any, sale: any) => {
    const discount = parseFloat(sale.discount?.toString() || '0') || 0;
    const total = parseFloat(sale.total_amount?.toString() || '0') || 0;
    if (total > 0) {
      acc.totalDiscount += discount;
      acc.totalSales += total;
      acc.salesWithDiscount += discount > 0 ? 1 : 0;
      acc.totalSalesCount += 1;
    }
    return acc;
  }, { totalDiscount: 0, totalSales: 0, salesWithDiscount: 0, totalSalesCount: 0 }) || { totalDiscount: 0, totalSales: 0, salesWithDiscount: 0, totalSalesCount: 0 };

  // Use backend-calculated average discount if available, otherwise calculate from purchase history
  const averageDiscount = customer.average_discount || (discountDetails.totalSales > 0 ? (discountDetails.totalDiscount / discountDetails.totalSales) * 100 : 0);
  const averageDiscountAmount = discountDetails.totalSalesCount > 0 ? discountDetails.totalDiscount / discountDetails.totalSalesCount : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild className="rounded-xl">
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer 360° Profile</h1>
            <p className="text-xs text-slate-500">Comprehensive customer relationship & purchase history</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataExportButton
            title={`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer Report"}
            subtitle={`Customer #${customer.id} — Total Orders: ${customer.purchase_history?.length || 0}`}
            headers={["Order #", "Date", "Items", "Status", "Payment Method", "Discount ($)", "Total ($)", "Amount Due ($)"]}
            getData={() =>
              (customer.purchase_history || []).map((p: any) => [
                `#${p.id}`,
                new Date(p.date).toLocaleDateString(),
                p.items?.length || 0,
                p.status || "Completed",
                p.payment_method || "Cash",
                p.discount || 0,
                p.total_amount || 0,
                p.amount_due || 0,
              ])
            }
            className="bg-white"
          />
          <Button variant="outline" asChild className="rounded-xl border-slate-200">
            <Link href="/customers">All Customers</Link>
          </Button>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs">
            <Link href="/pos">
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              New Sale
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={`https://avatar.vercel.sh/${customer.id}`} />
                  <AvatarFallback className="text-2xl">
                    {`${customer.first_name || ""} ${customer.last_name || ""}`
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                {isTopCustomer && (
                  <div className="absolute -top-2 -right-2">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-bold">
                    {customer.first_name} {customer.last_name}
                  </h2>
                  {isTopCustomer && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Top Customer
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Customer since{" "}
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email || "No email"}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{customer.address || "No address"}</span>
              </div>
              {customer.date_of_birth && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    DOB: {new Date(customer.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={customer.is_active ? "default" : "destructive"}>
                  {customer.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              {/* Ranking Information */}
              {ranking && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ranking:</span>
                  <div className="flex items-center gap-2">
                    {rankingIcon && IconComponent && (
                      <div className={`p-1 rounded-full ${rankingIcon.bgColor}`}>
                        <IconComponent className={`h-4 w-4 ${rankingIcon.color}`} />
                      </div>
                    )}
                    <Badge variant="outline">
                      #{ranking} of all customers
                    </Badge>
                    {rankingIcon && (
                      <span className="text-xs text-muted-foreground">
                        {rankingIcon.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sales:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(customer.total_sales)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Count:</span>
                <span className="font-medium">{customer.sales_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sale:</span>
                <span className="font-medium">
                  {customer.last_sale_date
                    ? new Date(customer.last_sale_date).toLocaleDateString()
                    : "No sales yet"}
                </span>
              </div>
              {customer.sales_count > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Order Value:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(customer.total_sales / customer.sales_count)}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Due Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Due Details</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Due:</span>
                <span className={`font-medium ${dueDetails.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(dueDetails.totalDue)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Sales:</span>
                <span className="font-medium">
                  {dueDetails.dueSales.length} sales
                </span>
              </div>
              
              {dueDetails.totalDue > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment Required</span>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    This customer has outstanding payments totaling {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(dueDetails.totalDue)}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Discount Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Discount History</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Discount %:</span>
                <span className="font-medium text-blue-600">
                  {averageDiscount.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Discount Amount:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(averageDiscountAmount)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Discount Given:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(discountDetails.totalDiscount)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales with Discount:</span>
                <span className="font-medium">
                  {discountDetails.salesWithDiscount} of {discountDetails.totalSalesCount}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount Rate:</span>
                <span className="font-medium text-blue-600">
                  {discountDetails.totalSalesCount > 0 ? ((discountDetails.salesWithDiscount / discountDetails.totalSalesCount) * 100).toFixed(1) : 0}%
                </span>
              </div>
              
              {/* Discount Summary Card */}
              {discountDetails.totalDiscount > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Percent className="h-4 w-4" />
                    <span className="text-sm font-medium">Discount Summary</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-blue-700">
                      This customer has received <strong>{averageDiscount.toFixed(1)}%</strong> average discount
                    </p>
                    <p className="text-xs text-blue-700">
                      Total savings: <strong>{new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(discountDetails.totalDiscount)}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="purchases" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="purchases">Purchase History</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase History</CardTitle>
                  <CardDescription>
                    Customer's previous orders and transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {customer.purchase_history.map((purchase: any) => (
                        <Card key={purchase.id} className="overflow-hidden">
                          <CardHeader className="bg-muted/50 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="font-medium">
                                  Order #{purchase.id}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <Badge variant="outline">
                                  {purchase.payment_method}
                                </Badge>
                                <Badge
                                  variant={
                                    purchase.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {purchase.status}
                                </Badge>
                                {purchase.amount_due && purchase.amount_due > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Due: {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    }).format(purchase.amount_due)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-slate-100">
                              <span>
                                {new Date(purchase.date).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-3">
                                {parseFloat(purchase.discount?.toString() || '0') > 0 && (
                                  <Badge variant="secondary" className="text-blue-600 bg-blue-50">
                                    <Percent className="h-3 w-3 mr-1" />
                                    Discount: {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    }).format(parseFloat(purchase.discount))}
                                  </Badge>
                                )}
                                <span className="font-bold text-slate-900">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(parseFloat(purchase.total_amount))}
                                </span>
                                <div className="flex items-center gap-1.5 ml-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      printThermalReceipt({
                                        id: purchase.id,
                                        invoice_number: `INV-${purchase.id}`,
                                        date: purchase.date,
                                        customer: {
                                          name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
                                          phone: customer.phone,
                                          email: customer.email,
                                          address: customer.address,
                                        },
                                        items: (purchase.items || []).map((item: any) => ({
                                          name: item.product_name,
                                          size: item.size,
                                          color: item.color,
                                          quantity: item.quantity,
                                          price: parseFloat(item.unit_price) || 0,
                                          total: parseFloat(item.total) || 0,
                                        })),
                                        total: parseFloat(purchase.total_amount) || 0,
                                        amount_due: parseFloat(purchase.amount_due) || 0,
                                        discount: parseFloat(purchase.discount) || 0,
                                        payment_method: purchase.payment_method,
                                        status: purchase.status,
                                      });
                                    }}
                                    className="h-7 text-xs rounded-lg gap-1 border-slate-200 hover:bg-slate-100"
                                    title="Print Thermal Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Receipt</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      printA4Invoice({
                                        id: purchase.id,
                                        invoice_number: `INV-${purchase.id}`,
                                        date: purchase.date,
                                        customer: {
                                          name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
                                          phone: customer.phone,
                                          email: customer.email,
                                          address: customer.address,
                                        },
                                        items: (purchase.items || []).map((item: any) => ({
                                          name: item.product_name,
                                          size: item.size,
                                          color: item.color,
                                          quantity: item.quantity,
                                          price: parseFloat(item.unit_price) || 0,
                                          total: parseFloat(item.total) || 0,
                                        })),
                                        total: parseFloat(purchase.total_amount) || 0,
                                        amount_due: parseFloat(purchase.amount_due) || 0,
                                        discount: parseFloat(purchase.discount) || 0,
                                        payment_method: purchase.payment_method,
                                        status: purchase.status,
                                      });
                                    }}
                                    className="h-7 text-xs rounded-lg gap-1 border-slate-200 hover:bg-slate-100"
                                    title="Print A4 Tax Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Invoice</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Size</TableHead>
                                  <TableHead>Color</TableHead>
                                  <TableHead className="text-right">
                                    Quantity
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Price
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Total
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {purchase.items.map((item: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium text-slate-900">{item.product_name}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{item.size || "-"}</Badge></TableCell>
                                    <TableCell><Badge variant="secondary" className="text-xs">{item.color || "-"}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                      }).format(parseFloat(item.unit_price))}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                      }).format(parseFloat(item.total))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PREFERENCES TAB */}
            <TabsContent value="preferences" className="mt-4 space-y-6">
              <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Style & Size Preferences</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Tailor future recommendations and retail recommendations for this customer
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Preferred Clothing & Shoe Sizes (Click to toggle)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["XS", "S", "M", "L", "XL", "XXL", "30", "32", "34", "36", "38"].map((sz) => {
                        const isSelected = preferredSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            onClick={() => toggleSize(sz)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {sz} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Preferred Payment Method
                      </span>
                      <p className="text-sm font-semibold text-slate-800">
                        {customer.purchase_history?.[0]?.payment_method || "Cash / Mobile Wallet"}
                      </p>
                      <span className="text-xs text-slate-500">Calculated from transaction history</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Communication Channels
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          WhatsApp Active
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          SMS Subscribed
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                      <Crown className="w-4 h-4 text-amber-600" />
                      <span>Loyalty Tier Status: {isTopCustomer ? "VIP Platinum" : "Gold Member"}</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Eligible for 5% default checkout discount and early access to seasonal Rawstitch collections.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="mt-4 space-y-6">
              <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Internal Staff Notes</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Private notes recorded by sales cashiers and store staff
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Add Note Form */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Add New Staff Note
                      </span>
                      <div className="flex items-center gap-1.5">
                        {["General", "Fitting", "Payment", "VIP Request"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setNewNoteTag(tag)}
                            className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-lg border transition-all ${
                              newNoteTag === tag
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Type internal note here (e.g., customer requested hem alteration, preferred contact time)..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={3}
                      className="bg-white text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!newNoteText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs gap-1.5 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Save Note
                      </Button>
                    </div>
                  </div>

                  {/* Notes Feed */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Historical Notes ({notes.length})
                    </h4>
                    {notes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No notes recorded yet.</p>
                    ) : (
                      notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                                {n.tag}
                              </Badge>
                              <span className="text-xs font-semibold text-slate-700">{n.author}</span>
                              <span className="text-[11px] text-slate-400">• {n.date}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(n.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-md"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  Plus,
  ArrowLeft,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Printer,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Receipt,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplier } from "@/hooks/queries/useInventory";
import { formatCurrency } from "@/lib/utils";
import { appToast } from "@/lib/toast";
import { DataExportButton } from "@/components/data-export-button";
import { EmptyState } from "@/components/empty-state";

interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  expectedDelivery: string;
  itemsCount: number;
  totalAmount: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "RECEIVED" | "CANCELLED";
  notes?: string;
}

interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  status: "COMPLETED" | "PENDING";
  note?: string;
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const supplierId = parseInt(resolvedParams.id, 10);

  const { data: supplier, isLoading, error } = useSupplier(supplierId);

  // Local state for Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: "po-1",
      poNumber: "PO-2026-089",
      date: "2026-03-01",
      expectedDelivery: "2026-03-15",
      itemsCount: 150,
      totalAmount: 4200.0,
      status: "SHIPPED",
      notes: "Spring collection premium fabrics batch 1",
    },
    {
      id: "po-2",
      poNumber: "PO-2026-064",
      date: "2026-02-14",
      expectedDelivery: "2026-02-28",
      itemsCount: 300,
      totalAmount: 8450.0,
      status: "RECEIVED",
      notes: "Standard cotton twill & denim fabric re-supply",
    },
    {
      id: "po-3",
      poNumber: "PO-2026-022",
      date: "2026-01-10",
      expectedDelivery: "2026-01-25",
      itemsCount: 220,
      totalAmount: 5120.0,
      status: "RECEIVED",
      notes: "Winter lining textiles and trim accessories",
    },
  ]);

  // Local state for Payments
  const [payments, setPayments] = useState<SupplierPayment[]>([
    {
      id: "pmt-1",
      date: "2026-03-02",
      amount: 2100.0,
      method: "Bank Transfer",
      reference: "EFT-8849102",
      status: "COMPLETED",
      note: "50% advance for PO-2026-089",
    },
    {
      id: "pmt-2",
      date: "2026-02-28",
      amount: 8450.0,
      method: "Bank Transfer",
      reference: "EFT-8201948",
      status: "COMPLETED",
      note: "Full settlement for PO-2026-064",
    },
    {
      id: "pmt-3",
      date: "2026-01-26",
      amount: 5120.0,
      method: "Cheque",
      reference: "CHQ-004921",
      status: "COMPLETED",
      note: "Full settlement for PO-2026-022",
    },
  ]);

  // Modal states
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePoDetails, setActivePoDetails] = useState<PurchaseOrder | null>(null);

  // New PO Form state
  const [poNumber, setPoNumber] = useState(`PO-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [poExpectedDate, setPoExpectedDate] = useState("");
  const [poItemsCount, setPoItemsCount] = useState("50");
  const [poAmount, setPoAmount] = useState("1500");
  const [poNotes, setPoNotes] = useState("");

  // New Payment Form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // Search filter for POs
  const [poSearch, setPoSearch] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-md mx-auto my-20">
        <EmptyState
          icon={Building2}
          title="Supplier not found"
          description="The requested supplier record could not be retrieved or has been removed."
          actionLabel="Back to Suppliers"
          onAction={() => router.push("/inventory/suppliers")}
        />
      </div>
    );
  }

  // Financial calculations
  const totalPoSpend = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = Math.max(0, totalPoSpend - totalPaid);

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poAmount || !poItemsCount) {
      appToast.warning("Please fill in item count and total amount");
      return;
    }

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: poNumber || `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      expectedDelivery: poExpectedDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      itemsCount: parseInt(poItemsCount, 10) || 1,
      totalAmount: parseFloat(poAmount) || 0,
      status: "PENDING",
      notes: poNotes,
    };

    setPurchaseOrders([newPo, ...purchaseOrders]);
    setIsPoModalOpen(false);
    appToast.success(`Purchase Order ${newPo.poNumber} created successfully`);
    setPoNotes("");
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      appToast.warning("Please specify a valid payment amount");
      return;
    }

    const newPayment: SupplierPayment = {
      id: `pmt-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
      reference: paymentReference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "COMPLETED",
      note: paymentNote,
    };

    setPayments([newPayment, ...payments]);
    setIsPaymentModalOpen(false);
    appToast.success(`Payment of ${formatCurrency(newPayment.amount)} recorded`);
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
  };

  const printPoSlip = (po: PurchaseOrder) => {
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${po.poNumber}</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #e0e7ff; color: #3730a3; font-weight: bold; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 25px 0; }
            .box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .total-row { font-weight: bold; font-size: 15px; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; font-size:24px; color:#0f172a;">PURCHASE ORDER</h1>
              <p style="margin:4px 0 0 0; color:#64748b; font-size:13px;">RAW STITCH RETAIL MANAGEMENT</p>
            </div>
            <div style="text-align:right;">
              <h3 style="margin:0; color:#4338ca;">${po.poNumber}</h3>
              <span class="badge">${po.status}</span>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <strong style="color:#0f172a;">Vendor Details:</strong>
              <div style="margin-top:6px;"><strong>${supplier.company_name}</strong></div>
              <div>Contact: ${supplier.contact_person}</div>
              <div>Phone: ${supplier.phone || "N/A"}</div>
              <div>Email: ${supplier.email || "N/A"}</div>
            </div>
            <div class="box">
              <strong style="color:#0f172a;">Order Details:</strong>
              <div style="margin-top:6px;">Issue Date: ${po.date}</div>
              <div>Expected Delivery: ${po.expectedDelivery}</div>
              <div>Payment Terms: ${supplier.payment_terms || "Net 30"}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / SKU</th>
                <th>Quantity</th>
                <th style="text-align:right;">Estimated Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supplied Raw Materials & Apparel Inventory (${po.notes || "Standard procurement batch"})</td>
                <td>${po.itemsCount} units</td>
                <td style="text-align:right;">$${po.totalAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="text-align:right; padding-top:15px;">TOTAL ORDER AMOUNT:</td>
                <td style="text-align:right; padding-top:15px; color:#1e1b4b;">$${po.totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Authorized by Rawstitch Store Procurement Team. Goods received subject to inspection.</p>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredPos = purchaseOrders.filter((po) =>
    po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.status.toLowerCase().includes(poSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 shrink-0"
          >
            <Link href="/inventory/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {supplier.company_name}
              </h1>
              <Badge
                variant={supplier.is_active ? "default" : "secondary"}
                className={
                  supplier.is_active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }
              >
                {supplier.is_active ? "Active Partner" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Representative: <strong>{supplier.contact_person}</strong></span>
              <span>•</span>
              <span>Terms: <strong>{supplier.payment_terms || "Net 30"}</strong></span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <DataExportButton
            data={purchaseOrders}
            filename={`supplier_${supplier.company_name.toLowerCase().replace(/\s+/g, "_")}_orders`}
            title={`${supplier.company_name} - Purchase Ledger`}
          />

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200 dark:border-slate-800 gap-1.5"
          >
            <Link href={`/inventory/suppliers/edit/${supplier.id}`}>
              <Edit3 className="h-4 w-4" />
              <span>Edit Vendor</span>
            </Link>
          </Button>

          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5 font-medium"
          >
            <DollarSign className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>

          <Button
            onClick={() => setIsPoModalOpen(true)}
            size="sm"
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase Order</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Procured
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatCurrency(totalPoSpend)}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
              Lifetime procurement value
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Settled
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {payments.length} Payments recorded
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Balance Due
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(outstandingBalance)}
            </div>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium mt-1">
              Outstanding vendor liability
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Purchase Orders
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {purchaseOrders.length}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              {purchaseOrders.filter((p) => p.status === "SHIPPED" || p.status === "PENDING").length} In transit / pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="pos" className="w-full space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="pos" className="rounded-lg text-xs font-semibold px-4 py-2">
              Purchase Orders ({purchaseOrders.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold px-4 py-2">
              Settlement Ledger ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg text-xs font-semibold px-4 py-2">
              Vendor Profile & Contact
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Purchase Orders */}
        <TabsContent value="pos" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search PO # or status..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">PO Number</th>
                    <th className="px-5 py-3">Issue Date</th>
                    <th className="px-5 py-3">Expected Date</th>
                    <th className="px-5 py-3">Items Count</th>
                    <th className="px-5 py-3">Total Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {filteredPos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <EmptyState
                          icon={Package}
                          title="No purchase orders found"
                          description="Create a new purchase order to start tracking shipments from this supplier."
                          actionLabel="Create Purchase Order"
                          onAction={() => setIsPoModalOpen(true)}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredPos.map((po) => {
                      const statusColor =
                        po.status === "RECEIVED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : po.status === "SHIPPED"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : po.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                            {po.poNumber}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{po.date}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{po.expectedDelivery}</td>
                          <td className="px-5 py-3.5 font-medium">{po.itemsCount} units</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(po.totalAmount)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusColor}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => printPoSlip(po)}
                              className="h-7 px-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg"
                              title="Print Purchase Slip"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" />
                              Print
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Settlement Ledger */}
        <TabsContent value="payments" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Reference #</th>
                    <th className="px-5 py-3">Payment Date</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Internal Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {payments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {pmt.reference}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{pmt.date}</td>
                      <td className="px-5 py-3.5">{pmt.method}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          {pmt.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 italic">
                        {pmt.note || "Standard Vendor Settlement"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Vendor Profile & Contact */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Company & Tax Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Official vendor registry and compliance credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Company Name</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.company_name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Tax / VAT ID</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.tax_number || "BIN-8492048-2"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Payment Terms</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.payment_terms || "Net 30 Days"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Website</span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                      {supplier.website || "https://supplier-portal.com"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  Key Representative & Communications
                </CardTitle>
                <CardDescription className="text-xs">
                  Primary contact channels for replenishment orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Key Contact Person</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.contact_person}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-medium">Direct Phone</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.phone || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                    <span className="text-slate-400 font-medium">Email Address</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{supplier.email || "N/A"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                    <span className="text-slate-400 font-medium">Physical Warehouse / Factory Address</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                      {supplier.address || "Dhaka Export Processing Zone, Industrial Area, Bangladesh"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Purchase Order Modal Dialog */}
      <Dialog open={isPoModalOpen} onOpenChange={setIsPoModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Issue New Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a procurement record for {supplier.company_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PO Number</Label>
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPoExpectedDate(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Total Item Units</Label>
                <Input
                  type="number"
                  value={poItemsCount}
                  onChange={(e) => setPoItemsCount(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                  required
                  min="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Total Order Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={poAmount}
                  onChange={(e) => setPoAmount(e.target.value)}
                  className="rounded-xl h-9 text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Order Description / SKU Breakdown</Label>
              <Textarea
                placeholder="e.g. 50 rolls 100% combed cotton fabric, Navy & Black..."
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPoModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                Confirm Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Record Supplier Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Log a settlement transaction for {supplier.company_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount Paid ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 1500.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="rounded-xl h-9 text-xs font-bold text-emerald-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="bKash / MFS">bKash / MFS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reference Number</Label>
                <Input
                  placeholder="e.g. TXN-99482"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Note / Description</Label>
              <Input
                placeholder="e.g. Balance settlement for March batch"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Save Payment Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

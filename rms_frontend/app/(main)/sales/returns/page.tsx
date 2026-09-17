"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Eye,
  Printer,
  PackageCheck,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { DataExportButton } from "@/components/data-export-button";

export interface ReturnItem {
  id: string;
  date: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  product_name: string;
  quantity: number;
  reason: "Wrong Size" | "Defective Item" | "Changed Mind" | "Color Mismatch" | "Other";
  amount: number;
  refund_method: "Cash" | "Store Credit" | "bKash" | "Card";
  restocked: boolean;
  status: "Completed" | "Processing" | "Rejected";
  notes?: string;
}

const INITIAL_RETURNS: ReturnItem[] = [
  {
    id: "RET-001",
    date: new Date(Date.now() - 86400000 * 1).toISOString().split("T")[0],
    invoice_number: "INV-1042",
    customer_name: "John Smith",
    customer_phone: "01712345678",
    product_name: "Rawstitch Oxford Shirt - L / Sky Blue",
    quantity: 1,
    reason: "Wrong Size",
    amount: 49.99,
    refund_method: "Store Credit",
    restocked: true,
    status: "Completed",
    notes: "Exchanged for size XL in-store.",
  },
  {
    id: "RET-002",
    date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
    invoice_number: "INV-1051",
    customer_name: "Sarah Johnson",
    customer_phone: "01898765432",
    product_name: "Slim Chino Trousers - 32 / Khaki",
    quantity: 2,
    reason: "Defective Item",
    amount: 89.98,
    refund_method: "Cash",
    restocked: false,
    status: "Processing",
    notes: "Zipper defect reported. Awaiting manager sign-off.",
  },
  {
    id: "RET-003",
    date: new Date(Date.now() - 86400000 * 4).toISOString().split("T")[0],
    invoice_number: "INV-1063",
    customer_name: "Michael Brown",
    customer_phone: "01911223344",
    product_name: "Casual Polo Tee - M / Olive",
    quantity: 1,
    reason: "Changed Mind",
    amount: 29.99,
    refund_method: "bKash",
    restocked: true,
    status: "Completed",
    notes: "Returned within 7-day policy with tag intact.",
  },
];

export default function SalesReturnsPage() {
  const [returns, setReturns] = useState<ReturnItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rms_returns_data");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return INITIAL_RETURNS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);

  // Form states
  const [formInvoice, setFormInvoice] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formProduct, setFormProduct] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formAmount, setFormAmount] = useState("");
  const [formReason, setFormReason] = useState<ReturnItem["reason"]>("Wrong Size");
  const [formMethod, setFormMethod] = useState<ReturnItem["refund_method"]>("Store Credit");
  const [formRestock, setFormRestock] = useState(true);
  const [formNotes, setFormNotes] = useState("");

  const saveReturns = (next: ReturnItem[]) => {
    setReturns(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("rms_returns_data", JSON.stringify(next));
    }
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvoice || !formCustomer || !formProduct || !formAmount) {
      alert("Please fill in all required fields.");
      return;
    }

    const newReturn: ReturnItem = {
      id: `RET-00${returns.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      invoice_number: formInvoice.startsWith("INV-") ? formInvoice : `INV-${formInvoice}`,
      customer_name: formCustomer,
      customer_phone: formPhone || "N/A",
      product_name: formProduct,
      quantity: Number(formQty) || 1,
      reason: formReason,
      amount: parseFloat(formAmount) || 0,
      refund_method: formMethod,
      restocked: formRestock,
      status: "Processing",
      notes: formNotes,
    };

    saveReturns([newReturn, ...returns]);
    setIsCreateOpen(false);

    // Reset
    setFormInvoice("");
    setFormCustomer("");
    setFormPhone("");
    setFormProduct("");
    setFormQty(1);
    setFormAmount("");
    setFormNotes("");
  };

  const handleStatusChange = (returnId: string, newStatus: ReturnItem["status"]) => {
    const updated = returns.map((r) =>
      r.id === returnId ? { ...r, status: newStatus } : r
    );
    saveReturns(updated);
    if (selectedReturn?.id === returnId) {
      setSelectedReturn((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const printReturnSlip = (item: ReturnItem) => {
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Slip - ${item.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #1e293b; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
            .brand { font-size: 20px; font-weight: 900; color: #1e1b4b; }
            .sub { font-size: 11px; color: #64748b; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .title { font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { background: #f1f5f9; padding: 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .total { text-align: right; font-size: 16px; font-weight: 800; color: #4f46e5; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">RAW STITCH</div>
            <div class="sub">Product Return & Refund Voucher</div>
            <div class="sub">Voucher ID: ${item.id} • Issued: ${item.date}</div>
          </div>
          <div class="grid">
            <div class="box">
              <div class="title">Customer Info</div>
              <div><b>Name:</b> ${item.customer_name}</div>
              <div><b>Phone:</b> ${item.customer_phone || "N/A"}</div>
              <div><b>Original Invoice:</b> ${item.invoice_number}</div>
            </div>
            <div class="box">
              <div class="title">Return Authorization</div>
              <div><b>Reason:</b> ${item.reason}</div>
              <div><b>Refund Method:</b> ${item.refund_method}</div>
              <div><b>Restocked:</b> ${item.restocked ? "Yes (Sellable)" : "No (Damage)"}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Item Description</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Refund Total</th></tr>
            </thead>
            <tbody>
              <tr><td>${item.product_name}</td><td style="text-align: center;">${item.quantity}</td><td style="text-align: right;">$${item.amount.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <div class="total">Total Refunded: $${item.amount.toFixed(2)}</div>
          <div class="signature">
            <div>Customer Signature: __________________</div>
            <div>Store Manager Approval: __________________</div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.product_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || r.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [returns, searchQuery, statusFilter]);

  // Aggregate metrics
  const totalReturnsCount = returns.length;
  const totalRefundedAmount = returns
    .filter((r) => r.status === "Completed")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingReviewCount = returns.filter((r) => r.status === "Processing").length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Returns & Refunds
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage product returns, customer exchanges, and refund vouchers
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <DataExportButton
            title="Sales Returns"
            headers={["Return ID", "Date", "Original Invoice", "Customer", "Product", "Qty", "Reason", "Amount ($)", "Refund Method", "Status"]}
            getData={() =>
              filteredReturns.map((r) => [
                r.id,
                r.date,
                r.invoice_number,
                r.customer_name,
                r.product_name,
                r.quantity,
                r.reason,
                r.amount,
                r.refund_method,
                r.status,
              ])
            }
            className="bg-white"
          />
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Process Return</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Returns
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalReturnsCount}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Total recorded return tickets
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Refunded
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${totalRefundedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-rose-600 font-medium mt-1">
              Across completed customer refunds
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Review
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {pendingReviewCount}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Awaiting manager inspection / authorization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Returns Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Real-time tracking of returned merchandise and refund statuses
              </CardDescription>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search returns or invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white border-slate-200 rounded-xl text-xs"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white border-slate-200 rounded-xl text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-slate-600">Return ID</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Date</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Invoice #</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Customer</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Item</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Reason</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Amount</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Refund Via</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-xs text-slate-400">
                      No return transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.date}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-indigo-600">
                        {item.invoice_number}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {item.customer_name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 max-w-[200px] truncate" title={item.product_name}>
                        {item.product_name} <span className="text-slate-400">({item.quantity}x)</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] border-slate-200">
                          {item.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        ${item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.refund_method}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium ${
                            item.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : item.status === "Processing"
                              ? "bg-amber-50 text-amber-700 border-amber-200/80"
                              : "bg-rose-50 text-rose-700 border-rose-200/80"
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReturn(item)}
                            className="rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs h-7 px-2"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => printReturnSlip(item)}
                            className="rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs h-7 px-2"
                            title="Print Return Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PROCESS RETURN DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-white border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              Process New Return & Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record returned items, calculate refund, and restock inventory
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReturn} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Original Invoice # *</Label>
                <Input
                  required
                  placeholder="e.g. INV-1042"
                  value={formInvoice}
                  onChange={(e) => setFormInvoice(e.target.value)}
                  className="rounded-xl text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Customer Name *</Label>
                <Input
                  required
                  placeholder="Full name"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="rounded-xl text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Customer Phone</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="rounded-xl text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Refund Amount ($) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="rounded-xl text-xs mt-1 font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Item Name & Variant *</Label>
              <Input
                required
                placeholder="e.g. Oxford Shirt Sky Blue (L)"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="rounded-xl text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formQty}
                  onChange={(e) => setFormQty(parseInt(e.target.value) || 1)}
                  className="rounded-xl text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Return Reason</Label>
                <Select value={formReason} onValueChange={(val: any) => setFormReason(val)}>
                  <SelectTrigger className="rounded-xl text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Wrong Size">Wrong Size</SelectItem>
                    <SelectItem value="Defective Item">Defective Item</SelectItem>
                    <SelectItem value="Changed Mind">Changed Mind</SelectItem>
                    <SelectItem value="Color Mismatch">Color Mismatch</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Refund Method</Label>
                <Select value={formMethod} onValueChange={(val: any) => setFormMethod(val)}>
                  <SelectTrigger className="rounded-xl text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Store Credit">Store Credit</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Card">Bank Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <input
                type="checkbox"
                id="restock"
                checked={formRestock}
                onChange={(e) => setFormRestock(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="restock" className="text-xs font-medium text-slate-700 cursor-pointer">
                Return item back to sellable inventory (Restock)
              </label>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Staff Internal Notes</Label>
              <Textarea
                placeholder="Reason details, inspection remarks..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="rounded-xl text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                Complete Return
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW RETURN DETAILS DIALOG */}
      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-200 shadow-2xl">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Return Ticket {selectedReturn.id}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={
                    selectedReturn.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {selectedReturn.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Created on {selectedReturn.date} • Reference {selectedReturn.invoice_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-800">{selectedReturn.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="text-slate-700">{selectedReturn.customer_phone || "N/A"}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-semibold text-slate-800">{selectedReturn.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="text-slate-700">{selectedReturn.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Return Reason:</span>
                  <span className="font-medium text-slate-800">{selectedReturn.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Restocked:</span>
                  <span className="text-slate-700">{selectedReturn.restocked ? "Yes (Inventory added)" : "No (Damage/Scrap)"}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl space-y-1 border border-indigo-100">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-indigo-900">Refund Amount:</span>
                  <span className="font-extrabold text-indigo-700">${selectedReturn.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-indigo-600">
                  <span>Payment Method:</span>
                  <span className="capitalize">{selectedReturn.refund_method}</span>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="p-3 rounded-xl border border-slate-100 text-slate-600">
                  <span className="font-bold text-slate-500 block mb-1">Notes:</span>
                  {selectedReturn.notes}
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                {selectedReturn.status !== "Completed" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(selectedReturn.id, "Completed")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8"
                  >
                    Mark Completed
                  </Button>
                )}
                {selectedReturn.status !== "Rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(selectedReturn.id, "Rejected")}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-xs h-8"
                  >
                    Reject
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => printReturnSlip(selectedReturn)}
                className="rounded-xl text-xs h-8 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

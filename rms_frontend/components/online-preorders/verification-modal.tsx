"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { OnlinePreorder, OnlinePreorderVerification, OnlinePreorderVerificationItem, onlinePreordersApi } from "@/lib/api/onlinePreorder";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Barcode, CheckCircle2, Package, XCircle, AlertTriangle, SkipForward } from "lucide-react";

interface VerificationModalProps {
  order: OnlinePreorder | null;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export function OnlinePreorderVerificationModal({ order, open, onClose, onCompleted }: VerificationModalProps) {
  const [verification, setVerification] = useState<OnlinePreorderVerification | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !order) return;
    let isMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        const res = await onlinePreordersApi.startVerification(order.id);
        if (!isMounted) return;
        setVerification(res.data);
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch (error: any) {
        console.error(error);
        toast({
          title: "Verification error",
          description: error?.response?.data?.detail || "Failed to start verification.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void init();

    return () => {
      isMounted = false;
      setScanValue("");
    };
  }, [open, order]);

  const stats = useMemo(() => {
    if (!verification) return { total: 0, verified: 0, remaining: 0 };
    return {
      total: verification.total_units,
      verified: verification.verified_units,
      remaining: Math.max(verification.total_units - verification.verified_units, 0),
    };
  }, [verification]);

  // Decode QR code data - ported from ModernPOS
  const decodeQRCodeData = (scannedValue: string): { productId: string; color: string; size: string } | null => {
    try {
      if (!scannedValue || typeof scannedValue !== 'string' || scannedValue.trim().length === 0) {
        return null;
      }
      let decodedString: string;
      try {
        decodedString = atob(scannedValue.trim());
      } catch (decodeError) {
        return null;
      }
      let cartData: any;
      try {
        cartData = JSON.parse(decodedString);
      } catch (parseError) {
        return null;
      }
      if (cartData && typeof cartData === 'object' && cartData.items && Array.isArray(cartData.items) && cartData.items.length > 0) {
        const item = cartData.items[0];
        if (item && typeof item === 'object' && item.productId) {
          return {
            productId: String(item.productId),
            color: item.variations?.color || "",
            size: item.variations?.size || "",
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !scanValue.trim()) return;

    const scannedInput = scanValue.trim();
    setScanValue("");

    let payload_sku = scannedInput;
    let payload_product_id: number | undefined = undefined;

    // Check if it's a QR code
    const qrData = decodeQRCodeData(scannedInput);
    if (qrData) {
      payload_product_id = parseInt(qrData.productId);
      if (isNaN(payload_product_id)) payload_product_id = undefined;
    }

    try {
      const res = await onlinePreordersApi.verifyScan(order.id, payload_sku, payload_product_id);
      setVerification(res.data.verification);

      const { result, message } = res.data;

      if (result === "MATCHED") {
        toast({
          title: "Matched",
          description: message,
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else if (result === "NOT_IN_ORDER") {
        toast({
          title: "Not in order",
          description: message,
          variant: "destructive",
        });
      } else if (result === "OVER_SCAN") {
        toast({
          title: "Already verified",
          description: message,
          className: "bg-blue-50 border-blue-200 text-blue-800",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Scan failed",
        description: error?.response?.data?.detail || "Could not verify this scan.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleComplete = async () => {
    if (!order || !verification) return;
    setIsCompleting(true);
    try {
      const res = await onlinePreordersApi.completeVerification(order.id);
      setVerification(res.data);
      toast({
        title: "Verification completed",
        description: "All items verified. Order marked as delivered.",
      });
      onCompleted();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Cannot complete verification",
        description: error?.response?.data?.detail || "Please verify all items before completing.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkipConfirm = async () => {
    if (!order) return;
    try {
      const res = await onlinePreordersApi.skipVerification(order.id, skipReason || undefined);
      setVerification(res.data);
      toast({
        title: "Verification skipped",
        description: "Order marked as delivered without full verification.",
      });
      setSkipDialogOpen(false);
      setSkipReason("");
      onCompleted();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Failed to skip verification",
        description: error?.response?.data?.detail || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRowStatus = (item: OnlinePreorderVerificationItem) => {
    if (item.verified_qty === 0) return { label: "Pending", variant: "bg-slate-100 text-slate-700" };
    if (item.verified_qty < item.ordered_qty) return { label: "Partial", variant: "bg-yellow-100 text-yellow-800" };
    return { label: "Matched", variant: "bg-green-100 text-green-800" };
  };

  const disabledComplete = stats.remaining > 0 || !verification || verification.status === "COMPLETED";

  // Fetch branding for logo
  const [branding, setBranding] = useState<{ logo_image_url?: string; logo_text?: string } | null>(null);
  useEffect(() => {
    import("@/lib/api/ecommerce").then(({ homePageSettingsApi }) => {
      homePageSettingsApi.get().then(setBranding).catch(console.error);
    });
  }, []);

  const progressPercentage = useMemo(() => {
    if (!verification || verification.total_units === 0) return 0;
    return Math.min(100, (verification.verified_units / verification.total_units) * 100);
  }, [verification]);

  // Success Animation Component
  const SuccessOverlay = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center animate-in zoom-in-50 duration-500 slide-in-from-bottom-10">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-white p-4 rounded-full shadow-xl border-4 border-green-100">
            {branding?.logo_image_url ? (
              <img
                src={branding.logo_image_url}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Verified!</h2>
        <p className="text-slate-500 text-center max-w-xs mb-8">
          Order #{order?.id} has been fully verified and marked as delivered.
        </p>

        <Button
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full px-8 shadow-lg shadow-green-200 animate-bounce"
          onClick={() => {
            onCompleted();
            onClose();
          }}
        >
          Done & Close
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden h-[90vh] md:h-auto flex flex-col">
          {verification?.status === "COMPLETED" && <SuccessOverlay />}

          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">Order #{order?.id} Verification</DialogTitle>
                <DialogDescription>
                  Scan product barcodes to verify this order.
                </DialogDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-sm font-medium text-slate-500">Progress</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {Math.round(progressPercentage)}%
                </div>
              </div>
            </div>

            {/* Volume-style Progress Bar */}
            <div className="mt-4 flex gap-1 h-3 w-full">
              {Array.from({ length: 20 }).map((_, i) => {
                const barValue = (i + 1) * 5; // each bar is 5%
                const isActive = progressPercentage >= barValue;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all duration-300 ${isActive
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-slate-200"
                      }`}
                  />
                );
              })}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-50/50">
            {/* Scan Area */}
            <Card className="border-emerald-200 shadow-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 flex flex-row items-center justify-between relative">
                <div>
                  <CardTitle className="text-sm font-semibold text-emerald-900">Scan Barcode / QR</CardTitle>
                  <p className="text-xs text-emerald-700 mt-1">
                    Scanner active. Supports POS QR codes & standard barcodes.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    SCANNER READY
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <form onSubmit={handleScanSubmit}>
                  <div className="relative group">
                    <Barcode className="absolute left-3 top-3 h-5 w-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                    <Input
                      ref={inputRef}
                      value={scanValue}
                      onChange={(e) => setScanValue(e.target.value)}
                      placeholder="Scan item..."
                      className="h-12 pl-10 text-lg bg-white border-emerald-200 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 transition-all shadow-sm"
                      autoFocus
                    />
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 bg-white border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-900">Order Items</CardTitle>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {stats.verified} / {stats.total} verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[320px] overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center w-[80px]">Qty</TableHead>
                        <TableHead className="text-center w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verification?.items?.map((item) => {
                        const status = getRowStatus(item);
                        const isComplete = item.verified_qty >= item.ordered_qty;
                        return (
                          <TableRow key={item.id} className={isComplete ? "bg-slate-50/50" : ""}>
                            <TableCell className="font-mono text-xs text-slate-600">{item.sku || "N/A"}</TableCell>
                            <TableCell className="max-w-[200px] md:max-w-[300px]">
                              <div className="font-medium text-slate-900 text-sm break-words whitespace-normal line-clamp-2" title={item.product_name || "Product"}>
                                {item.product_name || "Product"}
                              </div>
                              {isComplete && <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" /> Verified</div>}
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">
                              <span className={isComplete ? "text-green-600" : "text-slate-900"}>
                                {item.verified_qty}
                              </span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-slate-600">{item.ordered_qty}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.variant}`}
                              >
                                {status.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!verification?.items?.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="bg-slate-100 p-3 rounded-full">
                                <Package className="h-6 w-6 text-slate-400" />
                              </div>
                              <p className="text-sm">No items found for this order.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Scan Log / Debug Info (Optional - kept hidden or small) */}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 mt-auto shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="hidden md:block col-span-2">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Verified</span>
                    <span className="text-2xl font-bold text-slate-900">{stats.verified}</span>
                  </div>
                  <div className="w-px bg-slate-200 h-10"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Remaining</span>
                    <span className="text-2xl font-bold text-slate-400">{stats.remaining}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  onClick={() => setSkipDialogOpen(true)}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip
                </Button>
                <Button
                  className={`flex-1 md:flex-none min-w-[140px] font-semibold shadow-sm transition-all ${verification?.status === "COMPLETED"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  disabled={disabledComplete || isCompleting}
                  onClick={handleComplete}
                >
                  {isCompleting ? (
                    "Processing..."
                  ) : verification?.status === "COMPLETED" ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Complete</>
                  ) : (
                    "Complete Verification"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip confirmation */}
      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip verification?</AlertDialogTitle>
            <AlertDialogDescription>
              Some items may not be fully verified. Skipping will still mark this order as delivered and log that
              verification was skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Optional reason:</p>
            <Input
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g. Urgent dispatch, manual verification already done"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-500 hover:bg-amber-600" onClick={handleSkipConfirm}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Skip & Mark Delivered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



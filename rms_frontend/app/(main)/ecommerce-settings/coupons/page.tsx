"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Search, Ticket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coupon, CouponDTO } from "@/lib/api/ecommerce";
import {
  useCoupons, useCreateCoupon, useUpdateCoupon,
  useDeleteCoupon, useSetCouponActive,
} from "@/hooks/queries/useEcommerce";
import { toast } from "@/hooks/use-toast";

const emptyForm: CouponDTO = {
  name: "", code: "", discount_type: "PERCENTAGE", value: 10,
  interaction_mode: "STACK", start_date: "", end_date: "",
  minimum_spend: 0, maximum_discount: null, usage_limit: null, is_active: true,
};

const interactionLabels = {
  STACK: "Stacks with discounts",
  BEST: "Best discount wins",
  REPLACE: "Replaces discounts",
};

const toLocalDateTimeInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export default function CouponManagementPage() {
  const { data: coupons = [], isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const setActive = useSetCouponActive();
  const [form, setForm] = useState<CouponDTO>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => coupons.filter((coupon) =>
      `${coupon.name} ${coupon.code}`.toLowerCase().includes(search.trim().toLowerCase())
    ),
    [coupons, search]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      name: coupon.name,
      code: coupon.code,
      discount_type: coupon.discount_type,
      value: Number(coupon.value),
      interaction_mode: coupon.interaction_mode,
      start_date: toLocalDateTimeInput(coupon.start_date),
      end_date: toLocalDateTimeInput(coupon.end_date),
      minimum_spend: Number(coupon.minimum_spend),
      maximum_discount: coupon.maximum_discount == null ? null : Number(coupon.maximum_discount),
      usage_limit: coupon.usage_limit == null ? null : Number(coupon.usage_limit),
      is_active: coupon.is_active,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        maximum_discount: form.discount_type === "FIXED" ? null : form.maximum_discount,
      };
      if (editingId) await updateCoupon.mutateAsync({ id: editingId, ...payload });
      else await createCoupon.mutateAsync(payload);
      toast({ title: editingId ? "Coupon updated" : "Coupon created" });
      closeForm();
    } catch (error: any) {
      toast({
        title: "Could not save coupon",
        description: error?.response?.data
          ? Object.values(error.response.data).flat().join(" ")
          : "Please check the form and try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    try {
      await deleteCoupon.mutateAsync(couponToDelete.id);
      toast({ title: "Coupon deleted" });
      setCouponToDelete(null);
    } catch {
      toast({ title: "Could not delete coupon", variant: "destructive" });
    }
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(value));

  const getStatus = (coupon: Coupon) => {
    const now = Date.now();
    if (!coupon.is_active) return { label: "Inactive", variant: "secondary" as const };
    if (new Date(coupon.start_date).getTime() > now) return { label: "Scheduled", variant: "outline" as const };
    if (new Date(coupon.end_date).getTime() < now) return { label: "Expired", variant: "destructive" as const };
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) return { label: "Limit reached", variant: "destructive" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Ticket className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Coupons & Promo Codes</h1>
          </div>
          <p className="text-sm text-slate-500">
            Create and manage promotional discount codes for ecommerce storefront checkout.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Coupons</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{coupons.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Created promotional codes</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Campaigns</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 tracking-tight">{coupons.filter(c => c.is_active).length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Currently redeemable</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Redemptions</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{coupons.reduce((sum, c) => sum + c.used_count, 0)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Lifetime orders redeemed</span>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">All Coupons</h2>
              <p className="text-xs text-slate-500">{visible.length} coupon{visible.length === 1 ? "" : "s"} configured</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search name or code..." 
                className="pl-9 bg-white rounded-xl border-slate-200 focus:border-blue-500" 
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading coupon campaigns...</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center p-12 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-3"><Ticket className="h-6 w-6 text-slate-400" /></div>
                <h3 className="font-semibold text-slate-800">{search ? "No matching coupons" : "No coupons yet"}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {search ? "Try a different search term." : "Create your first checkout coupon."}
                </p>
                {!search && (
                  <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />Create coupon
                  </Button>
                )}
              </div>
            ) : visible.map((coupon) => {
              const couponStatus = getStatus(coupon);
              return (
              <div key={coupon.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 text-sm">{coupon.name}</h3>
                      <code className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold font-mono tracking-wide text-slate-800">
                        {coupon.code}
                      </code>
                      <Badge variant={couponStatus.variant}>{couponStatus.label}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {coupon.discount_type === "PERCENTAGE" ? `${coupon.value}% off` : `$${coupon.value} off`}
                      </span>
                      <span>•</span>
                      <span>{interactionLabels[coupon.interaction_mode]}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(coupon.start_date)} – {formatDate(coupon.end_date)}
                      </span>
                      <span>•</span>
                      <span>Used: <strong className="text-slate-700">{coupon.used_count}</strong> / {coupon.usage_limit ?? "Unlimited"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  <div className="flex items-center gap-2 pr-2">
                    <Switch
                      checked={coupon.is_active}
                      disabled={setActive.isPending}
                      onCheckedChange={(active) => setActive.mutate({ id: coupon.id, active })}
                      aria-label={`${coupon.is_active ? "Deactivate" : "Activate"} ${coupon.code}`}
                    />
                    <span className="text-xs text-slate-500 lg:hidden">{coupon.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(coupon)} className="rounded-xl border-slate-200">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl" 
                    onClick={() => setCouponToDelete(coupon)} 
                    aria-label={`Delete ${coupon.code}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )})}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update this coupon’s rules and availability." : "Configure a new checkout discount code."}
            </DialogDescription>
          </DialogHeader>
          <form id="coupon-form" onSubmit={submit} className="grid gap-5 py-2 sm:grid-cols-2">
            <Field label="Coupon name">
              <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale" className="rounded-xl" />
            </Field>
            <Field label="Coupon code" hint="Customers enter this at checkout">
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="SUMMER20" className="font-mono uppercase rounded-xl" />
            </Field>
            <Field label="Discount type">
              <Select value={form.discount_type} onValueChange={(value: "PERCENTAGE" | "FIXED") => setForm({ ...form, discount_type: value, maximum_discount: value === "FIXED" ? null : form.maximum_discount })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="PERCENTAGE">Percentage (%)</SelectItem><SelectItem value="FIXED">Fixed amount ($)</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label={form.discount_type === "PERCENTAGE" ? "Discount percentage" : "Discount amount ($)"}>
              <div className="relative">
                <Input required type="number" min="0.01" max={form.discount_type === "PERCENTAGE" ? 100 : undefined} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="pr-10 rounded-xl" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">{form.discount_type === "PERCENTAGE" ? "%" : "$"}</span>
              </div>
            </Field>
            <Field label="Works with automatic discounts" className="sm:col-span-2">
              <Select value={form.interaction_mode} onValueChange={(value: "STACK" | "BEST" | "REPLACE") => setForm({ ...form, interaction_mode: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STACK">Stack — apply after automatic discounts</SelectItem>
                  <SelectItem value="BEST">Best only — use whichever saves more</SelectItem>
                  <SelectItem value="REPLACE">Replace — ignore automatic discounts</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minimum spend" hint="Leave at 0 for no minimum">
              <Input type="number" min="0" step="0.01" value={form.minimum_spend} onChange={(e) => setForm({ ...form, minimum_spend: Number(e.target.value) })} />
            </Field>
            <Field label="Maximum discount" hint={form.discount_type === "FIXED" ? "Only available for percentage coupons" : "Optional cap"}>
              <Input disabled={form.discount_type === "FIXED"} type="number" min="0.01" step="0.01" value={form.maximum_discount ?? ""} onChange={(e) => setForm({ ...form, maximum_discount: e.target.value ? Number(e.target.value) : null })} placeholder="No limit" />
            </Field>
            <Field label="Start date and time"><Input required type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="End date and time"><Input required type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
            <Field label="Total usage limit" hint="Leave empty for unlimited">
              <Input type="number" min="1" value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
            </Field>
            <div className="flex items-center justify-between rounded-lg border p-3.5">
              <div><Label htmlFor="coupon-active">Active</Label><p className="text-xs text-muted-foreground">Customers can use this coupon</p></div>
              <Switch id="coupon-active" checked={form.is_active} onCheckedChange={(is_active) => setForm({ ...form, is_active })} />
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" form="coupon-form" disabled={createCoupon.isPending || updateCoupon.isPending}>
              {createCoupon.isPending || updateCoupon.isPending ? "Saving..." : editingId ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              The code <strong>{couponToDelete?.code}</strong> will stop working immediately. Existing orders keep their coupon history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete coupon</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div><Label>{label}</Label>{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </div>
  );
}

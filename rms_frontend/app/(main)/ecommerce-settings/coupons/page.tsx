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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage discount codes for ecommerce checkout.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create coupon
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total coupons</p><p className="mt-1 text-2xl font-bold">{coupons.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="mt-1 text-2xl font-bold text-emerald-600">{coupons.filter(c => c.is_active).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total redemptions</p><p className="mt-1 text-2xl font-bold">{coupons.reduce((sum, c) => sum + c.used_count, 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">All coupons</h2>
              <p className="text-sm text-muted-foreground">{visible.length} coupon{visible.length === 1 ? "" : "s"}</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or code" className="pl-9" />
            </div>
          </div>

          <div className="divide-y">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">Loading coupons...</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center p-12 text-center">
                <div className="mb-3 rounded-full bg-muted p-3"><Ticket className="h-6 w-6 text-muted-foreground" /></div>
                <h3 className="font-semibold">{search ? "No matching coupons" : "No coupons yet"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "Try a different search term." : "Create your first checkout coupon."}
                </p>
                {!search && <Button onClick={openCreate} variant="outline" className="mt-4"><Plus className="mr-2 h-4 w-4" />Create coupon</Button>}
              </div>
            ) : visible.map((coupon) => {
              const couponStatus = getStatus(coupon);
              return (
              <div key={coupon.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Ticket className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{coupon.name}</h3>
                      <code className="rounded-md border bg-muted px-2 py-0.5 text-xs font-bold tracking-wide">{coupon.code}</code>
                      <Badge variant={couponStatus.variant}>{couponStatus.label}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{coupon.discount_type === "PERCENTAGE" ? `${coupon.value}% off` : `৳${coupon.value} off`}</span>
                      <span>{interactionLabels[coupon.interaction_mode]}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(coupon.start_date)} – {formatDate(coupon.end_date)}</span>
                      <span>Used {coupon.used_count} / {coupon.usage_limit ?? "Unlimited"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3 lg:border-0 lg:pt-0">
                  <div className="flex items-center gap-2 pr-2">
                    <Switch
                      checked={coupon.is_active}
                      disabled={setActive.isPending}
                      onCheckedChange={(active) => setActive.mutate({ id: coupon.id, active })}
                      aria-label={`${coupon.is_active ? "Deactivate" : "Activate"} ${coupon.code}`}
                    />
                    <span className="text-xs text-muted-foreground lg:hidden">{coupon.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCouponToDelete(coupon)} aria-label={`Delete ${coupon.code}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )})}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "Create coupon"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update this coupon’s rules and availability." : "Configure a new checkout discount code."}
            </DialogDescription>
          </DialogHeader>
          <form id="coupon-form" onSubmit={submit} className="grid gap-5 py-2 sm:grid-cols-2">
            <Field label="Coupon name">
              <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer sale" />
            </Field>
            <Field label="Coupon code" hint="Customers enter this at checkout">
              <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="SUMMER20" className="font-mono uppercase" />
            </Field>
            <Field label="Discount type">
              <Select value={form.discount_type} onValueChange={(value: "PERCENTAGE" | "FIXED") => setForm({ ...form, discount_type: value, maximum_discount: value === "FIXED" ? null : form.maximum_discount })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="PERCENTAGE">Percentage</SelectItem><SelectItem value="FIXED">Fixed amount</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label={form.discount_type === "PERCENTAGE" ? "Discount percentage" : "Discount amount"}>
              <div className="relative">
                <Input required type="number" min="0.01" max={form.discount_type === "PERCENTAGE" ? 100 : undefined} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{form.discount_type === "PERCENTAGE" ? "%" : "৳"}</span>
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

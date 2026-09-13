"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSuppliers, useDeleteSupplier } from "@/hooks/queries/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusCircle,
  Search,
  Building2,
  Phone,
  Mail,
  Globe,
  MoreHorizontal,
  Edit3,
  Eye,
  Trash2,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier } from "@/types/inventory";
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
import { toast } from "sonner";

export default function SuppliersPage() {
  const router = useRouter();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      await deleteSupplier.mutateAsync(supplierToDelete.id);
      toast.success("Supplier deleted successfully");
    } catch (error) {
      toast.error("Failed to delete supplier");
      console.error("Error deleting supplier:", error);
    } finally {
      setSupplierToDelete(null);
    }
  };

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s: Supplier) => s.is_active).length;
  const totalProducts = suppliers.reduce(
    (sum: number, supplier: Supplier) => sum + (supplier.products_count || 0),
    0
  );
  const totalValue = suppliers.reduce(
    (sum: number, supplier: Supplier) => sum + (supplier.total_value || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-80" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>

          <div className="grid gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const SupplierCard = ({ supplier }: { supplier: Supplier }) => (
    <Card className="rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/40 border-b border-slate-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                {supplier.company_name}
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Package className="h-3 w-3 text-slate-400" />
                <span>{supplier.products_count || 0} Products</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-md border-slate-200">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/inventory/suppliers/${supplier.id}`}>
                  <Eye className="mr-2 h-4 w-4 text-slate-500" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/inventory/suppliers/edit/${supplier.id}`}>
                  <Edit3 className="mr-2 h-4 w-4 text-slate-500" />
                  Edit Supplier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 cursor-pointer focus:text-rose-600 focus:bg-rose-50"
                onClick={() => setSupplierToDelete(supplier)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Supplier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone className="h-3 w-3" />
              <span className="font-medium">Phone</span>
            </div>
            <p className="font-semibold text-slate-800 truncate">{supplier.phone || "N/A"}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Mail className="h-3 w-3" />
              <span className="font-medium">Email</span>
            </div>
            <p className="font-semibold text-slate-800 truncate">{supplier.email || "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500">Products</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {supplier.products_count || 0}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500">Total Value</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              ${supplier.total_value?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
          <span className="text-slate-400">Status</span>
          <Badge
            variant="outline"
            className={supplier.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 font-medium" : "bg-slate-100 text-slate-600 border-slate-200 font-medium"}
          >
            {supplier.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Suppliers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your vendors, suppliers, and procurement relationships
          </p>
        </div>
        <Button
          onClick={() => router.push("/inventory/suppliers/add")}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium"
        >
          <PlusCircle className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Suppliers
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalSuppliers}
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {activeSuppliers} Active Suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Supplied Products
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalProducts}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Across all vendors
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Procured Value
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Total procurement valuation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white border-slate-200 rounded-xl shadow-2xs text-sm"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!supplierToDelete}
        onOpenChange={() => setSupplierToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              supplier and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

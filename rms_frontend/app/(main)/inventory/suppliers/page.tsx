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
import { DataExportButton } from "@/components/data-export-button";
import { EmptyState } from "@/components/empty-state";

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
    <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-slate-50/40 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                {supplier.company_name}
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/inventory/suppliers/${supplier.id}`}>
                  <Eye className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/inventory/suppliers/edit/${supplier.id}`}>
                  <Edit3 className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  Edit Supplier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem
                className="text-rose-600 dark:text-rose-400 cursor-pointer focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
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
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone className="h-3 w-3" />
              <span className="font-medium">Phone</span>
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{supplier.phone || "N/A"}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Mail className="h-3 w-3" />
              <span className="font-medium">Email</span>
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{supplier.email || "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Products</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {supplier.products_count || 0}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Value</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              ${(supplier.total_value || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Badge
            variant={supplier.is_active ? "default" : "secondary"}
            className={
              supplier.is_active
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }
          >
            {supplier.is_active ? "Active" : "Inactive"}
          </Badge>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs h-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Link href={`/inventory/suppliers/${supplier.id}`}>
              View Profile
            </Link>
          </Button>
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
        <div className="flex items-center gap-2">
          <DataExportButton
            data={suppliers}
            filename="suppliers_directory"
            title="Suppliers & Vendors Directory"
          />
          <Button
            onClick={() => router.push("/inventory/suppliers/add")}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs font-medium text-xs h-9"
          >
            <PlusCircle className="h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Suppliers
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {totalSuppliers}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
              {activeSuppliers} Active Suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Supplied Products
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {totalProducts}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Across all vendors
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Procured Value
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Total procurement valuation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search suppliers by company name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs text-xs h-9"
        />
      </div>

      {/* Suppliers Grid or Empty State */}
      {filteredSuppliers.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
          <EmptyState
            icon={Building2}
            title={searchQuery ? "No suppliers match your search" : "No suppliers found"}
            description={
              searchQuery
                ? `No supplier matched the query "${searchQuery}". Try a different keyword.`
                : "Add your first supplier or procurement vendor to start managing purchase orders."
            }
            actionLabel={searchQuery ? "Clear Search" : "Add Supplier"}
            onAction={() => {
              if (searchQuery) setSearchQuery("");
              else router.push("/inventory/suppliers/add");
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      )}

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

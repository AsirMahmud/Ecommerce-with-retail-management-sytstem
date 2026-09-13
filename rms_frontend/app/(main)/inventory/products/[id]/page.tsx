"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useProduct, useDeleteProduct } from "@/hooks/queries/useInventory";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/inventory";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  Warehouse,
  Calendar,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import React, { useState } from "react";
import { ProductAnalytics } from "@/components/inventory/product-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddStockDialog } from "@/components/inventory/add-stock-dialog";
import { useQuery } from "@tanstack/react-query";
import { productsApi, type StockMovement } from "@/lib/api/inventory";
import { getImageUrl } from "@/lib/utils";
import QRCodeSVG from "react-qr-code";

export default function ProductPage() {
  const params = useParams();
  const productId =
    typeof params.id === "string" ? Number.parseInt(params.id) : 0;
  const { data: product, isLoading } = useProduct(productId);

  if (isLoading) {
    return <ProductSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Package className="h-16 w-16 text-muted-foreground opacity-30" />
        <p className="text-xl font-medium text-muted-foreground">
          Product not found
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return <ProductDetails product={product} />;
}

function ProductSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Main content skeleton */}
      <Card className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-1 w-full" />
            <div>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-1 w-full" />
            <div>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Variations skeleton */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="overflow-x-auto">
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    </div>
  );
}

interface ProductDetailsProps {
  product: Product;
}

function ProductDetails({ product }: ProductDetailsProps) {
  const router = useRouter();
  const deleteProduct = useDeleteProduct();
  const categoryName =
    typeof product.category === "object" ? product.category?.name : "N/A";
  const supplierName =
    typeof product.supplier === "object"
      ? product.supplier?.company_name
      : "N/A";

  const costPrice = Number(product.cost_price);
  const sellingPrice = Number(product.selling_price);
  const profitMargin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  const isLowStock = product.stock_quantity <= product.minimum_stock;
  const isOutOfStock = product.stock_quantity <= 0;

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted successfully");
      router.push("/inventory/products");
    } catch (error) {
      toast.error("Failed to delete product");
      console.error("Error deleting product:", error);
    }
  };

  // Fetch stock history and filter additions
  const { data: stockHistoryData, isLoading: isLoadingStockHistory } = useQuery({
    queryKey: ["product-stock-history", product.id],
    queryFn: () => productsApi.getStockHistory(product.id), // Get all-time data by default
  });
  const stockAdditions: StockMovement[] = (stockHistoryData?.stock_history || []).filter(
    (m: StockMovement) => m.movement_type === "IN"
  );

  return (
    <div className="space-y-8">
      {/* Header with navigation and actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Product Details
            </h1>
            <p className="text-muted-foreground">
              View and manage product information
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/inventory/edit-product/${product.id.toString()}`)
            }
          >
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-8">
          {/* Product overview card */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <Badge
                      variant={product.is_active ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
                {isLowStock && (
                  <div className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    {isOutOfStock ? "Out of Stock" : "Low Stock"}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                  {/* Product information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      Product Information
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          SKU
                        </p>
                        <p className="font-medium">{product.sku}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Barcode
                        </p>
                        <p className="font-medium">{product.barcode || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Category
                        </p>
                        <p className="font-medium">{categoryName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Online Categories
                        </p>
                        <p className="font-medium">
                          {product.online_categories && product.online_categories.length > 0
                            ? product.online_categories.map(c => c.name).join(", ")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Supplier
                        </p>
                        <p className="font-medium">{supplierName}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Pricing */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Pricing
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Cost Price
                        </p>
                        <p className="font-medium text-lg">
                          ${costPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Selling Price
                        </p>
                        <p className="font-medium text-lg">
                          ${sellingPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Profit Margin
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">
                            {profitMargin.toFixed(1)}%
                          </p>
                          <Badge
                            variant={
                              profitMargin > 30
                                ? "default"
                                : profitMargin > 15
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {profitMargin > 30
                              ? "High"
                              : profitMargin > 15
                                ? "Good"
                                : "Low"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Size Information */}
                  {(product.size_type ||
                    product.size_category ||
                    product.gender) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-indigo-500"
                          >
                            <path d="M4 7V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2Z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" x2="8" y1="13" y2="13" />
                            <line x1="16" x2="8" y1="17" y2="17" />
                            <polyline points="10,9 9,9 8,9" />
                          </svg>
                          Size Information
                        </h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          {product.size_type && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Size Type
                              </p>
                              <p className="font-medium capitalize">
                                {product.size_type}
                              </p>
                            </div>
                          )}
                          {product.size_category && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Size Category
                              </p>
                              <p className="font-medium">{product.size_category}</p>
                            </div>
                          )}
                          {product.gender && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Gender
                              </p>
                              <p className="font-medium">{product.gender}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  <Separator className="my-2" />
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  {/* Stock information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Warehouse className="h-5 w-5 text-purple-500" />
                      Stock Information
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Current Stock
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">
                            {product.stock_quantity}
                          </p>
                          {isOutOfStock ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : isLowStock ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Minimum Stock
                        </p>
                        <p className="font-medium text-lg">
                          {product.minimum_stock}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Stock Status
                        </p>
                        <Badge
                          variant={
                            isOutOfStock
                              ? "destructive"
                              : isLowStock
                                ? "outline"
                                : "default"
                          }
                          className="mt-1"
                        >
                          {isOutOfStock
                            ? "Out of Stock"
                            : isLowStock
                              ? "Low Stock"
                              : "In Stock"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Timestamps */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      Timestamps
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Created At
                        </p>
                        <p className="font-medium">
                          {product.created_at
                            ? new Date(product.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                              }
                            )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Last Updated
                        </p>
                        <p className="font-medium">
                          {product.updated_at
                            ? new Date(product.updated_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                              }
                            )
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Stock Addition History */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-emerald-600" />
                Stock Addition History
              </h3>
              <p className="text-sm text-muted-foreground">Recent stock IN movements by variation</p>
            </div>
            <div className="p-6">
              {isLoadingStockHistory ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : stockAdditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock additions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">Date</th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">Variation</th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">Quantity</th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">Reference</th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stockAdditions.slice(0, 20).map((m, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-3 text-sm">
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 text-sm">{m.variation_info || "General"}</td>
                          <td className="px-6 py-3 text-sm font-medium text-emerald-700">+{m.quantity}</td>
                          <td className="px-6 py-3 text-sm">{m.reference_number || "-"}</td>
                          <td className="px-6 py-3 text-sm text-muted-foreground">{m.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* Material Composition */}
          {product.material_composition && product.material_composition.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-amber-500"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Material Composition
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Product material breakdown
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {product.material_composition.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                            {material.percentige}%
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{material.title || "Material"}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.percentige}% composition
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Who Is This For */}
          {product.who_is_this_for && product.who_is_this_for.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-blue-500"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Who Is This For
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Target audience and use cases
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.who_is_this_for.map((item, index) => (
                    <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        {item.title || "Target Audience"}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {item.description || "No description provided"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Product Features */}
          {product.features && product.features.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-green-500"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                    <path d="M13 12h3a2 2 0 0 1 2 2v1" />
                    <path d="M9 12H6a2 2 0 0 0-2 2v1" />
                  </svg>
                  Product Features
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Key features and benefits
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.features.map((feature, index) => (
                    <div key={index} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                        {feature.title || "Feature"}
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {feature.description || "No description provided"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Product Gallery */}
          {product.galleries && product.galleries.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-pink-500"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  Product Gallery
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {product.galleries.length} color variant{product.galleries.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {product.galleries.map((gallery, galleryIndex) => (
                    <div key={galleryIndex} className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: gallery.color_hax || '#000000' }}
                        />
                        <h4 className="font-semibold text-lg capitalize">{gallery.color}</h4>
                        <Badge variant="outline" className="text-xs">
                          {gallery.images?.length || 0} image{(gallery.images?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {gallery.images && gallery.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {gallery.images.map((image, imageIndex) => {
                            const imageUrl = getImageUrl((image as any).image_url || image.image);
                            return (
                              <div
                                key={imageIndex}
                                className="relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors group cursor-pointer"
                                onClick={() => {
                                  // Open image in new tab for full view
                                  window.open(imageUrl, '_blank');
                                }}
                              >
                                <Image
                                  src={imageUrl || "/placeholder.svg"}
                                  alt={`${product.name} - ${gallery.color} - ${image.imageType}`}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <svg
                                      className="w-8 h-8 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                      />
                                    </svg>
                                  </div>
                                </div>
                                <div className="absolute top-2 right-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-black bg-opacity-70 text-white border-0"
                                  >
                                    {image.imageType}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No images</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Legacy Product image (fallback) */}
          {product.image && (!product.galleries || product.galleries.length === 0) && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-pink-500"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  Product Image
                </h3>
              </div>
              <div className="p-6">
                <div className="relative aspect-square w-64 mx-auto sm:mx-0 overflow-hidden rounded-lg shadow-md border">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <ProductAnalytics productId={product.id} />
        </TabsContent>

        <TabsContent value="variations">
          {/* Product variations */}
          {product.variations && product.variations.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5 text-blue-500" />
                  Product Variations
                </h3>
                <div className="flex items-center gap-2">
                  <AddStockDialog
                    productId={product.id}
                    variations={product.variations.map((v: any) => ({ id: v.id, size: v.size, color: v.color, stock: v.stock }))}
                  />
                  <Button
                    size="sm"
                    variant="default"
                    onClick={async () => await handlePrintAllVariantsByStock(product)}
                  >
                    Print All by Stock
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Color
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Waist Size
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Chest Size
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Height
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-sm text-muted-foreground">
                          Print Label
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {product.variations.map((variation) => (
                        <VariantPrintRow
                          key={variation.id}
                          product={product}
                          variation={variation}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VariantPrintRow({
  product,
  variation,
}: {
  product: Product;
  variation: any;
}) {
  const [customCount, setCustomCount] = useState(1);
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4 font-medium">{variation.size}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Find the gallery for this color and show first image */}
          {(() => {
            const gallery = product.galleries?.find(g =>
              g.color.toLowerCase() === variation.color.toLowerCase()
            );
            const firstImage = gallery?.images?.[0];
            const imageUrl = getImageUrl((firstImage as any)?.image_url || firstImage?.image);

            return imageUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200">
                <Image
                  src={imageUrl}
                  alt={`${variation.color} variant`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-lg border-2 border-gray-300 flex items-center justify-center"
                style={{
                  backgroundColor: variation.color_hax ||
                    (variation.color.toLowerCase() === "white" ? "#ffffff" :
                      variation.color.toLowerCase() === "blue" ? "#3b82f6" :
                        variation.color.toLowerCase() === "black" ? "#000000" :
                          variation.color.toLowerCase())
                }}
              >
                <Package className="h-4 w-4 text-white opacity-70" />
              </div>
            );
          })()}
          <div>
            <span className="font-medium">{variation.color}</span>
            {variation.color_hax && (
              <div className="text-xs text-muted-foreground">
                {variation.color_hax}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 font-medium">
        {variation.waist_size ? `${variation.waist_size}"` : "N/A"}
      </td>
      <td className="px-6 py-4 font-medium">
        {variation.chest_size ? `${variation.chest_size}"` : "N/A"}
      </td>
      <td className="px-6 py-4 font-medium">
        {variation.height ? `${variation.height}"` : "N/A"}
      </td>
      <td className="px-6 py-4 font-medium">{variation.stock}</td>
      <td className="px-6 py-4">
        <Badge
          variant={
            variation.stock <= 0
              ? "destructive"
              : variation.stock <= 5
                ? "outline"
                : "default"
          }
        >
          {variation.stock <= 0
            ? "Out of Stock"
            : variation.stock <= 5
              ? "Low Stock"
              : "In Stock"}
        </Badge>
      </td>
      <td className="px-6 py-4 space-x-1 flex items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handlePrintLabel(product, variation, 1)}
        >
          Print 1
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handlePrintLabel(product, variation, variation.stock)}
          disabled={variation.stock <= 0}
        >
          Print by Stock
        </Button>
        <input
          type="number"
          min={1}
          max={variation.stock}
          value={customCount}
          onChange={(e) => setCustomCount(Number(e.target.value))}
          className="w-14 px-1 py-0.5 border rounded text-sm mx-1"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePrintLabel(product, variation, customCount)}
          disabled={customCount < 1}
        >
          Print Custom
        </Button>
      </td>
    </tr>
  );
}

// Helper function to generate QR code data URL
function generateQRCodeDataURL(productId: number, size: string, color: string): Promise<string> {
  return new Promise((resolve) => {
    // Create cart data structure similar to ReceiptModal
    const cartData = {
      items: [{
        productId: String(productId),
        quantity: 1,
        variations: {
          color: color || "",
          size: size || "",
        },
      }],
    };

    // Compress by encoding as base64 JSON
    const qrCodeData = btoa(JSON.stringify(cartData));

    // Create a temporary container to render QR code (35mm ≈ 132px at 96 DPI)
    const qrSize = 132; // 35mm in pixels at 96 DPI
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = `${qrSize}px`;
    container.style.height = `${qrSize}px`;
    container.style.visibility = "hidden";
    document.body.appendChild(container);

    // Use React imports from the component
    const React = require("react");
    const ReactDOM = require("react-dom/client");

    const qrElement = React.createElement(QRCodeSVG, {
      value: qrCodeData,
      size: qrSize,
      level: "M",
      bgColor: "#ffffff",
      fgColor: "#000000",
    });

    let root: any = null;
    try {
      root = ReactDOM.createRoot(container);
      root.render(qrElement);
    } catch (error) {
      console.error("Failed to create React root:", error);
      document.body.removeChild(container);
      resolve("");
      return;
    }

    // Wait longer for QR code to render and increase retries
    let attempts = 0;
    const maxAttempts = 20;

    const checkForSVG = () => {
      attempts++;
      const svgElement = container.querySelector("svg");

      if (svgElement && svgElement.innerHTML) {
        try {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          // Convert SVG to base64 data URL directly
          const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
          const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

          // Also create PNG version for better print compatibility
          const img = document.createElement("img");
          img.crossOrigin = "anonymous";

          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = qrSize;
              canvas.height = qrSize;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, qrSize, qrSize);
                ctx.drawImage(img, 0, 0, qrSize, qrSize);
                const pngDataUrl = canvas.toDataURL("image/png");
                document.body.removeChild(container);
                if (root) root.unmount();
                resolve(pngDataUrl);
              } else {
                // Fallback to SVG
                document.body.removeChild(container);
                if (root) root.unmount();
                resolve(dataUrl);
              }
            } catch (err) {
              console.error("Error converting to PNG:", err);
              document.body.removeChild(container);
              if (root) root.unmount();
              resolve(dataUrl);
            }
          };

          img.onerror = () => {
            console.error("Error loading SVG image");
            document.body.removeChild(container);
            if (root) root.unmount();
            resolve(dataUrl); // Fallback to SVG data URL
          };

          img.src = dataUrl;
        } catch (err) {
          console.error("Error serializing SVG:", err);
          document.body.removeChild(container);
          if (root) root.unmount();
          resolve("");
        }
      } else if (attempts < maxAttempts) {
        setTimeout(checkForSVG, 50);
      } else {
        console.error("QR code failed to render after", maxAttempts, "attempts");
        document.body.removeChild(container);
        if (root) root.unmount();
        resolve("");
      }
    };

    // Start checking after initial delay
    setTimeout(checkForSVG, 200);
  });
}

async function handlePrintLabel(product: Product, variation: any, count: number) {
  if (!count || count < 1) return;

  // Generate QR code data URL
  const qrCodeDataURL = await generateQRCodeDataURL(
    product.id,
    variation.size,
    variation.color
  );

  // Log for debugging
  console.log("QR Code Data URL generated:", qrCodeDataURL ? "Yes" : "No", qrCodeDataURL ? qrCodeDataURL.substring(0, 50) + "..." : "");
  if (!qrCodeDataURL) {
    console.error("QR code generation failed");
    // Continue anyway - will show "No QR" placeholder
  }

  const printWindow = window.open("", "_blank", "width=220,height=120");
  if (!printWindow) return;
  const style = `
    <style>
      @page {
        size: 58mm auto;
        margin: 0;
      }
      body {
        width: 58mm;
        margin: 0;
        padding: 5mm;
        font-family: 'Courier New', monospace;
        font-size: 15px;
        line-height: 1.4;
        color: #000 !important;
        font-weight: 600;
        background: #fff !important;
      }
      .label {
        width: 58mm;
        height: 68mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        font-family: 'Courier New', monospace;
        font-size: 15px;
        border: 2px solid #000;
        background: #fff;
        font-weight: 700;
        padding: 3mm;
        margin-bottom: 5px;
        box-sizing: border-box;
      }
      .sku {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 1mm;
        color: #000;
        width: 100%;
        text-align: center;
      }
      .price, .size, .color {
        width: 100%;
        text-align: center;
        color: #000;
        font-weight: 700;
        font-size: 14px;
      }
      .price { font-size: 16px; font-weight: 800; margin-bottom: 1mm; }
      .size { font-size: 14px; }
      .color { font-size: 14px; }
      .color-swatch {
        display: inline-block;
        width: 12px;
        height: 12px;
        vertical-align: middle;
        margin-right: 4px;
        border: 1px solid #000;
        background: #fff;
      }
      .label-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
        justify-content: space-between;
        gap: 2mm;
      }
      .label-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        flex-shrink: 0;
      }
      .qr-code {
        width: 35mm;
        height: 35mm;
        max-width: 35mm;
        max-height: 35mm;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        display: block;
        border: 1px solid #000;
        background: #fff;
        flex-shrink: 0;
      }
      @media print {
        body {
          width: 58mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  `;
  let labels = "";
  for (let i = 0; i < count; i++) {
    labels += `
      <div class="label">
        <div class="label-content">
          <div class="label-text">
            <div class="sku">SKU: ${product.sku}</div>
            <div class="price">Price: $${product.selling_price}</div>
            <div class="size">Size: ${variation.size}</div>
            <div class="color">Color: <span class="color-swatch" style="background:${variation.color_hax || variation.color};"></span>${variation.color}</div>
          </div>
          ${qrCodeDataURL ? `<img src="${qrCodeDataURL.replace(/"/g, '&quot;')}" alt="QR Code" class="qr-code" />` : '<div class="qr-code" style="display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #000;">No QR</div>'}
        </div>
      </div>
    `;
  }
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Label</title>
        ${style}
      </head>
      <body>
        ${labels}
        <script>
        window.onload = function() {
          // Wait for images to load
          const images = document.querySelectorAll('img');
          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 300);
          } else {
            images.forEach(function(img) {
              img.onload = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  setTimeout(function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                  }, 500);
                }
              };
              img.onerror = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  setTimeout(function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                  }, 500);
                }
              };
              // Trigger load if already loaded
              if (img.complete) {
                img.onload();
              }
            });
          }
        };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

async function handlePrintAllVariantsByStock(product: Product) {
  const printWindow = window.open("", "_blank", "width=220,height=120");
  if (!printWindow) return;

  // Generate QR codes for all variations
  const variations = product.variations ?? [];
  const qrCodeMap: Record<string, string> = {};

  for (const variation of variations) {
    const key = `${variation.size}-${variation.color}`;
    if (!qrCodeMap[key]) {
      qrCodeMap[key] = await generateQRCodeDataURL(
        product.id,
        variation.size,
        variation.color
      );
    }
  }
  const style = `
    <style>
      @page {
        size: 58mm auto;
        margin: 0;
      }
      body {
        width: 58mm;
        margin: 0;
        padding: 5mm;
        font-family: 'Courier New', monospace;
        font-size: 15px;
        line-height: 1.4;
        color: #000 !important;
        font-weight: 600;
        background: #fff !important;
      }
      .label {
        width: 58mm;
        height: 68mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        font-family: 'Courier New', monospace;
        font-size: 15px;
        border: 2px solid #000;
        background: #fff;
        font-weight: 700;
        padding: 3mm;
        margin-bottom: 5px;
        box-sizing: border-box;
      }
      .sku {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 1mm;
        color: #000;
        width: 100%;
        text-align: center;
      }
      .price, .size, .color {
        width: 100%;
        text-align: center;
        color: #000;
        font-weight: 700;
        font-size: 14px;
      }
      .price { font-size: 16px; font-weight: 800; margin-bottom: 1mm; }
      .size { font-size: 14px; }
      .color { font-size: 14px; }
      .color-swatch {
        display: inline-block;
        width: 12px;
        height: 12px;
        vertical-align: middle;
        margin-right: 4px;
        border: 1px solid #000;
        background: #fff;
      }
      .label-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
        justify-content: space-between;
        gap: 2mm;
      }
      .label-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        flex-shrink: 0;
      }
      .qr-code {
        width: 35mm;
        height: 35mm;
        max-width: 35mm;
        max-height: 35mm;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        display: block;
        border: 1px solid #000;
        background: #fff;
        flex-shrink: 0;
      }
      @media print {
        body {
          width: 58mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  `;
  let labels = "";
  const productVariations = product.variations ?? [];
  for (const variation of productVariations) {
    const key = `${variation.size}-${variation.color}`;
    const qrCodeDataURL = qrCodeMap[key] || "";

    for (let i = 0; i < variation.stock; i++) {
      labels += `
        <div class="label">
          <div class="label-content">
            <div class="label-text">
              <div class="sku">SKU: ${product.sku}</div>
              <div class="price">Price: $${product.selling_price}</div>
              <div class="size">Size: ${variation.size}</div>
              <div class="color">Color: <span class="color-swatch" style="background:${variation.color_hax || variation.color};"></span>${variation.color}</div>
            </div>
            ${qrCodeDataURL ? `<img src="${qrCodeDataURL.replace(/"/g, '&quot;')}" alt="QR Code" class="qr-code" />` : '<div class="qr-code" style="display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #000;">No QR</div>'}
          </div>
        </div>
      `;
    }
  }
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print All Labels</title>
        ${style}
      </head>
      <body>
        ${labels}
        <script>
        window.onload = function() {
          // Wait for images to load
          const images = document.querySelectorAll('img');
          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }, 300);
          } else {
            images.forEach(function(img) {
              img.onload = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  setTimeout(function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                  }, 500);
                }
              };
              img.onerror = function() {
                loadedCount++;
                if (loadedCount === totalImages) {
                  setTimeout(function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                  }, 500);
                }
              };
              // Trigger load if already loaded
              if (img.complete) {
                img.onload();
              }
            });
          }
        };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

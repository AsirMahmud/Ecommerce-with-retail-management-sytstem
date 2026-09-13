"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteProducts, useDeleteProduct, useProductStats, useCategories } from "@/hooks/queries/useInventory";
import { productsApi } from "@/lib/api/inventory";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Search,
  SortAsc,
  Grid3X3,
  List,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  MoreHorizontal,
  Edit3,
  Eye,
  Trash2,
  Barcode,
  Tag,
  Building2,
  ShoppingCart,
  Globe,
  Globe2,
  Download,
} from "lucide-react";
import Link from "next/link";
import { saveAs } from "file-saver";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { Product } from "@/types/inventory";
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
import { getImageUrl, slugify, formatCurrency } from "@/lib/utils";

function ProductThumb({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
        <Package className="h-5 w-5 text-slate-400" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  // Debounce search
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [onlineFilter, setOnlineFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Fetch categories for filter dropdown
  const { data: categoriesData = [] } = useCategories();

  // Build filter params for API calls
  const filterParams = {
    search: debouncedSearch,
    category: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
    stock_status: stockFilter !== "all" ? stockFilter : undefined,
    assign_to_online: onlineFilter === "all" ? undefined : onlineFilter === "online",
  };

  // Fetch products with infinite scroll
  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({
    ...filterParams,
    page_size: 20,
  });

  // Fetch product statistics from backend
  const { data: statsData, isLoading: isStatsLoading } = useProductStats(filterParams);

  // Flatten pages into a single list of products
  const products = productsData?.pages.flatMap((page) => page.results) || [];
  const totalCount = productsData?.pages[0]?.count || 0;

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteProduct = useDeleteProduct();

  // Helper for debounce
  function useDebounce<T>(value: T, delay: number): [T] {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return [debouncedValue];
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
      console.error("Error deleting product:", error);
    } finally {
      setProductToDelete(null);
    }
  };

  const handleToggleOnlineAssignment = async (product: Product) => {
    try {
      const response = await productsApi.toggleOnlineAssignment(product.id);
      toast.success(response.message);
      // Refresh the products list - in React Query we should invalidate queries,
      // but reloading is a quick fallback if we don't have the query client here.
      // Better: useQueryClient().invalidateQueries(...) if we added it.
      // For now, keeping window.location.reload() or letting the user refresh manually effectively.
      // Actually, since we are using useProducts, we can let React Query handle it if we invalidate.
      window.location.reload();
    } catch (error) {
      toast.error("Failed to toggle online assignment");
      console.error("Error toggling online assignment:", error);
    }
  };

  const handleDownloadCatalog = async () => {
    const toastId = toast.loading("Preparing catalog download...");
    try {
      let allOnlineProducts: Product[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await productsApi.getAll({
          page: currentPage,
          page_size: 100, // Fetch in batches of 100
          assign_to_online: true,
          is_active: true,
          ordering: "-created_at"
        });

        if (response && response.results) {
          allOnlineProducts = [...allOnlineProducts, ...response.results];
          if (response.next) {
            currentPage++;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const onlineProducts = allOnlineProducts.filter((p: Product) => p.assign_to_online);

      if (onlineProducts.length === 0) {
        toast.dismiss(toastId);
        toast.error("No online products found to download");
        return;
      }

      const headers = [
        "id",
        "title",
        "description",
        "availability",
        "condition",
        "price",
        "link",
        "image_link",
        "brand",
        "google_product_category",
        "fb_product_category",
        "quantity_to_sell_on_facebook",
        "sale_price",
        "sale_price_effective_date",
        "item_group_id",
        "gender",
        "color",
        "size",
        "age_group",
        "material",
        "pattern",
        "shipping",
        "shipping_weight",
        "video[0].url",
        "video[0].tag[0]",
        "gtin",
        "product_tags[0]",
        "product_tags[1]",
        "style[0]",
      ];

      const rows: string[][] = [];

      onlineProducts.forEach((product: Product) => {
        // Base URL for links
        const ecomBaseUrl = "https://www.rawstitch.com.bd";

        // If the product has galleries (color variants), create a row for each
        if (product.galleries && product.galleries.length > 0) {
          product.galleries.forEach((gallery) => {
            const colorSlug = gallery.color ? slugify(gallery.color) : "";
            const variantId = colorSlug ? `${product.id}-${colorSlug}` : product.id.toString();
            const variantTitle = gallery.color ? `${product.name} - ${gallery.color}` : product.name;
            const variantImage = gallery.images?.[0]?.image || product.first_variation_image || product.image;

            const row = [
              variantId,
              variantTitle,
              product.description || "Premium quality clothing from Raw Stitch. Designed for style and comfort.",
              product.stock_quantity > 0 ? "in stock" : "out of stock",
              "new",
              `${product.selling_price} BDT`,
              `${ecomBaseUrl}/product/${product.id}${colorSlug ? `/${colorSlug}` : ""}`,
              getImageUrl(variantImage),
              "Raw Stitch",
              product.online_categories?.[0]?.name || product.category?.name || "",
              product.online_categories?.[0]?.name || product.category?.name || "",
              product.stock_quantity.toString(),
              product.discount_percentage && product.discount_percentage > 0 ? `${product.sale_price} BDT` : "",
              product.discount_end_date || "",
              product.sku,
              product.gender || "unisex",
              gallery.color || "",
              product.first_variation_size || "",
              "adult",
              product.material_composition_string || "",
              "", "", "", "", "", "", "", "", ""
            ];
            rows.push(row.map(val => `"${val?.toString().replace(/"/g, '""') || ""}"`));
          });
        } else {
          // Fallback for products without galleries
          const row = [
            product.id.toString(),
            product.name || "Raw Stitch Product",
            product.description || "Premium quality clothing from Raw Stitch.",
            product.stock_quantity > 0 ? "in stock" : "out of stock",
            "new",
            `${product.selling_price} BDT`,
            `${ecomBaseUrl}/product/${product.id}`,
            getImageUrl(product.first_variation_image || product.image),
            "Raw Stitch",
            product.online_categories?.[0]?.name || product.category?.name || "",
            product.online_categories?.[0]?.name || product.category?.name || "",
            product.stock_quantity.toString(),
            product.discount_percentage && product.discount_percentage > 0 ? `${product.sale_price} BDT` : "",
            product.discount_end_date || "",
            product.sku,
            product.gender || "unisex",
            product.first_variation_color || "",
            product.first_variation_size || "",
            "adult",
            product.material_composition_string || "",
            "", "", "", "", "", "", "", "", ""
          ];
          rows.push(row.map(val => `"${val?.toString().replace(/"/g, '""') || ""}"`));
        }
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "catalog_products.csv");
      toast.dismiss(toastId);
      toast.success("Catalog downloaded successfully");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to download catalog");
      console.error("Error downloading catalog:", error);
    }
  };

  // Use backend stats instead of client-side calculations
  const stats = statsData || {
    total_products: 0,
    active_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_cost: 0,
    total_value: 0,
    potential_profit: 0,
  };

  const filteredProducts = products; // Alias for compatibility with existing render code

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
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
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

  const ProductCard = ({ product }: { product: Product }) => {
    // Get the first image from galleries for display
    const firstImage = product.galleries?.[0]?.images?.[0];
    const imageUrl = getImageUrl(firstImage?.image);

    return (
      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {imageUrl ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-blue-300 transition-colors">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                    {product.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Barcode className="h-3 w-3" />
                    {product.sku}
                  </div>
                  {(product.size_type ||
                    product.size_category ||
                    product.gender) && (
                      <div className="flex gap-1 mt-1">
                        {product.size_type && (
                          <Badge variant="outline" className="text-xs bg-blue-100">
                            {product.size_type}
                          </Badge>
                        )}
                        {product.size_category && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-200"
                          >
                            {product.size_category}
                          </Badge>
                        )}
                        {product.gender && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-600 text-white"
                          >
                            {product.gender}
                          </Badge>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/inventory/products/${product.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/inventory/edit-product/${product.id}`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Product
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => setProductToDelete(product)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Category</span>
              </div>
              <p className="font-medium">
                {product.category?.name || "Uncategorized"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Supplier</span>
              </div>
              <p className="font-medium">
                {product.supplier?.company_name || "No Supplier"}
              </p>
            </div>
          </div>

          {/* Gallery Preview */}
          {product.galleries && product.galleries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Available Colors</p>
              <div className="flex gap-2 flex-wrap">
                {product.galleries.map((gallery, index) => {
                  const firstImage = gallery.images?.[0];
                  const imageUrl = getImageUrl(firstImage?.image);
                  return (
                    <div
                      key={index}
                      className="relative group"
                      title={`${gallery.color} (${gallery.images?.length || 0} images)`}
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={gallery.color}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: gallery.color_hax || '#000000' }}
                          />
                        )}
                      </div>
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {gallery.color}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cost Price</p>
              <p className="text-base font-bold text-slate-700">
                {formatCurrency(product.cost_price)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Selling Price</p>
              <p className="text-base font-bold text-emerald-600">
                {formatCurrency(product.selling_price)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-base font-bold text-blue-600">
                {formatCurrency(product.cost_price * product.stock_quantity)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Potential Profit</p>
              <p className="text-base font-bold text-indigo-600">
                {formatCurrency((product.selling_price - product.cost_price) * product.stock_quantity)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Stock Level</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{product.stock_quantity}</p>
                {product.stock_quantity <= product.minimum_stock && (
                  <Badge variant="destructive" className="text-xs">
                    Low Stock
                  </Badge>
                )}
              </div>
            </div>
            <Badge
              variant={product.is_active ? "default" : "secondary"}
              className="ml-auto"
            >
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Online Status</p>
              <p className="text-sm font-medium">
                {product.assign_to_online ? "Online" : "Offline"}
              </p>
            </div>
            <Button
              variant={product.assign_to_online ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggleOnlineAssignment(product)}
              className={`flex items-center gap-2 ${product.assign_to_online
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-gray-300 hover:bg-gray-50"
                }`}
            >
              {product.assign_to_online ? (
                <>
                  <Globe className="h-3 w-3" />
                  Online
                </>
              ) : (
                <>
                  <Globe2 className="h-3 w-3" />
                  Offline
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 text-white">
              <ShoppingCart className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Products
              </h1>
              <p className="text-slate-500 mt-0.5 text-xs sm:text-sm font-medium">
                Manage your product catalog, pricing, and stock levels
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadCatalog}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs text-xs sm:text-sm h-9 rounded-xl"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download Catalog
            </Button>
            <Button
              onClick={() => router.push("/inventory/add-product")}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 text-xs sm:text-sm h-9 rounded-xl font-medium"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Products</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isStatsLoading ? "..." : stats.total_products}
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-1">
              {isStatsLoading ? "Loading..." : `${stats.active_products} Active`}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Cost</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isStatsLoading ? "..." : formatCurrency(stats.total_cost)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Stock Cost
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Value</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isStatsLoading ? "..." : formatCurrency(stats.total_value)}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Selling Value
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Potential Profit</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {isStatsLoading ? "..." : formatCurrency(stats.potential_profit)}
            </div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">
              Expected Profit
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Low Stock</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isStatsLoading ? "..." : stats.low_stock_products}
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Reorder needed
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Out of Stock</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isStatsLoading ? "..." : stats.out_of_stock_products}
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              Needs restock
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesData.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                  <SelectValue placeholder="Stock Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={onlineFilter} onValueChange={setOnlineFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                  <SelectValue placeholder="Online/Offline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="online">Online Products</SelectItem>
                  <SelectItem value="offline">Offline Products</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className="h-12 w-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-12 w-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List/Grid */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Card className="border border-slate-200/90 shadow-2xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Products List
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {filteredProducts.length} items found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-semibold text-xs text-slate-600">Product</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Category</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Online Cat.</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Stock</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Price</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Sale Price</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600">Online</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-600 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    // Get the first image from galleries for display
                    const firstImage = product.galleries?.[0]?.images?.[0];
                    const imageUrl = getImageUrl(firstImage?.image);

                    return (
                      <TableRow key={product.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProductThumb src={imageUrl} alt={product.name} />
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                              <p className="text-xs text-slate-500 font-mono">
                                {product.sku}
                              </p>
                              {(product.size_type ||
                                product.size_category ||
                                product.gender) && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {product.size_type && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {product.size_type}
                                      </span>
                                    )}
                                    {product.size_category && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {product.size_category}
                                      </span>
                                    )}
                                    {product.gender && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                        {product.gender.toLowerCase()}
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 text-sm">
                          {product.category?.name || "Uncategorized"}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600 text-xs">
                          {product.online_categories && product.online_categories.length > 0
                            ? product.online_categories.map(c => c.name).join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">{product.stock_quantity}</span>
                            {product.stock_quantity <= product.minimum_stock && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 text-sm">
                          {formatCurrency(product.selling_price)}
                        </TableCell>
                        <TableCell>
                          {product.discount_percentage && product.discount_percentage > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-600 text-sm">{formatCurrency(product.sale_price)}</span>
                              <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(product.selling_price)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={product.assign_to_online ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleOnlineAssignment(product)}
                            className={`flex items-center gap-2 ${product.assign_to_online
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "border-gray-300 hover:bg-gray-50"
                              }`}
                          >
                            {product.assign_to_online ? (
                              <>
                                <Globe className="h-3 w-3" />
                                Online
                              </>
                            ) : (
                              <>
                                <Globe2 className="h-3 w-3" />
                                Offline
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                asChild
                                className="cursor-pointer"
                              >
                                <Link href={`/inventory/products/${product.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                asChild
                                className="cursor-pointer"
                              >
                                <Link
                                  href={`/inventory/edit-product/${product.id}`}
                                >
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit Product
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onClick={() => setProductToDelete(product)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Infinite Scroll Loader and Info */}
        <div className="flex flex-col items-center justify-center gap-4 py-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-sm">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{products.length}</span> of{" "}
            <span className="font-medium">{totalCount}</span> products
          </div>
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading more products...
            </div>
          )}
          {!hasNextPage && products.length > 0 && (
            <div className="text-sm text-muted-foreground">
              All products loaded
            </div>
          )}
          {/* Intersection observer target */}
          <div ref={observerTarget} className="h-1 w-full" />
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!productToDelete}
          onOpenChange={() => setProductToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                product and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProduct}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

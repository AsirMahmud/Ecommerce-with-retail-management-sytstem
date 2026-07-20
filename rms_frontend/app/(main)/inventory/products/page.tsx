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
import { getImageUrl, slugify } from "@/lib/utils";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
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
              <p className="text-lg font-bold text-red-600">
                ${product.cost_price}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Selling Price</p>
              <p className="text-lg font-bold text-green-600">
                ${product.selling_price}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold text-blue-600">
                ${(product.cost_price * product.stock_quantity).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Potential Profit</p>
              <p className="text-lg font-bold text-green-600">
                $
                {(
                  (product.selling_price - product.cost_price) *
                  product.stock_quantity
                ).toLocaleString()}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Products
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your product inventory and stock levels
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadCatalog}
              className="border-blue-200 hover:bg-blue-50 text-blue-700 shadow-sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Catalog (CSV)
            </Button>
            <Button
              onClick={() => router.push("/inventory/add-product")}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Products
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {isStatsLoading ? "..." : stats.total_products}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                {isStatsLoading ? "Loading..." : `${stats.active_products} Active Products`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Cost
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {isStatsLoading ? "..." : `$${stats.total_cost.toLocaleString()}`}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Cost Value of Current Stock
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Value
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {isStatsLoading ? "..." : `$${stats.total_value.toLocaleString()}`}
              </div>
              <p className="text-xs text-green-600 font-medium mt-1">
                Total Selling Value
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Potential Profit
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {isStatsLoading ? "..." : `$${stats.potential_profit.toLocaleString()}`}
              </div>
              <p className="text-xs text-green-600 font-medium mt-1">
                Expected Gross Profit
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Low Stock Items
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {isStatsLoading ? "..." : stats.low_stock_products}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Needs attention
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Out of Stock
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {isStatsLoading ? "..." : stats.out_of_stock_products}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Immediate action required
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm mb-6">
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
                <SelectTrigger className="w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
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
                <SelectTrigger className="w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
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
                <SelectTrigger className="w-[180px] h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
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
          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Products List
              </CardTitle>
              <CardDescription>
                {filteredProducts.length} products found
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Online Cat.</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    // Get the first image from galleries for display
                    const firstImage = product.galleries?.[0]?.images?.[0];
                    const imageUrl = getImageUrl(firstImage?.image);

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                <img
                                  src={imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.sku}
                              </p>
                              {(product.size_type ||
                                product.size_category ||
                                product.gender) && (
                                  <div className="flex gap-1 mt-1">
                                    {product.size_type && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-blue-100"
                                      >
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
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.category?.name || "Uncategorized"}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {product.online_categories && product.online_categories.length > 0
                            ? product.online_categories.map(c => c.name).join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.stock_quantity}</span>
                            {product.stock_quantity <= product.minimum_stock && (
                              <Badge variant="destructive" className="text-xs">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>${product.selling_price}</TableCell>
                        <TableCell>
                          {product.discount_percentage && product.discount_percentage > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-green-600">${product.sale_price}</span>
                              <span className="text-[10px] text-muted-foreground line-through">${product.selling_price}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={product.is_active ? "default" : "secondary"}
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

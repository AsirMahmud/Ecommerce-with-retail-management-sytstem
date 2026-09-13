"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Star,
  TrendingUp,
  Sparkles,
  Filter,
  Save,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useProducts, useOnlineCategories } from "@/hooks/queries/useInventory";
import {
  useUpdateProductEcommerceStatus,
  useProductStatuses,
  useCreateProductStatus,
  useUpdateProductStatus,
  useDeleteProductStatus,
  ProductStatus
} from "@/hooks/queries/useEcommerce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { getImageUrl } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  image: string;
  image_url?: string;
  category: string;
  online_category_name?: string;
  price: number;
  selling_price: number;
  stock: number;
  stock_quantity: number;
  is_new_arrival: boolean;
  is_trending: boolean;
  is_featured: boolean;
  ecommerce_statuses: { id: number; name: string }[];
  status: string;
  assign_to_online: boolean;
}

interface StatusForm {
  name: string;
  display_on_home: boolean;
  display_order: number;
  is_active: boolean;
}

export default function ProductStatusPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Use React Query hooks
  const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts({
    page: currentPage,
    page_size: itemsPerPage,
    search: searchQuery,
    online_category: categoryFilter !== "all" ? [parseInt(categoryFilter)] : undefined,
  });

  const { data: statuses = [], isLoading: statusesLoading, refetch: refetchStatuses } = useProductStatuses();

  const createStatusMutation = useCreateProductStatus();
  const updateStatusMutation = useUpdateProductStatus();
  const deleteStatusMutation = useDeleteProductStatus();
  const updateProductMutation = useUpdateProductEcommerceStatus();

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProductStatus | null>(null);
  const [statusForm, setStatusForm] = useState<StatusForm>({
    name: "",
    display_on_home: true,
    display_order: 0,
    is_active: true
  });

  // Transform products data
  const transformedProducts = (productsData?.results || []).map((product: any) => {
    // Ensure ecommerce_statuses is a normalized array of objects
    const rawStatuses = product.ecommerce_statuses || [];
    const normalizedStatuses = rawStatuses.map((s: any) => {
      if (typeof s === 'number' || typeof s === 'string') {
        // Find name from the master statuses list if possible
        const found = statuses.find(ms => ms.id === Number(s));
        return { id: Number(s), name: found?.name || `Section ${s}` };
      }
      return { id: s.id, name: s.name || `Section ${s.id}` };
    });

    // Get the first image from galleries if available, similar to the inventory page
    const firstGalleryImage = product.galleries?.[0]?.images?.[0]?.image;
    const imageUrl = getImageUrl(firstGalleryImage || product.image_url || product.image);

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      image: imageUrl,
      category: product.category_name || "Uncategorized",
      price: product.selling_price,
      stock: product.stock_quantity,
      is_new_arrival: product.is_new_arrival,
      is_trending: product.is_trending,
      is_featured: product.is_featured,
      ecommerce_statuses: normalizedStatuses,
      status: product.assign_to_online ? "active" : "inactive",
      assign_to_online: product.assign_to_online || false,
    };
  });

  const totalCount = productsData?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleToggleStatus = async (productId: number, field: string, value: boolean) => {
    try {
      await updateProductMutation.mutateAsync({
        productId,
        status: { [field]: value }
      });
      toast.success(`${field.replace('is_', '').replace('_', ' ')} updated`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleToggleDynamicStatus = async (productId: number, statusId: number) => {
    const product = transformedProducts.find(p => p.id === productId);
    if (!product) return;

    const currentStatuses = product.ecommerce_statuses.map((s: { id: number; name: string }) => s.id);
    const newStatuses = currentStatuses.includes(statusId)
      ? currentStatuses.filter((id: number) => id !== statusId)
      : [...currentStatuses, statusId];

    try {
      await updateProductMutation.mutateAsync({
        productId,
        status: { ecommerce_statuses: newStatuses }
      });
      // Immediately refetch to ensure UI is in sync
      await refetchProducts();
      toast.success("Section updated");
    } catch (error) {
      toast.error("Failed to update section");
    }
  };

  const handleBulkUpdateSections = async (productId: number, sectionIds: number[]) => {
    try {
      await updateProductMutation.mutateAsync({
        productId,
        status: { ecommerce_statuses: sectionIds }
      });
      // Immediately refetch to ensure UI is in sync
      await refetchProducts();
      toast.success("Sections updated");
    } catch (error) {
      toast.error("Failed to update sections");
    }
  };

  const handleSaveStatus = async () => {
    try {
      if (editingStatus) {
        await updateStatusMutation.mutateAsync({ id: editingStatus.id, status: statusForm });
        toast.success("Status updated");
      } else {
        await createStatusMutation.mutateAsync(statusForm);
        toast.success("Status created");
      }
      setIsDialogOpen(false);
      setEditingStatus(null);
      resetStatusForm();
    } catch (error) {
      toast.error("Failed to save status");
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (confirm("Are you sure you want to delete this status?")) {
      try {
        await deleteStatusMutation.mutateAsync(id);
        toast.success("Status deleted");
      } catch (error) {
        toast.error("Failed to delete status");
      }
    }
  };

  const resetStatusForm = () => {
    setStatusForm({
      name: "",
      display_on_home: true,
      display_order: 0,
      is_active: true
    });
  };

  const openEditDialog = (status: ProductStatus) => {
    setEditingStatus(status);
    setStatusForm({
      name: status.name,
      display_on_home: status.display_on_home,
      display_order: status.display_order,
      is_active: status.is_active
    });
    setIsDialogOpen(true);
  };

  const { data: categoriesData = [] } = useOnlineCategories();

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setFeatureFilter("all");
    setCurrentPage(1);
  };

  const categories = categoriesData.map((c: any) => ({ id: c.id, name: c.name }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    } else if (stock < 10) {
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Star className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Status & Sections</h1>
          </div>
          <p className="text-sm text-slate-500">
            Define dynamic promotional home page sections and assign curated inventory items.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status Management (Sections) */}
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Home Page Showcase Sections
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define dynamic product rows and showcase tags for your storefront
              </CardDescription>
            </div>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingStatus(null);
                  resetStatusForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStatus ? "Edit Section" : "Add New Section"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Section Name</Label>
                      <Input
                        id="name"
                        value={statusForm.name}
                        onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                        placeholder="e.g. Summer Collection"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="display_on_home">Display on Home Page</Label>
                      <Switch
                        id="display_on_home"
                        checked={statusForm.display_on_home}
                        onCheckedChange={(checked) => setStatusForm({ ...statusForm, display_on_home: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order">Display Order</Label>
                      <Input
                        id="order"
                        type="number"
                        value={statusForm.display_order}
                        onChange={(e) => setStatusForm({ ...statusForm, display_order: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Active</Label>
                      <Switch
                        id="is_active"
                        checked={statusForm.is_active}
                        onCheckedChange={(checked) => setStatusForm({ ...statusForm, is_active: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveStatus}>
                      {editingStatus ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statuses.map((status: ProductStatus) => (
                  <div key={status.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{status.name}</h3>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(status)}>
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteStatus(status.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm mb-4">
                        <Badge variant={status.display_on_home ? "default" : "secondary"}>
                          {status.display_on_home ? "Showing on Home" : "Hidden"}
                        </Badge>
                        <Badge variant={status.is_active ? "outline" : "destructive"}>
                          {status.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">Order: {status.display_order}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {statuses.length === 0 && !statusesLoading && (
                  <div className="col-span-full py-8 text-center text-gray-500 italic">
                    No dynamic sections created yet. Add your first section above!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Filters & Search
              </CardTitle>
              <CardDescription>
                Filter and search products to manage their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Products</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feature</label>
                  <Select value={featureFilter} onValueChange={setFeatureFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Features</SelectItem>
                      <SelectItem value="new">New Arrival</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} products
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset Filters</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Featured Inventory Curation
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Assign specific products to the showcase sections defined above
                  </CardDescription>
                </div>
                <Button
                  onClick={() => { refetchProducts(); refetchStatuses(); }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 flex items-center space-x-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productsLoading || statusesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading products...</span>
                </div>
              ) : productsError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-red-500 mb-4">
                    <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load products</h3>
                  <p className="text-gray-500 mb-4">There was an error loading the products data.</p>
                  <Button onClick={() => refetchProducts()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
                    <div className="col-span-3">Product</div>
                    <div className="col-span-2 text-center">Category/Status</div>
                    <div className="col-span-1 text-center">Stock</div>
                    <div className="col-span-6">Home Page Sections</div>
                  </div>

                  {/* Products */}
                  {transformedProducts.map((product) => (
                    <div key={product.id} className="grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-2">
                      <div className="col-span-3 flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image && product.image !== "/placeholder.svg" ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="truncate">
                          <div className="font-medium text-gray-900 truncate" title={product.name}>{product.name}</div>
                          <div className="text-sm text-gray-500">${product.price}</div>
                        </div>
                      </div>

                      <div className="col-span-2 text-center">
                        <div className="text-xs text-gray-500 mb-1">{product.category}</div>
                        {getStatusBadge(product.status)}
                      </div>

                      <div className="col-span-1 text-center">
                        {getStockBadge(product.stock)}
                      </div>

                      <div className="col-span-6 flex flex-wrap gap-2 items-center min-h-[40px]">
                        {product.ecommerce_statuses.map((s: { id: number; name: string }) => (
                          <Badge
                            key={s.id}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 py-1"
                          >
                            <span className="max-w-[100px] truncate">{s.name}</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleDynamicStatus(product.id, s.id);
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 flex items-center gap-1 border-dashed text-gray-400 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50/50"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="text-xs">Select Sections</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <div className="flex items-center justify-between pr-8">
                                <DialogTitle>Home Page Sections</DialogTitle>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Live Sync
                                </div>
                              </div>
                              <CardDescription className="flex items-center gap-2 mt-2">
                                <span className="h-8 w-8 relative rounded overflow-hidden border border-gray-100 block shrink-0">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder.svg';
                                    }}
                                  />
                                </span>
                                <span>Select which sections should feature <strong>{product.name}</strong></span>
                              </CardDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {statuses.filter((s: ProductStatus) => s.is_active).map((status: ProductStatus) => {
                                  const isSelected = product.ecommerce_statuses.some((s: any) => s.id === status.id);

                                  return (
                                    <div
                                      key={`${product.id}-${status.id}`}
                                      className="flex items-center justify-between space-x-3 rounded-md border p-3 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex-1 select-none">
                                        <Label
                                          htmlFor={`product-${product.id}-status-${status.id}`}
                                          className="text-sm font-semibold leading-none cursor-pointer"
                                        >
                                          {status.name}
                                        </Label>
                                        {status.display_on_home && (
                                          <p className="text-[10px] text-blue-600 font-medium mt-1 uppercase tracking-wider">Show on Home</p>
                                        )}
                                      </div>
                                      <Switch
                                        id={`product-${product.id}-status-${status.id}`}
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleDynamicStatus(product.id, status.id)}
                                        disabled={updateProductMutation.isPending}
                                      />
                                    </div>
                                  );
                                })}
                                {statuses.filter((s: ProductStatus) => s.is_active).length === 0 && (
                                  <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-500">
                                    No active sections found. Create sections at the top of the page.
                                  </div>
                                )}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="secondary" className="w-full" onClick={(e: any) => {
                                const btn = e.currentTarget.closest('[role="dialog"]')?.querySelector('button[aria-label="Close"]');
                                if (btn instanceof HTMLElement) btn.click();
                              }}>
                                Close
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}

                  {transformedProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No products found matching your criteria.
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

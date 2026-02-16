"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Percent,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  FolderTree,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  useDiscounts,
  useCreateDiscount,
  useUpdateDiscount,
  useDeleteDiscount
} from "@/hooks/queries/useEcommerce";
import { useInfiniteProducts } from "@/hooks/queries/useInventory";
import { useDebounce } from "@/hooks/use-debounce";
import { Discount } from "@/lib/api/ecommerce";
import { categoriesApi, onlineCategoriesApi, productsApi } from "@/lib/api/inventory";
import { Category, Product } from "@/types/inventory";

export default function DiscountManagementPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openProductCombobox, setOpenProductCombobox] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "APP_WIDE",
    value: "",
    startDate: "",
    endDate: "",
    description: "",
    categories: [] as string[],
    onlineCategories: [] as string[],
    products: [] as string[],
  });

  const [productSearch, setProductSearch] = useState("");
  const [selectedProductsDetails, setSelectedProductsDetails] = useState<Product[]>([]);
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Data for selectors
  const [categories, setCategories] = useState<Category[]>([]);
  const [onlineCategories, setOnlineCategories] = useState<Category[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Use React Query hooks
  const { data: discounts = [], isLoading: isLoadingDiscounts, refetch } = useDiscounts();
  const createDiscountMutation = useCreateDiscount();
  const updateDiscountMutation = useUpdateDiscount();
  const deleteDiscountMutation = useDeleteDiscount();

  const {
    data: productsData,
    fetchNextPage: fetchNextProducts,
    hasNextPage: hasMoreProducts,
    isFetchingNextPage: isFetchingMoreProducts,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
  } = useInfiniteProducts(
    { search: debouncedProductSearch },
    {
      placeholderData: (previousData: any) => previousData,
      enabled: true
    }
  );

  const allProducts = productsData?.pages.flatMap(page => page.results) || [];
  const isLoading = isLoadingDiscounts;

  // Load categories for selectors
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [cats, onlineCats] = await Promise.all([
          categoriesApi.getAll(),
          onlineCategoriesApi.getAll(),
        ]);

        // Handle potential paginated responses
        const catsData = Array.isArray(cats) ? cats : (cats as any).results || [];
        const onlineCatsData = Array.isArray(onlineCats) ? onlineCats : (onlineCats as any).results || [];

        setCategories(catsData);
        setOnlineCategories(onlineCatsData);
      } catch (error) {
        console.error('Error loading options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  // Set up infinite scroll observer for products
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !isFetchingMoreProducts) {
          fetchNextProducts();
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
  }, [hasMoreProducts, isFetchingMoreProducts, fetchNextProducts]);

  const resetForm = () => {
    setFormData({
      name: "",
      type: "APP_WIDE",
      value: "",
      startDate: "",
      endDate: "",
      description: "",
      categories: [],
      onlineCategories: [],
      products: [],
    });
    setSelectedProductsDetails([]);
  };

  const handleCreateDiscount = async () => {
    if (!formData.name || !formData.value || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate category/product selection based on type
    if (formData.type === "CATEGORY" && formData.categories.length === 0 && formData.onlineCategories.length === 0) {
      toast.error("Please select at least one category for category discount");
      return;
    }
    if (formData.type === "PRODUCT" && formData.products.length === 0) {
      toast.error("Please select at least one product for product discount");
      return;
    }

    try {
      await createDiscountMutation.mutateAsync({
        name: formData.name,
        discount_type: formData.type as 'APP_WIDE' | 'CATEGORY' | 'PRODUCT',
        value: parseFloat(formData.value),
        start_date: formData.startDate,
        end_date: formData.endDate,
        description: formData.description,
        is_active: true,
        status: 'ACTIVE',
        categories: formData.categories.map(c => Number(c)),
        online_categories: formData.onlineCategories.map(c => Number(c)),
        products: formData.products.map(p => Number(p)),
      });

      resetForm();
      setIsCreating(false);
      toast.success("Discount created successfully!");
    } catch (error) {
      console.error('Error creating discount:', error);
      toast.error("Failed to create discount");
    }
  };

  const handleEditDiscount = (id: number) => {
    const discount = discounts.find((d: Discount) => d.id === id);
    if (discount) {
      // Format dates for input type="date" (YYYY-MM-DD)
      const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0];
      };

      setFormData({
        name: discount.name,
        type: discount.discount_type,
        value: discount.value.toString(),
        startDate: formatDate(discount.start_date),
        endDate: formatDate(discount.end_date),
        description: discount.description || "",
        categories: discount.categories?.map(id => id.toString()) || [],
        onlineCategories: discount.online_categories?.map(id => id.toString()) || [],
        products: discount.products?.map(id => id.toString()) || [],
      });

      // Seed selectedProductsDetails with already existing details if available
      if ((discount as any).products_detail) {
        setSelectedProductsDetails((discount as any).products_detail);
      }

      setEditingId(id);
      setProductSearch("");
    }
  };

  const handleUpdateDiscount = async () => {
    if (!formData.name || !formData.value || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateDiscountMutation.mutateAsync({
        id: editingId!,
        name: formData.name,
        discount_type: formData.type as 'APP_WIDE' | 'CATEGORY' | 'PRODUCT',
        value: parseFloat(formData.value),
        start_date: formData.startDate,
        end_date: formData.endDate,
        description: formData.description,
        categories: formData.categories.map(c => Number(c)),
        online_categories: formData.onlineCategories.map(c => Number(c)),
        products: formData.products.map(p => Number(p)),
      });

      resetForm();
      setEditingId(null);
      setSelectedProductsDetails([]);
      toast.success("Discount updated successfully!");
    } catch (error) {
      console.error('Error updating discount:', error);
      toast.error("Failed to update discount");
    }
  };

  const handleDeleteDiscount = async (id: number) => {
    try {
      await deleteDiscountMutation.mutateAsync(id);
      toast.success("Discount deleted successfully!");
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error("Failed to delete discount");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "APP_WIDE":
        return "Global";
      case "CATEGORY":
        return "Category";
      case "PRODUCT":
        return "Product";
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "APP_WIDE":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Global</Badge>;
      case "CATEGORY":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Category</Badge>;
      case "PRODUCT":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Product</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Merge selected products with search results to ensure they are available for display
  const displayProducts = [...allProducts];
  formData.products.forEach(id => {
    if (!displayProducts.find(p => p.id.toString() === id)) {
      // 1. Check selectedProductsDetails (newly selected in this session)
      const detail = selectedProductsDetails.find(p => p.id.toString() === id);
      if (detail) {
        displayProducts.push(detail);
      } else {
        // 2. Check the existing discount details (if editing)
        const discount = editingId ? (discounts as any).find((d: any) => d.id === editingId) : null;
        const existingDetail = discount?.products_detail?.find((pd: any) => pd.id.toString() === id);
        if (existingDetail) {
          displayProducts.push(existingDetail);
        }
      }
    }
  });

  const getTargetName = (discount: any) => {
    if (discount.discount_type === "APP_WIDE") return "All Products";

    if (discount.discount_type === "CATEGORY") {
      const names: string[] = [];

      if (discount.online_categories_detail && discount.online_categories_detail.length > 0) {
        discount.online_categories_detail.forEach((c: any) => names.push(c.name));
      } else if (discount.online_categories && discount.online_categories.length > 0) {
        discount.online_categories.forEach((id: number) => {
          const cat = onlineCategories.find((c) => c.id === id);
          names.push(cat?.name || `Online Category #${id}`);
        });
      }

      if (discount.categories_detail && discount.categories_detail.length > 0) {
        discount.categories_detail.forEach((c: any) => names.push(c.name));
      } else if (discount.categories && discount.categories.length > 0) {
        discount.categories.forEach((id: number) => {
          const cat = categories.find((c) => c.id === id);
          names.push(cat?.name || `Category #${id}`);
        });
      }

      return names.length > 0 ? names.join(", ") : "Unknown Category";
    }

    if (discount.discount_type === "PRODUCT") {
      const names: string[] = [];

      if (discount.products_detail && discount.products_detail.length > 0) {
        discount.products_detail.forEach((p: any) => names.push(p.name));
      } else if (discount.products && discount.products.length > 0) {
        discount.products.forEach((id: number) => {
          // Check displayProducts first, then fall back to ID
          const prod = displayProducts.find((p) => p.id === id);
          names.push(prod?.name || `Product #${id}`);
        });
      }

      return names.length > 0 ? names.join(", ") : "Unknown Product";
    }

    return "-";
  };

  // Helper to get consistent image URL
  const getProductImage = (product: Product | undefined) => {
    if (!product) return "/placeholder.svg";
    const img = product.image || product.first_variation_image;
    if (!img) return "/placeholder.svg";
    if (img.startsWith("/")) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}${img}`;
    }
    return img;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Percent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Discount Management
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage discount campaigns for your products.
              </p>
            </div>
          </div>
        </div>

        {/* Priority Info Alert */}
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Discount Priority:</strong> Product discounts override Category discounts, which override Global (App-Wide) discounts.
            Only one discount applies per product based on this priority.
          </AlertDescription>
        </Alert>

        <div className="grid gap-8">
          {/* Create/Edit Discount Form */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {editingId ? "Edit Discount" : isCreating ? "Create New Discount" : "Discount Management"}
              </CardTitle>
              <CardDescription>
                {editingId ? "Update discount details" : isCreating ? "Add a new discount campaign" : "Manage your discount campaigns"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCreating || editingId ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Discount Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter discount name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Discount Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          type: value,
                          categories: [],
                          onlineCategories: [],
                          products: []
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APP_WIDE">🌐 Global (App-Wide)</SelectItem>
                          <SelectItem value="CATEGORY">📁 Category Discount</SelectItem>
                          <SelectItem value="PRODUCT">📦 Product Discount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category Selector - shown only for CATEGORY type */}
                    {formData.type === "CATEGORY" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="online-category">
                            <FolderTree className="inline h-4 w-4 mr-1" />
                            Online Categories
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-10">
                                {formData.onlineCategories.length > 0
                                  ? `${formData.onlineCategories.length} selected`
                                  : "Select online categories..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search online categories..." />
                                <CommandList>
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {onlineCategories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        onSelect={() => {
                                          const current = [...formData.onlineCategories];
                                          const index = current.indexOf(cat.id.toString());
                                          if (index > -1) {
                                            current.splice(index, 1);
                                          } else {
                                            current.push(cat.id.toString());
                                          }
                                          setFormData({ ...formData, onlineCategories: current });
                                        }}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <div className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            formData.onlineCategories.includes(cat.id.toString())
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50 [&_svg]:invisible"
                                          )}>
                                            <Check className="h-4 w-4" />
                                          </div>
                                          <span>{cat.name}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">
                            <FolderTree className="inline h-4 w-4 mr-1" />
                            Inventory Categories
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between h-10">
                                {formData.categories.length > 0
                                  ? `${formData.categories.length} selected`
                                  : "Select inventory categories..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search inventory categories..." />
                                <CommandList>
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {categories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        onSelect={() => {
                                          const current = [...formData.categories];
                                          const index = current.indexOf(cat.id.toString());
                                          if (index > -1) {
                                            current.splice(index, 1);
                                          } else {
                                            current.push(cat.id.toString());
                                          }
                                          setFormData({ ...formData, categories: current });
                                        }}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <div className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            formData.categories.includes(cat.id.toString())
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50 [&_svg]:invisible"
                                          )}>
                                            <Check className="h-4 w-4" />
                                          </div>
                                          <span>{cat.name}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}

                    {/* Product Selector - Searchable Multi-select Combobox */}
                    {formData.type === "PRODUCT" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="product">
                          <Package className="inline h-4 w-4 mr-1" />
                          Select Products (Searchable)
                        </Label>
                        <Popover open={openProductCombobox} onOpenChange={setOpenProductCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openProductCombobox}
                              className="w-full justify-between h-14"
                            >
                              {formData.products.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                    {formData.products.length} selected
                                  </Badge>
                                  <div className="hidden space-x-1 lg:flex">
                                    {formData.products.length > 2 ? (
                                      <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {formData.products.length} selected
                                      </Badge>
                                    ) : (
                                      formData.products.map((id) => {
                                        const prod = displayProducts.find((p) => p.id.toString() === id);
                                        return (
                                          <Badge variant="secondary" key={id} className="rounded-sm px-1 font-normal max-w-[150px] truncate">
                                            {prod?.name || `Product #${id}`}
                                          </Badge>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              ) : (
                                "Select products..."
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[450px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search product by name or SKU..."
                                value={productSearch}
                                onValueChange={setProductSearch}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {isFetchingProducts && !allProducts.length ? (
                                    <div className="flex items-center justify-center p-4">
                                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                      Searching...
                                    </div>
                                  ) : (
                                    "No product found."
                                  )}
                                </CommandEmpty>
                                <CommandGroup>
                                  {displayProducts.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={`${product.name} ${product.sku} ${product.id}`}
                                      onSelect={() => {
                                        const current = [...formData.products];
                                        const index = current.indexOf(product.id.toString());
                                        if (index > -1) {
                                          current.splice(index, 1);
                                          setSelectedProductsDetails(prev => prev.filter(p => p.id !== product.id));
                                        } else {
                                          current.push(product.id.toString());
                                          setSelectedProductsDetails(prev => {
                                            if (!prev.find(p => p.id === product.id)) {
                                              return [...prev, product];
                                            }
                                            return prev;
                                          });
                                        }
                                        setFormData({ ...formData, products: current });
                                      }}
                                    >
                                      <HoverCard openDelay={200} closeDelay={100}>
                                        <HoverCardTrigger asChild>
                                          <div className="flex items-center gap-2 w-full cursor-pointer">
                                            <div className={cn(
                                              "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                              formData.products.includes(product.id.toString())
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                            )}>
                                              <Check className="h-4 w-4" />
                                            </div>
                                            <div className="h-8 w-8 relative rounded overflow-hidden border shrink-0">
                                              <img
                                                src={getProductImage(product)}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                              />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="font-medium text-sm">{product.name}</span>
                                              <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                                            </div>
                                          </div>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-80 p-0" side="right" align="start">
                                          <div className="flex flex-col">
                                            <div className="relative w-full aspect-square overflow-hidden bg-white rounded-t-md">
                                              <img
                                                src={getProductImage(product)}
                                                alt={product.name}
                                                className="w-full h-full object-contain p-2"
                                              />
                                            </div>
                                            <div className="p-4 bg-slate-50 border-t">
                                              <h4 className="font-semibold text-sm">{product.name}</h4>
                                              <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                                              <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex flex-col">
                                                  <span className="text-muted-foreground">Price</span>
                                                  <span className="font-medium">৳{product.selling_price}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                  <span className="text-muted-foreground">Stock</span>
                                                  <span className="font-medium">{product.stock_quantity}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </HoverCardContent>
                                      </HoverCard>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                {hasMoreProducts && (
                                  <div ref={observerTarget} className="flex justify-center p-4">
                                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="value">Discount Value (%)</Label>
                      <div className="relative">
                        <Input
                          id="value"
                          type="number"
                          value={formData.value}
                          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                          placeholder="Enter discount percentage"
                          className="pl-10"
                          min="1"
                          max="100"
                        />
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <div className="relative">
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date</Label>
                      <div className="relative">
                        <Input
                          id="end-date"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="pl-10"
                        />
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter discount description"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingId(null);
                        resetForm();
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={editingId ? handleUpdateDiscount : handleCreateDiscount}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {editingId ? "Update Discount" : "Create Discount"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Discount
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discounts List */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Active Discounts
              </CardTitle>
              <CardDescription>
                Manage your existing discount campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading discounts...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount: Discount) => (
                      <TableRow key={discount.id}>
                        <TableCell className="font-medium">{discount.name}</TableCell>
                        <TableCell>{getTypeBadge(discount.discount_type)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{getTargetName(discount)}</TableCell>
                        <TableCell>{discount.value}%</TableCell>
                        <TableCell>{new Date(discount.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(discount.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(discount.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDiscount(discount.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDiscount(discount.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

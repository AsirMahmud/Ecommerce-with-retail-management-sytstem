"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCategories, useDeleteCategory } from "@/hooks/queries/useInventory";
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
  Tag,
  Package,
  MoreHorizontal,
  Edit3,
  Eye,
  Trash2,
  Calendar,
  BarChart3,
  TrendingUp,
  Box,
  DollarSign,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/types/inventory";
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

export default function CategoriesPage() {
  const router = useRouter();
  const { data: categories = [], isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [statsCategory, setStatsCategory] = useState<Category | null>(null);

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error("Failed to delete category");
      console.error("Error deleting category:", error);
    } finally {
      setCategoryToDelete(null);
    }
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((category: Category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics based on actual API fields
  const totalCategories = categories.length;
  const totalProducts = categories.reduce(
    (sum: number, category: Category) => sum + (category.product_count || 0),
    0
  );
  const categoriesWithChildren = categories.filter(
    (c: Category) => c.children && c.children.length > 0
  ).length;

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
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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

  const CategoryCard = ({ category }: { category: Category }) => (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                  {category.name}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {category.product_count || 0} Products
                </div>
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
                <Link href={`/inventory/categories/${category.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/inventory/edit-category/${category.id}`}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Category
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setStatsCategory(category);
                  setIsStatsDialogOpen(true);
                }}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                View Statistics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => setCategoryToDelete(category)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="text-lg font-bold text-blue-600">
              {category.product_count || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Subcategories</p>
            <p className="text-lg font-bold text-green-600">
              {category.children?.length || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Stock</p>
            <p className="text-lg font-bold text-orange-600">
              {category.total_stock || 0}
            </p>
          </div>
        </div>

        {category.description && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm text-gray-700 line-clamp-2">
              {category.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Created</p>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Calendar className="h-3 w-3" />
              {new Date(category.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Categories
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your product categories and organization
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/inventory/categories/add")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Categories
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {totalCategories}
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">
                All categories
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Products
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {totalProducts}
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                With Subcategories
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                <Tag className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {categoriesWithChildren}
              </div>
              <p className="text-xs text-purple-600 font-medium mt-1">
                Parent categories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/70 backdrop-blur-sm border-white/20 shadow-lg"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!categoryToDelete}
          onOpenChange={() => setCategoryToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stats Dialog */}
        <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                {statsCategory?.name} Statistics
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of inventory and sales performance for this category.
              </DialogDescription>
            </DialogHeader>

            {statsCategory?.detailed_stats ? (
              <Tabs defaultValue="inventory" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="inventory" className="flex items-center gap-2 py-3">
                    <Box className="h-4 w-4" /> Inventory
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="flex items-center gap-2 py-3">
                    <TrendingUp className="h-4 w-4" /> Performance
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="flex items-center gap-2 py-3">
                    <Package className="h-4 w-4" /> Attributes
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex items-center gap-2 py-3">
                    <Search className="h-4 w-4" /> Products
                  </TabsTrigger>
                  <TabsTrigger value="financials" className="flex items-center gap-2 py-3">
                    <DollarSign className="h-4 w-4" /> Financials
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-blue-50/50 border-blue-100 transition-all hover:shadow-md">
                      <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-xs font-semibold text-blue-600 flex items-center gap-2 uppercase tracking-wider">
                          <TrendingUp className="h-3.5 w-3.5" /> Max Inventory Item
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-xl font-bold text-blue-900 leading-tight">
                          {statsCategory.detailed_stats.max_inventory.name || "N/A"}
                        </div>
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          Current Stock: <span className="font-bold underline">{statsCategory.detailed_stats.max_inventory.stock}</span>
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-50/50 border-orange-100 transition-all hover:shadow-md">
                      <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-xs font-semibold text-orange-600 flex items-center gap-2 uppercase tracking-wider">
                          <TrendingUp className="h-3.5 w-3.5 rotate-180" /> Min Inventory Item
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="text-xl font-bold text-orange-900 leading-tight">
                          {statsCategory.detailed_stats.min_inventory.name || "N/A"}
                        </div>
                        <p className="text-sm text-orange-600 font-medium mt-1">
                          Current Stock: <span className="font-bold underline">{statsCategory.detailed_stats.min_inventory.stock}</span>
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-[300px] w-full bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Box className="h-4 w-4 text-blue-600" /> Color Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsCategory.detailed_stats.color_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="color"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Bar dataKey="total_stock" radius={[4, 4, 0, 0]} barSize={40}>
                          {statsCategory.detailed_stats.color_breakdown.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
                      <CardContent className="p-5">
                        <div className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">Total Sold</div>
                        <div className="text-2xl font-bold text-emerald-900">
                          {statsCategory.detailed_stats.performance.total_sold} units
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-violet-50/50 border-violet-100 shadow-sm">
                      <CardContent className="p-5">
                        <div className="text-xs font-semibold text-violet-600 mb-1 uppercase tracking-wider">Revenue</div>
                        <div className="text-2xl font-bold text-violet-900">
                          ${statsCategory.detailed_stats.performance.total_revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-pink-50/50 border-pink-100 shadow-sm">
                      <CardContent className="p-5">
                        <div className="text-xs font-semibold text-pink-600 mb-1 uppercase tracking-wider">Best Color</div>
                        <div className="text-2xl font-bold text-pink-900">
                          {statsCategory.detailed_stats.performance.best_selling_color || "N/A"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 px-1">Performance Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-gray-500 font-medium">Sales Efficiency</span>
                        <span className="font-bold text-slate-900">
                          {(statsCategory.detailed_stats.performance.total_sold / (statsCategory.product_count || 1)).toFixed(1)} sales/product
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-gray-500 font-medium">Average Item Revenue</span>
                        <span className="font-bold text-slate-900">
                          ${(statsCategory.detailed_stats.performance.total_revenue / (statsCategory.detailed_stats.performance.total_sold || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-6">
                  <Card className="border-0 bg-slate-50/80 shadow-inner">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-slate-800">Size Availability</CardTitle>
                      <CardDescription className="text-slate-500">Stock distribution across different sizes</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {statsCategory.detailed_stats.size_breakdown.map((item) => (
                          <div key={item.size} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:border-blue-400 hover:shadow-md group">
                            <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{item.size}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.total_stock} Units</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4 text-center">Total Stock</th>
                            <th className="px-6 py-4">Size Breakdown</th>
                            <th className="px-6 py-4">Color Breakdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {statsCategory.detailed_stats.products_detail?.map((product) => (
                            <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900">{product.name}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {product.total_stock}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {product.size_breakdown.map((sb) => (
                                    <div key={sb.size} className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">{sb.size}:</span>
                                      <span className="text-xs font-bold text-slate-900">{sb.total_stock}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {product.color_breakdown?.map((cb) => (
                                    <div key={cb.color} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200" style={{ backgroundColor: `${cb.color.toLowerCase()}10`, borderColor: `${cb.color.toLowerCase()}30` }}>
                                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cb.color.toLowerCase() }}></div>
                                      <span className="text-[10px] font-extrabold uppercase" style={{ color: cb.color.toLowerCase() === 'white' ? '#64748b' : cb.color.toLowerCase() }}>{cb.color}:</span>
                                      <span className="text-xs font-black" style={{ color: cb.color.toLowerCase() === 'white' ? '#1e293b' : cb.color.toLowerCase() }}>{cb.total_stock}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!statsCategory.detailed_stats.products_detail?.length && (
                            <tr>
                              <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                                No products found in this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financials" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-50/50 border-slate-100 shadow-sm border-2">
                      <CardContent className="p-5">
                        <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-tight">Total Investment</div>
                        <div className="text-2xl font-black text-slate-900">
                          ${statsCategory.detailed_stats.financials?.total_investment.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Cost value of all stock</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50/50 border-blue-100 shadow-sm border-2">
                      <CardContent className="p-5">
                        <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-tight">Expected Revenue</div>
                        <div className="text-2xl font-black text-blue-900">
                          ${statsCategory.detailed_stats.financials?.expected_revenue.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-blue-400 mt-1 uppercase tracking-widest font-bold">Selling value of all stock</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm border-2">
                      <CardContent className="p-5">
                        <div className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-tight">Potential Profit</div>
                        <div className="text-2xl font-black text-emerald-900">
                          ${statsCategory.detailed_stats.financials?.potential_profit.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-emerald-400 mt-1 uppercase tracking-widest font-bold">Projected margin on stock</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 px-1">Financial Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-gray-500 font-medium">Expected Profit Margin</span>
                        <span className="font-bold text-emerald-600 text-lg">
                          {((statsCategory.detailed_stats.financials?.potential_profit || 0) / (statsCategory.detailed_stats.financials?.expected_revenue || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-gray-500 font-medium">Projected ROI</span>
                        <span className="font-bold text-blue-600 text-lg">
                          {((statsCategory.detailed_stats.financials?.potential_profit || 0) / (statsCategory.detailed_stats.financials?.total_investment || 1) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Box className="h-16 w-16 mb-4 opacity-10" />
                <p className="font-medium">No detailed statistics found for this category.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

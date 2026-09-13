"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  BarChart3,
  Target,
  Award,
  Star,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Zap,
  Users,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useProductPerformanceReport } from "@/hooks/queries/use-reports";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ProductPerformanceReportProps {
  dateRange: DateRange | undefined;
}

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#64748B'];

export function ProductPerformanceReport({ dateRange }: ProductPerformanceReportProps) {
  const [chartType, setChartType] = useState<string>("bar");
  const [viewType, setViewType] = useState<string>("overview");
  const router = useRouter();

  const { data: productData, isLoading, error } = useProductPerformanceReport(dateRange);

  if (isLoading) {
    return <ProductPerformanceReportSkeleton />;
  }

  if (error || !productData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Performance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load product performance data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const topProductsChartData = productData.top_performing_products.map((product, index) => ({
    name: product.product_name,
    sales: parseFloat(product.total_sales),
    profit: parseFloat(product.total_profit),
    quantity: product.quantity_sold,
    margin: parseFloat(product.profit_margin),
    averageProfit: parseFloat(product.average_profit),
    averageSellingPriceWithDiscount: parseFloat(product.average_selling_price_with_discount),
    color: COLORS[index % COLORS.length],
  }));

  const lowProductsChartData = productData.low_performing_products.map((product, index) => ({
    name: product.product_name,
    sales: parseFloat(product.total_sales),
    profit: parseFloat(product.total_profit),
    quantity: product.quantity_sold,
    margin: parseFloat(product.profit_margin),
    averageProfit: parseFloat(product.average_profit),
    averageSellingPriceWithDiscount: parseFloat(product.average_selling_price_with_discount),
    color: COLORS[index % COLORS.length],
  }));

  const profitMarginData = productData.profit_by_product.map((product, index) => ({
    name: product.product_name,
    margin: parseFloat(product.profit_margin),
    profit: parseFloat(product.total_profit),
    quantity: product.quantity_sold,
    averageProfit: parseFloat(product.average_profit),
    color: COLORS[index % COLORS.length],
  }));

  const averageProfitMargin = parseFloat(productData.average_profit_margin);
  const totalSales = parseFloat(productData.total_sales);
  const totalProfit = parseFloat(productData.total_profit);
  const averageProfit = parseFloat(productData.average_profit);
  const averageSellingPriceWithDiscount = parseFloat(productData.average_selling_price_with_discount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Performance Report</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of product performance and profitability
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Chart Type:</span>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Products"
          value={productData.total_products.toString()}
          change=""
          changeValue={`${productData.top_performing_products.length} top performers`}
          icon={<Package className="h-4 w-4" />}
          trend="neutral"
        />
        <MetricCard
          title="Average Profit Margin"
          value={`${averageProfitMargin.toFixed(1)}%`}
          change=""
          changeValue="Overall performance"
          icon={<Target className="h-4 w-4" />}
          trend={averageProfitMargin > 20 ? "up" : "down"}
        />
        <MetricCard
          title="Average Profit"
          value={`$${averageProfit.toFixed(2)}`}
          change=""
          changeValue="Per unit sold"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={averageProfit > 0 ? "up" : "down"}
        />
        <MetricCard
          title="Avg Selling Price"
          value={`$${averageSellingPriceWithDiscount.toFixed(2)}`}
          change=""
          changeValue="With discount applied"
          icon={<ShoppingCart className="h-4 w-4" />}
          trend="neutral"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full" value={viewType} onValueChange={setViewType}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top">Top Performers</TabsTrigger>
          <TabsTrigger value="low">Low Performers</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Top Performers</p>
                        <p className="text-sm text-muted-foreground">Best selling products</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {productData.top_performing_products.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">Low Performers</p>
                        <p className="text-sm text-muted-foreground">Need attention</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {productData.low_performing_products.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Active Products</p>
                        <p className="text-sm text-muted-foreground">With sales data</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {productData.sales_by_product.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit Margin Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Profit Margin Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Profit Margin</span>
                      <span className="text-sm font-bold">{averageProfitMargin.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(averageProfitMargin, 100)} 
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {productData.profit_by_product.filter(p => parseFloat(p.profit_margin) > 20).length}
                      </div>
                      <div className="text-sm text-muted-foreground">High Margin (&gt;20%)</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">
                        {productData.profit_by_product.filter(p => parseFloat(p.profit_margin) <= 20 && parseFloat(p.profit_margin) > 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Low Margin (≤20%)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Quick Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    ${(totalSales / productData.sales_by_product.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Sales per Product</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ${(totalProfit / productData.profit_by_product.length).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Profit per Product</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(productData.sales_by_product.reduce((sum, p) => sum + p.quantity_sold, 0) / productData.sales_by_product.length)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Units Sold per Product</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    ${averageProfit.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Profit per Unit</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    ${averageSellingPriceWithDiscount.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Selling Price (with discount)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="top" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Chart */}
                <div className="h-80">
                  {chartType === "bar" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                        <Bar dataKey="profit" fill="#10b981" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "line" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={topProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" />
                        <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "area" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={topProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Sales" />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Profit" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "pie" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topProductsChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, sales }) => `${name}: $${sales.toFixed(2)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="sales"
                        >
                          {topProductsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Profit Margin</TableHead>
                      <TableHead>Average Price</TableHead>
                      <TableHead>Average Profit</TableHead>
                      <TableHead>Avg Selling Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productData.top_performing_products.map((product, index) => (
                      <TableRow 
                        key={product.product_name}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/inventory/products/${product.product_id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {product.product_name}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category_name ? (
                            <Badge variant="outline" className="text-xs">
                              {product.category_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No Category</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(product.total_sales).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {product.quantity_sold || 0}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              units
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${parseFloat(product.total_profit).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {parseFloat(product.profit_margin).toFixed(1)}%
                            </span>
                            <Badge variant={parseFloat(product.profit_margin) > 20 ? "default" : "secondary"}>
                              {parseFloat(product.profit_margin) > 20 ? "High" : "Good"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>${parseFloat(product.average_price).toFixed(2)}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${parseFloat(product.average_profit).toFixed(2)}
                        </TableCell>
                        <TableCell>${parseFloat(product.average_selling_price_with_discount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Performers Tab */}
        <TabsContent value="low" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Low Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Chart */}
                <div className="h-80">
                  {chartType === "bar" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lowProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Bar dataKey="sales" fill="#ef4444" name="Sales" />
                        <Bar dataKey="profit" fill="#f59e0b" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "line" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lowProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Line type="monotone" dataKey="sales" stroke="#ef4444" name="Sales" />
                        <Line type="monotone" dataKey="profit" stroke="#f59e0b" name="Profit" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "area" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lowProductsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                          name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                          name === 'quantity' ? `${value} units` : 
                          name === 'margin' ? `${Number(value).toFixed(1)}%` :
                          name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                          name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                          name === 'sales' ? 'Sales' :
                          name === 'profit' ? 'Profit' :
                          name === 'quantity' ? 'Quantity' :
                          name === 'margin' ? 'Margin %' :
                          name === 'averageProfit' ? 'Avg Profit' :
                          name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                        ]} />
                        <Area type="monotone" dataKey="sales" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Sales" />
                        <Area type="monotone" dataKey="profit" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Profit" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "pie" && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lowProductsChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, sales }) => `${name}: $${sales.toFixed(2)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="sales"
                        >
                          {lowProductsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Profit Margin</TableHead>
                      <TableHead>Average Price</TableHead>
                      <TableHead>Average Profit</TableHead>
                      <TableHead>Avg Selling Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productData.low_performing_products.map((product, index) => (
                      <TableRow 
                        key={product.product_name}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/inventory/products/${product.product_id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {product.product_name}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category_name ? (
                            <Badge variant="outline" className="text-xs">
                              {product.category_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No Category</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(product.total_sales).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {product.quantity_sold || 0}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              units
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={`font-medium ${parseFloat(product.total_profit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${parseFloat(product.total_profit).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {parseFloat(product.profit_margin).toFixed(1)}%
                            </span>
                            <Badge variant={parseFloat(product.profit_margin) > 0 ? "secondary" : "destructive"}>
                              {parseFloat(product.profit_margin) > 0 ? "Low" : "Loss"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>${parseFloat(product.average_price).toFixed(2)}</TableCell>
                        <TableCell className={`font-medium ${parseFloat(product.average_profit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${parseFloat(product.average_profit).toFixed(2)}
                        </TableCell>
                        <TableCell>${parseFloat(product.average_selling_price_with_discount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Margin Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Profit Margin Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitMarginData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'margin' ? `${Number(value).toFixed(1)}%` : 
                        name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                        name === 'quantity' ? `${value} units` :
                        name === 'averageProfit' ? `$${Number(value).toFixed(2)}` : value,
                        name === 'margin' ? 'Margin %' :
                        name === 'profit' ? 'Profit' :
                        name === 'quantity' ? 'Quantity' :
                        name === 'averageProfit' ? 'Avg Profit' : name
                      ]} />
                      <Bar dataKey="margin" fill="#8b5cf6" name="Margin %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales vs Profit Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sales vs Profit Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={topProductsChartData.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'sales' ? `$${Number(value).toFixed(2)}` : 
                        name === 'profit' ? `$${Number(value).toFixed(2)}` : 
                        name === 'quantity' ? `${value} units` : 
                        name === 'margin' ? `${Number(value).toFixed(1)}%` :
                        name === 'averageProfit' ? `$${Number(value).toFixed(2)}` :
                        name === 'averageSellingPriceWithDiscount' ? `$${Number(value).toFixed(2)}` : value,
                        name === 'sales' ? 'Sales' :
                        name === 'profit' ? 'Profit' :
                        name === 'quantity' ? 'Quantity' :
                        name === 'margin' ? 'Margin %' :
                        name === 'averageProfit' ? 'Avg Profit' :
                        name === 'averageSellingPriceWithDiscount' ? 'Avg Selling Price' : name
                      ]} />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Sales" />
                      <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Instructions */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 Click on any product row to view its detailed information
          </div>
          {/* All Products Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                All Products Sales Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Quantity Sold</TableHead>
                    <TableHead>Average Price</TableHead>
                    <TableHead>Avg Selling Price</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Profit Margin</TableHead>
                    <TableHead>Average Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productData.sales_by_product.map((product) => {
                    const profitInfo = productData.profit_by_product.find(
                      (p) => p.product_name === product.product_name
                    );
                    return (
                      <TableRow 
                        key={product.product_name}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/inventory/products/${product.product_id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.product_name}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${parseFloat(product.total_sales).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {product.quantity_sold || 0}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              units
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>${parseFloat(product.average_price).toFixed(2)}</TableCell>
                        <TableCell>${parseFloat(product.average_selling_price_with_discount).toFixed(2)}</TableCell>
                        <TableCell className={`font-medium ${profitInfo && parseFloat(profitInfo.total_profit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${parseFloat(profitInfo?.total_profit || "0").toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {parseFloat(profitInfo?.profit_margin || "0").toFixed(1)}%
                            </span>
                            <Badge variant={
                              parseFloat(profitInfo?.profit_margin || "0") > 20 ? "default" : 
                              parseFloat(profitInfo?.profit_margin || "0") > 0 ? "secondary" : "destructive"
                            }>
                              {parseFloat(profitInfo?.profit_margin || "0") > 20 ? "High" : 
                               parseFloat(profitInfo?.profit_margin || "0") > 0 ? "Good" : "Loss"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={`font-medium ${profitInfo && parseFloat(profitInfo.average_profit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${parseFloat(profitInfo?.average_profit || "0").toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeValue, 
  icon, 
  trend 
}: {
  title: string; 
  value: string; 
  change: string; 
  changeValue: string; 
  icon: React.ReactNode; 
  trend: 'up' | 'down' | 'neutral';
}) {
  const accentGradient =
    trend === 'up'
      ? 'from-emerald-500 to-teal-500'
      : trend === 'down'
      ? 'from-rose-500 to-red-500'
      : 'from-indigo-500 to-blue-500';

  return (
    <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold mt-1.5">
          <span>{changeValue}</span>
          {trend === 'up' && <ArrowUpRight className="inline h-3.5 w-3.5 text-emerald-600 ml-0.5" />}
          {trend === 'down' && <ArrowDownRight className="inline h-3.5 w-3.5 text-rose-600 ml-0.5" />}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductPerformanceReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

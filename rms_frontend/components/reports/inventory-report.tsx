"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInventoryReport } from "@/hooks/queries/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  DollarSign,
  AlertTriangle,
  Layers,
  ArrowDownRight,
  TrendingUp,
  Boxes,
  ShieldAlert,
} from "lucide-react";

export function InventoryReport() {
  const { data: inventoryData, isLoading } = useInventoryReport();

  const totalValue = useMemo(() => {
    if (!inventoryData?.total_stock_value) return 0;
    return parseFloat(inventoryData.total_stock_value) || 0;
  }, [inventoryData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl border border-slate-100 shadow-xs p-5">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border border-slate-100 shadow-xs p-6">
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <Card className="border border-slate-200/90 rounded-2xl p-12 text-center bg-white">
        <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Inventory Data</h3>
        <p className="text-xs text-slate-500 mt-1">
          Catalog inventory records are not available.
        </p>
      </Card>
    );
  }

  const lowStockCount = inventoryData.low_stock_items?.length || 0;
  const costVal = parseFloat(inventoryData.total_cost_value || "0");
  const retailVal = parseFloat(inventoryData.total_retail_value || inventoryData.total_stock_value || "0");
  const potentialProfit = parseFloat(inventoryData.potential_profit || "0");
  const unrealizedMargin = parseFloat(String(inventoryData.unrealized_margin || "0"));
  const deadStockCount = inventoryData.dead_stock_count || 0;
  const deadStockVal = parseFloat(inventoryData.dead_stock_value || "0");
  const outOfStockCount = inventoryData.out_of_stock_count || 0;

  return (
    <div className="space-y-6">
      {/* 4 Balanced Executive Valuation Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Catalog SKUs */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Catalog SKUs
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {inventoryData.total_products || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1.5">
            {outOfStockCount > 0 ? (
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] font-bold">
                {outOfStockCount} Out of Stock
              </Badge>
            ) : (
              <span>In stock across all SKUs</span>
            )}
          </div>
        </Card>

        {/* Cost Valuation */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Asset Value (Cost)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            ${costVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-600 font-medium mt-1.5">
            Capital tied up in stock
          </div>
        </Card>

        {/* Retail Valuation */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Retail Valuation
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            ${retailVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1.5">
            Potential gross sales value
          </div>
        </Card>

        {/* Potential Gross Margin */}
        <Card className="relative overflow-hidden bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-2xl p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Unrealized Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 tracking-tight">
            ${potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-indigo-600 font-bold mt-1.5">
            {unrealizedMargin.toFixed(1)}% Potential Margin
          </div>
        </Card>
      </div>

      {/* Dead Stock Warning Banner */}
      {deadStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Slow Moving / Dead Stock Alert</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                <span className="font-bold">{deadStockCount} products</span> have had zero sales in the last 60 days, tying up{" "}
                <span className="font-bold">${deadStockVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> in capital.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold px-3 py-1">
            Action Recommended: Clearance Sale
          </Badge>
        </div>
      )}

      {/* Low Stock Urgency Table */}
      <Card className="border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Low Stock & Reorder Urgency
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Products approaching or below reorder threshold
            </p>
          </div>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold">
            {lowStockCount} Action Items
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {lowStockCount === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No low stock items detected. Inventory levels are healthy!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60 border-b border-slate-100">
                  <TableHead className="text-xs font-bold uppercase text-slate-500">
                    Product Name
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase text-slate-500">
                    Urgency Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-slate-500 min-w-[140px]">
                    Current Stock
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                    Reorder Level
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-slate-500">
                    Unit Price
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryData.low_stock_items.map((item) => {
                  const stock = Number(item.stock) || 0;
                  const reorder = Number(item.reorder_level) || 1;
                  const ratio = Math.min(100, Math.round((stock / Math.max(reorder, 1)) * 100));

                  const isOut = stock <= 0;
                  const isCritical = stock < reorder / 2;

                  return (
                    <TableRow key={item.name} className="hover:bg-slate-50/80">
                      <TableCell className="text-xs font-bold text-slate-900">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                            Out of Stock
                          </Badge>
                        ) : isCritical ? (
                          <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                            Critical Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]">
                            Low Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-slate-900 text-xs">
                          {stock} units
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              isOut ? "bg-rose-500" : isCritical ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.max(5, ratio)}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-600">
                        {reorder} units
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-slate-900">
                        ${parseFloat(item.price || "0").toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock & Valuation by Category Charts */}
      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-6 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Quantity on Hand by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inventoryData.stock_by_category}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category_name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                            <p className="font-semibold text-slate-400">{label}</p>
                            <p className="font-black text-indigo-300 mt-0.5">
                              {payload[0].value} units in stock
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total_stock" fill="#6366F1" radius={[8, 8, 0, 0]} name="Stock Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-6 border border-slate-200/90 shadow-xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Stock Valuation by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inventoryData.stock_by_category}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category_name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs border border-slate-800">
                            <p className="font-semibold text-slate-400">{label}</p>
                            <p className="font-black text-emerald-400 mt-0.5">
                              ${parseFloat(String(payload[0].value)).toFixed(2)} valuation
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={(data) => parseFloat(data.total_value)}
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                    name="Stock Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

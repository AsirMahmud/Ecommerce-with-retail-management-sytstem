import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, RotateCcw, CheckCircle2, Clock, DollarSign } from "lucide-react"
import { SalesFilterBar } from "@/components/sales/sales-filter-bar"

export const metadata: Metadata = {
  title: "Sales Returns",
  description: "Manage product returns and refunds",
}

export default function SalesReturnsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Returns & Refunds</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product returns, customer exchanges, and refund transactions</p>
        </div>
        <SalesFilterBar />
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Returns</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">14</div>
            <p className="text-xs text-slate-500 font-medium mt-1">Total recorded returns</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Refunded</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">$648.50</div>
            <p className="text-xs text-rose-600 font-medium mt-1">Across 12 completed refunds</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">2</div>
            <p className="text-xs text-amber-600 font-medium mt-1">Awaiting inspection</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Returns History</CardTitle>
              <CardDescription className="text-xs text-slate-500">Complete record of all product returns and exchanges</CardDescription>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="search" placeholder="Search returns..." className="w-full md:w-[260px] pl-8 bg-slate-50/50 border-slate-200 rounded-xl text-sm" />
              </div>
              <Button variant="outline" size="icon" className="rounded-xl border-slate-200 text-slate-600">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-slate-600">Return ID</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Date</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Original Sale</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Customer</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Items</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Reason</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Amount</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-semibold text-slate-900 text-sm">RET-001</TableCell>
                  <TableCell className="text-xs text-slate-600">May 15, 2024</TableCell>
                  <TableCell className="text-xs font-mono text-slate-600">INV-0042</TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">John Smith</TableCell>
                  <TableCell className="text-xs text-slate-600">1</TableCell>
                  <TableCell className="text-xs text-slate-600">Wrong Size</TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">$49.99</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-xs font-medium">Completed</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs h-7">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-semibold text-slate-900 text-sm">RET-002</TableCell>
                  <TableCell className="text-xs text-slate-600">May 16, 2024</TableCell>
                  <TableCell className="text-xs font-mono text-slate-600">INV-0051</TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">Sarah Johnson</TableCell>
                  <TableCell className="text-xs text-slate-600">2</TableCell>
                  <TableCell className="text-xs text-slate-600">Defective Fabric</TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">$89.98</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/60 text-xs font-medium">Processing</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs h-7">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-semibold text-slate-900 text-sm">RET-003</TableCell>
                  <TableCell className="text-xs text-slate-600">May 18, 2024</TableCell>
                  <TableCell className="text-xs font-mono text-slate-600">INV-0063</TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">Michael Brown</TableCell>
                  <TableCell className="text-xs text-slate-600">1</TableCell>
                  <TableCell className="text-xs text-slate-600">Changed Mind</TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">$29.99</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-xs font-medium">Completed</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs h-7">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

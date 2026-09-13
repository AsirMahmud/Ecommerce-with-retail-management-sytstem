import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Plus, Edit, Trash, Tag, Percent, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Sales Discounts",
  description: "Manage discounts and promotions",
}

export default function SalesDiscountsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Discounts & Promotions</h1>
          <p className="text-sm text-slate-500 mt-1">Manage sales campaigns, promotional discounts, and seasonal offers</p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium">
          <Plus className="h-4 w-4" />
          New Discount
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Promotions</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">2</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Currently running campaigns</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Campaigns</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">1</div>
            <p className="text-xs text-blue-600 font-medium mt-1">Upcoming seasonal sales</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Discount Rate</CardTitle>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">18.5%</div>
            <p className="text-xs text-slate-500 font-medium mt-1">Across all active items</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs text-xs font-medium">Active Discounts</TabsTrigger>
          <TabsTrigger value="scheduled" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs text-xs font-medium">Scheduled</TabsTrigger>
          <TabsTrigger value="expired" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-2xs text-xs font-medium">Expired</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Active Discounts</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Currently active discounts applied at retail checkout</CardDescription>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="search" placeholder="Search discounts..." className="w-full md:w-[260px] pl-8 bg-slate-50/50 border-slate-200 rounded-xl text-sm" />
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
                      <TableHead className="font-semibold text-xs text-slate-600">Name</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Type</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Value</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Products</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Start Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">End Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                      <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold text-slate-900 text-sm">Summer Sale</TableCell>
                      <TableCell className="text-xs text-slate-600">Percentage</TableCell>
                      <TableCell className="font-semibold text-slate-900 text-sm">20%</TableCell>
                      <TableCell className="text-xs text-slate-600">All Summer Collection</TableCell>
                      <TableCell className="text-xs text-slate-600">May 1, 2024</TableCell>
                      <TableCell className="text-xs text-slate-600">Aug 31, 2024</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-xs font-medium">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold text-slate-900 text-sm">New Customer Discount</TableCell>
                      <TableCell className="text-xs text-slate-600">Fixed Amount</TableCell>
                      <TableCell className="font-semibold text-slate-900 text-sm">$10.00</TableCell>
                      <TableCell className="text-xs text-slate-600">All Products</TableCell>
                      <TableCell className="text-xs text-slate-600">Jan 1, 2024</TableCell>
                      <TableCell className="text-xs text-slate-600">Dec 31, 2024</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/60 text-xs font-medium">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scheduled" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Scheduled Discounts</CardTitle>
              <CardDescription className="text-xs text-slate-500">Upcoming discounts and promotions set to trigger automatically</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-slate-600">Name</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Type</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Value</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Products</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Start Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">End Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                      <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold text-slate-900 text-sm">Fall Collection Special</TableCell>
                      <TableCell className="text-xs text-slate-600">Percentage</TableCell>
                      <TableCell className="font-semibold text-slate-900 text-sm">15%</TableCell>
                      <TableCell className="text-xs text-slate-600">Fall Collection</TableCell>
                      <TableCell className="text-xs text-slate-600">Sep 1, 2024</TableCell>
                      <TableCell className="text-xs text-slate-600">Nov 30, 2024</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200/60 text-xs font-medium">Scheduled</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expired" className="space-y-4">
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Expired Discounts</CardTitle>
              <CardDescription className="text-xs text-slate-500">Past discounts and concluded promotional events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-semibold text-xs text-slate-600">Name</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Type</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Value</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Products</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Start Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">End Date</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-600">Status</TableHead>
                      <TableHead className="text-right font-semibold text-xs text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold text-slate-900 text-sm">Spring Sale</TableCell>
                      <TableCell className="text-xs text-slate-600">Percentage</TableCell>
                      <TableCell className="font-semibold text-slate-900 text-sm">25%</TableCell>
                      <TableCell className="text-xs text-slate-600">Spring Collection</TableCell>
                      <TableCell className="text-xs text-slate-600">Mar 1, 2024</TableCell>
                      <TableCell className="text-xs text-slate-600">Apr 30, 2024</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-medium">Expired</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

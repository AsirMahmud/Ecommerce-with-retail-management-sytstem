"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  History,
  Search,
  Filter,
  ShoppingBag,
  Package,
  DollarSign,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Tag,
  Laptop,
} from "lucide-react";
import { DataExportButton } from "@/components/data-export-button";

export interface ActivityEntry {
  id: string;
  user: {
    name: string;
    email: string;
    role: "Admin" | "Cashier" | "Inventory Lead" | "System";
    initials: string;
  };
  category: "Sales" | "Inventory" | "Pricing" | "Returns" | "Security";
  action: string;
  description: string;
  target?: string;
  diff?: {
    before?: string | number;
    after?: string | number;
  };
  ipAddress: string;
  device: string;
  timestamp: string;
  timeAgo: string;
}

const SAMPLE_ACTIVITIES: ActivityEntry[] = [
  {
    id: "act-1",
    user: {
      name: "Rawstitch Admin",
      email: "admin@rawstitch.com",
      role: "Admin",
      initials: "RA",
    },
    category: "Sales",
    action: "Sale Completed",
    description: "Completed POS transaction and generated tax invoice",
    target: "INV-1094 ($139.50)",
    ipAddress: "192.168.1.102",
    device: "POS Terminal 01",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    timeAgo: "12 mins ago",
  },
  {
    id: "act-2",
    user: {
      name: "Kamrul Hasan",
      email: "kamrul@rawstitch.com",
      role: "Inventory Lead",
      initials: "KH",
    },
    category: "Inventory",
    action: "Stock Adjusted",
    description: "Received supplier restock shipment for Oxford Shirts",
    target: "SKU-OXF-BLU-L",
    diff: {
      before: "14 units",
      after: "64 units (+50)",
    },
    ipAddress: "192.168.1.105",
    device: "Warehouse Scanner",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    timeAgo: "45 mins ago",
  },
  {
    id: "act-3",
    user: {
      name: "Rawstitch Admin",
      email: "admin@rawstitch.com",
      role: "Admin",
      initials: "RA",
    },
    category: "Pricing",
    action: "Price Modified",
    description: "Updated retail price during weekend promotional campaign",
    target: "Slim Fit Cotton Chino",
    diff: {
      before: "$48.00",
      after: "$42.00",
    },
    ipAddress: "192.168.1.100",
    device: "Office Mac",
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    timeAgo: "1.5 hours ago",
  },
  {
    id: "act-4",
    user: {
      name: "Tariqul Islam",
      email: "tariq@rawstitch.com",
      role: "Cashier",
      initials: "TI",
    },
    category: "Returns",
    action: "Return Processed",
    description: "Authorized return ticket RET-001 with store credit voucher",
    target: "RET-001 (Ref: INV-1042)",
    ipAddress: "192.168.1.102",
    device: "POS Terminal 01",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    timeAgo: "3 hours ago",
  },
  {
    id: "act-5",
    user: {
      name: "System Security",
      email: "auth@rawstitch.com",
      role: "System",
      initials: "SYS",
    },
    category: "Security",
    action: "Staff Login",
    description: "Authenticated staff session via JWT from registered POS register",
    target: "rawstitch (Operator)",
    ipAddress: "103.145.120.4",
    device: "Chrome / Windows 11",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    timeAgo: "6 hours ago",
  },
  {
    id: "act-6",
    user: {
      name: "Kamrul Hasan",
      email: "kamrul@rawstitch.com",
      role: "Inventory Lead",
      initials: "KH",
    },
    category: "Inventory",
    action: "Low Stock Alert",
    description: "Inventory threshold reached for Premium Panjabi Black (M)",
    target: "SKU-PAN-BLK-M (3 left)",
    ipAddress: "System Generated",
    device: "Automated Stock Trigger",
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    timeAgo: "10 hours ago",
  },
  {
    id: "act-7",
    user: {
      name: "Rawstitch Admin",
      email: "admin@rawstitch.com",
      role: "Admin",
      initials: "RA",
    },
    category: "Sales",
    action: "Customer Credit Paid",
    description: "Settled due balance of $50.00 for customer Michael Brown",
    target: "Payment #DUE-402",
    ipAddress: "192.168.1.100",
    device: "Backoffice Terminal",
    timestamp: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
    timeAgo: "Yesterday",
  },
];

export default function ActivityLogPage() {
  const [activities] = useState<ActivityEntry[]>(SAMPLE_ACTIVITIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.target && act.target.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || act.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchesUser =
        userFilter === "all" || act.user.role.toLowerCase() === userFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesUser;
    });
  }, [activities, searchQuery, categoryFilter, userFilter]);

  const getCategoryBadge = (category: ActivityEntry["category"]) => {
    switch (category) {
      case "Sales":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: ShoppingBag,
        };
      case "Inventory":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Package,
        };
      case "Pricing":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Tag,
        };
      case "Returns":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: RotateCcw,
        };
      case "Security":
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          icon: ShieldCheck,
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 space-y-2">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-600" />
            Activity Log & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident record of retail transactions, stock adjustments, and staff operations
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <DataExportButton
            title="Activity Audit Log"
            headers={["Timestamp", "User", "Role", "Category", "Action", "Description", "Target Entity", "Device / IP"]}
            getData={() =>
              filteredActivities.map((a) => [
                a.timestamp,
                a.user.name,
                a.user.role,
                a.category,
                a.action,
                a.description,
                a.target || "-",
                `${a.device} (${a.ipAddress})`,
              ])
            }
            className="bg-white"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Logged (24h)
            </CardTitle>
            <History className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">42</div>
            <p className="text-xs text-slate-500 font-medium mt-1">Operational events recorded</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Events
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">28</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Checkout & credit payments</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Changes
            </CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">9</div>
            <p className="text-xs text-indigo-600 font-medium mt-1">Restocks & variations</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Security & Auth
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">5</div>
            <p className="text-xs text-slate-500 font-medium mt-1">Logins & price updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Feed Card */}
      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Live Audit Stream
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Detailed timeline of user actions, modified values, and timestamps
              </CardDescription>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Filter by action, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-white border-slate-200 rounded-xl text-xs"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[130px] bg-white border-slate-200 rounded-xl text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="pricing">Pricing</SelectItem>
                  <SelectItem value="returns">Returns</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>

              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full sm:w-[130px] bg-white border-slate-200 rounded-xl text-xs">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="inventory lead">Inventory</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No activity logs match your selected filter criteria.
              </div>
            ) : (
              filteredActivities.map((act) => {
                const badgeInfo = getCategoryBadge(act.category);
                const Icon = badgeInfo.icon;

                return (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-200 transition-all gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200 shrink-0">
                        <AvatarFallback className="bg-gradient-to-tr from-slate-900 to-indigo-900 text-white text-xs font-bold">
                          {act.user.initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {act.user.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200">
                            {act.user.role}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${badgeInfo.bg}`}>
                            <Icon className="w-3 h-3" />
                            <span>{act.action}</span>
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          {act.description}
                          {act.target && (
                            <span className="font-semibold text-slate-900 ml-1">
                              • {act.target}
                            </span>
                          )}
                        </p>

                        {act.diff && (
                          <div className="flex items-center gap-2 text-[11px] font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 w-fit mt-1">
                            <span className="text-slate-400 line-through">{act.diff.before}</span>
                            <ArrowRight className="w-3 h-3 text-indigo-500" />
                            <span className="text-indigo-600 font-semibold">{act.diff.after}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-right text-xs shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {act.timeAgo}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {act.device} ({act.ipAddress})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Award, Star, Crown } from "lucide-react";
import Link from "next/link";
import { useTopCustomers } from "@/hooks/queries/use-customer";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const rankingIcons = [
  { icon: Crown, color: "text-yellow-500", bgColor: "bg-yellow-100" },
  { icon: Trophy, color: "text-gray-500", bgColor: "bg-gray-100" },
  { icon: Medal, color: "text-amber-600", bgColor: "bg-amber-100" },
  { icon: Award, color: "text-blue-500", bgColor: "bg-blue-100" },
  { icon: Star, color: "text-purple-500", bgColor: "bg-purple-100" },
];

export function TopCustomersAnalysis() {
  const { data: topCustomers, isLoading, error } = useTopCustomers();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 5 Customers
          </CardTitle>
          <CardDescription>
            Your highest-value customers based on total sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-8 w-[100px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 5 Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load top customers</p>
        </CardContent>
      </Card>
    );
  }

  if (!topCustomers || topCustomers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 5 Customers
          </CardTitle>
          <CardDescription>
            Your highest-value customers based on total sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No customers with sales found</p>
        </CardContent>
      </Card>
    );
  }

  const maxSales = Math.max(...topCustomers.map(c => c.total_sales));

  return (
    <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top 5 Customers
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Your highest-value patrons based on cumulative purchase volume
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3.5">
          {topCustomers.map((customer, index) => {
            const rankingIcon = rankingIcons[index];
            const IconComponent = rankingIcon.icon;
            const salesPercentage = (customer.total_sales / maxSales) * 100;
            const name = `${customer.first_name} ${customer.last_name}`;

            return (
              <div
                key={customer.id}
                className="flex items-center space-x-4 p-3.5 rounded-xl border border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300 transition-all bg-white"
              >
                <div className={`p-2 rounded-xl ${rankingIcon.bgColor}`}>
                  <IconComponent className={`h-4.5 w-4.5 ${rankingIcon.color}`} />
                </div>
                
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage
                    src={`https://avatar.vercel.sh/${customer.id}`}
                    alt={name}
                  />
                  <AvatarFallback className="font-bold text-xs bg-slate-100 text-slate-700">
                    {name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 truncate text-sm transition-colors"
                    >
                      {name}
                    </Link>
                    <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0">
                      #{customer.ranking}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>{customer.sales_count} orders</span>
                    <span>•</span>
                    <span>
                      Avg: {formatCurrency(customer.average_order_value)}
                    </span>
                    {customer.last_purchase_date && (
                      <>
                        <span>•</span>
                        <span>
                          Last: {new Date(customer.last_purchase_date).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Share of Top Customer Volume</span>
                      <span className="font-semibold text-slate-700">
                        {Math.round(salesPercentage)}%
                      </span>
                    </div>
                    <Progress value={salesPercentage} className="h-1.5" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-emerald-600">
                    {formatCurrency(customer.total_sales)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Total Revenue
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Revenue</div>
              <div className="font-semibold">
                ${topCustomers.reduce((sum, c) => sum + c.total_sales, 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Average Order Value</div>
              <div className="font-semibold">
                ${(topCustomers.reduce((sum, c) => sum + c.average_order_value, 0) / topCustomers.length).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}







"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

interface SalesFilterBarProps {
  onFilterChange?: (filters: {
    start_date?: string;
    end_date?: string;
    status?: string;
    payment_method?: string;
    customer_phone?: string;
    search?: string;
    ordering?: string;
  }) => void;
}

export function SalesFilterBar({ onFilterChange }: SalesFilterBarProps) {
  const [filters, setFilters] = useState({
    search: "",
    payment_method: "all",
    status: "all",
    start_date: "",
    end_date: "",
    ordering: "-date",
  });

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined
  ) => {
    if (range && range.from) {
      setFilters((prev) => ({
        ...prev,
        start_date: range.from ? range.from.toISOString() : "",
        end_date: range.to ? range.to.toISOString() : "",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        start_date: "",
        end_date: "",
      }));
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sales..."
            className="pl-8"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <Select
          value={filters.payment_method}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, payment_method: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="card">Credit Card</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="due">Due Payment</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <DatePickerWithRange
          onChange={handleDateRangeChange}
          defaultDateRange={{
            from: addDays(new Date(), -7),
            to: new Date(),
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}

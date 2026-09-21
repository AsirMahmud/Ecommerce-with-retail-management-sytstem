import SalesHistory from "@/components/sales/sales-history-table";
import React, { Suspense } from "react";

export default function page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading sales history...</div>}>
      <SalesHistory />
    </Suspense>
  );
}

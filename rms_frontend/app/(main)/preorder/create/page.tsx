"use client";

import { PreorderForm } from "@/components/preorder/preorder-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreatePreorderPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/preorder"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-2xs"
          aria-label="Back to Preorders"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Customer Preorder</h1>
          <p className="text-xs text-slate-500">Record an advance customer reservation with items and partial deposit.</p>
        </div>
      </div>

      <PreorderForm />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Truck, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/lib/api/axios-config";

interface DeliverySettings {
  inside_dhaka_charge: number;
  inside_gazipur_charge: number;
  outside_dhaka_charge: number;
  updated_at?: string;
}

export default function DeliveryChargesSettingsPage() {
  const [inside, setInside] = useState<string>("");
  const [gazipur, setGazipur] = useState<string>("");
  const [outside, setOutside] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/ecommerce/delivery-settings/");
        const data: DeliverySettings = response.data;
        setInside(String(data.inside_dhaka_charge ?? "0"));
        setGazipur(String(data.inside_gazipur_charge ?? "0"));
        setOutside(String(data.outside_dhaka_charge ?? "0"));
      } catch (error) {
        console.error("Failed to fetch delivery settings:", error);
        toast({
          title: "Error",
          description: "Failed to load delivery settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    if (!inside || !gazipur || !outside) {
      toast({
        title: "Validation Error",
        description: "Please enter all delivery charges.",
        variant: "destructive",
      });
      return;
    }

    const insideNum = parseFloat(inside);
    const gazipurNum = parseFloat(gazipur);
    const outsideNum = parseFloat(outside);

    if (isNaN(insideNum) || isNaN(gazipurNum) || isNaN(outsideNum) || insideNum < 0 || gazipurNum < 0 || outsideNum < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter valid positive numbers for delivery charges.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.patch("/ecommerce/delivery-settings/", {
        inside_dhaka_charge: insideNum,
        inside_gazipur_charge: gazipurNum,
        outside_dhaka_charge: outsideNum,
      });

      toast({
        title: "Success",
        description: "Delivery charges saved successfully!",
      });
    } catch (error: any) {
      console.error("Failed to save delivery settings:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.detail || "Failed to save delivery charges. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-5 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white border border-slate-200/90 shadow-2xs animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Truck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Delivery Charges</h1>
          </div>
          <p className="text-sm text-slate-500">
            Configure regional shipping rates applied across online pre-orders and storefront checkout.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inside Dhaka</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            ${parseFloat(inside || "0").toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Dhaka Metropolitan Area</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inside Gazipur</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            ${parseFloat(gazipur || "0").toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Gazipur District & Suburbs</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outside Dhaka</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            ${parseFloat(outside || "0").toFixed(2)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">All Other Districts Nationwide</span>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">Configure Shipping Rates</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Set the standardized delivery fee in USD ($) for each shipping zone.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inside" className="text-sm font-semibold text-slate-700">
                Inside Dhaka Fee ($ USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                <Input
                  id="inside"
                  type="number"
                  min="0"
                  step="0.01"
                  value={inside}
                  onChange={(e) => setInside(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 bg-white rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-xs text-slate-500">
                Applicable to local deliveries within Dhaka city limits.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gazipur" className="text-sm font-semibold text-slate-700">
                Inside Gazipur Fee ($ USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                <Input
                  id="gazipur"
                  type="number"
                  min="0"
                  step="0.01"
                  value={gazipur}
                  onChange={(e) => setGazipur(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 bg-white rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-xs text-slate-500">
                Applicable to Gazipur municipal and peripheral zones.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outside" className="text-sm font-semibold text-slate-700">
                Outside Dhaka Fee ($ USD)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
                <Input
                  id="outside"
                  type="number"
                  min="0"
                  step="0.01"
                  value={outside}
                  onChange={(e) => setOutside(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 bg-white rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-xs text-slate-500">
                Applicable to divisional and regional deliveries.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 shadow-xs"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving Changes..." : "Save Delivery Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
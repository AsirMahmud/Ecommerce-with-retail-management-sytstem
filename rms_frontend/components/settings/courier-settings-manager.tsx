"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { courierApi, CourierSetting, CourierProvider } from "@/lib/api/courier";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  ShieldCheck,
  ExternalLink,
  Globe,
  Radio,
  Zap,
} from "lucide-react";

interface CourierMeta {
  name: string;
  badgeColor: string;
  tagline: string;
  docUrl: string;
  defaultBaseUrl: string;
}

const COURIER_META: Record<CourierProvider, CourierMeta> = {
  STEADFAST: {
    name: "Steadfast Courier",
    badgeColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    tagline: "Fast nationwide parcel delivery with real-time tracking and instant COD",
    docUrl: "https://portal.packzy.com",
    defaultBaseUrl: "https://portal.packzy.com/api/v1",
  },
  PATHAO: {
    name: "Pathao Courier",
    badgeColor: "bg-red-600 hover:bg-red-700 text-white",
    tagline: "High-speed city and nationwide logistics network with OAuth authentication",
    docUrl: "https://merchant.pathao.com",
    defaultBaseUrl: "https://api-hermes.pathao.com",
  },
  REDX: {
    name: "RedX Logistics",
    badgeColor: "bg-orange-600 hover:bg-orange-700 text-white",
    tagline: "Nationwide coverage with automated doorstep pickup and return handling",
    docUrl: "https://redx.com.bd",
    defaultBaseUrl: "https://openapi.redx.com.bd/v1.0.0-beta",
  },
  CARRYBEE: {
    name: "Carrybee Courier",
    badgeColor: "bg-blue-600 hover:bg-blue-700 text-white",
    tagline: "Smart e-commerce logistics tailored for modern retail operations",
    docUrl: "https://carrybee.com",
    defaultBaseUrl: "https://api.carrybee.com",
  },
};

export function CourierSettingsManager() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CourierSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await courierApi.getSettings();
      setSettings(res.data);
    } catch (err: any) {
      toast({
        title: "Error Loading Courier Settings",
        description: err.response?.data?.detail || "Failed to fetch courier configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFieldChange = (provider: CourierProvider, field: keyof CourierSetting, value: any) => {
    setSettings((prev) =>
      prev.map((s) => {
        if (s.provider === provider) {
          const updated = { ...s, [field]: value };
          // If editing a credential field, auto-enable is_active
          if (field !== "is_active" && Boolean(value)) {
            updated.is_active = true;
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleSave = async (setting: CourierSetting) => {
    try {
      setSavingProvider(setting.provider);
      // Ensure courier is active if credentials exist unless explicitly turned off
      const hasCreds = Boolean(
        setting.api_key || (setting.client_id && setting.client_secret)
      );
      const activeState = hasCreds ? (setting.is_active !== false ? true : false) : setting.is_active;

      const res = await courierApi.updateSetting(setting.id, {
        is_active: activeState,
        is_default: setting.is_default,
        api_key: setting.api_key,
        secret_key: setting.secret_key,
        base_url: setting.base_url,
        client_id: setting.client_id,
        client_secret: setting.client_secret,
        username: setting.username,
        password: setting.password,
        store_id: setting.store_id,
      });

      setSettings((prev) => prev.map((s) => (s.id === setting.id ? res.data : s)));

      toast({
        title: "Settings Saved & Activated",
        description: `${COURIER_META[setting.provider]?.name || setting.provider} is now active and ready for dispatch in Online Preorders.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to Save",
        description: err.response?.data?.detail || "Could not save credentials",
        variant: "destructive",
      });
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTest = async (setting: CourierSetting) => {
    try {
      setTestingProvider(setting.provider);
      // Auto-save first if modified
      await courierApi.updateSetting(setting.id, {
        api_key: setting.api_key,
        secret_key: setting.secret_key,
        base_url: setting.base_url,
        client_id: setting.client_id,
        client_secret: setting.client_secret,
        username: setting.username,
        password: setting.password,
        store_id: setting.store_id,
      });

      const res = await courierApi.testConnection(setting.id);
      setTestResult((prev) => ({
        ...prev,
        [setting.provider]: { success: res.data.success, message: res.data.message },
      }));

      toast({
        title: res.data.success ? "Connection Successful" : "Connection Failed",
        description: res.data.message,
        variant: res.data.success ? "default" : "destructive",
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to reach courier gateway";
      setTestResult((prev) => ({
        ...prev,
        [setting.provider]: { success: false, message: msg },
      }));
      toast({
        title: "Connection Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading courier partner settings...</span>
        </CardContent>
      </Card>
    );
  }

  const activeCount = settings.filter((s) => s.is_active && (s.api_key || (s.client_id && s.client_secret))).length;

  return (
    <Card className="mb-6 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Delivery Agents & Courier Integration
                <Badge variant={activeCount > 0 ? "default" : "secondary"} className="text-xs">
                  {activeCount} Active
                </Badge>
              </CardTitle>
              <CardDescription>
                Configure API keys for Steadfast, Pathao, RedX, and Carrybee. Once configured, active couriers automatically appear as dispatch options in Online Preorders.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Courier Selector Tabs */}
        <Tabs defaultValue="STEADFAST" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-lg gap-1">
            {(['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE'] as CourierProvider[]).map((code) => {
              const setting = settings.find((s) => s.provider === code);
              const meta = COURIER_META[code];
              const isConfigured = Boolean(
                setting?.is_active &&
                (setting?.api_key || (code === 'PATHAO' && setting?.client_id && setting?.client_secret))
              );

              return (
                <TabsTrigger
                  key={code}
                  value={code}
                  className="flex items-center justify-between gap-2 py-2 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm rounded-md text-xs font-semibold"
                >
                  <span className="truncate">{meta?.name || code}</span>
                  {isConfigured ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" title="Active & Ready" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" title="Not configured" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE'] as CourierProvider[]).map((code) => {
            const setting = settings.find((s) => s.provider === code);
            const meta = COURIER_META[code];
            if (!setting) return null;

            const isConfigured = Boolean(
              setting.api_key || (code === 'PATHAO' && setting.client_id && setting.client_secret)
            );
            const isTesting = testingProvider === code;
            const isSaving = savingProvider === code;
            const testInfo = testResult[code];

            return (
              <TabsContent key={code} value={code} className="mt-4 space-y-4">
                {/* Header Card for Courier */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {meta.name}
                      </h3>
                      {setting.is_active && isConfigured ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 flex items-center gap-1 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready for Dispatch
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {setting.is_active ? "API Key Needed" : "Disabled"}
                        </Badge>
                      )}
                      {setting.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.tagline}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`active-${code}`}
                        checked={setting.is_active}
                        onCheckedChange={(checked) => handleFieldChange(code, "is_active", checked)}
                      />
                      <Label htmlFor={`active-${code}`} className="text-xs font-medium cursor-pointer">
                        Enable Integration
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`default-${code}`}
                        checked={setting.is_default}
                        onCheckedChange={(checked) => {
                          setSettings((prev) =>
                            prev.map((s) => ({
                              ...s,
                              is_default: s.provider === code ? checked : false,
                            }))
                          );
                        }}
                      />
                      <Label htmlFor={`default-${code}`} className="text-xs font-medium cursor-pointer">
                        Set as Default
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  {code === "STEADFAST" && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          API Key <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="e.g. 5x7ab8c... (from Steadfast Portal)"
                          value={setting.api_key || ""}
                          onChange={(e) => handleFieldChange(code, "api_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                          Secret Key <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="e.g. 9y0z1... (from Steadfast Portal)"
                          value={setting.secret_key || ""}
                          onChange={(e) => handleFieldChange(code, "secret_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-slate-400" />
                          API Endpoint Base URL
                        </Label>
                        <Input
                          placeholder="https://portal.packzy.com/api/v1"
                          value={setting.base_url || ""}
                          onChange={(e) => handleFieldChange(code, "base_url", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {code === "PATHAO" && (
                    <>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          API Key / Access Token <span className="text-xs text-muted-foreground font-normal">(Optional if using Client ID & Secret below)</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="Pathao Bearer / Access Token (if provided directly)"
                          value={setting.api_key || ""}
                          onChange={(e) => handleFieldChange(code, "api_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          Client ID <span className="text-muted-foreground text-xs font-normal">(OAuth)</span>
                        </Label>
                        <Input
                          placeholder="Pathao Merchant Client ID"
                          value={setting.client_id || ""}
                          onChange={(e) => handleFieldChange(code, "client_id", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                          Client Secret <span className="text-muted-foreground text-xs font-normal">(OAuth)</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="Pathao Merchant Client Secret"
                          value={setting.client_secret || ""}
                          onChange={(e) => handleFieldChange(code, "client_secret", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Username / Registered Email</Label>
                        <Input
                          placeholder="merchant@example.com"
                          value={setting.username || ""}
                          onChange={(e) => handleFieldChange(code, "username", e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Password</Label>
                        <Input
                          type="password"
                          placeholder="Merchant Password"
                          value={setting.password || ""}
                          onChange={(e) => handleFieldChange(code, "password", e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Default Store ID</Label>
                        <Input
                          placeholder="e.g. 12345 (Store ID from Pathao)"
                          value={setting.store_id || ""}
                          onChange={(e) => handleFieldChange(code, "store_id", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Base URL</Label>
                        <Input
                          placeholder="https://api-hermes.pathao.com"
                          value={setting.base_url || ""}
                          onChange={(e) => handleFieldChange(code, "base_url", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {code === "REDX" && (
                    <>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          RedX API Access Token <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          value={setting.api_key || ""}
                          onChange={(e) => handleFieldChange(code, "api_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">Base URL</Label>
                        <Input
                          placeholder="https://openapi.redx.com.bd/v1.0.0-beta"
                          value={setting.base_url || ""}
                          onChange={(e) => handleFieldChange(code, "base_url", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {code === "CARRYBEE" && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-slate-400" />
                          API Key <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          placeholder="Carrybee API Key"
                          value={setting.api_key || ""}
                          onChange={(e) => handleFieldChange(code, "api_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                          Secret Key
                        </Label>
                        <Input
                          type="password"
                          placeholder="Carrybee Secret Key (optional)"
                          value={setting.secret_key || ""}
                          onChange={(e) => handleFieldChange(code, "secret_key", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">Base URL</Label>
                        <Input
                          placeholder="https://api.carrybee.com"
                          value={setting.base_url || ""}
                          onChange={(e) => handleFieldChange(code, "base_url", e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Test Result Message Box */}
                {testInfo && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      testInfo.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {testInfo.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{testInfo.message}</span>
                  </div>
                )}

                {/* Footer Controls & Portal Link */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <a
                    href={meta.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    Open {meta.name} Portal & Documentation
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(setting)}
                      disabled={isTesting || isSaving}
                      className="gap-1.5 text-xs flex-1 sm:flex-none"
                    >
                      {isTesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Radio className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      Test Connection
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSave(setting)}
                      disabled={isSaving}
                      className="gap-1.5 text-xs flex-1 sm:flex-none"
                    >
                      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

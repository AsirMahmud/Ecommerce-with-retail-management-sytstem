"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  Upload,
  Image as ImageIcon,
  Type,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useHomePageSettings, useUpdateHomePageSettings } from "@/hooks/queries/useEcommerce";

interface HomePageSettings {
  id?: number;
  logo_image?: string;
  logo_image_url?: string;
  logo_text?: string;
  footer_tagline?: string;
  footer_address?: string;
  footer_phone?: string;
  footer_email?: string;
  footer_facebook_url?: string;
  footer_instagram_url?: string;
  footer_twitter_url?: string;
  footer_github_url?: string;
  footer_map_embed_url?: string;
  hero_badge_text?: string;
  hero_heading_line1?: string;
  hero_heading_line2?: string;
  hero_heading_line3?: string;
  hero_heading_line4?: string;
  hero_heading_line5?: string;
  hero_description?: string;
  hero_primary_image?: string;
  hero_primary_image_url?: string;
  hero_secondary_image?: string;
  hero_secondary_image_url?: string;
  stat_brands?: string;
  stat_products?: string;
  stat_customers?: string;
}

export default function HomePageSettingsPage() {
  const [settings, setSettings] = useState<HomePageSettings>({});
  const [saving, setSaving] = useState(false);
  const { toast: showToast } = useToast();

  // Use React Query hooks
  const { data: homePageSettings, isLoading } = useHomePageSettings();
  const updateSettingsMutation = useUpdateHomePageSettings();

  // Update local state when data loads
  useEffect(() => {
    if (homePageSettings) {
      setSettings(homePageSettings);
    }
  }, [homePageSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();

      // Add all text fields
      // - Exclude image file fields (they're handled separately)
      // - Exclude only helper *_image_url fields returned from backend
      const helperUrlFields = new Set([
        "logo_image_url",
        "hero_primary_image_url",
        "hero_secondary_image_url",
      ]);

      Object.keys(settings).forEach((key) => {
        const value = settings[key as keyof HomePageSettings];
        const isHelperUrlField = helperUrlFields.has(key);
        const isImageField =
          key === "logo_image" ||
          key === "hero_primary_image" ||
          key === "hero_secondary_image";

        if (value && typeof value === "string" && !isHelperUrlField && !isImageField) {
          formData.append(key, value);
        }
      });

      // Add image files (if selected)
      const maybeAppendFile = (field: keyof HomePageSettings) => {
        const v = settings[field as keyof HomePageSettings] as any;
        if (v instanceof File) {
          formData.append(field as string, v);
        }
      };
      maybeAppendFile("logo_image");
      maybeAppendFile("hero_primary_image");
      maybeAppendFile("hero_secondary_image");

      // Perform mutation and sync local state with the updated settings
      const updated = await updateSettingsMutation.mutateAsync(formData);
      if (updated) {
        setSettings(updated as HomePageSettings);
      }

      showToast({
        title: "Success",
        description: "Home page settings saved successfully!",
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (field: 'logo_image' | 'hero_primary_image' | 'hero_secondary_image') => {
    setSaving(true);
    try {
      const formData = new FormData();
      const flagMap: Record<string, string> = {
        logo_image: 'remove_logo_image',
        hero_primary_image: 'remove_hero_primary_image',
        hero_secondary_image: 'remove_hero_secondary_image',
      };
      formData.append(flagMap[field], 'true');
      await updateSettingsMutation.mutateAsync(formData);
      showToast({ title: 'Image removed', description: 'The image has been deleted.' });
    } catch (error) {
      console.error('Failed to delete image:', error);
      showToast({ title: 'Error', description: 'Failed to delete image.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Sanitize Google Maps embed value:
  // If user pastes full <iframe ...> HTML, extract only the src URL.
  const normalizeMapEmbedValue = (value: string) => {
    if (!value) return value;
    if (value.includes("<iframe")) {
      const match = value.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return value;
  };

  const handleChange = (field: keyof HomePageSettings, value: string) => {
    let nextValue = value;

    if (field === "footer_map_embed_url") {
      nextValue = normalizeMapEmbedValue(value);
    }

    setSettings(prev => ({ ...prev, [field]: nextValue }));
  };

  const handleImageChange = (field: string, file: File | null) => {
    if (file) {
      setSettings(prev => ({ ...prev, [field]: file as any }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xs animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Home className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home Page Configuration</h1>
          </div>
          <p className="text-sm text-slate-500">
            Customize branding, storefront hero banners, statistics, and footer information.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">
            Storefront Settings
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Update logo, typography, hero section banners, and footer contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <Tabs defaultValue="logo" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="logo">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Logo
                </TabsTrigger>
                <TabsTrigger value="hero">
                  <Type className="h-4 w-4 mr-2" />
                  Hero Section
                </TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="footer">Footer</TabsTrigger>
              </TabsList>

              <TabsContent value="logo" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="logo_text">Logo Text</Label>
                  <Input
                    id="logo_text"
                    value={settings.logo_text || ''}
                    onChange={(e) => handleChange('logo_text', e.target.value)}
                    placeholder="Your Logo Text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_image">Logo Image</Label>
                  {settings.logo_image_url && (
                    <img 
                      src={settings.logo_image_url} 
                      alt="Logo" 
                      className="w-32 h-32 object-contain mb-2 border rounded"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      id="logo_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange('logo_image', e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    />
                    {settings.logo_image_url && (
                      <Button variant="outline" onClick={() => handleDeleteImage('logo_image')}>Delete</Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hero" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hero_badge_text">Badge Text</Label>
                    <Input
                      id="hero_badge_text"
                      value={settings.hero_badge_text || ''}
                      onChange={(e) => handleChange('hero_badge_text', e.target.value)}
                      placeholder="New Collection 2024"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num}>
                        <Label htmlFor={`hero_heading_line${num}`}>
                          Heading Line {num}
                        </Label>
                        <Input
                          id={`hero_heading_line${num}`}
                          value={settings[`hero_heading_line${num}` as keyof HomePageSettings] as string || ''}
                          onChange={(e) => handleChange(`hero_heading_line${num}` as keyof HomePageSettings, e.target.value)}
                          placeholder={`Line ${num}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="hero_description">Description</Label>
                    <Textarea
                      id="hero_description"
                      value={settings.hero_description || ''}
                      onChange={(e) => handleChange('hero_description', e.target.value)}
                      placeholder="Enter description"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hero_primary_image">Primary Image</Label>
                      {settings.hero_primary_image_url && (
                        <img 
                          src={settings.hero_primary_image_url} 
                          alt="Primary" 
                          className="w-full h-48 object-cover mb-2 border rounded"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          id="hero_primary_image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange('hero_primary_image', e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                        />
                        {settings.hero_primary_image_url && (
                          <Button variant="outline" onClick={() => handleDeleteImage('hero_primary_image')}>Delete</Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="hero_secondary_image">Secondary Image</Label>
                      {settings.hero_secondary_image_url && (
                        <img 
                          src={settings.hero_secondary_image_url} 
                          alt="Secondary" 
                          className="w-full h-48 object-cover mb-2 border rounded"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          id="hero_secondary_image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange('hero_secondary_image', e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100"
                        />
                        {settings.hero_secondary_image_url && (
                          <Button variant="outline" onClick={() => handleDeleteImage('hero_secondary_image')}>Delete</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-6 mt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="stat_brands">Brands</Label>
                    <Input
                      id="stat_brands"
                      value={settings.stat_brands || ''}
                      onChange={(e) => handleChange('stat_brands', e.target.value)}
                      placeholder="200+"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stat_products">Products</Label>
                    <Input
                      id="stat_products"
                      value={settings.stat_products || ''}
                      onChange={(e) => handleChange('stat_products', e.target.value)}
                      placeholder="2,000+"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stat_customers">Customers</Label>
                    <Input
                      id="stat_customers"
                      value={settings.stat_customers || ''}
                      onChange={(e) => handleChange('stat_customers', e.target.value)}
                      placeholder="30,000+"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="footer" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="footer_tagline">Footer Tagline</Label>
                      <Input
                        id="footer_tagline"
                        value={settings.footer_tagline || ''}
                        onChange={(e) => handleChange('footer_tagline', e.target.value)}
                        placeholder="Modern retail experience, online & in-store"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer_address">Store Address</Label>
                      <Textarea
                        id="footer_address"
                        value={settings.footer_address || ''}
                        onChange={(e) => handleChange('footer_address', e.target.value)}
                        placeholder="123 Retail Avenue, City, Country"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="footer_phone">Phone</Label>
                        <Input
                          id="footer_phone"
                          value={settings.footer_phone || ''}
                          onChange={(e) => handleChange('footer_phone', e.target.value)}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="footer_email">Email</Label>
                        <Input
                          id="footer_email"
                          type="email"
                          value={settings.footer_email || ''}
                          onChange={(e) => handleChange('footer_email', e.target.value)}
                          placeholder="support@yourshop.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Social Media Links</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="footer_facebook_url" className="text-xs text-gray-500">Facebook URL</Label>
                          <Input
                            id="footer_facebook_url"
                            value={settings.footer_facebook_url || ''}
                            onChange={(e) => handleChange('footer_facebook_url', e.target.value)}
                            placeholder="https://facebook.com/yourshop"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="footer_instagram_url" className="text-xs text-gray-500">Instagram URL</Label>
                          <Input
                            id="footer_instagram_url"
                            value={settings.footer_instagram_url || ''}
                            onChange={(e) => handleChange('footer_instagram_url', e.target.value)}
                            placeholder="https://instagram.com/yourshop"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="footer_twitter_url" className="text-xs text-gray-500">Twitter/X URL</Label>
                          <Input
                            id="footer_twitter_url"
                            value={settings.footer_twitter_url || ''}
                            onChange={(e) => handleChange('footer_twitter_url', e.target.value)}
                            placeholder="https://twitter.com/yourshop"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="footer_github_url" className="text-xs text-gray-500">GitHub URL (optional)</Label>
                          <Input
                            id="footer_github_url"
                            value={settings.footer_github_url || ''}
                            onChange={(e) => handleChange('footer_github_url', e.target.value)}
                            placeholder="https://github.com/yourshop"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="footer_map_embed_url">Google Map Embed URL</Label>
                      <Input
                        id="footer_map_embed_url"
                        value={settings.footer_map_embed_url || ''}
                        onChange={(e) => handleChange('footer_map_embed_url', e.target.value)}
                        placeholder="https://www.google.com/maps/embed?..."
                      />
                      <p className="text-xs text-gray-500">
                        Paste the full embed URL from Google Maps (iframe <code>src</code> value).
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-8 pt-4 border-t border-slate-100">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 shadow-xs"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving Changes...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}


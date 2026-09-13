"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PlusCircle, Trash2, ShoppingCart, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  useCreateProduct,
  useCategories,
  useOnlineCategories,
  useCreateOnlineCategory,
  useSuppliers,
} from "@/hooks/queries/useInventory";
import type { CreateProductDTO } from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrationWrapper } from "@/components/hydration-wrapper";
import { globalSizes, COLORS } from "./constants";
import { HierarchicalCategorySelect } from "@/components/inventory/hierarchical-category-select";
import { MultiOnlineCategorySelect } from "@/components/inventory/multi-online-category-select";
import { Badge } from "@/components/ui/badge";

// Define the form schema using Zod
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string({ required_error: "Please select a category" }),
  online_categories: z.array(z.string()).optional(),
  supplier: z.string({ required_error: "Please select a supplier" }).optional(),
  cost_price: z.string().min(1, "Cost price is required"),
  selling_price: z.string().min(1, "Selling price is required"),
  status: z.enum(["active", "inactive", "discontinued"]),
  minimum_stock: z.number().default(10),
  size_type: z.string({ required_error: "Please select a size type" }),
  gender: z.string({ required_error: "Please select a gender" }),
  size_category: z
    .string({ required_error: "Please select a size category" })
    .optional(),
  variations: z
    .array(
      z.object({
        size: z.string().min(1, "Size is required"),
        color: z.string().min(1, "Color is required"),
        stock: z.number().min(0, "Stock must be 0 or greater"),
        waist_size: z.number().optional(),
        chest_size: z.number().optional(),
        height: z.number().optional(),
      })
    )
    .optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

// Define types for our variants
type ColorVariant = {
  id: string;
  color: string;
  colorHex: string;
  stock: number;
  waist_size?: number;
  chest_size?: number;
  height?: number;
};

type SizeVariant = {
  id: string;
  size: string;
  colors: ColorVariant[];
};

// Define types for gallery images
type GalleryImage = {
  id: string;
  file: File | null;
  preview: string | null;
  imageType: 'PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH';
};

type ColorGallery = {
  color: string;
  colorHex: string;
  color_hax?: string;
  images: GalleryImage[];
};

// Additional product information types
type MaterialComposition = {
  id: string;
  percentage: number;
  title?: string;
};

type WhoIsThisFor = {
  id: string;
  title?: string;
  description?: string;
};

type Feature = {
  id: string;
  title?: string;
  description?: string;
};

export default function AddProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const { toast } = useToast();
  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategories();
  const { data: onlineCategories = [], isLoading: isLoadingOnlineCategories } =
    useOnlineCategories();
  const createOnlineCategory = useCreateOnlineCategory();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } =
    useSuppliers();

  // Initialize form with react-hook-form and zod resolver
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      barcode: "",
      category: undefined,
      online_categories: [],
      supplier: undefined,
      cost_price: "",
      selling_price: "",
      status: "active",
      minimum_stock: 10,
      size_type: undefined,
      gender: undefined,
    },
  });

  // State for variants
  const [variants, setVariants] = useState<SizeVariant[]>([]);
  const [sizeCategory, setSizeCategory] = useState<string>("");

  // State for galleries (one per unique color)
  const [galleries, setGalleries] = useState<ColorGallery[]>([]);

  // State for additional product information
  const [materialCompositions, setMaterialCompositions] = useState<MaterialComposition[]>([]);
  const [whoIsThisFor, setWhoIsThisFor] = useState<WhoIsThisFor[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  // State for creating new online category
  const [isCreatingOnlineCategory, setIsCreatingOnlineCategory] = useState(false);
  const [newOnlineCategoryName, setNewOnlineCategoryName] = useState("");
  const [newOnlineCategoryDescription, setNewOnlineCategoryDescription] = useState("");

  // Watch form values for dynamic updates
  const watchedSizeType = form.watch("size_type");
  const watchedGender = form.watch("gender");

  // Get available sizes based on size type, gender, and size category
  const availableSizes = useMemo(() => {
    if (!watchedSizeType || !sizeCategory) return [];

    const sizeTypeData =
      globalSizes[watchedSizeType as keyof typeof globalSizes];
    if (!sizeTypeData) return [];

    // Handle different size type structures
    if (watchedSizeType === "belts" || watchedSizeType === "jersey") {
      return sizeTypeData[sizeCategory as keyof typeof sizeTypeData] || [];
    } else if (
      watchedSizeType === "pants" ||
      watchedSizeType === "shoes" ||
      watchedSizeType === "underwear" ||
      watchedSizeType === "shirts" ||
      watchedSizeType === "tshirts"
    ) {
      // Convert backend gender values to frontend gender values
      const frontendGender =
        watchedGender === "MALE"
          ? "men"
          : watchedGender === "FEMALE"
            ? "women"
            : "unisex";
      const genderData =
        sizeTypeData[frontendGender as keyof typeof sizeTypeData];
      if (genderData) {
        return genderData[sizeCategory as keyof typeof genderData] || [];
      }
    }

    return [];
  }, [watchedSizeType, watchedGender, sizeCategory]);

  // Get available size categories based on size type and gender
  const availableSizeCategories = useMemo(() => {
    if (!watchedSizeType) return [];

    const sizeTypeData =
      globalSizes[watchedSizeType as keyof typeof globalSizes];
    if (!sizeTypeData) return [];

    if (watchedSizeType === "belts" || watchedSizeType === "jersey") {
      return Object.keys(sizeTypeData);
    } else if (
      (watchedSizeType === "pants" ||
        watchedSizeType === "shoes" ||
        watchedSizeType === "underwear" ||
        watchedSizeType === "shirts" ||
        watchedSizeType === "tshirts") &&
      watchedGender
    ) {
      // Convert backend gender values to frontend gender values
      const frontendGender =
        watchedGender === "MALE"
          ? "men"
          : watchedGender === "FEMALE"
            ? "women"
            : "unisex";
      const genderData =
        sizeTypeData[frontendGender as keyof typeof sizeTypeData];
      return genderData ? Object.keys(genderData) : [];
    }

    return [];
  }, [watchedSizeType, watchedGender]);

  // Reset variants when size type or gender changes
  const handleSizeTypeChange = (value: string) => {
    form.setValue("size_type", value);
    setVariants([]);
    setSizeCategory("");
  };

  const handleGenderChange = (value: string) => {
    form.setValue("gender", value);
    setVariants([]);
    setSizeCategory("");
  };

  const validateSizeCategory = (
    sizeType: string,
    gender: string,
    category: string
  ) => {
    const sizeTypeData = globalSizes[sizeType as keyof typeof globalSizes];
    if (!sizeTypeData) return false;

    if (sizeType === "belts" || sizeType === "jersey") {
      return category in sizeTypeData;
    } else if (
      ["pants", "shoes", "underwear", "shirts", "tshirts"].includes(sizeType)
    ) {
      const genderKey =
        gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
      return (
        category in (sizeTypeData[genderKey as keyof typeof sizeTypeData] || {})
      );
    }
    return false;
  };

  const handleSizeCategoryChange = (value: string) => {
    const sizeType = form.getValues("size_type");
    const gender = form.getValues("gender");

    if (!validateSizeCategory(sizeType, gender, value)) {
      toast({
        title: "Invalid Size Category",
        description:
          "Please select a valid size category for the chosen product type and gender",
        variant: "destructive",
      });
      return;
    }

    setSizeCategory(value);
    // Clear existing variants when size category changes
    setVariants([]);
  };

  // Function to add a new size variant
  const addSizeVariant = () => {
    if (!sizeCategory) {
      toast({
        title: "Size Category Required",
        description: "Please select a size category first",
        variant: "destructive",
      });
      return;
    }

    const existingSizes = variants.map((v) => v.size);
    const availableSizes = getAvailableSizesForVariant("");
    const unusedSizes = availableSizes.filter(
      (size) => !existingSizes.includes(size)
    );

    if (unusedSizes.length === 0) {
      toast({
        title: "No Available Sizes",
        description: "All sizes for this category have been added",
        variant: "destructive",
      });
      return;
    }

    const newVariant: SizeVariant = {
      id: crypto.randomUUID(),
      size: unusedSizes[0],
      colors: [],
    };

    setVariants([...variants, newVariant]);
  };

  // Function to add a new color to a size variant
  const addColorVariant = (sizeId: string) => {
    const availableColors = getAvailableColorsForVariant(sizeId);

    if (availableColors.length === 0) {
      toast({
        title: "No Available Colors",
        description:
          "All colors have been added for this size. Please remove a color first to add a new one.",
        variant: "destructive",
      });
      return;
    }

    const firstAvailableColor = availableColors[0];
    const colorHex = COLORS[firstAvailableColor as keyof typeof COLORS];

    setVariants(
      variants.map((variant) => {
        if (variant.id === sizeId) {
          return {
            ...variant,
            colors: [
              ...variant.colors,
              {
                id: Date.now().toString() + "-color",
                color: firstAvailableColor,
                colorHex: colorHex,
                stock: 0,
              },
            ],
          };
        }
        return variant;
      })
    );

    // Gallery creation is now handled by syncGalleriesWithVariants useEffect
  };

  // Function to update a size variant
  const updateSizeVariant = (id: string, size: string) => {
    setVariants(
      variants.map((variant) =>
        variant.id === id ? { ...variant, size } : variant
      )
    );
  };

  // Function to update a color variant
  const updateColorVariant = (
    sizeId: string,
    colorId: string,
    field: keyof ColorVariant,
    value: string | number
  ) => {
    // If updating color name, check for duplicates
    if (field === "color" && typeof value === "string") {
      const currentVariant = variants.find((v) => v.id === sizeId);
      if (currentVariant) {
        const existingColors = currentVariant.colors
          .filter((color) => color.id !== colorId) // Exclude current color being updated
          .map((color) => color.color.toLowerCase());

        if (existingColors.includes(value.toLowerCase())) {
          toast({
            title: "Duplicate Color",
            description: `Color "${value}" already exists for this size. Please choose a different color.`,
            variant: "destructive",
          });
          return; // Don't update if duplicate
        }
      }
    }

    setVariants(
      variants.map((variant) => {
        if (variant.id === sizeId) {
          return {
            ...variant,
            colors: variant.colors.map((color) => {
              if (color.id === colorId) {
                // If updating color name, also update the hex
                if (field === "color" && typeof value === "string") {
                  return {
                    ...color,
                    [field]: value,
                    colorHex:
                      COLORS[value as keyof typeof COLORS] || color.colorHex,
                  };
                }
                return { ...color, [field]: value };
              }
              return color;
            }),
          };
        }
        return variant;
      })
    );
  };

  // Function to remove a size variant
  const removeSizeVariant = (id: string) => {
    setVariants(variants.filter((variant) => variant.id !== id));
  };

  // Function to remove a color variant
  const removeColorVariant = (sizeId: string, colorId: string) => {
    // Find the color being removed
    const variant = variants.find((v) => v.id === sizeId);
    const colorToRemove = variant?.colors.find((c) => c.id === colorId);

    setVariants(
      variants.map((variant) => {
        if (variant.id === sizeId) {
          return {
            ...variant,
            colors: variant.colors.filter((color) => color.id !== colorId),
          };
        }
        return variant;
      })
    );

    // Gallery cleanup is now handled by syncGalleriesWithVariants useEffect
  };

  // Function to get available sizes for a specific variant
  const getAvailableSizesForVariant = (currentVariantId: string) => {
    const usedSizes = variants
      .filter((v) => v.id !== currentVariantId)
      .map((v) => v.size);
    return availableSizes.filter((size) => !usedSizes.includes(size));
  };

  // Function to get available colors for a specific size variant
  const getAvailableColorsForVariant = (sizeId: string) => {
    const currentVariant = variants.find((v) => v.id === sizeId);
    if (!currentVariant) return Object.keys(COLORS);

    const usedColors = currentVariant.colors.map((color) =>
      color.color.toLowerCase()
    );
    return Object.keys(COLORS).filter(
      (color) => !usedColors.includes(color.toLowerCase())
    );
  };

  // Gallery image handling functions
  const handleImageUpload = (color: string, imageId: string, file: File) => {
    const preview = URL.createObjectURL(file);

    setGalleries(galleries.map((gallery) => {
      if (gallery.color.toLowerCase() === color.toLowerCase()) {
        return {
          ...gallery,
          images: gallery.images.map((img) => {
            if (img.id === imageId) {
              // Revoke old preview URL if exists
              if (img.preview) {
                URL.revokeObjectURL(img.preview);
              }
              return { ...img, file, preview };
            }
            return img;
          }),
        };
      }
      return gallery;
    }));
  };

  const handleImageRemove = (color: string, imageId: string) => {
    setGalleries(galleries.map((gallery) => {
      if (gallery.color.toLowerCase() === color.toLowerCase()) {
        return {
          ...gallery,
          images: gallery.images.map((img) => {
            if (img.id === imageId) {
              // Revoke preview URL if exists
              if (img.preview) {
                URL.revokeObjectURL(img.preview);
              }
              return { ...img, file: null, preview: null };
            }
            return img;
          }),
        };
      }
      return gallery;
    }));
  };

  // Material Composition functions
  const addMaterialComposition = () => {
    const newComposition: MaterialComposition = {
      id: crypto.randomUUID(),
      percentage: 0,
      title: "",
    };
    setMaterialCompositions([...materialCompositions, newComposition]);
  };

  const updateMaterialComposition = (id: string, field: keyof MaterialComposition, value: string | number) => {
    setMaterialCompositions(materialCompositions.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeMaterialComposition = (id: string) => {
    setMaterialCompositions(materialCompositions.filter((item) => item.id !== id));
  };

  // Who Is This For functions
  const addWhoIsThisFor = () => {
    const newItem: WhoIsThisFor = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    setWhoIsThisFor([...whoIsThisFor, newItem]);
  };

  const updateWhoIsThisFor = (id: string, field: keyof WhoIsThisFor, value: string) => {
    setWhoIsThisFor(whoIsThisFor.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeWhoIsThisFor = (id: string) => {
    setWhoIsThisFor(whoIsThisFor.filter((item) => item.id !== id));
  };

  // Features functions
  const addFeature = () => {
    const newFeature: Feature = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    setFeatures([...features, newFeature]);
  };

  const updateFeature = (id: string, field: keyof Feature, value: string) => {
    setFeatures(features.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeFeature = (id: string) => {
    setFeatures(features.filter((item) => item.id !== id));
  };

  // Function to sync galleries with all variant colors
  const syncGalleriesWithVariants = useCallback(() => {
    // Get all unique colors from all variants
    const allColors = new Set<string>();
    variants.forEach(variant => {
      variant.colors.forEach(color => {
        allColors.add(color.color.toLowerCase());
      });
    });

    // Create galleries for colors that don't have galleries yet
    const newGalleries: ColorGallery[] = [];
    allColors.forEach(colorName => {
      const colorExists = galleries.some(
        (g) => g.color.toLowerCase() === colorName.toLowerCase()
      );

      if (!colorExists) {
        // Find the color in variants to get the hex value
        let colorHex = '#000000'; // Default fallback
        for (const variant of variants) {
          const foundColor = variant.colors.find(c => c.color.toLowerCase() === colorName.toLowerCase());
          if (foundColor) {
            colorHex = foundColor.colorHex;
            break;
          }
        }

        const newGallery: ColorGallery = {
          color: colorName,
          colorHex: colorHex,
          color_hax: colorHex,
          images: [
            { id: crypto.randomUUID(), file: null, preview: null, imageType: 'PRIMARY' },
            { id: crypto.randomUUID(), file: null, preview: null, imageType: 'SECONDARY' },
            { id: crypto.randomUUID(), file: null, preview: null, imageType: 'THIRD' },
            { id: crypto.randomUUID(), file: null, preview: null, imageType: 'FOURTH' },
          ],
        };
        newGalleries.push(newGallery);
      }
    });

    // Remove galleries for colors that no longer exist in variants
    const updatedGalleries = galleries.filter(gallery =>
      allColors.has(gallery.color.toLowerCase())
    );

    // Add new galleries
    if (newGalleries.length > 0) {
      setGalleries([...updatedGalleries, ...newGalleries]);
    } else if (updatedGalleries.length !== galleries.length) {
      setGalleries(updatedGalleries);
    }
  }, [variants, galleries]);

  // Sync galleries with variants whenever variants change
  useEffect(() => {
    if (variants.length > 0) {
      syncGalleriesWithVariants();
    }
  }, [variants, syncGalleriesWithVariants]);

  // Online Category creation functions
  const handleCreateOnlineCategory = async () => {
    if (!newOnlineCategoryName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      const newCategory = await createOnlineCategory.mutateAsync({
        name: newOnlineCategoryName.trim(),
        description: newOnlineCategoryDescription.trim() || undefined,
      });

      // Set the newly created category as selected
      form.setValue("online_category", newCategory.id.toString());

      // Reset form
      setNewOnlineCategoryName("");
      setNewOnlineCategoryDescription("");
      setIsCreatingOnlineCategory(false);

      toast({
        title: "Success",
        description: "Online category created successfully",
      });
    } catch (error) {
      console.error("Error creating online category:", error);
      toast({
        title: "Error",
        description: "Failed to create online category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelCreateOnlineCategory = () => {
    setIsCreatingOnlineCategory(false);
    setNewOnlineCategoryName("");
    setNewOnlineCategoryDescription("");
  };

  // Function to handle form submission
  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (!sizeCategory) {
        toast({
          title: "Size Category Required",
          description: "Please select a size category",
          variant: "destructive",
        });
        return;
      }

      if (variants.length === 0) {
        toast({
          title: "Variants Required",
          description: "Please add at least one size variant",
          variant: "destructive",
        });
        return;
      }

      // Validate that each variant has at least one color
      const invalidVariants = variants.filter((v) => v.colors.length === 0);
      if (invalidVariants.length > 0) {
        toast({
          title: "Color Required",
          description: `Please add at least one color for size ${invalidVariants[0].size}`,
          variant: "destructive",
        });
        return;
      }

      // Check for duplicate size-color combinations
      const sizeColorCombinations: string[] = [];
      const duplicates: string[] = [];

      variants.forEach((variant) => {
        variant.colors.forEach((color) => {
          const combination = `${variant.size}-${color.color}`.toLowerCase();
          if (sizeColorCombinations.includes(combination)) {
            duplicates.push(`${variant.size} - ${color.color}`);
          } else {
            sizeColorCombinations.push(combination);
          }
        });
      });

      if (duplicates.length > 0) {
        toast({
          title: "Duplicate Variants Found",
          description: `The following combinations already exist: ${duplicates.join(
            ", "
          )}. Please remove duplicates before saving.`,
          variant: "destructive",
        });
        return;
      }

      // Prepare the product data
      const productData: CreateProductDTO = {
        name: data.name,
        description: data.description || "",
        barcode: data.barcode || undefined,
        category: parseInt(data.category),
        online_categories: data.online_categories?.map(id => parseInt(id)),
        supplier: data.supplier ? parseInt(data.supplier) : undefined,
        cost_price: parseFloat(data.cost_price),
        selling_price: parseFloat(data.selling_price),
        minimum_stock: data.minimum_stock,
        is_active: data.status === "active",
        size_type: data.size_type,
        size_category: sizeCategory, // Add size category explicitly
        gender: data.gender,
        variations: variants.flatMap((sizeVariant) =>
          sizeVariant.colors.map((colorVariant) => ({
            size: sizeVariant.size,
            color: colorVariant.color,
            color_hax: colorVariant.colorHex,
            stock: colorVariant.stock,
            waist_size: colorVariant.waist_size,
            chest_size: colorVariant.chest_size,
            height: colorVariant.height,
          }))
        ),
        material_composition: materialCompositions.map((item) => ({
          percentige: item.percentage,
          title: item.title || null,
        })),
        who_is_this_for: whoIsThisFor.map((item) => ({
          title: item.title || null,
          description: item.description || null,
        })),
        features: features.map((item) => ({
          title: item.title || null,
          description: item.description || null,
        })),
        galleries: galleries.map((gallery) => ({
          color: gallery.color,
          color_hax: gallery.color_hax || gallery.colorHex,
          alt_text: gallery.color, // Use color name as alt text
        })),
      };

      // Create the product
      const createdProduct = await createProduct.mutateAsync(productData);

      // Upload images for galleries that have images
      const galleriesWithImages = galleries.filter((g) =>
        g.images.some((img) => img.file !== null)
      );

      if (galleriesWithImages.length > 0 && createdProduct?.id) {
        // Upload images for each color
        for (const gallery of galleriesWithImages) {
          const imagesToUpload = gallery.images.filter((img) => img.file !== null);

          if (imagesToUpload.length > 0) {
            const formData = new FormData();
            formData.append('color', gallery.color);
            formData.append('color_hax', gallery.color_hax || gallery.colorHex);
            formData.append('alt_text', gallery.color);

            // Add all images for this color with their imageTypes
            imagesToUpload.forEach((img) => {
              if (img.file) {
                formData.append('images', img.file);
                // Send the imageType for each image so backend knows which type to assign
                formData.append('image_types', img.imageType);
              }
            });

            try {
              // Import and use the upload function
              const { galleriesApi } = await import('@/lib/api/inventory');
              await galleriesApi.uploadColorImages(createdProduct.id, formData);
            } catch (uploadError) {
              console.error(`Error uploading images for ${gallery.color}:`, uploadError);
              toast({
                title: "Image Upload Warning",
                description: `Product created but some images for ${gallery.color} failed to upload`,
                variant: "default",
              });
            }
          }
        }
      }

      const hasImages = galleries.some((g) =>
        g.images.some((img) => img.file !== null)
      );

      toast({
        title: "Success",
        description: hasImages
          ? "Product and images created successfully"
          : "Product created successfully",
      });

      // Clean up preview URLs
      galleries.forEach((gallery) => {
        gallery.images.forEach((img) => {
          if (img.preview) {
            URL.revokeObjectURL(img.preview);
          }
        });
      });

      // Redirect to products page
      router.push("/inventory/products");
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Add New Product
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a new retail inventory product with variants, sizing, categories, and galleries
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProduct.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs font-medium"
            >
              {createProduct.isPending ? "Creating..." : "Save Product"}
            </Button>
          </div>

          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">
                Product Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter the basic details of your product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Product Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Classic Oxford Shirt"
                            {...field}
                            className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Barcode (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123456789012"
                            {...field}
                            className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          rows={3}
                          {...field}
                          className="border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Category
                        </FormLabel>
                        <FormControl>
                          {isLoadingCategories ? (
                            <Skeleton className="h-12 w-full rounded-xl" />
                          ) : (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id.toString()}
                                  >
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="online_categories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Online Categories (Optional)
                        </FormLabel>
                        <FormControl>
                          {isLoadingOnlineCategories ? (
                            <Skeleton className="h-12 w-full rounded-xl" />
                          ) : isCreatingOnlineCategory ? (
                            <div className="space-y-3">
                              <Input
                                placeholder="Category name"
                                value={newOnlineCategoryName}
                                onChange={(e) => setNewOnlineCategoryName(e.target.value)}
                                className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                              />
                              <Textarea
                                placeholder="Category description (optional)"
                                value={newOnlineCategoryDescription}
                                onChange={(e) => setNewOnlineCategoryDescription(e.target.value)}
                                rows={2}
                                className="border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={handleCreateOnlineCategory}
                                  disabled={createOnlineCategory.isPending}
                                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                  {createOnlineCategory.isPending ? "Creating..." : "Create Category"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={cancelCreateOnlineCategory}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <MultiOnlineCategorySelect
                                categories={onlineCategories}
                                values={field.value}
                                onValuesChange={field.onChange}
                                placeholder="Select online categories"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreatingOnlineCategory(true)}
                                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                              >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Create New Online Category
                              </Button>
                            </div>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Supplier
                        </FormLabel>
                        <FormControl>
                          {isLoadingSuppliers ? (
                            <Skeleton className="h-12 w-full rounded-xl" />
                          ) : (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map((sup) => (
                                  <SelectItem
                                    key={sup.id}
                                    value={sup.id.toString()}
                                  >
                                    {sup.company_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Size Type and Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="size_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Size Type
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={handleSizeTypeChange}
                          >
                            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                              <SelectValue placeholder="Select size type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pants">Pants</SelectItem>
                              <SelectItem value="shoes">Shoes</SelectItem>
                              <SelectItem value="belts">Belts</SelectItem>
                              <SelectItem value="underwear">
                                Underwear
                              </SelectItem>
                              <SelectItem value="jersey">Jersey</SelectItem>
                              <SelectItem value="shirts">Shirts</SelectItem>
                              <SelectItem value="tshirts">T-Shirts</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Gender</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={handleGenderChange}
                            disabled={
                              watchedSizeType === "belts" ||
                              watchedSizeType === "jersey"
                            }
                          >
                            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Men</SelectItem>
                              <SelectItem value="FEMALE">Women</SelectItem>
                              <SelectItem value="UNISEX">Unisex</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Size Category Selection */}
                {availableSizeCategories.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Size Category
                      </label>
                      <Select
                        value={sizeCategory}
                        onValueChange={handleSizeCategoryChange}
                      >
                        <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                          <SelectValue placeholder="Select size category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSizeCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Cost Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                            onWheel={(e) => {
                              // Prevent scrolling from changing the input value
                              if (document.activeElement === e.target) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="selling_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Selling Price
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                            onWheel={(e) => {
                              // Prevent scrolling from changing the input value
                              if (document.activeElement === e.target) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Status</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="discontinued">
                                Discontinued
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Size and Color Options */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Size & Color Options
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Add size variants and their color options
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSizeVariant}
                    disabled={!sizeCategory || availableSizes.length === 0}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Size
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                    >
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Select
                            value={variant.size}
                            onValueChange={(value) =>
                              updateSizeVariant(variant.id, value)
                            }
                          >
                            <SelectTrigger className="w-24 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableSizesForVariant(variant.id).map(
                                (size) => (
                                  <SelectItem key={size} value={size}>
                                    {size}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addColorVariant(variant.id)}
                            className="bg-white/70 backdrop-blur-sm border-white/20 shadow-lg hover:bg-white/90"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Color
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSizeVariant(variant.id)}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="text-sm text-gray-600">
                              <th className="text-left font-medium">Color</th>
                              <th className="text-left font-medium">Stock</th>
                              <th className="text-left font-medium">Waist Size</th>
                              <th className="text-left font-medium">Chest Size</th>
                              <th className="text-left font-medium">Height</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {variant.colors.map((color) => (
                              <tr
                                key={color.id}
                                className="hover:bg-gray-50/50"
                              >
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                      style={{
                                        backgroundColor: color.colorHex,
                                      }}
                                    />
                                    <div className="flex-1 space-y-2">
                                      <Select
                                        value={color.color}
                                        onValueChange={(value) =>
                                          updateColorVariant(
                                            variant.id,
                                            color.id,
                                            "color",
                                            value
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-32 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors">
                                          <SelectValue placeholder="Select color" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {getAvailableColorsForVariant(
                                            variant.id
                                          ).map((name) => (
                                            <SelectItem key={name} value={name}>
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="w-4 h-4 rounded-full border border-gray-200"
                                                  style={{
                                                    backgroundColor:
                                                      COLORS[
                                                      name as keyof typeof COLORS
                                                      ],
                                                  }}
                                                />
                                                <span>{name}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <Input
                                    type="number"
                                    value={color.stock}
                                    onChange={(e) =>
                                      updateColorVariant(
                                        variant.id,
                                        color.id,
                                        "stock",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="w-24 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                                    onWheel={(e) => {
                                      // Prevent scrolling from changing the input value
                                      if (document.activeElement === e.target) {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </td>
                                <td className="py-3">
                                  <Input
                                    type="number"
                                    placeholder="Waist"
                                    value={color.waist_size || ""}
                                    onChange={(e) =>
                                      updateColorVariant(
                                        variant.id,
                                        color.id,
                                        "waist_size",
                                        e.target.value ? parseInt(e.target.value) : 0
                                      )
                                    }
                                    className="w-20 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                                    onWheel={(e) => {
                                      if (document.activeElement === e.target) {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </td>
                                <td className="py-3">
                                  <Input
                                    type="number"
                                    placeholder="Chest"
                                    value={color.chest_size || ""}
                                    onChange={(e) =>
                                      updateColorVariant(
                                        variant.id,
                                        color.id,
                                        "chest_size",
                                        e.target.value ? parseInt(e.target.value) : 0
                                      )
                                    }
                                    className="w-20 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                                    onWheel={(e) => {
                                      if (document.activeElement === e.target) {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </td>
                                <td className="py-3">
                                  <Input
                                    type="number"
                                    placeholder="Height"
                                    value={color.height || ""}
                                    onChange={(e) =>
                                      updateColorVariant(
                                        variant.id,
                                        color.id,
                                        "height",
                                        e.target.value ? parseInt(e.target.value) : 0
                                      )
                                    }
                                    className="w-20 h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-colors"
                                    onWheel={(e) => {
                                      if (document.activeElement === e.target) {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </td>
                                <td className="py-3 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeColorVariant(variant.id, color.id)
                                    }
                                    className="hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gallery Section */}
            {galleries.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-6 w-6" />
                    Product Galleries
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload up to 4 images per color variant (PRIMARY, SECONDARY, THIRD, FOURTH)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {galleries.map((gallery) => (
                      <Card key={gallery.color} className="border-2 border-gray-200">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <CardTitle className="text-lg font-semibold flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                              style={{ backgroundColor: gallery.color_hax || gallery.colorHex }}
                            />
                            <span className="capitalize">{gallery.color}</span>
                            <span className="text-sm text-gray-500 font-normal">
                              ({gallery.images.filter(img => img.file).length}/4 uploaded)
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {gallery.images.map((image) => (
                              <div
                                key={image.id}
                                className="relative group"
                              >
                                <div className="aspect-square border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 hover:border-blue-500 transition-colors">
                                  {image.preview ? (
                                    <div className="relative w-full h-full">
                                      <img
                                        src={image.preview}
                                        alt={`${gallery.color} - ${image.imageType}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleImageRemove(gallery.color, image.id)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <label
                                      htmlFor={`image-${image.id}`}
                                      className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                      <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                      <span className="text-sm font-medium text-gray-600">
                                        {image.imageType}
                                      </span>
                                      <span className="text-xs text-gray-400 mt-1">
                                        Click to upload
                                      </span>
                                      <input
                                        id={`image-${image.id}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleImageUpload(gallery.color, image.id, file);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                                <div className="mt-2 text-center">
                                  <span className="text-xs font-medium text-gray-600 capitalize">
                                    {image.imageType.toLowerCase()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Material Composition Section */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Material Composition
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Add material composition details (percentage and material type)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {materialCompositions.map((item, index) => (
                    <div key={item.id} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Material {index + 1}
                        </label>
                        <Input
                          placeholder="e.g., Cotton, Polyester"
                          value={item.title || ""}
                          onChange={(e) => updateMaterialComposition(item.id, "title", e.target.value)}
                          className="h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Percentage
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50"
                          value={item.percentage || ""}
                          onChange={(e) => updateMaterialComposition(item.id, "percentage", parseInt(e.target.value) || 0)}
                          className="h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMaterialComposition(item.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMaterialComposition}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Material Composition
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Who Is This For Section */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Who Is This For
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Define target audience and use cases for this product
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {whoIsThisFor.map((item, index) => (
                    <div key={item.id} className="space-y-3">
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Title {index + 1}
                          </label>
                          <Input
                            placeholder="e.g., Professional Women, Athletes"
                            value={item.title || ""}
                            onChange={(e) => updateWhoIsThisFor(item.id, "title", e.target.value)}
                            className="h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWhoIsThisFor(item.id)}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Description
                        </label>
                        <Textarea
                          placeholder="Describe the target audience or use case..."
                          rows={2}
                          value={item.description || ""}
                          onChange={(e) => updateWhoIsThisFor(item.id, "description", e.target.value)}
                          className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addWhoIsThisFor}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Target Audience
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features Section */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Product Features
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Highlight key features and benefits of this product
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {features.map((item, index) => (
                    <div key={item.id} className="space-y-3">
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Feature {index + 1}
                          </label>
                          <Input
                            placeholder="e.g., Moisture Wicking, UV Protection"
                            value={item.title || ""}
                            onChange={(e) => updateFeature(item.id, "title", e.target.value)}
                            className="h-10 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFeature(item.id)}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Description
                        </label>
                        <Textarea
                          placeholder="Describe the feature and its benefits..."
                          rows={2}
                          value={item.description || ""}
                          onChange={(e) => updateFeature(item.id, "description", e.target.value)}
                          className="border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeature}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { PlusCircle, Trash2, ShoppingCart, ArrowLeft, Upload, X } from "lucide-react";
import {
  useUpdateProduct,
  useProduct,
  useCategories,
  useSuppliers,
  useOnlineCategories,
  useCreateOnlineCategory,
} from "@/hooks/queries/useInventory";
import type {
  CreateProductDTO,
  Product,
  ProductVariation as ImportedProductVariation,
  GalleryImage,
} from "@/types/inventory";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { HydrationWrapper } from "@/components/hydration-wrapper";
import { HierarchicalCategorySelect } from "@/components/inventory/hierarchical-category-select";
import { MultiOnlineCategorySelect } from "@/components/inventory/multi-online-category-select";
import { COLORS, globalSizes } from "../../add-product/constants";
import { getImageUrl } from "@/lib/utils";

// Import the same global sizes and colors from add-product

// Add type definitions for globalSizes
type SizeType = keyof typeof globalSizes;
type GenderType = "MALE" | "FEMALE" | "UNISEX";
type SizeCategoryType = "US" | "EU" | "UK" | "Asia" | "international";

// Define the form schema using Zod (same as add-product)
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
  size_type: z.enum(
    [
      "pants",
      "shoes",
      "belts",
      "underwear",
      "jersey",
      "shirts",
      "tshirts",
    ] as const,
    {
      required_error: "Please select a size type",
    }
  ),
  gender: z.enum(["MALE", "FEMALE", "UNISEX"] as const, {
    required_error: "Please select a gender",
  }),
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

// Define types for our variants (same as add-product)
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

type ColorGallery = {
  color: string;
  colorHex: string;
  color_hax?: string;
  images: (GalleryImage & {
    file?: File | null;
    preview?: string | null;
    image_url?: string;
  })[];
};

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

// Add type guards
const isValidSizeType = (value: string): value is SizeType => {
  return [
    "pants",
    "shoes",
    "belts",
    "underwear",
    "jersey",
    "shirts",
    "tshirts",
  ].includes(value);
};

const isValidGender = (value: string): value is GenderType => {
  return ["MALE", "FEMALE", "UNISEX"].includes(value);
};

// Add gender mapping
const genderToSizeKey = {
  MALE: "men",
  FEMALE: "women",
  UNISEX: "men", // Use men's sizes for unisex
} as const;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.id === "string" ? parseInt(params.id) : 0;
  const updateProduct = useUpdateProduct();
  const { data: product, isLoading: isLoadingProduct } = useProduct(productId);
  const { toast } = useToast();
  const { data: categories = [], isLoading: isLoadingCategories } =
    useCategories();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } =
    useSuppliers();
  const { data: onlineCategories = [] } = useOnlineCategories();
  const createOnlineCategory = useCreateOnlineCategory();

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
      size_category: undefined,
    },
  });

  // State for variants
  const [variants, setVariants] = useState<SizeVariant[]>([]);

  // State for galleries
  const [galleries, setGalleries] = useState<ColorGallery[]>([]);

  // State to track images that should be deleted from backend
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // State for material composition
  const [materialCompositions, setMaterialCompositions] = useState<MaterialComposition[]>([]);

  // State for who is this for
  const [whoIsThisFor, setWhoIsThisFor] = useState<WhoIsThisFor[]>([]);

  // State for features
  const [features, setFeatures] = useState<Feature[]>([]);

  // State for online category creation
  const [isCreatingOnlineCategory, setIsCreatingOnlineCategory] = useState(false);
  const [newOnlineCategoryName, setNewOnlineCategoryName] = useState("");
  const [newOnlineCategoryDescription, setNewOnlineCategoryDescription] = useState("");

  // Watch form values for dynamic updates
  const watchedSizeType = form.watch("size_type");
  const watchedGender = form.watch("gender");
  const watchedSizeCategory = form.watch("size_category");

  // Sync galleries with variants
  const syncGalleriesWithVariants = useCallback((currentGalleries: ColorGallery[], currentVariants: SizeVariant[]) => {
    const allColors = new Set<string>();
    currentVariants.forEach(variant => {
      variant.colors.forEach(color => {
        allColors.add(color.color.toLowerCase());
      });
    });

    const newGalleries: ColorGallery[] = [];
    allColors.forEach(colorName => {
      const colorExists = currentGalleries.some(
        (g) => g.color.toLowerCase() === colorName.toLowerCase()
      );

      if (!colorExists) {
        let colorHex = '#000000';
        for (const variant of currentVariants) {
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
            { id: Math.floor(Math.random() * 1000000), image: '', image_url: '', alt_text: '', file: null, preview: null, imageType: 'PRIMARY' },
            { id: Math.floor(Math.random() * 1000000), image: '', image_url: '', alt_text: '', file: null, preview: null, imageType: 'SECONDARY' },
            { id: Math.floor(Math.random() * 1000000), image: '', image_url: '', alt_text: '', file: null, preview: null, imageType: 'THIRD' },
            { id: Math.floor(Math.random() * 1000000), image: '', image_url: '', alt_text: '', file: null, preview: null, imageType: 'FOURTH' },
          ],
        };
        newGalleries.push(newGallery);
      }
    });

    const updatedGalleries = currentGalleries.filter(gallery =>
      allColors.has(gallery.color.toLowerCase())
    ).map(gallery => {
      // Ensure each existing gallery has exactly 4 image slots
      const imageTypes: ('PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH')[] = ['PRIMARY', 'SECONDARY', 'THIRD', 'FOURTH'];
      const existingImages = new Map();

      gallery.images.forEach(img => {
        existingImages.set(img.imageType, img);
      });

      const completeImages = imageTypes.map(imageType => {
        return existingImages.get(imageType) || {
          id: Math.floor(Math.random() * 1000000),
          imageType: imageType,
          image: '',
          image_url: '',
          alt_text: '',
          file: null,
          preview: null,
        };
      });

      return {
        ...gallery,
        images: completeImages,
      };
    });

    return [...updatedGalleries, ...newGalleries];
  }, []);

  // Sync galleries when variants change
  useEffect(() => {
    if (variants.length > 0) {
      setGalleries(prevGalleries => syncGalleriesWithVariants(prevGalleries, variants));
    }
  }, [variants, syncGalleriesWithVariants]);

  // Load product data into form when available
  useEffect(() => {
    if (product) {
      console.log('Loading product data:', product);
      console.log('Product galleries:', product.galleries);
      // Set form values with proper type assertions
      form.reset({
        name: product.name,
        description: product.description || "",
        barcode: product.barcode || "",
        category: product.category?.id.toString(),
        online_categories: (product as any).online_categories?.map((cat: any) => cat.id.toString()) || [],
        supplier: product.supplier?.id.toString(),
        cost_price: product.cost_price.toString(),
        selling_price: product.selling_price.toString(),
        status: product.is_active ? "active" : "inactive",
        minimum_stock: product.minimum_stock,
        size_type: (product.size_type || "pants") as SizeType,
        gender: (product.gender || "MALE") as GenderType,
        size_category: product.size_category || undefined,
      });

      // Set size category
      form.setValue("size_category", product.size_category || "");

      // Set variants with proper typing
      if (product.variations) {
        const sizeVariants: SizeVariant[] = [];
        const sizeMap = new Map<string, SizeVariant>();

        product.variations.forEach((variation: ImportedProductVariation) => {
          if (!sizeMap.has(variation.size)) {
            const sizeVariant: SizeVariant = {
              id: Math.random().toString(36).substr(2, 9),
              size: variation.size,
              colors: [],
            };
            sizeMap.set(variation.size, sizeVariant);
            sizeVariants.push(sizeVariant);
          }

          const sizeVariant = sizeMap.get(variation.size)!;
          sizeVariant.colors.push({
            id: Math.random().toString(36).substr(2, 9),
            color: variation.color,
            colorHex: (variation as any).color_hax || "#000000",
            stock: variation.stock,
            waist_size: (variation as any).waist_size,
            chest_size: (variation as any).chest_size,
            height: (variation as any).height,
          });
        });

        setVariants(sizeVariants);
      }

      // Load galleries
      if (product.galleries) {
        console.log('Loading galleries:', product.galleries);
        const loadedGalleries: ColorGallery[] = product.galleries.map((gallery: any) => {
          console.log('Processing gallery:', gallery);

          // Create a map of existing images by type for easy lookup
          const existingImages = new Map();
          if (gallery.images) {
            gallery.images.forEach((img: any) => {
              const previewUrl = img.image_url ? getImageUrl(img.image_url) : (img.image ? getImageUrl(img.image) : null);
              existingImages.set(img.imageType, {
                id: img.id,
                imageType: img.imageType,
                image: img.image,
                image_url: img.image_url,
                alt_text: img.alt_text,
                file: null,
                preview: previewUrl,
              });
            });
          }

          // Always create exactly 4 image slots
          const imageTypes: ('PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH')[] = ['PRIMARY', 'SECONDARY', 'THIRD', 'FOURTH'];
          const images = imageTypes.map(imageType => {
            return existingImages.get(imageType) || {
              id: Math.floor(Math.random() * 1000000),
              imageType: imageType,
              image: '',
              image_url: '',
              alt_text: '',
              file: null,
              preview: null,
            };
          });

          return {
            color: gallery.color,
            colorHex: gallery.color_hax || "#000000",
            color_hax: gallery.color_hax,
            images: images,
          };
        });
        console.log('Loaded galleries:', loadedGalleries);
        setGalleries(loadedGalleries);
      }

      // Load material compositions
      if (product.material_composition) {
        const loadedMaterialCompositions: MaterialComposition[] = product.material_composition.map((item: any) => ({
          id: item.id,
          percentage: item.percentige,
          title: item.title,
        }));
        setMaterialCompositions(loadedMaterialCompositions);
      }

      // Load who is this for
      if (product.who_is_this_for) {
        const loadedWhoIsThisFor: WhoIsThisFor[] = product.who_is_this_for.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
        }));
        setWhoIsThisFor(loadedWhoIsThisFor);
      }

      // Load features
      if (product.features) {
        const loadedFeatures: Feature[] = product.features.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
        }));
        setFeatures(loadedFeatures);
      }
    }
  }, [product, form]);

  // Update the availableSizes useMemo with proper typing and data access
  const availableSizes = useMemo(() => {
    if (!watchedSizeType || !watchedSizeCategory) return [];

    const sizeTypeData =
      globalSizes[watchedSizeType as keyof typeof globalSizes];
    if (!sizeTypeData) return [];

    // Handle different size type structures
    if (watchedSizeType === "belts" || watchedSizeType === "jersey") {
      return (
        sizeTypeData[watchedSizeCategory as keyof typeof sizeTypeData] || []
      );
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
        return genderData[watchedSizeCategory as keyof typeof genderData] || [];
      }
    }

    return [];
  }, [watchedSizeType, watchedGender, watchedSizeCategory]);

  // Update the size category select content
  <SelectContent>
    {watchedSizeType &&
      watchedGender &&
      (() => {
        try {
          const sizeTypeData =
            globalSizes[watchedSizeType as keyof typeof globalSizes];
          if (!sizeTypeData) return null;

          let categories: string[] = [];

          if (watchedSizeType === "belts" || watchedSizeType === "jersey") {
            // For belts and jersey, categories are direct keys
            categories = Object.keys(sizeTypeData);
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
              categories = Object.keys(genderData);
            }
          }

          return categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ));
        } catch (error) {
          console.error("Error getting size categories:", error);
          return null;
        }
      })()}
  </SelectContent>;

  // Update the handler functions to use proper typing
  const handleSizeTypeChange = (value: string) => {
    if (isValidSizeType(value)) {
      form.setValue("size_type", value);
      form.setValue("size_category", undefined); // Reset size category when size type changes
    }
  };

  const handleGenderChange = (value: string) => {
    if (isValidGender(value)) {
      form.setValue("gender", value);
      form.setValue("size_category", undefined); // Reset size category when gender changes
    }
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

    if (!sizeType || !gender) {
      toast({
        title: "Selection Required",
        description: "Please select both size type and gender first",
        variant: "destructive",
      });
      return;
    }

    if (!validateSizeCategory(sizeType, gender, value)) {
      toast({
        title: "Invalid Selection",
        description:
          "This size category is not valid for the selected type and gender",
        variant: "destructive",
      });
      return;
    }

    form.setValue("size_category", value);
  };

  const addSizeVariant = () => {
    const currentSizeCategory = form.getValues("size_category");

    if (!currentSizeCategory) {
      toast({
        title: "Size Category Required",
        description: "Please select a size category first",
        variant: "destructive",
      });
      return;
    }

    const newVariant: SizeVariant = {
      id: Math.random().toString(36).substr(2, 9),
      size: "",
      colors: [],
    };
    setVariants([...variants, newVariant]);
  };

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

    setVariants(
      variants.map((variant) =>
        variant.id === sizeId
          ? {
            ...variant,
            colors: [
              ...variant.colors,
              {
                id: Math.random().toString(36).substr(2, 9),
                color: firstAvailableColor,
                colorHex: COLORS[firstAvailableColor as keyof typeof COLORS],
                stock: 0,
              },
            ],
          }
          : variant
      )
    );
  };

  const updateSizeVariant = (id: string, size: string) => {
    setVariants(
      variants.map((variant) =>
        variant.id === id ? { ...variant, size } : variant
      )
    );
  };

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
      variants.map((variant) =>
        variant.id === sizeId
          ? {
            ...variant,
            colors: variant.colors.map((color) =>
              color.id === colorId ? { ...color, [field]: value } : color
            ),
          }
          : variant
      )
    );
  };

  const removeSizeVariant = (id: string) => {
    setVariants(variants.filter((variant) => variant.id !== id));
  };

  const removeColorVariant = (sizeId: string, colorId: string) => {
    setVariants(
      variants.map((variant) =>
        variant.id === sizeId
          ? {
            ...variant,
            colors: variant.colors.filter((color) => color.id !== colorId),
          }
          : variant
      )
    );
  };

  const getAvailableSizesForVariant = (currentVariantId: string): string[] => {
    return availableSizes.filter(
      (size: string) =>
        !variants.some(
          (variant) => variant.id !== currentVariantId && variant.size === size
        )
    );
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

  // Online category functions
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
        name: newOnlineCategoryName,
        description: newOnlineCategoryDescription,
      });

      form.setValue("online_categories", [
        ...(form.getValues("online_categories") || []),
        newCategory.id.toString(),
      ]);
      setNewOnlineCategoryName("");
      setNewOnlineCategoryDescription("");
      setIsCreatingOnlineCategory(false);

      toast({
        title: "Success",
        description: "Online category created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create online category",
        variant: "destructive",
      });
    }
  };

  const cancelCreateOnlineCategory = () => {
    setIsCreatingOnlineCategory(false);
    setNewOnlineCategoryName("");
    setNewOnlineCategoryDescription("");
  };

  // Material composition functions
  const addMaterialComposition = () => {
    const newItem: MaterialComposition = {
      id: Math.random().toString(36).substr(2, 9),
      percentage: 0,
      title: "",
    };
    setMaterialCompositions([...materialCompositions, newItem]);
  };

  const updateMaterialComposition = (id: string, field: keyof MaterialComposition, value: string | number) => {
    setMaterialCompositions(materialCompositions.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeMaterialComposition = (id: string) => {
    setMaterialCompositions(materialCompositions.filter(item => item.id !== id));
  };

  // Who is this for functions
  const addWhoIsThisFor = () => {
    const newItem: WhoIsThisFor = {
      id: Math.random().toString(36).substr(2, 9),
      title: "",
      description: "",
    };
    setWhoIsThisFor([...whoIsThisFor, newItem]);
  };

  const updateWhoIsThisFor = (id: string, field: keyof WhoIsThisFor, value: string) => {
    setWhoIsThisFor(whoIsThisFor.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeWhoIsThisFor = (id: string) => {
    setWhoIsThisFor(whoIsThisFor.filter(item => item.id !== id));
  };

  // Features functions
  const addFeature = () => {
    const newItem: Feature = {
      id: Math.random().toString(36).substr(2, 9),
      title: "",
      description: "",
    };
    setFeatures([...features, newItem]);
  };

  const updateFeature = (id: string, field: keyof Feature, value: string) => {
    setFeatures(features.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeFeature = (id: string) => {
    setFeatures(features.filter(item => item.id !== id));
  };

  // Gallery functions
  const handleImageUpload = (galleryIndex: number, imageIndex: number, file: File) => {
    const newGalleries = [...galleries];
    const gallery = newGalleries[galleryIndex];
    if (gallery && gallery.images[imageIndex]) {
      const image = gallery.images[imageIndex];

      // If replacing an existing image (has id and image_url), mark it for deletion first
      if (image.id && image.image && !image.file) {
        // This is an existing image being replaced, mark it for deletion
        setImagesToDelete(prev => {
          // Only add if not already in the list
          if (!prev.includes(image.id)) {
            return [...prev, image.id];
          }
          return prev;
        });
      }

      // Revoke old preview URL if exists
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }

      // Set the new file and preview
      image.file = file;
      image.preview = URL.createObjectURL(file);
      // Clear the old image URL since we're replacing it
      image.image = '';
      image.image_url = '';

      setGalleries(newGalleries);
    }
  };

  const removeImage = (galleryIndex: number, imageIndex: number) => {
    const newGalleries = [...galleries];
    const gallery = newGalleries[galleryIndex];
    if (gallery && gallery.images[imageIndex]) {
      const image = gallery.images[imageIndex];

      // If it's a new file upload, clear both file and preview
      if (image.file) {
        image.file = null;
        image.preview = null;
      } else if (image.id && image.image) {
        // If it's an existing image from backend, add to deletion list
        setImagesToDelete(prev => [...prev, image.id]);
        image.preview = null;
        image.image = '';
        image.image_url = '';
      } else {
        // If it's an empty slot, just clear the preview
        image.preview = null;
      }
      setGalleries(newGalleries);
    }
  };

  // Submit handler
  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (!data.size_category) {
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

      // Prepare the product data with proper typing
      const productData = {
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
        size_category: data.size_category as SizeCategoryType,
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
        // Don't send galleries data in product update - handle separately
        // galleries: galleries.map((gallery) => ({
        //   color: gallery.color,
        //   color_hax: gallery.color_hax || gallery.colorHex,
        //   alt_text: gallery.color,
        // })),
      };

      // Update the product with proper typing
      // Note: We don't include galleries data here to avoid deleting all existing galleries
      // Gallery updates (image deletion/upload) are handled separately below
      await updateProduct.mutateAsync({
        id: productId,
        ...productData,
      });

      // Delete images that were marked for deletion FIRST (before uploading new ones)
      if (imagesToDelete.length > 0) {
        try {
          const { galleryImagesApi } = await import('@/lib/api/inventory');
          await Promise.all(
            imagesToDelete.map(imageId =>
              galleryImagesApi.delete(imageId).catch(error => {
                console.error(`Error deleting image ${imageId}:`, error);
                return null; // Continue with other deletions even if one fails
              })
            )
          );
          console.log(`Successfully deleted ${imagesToDelete.length} images`);
        } catch (error) {
          console.error('Error deleting images:', error);
          toast({
            title: "Image Deletion Warning",
            description: "Product updated but some images failed to delete from server",
            variant: "default",
          });
        }
      }

      // Upload images for galleries that have new images (after deletion is complete)
      const galleriesWithImages = galleries.filter((g) =>
        g.images.some((img) => img.file !== null)
      );

      if (galleriesWithImages.length > 0) {
        for (const gallery of galleriesWithImages) {
          const imagesToUpload = gallery.images.filter((img) => img.file !== null);

          if (imagesToUpload.length > 0) {
            const formData = new FormData();
            formData.append('color', gallery.color);
            formData.append('color_hax', gallery.color_hax || gallery.colorHex);
            formData.append('alt_text', gallery.color);

            imagesToUpload.forEach((img) => {
              if (img.file) {
                formData.append('images', img.file);
                // Send the imageType for each image so backend knows which type to assign
                formData.append('image_types', img.imageType);
              }
            });

            try {
              const { galleriesApi } = await import('@/lib/api/inventory');
              await galleriesApi.uploadColorImages(productId, formData);
            } catch (uploadError) {
              console.error(`Error uploading images for ${gallery.color}:`, uploadError);
              toast({
                title: "Image Upload Warning",
                description: `Product updated but some images for ${gallery.color} failed to upload`,
                variant: "default",
              });
            }
          }
        }
      }

      const hasImages = galleries.some((g) =>
        g.images.some((img) => img.file !== null)
      );

      const hasDeletedImages = imagesToDelete.length > 0;

      let description = "Product updated successfully";
      if (hasImages && hasDeletedImages) {
        description = "Product, images uploaded, and images deleted successfully";
      } else if (hasImages) {
        description = "Product and images updated successfully";
      } else if (hasDeletedImages) {
        description = "Product updated and images deleted successfully";
      }

      toast({
        title: "Product Updated",
        description: description,
      });

      router.push("/inventory/products");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingProduct || isLoadingCategories || isLoadingSuppliers) {
    return <ProductFormSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground opacity-30" />
        <p className="text-xl font-medium text-muted-foreground">
          Product not found
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Product</h1>
          </div>
          <p className="text-sm text-slate-500">
            Update product information, variations, and inventory
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl border-slate-200">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Basic Information</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter the basic details of the product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
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
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={product.category?.id.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category">
                              {product.category?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="online_categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Online Categories</FormLabel>
                      <div className="space-y-2">
                        {!isCreatingOnlineCategory ? (
                          <div className="space-y-2">
                            <FormControl>
                              <MultiOnlineCategorySelect
                                categories={onlineCategories}
                                values={field.value || []}
                                onValuesChange={field.onChange}
                                placeholder="Select online categories"
                              />
                            </FormControl>
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
                        ) : (
                          <div className="space-y-2">
                            <Input
                              placeholder="Category name"
                              value={newOnlineCategoryName}
                              onChange={(e) => setNewOnlineCategoryName(e.target.value)}
                            />
                            <Textarea
                              placeholder="Category description (optional)"
                              value={newOnlineCategoryDescription}
                              onChange={(e) => setNewOnlineCategoryDescription(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateOnlineCategory}
                                disabled={createOnlineCategory.isPending}
                              >
                                {createOnlineCategory.isPending ? "Creating..." : "Create"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelCreateOnlineCategory}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={product.supplier?.id.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supplier">
                              {product.supplier?.company_name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem
                              key={supplier.id}
                              value={supplier.id.toString()}
                            >
                              {supplier.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing and Stock Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Pricing and Stock</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Set the product pricing and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter cost price"
                          {...field}
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
                      <FormLabel>Selling Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter selling price"
                          {...field}
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
                  name="minimum_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter minimum stock level"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
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
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="discontinued">
                            Discontinued
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Size and Variations Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Size and Variations</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure product sizes, color variants, and variations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="size_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size Type</FormLabel>
                      <Select
                        onValueChange={handleSizeTypeChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pants">Pants</SelectItem>
                          <SelectItem value="shoes">Shoes</SelectItem>
                          <SelectItem value="belts">Belts</SelectItem>
                          <SelectItem value="underwear">Underwear</SelectItem>
                          <SelectItem value="jersey">Jersey</SelectItem>
                          <SelectItem value="shirts">Shirts</SelectItem>
                          <SelectItem value="tshirts">T-Shirts</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={handleGenderChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="UNISEX">Unisex</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="size_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleSizeCategoryChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {watchedSizeType &&
                            watchedGender &&
                            (() => {
                              try {
                                const sizeTypeData =
                                  globalSizes[watchedSizeType as SizeType];
                                if (!sizeTypeData) return null;

                                let categories: string[] = [];

                                if (
                                  watchedSizeType === "belts" ||
                                  watchedSizeType === "jersey"
                                ) {
                                  // For belts and jersey, categories are direct keys
                                  categories = Object.keys(sizeTypeData);
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
                                    sizeTypeData[
                                    frontendGender as keyof typeof sizeTypeData
                                    ];
                                  if (genderData) {
                                    categories = Object.keys(genderData);
                                  }
                                }

                                return categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ));
                              } catch (error) {
                                console.error(
                                  "Error getting size categories:",
                                  error
                                );
                                return null;
                              }
                            })()}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Size Variants */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Size Variants</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSizeVariant}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Size
                  </Button>
                </div>

                {variants.map((variant) => (
                  <Card key={variant.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <FormItem className="flex-1">
                          <FormLabel>Size</FormLabel>
                          <Select
                            value={variant.size}
                            onValueChange={(value) =>
                              updateSizeVariant(variant.id, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
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
                        </FormItem>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addColorVariant(variant.id)}
                          className="mt-8"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Color
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSizeVariant(variant.id)}
                          className="mt-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Color Variants */}
                      <div className="space-y-4 pl-4">
                        {variant.colors.map((color) => (
                          <div
                            key={color.id}
                            className="flex items-center gap-4"
                          >
                            <FormItem className="flex-1">
                              <FormLabel>Color</FormLabel>
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
                                <SelectTrigger>
                                  <SelectValue placeholder="Select color" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(COLORS).map(([name, hex]) => (
                                    <SelectItem key={name} value={name}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-4 h-4 rounded-full border"
                                          style={{
                                            backgroundColor: hex,
                                          }}
                                        />
                                        {name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>

                            <FormItem className="w-32">
                              <FormLabel>Stock</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={color.stock}
                                onChange={(e) =>
                                  updateColorVariant(
                                    variant.id,
                                    color.id,
                                    "stock",
                                    parseInt(e.target.value)
                                  )
                                }
                                onWheel={(e) => {
                                  // Prevent scrolling from changing the input value
                                  if (document.activeElement === e.target) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormItem>

                            <FormItem className="w-32">
                              <FormLabel>Waist Size</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={color.waist_size || ""}
                                onChange={(e) =>
                                  updateColorVariant(
                                    variant.id,
                                    color.id,
                                    "waist_size",
                                    e.target.value ? parseInt(e.target.value) : 0
                                  )
                                }
                                onWheel={(e) => {
                                  if (document.activeElement === e.target) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormItem>

                            <FormItem className="w-32">
                              <FormLabel>Chest Size</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={color.chest_size || ""}
                                onChange={(e) =>
                                  updateColorVariant(
                                    variant.id,
                                    color.id,
                                    "chest_size",
                                    e.target.value ? parseInt(e.target.value) : 0
                                  )
                                }
                                onWheel={(e) => {
                                  if (document.activeElement === e.target) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormItem>

                            <FormItem className="w-32">
                              <FormLabel>Height</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                value={color.height || ""}
                                onChange={(e) =>
                                  updateColorVariant(
                                    variant.id,
                                    color.id,
                                    "height",
                                    e.target.value ? parseInt(e.target.value) : 0
                                  )
                                }
                                onWheel={(e) => {
                                  if (document.activeElement === e.target) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </FormItem>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeColorVariant(variant.id, color.id)
                              }
                              className="mt-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Material Composition Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Material Composition</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define the material composition of the product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {materialCompositions.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Percentage"
                    value={item.percentage}
                    onChange={(e) => updateMaterialComposition(item.id, 'percentage', parseInt(e.target.value) || 0)}
                    className="w-32 rounded-xl"
                  />
                  <Input
                    placeholder="Material name"
                    value={item.title || ""}
                    onChange={(e) => updateMaterialComposition(item.id, 'title', e.target.value)}
                    className="flex-1 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMaterialComposition(item.id)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMaterialComposition}
                className="rounded-xl border-slate-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </CardContent>
          </Card>

          {/* Who Is This For Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Who Is This For</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define the target audience for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {whoIsThisFor.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Input
                    placeholder="Title"
                    value={item.title || ""}
                    onChange={(e) => updateWhoIsThisFor(item.id, 'title', e.target.value)}
                    className="rounded-xl bg-white"
                  />
                  <Textarea
                    placeholder="Description"
                    value={item.description || ""}
                    onChange={(e) => updateWhoIsThisFor(item.id, 'description', e.target.value)}
                    className="rounded-xl bg-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWhoIsThisFor(item.id)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addWhoIsThisFor}
                className="rounded-xl border-slate-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Target Audience
              </Button>
            </CardContent>
          </Card>

          {/* Product Features Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Product Features</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define the key features of this product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {features.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <Input
                    placeholder="Feature title"
                    value={item.title || ""}
                    onChange={(e) => updateFeature(item.id, 'title', e.target.value)}
                    className="rounded-xl bg-white"
                  />
                  <Textarea
                    placeholder="Feature description"
                    value={item.description || ""}
                    onChange={(e) => updateFeature(item.id, 'description', e.target.value)}
                    className="rounded-xl bg-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(item.id)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFeature}
                className="rounded-xl border-slate-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </CardContent>
          </Card>

          {/* Product Gallery Card */}
          <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
              <CardTitle className="text-base font-semibold text-slate-900">Product Gallery</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Upload images for each color variant (up to 4 images per color)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {galleries.map((gallery, galleryIndex) => (
                <div key={gallery.color} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-xs"
                      style={{ backgroundColor: gallery.color_hax || gallery.colorHex }}
                    />
                    <h4 className="font-semibold text-sm text-slate-900">{gallery.color}</h4>
                    <span className="text-xs text-slate-500">
                      ({gallery.images.filter(img => img.file || img.preview).length}/4 images)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {gallery.images.map((image, imageIndex) => (
                      <div key={image.id} className="space-y-2">
                        <div className={`aspect-square border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden transition-all ${image.preview ? 'border-slate-200 bg-white' :
                          imagesToDelete.includes(image.id) ? 'border-rose-300 bg-rose-50' :
                            'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                          }`}>
                          {image.preview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={image.preview}
                                alt={`${gallery.color} ${image.imageType.toLowerCase()}`}
                                className="w-full h-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6 rounded-lg shadow-xs"
                                onClick={() => removeImage(galleryIndex, imageIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : imagesToDelete.includes(image.id) ? (
                            <div className="text-center">
                              <X className="h-8 w-8 text-rose-400 mx-auto mb-2" />
                              <p className="text-xs text-rose-500 font-medium">Will be deleted</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-xs text-slate-500 font-medium">{image.imageType}</p>
                            </div>
                          )}
                        </div>

                        {/* Image Action Buttons */}
                        <div className="space-y-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(galleryIndex, imageIndex, file);
                              }
                            }}
                            className="hidden"
                            id={`image-upload-${galleryIndex}-${imageIndex}`}
                          />
                          {!image.preview && !imagesToDelete.includes(image.id) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-xs rounded-xl border-slate-200"
                              onClick={() => {
                                document.getElementById(`image-upload-${galleryIndex}-${imageIndex}`)?.click();
                              }}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Upload
                            </Button>
                          )}
                          {image.preview && (
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs rounded-xl border-slate-200"
                                onClick={() => {
                                  const fileInput = document.createElement('input');
                                  fileInput.type = 'file';
                                  fileInput.accept = 'image/*';
                                  fileInput.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      handleImageUpload(galleryIndex, imageIndex, file);
                                    }
                                  };
                                  fileInput.click();
                                }}
                              >
                                Replace
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => removeImage(galleryIndex, imageIndex)}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                          {imagesToDelete.includes(image.id) && (
                            <div className="text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full text-xs text-rose-600 border-rose-300 rounded-xl"
                                onClick={() => {
                                  setImagesToDelete(prev => prev.filter(id => id !== image.id));
                                  if (image.image) {
                                    image.preview = getImageUrl(image.image_url || image.image);
                                  }
                                }}
                              >
                                Restore Image
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {galleries.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Upload className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Add color variants above to enable gallery upload</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 shadow-xs">
              Update Product
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function ProductFormSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[100px]" />
      </div>

      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

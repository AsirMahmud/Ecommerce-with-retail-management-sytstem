"use client";
import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComboBox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/queries/useInventory";
import { toast } from "sonner";
import {
  useCreatePreorder,
  useUpdatePreorder,
} from "@/hooks/queries/use-preorder";
import type { Preorder } from "@/types/preorder";
import {
  ShoppingCart,
  Package,
  User,
  CreditCard,
  Calendar,
  Check,
  Minus,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_phone: z.string().min(1, "Customer phone is required"),
  customer_email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  preorder_product_id: z.string().min(1, "Product is required"),
  deposit_paid: z.string().optional(),
  notes: z.string().optional(),
  expected_delivery_date: z.date().optional(),
});

export function PreorderForm({
  preorder,
  onSuccess,
}: {
  preorder?: Preorder;
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createPreorder = useCreatePreorder();
  const updatePreorder = useUpdatePreorder();
  const { data: products, isLoading } = useProducts();
  const [amountError, setAmountError] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<string[]>(
    preorder && preorder.items
      ? preorder.items
          .map((item) => `${item.size}-${item.color}`)
          .filter((id) => id !== "")
      : []
  );
  const router = useRouter();
  const [selectAllVariants, setSelectAllVariants] = useState(false);
  const [variantQuantities, setVariantQuantities] = useState<{
    [variantKey: string]: number;
  }>(
    preorder && preorder.items
      ? Object.fromEntries(
          preorder.items
            .map((item) => [`${item.size}-${item.color}`, item.quantity])
            .filter(([key]) => key !== "")
        )
      : {}
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: preorder
      ? {
          customer_name: preorder.customer_name,
          customer_phone: preorder.customer_phone,
          customer_email: preorder.customer_email,
          preorder_product_id:
            preorder.items?.[0]?.product_id?.toString() || "",
          deposit_paid: preorder.deposit_paid?.toString() || "",
          notes: preorder.notes || "",
          expected_delivery_date: preorder.expected_delivery_date
            ? new Date(preorder.expected_delivery_date)
            : undefined,
        }
      : {
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          preorder_product_id: "",
          deposit_paid: "",
          notes: "",
          expected_delivery_date: undefined,
        },
  });

  const selectedProductId = form.watch("preorder_product_id");

  // Memoize the current product to prevent unnecessary re-renders
  const currentProduct = useMemo(() => {
    return products?.find((p: any) => p.id.toString() === selectedProductId);
  }, [products, selectedProductId]);

  // Memoize product variants and filter out those with no stock
  const productVariants = useMemo(() => {
    if (!currentProduct?.variations) return [];
    return currentProduct.variations.filter(
      (v: any) => v.is_active && v.stock > 0
    );
  }, [currentProduct]);

  // Memoize total amount calculation
  const totalAmount = useMemo(() => {
    if (!currentProduct) return 0;

    const variantsToCalculate = selectAllVariants
      ? productVariants
      : productVariants.filter((v: any) =>
          selectedVariants.includes(`${v.size}-${v.color}`)
        );

    return Math.round(variantsToCalculate.reduce((sum: number, variant: any) => {
      const qty = variantQuantities[`${variant.size}-${variant.color}`] || 0;
      return sum + currentProduct.selling_price * qty;
    }, 0));
  }, [
    currentProduct,
    productVariants,
    selectAllVariants,
    selectedVariants,
    variantQuantities,
  ]);

  const depositAmount = Number.parseFloat(form.watch("deposit_paid") || "0");
  const remainingAmount = totalAmount - depositAmount;

  // Memoize handlers to prevent unnecessary re-renders
  const handleVariantToggle = useCallback(
    (variant: any) => {
      const variantKey = `${variant.size}-${variant.color}`;
      let newSelected: string[];
      const newQuantities = { ...variantQuantities };

      if (selectedVariants.includes(variantKey)) {
        newSelected = selectedVariants.filter((key) => key !== variantKey);
        delete newQuantities[variantKey];
        setSelectAllVariants(false);
      } else {
        newSelected = [...selectedVariants, variantKey];
        newQuantities[variantKey] = 1;
      }

      setSelectedVariants(newSelected);
      setVariantQuantities(newQuantities);
    },
    [selectedVariants, variantQuantities]
  );

  const handleQuantityChange = useCallback(
    (variant: any, newQuantity: number, maxStock: number) => {
      const variantKey = `${variant.size}-${variant.color}`;
      const clampedQuantity = Math.max(1, Math.min(newQuantity, maxStock));
      setVariantQuantities((prev) => ({
        ...prev,
        [variantKey]: clampedQuantity,
      }));
    },
    []
  );

  const handleSelectAllVariants = useCallback(
    (checked: boolean) => {
      setSelectAllVariants(checked);
      if (checked) {
        setSelectedVariants(
          productVariants.map((v: any) => `${v.size}-${v.color}`)
        );
        const newQuantities: { [variantKey: string]: number } = {};
        productVariants.forEach((v: any) => {
          newQuantities[`${v.size}-${v.color}`] = 1;
        });
        setVariantQuantities(newQuantities);
      } else {
        setSelectedVariants([]);
        setVariantQuantities({});
      }
    },
    [productVariants]
  );

  const handleSelectAllStock = useCallback(() => {
    const newQuantities = { ...variantQuantities };
    const variantsToUpdate = selectAllVariants
      ? productVariants
      : productVariants.filter((v: any) =>
          selectedVariants.includes(`${v.size}-${v.color}`)
        );

    variantsToUpdate.forEach((variant: any) => {
      newQuantities[`${variant.size}-${variant.color}`] = variant.stock;
    });

    setVariantQuantities(newQuantities);
  }, [variantQuantities, selectAllVariants, productVariants, selectedVariants]);

  const handleProductChange = useCallback(
    (value: string) => {
      form.setValue("preorder_product_id", value);
      // Reset variant selections when product changes
      setSelectedVariants([]);
      setSelectAllVariants(false);
      setVariantQuantities({});
    },
    [form]
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setAmountError("");

    // Variant selection validation
    if (
      !selectAllVariants &&
      selectedVariants.length === 0 &&
      productVariants.length > 0
    ) {
      setAmountError(
        "Please select at least one variant or select all variants."
      );
      setIsSubmitting(false);
      return;
    }

    // Check per-variant stock and quantity
    let hasError = false;
    const checkedVariants = selectAllVariants
      ? productVariants
      : productVariants.filter((v: any) =>
          selectedVariants.includes(`${v.size}-${v.color}`)
        );

    checkedVariants.forEach((variant: any) => {
      const qty = variantQuantities[`${variant.size}-${variant.color}`] || 0;
      if (qty < 1) {
        setAmountError(
          `Please enter quantity for variant ${variant.size} / ${variant.color}`
        );
        hasError = true;
      } else if (qty > variant.stock) {
        setAmountError(
          `Cannot order more than available stock (${variant.stock}) for variant ${variant.size} / ${variant.color}`
        );
        hasError = true;
      }
    });

    if (hasError) {
      setIsSubmitting(false);
      return;
    }

    try {
      const deposit = values.deposit_paid
        ? Number.parseFloat(values.deposit_paid)
        : 0;
      const total = totalAmount;

      // Check for max 10 digits (including decimals)
      const depositStr = deposit.toFixed(2).replace(/^0+/, "");
      const totalStr = total.toFixed(2).replace(/^0+/, "");

      if (
        depositStr.replace(".", "").length > 10 ||
        totalStr.replace(".", "").length > 10
      ) {
        setAmountError(
          "Amount fields must not exceed 10 digits in total (including decimals)"
        );
        setIsSubmitting(false);
        return;
      }

      // Build items array for preorder
      let variantKeys: string[] = [];
      if (selectAllVariants) {
        variantKeys = productVariants.map((v: any) => `${v.size}-${v.color}`);
      } else {
        variantKeys = selectedVariants;
      }

      if (!currentProduct) {
        setAmountError("No product selected.");
        setIsSubmitting(false);
        return;
      }

      const items = variantKeys
        .map((variantKey) => {
          const variant = productVariants.find(
            (v: any) => `${v.size}-${v.color}` === variantKey
          );
          if (!variant) return null;

          const qty = variantQuantities[variantKey] || 1;
          if (qty < 1) return null;

          return {
            product_id: currentProduct.id,
            size: variant.size,
            color: variant.color,
            quantity: qty,
            unit_price: currentProduct.selling_price,
            discount: 0,
          };
        })
        .filter(Boolean);

      if (items.length === 0) {
        setAmountError("No valid variants selected.");
        setIsSubmitting(false);
        return;
      }

      const preorderData: any = {
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email || undefined,
        preorder_product: Number.parseInt(values.preorder_product_id),
        deposit_paid: deposit,
        total_amount: total,
        notes: values.notes || undefined,
        expected_delivery_date: values.expected_delivery_date
          ? values.expected_delivery_date.toISOString().split("T")[0]
          : undefined,
        items,
      };

      if (preorder) {
        await updatePreorder.mutateAsync({
          id: preorder.id,
          data: preorderData,
        });
        toast.success("Preorder updated successfully!");
      } else {
        await createPreorder.mutateAsync(preorderData);
        toast.success("Preorder created successfully!");
      }

      if (onSuccess) onSuccess();
      form.reset();
      setSelectedVariants([]);
      setSelectAllVariants(false);
      setVariantQuantities({});
      router.push("/preorder/#order");
    } catch (error) {
      console.error("Error creating preorder:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">
                {preorder ? "Update Preorder" : "Create New Preorder"}
              </CardTitle>
              <CardDescription>
                {preorder
                  ? "Update existing preorder details"
                  : "Create a preorder for a customer"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Customer Information */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">
                      Customer Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Customer Name *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter customer name"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Phone Number *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter phone number"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="customer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address (optional)"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Product Selection</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="preorder_product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Product *
                        </FormLabel>
                        <FormControl>
                          <ComboBox
                            options={
                              products?.map((product: any) => ({
                                value: product.id.toString(),
                                label: product.name,
                                product: product,
                              })) || []
                            }
                            value={field.value}
                            onValueChange={handleProductChange}
                            placeholder="Select a product"
                            searchPlaceholder="Search products..."
                            emptyMessage="No products found."
                            renderOption={(option) => (
                              <div className="flex items-center justify-between w-full">
                                <span>{option.label}</span>
                                <Badge variant="secondary" className="ml-2">
                                  ${option.product.selling_price}
                                </Badge>
                              </div>
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Variant Selection */}
              {productVariants.length > 0 && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-lg">
                          Variant Selection
                        </CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleSelectAllVariants(!selectAllVariants)
                          }
                        >
                          {selectAllVariants ? "Deselect All" : "Select All"}
                        </Button>
                        {(selectAllVariants || selectedVariants.length > 0) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllStock}
                          >
                            Max Stock
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productVariants.map((variant: any) => {
                        const isSelected = selectedVariants.includes(
                          `${variant.size}-${variant.color}`
                        );
                        const quantity =
                          variantQuantities[
                            `${variant.size}-${variant.color}`
                          ] || 0;

                        return (
                          <Card
                            key={`${variant.size}-${variant.color}`}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "ring-2 ring-primary bg-primary/5"
                                : "hover:shadow-md"
                            }`}
                            onClick={() => handleVariantToggle(variant)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div
                                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                        isSelected
                                          ? "bg-primary border-primary"
                                          : "border-gray-300"
                                      }`}
                                    >
                                      {isSelected && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                    <span className="font-medium">
                                      {variant.size} / {variant.color}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {variant.stock} in stock
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                      Quantity:
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuantityChange(
                                            variant,
                                            quantity - 1,
                                            variant.stock
                                          );
                                        }}
                                        disabled={quantity <= 1}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={variant.stock}
                                        value={quantity}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          const value =
                                            Number.parseInt(e.target.value) ||
                                            1;
                                          handleQuantityChange(
                                            variant,
                                            value,
                                            variant.stock
                                          );
                                        }}
                                        className="w-16 h-8 text-center"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0 bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuantityChange(
                                            variant,
                                            quantity + 1,
                                            variant.stock
                                          );
                                        }}
                                        disabled={quantity >= variant.stock}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Selected Variants Summary */}
                    {(selectAllVariants || selectedVariants.length > 0) && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">
                          Selected Variants Summary:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {(selectAllVariants
                            ? productVariants
                            : productVariants.filter((v: any) =>
                                selectedVariants.includes(
                                  `${v.size}-${v.color}`
                                )
                              )
                          ).map((variant: any) => (
                            <div
                              key={`${variant.size}-${variant.color}`}
                              className="flex justify-between"
                            >
                              <span>
                                {variant.size} / {variant.color}
                              </span>
                              <span className="font-medium">
                                Qty:{" "}
                                {variantQuantities[
                                  `${variant.size}-${variant.color}`
                                ] || 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financial Information */}
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">
                      Financial Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border">
                      <p className="text-sm font-medium text-blue-700 mb-1">
                        Total Amount
                      </p>
                      <p className="text-3xl font-bold text-blue-900">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="deposit_paid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Deposit Paid
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border">
                      <p className="text-sm font-medium text-green-700 mb-1">
                        Remaining Balance
                      </p>
                      <p className="text-3xl font-bold text-green-900">
                        ${remainingAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card className="border-l-4 border-l-gray-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg">
                      Additional Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expected_delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Expected Delivery Date
                          </FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              placeholder="Select delivery date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Notes
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes..."
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Error Display */}
              {amountError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{amountError}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="min-w-[200px] h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{preorder ? "Updating..." : "Creating..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>
                        {preorder ? "Update Preorder" : "Create Preorder"}
                      </span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

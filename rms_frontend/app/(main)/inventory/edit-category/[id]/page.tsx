"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { useCategory, useUpdateCategory } from "@/hooks/queries/useInventory";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Tag } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = typeof params.id === "string" ? parseInt(params.id) : 0;
  const { data: category, isLoading } = useCategory(categoryId);
  const updateCategory = useUpdateCategory();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load category data into form when available
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || "",
      });
    }
  }, [category, form]);

  async function onSubmit(values: FormValues) {
    try {
      const response = await updateCategory.mutateAsync({
        id: categoryId,
        ...values,
      });

      if (!response) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update category",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      router.push("/inventory/categories");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update category",
      });
      console.error("Failed to update category:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white p-6 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-col items-center justify-center h-[40vh] gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Tag className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-slate-800">Category not found</p>
          <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Edit Category
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Update category taxonomy and display details
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 p-5">
          <CardTitle className="text-base font-semibold text-slate-900">
            Category Details
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Modify the name and description of this retail category
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Category Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter category name"
                        {...field}
                        className="bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                      />
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
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter category description..."
                        rows={3}
                        {...field}
                        className="bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateCategory.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs text-xs font-medium"
                >
                  {updateCategory.isPending ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

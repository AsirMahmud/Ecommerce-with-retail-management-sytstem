import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | undefined | null) {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

/**
 * Get the full image URL by combining the base URL with the image path
 * @param imagePath - The relative image path from the backend (e.g., "/media/gallery/97/navy/fourth.png")
 * @returns The full URL for the image
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "/placeholder.svg";

  // If the path already starts with http, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // If the path is a known local placeholder, return as is
  if (imagePath === '/placeholder.svg' || imagePath === '/placeholder.jpg') {
    return imagePath;
  }

  // If the path starts with /media/, use it as is
  if (imagePath.startsWith('/media/')) {
    const baseUrl = process.env.NEXT_PUBLIC_IMAGEURL || "http://127.0.0.1:8000";
    const fullUrl = `${baseUrl}${imagePath}`;
    console.log('Generated image URL:', fullUrl, 'from path:', imagePath);
    return fullUrl;
  }

  // For other paths, add /media/ prefix
  const baseUrl = process.env.NEXT_PUBLIC_IMAGEURL || "http://127.0.0.1:8000";
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  const fullUrl = `${baseUrl}/media/${cleanPath}`;
  console.log('Generated image URL:', fullUrl, 'from path:', imagePath);
  return fullUrl;
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
}
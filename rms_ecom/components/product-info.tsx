"use client"

import { useState, useMemo, useEffect } from "react"
import { Minus, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, sortSizes } from "@/lib/utils"
import { ProductVariant } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { useCartStore } from "@/hooks/useCartStore"
import { useGlobalDiscount } from "@/lib/useGlobalDiscount"
import { useRouter } from "next/navigation"
import { setDirectCheckoutItems, type CartItem } from "@/lib/cart"

interface ProductInfoProps {
  productId: string | number
  product: {
    name: string
    price: number
    originalPrice?: number
    discount?: number
    description: string
    colors: { name: string; value: string }[]
    sizes: string[]
    variants: ProductVariant[]
  }
  // Optional: when provided, render color options as links (navigating to other color pages)
  colorLinks?: Array<{ name: string; value: string; href: string; active?: boolean; oos?: boolean }>
  onAddToCart?: (payload: { quantity: number; size?: string; color?: string }) => void
  onBuyNow?: (payload: { quantity: number; size?: string; color?: string }) => void
  discountInfo?: any // Using any to avoid complex import circular deps, but logically matching DiscountInfo
}

export function ProductInfo({ productId, product, colorLinks, onAddToCart, onBuyNow, discountInfo }: ProductInfoProps) {
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedSize, setSelectedSize] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const addToCart = useCartStore((s) => s.addItem)
  const router = useRouter()

  // Strict Discount Priority Logic:
  // 1. Backend Discount Info (Product > Category > Global calculated by backend)
  // 2. Global Discount (frontend fallback only if backend info is strictly null/undefined)
  const globalDiscountValue = useGlobalDiscount((state) => state.discount?.value || 0)

  const hasBackendInfo = discountInfo !== null && discountInfo !== undefined
  const finalDiscount = hasBackendInfo
    ? discountInfo!.discount_value
    : Math.max(globalDiscountValue, product.discount || 0)

  const showDiscount = finalDiscount > 0
  const basePrice = product.originalPrice !== undefined ? Number(product.originalPrice) : Number(product.price)

  // Use backend final price if available to avoid client-side math discrepancies
  const discounted = hasBackendInfo
    ? discountInfo!.final_price
    : (showDiscount ? basePrice * (1 - finalDiscount / 100) : basePrice)

  // Get current color
  const currentColor = product.colors[selectedColor]

  // Get available sizes for selected color with stock info
  const availableSizesWithStock = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      // Fallback to just sizes if no variant data
      return product.sizes.map((size, index) => ({
        size,
        index,
        stock: 999,
        inStock: true,
        variant: null,
      }))
    }

    return (sortSizes(product.sizes)).map((size, index) => {
      // Find variant for this specific size + color combination
      const variant = product.variants.find(
        v => v.size === size && v.color === currentColor.name
      )

      const stock = variant?.stock || 0
      return {
        size,
        index,
        stock,
        inStock: stock > 0,
        variant: variant || null,
      }
    })
  }, [product.sizes, product.variants, currentColor.name])

  // Get stock for selected size
  const selectedSizeStock = availableSizesWithStock[selectedSize]?.stock || 0

  // When color changes, reset to first available size with stock
  useEffect(() => {
    const firstInStockSize = availableSizesWithStock.findIndex(size => size.inStock)
    if (firstInStockSize !== -1) {
      setSelectedSize(firstInStockSize)
    }
  }, [selectedColor, availableSizesWithStock])

  return (
    <div className="flex flex-col gap-3 lg:gap-5">
      <div>
        <h1 className="text-2xl lg:text-[40px] font-bold mb-2 lg:mb-3 leading-tight">{toTitleCase(product.name)}</h1>

        {/* Stock Information Badge */}


        {/* Show out of stock badge when no stock */}
        {selectedSizeStock === 0 && (
          <div className="mb-4">
            <Badge
              variant="destructive"
              className="text-sm px-3 py-1"
            >
              Out of Stock
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl lg:text-[32px] font-bold">৳{Math.round(discounted)}</span>
          {showDiscount && (
            <>
              <span className="text-2xl lg:text-[28px] text-muted-foreground/60 line-through">
                ৳{Math.round(basePrice)}
              </span>
              <span className="rounded-full bg-red-100 px-3.5 py-1.5 text-xs font-medium text-red-600">
                -{finalDiscount}%
              </span>
            </>
          )}
        </div>

      </div>

      <div className="h-px bg-border" />

      <div>
        <h3 className="mb-3 text-muted-foreground text-sm lg:text-base">Select Colors</h3>
        <div className="flex gap-2 lg:gap-4 flex-wrap">
          {(colorLinks && colorLinks.length > 0 ? colorLinks : product.colors.map((c, idx) => ({ name: c.name, value: c.value, href: "", active: idx === selectedColor, oos: false }))).map((color, index) => {
            const swatch = (
              <span
                className={cn(
                  "relative h-10 w-10 rounded-full inline-block transition-all",
                  (colorLinks ? color.active : selectedColor === index) && "ring-2 ring-foreground ring-offset-2",
                  color.oos && "opacity-50"
                )}
                style={{ backgroundColor: color.value }}
                aria-label={color.name}
              >
                {!colorLinks && selectedColor === index && (
                  <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />
                )}
              </span>
            )
            return colorLinks ? (
              <a key={color.href + index} href={color.href} className="rounded-full" aria-label={color.name}>
                {swatch}
              </a>
            ) : (
              <button
                key={index}
                onClick={() => setSelectedColor(index)}
                aria-label={color.name}
                className="rounded-full"
              >
                {swatch}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div>
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h3 className="text-muted-foreground text-sm lg:text-base">Choose Size</h3>
        </div>
        {selectedSizeStock > 0 && (
          <div className="mb-4">
            <Badge
              variant={selectedSizeStock < 10 ? "destructive" : selectedSizeStock < 20 ? "secondary" : "default"}
              className="text-sm px-3 py-1 rounded-full"
            >
              {selectedSizeStock < 10
                ? `Only ${selectedSizeStock} left`
                : `${selectedSizeStock} in stock`}
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-2 lg:gap-3">
          {availableSizesWithStock.map((sizeInfo) => (
            <button
              key={sizeInfo.size}
              onClick={() => {
                if (sizeInfo.inStock) {
                  setSelectedSize(sizeInfo.index)
                  setQuantity(1)
                }
              }}
              disabled={!sizeInfo.inStock}
              className={cn(
                "rounded-full px-6 py-2.5 text-sm font-medium transition-all relative group",
                !sizeInfo.inStock && "opacity-50 cursor-not-allowed",
                selectedSize === sizeInfo.index
                  ? "bg-foreground text-background"
                  : sizeInfo.inStock
                    ? "bg-muted hover:bg-muted/80 text-foreground"
                    : "bg-muted/50 text-muted-foreground"
              )}
              title={sizeInfo.inStock ? `${currentColor.name} ${sizeInfo.size}: ${sizeInfo.stock} in stock` : "Out of stock"}
            >
              {sizeInfo.size}
              {sizeInfo.inStock && (
                <span className="absolute -top-1 -right-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {sizeInfo.stock}
                </span>
              )}
              {!sizeInfo.inStock && " (OOS)"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex gap-4">
          <div className="flex items-center rounded-full bg-muted">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-4 hover:bg-muted/80 rounded-l-full transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="px-6 font-medium min-w-[3rem] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(selectedSizeStock, quantity + 1))}
              disabled={quantity >= selectedSizeStock}
              className="p-4 hover:bg-muted/80 rounded-r-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <Button
            size="lg"
            className="flex-1 rounded-full h-auto py-4 text-base font-medium"
            disabled={selectedSizeStock === 0}
            onClick={() => {
              if (selectedSizeStock === 0) return
              const sizeName = availableSizesWithStock[selectedSize]?.size
              const colorName = product.colors[selectedColor]?.name
              addToCart({
                productId: String(productId),
                quantity,
                variations: {
                  color: colorName,
                  size: sizeName,
                },
                productDetails: {
                  name: product.name,
                  price: discounted,
                  discount: finalDiscount,
                }
              })
              onAddToCart?.({ quantity, size: sizeName, color: colorName })
            }}
          >
            {selectedSizeStock === 0 ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>

        <Button
          size="lg"
          className="w-full rounded-full h-auto py-4 text-base font-medium bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-colors"
          disabled={selectedSizeStock === 0}
          onClick={() => {
            if (selectedSizeStock === 0) return
            const sizeName = availableSizesWithStock[selectedSize]?.size
            const colorName = product.colors[selectedColor]?.name
            // Use direct checkout instead of adding to cart
            const directCheckoutItem: CartItem = {
              productId: String(productId),
              quantity,
              variations: {
                color: colorName,
                size: sizeName,
              },
              addedAt: Date.now(),
            }
            setDirectCheckoutItems([directCheckoutItem])
            onBuyNow?.({ quantity, size: sizeName, color: colorName })
            router.push("/checkout")
          }}
        >
          {selectedSizeStock === 0 ? "Out of Stock" : "Shop Now"}
        </Button>
      </div>
    </div>
  )
}

function toTitleCase(input: string): string {
  return (input || "")
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

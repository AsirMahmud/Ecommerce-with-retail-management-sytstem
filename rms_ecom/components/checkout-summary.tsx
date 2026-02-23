"use client"

import Image from "next/image"
import { useEffect, useState, useRef } from "react"
import { useCartStore } from "@/hooks/useCartStore"
import { useCheckoutStore } from "@/hooks/useCheckoutStore"
import { ecommerceApi } from "@/lib/api"
import { sendGTMEvent, normalizeProductId } from "@/lib/gtm"
import { getImageUrl } from "@/lib/utils"
import { getCheckoutItems, type CartItem } from "@/lib/cart"
import { useLoading } from "@/hooks/useLoading"

interface CartPricing {
  subtotal: number
  delivery: {
    inside_dhaka_charge: number
    inside_gazipur_charge: number
    outside_dhaka_charge: number
    updated_at: string
  }
}

interface PricedCartItem {
  productId: number
  name: string
  image_url?: string | null
  unit_price: number
  quantity: number
  line_total: number
  variant?: { color?: string | null; size?: string | null }
}

interface ProductInfo {
  id: number
  name: string
  sku: string
  description?: string
  selling_price: string
  original_price?: string | null
  discount?: number | null
  stock_quantity: number
  image?: string
  image_url?: string
  online_category_name?: string
  online_category_id?: number
  available_colors: Array<{ name: string; hex: string }>
  available_sizes: string[]
  variants: Array<any>
  primary_image?: string
  images_ordered: string[]
  created_at: string
  updated_at: string
}

interface CheckoutSummaryProps {
  className?: string
  showTitle?: boolean
}

export function CheckoutSummary({ className, showTitle = true }: CheckoutSummaryProps) {
  const cartStoreItems = useCartStore((s) => s.items)
  const { deliveryMethod, setDeliveryMethod } = useCheckoutStore()
  const [cartPricing, setCartPricing] = useState<CartPricing | null>(null)
  const [pricedItems, setPricedItems] = useState<PricedCartItem[]>([])
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [localLoading, setLocalLoading] = useState(false)
  const hasSentGTM = useRef(false)
  const { startLoading, stopLoading } = useLoading()
  const [items, setItems] = useState<CartItem[]>([])

  // Get checkout items (direct checkout or cart)
  useEffect(() => {
    const checkoutItems = getCheckoutItems()
    setItems(checkoutItems)
  }, [cartStoreItems]) // Re-check when cart store changes or component mounts

  useEffect(() => {
    const fetchCartPricing = async () => {
      if (items.length === 0) {
        setCartPricing(null)
        setPricedItems([])
        setProducts([])
        return
      }

      try {
        startLoading()
        setLocalLoading(true)

        // Normalize items: extract numeric productId and ensure variations are properly set
        const normalizedItems = items.map((item) => {
          let productId: string | number = item.productId
          let variations = item.variations ? { ...item.variations } : {}

          // If productId contains a slash or hyphen (e.g., "141/blue" or "141-blue"), extract the numeric ID and color
          if (typeof item.productId === 'string' && (item.productId.includes('/') || item.productId.includes('-'))) {
            const separator = item.productId.includes('/') ? '/' : '-'
            const parts = item.productId.split(separator)
            productId = parts[0] // Get the numeric part
            // If color is not already in variations, extract it from productId
            if (!variations.color && parts.length > 1) {
              variations.color = parts.slice(1).join(separator) // Handle multi-part colors
            }
          }

          return {
            productId: productId,
            quantity: item.quantity,
            variations: Object.keys(variations).length > 0 ? variations : undefined
          }
        })

        const response = await ecommerceApi.priceCart(normalizedItems)
        setCartPricing({
          subtotal: response.subtotal,
          delivery: response.delivery
        })
        setPricedItems(response.items || [])
        setProducts(response.products || [])
      } catch (error) {
        console.error("Failed to fetch cart pricing:", error)
        setPricedItems([])
      } finally {
        stopLoading()
        setLocalLoading(false)
      }
    }

    fetchCartPricing()
  }, [items, startLoading, stopLoading])

  // GTM Begin Checkout Event
  useEffect(() => {
    if (items.length > 0 && products.length > 0 && !hasSentGTM.current) {
      const gtmItems = items.map(it => {
        // Logic to find product details similar to render
        let numericProductId = typeof it.productId === 'string' && (it.productId.includes('/') || it.productId.includes('-'))
          ? Number(it.productId.split(it.productId.includes('/') ? '/' : '-')[0])
          : Number(it.productId);

        const product = products.find(p => p.id === numericProductId);
        const pricedItem = pricedItems.find(pi => pi.productId === numericProductId); // simplified matching

        // Note: Exact variant matching is complex here without re-implementing it. 
        // For 'begin_checkout', partial info is acceptable if exact variant price isn't critical,
        // but we have 'pricedItems' which should line up if we match carefully.
        // Let's try to get best effort details.

        return {
          item_id: normalizeProductId(it.productId),
          item_name: product?.name || `Product ${it.productId}`,
          price: pricedItem?.unit_price || Number(product?.selling_price) || 0,
          quantity: it.quantity,
          discount: product?.discount || 0,
          item_variant: it.variations ? Object.values(it.variations).join('-') : undefined
        };
      });

      sendGTMEvent('begin_checkout', {
        currency: 'BDT',
        value: cartPricing?.subtotal,
        items: gtmItems
      });
      hasSentGTM.current = true;
    }
  }, [items, products, pricedItems, cartPricing])

  // Helper function to safely format numbers
  const formatPrice = (value: number | string | null | undefined): string => {
    const num = Number(value)
    if (isNaN(num)) return "0.00"
    return num.toFixed(2)
  }

  const normalizeValue = (val: string | null | undefined) => {
    if (!val) return null
    return String(val).trim() || null
  }

  // Trust authoritative subtotal from backend
  const calculateDiscountedSubtotal = (): number => {
    return Number(cartPricing?.subtotal) || 0
  }

  const subtotal = calculateDiscountedSubtotal()
  let deliveryCharge = 0
  if (deliveryMethod === 'inside') {
    deliveryCharge = Number(cartPricing?.delivery?.inside_dhaka_charge) || 0
  } else if (deliveryMethod === 'gazipur') {
    deliveryCharge = Number(cartPricing?.delivery?.inside_gazipur_charge) || 0
  } else {
    deliveryCharge = Number(cartPricing?.delivery?.outside_dhaka_charge) || 0
  }
  const total = subtotal + deliveryCharge

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-card sticky top-24">
        <h2 className="text-xl font-bold mb-6">Order Summary</h2>
        <p className="text-center text-muted-foreground py-8">Your cart is empty.</p>
      </div>
    )
  }

  return (
    <div className={className || "border rounded-lg p-6 bg-card sticky top-24"}>
      {showTitle && <h2 className="text-xl font-bold mb-6">Order Summary</h2>}

      {/* Cart Items */}
      <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">No items in cart</div>
        ) : (
          items.map((it) => {
            // Normalize variation values for comparison - same as cart-items
            const itemColor = normalizeValue(it.variations?.color)
            const itemSize = normalizeValue(it.variations?.size)

            // Extract numeric product ID from string (handle cases like "141/blue")
            let numericProductId: number
            if (typeof it.productId === 'string' && (it.productId.includes('/') || it.productId.includes('-'))) {
              const parts = it.productId.split(it.productId.includes('/') ? '/' : '-')
              numericProductId = Number(parts[0]) || 0
            } else {
              numericProductId = Number(it.productId) || 0
            }

            const pricedItem = pricedItems.find((pi) => {
              // First check product ID
              if (pi.productId !== numericProductId) return false

              // Normalize variant values
              const piColor = normalizeValue(pi.variant?.color)
              const piSize = normalizeValue(pi.variant?.size)

              // Match colors (both null/empty is considered a match)
              const colorMatch = (piColor === itemColor) || (!piColor && !itemColor)

              // Match sizes (both null/empty is considered a match)
              const sizeMatch = (piSize === itemSize) || (!piSize && !itemSize)

              return colorMatch && sizeMatch
            })

            // Get full product information from products array
            const productInfo = products.find((p) => p.id === numericProductId)

            // Use product info for full details, fallback to pricedItem, then item data
            const productName = productInfo?.name || (pricedItem?.name && pricedItem.name.trim()) || `Product ${numericProductId}`
            const productSku = productInfo?.sku || ''
            const productDescription = productInfo?.description || ''
            const productCategory = productInfo?.online_category_name || ''

            // Prioritize primary_image from product info, then fallback to other image sources

            const productImage = productInfo?.primary_image ? productInfo.primary_image : "/placeholder.svg"


            const color = pricedItem?.variant?.color || it.variations?.color
            const size = pricedItem?.variant?.size || it.variations?.size
            const originalPrice = productInfo?.original_price ? Number(productInfo.original_price) : null
            const discount = productInfo?.discount || null

            // Calculate unit price with discount applied
            let unitPrice = pricedItem?.unit_price || Number(productInfo?.selling_price) || 0

            return (
              <div key={`${it.productId}-${JSON.stringify(it.variations || {})}`} className="flex gap-4 p-3 border rounded-lg bg-card">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={productImage}
                    alt={productName}
                    fill
                    className="object-cover"
                    sizes="80px"

                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-2">{productName}</h3>
                      {productSku && (
                        <p className="text-xs text-muted-foreground mb-1">SKU: {productSku}</p>
                      )}
                      {productCategory && (
                        <p className="text-xs text-muted-foreground mb-1">{productCategory}</p>
                      )}
                      {(color || size) && (
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          {color && <span>Color: <span className="font-medium">{color}</span></span>}
                          {size && <span>Size: <span className="font-medium">{size}</span></span>}
                        </div>
                      )}
                      {localLoading && !pricedItem ? (
                        <p className="text-sm text-muted-foreground mt-2">Loading price...</p>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          {originalPrice && originalPrice > unitPrice && (
                            <span className="text-xs text-muted-foreground line-through">৳{formatPrice(originalPrice)}</span>
                          )}
                          <p className="text-sm font-semibold">৳{formatPrice(unitPrice)}</p>
                          {discount && discount > 0 && (
                            <span className="text-xs text-destructive font-medium">-{discount}%</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground flex-shrink-0">x{it.quantity}</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delivery Method Selection */}
      <div className="mb-6 pb-6 border-b">
        <label className="text-sm font-semibold mb-2 block">Delivery Method</label>
        <div className="space-y-2">
          <label className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery-method"
                value="inside"
                checked={deliveryMethod === 'inside'}
                onChange={(e) => setDeliveryMethod(e.target.value as 'inside' | 'gazipur' | 'outside')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Inside Dhaka</span>
            </div>
            {localLoading ? (
              <span className="text-sm font-semibold text-muted-foreground">—</span>
            ) : (
              <span className="text-sm font-semibold">৳{formatPrice(cartPricing?.delivery?.inside_dhaka_charge)}</span>
            )}
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery-method"
                value="gazipur"
                checked={deliveryMethod === 'gazipur'}
                onChange={(e) => setDeliveryMethod(e.target.value as 'inside' | 'gazipur' | 'outside')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Inside Gazipur</span>
            </div>
            {localLoading ? (
              <span className="text-sm font-semibold text-muted-foreground">—</span>
            ) : (
              <span className="text-sm font-semibold">৳{formatPrice(cartPricing?.delivery?.inside_gazipur_charge)}</span>
            )}
          </label>
          <label className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="delivery-method"
                value="outside"
                checked={deliveryMethod === 'outside'}
                onChange={(e) => setDeliveryMethod(e.target.value as 'inside' | 'gazipur' | 'outside')}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Outside Dhaka</span>
            </div>
            {localLoading ? (
              <span className="text-sm font-semibold text-muted-foreground">—</span>
            ) : (
              <span className="text-sm font-semibold">৳{formatPrice(cartPricing?.delivery?.outside_dhaka_charge)}</span>
            )}
          </label>
        </div>
      </div>

      {/* Price Summary */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex justify-between text-base">
          <span className="text-muted-foreground">Subtotal</span>
          {localLoading ? (
            <span className="font-semibold text-muted-foreground">—</span>
          ) : (
            <span className="font-semibold">৳{formatPrice(subtotal)}</span>
          )}
        </div>
        <div className="flex justify-between text-base">
          <span className="text-muted-foreground">Delivery</span>
          {localLoading ? (
            <span className="font-semibold text-muted-foreground">—</span>
          ) : (
            <span className="font-semibold">৳{formatPrice(deliveryCharge)}</span>
          )}
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total</span>
          {localLoading ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span>৳{formatPrice(total)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

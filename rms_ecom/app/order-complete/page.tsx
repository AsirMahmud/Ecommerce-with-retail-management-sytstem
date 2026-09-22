"use client"

import { SiteHeader } from "@/components/site-header"
import { CheckoutProgress } from "@/components/checkout-progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ecommerceApi } from "@/lib/api"
import { sendGTMEvent, normalizeProductId } from "@/lib/gtm"

interface OrderItem {
  product_id: number;
  product_name?: string;
  product_image?: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  discount?: number;
}

interface OnlinePreorder {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: OrderItem[];
  shipping_address?: {
    address?: string;
    city?: string;
    area?: string;
    instructions?: string;
  };
  delivery_charge: number;
  delivery_method?: string;
  total_amount: number;
  status: string;
  notes?: string;
  expected_delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export default function OrderCompletePage() {
  const searchParams = useSearchParams()
  const preorderId = searchParams.get('preorder_id')
  const [order, setOrder] = useState<OnlinePreorder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!preorderId) {
        setError("Order ID not found")
        setLoading(false)
        return
      }

      // Check sessionStorage first for immediate display and fallback resilience
      let initialOrder: OnlinePreorder | null = null
      if (typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem(`order_${preorderId}`)
          if (cached) {
            initialOrder = JSON.parse(cached)
            if (initialOrder) {
              setOrder(initialOrder)
              setLoading(false)
            }
          }
        } catch (e) {
          console.warn("Failed to parse cached order", e)
        }
      }

      try {
        const orderData = await ecommerceApi.getOnlinePreorder(Number(preorderId))

        // Enrich with product names if not already present
        try {
          const cartItemsForPricing = orderData.items.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            variations: {
              color: item.color,
              size: item.size
            }
          }));
          const validItems = cartItemsForPricing.filter(i => i.productId);
          if (validItems.length > 0) {
            const pricingData = await ecommerceApi.priceCart(validItems);
            // Map names back to orderData items
            orderData.items = orderData.items.map((item: OrderItem) => {
              const priced = pricingData.items.find(pi => pi.productId === item.product_id); // Simple match by ID
              return {
                ...item,
                product_name: item.product_name || priced?.name || undefined,
                product_image: item.product_image || (priced?.image_url ? priced.image_url : undefined)
              };
            });
          }
        } catch (e) {
          console.warn("Failed to fetch product names for order", e);
        }

        setOrder(orderData)
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`order_${preorderId}`, JSON.stringify(orderData))
          } catch (e) {}
        }
      } catch (err: any) {
        console.error("Failed to fetch order:", err)
        // Only show error screen if we have no cached order to display
        if (!initialOrder) {
          setError(err?.message || "Failed to load order details")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [preorderId])

  // GTM Order Submitted Event (Suppressed purchase event so Meta purchase only fires on Admin confirmation)
  useEffect(() => {
    if (order) {
      const shippingAddr: any = order.shipping_address || {};
      sendGTMEvent('order_submitted', {
        transaction_id: String(order.id),
        value: order.total_amount,
        tax: 0,
        shipping: order.delivery_charge,
        currency: 'BDT',
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        city: shippingAddr.city || shippingAddr.area || '',
        fbc: shippingAddr.fbc || undefined,
        fbp: shippingAddr.fbp || undefined,
        items: order.items.map(item => {
          const colorSlug = (item.color || '').toLowerCase().replace(/\s+/g, '-');
          return {
            item_id: colorSlug ? `${item.product_id}-${colorSlug}` : String(item.product_id),
            item_name: item.product_name || `Product ${item.product_id}`,
            price: item.unit_price,
            quantity: item.quantity,
            discount: item.discount,
            item_variant: `${item.color || ''} ${item.size || ''}`.trim()
          };
        })
      })
    }
  }, [order])

  const formatPrice = (value: number | string): string => {
    const num = Number(value)
    if (isNaN(num)) return "0.00"
    return num.toFixed(2)
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return new Date().toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="container px-4 py-8">
            <div className="max-w-2xl mx-auto text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Error Loading Order</h2>
              <p className="text-muted-foreground mb-8">{error || "Order not found"}</p>
              <Link href="/">
                <Button size="lg">Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const subtotal = order.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const totalDiscount = order.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <div className="container px-4 py-12 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
                <div className="relative w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Order Received!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Thank you for your purchase. Your order <span className="text-foreground font-semibold">#{order.id}</span> has been received and is currently pending confirmation.
            </p>
            <div className="mt-8">
              <CheckoutProgress currentStep={3} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Order Info & Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items Section */}
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/30">
                  <h3 className="font-bold text-lg">Order Items ({order.items.length})</h3>
                </div>
                <div className="divide-y">
                  {order.items.map((item, index) => (
                    <div key={index} className="p-6 flex gap-6 hover:bg-muted/10 transition-colors">
                      <div className="w-20 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden border">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name || "Product"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg truncate mb-1">
                          {item.product_name || `Product ID: ${item.product_id}`}
                        </h4>
                        <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-muted-foreground">
                          {item.color && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full border" style={{ backgroundColor: item.color }} />
                              Color: {item.color}
                            </span>
                          )}
                          {item.size && <span>Size: {item.size}</span>}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-bold">৳{formatPrice(item.unit_price)}</span>
                          {item.discount && item.discount > 0 && (
                            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                              Saved ৳{formatPrice(item.discount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-end">
                        <p className="font-bold text-lg">
                          ৳{formatPrice((item.unit_price * item.quantity) - (item.discount || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping & Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-4">Customer Details</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</span>
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phone</span>
                      <span className="font-medium">{order.customer_phone}</span>
                    </div>
                    {order.customer_email && (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</span>
                        <span className="font-medium text-primary decoration-1 underline-offset-4">{order.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card border rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-4">Shipping Info</h3>
                  <div className="space-y-4 text-sm">
                    {order.shipping_address ? (
                      <div className="bg-muted/30 p-3 rounded-lg border border-dashed">
                        {order.shipping_address.address && <p className="font-medium">{order.shipping_address.address}</p>}
                        {(order.shipping_address.area || order.shipping_address.city) && (
                          <p className="text-muted-foreground">
                            {order.shipping_address.area}{order.shipping_address.area && order.shipping_address.city ? ', ' : ''}{order.shipping_address.city}
                          </p>
                        )}
                        {order.shipping_address.instructions && (
                          <p className="mt-2 pt-2 border-t border-muted italic text-xs text-muted-foreground">
                            Note: {order.shipping_address.instructions}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Standard Shipping</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Method:</span>
                      <span className="font-semibold">{order.delivery_method || "Standard Delivery"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="space-y-6">
              <div className="bg-card border rounded-2xl shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                  Order Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>৳{formatPrice(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Total Savings</span>
                      <span>-৳{formatPrice(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Charge</span>
                    <span>৳{formatPrice(order.delivery_charge)}</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-bold">Total Amount</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-primary">
                          ৳{formatPrice(order.total_amount)}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                          VAT Included
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link href="/" className="block">
                    <Button size="lg" className="w-full h-12 rounded-xl font-bold group">
                      Continue Shopping
                      <CheckCircle2 className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-xs text-center text-muted-foreground">
                    {order.customer_email
                      ? "We have received your order. A confirmation email will be sent to your inbox once our team confirms your order. Please check your spam folder if you don't see it then."
                      : "We'll contact you soon via phone/SMS for order verification and confirmation."}
                  </p>
                </div>
              </div>

              {/* Quick Help */}
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Need help? <Link href="/contact" className="text-primary font-semibold hover:underline">Contact Support</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

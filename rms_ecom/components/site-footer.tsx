"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Facebook, Twitter, Instagram, Github, MapPin, Phone, Mail } from "lucide-react"
import { ecommerceApi } from "@/lib/api"

interface HomePageSettings {
  logo_image_url?: string
  logo_text?: string
  footer_tagline?: string
  footer_address?: string
  footer_phone?: string
  footer_email?: string
  footer_facebook_url?: string
  footer_instagram_url?: string
  footer_twitter_url?: string
  footer_github_url?: string
  footer_map_embed_url?: string
}

export function SiteFooter() {
  const [settings, setSettings] = useState<HomePageSettings>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await ecommerceApi.getHomePageSettings()
        setSettings((prev) => ({
          ...prev,
          ...data,
          // Preserve existing logo values if new data doesn't provide them
          logo_image_url: data.logo_image_url ?? prev.logo_image_url,
          logo_text: data.logo_text ?? prev.logo_text,
        }))
      } catch (error) {
        console.error("Failed to fetch home page settings for footer:", error)
      }
    }

    fetchSettings()
  }, [])

  const currentYear = new Date().getFullYear()

  const hasMap = !!settings.footer_map_embed_url

  return (
    <footer className="w-full bg-black text-white border-t border-white/10">
      <div className="container px-4 py-12 lg:py-16">
        <div className="grid gap-10 lg:gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
          {/* Brand and links */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 mb-2">
              {settings.logo_image_url ? (
                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white">
                  <Image
                    src={settings.logo_image_url}
                    alt={settings.logo_text || "Store logo"}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-black font-bold">
                  {(settings.logo_text || "RMS").charAt(0)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xl font-semibold tracking-tight">
                  {settings.logo_text || "Retail Shop"}
                </span>
                <span className="text-sm text-white/70">
                  {settings.footer_tagline || "Modern retail experience, online & in-store."}
                </span>
              </div>
            </Link>

            <div className="space-y-3 text-sm text-white/70">
              {settings.footer_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-white/60" />
                  <p className="whitespace-pre-line">{settings.footer_address}</p>
                </div>
              )}
              {(settings.footer_phone || settings.footer_email) && (
                <div className="space-y-1.5">
                  {settings.footer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-white/60" />
                      <a href={`tel:${settings.footer_phone}`} className="hover:text-white transition-colors">
                        {settings.footer_phone}
                      </a>
                    </div>
                  )}
                  {settings.footer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-white/60" />
                      <a href={`mailto:${settings.footer_email}`} className="hover:text-white transition-colors">
                        {settings.footer_email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {settings.footer_facebook_url && (
                  <Link
                    href={settings.footer_facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="sr-only">Facebook</span>
                  </Link>
                )}
                {settings.footer_instagram_url && (
                  <Link
                    href={settings.footer_instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span className="sr-only">Instagram</span>
                  </Link>
                )}
                {settings.footer_twitter_url && (
                  <Link
                    href={settings.footer_twitter_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="sr-only">Twitter</span>
                  </Link>
                )}
                {settings.footer_github_url && (
                  <Link
                    href={settings.footer_github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
                <div className="space-y-1.5">
                  <p className="font-medium text-white">Store</p>
                  <Link href="/products" className="block hover:text-white transition-colors">
                    All Products
                  </Link>
                  <Link href="/category/men" className="block hover:text-white transition-colors">
                    Men
                  </Link>
                  <Link href="/category/women" className="block hover:text-white transition-colors">
                    Women
                  </Link>
                </div>
                <div className="space-y-1.5">
                  <p className="font-medium text-white">Support</p>
                  <Link href="/cart" className="block hover:text-white transition-colors">
                    Cart & Checkout
                  </Link>
                  <Link href="/checkout" className="block hover:text-white transition-colors">
                    Shipping & Delivery
                  </Link>
                  <Link href="/order-complete" className="block hover:text-white transition-colors">
                    Order Status
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-white/60">
              Visit our store
            </p>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 min-h-[220px] lg:min-h-[260px]">
              {hasMap ? (
               <iframe className="w-full" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3641.769855107538!2d90.56586267216797!3d24.109587640110483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755d50026e8dab7%3A0x293e9aa168441689!2sRAW%20STITCH!5e0!3m2!1sen!2sbd!4v1764396002808!5m2!1sen!2sbd" width="600" height="450" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
                  Map preview will appear here when you add a Google Map embed URL in Home Page Settings.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            © {currentYear} {settings.logo_text || "Retail Shop"}. All rights reserved.
          </p>
          <p className="flex gap-2">
            <span>Powered by</span>
            <span className="font-medium text-white">RMS Ecommerce</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

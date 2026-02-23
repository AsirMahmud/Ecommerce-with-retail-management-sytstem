"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { PromoBanner } from "@/components/promo-banner"
import { HeroSection } from "@/components/hero-section"
import { BrandShowcase } from "@/components/brand-showcase"
import { ProductSection } from "@/components/product-section"
import { FeaturesSection } from "@/components/features-section"
import { NewsletterSection } from "@/components/newsletter-section"
import { SiteFooter } from "@/components/site-footer"
import { ecommerceApi, EcommerceProduct, ProductByColorEntry, ShowcaseResponse, ShowcaseSection } from "@/lib/api"
import { StructuredData } from "@/components/structured-data"
import { generateOrganizationStructuredData, generateWebsiteStructuredData } from "@/lib/seo"
import { useLoading } from "@/hooks/useLoading"

export default function HomePageClient() {
  const [showcaseData, setShowcaseData] = useState<ShowcaseResponse | null>(null);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const fetchShowcaseData = async () => {
      try {
        startLoading();
        // Remove artificial limit to fetch all products according to status
        const data = await ecommerceApi.getShowcase({ limit: 50 });
        setShowcaseData(data);
      } catch (error) {
        console.error('Failed to fetch showcase data:', error);
      } finally {
        stopLoading();
      }
    };

    fetchShowcaseData();
  }, [startLoading, stopLoading]);

  // Transform API data to match component interface
  const toCard = (entry: ProductByColorEntry) => ({
    id: `${entry.product_id}/${entry.color_slug}`,
    name: `${entry.product_name} - ${entry.color_name}`,
    price: Number(entry.product_price),
    rating: 4.5,
    image: entry.cover_image_url || "/placeholder.jpg",
    discountInfo: entry.discount_info,  // Pass backend discount info
  })

  // Get sections as an array, respecting the order from the API
  const getSortedSections = (data: ShowcaseResponse): Array<{ key: string; section: ShowcaseSection }> => {
    return Object.entries(data).map(([key, section]) => ({ key, section }));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <StructuredData data={generateOrganizationStructuredData()} />
      <StructuredData data={generateWebsiteStructuredData()} />
      <PromoBanner />
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <BrandShowcase />
        {showcaseData ? (
          <>
            {getSortedSections(showcaseData).map(({ key, section }, index) => (
              <div key={key}>
                {index > 0 && <div className="container px-4"><hr className="border-border" /></div>}
                {section?.products && section?.name && Array.isArray(section.products) && section.products.length > 0 && (
                  <ColorSection
                    title={section.name.toUpperCase()}
                    baseProducts={section.products}
                    toCard={toCard}
                    statusSlug={key}
                  />
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <ProductSection title="LOADING..." products={[]} isLoading={true} />
            <div className="container px-4"><hr className="border-border" /></div>
            <ProductSection title="LOADING..." products={[]} isLoading={true} />
          </>
        )}
        <FeaturesSection />
        <NewsletterSection />
      </main>
      <SiteFooter />
    </div>
  )
}

function ColorSection({ title, baseProducts, toCard, statusSlug }: {
  title: string;
  baseProducts: EcommerceProduct[];
  toCard: (e: ProductByColorEntry) => { id: string; name: string; price: number; rating: number; image: string };
  statusSlug: string;
}) {
  const [entries, setEntries] = useState<ProductByColorEntry[]>([])
  useEffect(() => {
    const load = async () => {
      try {
        const ids = baseProducts.map(p => p.id)
        if (ids.length === 0) { setEntries([]); return }
        const data = await ecommerceApi.getProductsByColor({ product_ids: ids })
        setEntries(data)
      } catch (e) {
        setEntries([])
      }
    }
    load()
  }, [baseProducts])

  return (
    <ProductSection
      title={title}
      products={entries.map(toCard)}
      viewAllHref={`/products?status=${statusSlug}`}
      isLoading={entries.length === 0}
    />
  )
}


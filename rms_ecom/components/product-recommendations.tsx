import { ProductCard, ProductCardSkeleton } from "@/components/product-card"
import { DiscountInfo } from "@/lib/api"

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  discount?: number
  discountInfo?: DiscountInfo | null
}

interface ProductRecommendationsProps {
  products: Product[]
  isLoading?: boolean
}

export function ProductRecommendations({ products, isLoading = false }: ProductRecommendationsProps) {
  return (
    <section className="container px-4 py-12 lg:py-16">
      <h2 className="text-3xl lg:text-5xl font-bold text-center mb-10 lg:mb-14">YOU MIGHT ALSO LIKE</h2>

      <div className="grid grid-cols-2 gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
      </div>
    </section>
  )
}

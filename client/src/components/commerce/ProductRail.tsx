import { memo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductCard, type ProductCardDensity } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/Skeleton";
import type { ProductCard as ProductCardType } from "@/types";

interface ProductRailProps {
  products?: ProductCardType[];
  isLoading?: boolean;
  density?: ProductCardDensity;
  compact?: boolean;
  limit?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export const ProductRail = memo(function ProductRail({
  products,
  isLoading = false,
  density,
  compact = false,
  limit,
  viewAllHref,
  viewAllLabel = "View all",
}: ProductRailProps) {
  const resolvedDensity = density ?? (compact ? "compact" : "medium");
  // Filter products to only show those with valid primary images
  const validProducts = products?.filter((p) => p.primary_image && p.primary_image.trim()) ?? [];
  const visibleProducts = limit ? validProducts.slice(0, limit) : validProducts;

  if (isLoading) {
    return (
      <div className="product-rail-shell">
        <div className="product-rail no-scrollbar" data-density={resolvedDensity}>
          {Array.from({ length: resolvedDensity === "dense" ? 5 : 4 }).map((_, index) => (
            <div key={index} className="snap-start min-w-0">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!visibleProducts?.length) {
    return null;
  }

  return (
    <div className="product-rail-shell">
      <div className="product-rail no-scrollbar" data-density={resolvedDensity}>
        {visibleProducts.map((product) => (
          <div key={product.product_id} className="snap-start min-w-0">
            <ProductCard product={product} density={resolvedDensity} />
          </div>
        ))}
      </div>

      {viewAllHref ? (
        <div className="mt-4 flex justify-end">
          <Link
            to={viewAllHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition duration-300 hover:text-cyan-200"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
);

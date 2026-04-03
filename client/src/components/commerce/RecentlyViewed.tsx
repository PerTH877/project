import { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/Skeleton";
import { productsService } from "@/services/products";
import { useHistoryStore } from "@/store/historyStore";

interface RecentlyViewedProps {
  /** Exclude a specific product_id from rendering (e.g. the current product page) */
  excludeId?: number;
}

export function RecentlyViewed({ excludeId }: RecentlyViewedProps) {
  const { productIds, initializeHistory } = useHistoryStore();

  useEffect(() => {
    initializeHistory();
  }, [initializeHistory]);

  // Filter out the current product and take the most recent 8
  const idsToShow = productIds
    .filter((id) => id !== excludeId)
    .slice(0, 8);

  // Parallel queries — one per product ID
  const queries = useQueries({
    queries: idsToShow.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => productsService.get(id),
      staleTime: 5 * 60 * 1000, // 5 min — product data rarely changes
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const products = queries
    .filter((q) => q.isSuccess && q.data)
    .map((q) => q.data!.product);

  if (!isLoading && idsToShow.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 border border-cyan-500/30">
          <Clock className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <p className="hud-kicker tracking-widest">Recently Viewed</p>
          <h2 className="display-font mt-1 text-2xl text-white tracking-wide">
            Continue where you left off
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-4 rounded-[24px] border border-white/10 bg-white/[0.03]">
              <Skeleton className="aspect-[16/8.7] w-full rounded-xl bg-white/5" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 bg-white/5" />
                  <Skeleton className="h-6 w-16 bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              density="compact"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

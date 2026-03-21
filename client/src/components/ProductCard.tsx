import { Link } from "react-router-dom";
import { Star, Truck } from "lucide-react";
import type { ProductCard as ProductCardType } from "@/types";
import { cn, formatCurrencyBDT } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SmartImage } from "@/components/media/SmartImage";

export type ProductCardDensity = "medium" | "compact" | "dense";

interface ProductCardProps {
  product: ProductCardType;
  density?: ProductCardDensity;
  compact?: boolean;
}

const densityStyles: Record<
  ProductCardDensity,
  {
    media: string;
    body: string;
    title: string;
    titleMinHeight: string;
    price: string;
  }
> = {
  medium: {
    media: "aspect-[16/9]",
    body: "p-4",
    title: "text-[0.98rem]",
    titleMinHeight: "min-h-[2.7rem]",
    price: "text-[1.45rem]",
  },
  compact: {
    media: "aspect-[16/8.7]",
    body: "p-3.5",
    title: "text-[0.94rem]",
    titleMinHeight: "min-h-[2.55rem]",
    price: "text-[1.26rem]",
  },
  dense: {
    media: "aspect-[16/8.2]",
    body: "p-3",
    title: "text-[0.9rem]",
    titleMinHeight: "min-h-[2.4rem]",
    price: "text-[1.12rem]",
  },
};

export function ProductCard({ product, density, compact = false }: ProductCardProps) {
  const resolvedDensity = density ?? (compact ? "compact" : "medium");
  const ui = densityStyles[resolvedDensity];
  const inStock = product.total_stock > 0;
  const fastDispatch = product.total_stock > 20;
  const stockLabel = fastDispatch
    ? "Fast dispatch"
    : inStock
      ? `Stock ${product.total_stock}`
      : "Out of stock";
  const hasDiscount = product.lowest_price < product.base_price;
  const discountPercent = hasDiscount
    ? Math.max(1, Math.round(((product.base_price - product.lowest_price) / product.base_price) * 100))
    : 0;

  return (
    <Link
      to={`/products/${product.product_id}`}
      className={cn(
        "group deal-card flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] transition duration-300 hover:-translate-y-2"
      )}
    >
      <div className={cn("relative overflow-hidden border-b border-white/8", ui.media)}>
        <SmartImage
          src={product.primary_image}
          alt={product.title}
          className="h-full w-full transition duration-500 group-hover:scale-[1.04] [&>img]:object-cover"
          aspectRatio=""
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(105,246,255,0.12),transparent_34%),linear-gradient(180deg,rgba(7,12,20,0.08),rgba(7,12,20,0.72))]" />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-1.5">
          {product.category_name ? <StatusBadge label={product.category_name} tone="magenta" /> : null}
          {product.seller_verified ? <StatusBadge label="Verified" tone="emerald" /> : null}
        </div>
        {hasDiscount ? (
          <div className="deal-badge absolute right-3 top-3">
            -{discountPercent}%
          </div>
        ) : null}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", ui.body)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {product.brand ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/75 mb-1">{product.brand}</p>
            ) : null}
            <h3
              className={cn(
                "line-clamp-2 min-w-0 font-semibold leading-snug text-white hover:text-cyan-400 transition-colors",
                ui.title,
                ui.titleMinHeight
              )}
            >
              {product.title}
            </h3>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <div className="flex items-center text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span className="ml-1 font-bold">{product.avg_rating.toFixed(1)}</span>
          </div>
          <span className="text-cyan-400/80 hover:underline cursor-pointer">{product.review_count} ratings</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
           <span className={cn("display-font font-bold text-white shadow-sm", ui.price)}>
             {formatCurrencyBDT(product.lowest_price)}
           </span>
           {hasDiscount ? (
             <span className="text-[11px] text-muted-foreground line-through">
               {formatCurrencyBDT(product.base_price)}
             </span>
           ) : null}
        </div>

        <div className="mt-2 text-[11px] text-slate-300">
           Ships from <span className="text-white font-medium">{product.seller_name}</span>
        </div>

        <div className="mt-auto pt-3">
           <div className="inline-flex rounded-sm bg-cyan-500/10 border border-cyan-500/30 px-2 py-1 items-center gap-1.5">
             <Truck className={cn("h-3.5 w-3.5 shrink-0", fastDispatch ? "text-cyan-400" : "text-slate-400")} />
             <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 truncate">{stockLabel}</span>
           </div>
        </div>
      </div>
    </Link>
  );
}

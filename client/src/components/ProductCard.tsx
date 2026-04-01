import { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, Truck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProductCard as ProductCardType, Wishlist } from "@/types";
import { cn, formatCurrencyBDT } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SmartImage } from "@/components/media/SmartImage";
import { wishlistsService } from "@/services/wishlists";
import { useAuthStore } from "@/store/authStore";

export type ProductCardDensity = "medium" | "compact" | "dense";

interface ProductCardProps {
  product: ProductCardType;
  density?: ProductCardDensity;
  compact?: boolean;
  /** Default variant_id to use when adding this product to the wishlist.
   *  If omitted the heart is still shown but requires the product to have
   *  been previously saved (so we can derive the variant_id from cache). */
  variantId?: number;
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

export function ProductCard({ product, density, compact = false, variantId }: ProductCardProps) {
  const resolvedDensity = density ?? (compact ? "compact" : "medium");
  const ui = densityStyles[resolvedDensity];
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

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

  // ─── Wishlist state — derived from query cache (no extra network request) ──
  const cachedWishlists = queryClient.getQueryData<Wishlist[]>(["wishlists"]) ?? [];

  // Find if any wishlist item belongs to this product_id
  let savedWishlistId: number | null = null;
  let savedVariantId: number | null = null;
  for (const wl of cachedWishlists) {
    for (const item of wl.items ?? []) {
      if (item.product.product_id === product.product_id) {
        savedWishlistId = wl.wishlist_id;
        savedVariantId = item.variant_id;
        break;
      }
    }
    if (savedWishlistId !== null) break;
  }
  const isWishlisted = savedWishlistId !== null;

  // Show the heart only when logged in AND (we can add  OR it is already saved)
  const showHeart = !!token && (!!variantId || isWishlisted);

  // ─── Toggle mutation with optimistic update ───────────────────────────────
  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted && savedWishlistId !== null && savedVariantId !== null) {
        // Remove
        return wishlistsService.removeItem(savedWishlistId, savedVariantId);
      }

      // Add — resolve a target wishlist
      let wishlists = queryClient.getQueryData<Wishlist[]>(["wishlists"]) ?? [];
      let targetList = wishlists[0];

      if (!targetList) {
        targetList = await wishlistsService.create("My Wishlist");
        // Seed the cache so the next read is fresh
        queryClient.setQueryData<Wishlist[]>(["wishlists"], [{ ...targetList, items: [] }]);
      }

      return wishlistsService.addItem(targetList.wishlist_id, variantId!);
    },

    // Optimistic toggle: flip the UI immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["wishlists"] });
      const previous = queryClient.getQueryData<Wishlist[]>(["wishlists"]);

      if (isWishlisted && savedWishlistId !== null && savedVariantId !== null) {
        // Optimistically remove the item from cache
        queryClient.setQueryData<Wishlist[]>(["wishlists"], (old) =>
          (old ?? []).map((wl) =>
            wl.wishlist_id === savedWishlistId
              ? { ...wl, items: wl.items.filter((i) => i.variant_id !== savedVariantId) }
              : wl
          )
        );
      }
      // No optimistic add — we don't have full item shape here; we let onSettled refresh

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      // Roll back on failure
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(["wishlists"], ctx.previous);
      }
      toast.error("Could not update wishlist. Please try again.");
    },

    onSuccess: () => {
      toast.success(isWishlisted ? "Removed from wishlist." : "Saved to wishlist.");
    },

    onSettled: () => {
      // Always re-sync from the server so cache is accurate
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
    },
  });

  const handleHeartClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();        // stop Link navigation
    e.stopPropagation();       // stop bubbling
    if (wishlistMutation.isPending) return;
    wishlistMutation.mutate();
  };

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

        {/* ── Stateful wishlist heart ─────────────────────────────────────── */}
        {showHeart && (
          <button
            type="button"
            onClick={handleHeartClick}
            disabled={wishlistMutation.isPending}
            title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className={cn(
              "absolute bottom-3 right-3 flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200",
              "opacity-0 group-hover:opacity-100 focus:opacity-100",
              isWishlisted
                ? "bg-rose-500/25 border-rose-400/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)] opacity-100"
                : "bg-black/60 border-white/15 text-slate-400 hover:border-rose-400/50 hover:text-rose-300",
              wishlistMutation.isPending && "cursor-wait"
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all duration-200",
                isWishlisted ? "fill-current scale-110" : "",
                wishlistMutation.isPending ? "animate-pulse" : ""
              )}
            />
          </button>
        )}
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
            <span className="ml-1 font-bold">{Number(product.avg_rating || 0).toFixed(1)}</span>
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

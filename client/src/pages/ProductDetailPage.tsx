import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, ShieldCheck, Star, Terminal, Truck } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/ProductCard";
import { SmartImage } from "@/components/media/SmartImage";
import { productsService } from "@/services/products";
import { cartService } from "@/services/cart";
import { useAuthStore } from "@/store/authStore";
import { formatCurrencyBDT } from "@/lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.get(Number(id)),
    enabled: !!id,
  });

  const addToCartMutation = useMutation({
    mutationFn: (variantId: number) => cartService.addItem(variantId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-total"] });
      toast.success("Item added to cart.");
    },
    onError: () => toast.error("System rejected cart addition."),
  });

  if (productQuery.isLoading) {
    return <main className="min-h-screen py-8 shell-width"><div className="skeleton h-[600px] w-full mt-10 rounded-2xl" /></main>;
  }

  if (productQuery.isError || !productQuery.data) {
    return <main className="flex items-center justify-center min-h-[50vh]"><p className="neon-text-magenta text-xl font-mono">Entity not found in current subnet.</p></main>;
  }

  const { product, media = [], specifications = [], variants = [], related_products = [] } = productQuery.data;
  const primaryMedia = media.find((m) => m.is_primary)?.media_url || media[0]?.media_url;
  const allImages = Array.from(
    new Set([product.primary_image, primaryMedia, ...media.map((m) => m.media_url)].filter(Boolean))
  ) as string[];
  const mainImage = selectedImage || product.primary_image || primaryMedia || "/placeholder-product.jpg";

  const attributeGroups = variants.reduce<Record<string, string[]>>((acc, variant) => {
    Object.entries(variant.attributes || {}).forEach(([key, value]) => {
      if (!acc[key]) {
        acc[key] = [];
      }
      if (!acc[key].includes(value)) {
        acc[key].push(value);
      }
    });
    return acc;
  }, {});

  const selectedVariant =
    variants.find((variant) =>
      Object.entries(selectedVariants).every(([key, value]) => variant.attributes[key] === value)
    ) ?? variants[0];

  const attributesRequired = Object.keys(attributeGroups).length;
  const selectedVariantReady = attributesRequired === 0 || Object.keys(selectedVariants).length === attributesRequired;
  const displayPrice = product.base_price + Number(selectedVariant?.price_adjustment ?? 0);

  return (
    <main className="shell-width py-8 min-h-screen">
      <nav className="mb-6 flex items-center font-mono text-xs text-cyan-500/80 tracking-widest uppercase">
        <Link to="/" className="hover:text-cyan-400 hover:underline">Nexus</Link>
        <span className="mx-2 opacity-50">&gt;</span>
        <Link to={`/search?category=${product.category_id}`} className="hover:text-cyan-400 hover:underline">{product.category_name}</Link>
        <span className="mx-2 opacity-50">&gt;</span>
        <span className="text-white font-bold truncate max-w-[300px]">{product.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        <div className="w-full lg:w-5/12 self-start flex gap-4">
          {allImages.length > 1 ? (
          <div className="flex flex-col gap-3 w-16 shrink-0 no-scrollbar overflow-y-auto max-h-[540px]">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex items-center justify-center bg-black/50 transition-colors ${mainImage === img ? "border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]" : "border-white/10 hover:border-white/30"}`}
                onClick={() => setSelectedImage(img)}
                onMouseEnter={() => setSelectedImage(img)}
              >
                <img src={img} alt={`Gallery ${idx + 1}`} className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
              </button>
            ))}
          </div>
          ) : null}
          <div className="flex-1 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(105,246,255,0.08),transparent_48%),linear-gradient(180deg,rgba(8,15,26,0.92),rgba(5,8,16,0.96))] p-5 sm:p-7 relative overflow-hidden group min-h-[24rem]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_25%,transparent_75%,rgba(255,255,255,0.02))]" />
            <div className="absolute inset-5 rounded-[24px] border border-white/6 bg-black/10" />
            <div className="relative z-10 flex h-full min-h-[20rem] items-center justify-center">
              <SmartImage
                src={mainImage}
                alt={product.title}
                className="w-full max-w-[34rem] [&>img]:object-contain"
                aspectRatio="aspect-square"
                priority
              />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-4/12 flex flex-col pt-2">
          <h1 className="text-2xl md:text-3xl font-black display-font text-white leading-tight mb-2 tracking-wide">
            {product.title}
          </h1>
          <Link to={`/search?q=${encodeURIComponent(product.seller_name)}`} className="text-sm font-mono text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
            Sold by {product.seller_name}
          </Link>

          <div className="flex items-center gap-2 mb-4 cyber-section-divider pb-4">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(product.avg_rating) || 0) ? "fill-current" : "fill-white/10 text-white/10"}`} />
              ))}
            </div>
            <span className="text-sm font-bold text-cyan-400">{(Number(product.avg_rating) || 0).toFixed(1)}</span>
            <span className="text-sm text-slate-400 ml-1">({product.review_count || 0} reviews)</span>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-mono text-red-400">-15%</span>
              <span className="text-sm font-bold text-slate-400 line-through">{formatCurrencyBDT(product.base_price || Number(product.lowest_price) * 1.15)}</span>
            </div>
            <p className="text-4xl font-black text-white display-font tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              {formatCurrencyBDT(displayPrice)}
            </p>
          </div>

          {Object.keys(attributeGroups).length > 0 ? (
            <div className="space-y-6 mb-8 border-b border-white/10 pb-6">
              {Object.entries(attributeGroups).map(([name, values]) => (
                <div key={name}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 font-mono flex items-center gap-2">
                    <Activity className="w-3 h-3 text-cyan-500" />
                    Configure {name}: <span className="text-white">{selectedVariants[name] || "Select"}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value) => (
                      <button
                        key={value}
                        onClick={() => setSelectedVariants((current) => ({ ...current, [name]: value }))}
                        className={`px-4 py-2 text-sm font-bold rounded border transition-all ${selectedVariants[name] === value ? "bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "bg-black/50 border-white/20 text-slate-300 hover:border-slate-400"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 border-b border-white/10 pb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Overview</h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-prose">
              {product.description}
            </p>
          </div>

          {specifications.length > 0 ? (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Specifications</h3>
              <div className="grid gap-3">
                {specifications.map((spec) => (
                  <div key={spec.spec_id} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
                    <span className="text-slate-400">{spec.spec_key}</span>
                    <span className="text-white">{spec.spec_value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full lg:w-3/12">
          <div className="hud-panel p-6 border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,255,0.08)] sticky top-24">
            <div className="absolute top-0 right-0 p-2 opacity-20"><Terminal className="w-8 h-8 text-cyan-400" /></div>

            <p className="text-3xl font-black text-white display-font mb-4">{formatCurrencyBDT(displayPrice)}</p>

            <div className="flex flex-col gap-2 mb-6">
              <p className="text-sm text-slate-300 leading-snug"><span className="text-cyan-400 font-bold">Fast delivery</span> remains subject to stock and checkout validation.</p>
              <div className="flex items-center gap-2 text-emerald-400 mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-xs font-bold tracking-wide uppercase">
                <Truck className="w-4 h-4" /> Ready for dispatch
              </div>
            </div>

            <p className="text-lg font-bold text-emerald-400 display-font mb-4 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
              {product.total_stock > 0 ? "IN STOCK" : <span className="text-red-400">DEPOT EMPTY</span>}
            </p>

            <div className="flex items-center gap-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">QTY:</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="bg-[#0a0f18] text-white border border-cyan-500/40 rounded px-3 py-1.5 outline-none focus:border-cyan-400 flex-1 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {Array.from({ length: Math.max(1, Math.min(10, product.total_stock || 1)) }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>{index + 1}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={() => selectedVariant && addToCartMutation.mutate(selectedVariant.variant_id)}
                disabled={product.total_stock === 0 || !token || !selectedVariant || !selectedVariantReady}
                className="cyber-button-primary w-full shadow-[0_0_20px_rgba(0,255,255,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="truncate">Add to cart</span> <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/cart")} className="cyber-button-secondary w-full">
                Review cart
              </button>
            </div>

            {!token ? <p className="text-xs text-magenta-400 font-mono mt-2 mb-4 text-center">Authentication required for purchase.</p> : null}
            {token && !selectedVariantReady && Object.keys(attributeGroups).length > 0 ? (
              <p className="text-xs text-amber-300 font-mono mt-2 mb-4 text-center">Select all variant attributes before adding this item.</p>
            ) : null}

            <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-slate-400 font-mono">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span>Ships from</span>
                <span className="text-slate-200 truncate">PARUVO Central Network</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span>Sold by</span>
                <Link to={`/search?q=${encodeURIComponent(product.seller_name)}`} className="text-cyan-400 hover:underline truncate">{product.seller_name}</Link>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span>Returns</span>
                <span className="text-slate-200 truncate flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" />Eligible for Return, Refund or Replacement within 30 days of receipt</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span>Support</span>
                <span className="text-slate-200 truncate">Marketplace support included</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related_products.length > 0 ? (
        <section className="mt-12">
          <div className="mb-6">
            <p className="hud-kicker">Related products</p>
            <h2 className="display-font mt-2 text-2xl text-white">More from similar categories and sellers</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related_products.map((relatedProduct) => (
              <ProductCard key={relatedProduct.product_id} product={relatedProduct} density="compact" />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

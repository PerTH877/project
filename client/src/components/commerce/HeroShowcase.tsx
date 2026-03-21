import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Cpu, Star, Store, Truck, Zap } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SmartImage } from "@/components/media/SmartImage";
import { cn, formatCurrencyBDT } from "@/lib/utils";
import type { ProductCard as ProductCardType } from "@/types";

interface HeroShowcaseProps {
  products?: ProductCardType[];
}

// Cyberpunk corner bracket overlay
function CornerBrackets() {
  return (
    <>
      {/* Top-left */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 h-8 w-8" style={{ borderTop: '2px solid rgba(0,255,255,0.7)', borderLeft: '2px solid rgba(0,255,255,0.7)' }} />
      {/* Top-right */}
      <div className="pointer-events-none absolute right-4 top-4 z-20 h-8 w-8" style={{ borderTop: '2px solid rgba(255,88,214,0.6)', borderRight: '2px solid rgba(255,88,214,0.6)' }} />
      {/* Bottom-left */}
      <div className="pointer-events-none absolute bottom-16 left-4 z-20 h-8 w-8" style={{ borderBottom: '2px solid rgba(255,88,214,0.6)', borderLeft: '2px solid rgba(255,88,214,0.6)' }} />
      {/* Bottom-right */}
      <div className="pointer-events-none absolute bottom-16 right-4 z-20 h-8 w-8" style={{ borderBottom: '2px solid rgba(0,255,255,0.6)', borderRight: '2px solid rgba(0,255,255,0.6)' }} />
    </>
  );
}

export function HeroShowcase({ products = [] }: HeroShowcaseProps) {
  const carouselProducts = useMemo(
    () => products.filter((p) => p.primary_image).slice(0, 5),
    [products]
  );
  // If all products got filtered but we still have some, use them all (SmartImage handles fallback)
  const allProducts = carouselProducts.length > 0 ? carouselProducts : products.slice(0, 5);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [allProducts.length]);

  useEffect(() => {
    if (allProducts.length <= 1 || !isAutoPlaying) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % allProducts.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [allProducts.length, isAutoPlaying]);

  // --- Empty state ---
  if (!allProducts.length) {
    return (
      <div
        className="hero-carousel-shell flex min-h-[32rem] flex-col items-center justify-center gap-6 p-6 text-center sm:min-h-[44rem] rounded-[24px] border border-cyan-400/20"
        style={{ boxShadow: '0 0 60px rgba(0,255,255,0.1), inset 0 0 40px rgba(0,255,255,0.04)' }}
      >
        <CornerBrackets />
        <div className="hero-carousel-grid" />
        <div className="hero-carousel-beam" />

        {/* Standby icon */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative rounded-[24px] border border-cyan-400/30 bg-cyan-400/[0.06] p-5"
            style={{ boxShadow: '0 0 30px rgba(0,255,255,0.15), inset 0 0 20px rgba(0,255,255,0.06)' }}>
            <Cpu className="h-10 w-10 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.6))' }} />
            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400 animate-pulse"
              style={{ boxShadow: '0 0 8px rgba(0,255,255,0.8)' }} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-cyan-400/80 mb-2">
              PARUVO · SYSTEM STANDBY
            </p>
            <h2 className="display-font text-2xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(0,255,255,0.3)' }}>
              Marketplace Feed Loading
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
              Featured products will appear here as the live inventory syncs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[0.3, 0.6, 1].map((delay) => (
              <div key={delay} className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${delay}s`, boxShadow: '0 0 6px rgba(0,255,255,0.7)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeProduct = allProducts[activeIndex];
  const stockLabel =
    activeProduct.total_stock > 20
      ? "In stock · Fast dispatch"
      : activeProduct.total_stock > 0
        ? `${activeProduct.total_stock} units left`
        : "Out of stock";

  const goToPrevious = () => { setActiveIndex((c) => (c - 1 + allProducts.length) % allProducts.length); setIsAutoPlaying(false); };
  const goToNext = () => { setActiveIndex((c) => (c + 1) % allProducts.length); setIsAutoPlaying(false); };
  const goToSlide = (index: number) => { setActiveIndex(index); setIsAutoPlaying(false); };

  const handleTouchStart = (e: React.TouchEvent) => { setTouchStart(e.targetTouches[0].clientX); setIsAutoPlaying(false); };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50) goToNext();
    else if (diff < -50) goToPrevious();
    setTouchStart(null);
    setIsAutoPlaying(true);
  };

  return (
    <div
      className="hero-carousel-shell relative overflow-hidden rounded-[12px] border border-cyan-400/15 shadow-hud transition-all duration-500"
      style={{ boxShadow: '0 0 80px rgba(0,255,255,0.12), inset 0 1px 0 rgba(0,255,255,0.1)' }}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-carousel-grid" />
      <div className="hero-carousel-scanlines" />
      <div className="hero-carousel-beam" />
      <CornerBrackets />

      {/* Slide counter — top right */}
      <div className="absolute right-14 top-4 z-30">
        <div className="inline-flex rounded-full border border-cyan-300/30 bg-black/40 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black tracking-[0.3em] text-cyan-200"
          style={{ fontFamily: 'monospace' }}>
          {String(activeIndex + 1).padStart(2, '0')} / {String(allProducts.length).padStart(2, '0')}
        </div>
      </div>

      {/* Slides */}
      <div className="relative min-h-[32rem] sm:min-h-[46rem]">
        {allProducts.map((product, index) => (
          <Link
            key={product.product_id}
            to={`/products/${product.product_id}`}
            className={cn(
              "hero-carousel-item absolute inset-0 transition-all duration-700 ease-in-out",
              index === activeIndex
                ? "z-10 translate-x-0 opacity-100"
                : "z-0 translate-x-6 opacity-0 pointer-events-none"
            )}
          >
            {/* Image */}
            <div className="absolute inset-0">
              <SmartImage
                src={product.primary_image}
                alt={product.title}
                className="h-full w-full"
                aspectRatio=""
                priority={index === activeIndex || index === (activeIndex + 1) % allProducts.length}
              />
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,14,0.25)_0%,rgba(5,8,14,0.85)_65%,rgba(5,8,14,0.97)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,255,255,0.04),transparent_40%,transparent_60%,rgba(255,88,214,0.04))]" />
              {/* Top neon line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/90 to-transparent" style={{ boxShadow: '0 0 8px rgba(0,255,255,0.5)' }} />
              {/* Bottom neon line */}
              <div className="absolute inset-x-0 bottom-[4.5rem] h-px bg-gradient-to-r from-transparent via-pink-400/70 to-transparent" />
            </div>

            {/* Product info — bottom left */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 sm:pb-14">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {product.category_name ? <StatusBadge label={product.category_name} tone="magenta" /> : null}
                  {product.seller_verified ? <StatusBadge label="Verified" tone="emerald" /> : null}
                </div>

                <h3 className="display-font text-3xl font-black leading-tight text-white sm:text-4xl"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                  {product.title}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <Store className="h-4 w-4 text-cyan-300" />
                    {product.seller_name}
                  </span>
                  <span className="inline-flex items-center gap-2 text-amber-200">
                    <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                    {product.avg_rating.toFixed(1)}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-200/60">From</p>
                    <p className="mt-1 display-font text-4xl font-black text-white sm:text-5xl"
                      style={{ textShadow: '0 0 30px rgba(0,255,255,0.3)' }}>
                      {formatCurrencyBDT(product.lowest_price)}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-[14px] border border-cyan-400/40 bg-black/40 backdrop-blur-sm px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100"
                    style={{ boxShadow: '0 0 12px rgba(0,255,255,0.15)' }}>
                    <Truck className="h-4 w-4 text-cyan-300" />
                    {stockLabel}
                  </div>
                </div>

                {/* View CTA */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-[16px] border border-cyan-400/50 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-200 transition duration-300 hover:border-cyan-300 hover:bg-cyan-400/20 hover:text-white"
                  style={{ backdropFilter: 'blur(12px)', boxShadow: '0 0 20px rgba(0,255,255,0.12)' }}>
                  <Zap className="h-4 w-4" />
                  View product
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-4 p-5 sm:p-7">
        <button
          type="button"
          onClick={goToPrevious}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-black/40 backdrop-blur-sm text-cyan-100 transition-all duration-300 hover:border-cyan-300/70 hover:bg-cyan-400/15 hover:shadow-[0_0_14px_rgba(0,255,255,0.3)]"
          aria-label="Previous product"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {allProducts.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                "transition-all duration-400",
                index === activeIndex
                  ? "h-2 w-10 rounded-full bg-cyan-300"
                  : "h-2 w-2 rounded-full bg-white/25 hover:bg-white/50"
              )}
              style={index === activeIndex ? { boxShadow: '0 0 12px rgba(0,255,255,0.7)' } : undefined}
              aria-label={`Go to product ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNext}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-black/40 backdrop-blur-sm text-cyan-100 transition-all duration-300 hover:border-cyan-300/70 hover:bg-cyan-400/15 hover:shadow-[0_0_14px_rgba(0,255,255,0.3)]"
          aria-label="Next product"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

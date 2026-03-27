import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeals } from "@/services/products";
import { ChevronRight, Zap, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatCurrencyBDT } from "@/lib/utils";
import { SmartImage } from "@/components/media/SmartImage";

const gradients = [
  { from: "from-cyan-500/20", to: "to-blue-600/20" },
  { from: "from-purple-500/20", to: "to-pink-600/20" },
  { from: "from-emerald-500/20", to: "to-teal-600/20" },
  { from: "from-amber-500/20", to: "to-orange-600/20" },
  { from: "from-rose-500/20", to: "to-red-600/20" }
];

const iconColors = [
  "text-cyan-400",
  "text-purple-400",
  "text-emerald-400",
  "text-amber-400",
  "text-rose-400"
];

export function TodaysDealsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<Record<number, string>>({});

  const { data: activeDeals = [], isLoading } = useQuery({ 
    queryKey: ['flash-deals'], 
    queryFn: getDeals 
  });

  const [visibleDeals, setVisibleDeals] = useState<any[]>([]);

  useEffect(() => {
    if (Array.isArray(activeDeals)) {
      setVisibleDeals(activeDeals);
    }
  }, [activeDeals]);

  useEffect(() => {
    if (!visibleDeals || !visibleDeals.length) return;

    const interval = setInterval(() => {
      let updatedVisible = [...visibleDeals];
      const newTimeLeft: Record<number, string> = {};
      const now = Date.now();
      let hasChanges = false;

      for (const deal of updatedVisible) {
        if (!deal.end_time) continue;
        const diff = new Date(deal.end_time).getTime() - now;

        if (diff <= 0) {
          updatedVisible = updatedVisible.filter(d => d.product_id !== deal.product_id);
          hasChanges = true;
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimeLeft[deal.product_id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }

      setTimeLeft(newTimeLeft);
      if (hasChanges) {
        setVisibleDeals(updatedVisible);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visibleDeals]);

  useEffect(() => {
    if (!visibleDeals || visibleDeals.length === 0) return;
    const itemsCount = Math.min(visibleDeals.length, 5);
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % itemsCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [visibleDeals]);

  if (isLoading) {
    return (
      <div className="deals-carousel relative overflow-hidden rounded-[12px] border border-cyan-400/15 p-5 sm:p-6 mb-5 min-h-[400px]">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5">
           <div className="h-10 w-10 rounded-full border-t-2 border-cyan-400 animate-spin" />
           <p className="text-sm font-semibold text-cyan-400/60 uppercase tracking-widest">Loading Live Deals...</p>
        </div>
      </div>
    );
  }

  const safeDeals = Array.isArray(activeDeals) ? activeDeals : [];
  if (!safeDeals.length || !visibleDeals.length) return null;

  const displayProducts = visibleDeals.slice(0, 5);
  const activeProduct = displayProducts[activeIndex] || displayProducts[0];
  
  if (!activeProduct) return null;

  const discountPercentage = activeProduct.discount_percentage || 0;
  const basePrice = Number(activeProduct.base_price) || Number(activeProduct.lowest_price) || 0;
  const savingAmount = Math.round(basePrice * (discountPercentage / 100));
  const discountedPrice = basePrice - savingAmount;

  const stockCount = activeProduct.total_stock || 0;
  const stockText = stockCount < 10 ? `🔥 Only ${stockCount} left!` : `${stockCount} units available`;
  const stockColor = stockCount < 10 ? 'text-rose-500 font-bold' : 'text-orange-400';

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse" />
            <Zap className="relative h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white"
              style={{ textShadow: '0 0 20px rgba(105,246,255,0.4), 0 0 40px rgba(105,246,255,0.15)' }}
            >
              Today&apos;s Lightning Deals
            </h2>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/80 mt-0.5">
              ⚡ Limited time · Auto-rotating every 6s
            </p>
          </div>
        </div>
        <Link
          to="/?sort=price-asc"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)]"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="deals-carousel relative overflow-hidden p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col justify-between lg:col-span-1">
            <Link
              to={`/products/${activeProduct.product_id}`}
              className="relative mb-4 aspect-square overflow-hidden rounded-xl border border-cyan-500/30 bg-black/40 block transition duration-300 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]"
            >
              <SmartImage
                src={activeProduct.primary_image}
                alt={activeProduct.title}
                className="h-full w-full transition duration-700 hover:scale-105"
                aspectRatio=""
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-2 left-2 w-5 h-5" style={{ borderTop: '2px solid rgba(0,255,255,0.7)', borderLeft: '2px solid rgba(0,255,255,0.7)' }} />
              <div className="absolute bottom-2 right-2 w-5 h-5" style={{ borderBottom: '2px solid rgba(255,88,214,0.7)', borderRight: '2px solid rgba(255,88,214,0.7)' }} />
            </Link>

            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Original</p>
                <p className="text-sm text-muted-foreground line-through">{formatCurrencyBDT(basePrice)}</p>
              </div>
              <div className="space-y-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3"
                style={{ boxShadow: '0 0 20px rgba(52,211,153,0.08)' }}>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400">Deal Price</p>
                <p className="text-2xl font-black text-emerald-300">{formatCurrencyBDT(discountedPrice)}</p>
                <p className="text-xs text-emerald-400">Save {formatCurrencyBDT(savingAmount)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="mb-4 inline-block">
                <div className="deal-badge">{discountPercentage}% OFF</div>
              </div>

              <h3 className="shimmer-text mb-2 text-3xl font-black">{activeProduct.deal_name || "Flash Deal Active!"}</h3>
              <p className="mb-3 text-lg font-semibold text-cyan-300">{activeProduct.title}</p>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Limited time offer! Grab this deal before time runs out. Override limits and acquire the hardware you need.
              </p>

              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { icon: Clock, color: 'text-amber-400', label: 'Time Left', value: timeLeft[activeProduct.product_id] || "00:00:00" },
                  { icon: TrendingUp, color: 'text-pink-400', label: 'Claimed', value: `${activeProduct.claimed_percentage || 0}%` },
                  { icon: AlertCircle, color: stockColor, label: 'Stock', value: stockText },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4 shrink-0", color)} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className={cn("text-sm font-bold", color)}>{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link to={`/products/${activeProduct.product_id}`} className="cyber-button-primary flex-1 justify-center">
                Claim Offer Now
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {displayProducts.map((_, idx) => (
            <button
               // eslint-disable-next-line react/no-array-index-key
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeIndex === idx
                  ? "w-8 bg-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.6)]"
                  : "w-2 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Deal ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {displayProducts.map((product, idx) => {
          const gradient = gradients[idx % gradients.length];
          const iconColor = iconColors[idx % iconColors.length];
          
          const itemDiscount = product.discount_percentage || 0;
          const itemBasePrice = Number(product.base_price) || Number(product.lowest_price) || 0;
          const itemDiscounted = itemBasePrice - (itemBasePrice * (itemDiscount / 100));

          return (
            <Link
              key={product.product_id}
              to={`/products/${product.product_id}`}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "deal-card group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all duration-300 block",
                activeIndex === idx
                  ? "border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.35)]"
                  : "border-white/10 hover:border-cyan-400/60"
              )}
            >
              <div className={cn("absolute inset-0 opacity-40 transition duration-300 group-hover:opacity-60 bg-gradient-to-br", gradient.from, gradient.to)} />
              <div className="relative z-10">
                <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-white/10">
                  <SmartImage
                    src={product.primary_image}
                    alt={product.title}
                    className="h-full w-full transition duration-300 group-hover:scale-105"
                    aspectRatio=""
                  />
                </div>
                <div className="space-y-1">
                  <p className="line-clamp-2 text-xs font-semibold text-white">{product.title}</p>
                  <div className="flex items-end justify-between gap-1">
                    <p className={cn("text-sm font-black", iconColor)}>
                      {formatCurrencyBDT(itemDiscounted)}
                    </p>
                    <span className={cn("text-xs font-bold", iconColor)}>{itemDiscount}%↓</span>
                  </div>
                </div>
              </div>
              {activeIndex === idx && (
                <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.8)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

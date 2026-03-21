import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { productsService } from "@/services/products";
import { useAuthStore } from "@/store/authStore";
import { ChevronRight, Star, ChevronLeft } from "lucide-react";

export default function HomePage() {
  const { token } = useAuthStore();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const homeQuery = useQuery({
    queryKey: ["home-feed"],
    queryFn: productsService.home,
  });

  const {
    categories = [],
    featured_products: hero_products = [],
    recently_viewed_products = [],
    trending_products = []
  } = homeQuery.data || {};

  const heroSlides = hero_products?.slice(0, 5) || [];

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  if (homeQuery.isLoading) {
    return (
      <main className="min-h-screen pt-4 shell-width">
        <div className="skeleton h-[400px] w-full rounded-2xl mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[300px] rounded-2xl"></div>)}
        </div>
      </main>
    );
  }

  if (homeQuery.isError || !homeQuery.data) {
    return <main className="flex items-center justify-center min-h-[50vh]"><p className="neon-text-magenta text-xl">System Failure: Could not load Matrix.</p></main>;
  }

  // Combine for horizontal strips
  const rest_catalog = [...recently_viewed_products, ...trending_products];

  const currentHero = heroSlides[currentHeroIndex];

  return (
    <main className="pb-16 bg-background relative overflow-hidden">
      
      {/* 1. Cyberpunk Hero Banner Carousel */}
      <section className="shell-width mt-6 mb-8 relative group">
        <div className="hero-shell h-[320px] md:h-[430px] w-full flex items-center p-8 md:p-16 relative overflow-hidden">
          <div className="hero-grid"></div>
          <div className="hero-scanlines"></div>
          <div className="hero-beam"></div>
          
          {currentHero && (
            <Link to={`/products/${currentHero.product_id}`} className="absolute inset-0 z-0 flex shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] transition-opacity duration-1000 cursor-pointer">
              <img src={currentHero.primary_image || undefined} alt={currentHero.title} className="w-full h-full object-cover opacity-50 mix-blend-screen hover:opacity-75 transition-opacity" />
            </Link>
          )}

          <div className="relative z-10 max-w-2xl pointer-events-none">
            <h2 className="text-4xl md:text-6xl font-black display-font mb-4 text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.8)] leading-tight">
              NEON <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">FRIDAY</span> DEALS
            </h2>
            <p className="text-lg text-slate-300 font-mono mb-8 max-w-md">Override the system limits. Get premium gear with Next-Day Warehouse Delivery.</p>
          </div>
          
          <div className="absolute z-20 bottom-8 left-0 right-0 flex justify-center gap-2 pointer-events-auto">
            {heroSlides.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentHeroIndex(idx)} className={`w-3 h-3 rounded-full transition-all ${idx === currentHeroIndex ? 'bg-cyan-400 shadow-[0_0_10px_#00FFFF]' : 'bg-white/30 hover:bg-white/60'}`} />
            ))}
          </div>

          {/* Nav Buttons */}
          <button onClick={() => setCurrentHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-cyan-500/30 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] pointer-events-auto">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={() => setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 border border-cyan-500/30 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:shadow-[0_0_15px_rgba(0,255,255,0.5)] pointer-events-auto">
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* 2. Amazon Square Category Cards (4-grid layout) */}
      <section className="shell-width grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14 relative z-10">
        {categories?.slice(0, 4).map(category => (
          <article key={category.category_id} className="hud-panel p-6 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300">
            <h3 className="text-xl font-bold text-white mb-4 display-font">{category.name}</h3>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-4 group relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none"></div>
              <Link to={`/search?category=${category.category_id}`}>
                <img src={category.sample_image || "/placeholder-cat.jpg"} alt={category.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 mix-blend-lighten opacity-80" />
              </Link>
            </div>
            <Link to={`/search?category=${category.category_id}`} className="text-cyan-400 font-semibold hover:text-cyan-300 flex items-center group text-sm">
              Initialize search <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </article>
        ))}

        {/* Auth nudge card for anonymous users */}
        {!token && (
          <article className="hud-panel p-6 flex flex-col h-full justify-between items-center text-center">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 display-font">System Access Required</h3>
              <p className="text-sm text-slate-400 mb-6">Sign in for personalized neural net recommendations.</p>
            </div>
            <Link to="/login" className="w-full"><button className="cyber-button-primary w-full py-3">Sign in securely</button></Link>
          </article>
        )}
      </section>

      {/* 3. Horizontal Promotional Strips (Carousels) */}
      <div className="space-y-12 shell-width">
        <section className="relative">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white display-font">Inspired by your browsing history</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar snap-x">
            {rest_catalog?.slice(0, 8).map(prod => (
               <article key={prod.product_id} className="deal-card min-w-[200px] w-[200px] p-4 flex flex-col flex-shrink-0 snap-start bg-[#060913] hover:bg-[#0a0f1c] transition-colors">
                 <Link to={`/products/${prod.product_id}`} className="flex flex-col h-full">
                   <div className="h-32 mb-4 rounded-lg bg-black/50 flex items-center justify-center p-2 border border-white/5">
                     <img src={prod.primary_image || undefined} alt={prod.title} className="max-h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                   </div>
                   <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2 flex-1 hover:text-cyan-400 transition-colors">{prod.title}</p>
                   <div className="flex items-center text-amber-400 mb-2">
                     <Star className="w-3 h-3 fill-current mr-1" />
                     <span className="text-xs font-mono">{prod.avg_rating.toFixed(1)}</span>
                   </div>
                   <p className="text-lg font-bold text-cyan-400 display-font mt-auto"><span className="text-xs text-slate-500 mr-1">BDT</span>{prod.lowest_price}</p>
                 </Link>
               </article>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white display-font bg-clip-text text-transparent bg-gradient-to-r from-magenta-400 to-violet-400">Related to items you've viewed</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-magenta-500/30 to-transparent"></div>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar snap-x">
            {rest_catalog?.slice(8, 16).map(prod => (
               <article key={prod.product_id} className="hud-panel min-w-[200px] w-[200px] p-4 flex flex-col flex-shrink-0 snap-start hover:border-magenta-500/50 transition-colors">
                 <Link to={`/products/${prod.product_id}`} className="flex flex-col h-full">
                   <div className="h-32 mb-4 rounded-lg bg-black/30 flex items-center justify-center p-2">
                     <img src={prod.primary_image || undefined} alt={prod.title} className="max-h-full object-contain" />
                   </div>
                   <p className="text-sm font-medium text-slate-300 line-clamp-2 mb-2 flex-1 hover:text-magenta-400 transition-colors">{prod.title}</p>
                   <p className="text-lg font-bold text-white display-font mt-auto"><span className="text-xs text-slate-500 mr-1">BDT</span>{prod.lowest_price}</p>
                 </Link>
               </article>
            ))}
          </div>
        </section>

        <section className="relative deals-carousel p-8 mb-8">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-3xl font-black text-white display-font flex items-center gap-3">
                <span className="deal-badge text-sm py-1 px-3">Top Rated</span>
                BEST SELLERS
              </h2>
              <p className="text-slate-400 mt-2 font-mono text-sm">Most acquired hardware in the last 24 cycles.</p>
            </div>
            <Link to="/search" className="text-cyan-400 hover:text-cyan-300 font-bold text-sm hidden sm:block">View all rankings</Link>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar snap-x relative z-10">
            {hero_products?.map((prod, idx) => (
               <article key={prod.product_id} className="bg-[#050810]/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl min-w-[240px] w-[240px] p-5 flex flex-col flex-shrink-0 snap-start hover:-translate-y-2 hover:border-cyan-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-bold display-font flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                   #{idx + 1}
                 </div>
                 <Link to={`/products/${prod.product_id}`} className="flex flex-col h-full pt-6">
                   <div className="h-40 mb-4 flex items-center justify-center">
                     <img src={prod.primary_image || undefined} alt={prod.title} className="max-h-full object-contain drop-shadow-[0_10px_15px_rgba(0,255,255,0.15)] group-hover:scale-110 transition-transform duration-500" />
                   </div>
                   <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-3 flex-1">{prod.title}</p>
                   <div className="flex items-end justify-between mt-auto">
                     <p className="text-xl font-bold text-white display-font tracking-tight"><span className="text-sm text-cyan-500/70 font-mono mr-1">BDT</span>{prod.lowest_price}</p>
                     <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                       <ChevronRight className="w-5 h-5" />
                     </div>
                   </div>
                 </Link>
               </article>
            ))}
          </div>
        </section>
      </div>

      {/* 4. Bottom Sign In Footer Ribbon */}
      {!token && (
        <section className="mt-16 w-full py-10 bg-[#060913] border-y border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05)_0%,transparent_100%)]"></div>
          <div className="flex flex-col items-center justify-center relative z-10 gap-4">
            <p className="text-sm font-bold text-white uppercase tracking-widest text-[#00FFFF] border-b border-[#00FFFF]/30 pb-2">See personalized recommendations</p>
            <Link to="/login" className="w-[250px]"><button className="cyber-button-primary w-full shadow-[0_0_20px_rgba(0,255,255,0.2)]">Authenticate</button></Link>
            <p className="text-xs text-slate-400 font-mono">New user? <Link to="/register" className="text-magenta-400 hover:text-magenta-300 hover:underline">Initialize account sequence.</Link></p>
          </div>
        </section>
      )}

    </main>
  );
}

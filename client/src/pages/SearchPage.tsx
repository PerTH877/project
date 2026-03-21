import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, PackageX, SlidersHorizontal, Terminal } from "lucide-react";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { ProductCard } from "@/components/ProductCard";
import { productsService } from "@/services/products";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("q") || "";
  const categoryFromUrl = searchParams.get("category");
  const pageFromUrl = Number(searchParams.get("page") || 1);

  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(categoryFromUrl ? Number(categoryFromUrl) : null);
  const [selectedBrand, setSelectedBrand] = useState("");

  const deferredSearch = useDeferredValue(searchFromUrl);
  const effectiveSearch = [deferredSearch, selectedBrand].filter(Boolean).join(" ").trim();

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchFromUrl) {
      next.set("q", searchFromUrl);
    }
    if (selectedCategory) {
      next.set("category", String(selectedCategory));
    }
    if (page > 1) {
      next.set("page", String(page));
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [page, searchFromUrl, searchParams, selectedCategory, setSearchParams]);

  const homeQuery = useQuery({
    queryKey: ["home-feed"],
    queryFn: productsService.home,
  });

  const productsQuery = useQuery({
    queryKey: ["products", { effectiveSearch, selectedCategory, maxPrice, minPrice, minRating, inStock, sort, page }],
    queryFn: () =>
      productsService.list({
        page,
        page_size: 16,
        search: effectiveSearch || undefined,
        category_id: selectedCategory,
        min_price: minPrice === "" ? null : minPrice,
        max_price: maxPrice === "" ? null : maxPrice,
        min_rating: minRating === "" ? null : minRating,
        in_stock: inStock ? true : undefined,
        sort,
      }),
  });

  const products = productsQuery.data?.products || [];
  const pagination = productsQuery.data?.pagination;
  const categoryOptions = homeQuery.data?.categories || [];

  return (
    <main className="shell-width py-8 flex flex-col md:flex-row gap-8 items-start min-h-screen">
      <aside className="w-full md:w-[260px] flex-shrink-0 space-y-6 sticky top-24">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/30">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold display-font text-white uppercase tracking-widest">Filters</h2>
        </div>

        <section className="hud-panel p-5">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 tracking-wide">Department</h3>
          <ul className="space-y-2.5">
            <li>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setPage(1);
                }}
                className={`text-sm w-full text-left transition-colors font-mono ${selectedCategory === null ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                &gt; All Departments
              </button>
            </li>
            {categoryOptions.map((cat) => (
              <li key={cat.category_id}>
                <button
                  onClick={() => {
                    setSelectedCategory(cat.category_id);
                    setPage(1);
                  }}
                  className={`text-sm w-full text-left transition-colors font-mono flex justify-between ${selectedCategory === cat.category_id ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-white"}`}
                >
                  <span className="truncate pr-2">{selectedCategory === cat.category_id ? "> " : ""}{cat.name}</span>
                  <span className="text-slate-600">[{cat.product_count}]</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="hud-panel p-5">
          <h3 className="text-sm font-bold text-magenta-400 mb-3 tracking-wide">Customer Reviews</h3>
          <ul className="space-y-3">
            {[4, 3, 2, 1].map((stars) => (
              <li key={stars}>
                <button
                  onClick={() => {
                    setMinRating(stars);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1 text-sm transition-opacity group ${minRating === stars ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                >
                  <div className="flex text-amber-400">{`${"★".repeat(stars)}${"☆".repeat(5 - stars)}`}</div>
                  <span className={`ml-2 font-mono ${minRating === stars ? "text-magenta-400 font-bold" : "text-white"}`}>& Up</span>
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => {
                  setMinRating("");
                  setPage(1);
                }}
                className={`text-sm font-mono transition-colors mt-2 ${minRating === "" ? "text-magenta-400 font-bold" : "text-slate-400 hover:text-white"}`}
              >
                {minRating === "" ? "> " : ""}Any Rating
              </button>
            </li>
          </ul>
        </section>

        <section className="hud-panel p-5">
          <h3 className="text-sm font-bold text-violet-400 mb-3 tracking-wide">Featured Brands</h3>
          <ul className="space-y-2">
            {["Samsung", "Apple", "Sony", "Logitech"].map((brand) => (
              <li key={brand}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-[#060810] group-hover:border-violet-400/50 transition-colors">
                    <input
                      type="checkbox"
                      className="opacity-0 absolute inset-0 z-10 cursor-pointer"
                      checked={selectedBrand === brand}
                      onChange={(e) => {
                        setSelectedBrand(e.target.checked ? brand : "");
                        setPage(1);
                      }}
                    />
                    {selectedBrand === brand ? <div className="w-2.5 h-2.5 bg-violet-400 rounded-[2px] shadow-[0_0_8px_rgba(139,92,246,0.8)]" /> : null}
                  </div>
                  <span className={`text-sm font-mono ${selectedBrand === brand ? "text-white font-bold" : "text-slate-400"}`}>{brand}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="hud-panel p-5">
          <h3 className="text-sm font-bold text-emerald-400 mb-3 tracking-wide">Price Range</h3>
          <ul className="space-y-2 mb-4">
            {[
              { label: "Under BDT 500", min: "" as const, max: 500 as const },
              { label: "BDT 500 to 1000", min: 500 as const, max: 1000 as const },
              { label: "BDT 1000 to 5000", min: 1000 as const, max: 5000 as const },
              { label: "Over BDT 5000", min: 5000 as const, max: "" as const },
            ].map((range) => (
              <li key={range.label}>
                <button
                  onClick={() => {
                    setMinPrice(range.min);
                    setMaxPrice(range.max);
                    setPage(1);
                  }}
                  className={`text-sm font-mono transition-colors text-left w-full ${minPrice === range.min && maxPrice === range.max ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-white"}`}
                >
                  {minPrice === range.min && maxPrice === range.max ? "> " : ""}{range.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#030408] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#030408] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
            <button onClick={() => setPage(1)} className="bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 rounded-md px-3 py-1.5 text-sm font-bold transition-colors">
              Go
            </button>
          </div>
        </section>

        <section className="hud-panel p-5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-[#060810] group-hover:border-cyan-400/50 transition-colors">
              <input
                type="checkbox"
                className="opacity-0 absolute inset-0 z-10 cursor-pointer"
                checked={inStock}
                onChange={(e) => {
                  setInStock(e.target.checked);
                  setPage(1);
                }}
              />
              {inStock ? <div className="w-2.5 h-2.5 bg-cyan-400 rounded-[2px] shadow-[0_0_8px_rgba(0,255,255,0.8)]" /> : null}
            </div>
            <span className={`text-sm font-mono ${inStock ? "text-white font-bold" : "text-slate-400"}`}>Exclude Out of Stock</span>
          </label>
        </section>
      </aside>

      <article className="flex-1 min-w-0">
        <header className="hud-panel p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-500" />
              {searchFromUrl ? `Results for "${searchFromUrl}"` : "All Hardware Inventory"}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1 ml-7">
              {pagination ? `SYS.QUERY: ${(pagination.page - 1) * 16 + 1}-${Math.min(pagination.page * 16, pagination.total)} of ${pagination.total} records` : "STATUS: Initializing..."}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-3">Sort Engine:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-sm font-bold text-cyan-400 pl-2 pr-8 py-2 appearance-none outline-none cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
              >
                <option className="bg-[#050810] text-white" value="popular">Featured Matrix</option>
                <option className="bg-[#050810] text-white" value="price-asc">Price (Low-High)</option>
                <option className="bg-[#050810] text-white" value="price-desc">Price (High-Low)</option>
                <option className="bg-[#050810] text-white" value="rating">Avg. Rating Logs</option>
                <option className="bg-[#050810] text-white" value="newest">Latest Deploys</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-transparent border-t-cyan-400" />
              </div>
            </div>
          </div>
        </header>

        {productsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="hud-panel p-16 flex flex-col items-center justify-center text-center border-dashed border-red-500/30">
            <PackageX className="w-16 h-16 text-red-500 mb-4 opacity-70" />
            <h2 className="text-2xl font-bold text-white mb-2 display-font">Zero Records Found</h2>
            <p className="text-slate-400 max-w-md font-mono text-sm leading-relaxed">
              No entities match the current parameters. Try broadening the search or relaxing a filter.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.product_id} product={product} density="compact" />
              ))}
            </div>

            {pagination && pagination.total_pages > 1 ? (
              <nav className="mt-12 flex items-center justify-center gap-4">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => {
                    setPage((current) => current - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="cyber-button-secondary py-2 px-4 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> REVERSE
                </button>
                <div className="hud-panel px-6 py-2">
                  <span className="font-mono text-sm text-cyan-400">
                    BLOCK <span className="font-bold text-white text-lg">{pagination.page}</span> OF {pagination.total_pages}
                  </span>
                </div>
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => {
                    setPage((current) => current + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="cyber-button-secondary py-2 px-4 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                >
                  FORWARD <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            ) : null}
          </div>
        )}
      </article>
    </main>
  );
}

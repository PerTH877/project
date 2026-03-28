import { FormEvent, useState, useDeferredValue } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cartService } from "@/services/cart";
import { productsService } from "@/services/products";
import { useAuthStore } from "@/store/authStore";
import { Search, ShoppingCart, Menu, Zap } from "lucide-react";
import { ParuvoLogo } from "@/components/branding/ParuvoLogo";

export function Navbar() {
  const { token, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  
  const deferredSearch = useDeferredValue(searchValue);

  const suggestQuery = useQuery({
    queryKey: ["suggest", deferredSearch, categoryId],
    queryFn: () => productsService.list({ 
      search: deferredSearch, 
      category_id: categoryId ? Number(categoryId) : undefined, 
      page_size: 6 
    }),
    enabled: deferredSearch.trim().length > 1,
  });

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: cartService.getItems,
    enabled: !!token && role === "user",
  });

  const cartTotal = cartQuery.data?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = searchValue.trim();
    let query = value ? `?q=${encodeURIComponent(value)}` : "?";
    if (categoryId) query += `&category=${categoryId}`;
    navigate(value || categoryId ? `/search${query}` : "/");
    setIsFocused(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="w-full">
      <div className="sticky top-0 z-[100] border-b border-cyan-500/30 bg-[#050810]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,255,255,0.1)]">
      {/* Top Nav Array - Amazon Style Header */}
      <div className="flex h-16 items-center flex-wrap px-4 gap-4 max-w-[1600px] mx-auto">
        
        {/* Amazon Logo Area */}
        <Link to="/" className="flex shrink-0 items-center justify-center rounded-sm hover:outline hover:outline-1 hover:outline-cyan-400 p-1 transition-all">
          <ParuvoLogo compact className="scale-75 origin-left" />
        </Link>
        

        {/* Search Bar (Auto-Suggest enabled) */}
        <form onSubmit={submitSearch} className="flex-1 flex min-w-[300px] h-10 group relative rounded-md overflow-visible">
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-full bg-slate-800 text-slate-300 text-xs px-2 border-r border-slate-600 outline-none rounded-l-md appearance-none hover:bg-slate-700 cursor-pointer w-auto max-w-[150px]"
          >
            <option value="">All</option>
            <option value="1">Electronics</option>
            <option value="2">Fashion</option>
            <option value="3">Home & Kitchen</option>
          </select>
          <div className="relative flex-1 group-focus-within:ring-2 group-focus-within:ring-cyan-400 transition-all rounded-r-md">
            <input
              type="text"
              placeholder="Search PARUVO catalog"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              autoComplete="off"
              className="w-full h-full bg-white text-black px-3 outline-none"
            />
            {/* Amazon-style Search Auto-suggest Dropdown with Cyberpunk flair */}
            {isFocused && deferredSearch.trim().length > 1 && suggestQuery.data && (
              <div className="absolute top-[105%] left-0 w-full bg-background border border-cyan-500/50 shadow-[0_10px_40px_rgba(0,255,255,0.15)] rounded-md overflow-hidden z-[9999]">
                <ul className="py-2">
                  {suggestQuery.data.products.map(product => (
                    <li key={product.product_id}>
                      <button 
                        type="button" 
                        onMouseDown={() => {
                          setSearchValue(product.title);
                          navigate(`/products/${product.product_id}`);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors flex items-center gap-2"
                      >
                        <Search className="w-4 h-4 opacity-50" />
                        <span className="font-semibold text-slate-200 line-clamp-1">{product.title}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap ml-auto bg-slate-800 px-2 rounded-full">{product.category_name}</span>
                      </button>
                    </li>
                  ))}
                  {suggestQuery.data.products.length === 0 && (
                    <li className="px-4 py-3 text-slate-400 text-sm">No suggestions found for "{deferredSearch}"</li>
                  )}
                </ul>
              </div>
            )}
            <button type="submit" className="absolute right-0 top-0 h-full w-12 bg-cyan-500 flex items-center justify-center rounded-r-md hover:bg-cyan-400 transition-colors">
              <Search className="text-black font-bold w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Account & Links */}
        <div className="flex shrink-0 items-center gap-1">
          {!token ? (
            <Link to="/login" className="px-3 py-2 hover:outline hover:outline-1 hover:outline-cyan-400 rounded-sm flex flex-col items-start justify-center transition-all">
              <span className="text-[11px] text-slate-300 leading-tight">Hello, sign in</span>
              <span className="text-sm font-bold text-white leading-tight">Account & Lists</span>
            </Link>
          ) : (
            <div className="group relative px-3 py-2 hover:outline hover:outline-1 hover:outline-cyan-400 rounded-sm flex flex-col items-start justify-center transition-all cursor-pointer">
              <span className="text-[11px] text-slate-300 leading-tight">Hello, User</span>
              <span className="text-sm font-bold text-white leading-tight flex items-center gap-1">Account & Lists</span>
              
              {/* Account Dropdown */}
              <div className="absolute top-[100%] right-0 mt-1 w-64 bg-background border border-cyan-500/30 rounded-lg shadow-2xl p-4 hidden group-hover:block z-50 before:content-[''] before:absolute before:-top-2 before:right-8 before:border-8 before:border-transparent before:border-b-background">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-white mb-2 pb-1 border-b border-white/10">Your Lists</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li><Link to="/wishlists" className="hover:text-cyan-400 hover:underline">Saved items</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2 pb-1 border-b border-white/10">Your Account</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li><Link to="/account" className="hover:text-cyan-400 hover:underline">Account</Link></li>
                      {role === "user" && <li><Link to="/orders" className="hover:text-cyan-400 hover:underline">Orders</Link></li>}
                      {role === "seller" && <li><Link to="/seller/dashboard" className="hover:text-cyan-400 hover:underline">Seller Hub</Link></li>}
                      {role === "admin" && <li><Link to="/admin/dashboard" className="hover:text-cyan-400 hover:underline">Admin Panel</Link></li>}
                      <li><button onClick={handleLogout} className="hover:text-magenta-400 hover:underline text-left">Sign Out</button></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Link to="/orders" className="hidden lg:flex px-3 py-2 hover:outline hover:outline-1 hover:outline-cyan-400 rounded-sm flex-col items-start justify-center transition-all">
             <span className="text-[11px] text-slate-300 leading-tight">Returns</span>
             <span className="text-sm font-bold text-white leading-tight">& Orders</span>
          </Link>

          <Link to="/cart" className="flex items-end px-3 py-1 hover:outline hover:outline-1 hover:outline-cyan-400 rounded-sm transition-all relative">
            <div className="relative">
              <ShoppingCart className="w-8 h-8 text-cyan-400" strokeWidth={1.5} />
              <span className="absolute -top-1 left-3 text-cyan-400 font-bold text-sm h-5 w-5 flex items-center justify-center bg-background rounded-full">
                {cartTotal}
              </span>
            </div>
            <span className="text-sm font-bold text-white mb-1.5 hidden sm:inline ml-1">Cart</span>
          </Link>
        </div>
      </div>
      <div className="navbar-neon-line w-full"></div>
      </div>

      {/* Bottom Nav Strip - Mega Menu Placeholder */}
      <nav className="h-10 bg-[#0a0f18] flex items-center px-4 gap-4 text-sm font-medium text-slate-200 overflow-x-auto no-scrollbar border-b border-white/5">
        <Link to="/search" className="flex items-center gap-1 hover:outline hover:outline-1 hover:outline-cyan-400 px-2 py-1 rounded-sm whitespace-nowrap transition-all">
          <Menu className="w-5 h-5" />
          All
        </Link>
        <Link to="/deals" className="hover:outline hover:outline-1 hover:outline-cyan-400 px-2 py-1 rounded-sm whitespace-nowrap transition-all">Today's Deals</Link>
        <Link to="/support" className="hover:outline hover:outline-1 hover:outline-cyan-400 px-2 py-1 rounded-sm whitespace-nowrap transition-all">Customer Service</Link>
        <Link to="/wishlists" className="hover:outline hover:outline-1 hover:outline-cyan-400 px-2 py-1 rounded-sm whitespace-nowrap transition-all">Registry & Saved</Link>
        <Link to="/seller/register" className="hover:outline hover:outline-1 hover:outline-cyan-400 px-2 py-1 rounded-sm whitespace-nowrap transition-all hidden md:block">Sell</Link>
      </nav>
    </header>
  );
}

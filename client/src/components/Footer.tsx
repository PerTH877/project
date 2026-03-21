import { Link } from "react-router-dom";
import { ParuvoLogo } from "@/components/branding/ParuvoLogo";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto border-t border-cyan-500/20 bg-[#050810] shadow-[0_-10px_40px_rgba(0,255,255,0.05)] relative overflow-hidden">
      {/* Cyberpunk Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_4px]"></div>

      <button 
        onClick={scrollToTop} 
        className="w-full py-4 bg-[#0a0f1a] hover:bg-[#111827] text-cyan-400 text-sm font-bold border-y border-white/10 cursor-pointer transition-colors backdrop-blur-md relative z-10"
      >
        <span className="shimmer-text tracking-widest uppercase">Back to top</span>
      </button>

      <div className="bg-[#04060d] text-white py-12 px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1200px] mx-auto shell-width">
          
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-cyan-500/20 inline-block pb-1">Get to Know Us</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">Careers</Link></li>
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">Blog</Link></li>
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">About PARUVO</Link></li>
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">Investor Relations</Link></li>
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">Devices</Link></li>
              <li><Link to="/about" className="hover:text-cyan-400 hover:underline transition-colors block">Science</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-magenta-500/20 inline-block pb-1">Make Money with Us</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/seller/register" className="hover:text-magenta-400 hover:underline transition-colors block">Sell products on PARUVO</Link></li>
              <li><Link to="/seller/register" className="hover:text-magenta-400 hover:underline transition-colors block">Sell on Business</Link></li>
              <li><Link to="/seller/register" className="hover:text-magenta-400 hover:underline transition-colors block">Sell apps</Link></li>
              <li><Link to="/seller/register" className="hover:text-magenta-400 hover:underline transition-colors block">Become an Affiliate</Link></li>
              <li><Link to="/seller/register" className="hover:text-magenta-400 hover:underline transition-colors block">Host an Hub</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-emerald-500/20 inline-block pb-1">Payment Products</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/account" className="hover:text-emerald-400 hover:underline transition-colors block">Business Card</Link></li>
              <li><Link to="/account" className="hover:text-emerald-400 hover:underline transition-colors block">Shop with Points</Link></li>
              <li><Link to="/account" className="hover:text-emerald-400 hover:underline transition-colors block">Reload Your Balance</Link></li>
              <li><Link to="/account" className="hover:text-emerald-400 hover:underline transition-colors block">Currency Converter</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-violet-500/20 inline-block pb-1">Let Us Help You</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/covid" className="hover:text-violet-400 hover:underline transition-colors block">PARUVO and COVID-19</Link></li>
              <li><Link to="/account" className="hover:text-violet-400 hover:underline transition-colors block">Your Account</Link></li>
              <li><Link to="/orders" className="hover:text-violet-400 hover:underline transition-colors block">Your Orders</Link></li>
              <li><Link to="/shipping" className="hover:text-violet-400 hover:underline transition-colors block">Shipping Rates & Policies</Link></li>
              <li><Link to="/returns" className="hover:text-violet-400 hover:underline transition-colors block">Returns & Replacements</Link></li>
              <li><Link to="/account" className="hover:text-violet-400 hover:underline transition-colors block">Manage Content</Link></li>
              <li><Link to="/help" className="hover:text-violet-400 hover:underline transition-colors block">Help</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 mt-12 pt-10 text-center flex flex-col items-center gap-6">
          <ParuvoLogo />
          <div className="flex flex-wrap justify-center gap-4">
            <button className="flex items-center gap-2 bg-transparent text-slate-300 border border-slate-600 hover:border-cyan-400 hover:text-cyan-400 px-3 py-1.5 rounded transition-colors text-sm">
              English
            </button>
            <button className="flex items-center gap-2 bg-transparent text-slate-300 border border-slate-600 hover:border-cyan-400 hover:text-cyan-400 px-3 py-1.5 rounded transition-colors text-sm">
              <span className="font-mono text-cyan-400">$</span> USD - U.S. Dollar
            </button>
            <button className="flex items-center gap-2 bg-transparent text-slate-300 border border-slate-600 hover:border-cyan-400 hover:text-cyan-400 px-3 py-1.5 rounded transition-colors text-sm">
              United States
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-[#020408] text-slate-400 py-8 text-center text-xs relative z-10 border-t border-black">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-4">
          <Link to="/" className="hover:text-cyan-400 hover:underline">Conditions of Use</Link>
          <Link to="/" className="hover:text-cyan-400 hover:underline">Privacy Notice</Link>
          <Link to="/" className="hover:text-cyan-400 hover:underline">Consumer Health Data Privacy Disclosure</Link>
          <Link to="/" className="hover:text-cyan-400 hover:underline">Your Ads Privacy Choices</Link>
        </div>
        <p className="font-mono">© 1996-{new Date().getFullYear()}, PARUVO.com, Inc. or its affiliates. Designed with Cyberpunk Subroutines.</p>
      </div>
    </footer>
  );
}

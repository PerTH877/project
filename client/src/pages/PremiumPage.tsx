import { PricingCards } from "@/components/subscriptions/PricingCards";

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-[#050810] py-16 px-4">
      <div className="text-center max-w-3xl mx-auto mb-16 px-4">
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
          Choose Your <span className="text-amber-400">Paruvo Plan</span>
        </h1>
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Unlock exclusive features, faster fulfillment, and a completely ad-free experience. Step into the future of shopping.
        </p>
      </div>
      
      <PricingCards />
    </div>
  );
}

import { TodaysDealsSection } from "@/components/commerce/TodaysDealsSection";

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-[#050810] py-12 px-4 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      <div className="max-w-[1600px] mx-auto mb-12 border-b border-cyan-500/20 pb-6">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wide flex flex-col pt-4">
          <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.4)] block mb-1">Cyber Drop</span>
          Today's Deals
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">Limited time offers. Quantities restricted. Secure your hardware now.</p>
      </div>
      
      <div className="max-w-[1600px] mx-auto">
        <TodaysDealsSection />
      </div>
    </div>
  );
}

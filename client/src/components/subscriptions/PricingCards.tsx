import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionsService } from "@/services/subscriptions";
import { Check, Loader2, Zap } from "lucide-react";

export function PricingCards() {
  const queryClient = useQueryClient();
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: subscriptionsService.getPlans,
  });

  const { data: activePlan } = useQuery({
    queryKey: ["activeSubscription"],
    queryFn: subscriptionsService.getActivePlan,
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: number) => subscriptionsService.subscribe(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSubscription"] });
      setLoadingPlanId(null);
    },
    onError: () => {
      setLoadingPlanId(null);
      alert("Failed to subscribe. Please try again.");
    },
  });

  const handleSubscribe = (planId: number) => {
    setLoadingPlanId(planId);
    subscribeMutation.mutate(planId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 w-full max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-slate-800/50 h-[400px] rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.05)]"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 w-full max-w-6xl mx-auto">
      {plans?.map((plan) => {
        let featuresList = plan.features;
        if (typeof featuresList === "string") {
            try { featuresList = JSON.parse(featuresList); } catch { featuresList = []; }
        }
        if (!Array.isArray(featuresList) || featuresList.length === 0) {
            featuresList = ["Ad-free experience", "Faster delivery", "Premium support"]; // Default mock
        }

        const isActive = activePlan?.plan_id === plan.plan_id && activePlan?.status === "active";
        const isSubscribing = loadingPlanId === plan.plan_id;

        return (
          <div
            key={plan.plan_id}
            className={`relative flex flex-col p-8 rounded-2xl backdrop-blur-md bg-[#050810]/80 border transition-all duration-300 hover:-translate-y-2
              ${isActive 
                ? "border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.2)]" 
                : "border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] hover:border-cyan-400/80"}
            `}
          >
            {isActive && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                Current Plan
              </div>
            )}
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                {plan.name}
              </h3>
              <p className="text-sm text-slate-400 h-10">{plan.description}</p>
            </div>

            <div className="text-center mb-8">
              <span className="text-5xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">${plan.price}</span>
              <span className="text-slate-400 ml-2">/ month</span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {featuresList.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="mt-0.5 bg-cyan-500/20 p-1 rounded-full text-cyan-400 border border-cyan-500/30">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => !isActive && handleSubscribe(plan.plan_id as number)}
              disabled={isActive || isSubscribing}
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                ${isActive 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700" 
                  : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"}
              `}
            >
              {isSubscribing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : isActive ? (
                "Active"
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

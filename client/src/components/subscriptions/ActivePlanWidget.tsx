import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { subscriptionsService } from "@/services/subscriptions";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, Zap } from "lucide-react";

export function ActivePlanWidget() {
  const queryClient = useQueryClient();
  
  const { data: activePlan, isLoading } = useQuery({
    queryKey: ["activeSubscription"],
    queryFn: subscriptionsService.getActivePlan,
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionsService.cancelPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSubscription"] });
    },
    onError: () => {
      alert("Failed to cancel plan. Please try again.");
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse bg-slate-800/50 h-32 rounded-xl border border-cyan-500/20 shadow-[0_0_10px_rgba(0,255,255,0.05)] w-full"></div>
    );
  }

  if (!activePlan || activePlan.status !== "active") {
    return (
      <div className="p-6 rounded-xl bg-[#050810]/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full transition-all hover:border-slate-700 hover:bg-[#0a0f18]/80">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-slate-400" /> No Active Subscription
          </h3>
          <p className="text-sm text-slate-400">Upgrade to premium for exclusive features.</p>
        </div>
        <Link 
          to="/premium" 
          className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] whitespace-nowrap text-center"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-[#050810]/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.05)] relative overflow-hidden w-full transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.15)] hover:border-cyan-400/60">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,255,255,0.3)]">
            <Zap className="w-5 h-5 text-cyan-400" /> {activePlan.plan_name || "Premium Plan"}
          </h3>
          <p className="text-sm text-slate-400">
            Active until: <span className="text-cyan-400 font-semibold">{activePlan.end_date ? new Date(activePlan.end_date).toLocaleDateString() : "TBD"}</span>
          </p>
        </div>
        
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="px-6 py-2 bg-transparent border border-magenta-500 text-magenta-500 hover:bg-magenta-500/10 hover:shadow-[0_0_15px_rgba(255,0,255,0.3)] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {cancelMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Canceling...</> : "Cancel Plan"}
        </button>
      </div>
    </div>
  );
}

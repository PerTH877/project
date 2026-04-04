import api from "@/lib/api";

export interface SubscriptionPlan {
  plan_id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  features?: string[] | any;
}

export interface ActiveSubscription {
  subscription_id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: "active" | "cancelled" | "expired";
  auto_renew: boolean;
  plan_name?: string;
}

export const subscriptionsService = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const res = await api.get("/subscriptions/plans");
    return res.data.plans || res.data;
  },

  getActivePlan: async (): Promise<ActiveSubscription | null> => {
    try {
      const res = await api.get("/subscriptions/me");
      return res.data.subscription || res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  subscribe: async (planId: number): Promise<ActiveSubscription> => {
    const res = await api.post("/subscriptions/subscribe", { plan_id: planId });
    return res.data.subscription || res.data;
  },

  cancelPlan: async (): Promise<{ message: string }> => {
    const res = await api.put("/subscriptions/cancel");
    return res.data;
  },
};

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, UserCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageShell, Panel } from "@/components/ui/Surface";
import { authService } from "@/services/auth";
import { warehousesService } from "@/services/products";
import { Skeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/EmptyState";
import type { User } from "@/types";

export default function AccountPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    nearby_warehouse_id: 0,
  });

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => authService.validateSession("user") as Promise<{ user: User }>,
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.list,
  });

  useEffect(() => {
    if (profileQuery.data?.user) {
      setFormData({
        full_name: profileQuery.data.user.full_name || "",
        phone_number: profileQuery.data.user.phone_number || "",
        nearby_warehouse_id: profileQuery.data.user.nearby_warehouse_id || 0,
      });
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { full_name: string; phone_number: string; nearby_warehouse_id?: number }) => {
      const parsedPayload = {
        ...payload,
        nearby_warehouse_id: payload.nearby_warehouse_id ? payload.nearby_warehouse_id : undefined,
      };
      return authService.updateProfile(parsedPayload);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Could not update profile");
    },
  });

  if (profileQuery.isLoading || warehousesQuery.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-[400px] rounded-[30px]" />
      </PageShell>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not load profile"
          description="There was an issue fetching your account details."
          onRetry={() => profileQuery.refetch()}
        />
      </PageShell>
    );
  }

  const user = profileQuery.data.user;

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        eyebrow="Account Settings"
        title="Manage your profile and preferences."
        description="Update your contact information and select a preferred nearby warehouse to get more accurate stock expectations."
      />

      <Panel title="Personal Information" icon={UserCircle} subtitle="This info applies to new orders.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(formData);
          }}
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="field-label">Full Name</label>
              <input
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="field-input"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input readOnly disabled value={user.email} className="field-input opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="field-label">Phone Number</label>
              <input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="field-input"
                placeholder="+880..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/8 space-y-4">
            <div className="flex items-center gap-2 mb-2 text-cyan-50">
              <MapPin className="h-5 w-5 text-cyan-300" />
              <h3 className="font-semibold text-lg">Preferred Warehouse</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select a warehouse near you to better optimize shipping and display stock logic.
            </p>
            <div>
              <select
                value={formData.nearby_warehouse_id}
                onChange={(e) => setFormData({ ...formData, nearby_warehouse_id: Number(e.target.value) })}
                className="field-select max-w-sm"
              >
                <option value={0}>No preference</option>
                {warehousesQuery.data?.map((w) => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name} ({w.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end border-t border-white/8 pt-5">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="action-primary disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </button>
          </div>
        </form>
      </Panel>
    </PageShell>
  );
}

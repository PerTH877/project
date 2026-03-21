import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, MapPin, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { addressesService } from "@/services/cart";
import type { Address } from "@/types";

const addressSchema = z.object({
  address_type: z.string().min(1, "Address label is required"),
  street_address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  zip_code: z.string().min(1, "Postcode is required"),
  country: z.string().min(1),
  is_default: z.boolean(),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: addressesService.list,
  });

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_type: "Home",
      street_address: "",
      city: "Dhaka",
      zip_code: "",
      country: "Bangladesh",
      is_default: false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: AddressForm) =>
      editingId ? addressesService.update(editingId, payload) : addressesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      setOpen(false);
      setEditingId(null);
      form.reset();
      toast.success("Address saved");
    },
    onError: () => toast.error("Could not save address"),
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: number) => addressesService.delete(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address removed");
    },
    onError: () => toast.error("Could not delete address"),
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({
      address_type: "Home",
      street_address: "",
      city: "Dhaka",
      zip_code: "",
      country: "Bangladesh",
      is_default: false,
    });
    setOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditingId(address.address_id);
    form.reset({
      address_type: address.address_type,
      street_address: address.street_address,
      city: address.city,
      zip_code: address.zip_code,
      country: address.country,
      is_default: address.is_default,
    });
    setOpen(true);
  };

  const addresses = addressesQuery.data ?? [];
  const summary = useMemo(
    () => ({
      total: addresses.length,
      defaults: addresses.filter((address) => address.is_default).length,
      cities: new Set(addresses.map((address) => address.city)).size,
    }),
    [addresses]
  );

  if (addressesQuery.isLoading) {
    return (
      <PageShell>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[30px]" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (addressesQuery.isError || !addressesQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not load addresses"
          description="Please try again."
          onRetry={() => addressesQuery.refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Addresses"
        title="Manage your delivery locations from one address book."
        description="This stays on the existing address CRUD routes and keeps Bangladesh as the default country, while making scanning and editing much faster."
        actions={
          <button onClick={openCreate} className="action-primary">
            <Plus className="h-4 w-4" />
            Add address
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saved addresses" numericValue={summary.total} hint="Saved delivery locations on your account" accent="cyan" />
        <StatCard label="Default locations" numericValue={summary.defaults} hint="Priority destinations used during checkout" accent="emerald" />
        <StatCard label="Cities covered" numericValue={summary.cities} hint="Regional reach across your saved addresses" accent="violet" />
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8" />}
          title="No addresses saved"
          description="Add a Bangladesh delivery address to start checking out faster."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Panel
              key={address.address_id}
              title={address.city}
              subtitle={address.address_type}
              actions={address.is_default ? <StatusBadge label="Default" tone="emerald" /> : null}
            >
              <p className="text-sm leading-7 text-muted-foreground">
                {address.street_address}
                <br />
                {address.city}, {address.zip_code}
                <br />
                {address.country}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => openEdit(address)} className="action-secondary">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(address.address_id)}
                  className="action-secondary border-rose-400/20 text-rose-200 hover:border-rose-400/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050d]/84 p-4 backdrop-blur-md">
          <div className="hud-panel w-full max-w-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="hud-kicker">{editingId ? "Edit address" : "Add address"}</p>
                <h2 className="display-font mt-2 text-2xl font-semibold text-white">
                  {editingId ? "Update delivery location" : "Create a new delivery node"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
              className="mt-6 space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Address label</label>
                  <input {...form.register("address_type")} className="field-input" />
                </div>
                <div>
                  <label className="field-label">City</label>
                  <input {...form.register("city")} className="field-input" />
                </div>
              </div>

              <div>
                <label className="field-label">Street address</label>
                <input {...form.register("street_address")} className="field-input" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Postcode</label>
                  <input {...form.register("zip_code")} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Country</label>
                  <input {...form.register("country")} className="field-input" />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                <input type="checkbox" {...form.register("is_default")} className="h-4 w-4 rounded border-white/20 bg-transparent" />
                Use as my default delivery address
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="action-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="action-primary disabled:cursor-not-allowed disabled:opacity-40">
                  Save address
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

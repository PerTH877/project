import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wishlistsService } from "@/services/wishlists";
import { formatCurrencyBDT } from "@/lib/utils";

export default function WishlistsPage() {
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState("");
  const [search, setSearch] = useState("");

  const wishlistsQuery = useQuery({
    queryKey: ["wishlists"],
    queryFn: wishlistsService.list,
  });

  const createMutation = useMutation({
    mutationFn: () => wishlistsService.create(draftName || "My Wishlist"),
    onSuccess: () => {
      setDraftName("");
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Wishlist created");
    },
    onError: () => toast.error("Could not create wishlist"),
  });

  const removeMutation = useMutation({
    mutationFn: ({
      wishlistId,
      variantId,
    }: {
      wishlistId: number;
      variantId: number;
    }) => wishlistsService.removeItem(wishlistId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Removed from wishlist");
    },
    onError: () => toast.error("Could not remove item"),
  });

  const wishlists = wishlistsQuery.data ?? [];
  const summary = useMemo(
    () => ({
      lists: wishlists.length,
      items: wishlists.reduce((sum, wishlist) => sum + wishlist.items.length, 0),
      publicLists: wishlists.filter((wishlist) => wishlist.is_public).length,
    }),
    [wishlists]
  );

  if (wishlistsQuery.isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[32px]" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (wishlistsQuery.isError || !wishlistsQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Wishlists unavailable"
          description="Try loading this page again."
          onRetry={() => wishlistsQuery.refetch()}
        />
      </PageShell>
    );
  }

  const filteredWishlists = wishlists
    .map((wishlist) => ({
      ...wishlist,
      items: wishlist.items.filter((item) => {
        const needle = search.trim().toLowerCase();
        return (
          !needle ||
          item.product.title.toLowerCase().includes(needle) ||
          item.sku.toLowerCase().includes(needle)
        );
      }),
    }))
    .filter((wishlist) => {
      const needle = search.trim().toLowerCase();
      return !needle || wishlist.name.toLowerCase().includes(needle) || wishlist.items.length > 0;
    });

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Wishlists"
        title="Save, group, and revisit products from one place."
        description="This page is still backed by the existing wishlist and wishlist item routes. The upgrade is in structure, visibility, and scanning speed."
        meta={<StatusBadge label={`${summary.items} saved items`} tone="violet" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Wishlists" numericValue={summary.lists} hint="Named collections for later review" accent="cyan" />
        <StatCard label="Saved items" numericValue={summary.items} hint="Products held across every wishlist" accent="magenta" />
        <StatCard label="Public lists" numericValue={summary.publicLists} hint="Collections visible beyond the owner account" accent="emerald" />
      </div>

      <Panel title="Create and search" subtitle="Start a new list or search what you have already saved." icon={Heart}>
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Name a new wishlist"
            className="field-input"
          />
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search wishlists or saved SKUs"
              className="field-input pl-11"
            />
          </label>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="action-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Create list
          </button>
        </div>
      </Panel>

      {wishlists.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="No wishlist yet"
          description="Save products from the marketplace and they will show up here."
        />
      ) : (
        <div className="space-y-6">
          {filteredWishlists.map((wishlist) => (
            <Panel
              key={wishlist.wishlist_id}
              title={wishlist.name}
              subtitle={`${wishlist.items.length} items currently visible in this list`}
              actions={<StatusBadge label={wishlist.is_public ? "Public" : "Private"} tone={wishlist.is_public ? "emerald" : "slate"} />}
            >
              {wishlist.items.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
                  No saved products match the current search in this list.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {wishlist.items.map((item) => (
                    <div key={item.item_id} className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="h-24 w-24 overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03]">
                        {item.product.primary_image ? (
                          <img
                            src={item.product.primary_image}
                            alt={item.product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{item.product.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{item.sku}</p>
                          </div>
                          <p className="text-sm font-semibold text-primary">{formatCurrencyBDT(item.price)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(item.attributes).map(([key, value]) => (
                            <StatusBadge key={key} label={`${key}: ${value}`} tone="slate" />
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            removeMutation.mutate({
                              wishlistId: wishlist.wishlist_id,
                              variantId: item.variant_id,
                            })
                          }
                          className="action-secondary mt-4 border-rose-400/20 text-rose-200 hover:border-rose-400/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </PageShell>
  );
}

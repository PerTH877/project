import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search, Shield, Store } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminService } from "@/services/admin";

export default function AdminModerationPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const pendingQuery = useQuery({
    queryKey: ["admin-pending-sellers"],
    queryFn: adminService.getPendingSellers,
  });

  const verifyMutation = useMutation({
    mutationFn: (sellerId: number) => adminService.verifySeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Seller verified");
    },
    onError: () => toast.error("Could not verify seller"),
  });

  const sellers = pendingQuery.data ?? [];
  const filteredSellers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return sellers.filter((seller) => {
      return (
        !needle ||
        seller.company_name.toLowerCase().includes(needle) ||
        seller.contact_email.toLowerCase().includes(needle) ||
        (seller.gst_number || "").toLowerCase().includes(needle)
      );
    });
  }, [search, sellers]);

  const summary = useMemo(
    () => ({
      total: sellers.length,
      withTradeId: sellers.filter((seller) => seller.gst_number).length,
      filtered: filteredSellers.length,
    }),
    [filteredSellers.length, sellers]
  );

  const verifyingSellerId = verifyMutation.isPending ? verifyMutation.variables : null;

  if (pendingQuery.isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-[30px]" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (pendingQuery.isError || !pendingQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not load seller applications"
          description="Try again in a moment."
          onRetry={() => pendingQuery.refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Seller moderation"
        title="Review seller applications from a live control-room queue."
        description="The verification flow stays intact, but the queue is now easier to scan across company, email, and trade registration details."
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={`${summary.total} pending applications`} tone="amber" />
            <StatusBadge label={`${summary.withTradeId} with trade ID`} tone="cyan" />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" numericValue={summary.total} hint="Seller accounts waiting for review" accent="amber" />
        <StatCard label="With trade ID" numericValue={summary.withTradeId} hint="Applications with registration details attached" accent="cyan" />
        <StatCard label="Visible now" numericValue={summary.filtered} hint="Results after the current queue search" accent="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Panel title="Moderation console" subtitle="Search by company, contact email, or trade identifier." icon={Shield}>
            <div className="rounded-[22px] border border-white/10 bg-[#070c14]/78 p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search seller applications"
                  className="field-input pl-11"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge label={`${summary.filtered} visible`} tone="violet" />
                <StatusBadge label={`${summary.total - summary.withTradeId} missing trade ID`} tone="rose" />
                <StatusBadge label="Approval unlocks seller workspace" tone="emerald" />
              </div>
            </div>

            {filteredSellers.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={<CheckCircle2 className="h-8 w-8" />}
                title="No applications match this search"
                description="Clear the current search to see the full moderation queue again."
              />
            ) : (
              <div className="mt-6 grid gap-4">
                {filteredSellers.map((seller) => (
                  <div
                    key={seller.seller_id}
                    className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)),linear-gradient(155deg,rgba(10,14,23,0.94),rgba(5,8,14,0.98))] p-5 shadow-[0_26px_64px_-42px_rgba(0,0,0,0.8)]"
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={`Queue #${seller.seller_id}`} tone="slate" />
                      <StatusBadge label="Pending review" tone="amber" />
                      {seller.gst_number ? (
                        <StatusBadge label="Trade ID attached" tone="cyan" />
                      ) : (
                        <StatusBadge label="Trade ID missing" tone="rose" />
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div>
                          <h2 className="display-font text-2xl font-semibold text-white">{seller.company_name}</h2>
                          <p className="mt-2 text-sm text-slate-200">{seller.contact_email}</p>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            Trade or Tax Registration No.: {seller.gst_number || "Not provided"}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <div className="rounded-[18px] border border-white/10 bg-[#060a12]/82 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              Queue ID
                            </p>
                            <p className="mt-2 text-lg font-semibold text-white">#{seller.seller_id}</p>
                          </div>
                          <div className="rounded-[18px] border border-white/10 bg-[#060a12]/82 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                              Readiness
                            </p>
                            <p className="mt-2 text-sm font-semibold text-white">
                              {seller.gst_number ? "Verification data attached" : "Manual follow-up may be needed"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-4 rounded-[20px] border border-cyan-400/14 bg-[linear-gradient(180deg,rgba(15,24,38,0.94),rgba(7,10,18,0.98))] p-4">
                        <div className="space-y-3">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                            <Store className="h-4 w-4" />
                            Store access unlock
                          </div>
                          <p className="text-sm leading-7 text-muted-foreground">
                            Approval immediately enables seller sign-in and opens the merchant workspace for product and order management.
                          </p>
                        </div>

                        <button
                          onClick={() => verifyMutation.mutate(seller.seller_id)}
                          disabled={verifyMutation.isPending}
                          className="action-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {verifyingSellerId === seller.seller_id ? "Approving..." : "Approve store"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Approval protocol" subtitle="The underlying verification behavior is unchanged." icon={CheckCircle2}>
            <div className="space-y-3">
              {[
                "Review company identity and contact details from the live pending queue.",
                "Use trade registration details when present to accelerate trust checks.",
                "Approval instantly enables seller login and merchant workspace access.",
              ].map((item) => (
                <div key={item} className="rounded-[18px] border border-white/10 bg-[#070c14]/78 p-3 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Queue health" subtitle="Live moderation snapshot." icon={Store}>
            <div className="space-y-3">
              <div className="rounded-[18px] border border-white/10 bg-[#070c14]/78 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Search mode
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {search.trim() ? `Filtering for "${search.trim()}"` : "Showing the full live review queue"}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#070c14]/78 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Trade coverage
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {summary.withTradeId} of {summary.total} applications include trade registration details.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#070c14]/78 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Immediate action
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {summary.filtered} stores are ready to review in the current console view.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}

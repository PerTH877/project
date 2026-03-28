import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookmarkPlus, MoveLeft, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { SmartImage } from "@/components/media/SmartImage";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { formatCurrencyBDT, formatNumber } from "@/lib/utils";
import { cartService } from "@/services/cart";
import { useAuthStore } from "@/store/authStore";

export default function CartPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { token, role } = useAuthStore();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: cartService.getItems,
    enabled: !!token && role === "user",
  });

  const updateMutation = useMutation({
    mutationFn: ({ cart_id, quantity }: { cart_id: number; quantity: number }) =>
      cartService.updateItem(cart_id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-total"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-review"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Could not update that cart item.";
      toast.error(msg);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (cart_id: number) => cartService.removeItem(cart_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-total"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-review"] });
      toast.success("Item removed from cart.");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Could not remove that cart item.";
      toast.error(msg);
    },
  });

  const saveForLaterMutation = useMutation({
    mutationFn: ({ cart_id, is_saved }: { cart_id: number; is_saved: boolean }) =>
      cartService.toggleSaveForLater(cart_id, is_saved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-total"] });
      queryClient.invalidateQueries({ queryKey: ["checkout-review"] });
      toast.success("Cart state synchronized.");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Could not update saved items.";
      toast.error(msg);
    },
  });

  if (cartQuery.isLoading) {
    return (
      <PageShell className="space-y-6">
        <Skeleton className="h-28 rounded-[30px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[540px] rounded-[30px]" />
          <Skeleton className="h-[320px] rounded-[30px]" />
        </div>
      </PageShell>
    );
  }

  if (cartQuery.isError || !cartQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not load your cart"
          description="Please refresh and try again."
          onRetry={() => cartQuery.refetch()}
        />
      </PageShell>
    );
  }

  const allItems = cartQuery.data.items;
  const activeItems = allItems.filter((item) => !item.is_saved);
  const savedItems = allItems.filter((item) => item.is_saved);
  const quantityTotal = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = activeItems.reduce((sum, item) => sum + item.line_total, 0);

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Cart"
        title="Review active items, keep extras saved, and move into checkout cleanly."
        description="This now uses the real cart payload from the backend, so quantities, saved items, and subtotals stay in sync."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active lines" numericValue={activeItems.length} hint="Items ready for checkout" accent="cyan" />
        <StatCard label="Saved for later" numericValue={savedItems.length} hint="Items parked outside the checkout flow" accent="magenta" />
        <StatCard label="Subtotal" value={formatCurrencyBDT(subtotal)} hint={`${formatNumber(quantityTotal)} units across active cart lines`} accent="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel
            title="Ready to checkout"
            subtitle="Only active cart lines contribute to checkout totals and stock validation."
          >
            {activeItems.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-8 w-8" />}
                title="Your cart is empty"
                description="Browse the marketplace and add a few products before checking out."
                action={
                  <Link to="/" className="action-primary">
                    Continue shopping
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {activeItems.map((item) => (
                  <article key={item.cart_id} className="grid gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[120px_minmax(0,1fr)]">
                    <Link to={`/products/${item.product.product_id}`} className="overflow-hidden rounded-[18px] border border-white/8 bg-[#050811]">
                      <SmartImage
                        src={item.product.primary_image}
                        alt={item.product.title}
                        className="h-full w-full [&>img]:object-cover"
                        aspectRatio="aspect-square"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <Link to={`/products/${item.product.product_id}`} className="display-font text-xl text-white transition-colors hover:text-cyan-300">
                            {item.product.title}
                          </Link>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Sold by <span className="text-white">{item.product.seller_name}</span>
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                            {Object.entries(item.variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" • ") || item.variant.sku}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="display-font text-xl text-white">{formatCurrencyBDT(item.unit_price)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Line total {formatCurrencyBDT(item.line_total)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Quantity
                          </label>
                          <select
                            value={item.quantity}
                            onChange={(e) =>
                              updateMutation.mutate({ cart_id: item.cart_id, quantity: Number(e.target.value) })
                            }
                            className="rounded-full border border-white/10 bg-[#071019] px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-300"
                          >
                            {Array.from({ length: Math.min(10, Math.max(item.product?.available_stock ?? 0, item.quantity, 1)) }).map((_, index) => {
                              const value = index + 1;
                              return (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              );
                            })}
                          </select>
                          <span className={(item.product?.available_stock ?? 0) > 0 ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>
                            {item.product?.available_stock !== undefined
                              ? ((item.product.available_stock ?? 0) > 0
                                ? `${formatNumber(item.product.available_stock)} available`
                                : `Stock unavailable`)
                              : `Checking stock...`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => saveForLaterMutation.mutate({ cart_id: item.cart_id, is_saved: true })}
                            className="action-secondary"
                          >
                            <BookmarkPlus className="h-4 w-4" />
                            Save for later
                          </button>
                          <button
                            onClick={() => removeMutation.mutate(item.cart_id)}
                            className="action-secondary border-rose-400/20 text-rose-200 hover:border-rose-400/40"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>

          {savedItems.length > 0 ? (
            <Panel
              title="Saved for later"
              subtitle="These lines stay out of checkout until you move them back."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {savedItems.map((item) => (
                  <article key={item.cart_id} className="flex h-full flex-col rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <Link to={`/products/${item.product.product_id}`} className="overflow-hidden rounded-[18px] border border-white/8 bg-[#050811]">
                      <SmartImage
                        src={item.product.primary_image}
                        alt={item.product.title}
                        className="h-full w-full [&>img]:object-cover"
                        aspectRatio="aspect-[4/3]"
                      />
                    </Link>
                    <div className="mt-4 flex flex-1 flex-col">
                      <Link to={`/products/${item.product.product_id}`} className="line-clamp-2 text-sm font-semibold text-white hover:text-cyan-300">
                        {item.product.title}
                      </Link>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.variant.sku}</p>
                      <p className="mt-3 display-font text-lg text-white">{formatCurrencyBDT(item.unit_price)}</p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        <button
                          onClick={() => saveForLaterMutation.mutate({ cart_id: item.cart_id, is_saved: false })}
                          className="action-primary"
                        >
                          <MoveLeft className="h-4 w-4" />
                          Move to cart
                        </button>
                        <button
                          onClick={() => removeMutation.mutate(item.cart_id)}
                          className="action-secondary border-rose-400/20 text-rose-200 hover:border-rose-400/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel
          title="Checkout summary"
          subtitle="Stock is revalidated when the order is placed."
          className="h-fit lg:sticky lg:top-24"
        >
          <div className="rounded-[22px] border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <p>Shipping discounts are still determined server-side during checkout review, including prime eligibility.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span className="text-white">{formatNumber(quantityTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active lines</span>
              <span className="text-white">{formatNumber(activeItems.length)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 pt-3 text-base">
              <span className="text-white">Subtotal</span>
              <span className="display-font text-xl text-white">{formatCurrencyBDT(subtotal)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            disabled={activeItems.length === 0}
            className="action-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proceed to checkout
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Saved items stay in your account, but only active items move into checkout and order creation.
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}

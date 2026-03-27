import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, CreditCard, Lock, MapPin, Package, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cartService, checkoutService, addressesService } from "@/services/cart";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell } from "@/components/ui/Surface";
import { formatCurrencyBDT, formatDate } from "@/lib/utils";

type CheckoutStep = "ADDRESS" | "PAYMENT" | "REVIEW";
type PaymentMethod = "Cash on Delivery" | "Credit Card" | "bKash";

const paymentOptions: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: "Cash on Delivery",
    label: "Cash on Delivery",
    description: "Good fallback if you want the simplest supported checkout path.",
  },
  {
    value: "Credit Card",
    label: "Credit Card",
    description: "Card payments already match the backend validation list.",
  },
  {
    value: "bKash",
    label: "bKash",
    description: "Mobile-first payment option supported by the current API.",
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<CheckoutStep>("ADDRESS");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("Cash on Delivery");

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: addressesService.list,
  });

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: cartService.getItems,
  });

  useEffect(() => {
    if (!selectedAddressId && addressesQuery.data?.length) {
      const defaultAddress = addressesQuery.data.find((address) => address.is_default) ?? addressesQuery.data[0];
      setSelectedAddressId(defaultAddress.address_id);
    }
  }, [addressesQuery.data, selectedAddressId]);

  const setAddressMutation = useMutation({
    mutationFn: (addressId: number) => checkoutService.setAddress(addressId),
    onSuccess: () => setStep("PAYMENT"),
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Failed to validate that address.";
      toast.error(msg);
    },
  });

  const setPaymentMutation = useMutation({
    mutationFn: (method: PaymentMethod) => checkoutService.setPayment(method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-review"] });
      setStep("REVIEW");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Payment method rejected by the backend.";
      toast.error(msg);
    },
  });

  const reviewQuery = useQuery({
    queryKey: ["checkout-review", selectedAddressId, selectedPaymentMethod],
    queryFn: checkoutService.review,
    enabled: step === "REVIEW" && !!selectedAddressId,
  });

  const executeCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAddressId) {
        throw new Error("Address is required");
      }
      return checkoutService.execute(selectedAddressId, selectedPaymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-total"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed successfully.");
      navigate("/orders");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "Transaction failed during the final checkout step.";
      toast.error(msg);
    },
  });

  const steps = [
    { id: "ADDRESS", label: "Shipping Link" },
    { id: "PAYMENT", label: "Secure Auth" },
    { id: "REVIEW", label: "Final Review" },
  ];

  const activeItems = cartQuery.data?.items.filter((item) => !item.is_saved) ?? [];
  const selectedAddress = addressesQuery.data?.find((address) => address.address_id === selectedAddressId) ?? null;

  if (addressesQuery.isLoading || cartQuery.isLoading) {
    return (
      <PageShell className="space-y-6">
        <Skeleton className="h-28 rounded-[30px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-[560px] rounded-[30px]" />
          <Skeleton className="h-[360px] rounded-[30px]" />
        </div>
      </PageShell>
    );
  }

  if (addressesQuery.isError || cartQuery.isError || !addressesQuery.data || !cartQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not prepare checkout"
          description="We couldn't load your addresses or cart items."
          onRetry={() => {
            addressesQuery.refetch();
            cartQuery.refetch();
          }}
        />
      </PageShell>
    );
  }

  if (!activeItems.length) {
    return (
      <PageShell>
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="There are no active items to check out"
          description="Move saved items back into the cart or add a few products first."
          action={
            <button onClick={() => navigate("/cart")} className="action-primary">
              Go back to cart
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Checkout"
        title="Confirm your delivery address, choose a supported payment method, and place the order."
        description="This flow now matches the current backend: address validation, payment selection, review summary, and final order execution."
        meta={
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
            <Lock className="h-4 w-4" />
            Server-side stock revalidation enabled
          </div>
        }
      />

      <div className="flex items-center justify-center px-2">
        {steps.map((s, i) => {
          const isActive = step === s.id;
          const isPast = steps.findIndex((x) => x.id === step) > i;
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center relative">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold z-10 transition-colors ${isActive ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.6)]" : isPast ? "bg-emerald-500/20 text-emerald-400 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "bg-[#0a0f18] text-slate-500 border-slate-700"}`}>
                  {isPast ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                </div>
                <span className={`absolute top-12 text-xs font-black tracking-widest uppercase whitespace-nowrap hidden sm:block ${isActive ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" : isPast ? "text-emerald-400" : "text-slate-600"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-24 lg:w-48 h-1 mx-2 transition-colors ${isPast ? "bg-gradient-to-r from-emerald-500/50 to-cyan-500/50 shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "bg-slate-800"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {step === "ADDRESS" ? (
            <Panel
              title="Choose a delivery address"
              subtitle="Only active addresses from your account can be used during checkout."
              icon={MapPin}
            >
              {addressesQuery.data.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {addressesQuery.data.map((address) => (
                    <button
                      type="button"
                      key={address.address_id}
                      onClick={() => setSelectedAddressId(address.address_id)}
                      className={`rounded-[24px] border p-5 text-left transition ${
                        selectedAddressId === address.address_id
                          ? "border-cyan-300 bg-cyan-300/10 shadow-cyan"
                          : "border-white/8 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="display-font text-lg text-white">{address.address_type}</p>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            {address.street_address}
                            <br />
                            {address.city}, {address.zip_code}
                            <br />
                            {address.country}
                          </p>
                        </div>
                        {address.is_default ? (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                            Default
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<MapPin className="h-8 w-8" />}
                  title="No address found"
                  description="Add an address from your account page before checking out."
                  action={
                    <button onClick={() => navigate("/account/addresses")} className="action-primary">
                      Manage addresses
                    </button>
                  }
                />
              )}
              <div className="mt-6 flex justify-end border-t border-white/8 pt-5">
                <button
                  disabled={!selectedAddressId}
                  onClick={() => selectedAddressId && setAddressMutation.mutate(selectedAddressId)}
                  className="action-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to payment
                </button>
              </div>
            </Panel>
          ) : null}

          {step === "PAYMENT" ? (
            <Panel
              title="Choose a payment method"
              subtitle="These options are restricted to what the backend currently accepts."
              icon={CreditCard}
            >
              <div className="space-y-4">
                {paymentOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-4 rounded-[24px] border p-5 transition ${
                      selectedPaymentMethod === option.value
                        ? "border-magenta-300 bg-magenta-300/10 shadow-magenta"
                        : "border-white/8 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={selectedPaymentMethod === option.value}
                      onChange={() => setSelectedPaymentMethod(option.value)}
                      className="mt-1 h-4 w-4 border-white/20 bg-transparent text-magenta-300"
                    />
                    <div className="min-w-0">
                      <p className="display-font text-lg text-white">{option.label}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-between border-t border-white/8 pt-5">
                <button onClick={() => setStep("ADDRESS")} className="action-secondary">
                  Back
                </button>
                <button onClick={() => setPaymentMutation.mutate(selectedPaymentMethod)} className="action-primary">
                  Review order
                </button>
              </div>
            </Panel>
          ) : null}

          {step === "REVIEW" ? (
            <Panel
              title="Review and place order"
              subtitle="This view combines the server-calculated total with the live cart lines you are about to purchase."
              icon={ShieldCheck}
            >
              {reviewQuery.isLoading ? (
                <Skeleton className="h-72 rounded-[24px]" />
              ) : reviewQuery.isError || !reviewQuery.data ? (
                <ErrorState
                  title="Could not load the checkout review"
                  description="Please try the review step again."
                  onRetry={() => reviewQuery.refetch()}
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Shipping to</h3>
                      {selectedAddress ? (
                        <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-muted-foreground">
                          <p className="text-white">{selectedAddress.address_type}</p>
                          <p>{selectedAddress.street_address}</p>
                          <p>
                            {selectedAddress.city}, {selectedAddress.zip_code}
                          </p>
                          <p>{selectedAddress.country}</p>
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Payment</h3>
                      <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-muted-foreground">
                        <p className="text-white">{selectedPaymentMethod}</p>
                        <p>{reviewQuery.data.is_prime ? "Prime shipping discount detected." : "Standard shipping pricing applies."}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Order items</h3>
                    <div className="mt-4 space-y-4">
                      {activeItems.map((item) => (
                        <article key={item.cart_id} className="flex flex-col gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{item.product.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {Object.entries(item.variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" • ") || item.variant.sku}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-cyan-300/80">
                              Added {formatDate(item.added_at)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm text-muted-foreground">Qty {item.quantity}</p>
                            <p className="display-font text-lg text-white">{formatCurrencyBDT(item.line_total)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-white/8 pt-5">
                    <button onClick={() => setStep("PAYMENT")} className="action-secondary">
                      Back
                    </button>
                    <button
                      onClick={() => executeCheckoutMutation.mutate()}
                      disabled={executeCheckoutMutation.isPending}
                      className="action-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Place order
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          ) : null}
        </div>

        <Panel
          title="Order summary"
          subtitle="Server totals update during the review step."
          className="h-fit lg:sticky lg:top-24"
        >
          <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/8 p-4 text-sm text-cyan-50">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <p>Final stock checks and order creation still happen on the backend before inventory is reduced.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Items</span>
              <span className="text-white">{activeItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Address selected</span>
              <span className="text-white">{selectedAddress ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment</span>
              <span className="text-white">{selectedPaymentMethod}</span>
            </div>
          </div>

          {step === "REVIEW" && reviewQuery.data ? (
            <div className="mt-6 space-y-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrencyBDT(reviewQuery.data.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-white">{formatCurrencyBDT(reviewQuery.data.shipping_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="text-white">{formatCurrencyBDT(reviewQuery.data.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-white/8 pt-3 text-base">
                <span className="text-white">Total</span>
                <span className="display-font text-xl text-white">{formatCurrencyBDT(reviewQuery.data.total)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[22px] border border-dashed border-white/12 bg-black/15 p-5 text-sm leading-7 text-muted-foreground">
              Totals appear after you finish the payment step and open the review stage.
            </div>
          )}

          {step === "REVIEW" ? (
            <button
              onClick={() => executeCheckoutMutation.mutate()}
              disabled={executeCheckoutMutation.isPending}
              className="action-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm purchase
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </Panel>
      </div>
    </PageShell>
  );
}

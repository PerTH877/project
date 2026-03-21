import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, PackageCheck, Receipt, Truck } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { formatCurrencyBDT, formatDate } from "@/lib/utils";
import { ordersService } from "@/services/orders";

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: ordersService.listMine,
  });

  const detailQuery = useQuery({
    queryKey: ["orders", selectedOrderId],
    queryFn: () => ordersService.getMine(selectedOrderId as number),
    enabled: selectedOrderId !== null,
  });

  if (ordersQuery.isLoading) {
    return (
      <PageShell className="space-y-6">
        <Skeleton className="h-28 rounded-[30px]" />
        <Skeleton className="h-[520px] rounded-[30px]" />
      </PageShell>
    );
  }

  if (ordersQuery.isError || !ordersQuery.data) {
    return (
      <PageShell>
        <ErrorState
          title="Could not load your orders"
          description="Please refresh and try again."
          onRetry={() => ordersQuery.refetch()}
        />
      </PageShell>
    );
  }

  const orders = ordersQuery.data;
  const selectedOrder = orders.find((order) => order.order_id === selectedOrderId) ?? null;
  const processingCount = orders.filter((order) => order.status !== "Delivered").length;
  const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Orders"
        title="Track placed orders, inspect line items, and keep an eye on shipment status."
        description="The page now uses the real order summary and detail endpoints instead of mixing in fields that were never returned."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders placed" numericValue={orders.length} hint="Completed and in-flight orders" accent="cyan" icon={Package} />
        <StatCard label="Still active" numericValue={processingCount} hint="Anything not yet delivered" accent="amber" icon={Truck} />
        <StatCard label="Total spent" value={formatCurrencyBDT(totalSpent)} hint="Across the currently loaded order history" accent="emerald" icon={Receipt} />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="h-8 w-8" />}
          title="No orders yet"
          description="Once you place an order, it will show up here with its current status and line items."
          action={
            <Link to="/" className="action-primary">
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel title="Order history" subtitle="Select any order to inspect line items and delivery details.">
            <div className="space-y-4">
              {orders.map((order) => (
                <button
                  type="button"
                  key={order.order_id}
                  onClick={() => setSelectedOrderId(order.order_id)}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${
                    selectedOrderId === order.order_id
                      ? "border-cyan-300 bg-cyan-300/10 shadow-cyan"
                      : "border-white/8 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="display-font text-xl text-white">Order #{order.order_id}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Placed {formatDate(order.order_date)}
                        {order.address_city ? ` • ${order.address_city}` : ""}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="display-font text-lg text-white">{formatCurrencyBDT(order.total_amount)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{order.item_count} item(s)</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em]">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-white">{order.status}</span>
                    {order.shipment_status ? (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                        {order.shipment_status}
                      </span>
                    ) : null}
                    {order.payment_status ? (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-100">
                        {order.payment_status}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title={selectedOrder ? `Order #${selectedOrder.order_id}` : "Order details"}
            subtitle={selectedOrder ? "Line items, destination, payment, and shipment metadata." : "Select an order from the left column."}
            className="h-fit xl:sticky xl:top-24"
          >
            {selectedOrderId === null ? (
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="Select an order"
                description="Choose an order from the history list to inspect the full detail payload."
              />
            ) : detailQuery.isLoading ? (
              <Skeleton className="h-[420px] rounded-[24px]" />
            ) : detailQuery.isError || !detailQuery.data ? (
              <ErrorState
                title="Could not load order details"
                description="Try selecting the order again."
                onRetry={() => detailQuery.refetch()}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="text-white">{detailQuery.data.order.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment</span>
                    <span className="text-white">{detailQuery.data.order.payment_method ?? "Pending"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tracking</span>
                    <span className="text-white">{detailQuery.data.order.tracking_number ?? "Not assigned yet"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination</span>
                    <span className="text-white">{detailQuery.data.order.address?.city ?? "Unknown"}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {detailQuery.data.items.map((item) => (
                    <article key={item.item_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to={`/products/${item.product.product_id}`} className="font-semibold text-white hover:text-cyan-300">
                            {item.product.title}
                          </Link>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {Object.entries(item.variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" • ") || item.variant.sku}
                          </p>
                          {item.seller ? <p className="mt-1 text-sm text-muted-foreground">Seller: {item.seller.company_name}</p> : null}
                        </div>
                        <div className="text-right">
                          <p className="display-font text-lg text-white">{formatCurrencyBDT(item.line_total)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Qty {item.quantity}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}

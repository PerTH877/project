import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  MapPinned,
  PackageSearch,
  Shield,
  Store,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/Skeleton";
import { DataTable, Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminService } from "@/services/admin";
import { categoriesService, warehousesService } from "@/services/products";
import { formatCurrencyBDT, formatNumber } from "@/lib/utils";

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryFee, setCategoryFee] = useState("");
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    street_address: "",
    city: "",
    zip_code: "",
    capacity: "",
  });

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: adminService.getOverview,
  });
  const sellerPerformanceQuery = useQuery({
    queryKey: ["admin-seller-performance"],
    queryFn: adminService.getSellerPerformance,
  });
  const categoryPerformanceQuery = useQuery({
    queryKey: ["admin-category-performance"],
    queryFn: adminService.getCategoryPerformance,
  });
  const demandOpportunityQuery = useQuery({
    queryKey: ["admin-demand-opportunities"],
    queryFn: adminService.getDemandOpportunities,
  });
  const warehousePressureQuery = useQuery({
    queryKey: ["admin-warehouse-pressure"],
    queryFn: adminService.getWarehousePressure,
  });
  const geographicDemandQuery = useQuery({
    queryKey: ["admin-geographic-demand"],
    queryFn: adminService.getGeographicDemand,
  });
  const returnsRiskQuery = useQuery({
    queryKey: ["admin-returns-risk"],
    queryFn: adminService.getReturnsRisk,
  });
  const inventoryRiskQuery = useQuery({
    queryKey: ["admin-inventory-risk"],
    queryFn: adminService.getInventoryRisk,
  });
  const conversionSignalsQuery = useQuery({
    queryKey: ["admin-conversion-signals"],
    queryFn: adminService.getConversionSignals,
  });

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      categoriesService.create({
        name: categoryName,
        description: categoryDescription,
        commission_percentage: categoryFee ? Number(categoryFee) : null,
      }),
    onSuccess: () => {
      setCategoryName("");
      setCategoryDescription("");
      setCategoryFee("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-category-performance"] });
      toast.success("Category created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Could not create category");
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: () =>
      warehousesService.create({
        ...warehouseForm,
        capacity: warehouseForm.capacity ? Number(warehouseForm.capacity) : null,
      }),
    onSuccess: () => {
      setWarehouseForm({
        name: "",
        street_address: "",
        city: "",
        zip_code: "",
        capacity: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-warehouse-pressure"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Could not create warehouse");
    },
  });

  const isLoading =
    overviewQuery.isLoading ||
    sellerPerformanceQuery.isLoading ||
    categoryPerformanceQuery.isLoading ||
    demandOpportunityQuery.isLoading ||
    warehousePressureQuery.isLoading ||
    geographicDemandQuery.isLoading ||
    returnsRiskQuery.isLoading ||
    inventoryRiskQuery.isLoading ||
    conversionSignalsQuery.isLoading;

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[28px]" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[420px] rounded-[32px]" />
          <Skeleton className="h-[420px] rounded-[32px]" />
        </div>
      </PageShell>
    );
  }

  const overview = overviewQuery.data!;
  const sellers = sellerPerformanceQuery.data || [];
  const categories = categoryPerformanceQuery.data || [];
  const opportunities = demandOpportunityQuery.data || [];
  const warehouses = warehousePressureQuery.data || [];
  const cities = geographicDemandQuery.data || [];
  const returnsRisk = returnsRiskQuery.data;
  const inventoryRisk = inventoryRiskQuery.data || [];
  const conversionSignals = conversionSignalsQuery.data || [];

  const topSeller = sellers[0];
  const fastestGrowingSeller = [...sellers].sort((left, right) => right.growth_rate - left.growth_rate)[0];
  const topCategory = categories[0];
  const topUnitCategory = [...categories].sort((left, right) => right.units_sold - left.units_sold)[0];
  const pressureWarehouse = warehouses[0];
  const topOpportunity = opportunities[0];
  const topLeak = conversionSignals[0];
  const topInventoryRisk = inventoryRisk[0];
  const topReturnSeller = returnsRisk?.sellers[0];
  const risingCity = [...cities].sort((left, right) => right.growth_rate - left.growth_rate)[0];

  const priorityActions = [
    pressureWarehouse
      ? {
          title: `Relieve ${pressureWarehouse.name}`,
          detail: `${pressureWarehouse.pending_orders} pending orders and ${pressureWarehouse.low_stock_variants} low-stock variants are concentrated in ${pressureWarehouse.city}.`,
        }
      : null,
    topOpportunity
      ? {
          title: `Restock ${topOpportunity.title}`,
          detail: `${topOpportunity.browse_count} product views and ${topOpportunity.cart_adds} cart adds are outpacing ${topOpportunity.stock_units} units of stock.`,
        }
      : null,
    topLeak
      ? {
          title: `Review ${topLeak.title}`,
          detail: `${topLeak.browse_count} views are only converting to ${topLeak.cart_to_order_rate.toFixed(1)}% cart-to-order progress.`,
        }
      : null,
    topInventoryRisk
      ? {
          title: `Replenish ${topInventoryRisk.title}`,
          detail: `${topInventoryRisk.stock_units} units remain while recent sales and carts point to a ${topInventoryRisk.risk_score.toFixed(1)} inventory risk score.`,
        }
      : null,
    topReturnSeller
      ? {
          title: `Audit ${topReturnSeller.company_name}`,
          detail: `${topReturnSeller.return_rate.toFixed(1)}% return rate and ${formatCurrencyBDT(topReturnSeller.refund_total)} in refunds warrant a closer look.`,
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; detail: string }>;

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Admin intelligence"
        title="See what is selling, what is slipping, and what needs attention next."
        description="Orders, browsing, carts, wishlists, inventory, warehouse load, payouts, and returns in one working view."
        meta={<StatusBadge label={`${overview.summary.pending_seller_count} pending seller reviews`} tone="amber" />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Customers" numericValue={overview.summary.customer_count} hint="Registered buyer accounts" accent="cyan" />
        <StatCard label="Verified sellers" numericValue={overview.summary.verified_seller_count} hint="Approved storefronts" accent="emerald" />
        <StatCard label="GMV" value={formatCurrencyBDT(overview.summary.gross_merchandise_value)} hint="Total merchandise value" accent="magenta" />
        <StatCard label="Top seller" value={topSeller?.company_name || "No sales"} hint={topSeller ? formatCurrencyBDT(topSeller.total_gmv) : "Awaiting activity"} accent="violet" />
        <StatCard label="Top category" value={topCategory?.category_name || "No category data"} hint={topCategory ? formatCurrencyBDT(topCategory.gmv) : "Awaiting activity"} accent="cyan" />
        <StatCard label="Highest pressure" value={pressureWarehouse?.city || "Balanced"} hint={pressureWarehouse ? `${pressureWarehouse.pressure_score.toFixed(1)} pressure score` : "No pressure detected"} accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Marketplace health" subtitle="Top-line view across buyers, sellers, orders, and risk." icon={Shield}>
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
              title="Winning seller"
              value={topSeller?.company_name || "No clear leader yet"}
              detail={
                topSeller
                  ? `${formatCurrencyBDT(topSeller.total_gmv)} GMV across ${topSeller.total_orders} orders`
                  : "Seller order data will appear here."
              }
            />
            <InsightCard
              title="Fastest-growing seller"
              value={fastestGrowingSeller?.company_name || "No clear mover yet"}
              detail={
                fastestGrowingSeller
                  ? `${fastestGrowingSeller.growth_rate.toFixed(1)}% growth with ${formatCurrencyBDT(fastestGrowingSeller.total_gmv)} GMV`
                  : "Growth signals will appear as seller performance changes."
              }
            />
            <InsightCard
              title="Strongest category"
              value={topCategory?.category_name || "No category leader yet"}
              detail={
                topCategory
                  ? `${formatNumber(topCategory.units_sold)} units sold with ${topCategory.browse_count} product views`
                  : "Category performance will appear here."
              }
            />
            <InsightCard
              title="Highest unit sales"
              value={topUnitCategory?.category_name || "No category leader yet"}
              detail={
                topUnitCategory
                  ? `${formatNumber(topUnitCategory.units_sold)} units sold across ${topUnitCategory.order_count} orders`
                  : "Unit sales leaders will appear here."
              }
            />
            <InsightCard
              title="Demand gap"
              value={topOpportunity?.title || "No demand gap detected"}
              detail={
                topOpportunity
                  ? `${topOpportunity.stock_units} units on hand for ${topOpportunity.cart_adds} cart adds and ${topOpportunity.wishlist_adds} wishlist saves`
                  : "Demand opportunity scoring will appear here."
              }
            />
            <InsightCard
              title="Return exposure"
              value={topReturnSeller?.company_name || "Low return exposure"}
              detail={
                topReturnSeller
                  ? `${topReturnSeller.return_rate.toFixed(1)}% return rate`
                  : "Return risk will appear when returned orders exist."
              }
            />
            <InsightCard
              title="Rising city"
              value={risingCity?.city || "Demand is steady"}
              detail={
                risingCity
                  ? `${risingCity.growth_rate.toFixed(1)}% growth with ${formatCurrencyBDT(risingCity.gmv)} GMV`
                  : "Geographic growth will appear here."
              }
            />
          </div>
        </Panel>

        <Panel title="Priority actions" subtitle="The shortest path to operational impact." icon={AlertTriangle}>
          <div className="space-y-3">
            {priorityActions.map((action) => (
              <div key={action.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">{action.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{action.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Seller leaderboard" subtitle="Ranked by GMV, with growth and return pressure in view." icon={Store}>
          <DataTable columns={["Seller", "GMV", "Orders", "Growth", "Return rate"]}>
            {sellers.slice(0, 8).map((seller) => (
              <tr key={seller.seller_id}>
                <td>
                  <div>
                    <p className="font-semibold text-white">{seller.company_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {seller.active_products} active products | {seller.rating.toFixed(1)} rating
                    </p>
                  </div>
                </td>
                <td>{formatCurrencyBDT(seller.total_gmv)}</td>
                <td>{formatNumber(seller.total_orders)}</td>
                <td className={seller.growth_rate >= 0 ? "text-emerald-200" : "text-rose-200"}>
                  {seller.growth_rate.toFixed(1)}%
                </td>
                <td>{seller.return_rate.toFixed(1)}%</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <ChartPanel title="Category revenue" subtitle="GMV by category with demand context." icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="category_name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrencyBDT(value)}
                contentStyle={{
                  background: "#081122",
                  border: "1px solid rgba(34,211,238,0.2)",
                  borderRadius: 16,
                }}
              />
              <Bar dataKey="gmv" fill="#22d3ee" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Demand opportunities" subtitle="High attention, lighter conversion, or thin stock." icon={PackageSearch}>
          <div className="space-y-3">
            {opportunities.slice(0, 6).map((item) => (
              <div key={item.product_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.seller_name} | {item.category_name}
                    </p>
                  </div>
                  <StatusBadge label={`${item.opportunity_score} score`} tone="amber" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {item.browse_count} views, {item.cart_adds} carts, {item.wishlist_adds} wishlists, {item.stock_units} units in stock
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Conversion leaks" subtitle="Products with attention that is not turning into orders." icon={Boxes}>
          <DataTable columns={["Product", "Views", "Cart rate", "Order rate", "Gap score"]}>
            {conversionSignals.slice(0, 8).map((item) => (
              <tr key={item.product_id}>
                <td>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.seller_name}</p>
                  </div>
                </td>
                <td>{formatNumber(item.browse_count)}</td>
                <td>{item.browse_to_cart_rate.toFixed(1)}%</td>
                <td>{item.cart_to_order_rate.toFixed(1)}%</td>
                <td>{formatNumber(item.conversion_gap_score)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Warehouse pressure" subtitle="Stock stress, pending orders, and return load by warehouse." icon={Warehouse}>
          <DataTable columns={["Warehouse", "Stock", "Pending", "Returns", "Pressure"]}>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.warehouse_id}>
                <td>
                  <div>
                    <p className="font-semibold text-white">{warehouse.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{warehouse.city}</p>
                  </div>
                </td>
                <td>{formatNumber(warehouse.stock_units)}</td>
                <td>
                  {formatNumber(warehouse.pending_orders)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {warehouse.low_stock_variants} low-stock variants
                  </p>
                </td>
                <td>{formatNumber(warehouse.return_volume)}</td>
                <td>{warehouse.pressure_score.toFixed(1)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <ChartPanel title="Demand by city" subtitle="Where orders and revenue are concentrating." icon={MapPinned}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cities.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="city" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrencyBDT(value)}
                contentStyle={{
                  background: "#081122",
                  border: "1px solid rgba(192,132,252,0.2)",
                  borderRadius: 16,
                }}
              />
              <Bar dataKey="gmv" fill="#c084fc" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Inventory risk" subtitle="Products likely to need replenishment based on recent demand." icon={AlertTriangle}>
          <DataTable columns={["Product", "Stock", "Recent sales", "Cart adds", "Risk"]}>
            {inventoryRisk.slice(0, 8).map((item) => (
              <tr key={item.product_id}>
                <td>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.seller_name} | {item.category_name}
                    </p>
                  </div>
                </td>
                <td>{formatNumber(item.stock_units)}</td>
                <td>{formatNumber(item.recent_units_sold)}</td>
                <td>{formatNumber(item.cart_adds)}</td>
                <td>{item.risk_score.toFixed(1)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="Returns risk" subtitle="Sellers and products with higher refund exposure." icon={AlertTriangle}>
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Sellers</p>
              <div className="mt-3 space-y-3">
                {returnsRisk?.sellers.slice(0, 3).map((seller) => (
                  <div key={seller.seller_id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{seller.company_name}</p>
                      <p className="text-sm text-muted-foreground">{seller.return_count} returns</p>
                    </div>
                    <StatusBadge label={`${seller.return_rate.toFixed(1)}%`} tone="rose" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Products</p>
              <div className="mt-3 space-y-3">
                {returnsRisk?.products.slice(0, 3).map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{product.title}</p>
                      <p className="text-sm text-muted-foreground">{product.return_count} returns</p>
                    </div>
                    <StatusBadge label={`${product.return_rate.toFixed(1)}%`} tone="rose" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Admin tools" subtitle="Add categories and warehouse capacity without leaving the dashboard." icon={Shield}>
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Create category</p>
              <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" className="field-input" />
              <input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} placeholder="Description" className="field-input" />
              <input value={categoryFee} onChange={(event) => setCategoryFee(event.target.value)} placeholder="Commission percentage" className="field-input" />
              <button onClick={() => createCategoryMutation.mutate()} className="action-primary">
                Create category
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Add warehouse</p>
              {(["name", "street_address", "city", "zip_code", "capacity"] as const).map((field) => (
                <input
                  key={field}
                  value={warehouseForm[field]}
                  onChange={(event) =>
                    setWarehouseForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={field.replace("_", " ")}
                  className="field-input"
                />
              ))}
              <button onClick={() => createWarehouseMutation.mutate()} className="action-primary">
                Create warehouse
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="City demand summary" subtitle="Top cities, strongest category, and recent growth." icon={MapPinned}>
          <DataTable columns={["City", "GMV", "Orders", "Top category", "Growth"]}>
            {cities.slice(0, 8).map((city) => (
              <tr key={city.city}>
                <td>{city.city}</td>
                <td>{formatCurrencyBDT(city.gmv)}</td>
                <td>{formatNumber(city.order_count)}</td>
                <td>{city.top_category}</td>
                <td className={city.growth_rate >= 0 ? "text-emerald-200" : "text-rose-200"}>
                  {city.growth_rate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </PageShell>
  );
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  children: ReactNode;
}) {
  return (
    <Panel title={title} subtitle={subtitle} icon={Icon}>
      <div className="h-[320px]">{children}</div>
    </Panel>
  );
}

function InsightCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
    </div>
  );
}

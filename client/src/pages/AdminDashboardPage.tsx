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
  Cell,
  Pie,
  PieChart,
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
  const orderFulfillmentQuery = useQuery({
    queryKey: ["admin-order-fulfillment"],
    queryFn: adminService.getOrderFulfillment,
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
    orderFulfillmentQuery.isLoading;

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
  const fulfillment = orderFulfillmentQuery.data || [];

  const topSeller = sellers[0];
  const fastestGrowingSeller = [...sellers].sort((left, right) => right.growth_rate - left.growth_rate)[0];
  const topCategory = categories[0];
  const topUnitCategory = [...categories].sort((left, right) => right.units_sold - left.units_sold)[0];

  const STATUS_COLORS: Record<string, string> = {
    Pending: "#f59e0b",
    Processing: "#3b82f6",
    Shipped: "#8b5cf6",
    Delivered: "#10b981",
    Cancelled: "#ef4444",
  };

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
        <StatCard label="Net Platform Revenue" value={formatCurrencyBDT(overview.summary.total_platform_profit)} hint="Total commission earned" accent="emerald" />
        <StatCard label="Top seller" value={topSeller?.company_name || "No sales"} hint={topSeller ? formatCurrencyBDT(topSeller.total_gmv) : "Awaiting activity"} accent="violet" />
        <StatCard label="Top category" value={topCategory?.category_name || "No category data"} hint={topCategory ? formatCurrencyBDT(topCategory.gmv) : "Awaiting activity"} accent="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Marketplace health" subtitle="Top-line view across buyers, sellers, and order performance." icon={Shield}>
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
                  ? `${formatNumber(topCategory.units_sold)} units sold with ${topCategory.order_count} orders`
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
          </div>
        </Panel>

        <ChartPanel title="Fulfillment Health" subtitle="Order distribution by current status." icon={Boxes}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="pieGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0, 255, 255, 0.8)" />
                  <stop offset="100%" stopColor="rgba(0, 255, 255, 0.2)" />
                </linearGradient>
              </defs>
              <Pie
                data={fulfillment}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                isAnimationActive={true}
                animationDuration={300}
              >
                {fulfillment.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || "#94a3b8"} stroke="none" fillOpacity={0.8} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#081122",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
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
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.2} />
                </linearGradient>
              </defs>
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
              <Bar dataKey="gmv" fill="url(#barGradient)" radius={[12, 12, 0, 0]} isAnimationActive={true} animationDuration={300} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-6">
        <Panel title="Admin tools" subtitle="Add categories and warehouse capacity without leaving the dashboard." icon={Shield}>
          <div className="grid gap-8 md:grid-cols-2">
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 relative overflow-hidden group">
      <div className="absolute inset-0 border-l-2 border-primary/20 group-hover:border-primary/50 transition-colors" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
      <p className="hud-number mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
    </div>
  );
}

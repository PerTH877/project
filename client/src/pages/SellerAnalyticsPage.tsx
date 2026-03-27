import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, LineChart, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { sellerService } from "@/services/seller";
import { useQuery } from "@tanstack/react-query";
import { formatCurrencyBDT, formatNumber } from "@/lib/utils";

export default function SellerAnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ["seller-analytics"],
    queryFn: sellerService.getAnalytics,
  });

  const analytics = analyticsQuery.data;
  const summary = useMemo(() => {
    if (!analytics) {
      return {
        totalGross: 0,
        totalEarnings: 0,
        totalOrders: 0,
        topProduct: undefined,
      };
    }

    const totalGross = analytics.sales_trend.reduce((sum, row) => sum + row.gross_sales, 0);
    const totalEarnings = analytics.sales_trend.reduce((sum, row) => sum + row.seller_earnings, 0);
    const totalOrders = analytics.sales_trend.reduce((sum, row) => sum + row.order_count, 0);

    return {
      totalGross,
      totalEarnings,
      totalOrders,
      topProduct: analytics.top_products[0],
    };
  }, [analytics]);

  if (analyticsQuery.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-[360px] rounded-[32px]" />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-[360px] rounded-[32px]" />
          <Skeleton className="h-[360px] rounded-[32px]" />
        </div>
      </PageShell>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Seller analytics"
        title="Track sales, category mix, and stock pressure in one place."
        description="These charts use the same seller analytics data, now arranged for faster day-to-day reading."
        meta={<StatusBadge label="Aggregated from live seller tables" tone="emerald" />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={formatCurrencyBDT(summary.totalGross)} hint="Cumulative seller revenue in this trend window" accent="cyan" />
        <StatCard label="Seller earnings" value={formatCurrencyBDT(summary.totalEarnings)} hint="Post-platform-fee earnings across the same period" accent="emerald" />
        <StatCard label="Orders" value={formatNumber(summary.totalOrders)} hint="Distinct orders represented in trend data" accent="violet" />
        <StatCard
          label="Top product"
          value={summary.topProduct?.title || "No sales yet"}
          hint={summary.topProduct ? formatCurrencyBDT(summary.topProduct.gross_sales) : "Awaiting activity"}
          accent="magenta"
        />
      </div>

      <Panel title="Revenue arc" subtitle="Compare gross sales and seller earnings over time." icon={LineChart}>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.sales_trend}>
              <defs>
                <linearGradient id="grossGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="earningsGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="month_label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrencyBDT(value)}
                contentStyle={{
                  background: "#081122",
                  border: "1px solid rgba(56,189,248,0.2)",
                  borderRadius: 16,
                }}
              />
              <Area type="monotone" dataKey="gross_sales" stroke="#22d3ee" fill="url(#grossGradient)" strokeWidth={3} />
              <Area type="monotone" dataKey="seller_earnings" stroke="#c084fc" fill="url(#earningsGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Order throughput" subtitle="Monthly order volume." icon={BarChart3}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="month_label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatNumber(value)}
                  contentStyle={{
                    background: "#081122",
                    border: "1px solid rgba(192,132,252,0.2)",
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="order_count" fill="#c084fc" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top products" subtitle="Revenue, units sold, and ratings." icon={TrendingUp}>
          <div className="space-y-3">
            {analytics.top_products.map((product) => (
              <div key={product.product_id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{product.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.units_sold} units | {product.review_count} reviews | {Number(product.avg_rating || 0).toFixed(1)} rating
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">{formatCurrencyBDT(product.gross_sales)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <Panel title="Category breakdown" subtitle="See where listings and revenue concentrate." icon={BarChart3}>
          <div className="space-y-4">
            {analytics.category_breakdown.map((category) => {
              const maxGross = Math.max(...analytics.category_breakdown.map((entry) => entry.gross_sales), 1);
              const percentage = (category.gross_sales / maxGross) * 100;
              return (
                <div key={category.category_name} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{category.category_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.product_count} active products
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatCurrencyBDT(category.gross_sales)}</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Stock alerts" subtitle="Variants most likely to need intervention." icon={AlertTriangle}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {analytics.stock_alerts.map((alert) => (
              <div key={`${alert.title}-${alert.sku}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.sku}</p>
                  </div>
                  <StatusBadge label={`${alert.available_stock} units`} tone={alert.available_stock <= 4 ? "rose" : "amber"} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}

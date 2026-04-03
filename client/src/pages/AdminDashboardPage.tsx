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
import { cn, formatCurrencyBDT, formatNumber } from "@/lib/utils";

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
    const [geoSortOrder, setGeoSortOrder] = useState<"asc" | "desc">("desc");

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
    const pendingSellersQuery = useQuery({
        queryKey: ["admin-pending-sellers"],
        queryFn: adminService.getPendingSellers,
    });
    const geoDemandQuery = useQuery({
        queryKey: ["admin-geo-demand"],
        queryFn: adminService.getGeographicDemand,
    });

    const verifySellerMutation = useMutation({
        mutationFn: (id: number) => adminService.verifySeller(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pending-sellers"] });
            queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
            toast.success("Seller verified successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Verification failed");
        },
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
        orderFulfillmentQuery.isLoading ||
        pendingSellersQuery.isLoading ||
        geoDemandQuery.isLoading;

    if (isLoading) {
        return (
            <PageShell className="bg-slate-950 min-h-screen">
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6 px-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-36 rounded-[2rem] bg-white/[0.03] border border-white/[0.1] backdrop-blur-md" />
                    ))}
                </div>
                <div className="mt-6 grid gap-6 xl:grid-cols-2 px-4">
                    <Skeleton className="h-[420px] rounded-[2rem] bg-white/[0.03] border border-white/[0.1] backdrop-blur-md" />
                    <Skeleton className="h-[420px] rounded-[2rem] bg-white/[0.03] border border-white/[0.1] backdrop-blur-md" />
                </div>
            </PageShell>
        );
    }

    const overview = overviewQuery.data!;
    const sellers = sellerPerformanceQuery.data || [];
    const categories = categoryPerformanceQuery.data || [];
    const fulfillment = orderFulfillmentQuery.data || [];
    const pendingSellers = pendingSellersQuery.data || [];
    const geoDemand = geoDemandQuery.data || [];

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
        <PageShell className="space-y-10 relative z-10 pb-20 min-h-screen">
            <div className="relative z-10 px-4">
                <PageHeader
                    eyebrow="Market Intelligence"
                    title={
                        <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                            Aurora Executive Dashboard
                        </span>
                    }
                    description="Real-time monitoring of marketplace velocity, entity performance, and fulfillment health."
                    meta={<StatusBadge label={`${overview.summary.pending_seller_count} Pending Review`} tone="amber" className="bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 rounded-full px-4 py-1 text-xs font-bold" />}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6 relative z-10 px-4">
                {[
                    { label: "User Base", numeric: overview.summary.customer_count, hint: "Total nodes" },
                    { label: "Verified Vendors", numeric: overview.summary.verified_seller_count, hint: "Approved units" },
                    { label: "GMV Cumulative", value: formatCurrencyBDT(overview.summary.gross_merchandise_value), hint: "Market value" },
                    { label: "Platform Yield", value: formatCurrencyBDT(overview.summary.total_platform_profit), hint: "Net yield" },
                    { label: "Prime Seller", value: topSeller?.company_name || "N/A", hint: "Top node" },
                    { label: "Core Category", value: topCategory?.category_name || "N/A", hint: "Sector leader" },
                ].map((stat, i) => (
                    <div key={i} className="group relative bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] p-6 shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300 hover:bg-white/[0.1] hover:-translate-y-0.5">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{stat.label}</p>
                        <p className="mt-2 text-2xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{stat.numeric !== undefined ? formatNumber(stat.numeric) : stat.value}</p>
                        <p className="mt-1 text-xs text-slate-400">{stat.hint}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] relative z-10 px-4">
                <Panel title="Marketplace Health" subtitle="Buyer-seller transactional flow indices" icon={Shield} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                        <InsightCard
                            title="Vendor Apex"
                            value={topSeller?.company_name || "IDLE"}
                            detail={
                                topSeller
                                    ? `${formatCurrencyBDT(topSeller.total_gmv)} yield | ${topSeller.total_orders} total orders`
                                    : "Waiting for signal"
                            }
                        />
                        <InsightCard
                            title="Growth Vector"
                            value={fastestGrowingSeller?.company_name || "IDLE"}
                            detail={
                                fastestGrowingSeller
                                    ? `+${fastestGrowingSeller.growth_rate.toFixed(1)}% Velocity | ${formatCurrencyBDT(fastestGrowingSeller.total_gmv)} GMV`
                                    : "Waiting for signal"
                            }
                        />
                        <InsightCard
                            title="Supply Pillar"
                            value={topCategory?.category_name || "IDLE"}
                            detail={
                                topCategory
                                    ? `${formatNumber(topCategory.units_sold)} unit throughput`
                                    : "Waiting for signal"
                            }
                        />
                        <InsightCard
                            title="Unit Flow"
                            value={topUnitCategory?.category_name || "IDLE"}
                            detail={
                                topUnitCategory
                                    ? `${formatNumber(topUnitCategory.units_sold)} cumulative sales`
                                    : "Waiting for signal"
                            }
                        />
                    </div>
                </Panel>

                <div className="space-y-6">
                    <ChartPanel title="Logistics Status" subtitle="Order distribution matrix" icon={Boxes} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={fulfillment}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={6}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth={2}
                                    isAnimationActive={true}
                                >
                                    {fulfillment.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(15, 23, 42, 0.9)",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        borderRadius: "1rem",
                                        backdropFilter: "blur(12px)",
                                        color: "#fff",
                                    }}
                                    itemStyle={{ color: "#fff" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartPanel>

                    <Panel title="Verification Hub" subtitle="Store application authorization" icon={Shield} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {pendingSellers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                    <Shield className="h-10 w-10 mb-4 text-slate-500" />
                                    <p className="text-xs font-bold tracking-widest uppercase">Entity Queue Clear</p>
                                </div>
                            ) : (
                                pendingSellers.map((seller) => (
                                    <div key={seller.seller_id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] group hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-300">
                                        <div className="min-w-0 flex-1 mr-4">
                                            <p className="font-bold text-white text-sm drop-shadow-sm">{seller.company_name.toUpperCase()}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{seller.contact_email}</p>
                                        </div>
                                        <button
                                            onClick={() => verifySellerMutation.mutate(seller.seller_id)}
                                            disabled={verifySellerMutation.isPending}
                                            className="px-5 py-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-widest hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                                        >
                                            {verifySellerMutation.isPending ? "..." : "AUTHORIZE"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] relative z-10 px-4">
                <Panel title="Vendor Leaderboard" subtitle="GMV ranked entity performance" icon={Store} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <DataTable columns={["ID", "VENDOR ENTITY", "GMV YIELD", "FLOW", "VECTOR"]}>
                        {sellers.slice(0, 8).map((seller) => (
                            <tr key={seller.seller_id} className="border-b border-white/5 hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 group">
                                <td className="text-[10px] text-slate-500 font-bold">NODE_{seller.seller_id}</td>
                                <td>
                                    <div>
                                        <p className="font-bold text-white text-xs tracking-tight">{seller.company_name.toUpperCase()}</p>
                                        <p className="mt-1 text-[9px] text-slate-400 font-bold">
                                            {seller.active_products} UNITS | {seller.rating.toFixed(1)} RTG
                                        </p>
                                    </div>
                                </td>
                                <td className="font-bold text-white text-xs drop-shadow-sm">{formatCurrencyBDT(seller.total_gmv)}</td>
                                <td className="text-xs text-slate-300 font-medium">{formatNumber(seller.total_orders)}</td>
                                <td className={cn("text-[9px] font-bold uppercase", seller.growth_rate >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {seller.growth_rate >= 0 ? '↑' : '↓'} {Math.abs(seller.growth_rate).toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </Panel>

                <ChartPanel title="Category Core" subtitle="GMV distribution by sector" icon={BarChart3} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categories.slice(0, 6)}>
                            <defs>
                                <linearGradient id="auroraGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ec4899" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="category_name" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }} stroke="rgba(255,255,255,0.1)" />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }} stroke="rgba(255,255,255,0.1)" />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    background: "rgba(15, 23, 42, 0.9)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    borderRadius: "1rem",
                                    backdropFilter: "blur(12px)",
                                    color: "#fff",
                                }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Bar dataKey="gmv" fill="url(#auroraGradient)" radius={[8, 8, 0, 0]} isAnimationActive={true} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr] relative z-10 px-4">
                <ChartPanel 
                    title="Geographic Market Share" 
                    subtitle="Regional GMV distribution" 
                    icon={MapPinned} 
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                    titleClassName="bg-gradient-to-r from-cyan-400 to-emerald-400"
                >
                    <div className="h-full flex flex-col">
                        <div className="flex-1 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...geoDemand].sort((a, b) => b.gmv - a.gmv).slice(0, 8)}>
                                    <defs>
                                        <linearGradient id="geoGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" />
                                            <stop offset="100%" stopColor="#22d3ee" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="city" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }} stroke="rgba(255,255,255,0.1)" />
                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }} stroke="rgba(255,255,255,0.1)" />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{
                                            background: "rgba(15, 23, 42, 0.9)",
                                            border: "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "1rem",
                                            backdropFilter: "blur(12px)",
                                            color: "#fff",
                                        }}
                                        itemStyle={{ color: "#fff" }}
                                        formatter={(value: number) => formatCurrencyBDT(value)}
                                    />
                                    <Bar dataKey="gmv" radius={[4, 4, 0, 0]} isAnimationActive={true} barSize={24}>
                                        {[...geoDemand].sort((a, b) => b.gmv - a.gmv).slice(0, 8).map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.gmv === 0 ? "transparent" : (entry.growth_rate < 0 ? "#f97316" : "url(#geoGradient)")}
                                                stroke={entry.gmv === 0 ? "#94a3b8" : "none"}
                                                strokeDasharray={entry.gmv === 0 ? "5 5" : "0"}
                                                strokeWidth={entry.gmv === 0 ? 1 : 0}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartPanel>

                <Panel 
                    title="Territory Risk Ledger" 
                    subtitle="Critical regional demand monitoring" 
                    icon={Warehouse} 
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                    titleClassName="bg-gradient-to-r from-cyan-400 to-emerald-400"
                    actions={
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setGeoSortOrder("desc")}
                                className={cn("px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all", geoSortOrder === "desc" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                            >
                                SHOW LEADERS
                            </button>
                            <button 
                                onClick={() => setGeoSortOrder("asc")}
                                className={cn("px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all", geoSortOrder === "asc" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10")}
                            >
                                SHOW LAGGARDS
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-6 pt-4 border-t border-white/[0.05]">
                        <DataTable columns={["CITY", "TOP CATEGORY", "GROWTH", "GMV"]}>
                            {[...geoDemand].sort((a, b) => geoSortOrder === "desc" ? b.gmv - a.gmv : a.gmv - b.gmv).slice(0, 5).map((city) => (
                                <tr key={city.city} className={cn("border-b border-white/5 hover:bg-white/[0.08] transition-all duration-300", city.growth_rate < 0 && "bg-rose-500/[0.02]")}>
                                    <td className="font-bold text-white text-xs tracking-tight">
                                        <div className="flex items-center gap-2">
                                            {city.growth_rate < 0 && (
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                </span>
                                            )}
                                            {city.city.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="text-[10px] text-slate-400 font-bold">{city.top_category.toUpperCase()}</td>
                                    <td className={cn("text-[10px] font-bold", city.growth_rate >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        <span className="flex items-center gap-1">
                                            {city.growth_rate >= 0 ? "↑" : "↓"}
                                            {Math.abs(city.growth_rate).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="font-mono text-xs font-bold text-white drop-shadow-sm">{formatCurrencyBDT(city.gmv)}</td>
                                </tr>
                            ))}
                        </DataTable>
                    </div>
                </Panel>
            </div>

            <div className="grid gap-6 relative z-10 px-4">
                <Panel title="System Administration" subtitle="Infrastructure scaling & category taxonomy" icon={Shield} className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.15] rounded-[2rem] shadow-2xl shadow-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="grid gap-12 md:grid-cols-2 mt-6">
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Init Category Object</p>
                            <div className="space-y-3">
                                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="IDENTIFIER" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-fuchsia-500 outline-none transition-all" />
                                <input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} placeholder="DESCRIPTION_ATTR" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-fuchsia-500 outline-none transition-all" />
                                <input value={categoryFee} onChange={(event) => setCategoryFee(event.target.value)} placeholder="COMMISSION_YIELD" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-fuchsia-500 outline-none transition-all" />
                            </div>
                            <button onClick={() => createCategoryMutation.mutate()} className="w-full py-3 bg-fuchsia-600 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl hover:bg-fuchsia-500 shadow-lg shadow-fuchsia-600/30 active:scale-[0.98] transition-all">
                                Commit Category Node
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Init Warehouse Node</p>
                            <div className="grid grid-cols-2 gap-3">
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
                                        placeholder={field.replace('_', ' ').toUpperCase()}
                                        className={cn("bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-cyan-500 outline-none transition-all", field === "street_address" && "col-span-2")}
                                    />
                                ))}
                            </div>
                            <button onClick={() => createWarehouseMutation.mutate()} className="w-full py-3 bg-cyan-600 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 active:scale-[0.98] transition-all">
                                Deploy Warehouse Entity
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
    className,
    titleClassName,
}: {
    title: string;
    subtitle: string;
    icon: typeof BarChart3;
    children: ReactNode;
    className?: string;
    titleClassName?: string;
}) {
    return (
        <Panel title={title} subtitle={subtitle} icon={Icon} className={className} titleClassName={cn("bg-gradient-to-r from-amber-400 to-rose-400", titleClassName)}>
            <div className="h-[320px]">{children}</div>
        </Panel>
    );
}

function InsightCard({ title, value, detail }: { title: string; value: string; detail: string }) {
    return (
        <div className="group relative bg-white/[0.04] p-6 rounded-2xl border border-white/[0.08] backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-0.5">
            <div className="absolute top-0 left-0 h-1 w-8 bg-gradient-to-r from-fuchsia-500 to-transparent rounded-full" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.5)] group-hover:text-fuchsia-300 transition-colors">{title}</p>
            <p className="mt-3 text-lg font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{value}</p>
            <p className="mt-1 text-[10px] text-slate-300 font-medium leading-relaxed">{detail}</p>
        </div>
    );
}

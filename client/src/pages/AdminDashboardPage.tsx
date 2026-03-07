import { useQuery } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Skeleton } from '@/components/Skeleton'
import { Trophy, TrendingUp, Presentation } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function AdminDashboardPage() {
    const { data: topCategories, isLoading: loadingCat } = useQuery({
        queryKey: ['admin-top-categories'],
        queryFn: adminService.getTopCategories,
    })

    const { data: topSellers, isLoading: loadingSellers } = useQuery({
        queryKey: ['admin-top-sellers'],
        queryFn: adminService.getTopSellers,
    })

    const { data: topProducts, isLoading: loadingProducts } = useQuery({
        queryKey: ['admin-top-products'],
        queryFn: adminService.getTopProducts,
    })

    const isLoading = loadingCat || loadingSellers || loadingProducts

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Analytics Overview</h1>
                    <p className="text-muted-foreground mt-1">Platform performance metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Categories Chart */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Presentation className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-foreground">Top Categories by Product Count</h2>
                    </div>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topCategories || []} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--secondary))' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                                    />
                                    <Bar dataKey="product_count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                        {(topCategories || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.15})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Sellers Chart */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <h2 className="text-lg font-bold text-foreground">Top Sellers by Gross Sales</h2>
                    </div>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topSellers || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="company_name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--secondary))' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Bar dataKey="total_sales" fill="#22c55e" radius={[4, 4, 0, 0]}>
                                        {(topSellers || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`rgba(34, 197, 94, ${1 - index * 0.15})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Products Table */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-foreground">Most Popular Products (Cart + Wishlist)</h2>
                </div>

                {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30">
                                <tr>
                                    <th className="px-6 py-4 font-semibold rounded-tl-xl">Rank</th>
                                    <th className="px-6 py-4 font-semibold">Product Title</th>
                                    <th className="px-6 py-4 font-semibold rounded-tr-xl text-right">Popularity Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(topProducts || []).map((p, idx) => (
                                    <tr key={p.product_id} className="hover:bg-secondary/10 transition-colors">
                                        <td className="px-6 py-4">
                                            {idx === 0 ? <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold dark:bg-amber-500/20 dark:text-amber-500">1</span> : idx + 1}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">{p.title}</td>
                                        <td className="px-6 py-4 text-right font-bold text-primary">{p.popularity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

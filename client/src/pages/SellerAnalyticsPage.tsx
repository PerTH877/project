import { BarChart3, TrendingUp, Users } from 'lucide-react'

export default function SellerAnalyticsPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
                    <p className="text-muted-foreground mt-1">Deep insights into your store performance</p>
                </div>
                <div className="px-4 py-2 border border-border rounded-xl text-sm font-medium bg-background text-muted-foreground cursor-not-allowed opacity-50">
                    Last 30 Days (Coming soon)
                </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-sm relative overflow-hidden">
                {/* Decorative blur elements for modern feel */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex -space-x-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-background border-4 border-card flex items-center justify-center shadow-sm z-30">
                            <BarChart3 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="w-16 h-16 rounded-full bg-background border-4 border-card flex items-center justify-center shadow-sm z-20">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="w-16 h-16 rounded-full bg-background border-4 border-card flex items-center justify-center shadow-sm z-10">
                            <Users className="w-6 h-6 text-amber-500" />
                        </div>
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">Analytics Suite Under Construction</h2>
                    <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed mb-8">
                        We are currently rebuilding the analytics engine to provide real-time event streaming and complex date-range aggregations. The legacy endpoints have been deprecated.
                    </p>

                    <div className="inline-flex items-center gap-3 px-6 py-3 border border-border rounded-full text-sm font-semibold bg-background shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                        Engine Upgrade in Progress - Expected Q4
                    </div>
                </div>
            </div>
        </div>
    )
}

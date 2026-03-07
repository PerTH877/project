import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { adminService } from '@/services/admin'
import { Skeleton } from '@/components/Skeleton'

export default function AdminModerationPage() {
    const queryClient = useQueryClient()

    const { data: sellers = [], isLoading } = useQuery({
        queryKey: ['admin-pending-sellers'],
        queryFn: adminService.getPendingSellers,
    })

    const { mutate: verifySeller, isPending } = useMutation({
        mutationFn: adminService.verifySeller,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-pending-sellers'] })
            toast.success('Seller verified successfully')
        },
        onError: () => toast.error('Failed to verify seller')
    })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Seller Moderation</h1>
                    <p className="text-muted-foreground text-sm">Review and approve new seller applications</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-secondary/30">
                    <h2 className="text-lg font-bold text-foreground">Pending Applications</h2>
                </div>

                {isLoading ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : sellers.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                        <p className="text-lg font-medium">All caught up!</p>
                        <p className="text-sm">There are no pending seller applications.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {sellers.map((seller) => (
                            <div key={seller.seller_id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                        {seller.company_name}
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500 border border-amber-200 dark:border-amber-500/30">Unverified</span>
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <span><strong>Email:</strong> {seller.contact_email}</span>
                                        {seller.gst_number && <span><strong>GST:</strong> {seller.gst_number}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={isPending}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                    <button
                                        onClick={() => verifySeller(seller.seller_id)}
                                        disabled={isPending}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve Seller
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

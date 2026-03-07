import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { wishlistsService } from '@/services/wishlists'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/Skeleton'
import { cn } from '@/lib/utils'

export default function WishlistsPage() {
    const queryClient = useQueryClient()
    const [newTitle, setNewTitle] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const { data: wishlists = [], isLoading } = useQuery({
        queryKey: ['wishlists'],
        queryFn: wishlistsService.list,
    })

    // Since we only get variant_ids from items, ideally we'd map products.
    // For the sake of UI, we'll just show the count.

    const { mutate: createList, isPending: isSaving } = useMutation({
        mutationFn: (name: string) => wishlistsService.create(name, false),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wishlists'] })
            setNewTitle('')
            setIsCreating(false)
            toast.success('Wishlist created')
        },
        onError: () => toast.error('Creation failed'),
    })

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-foreground">Your Wishlists</h1>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New List
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="mb-8 p-6 bg-card border border-border rounded-2xl shadow-sm animate-fade-in">
                    <h3 className="text-lg font-bold text-foreground mb-4">Create New Wishlist</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Summer Wardrobe"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:border-primary"
                            autoFocus
                        />
                        <button
                            onClick={() => createList(newTitle || 'My Wishlist')}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-6 py-2.5 border border-border text-foreground font-medium rounded-xl hover:bg-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
            ) : wishlists.length === 0 ? (
                <EmptyState
                    icon={<Heart className="w-8 h-8" />}
                    title="No wishlists yet"
                    description="Create a wishlist to save items you love."
                    action={
                        <button onClick={() => setIsCreating(true)} className="text-sm font-medium text-primary hover:underline">
                            Create your first list
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {wishlists.map((list) => (
                        <div key={list.wishlist_id} className="group bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{list.name}</h3>
                                    <p className="text-sm text-muted-foreground">{list.items?.length || 0} items saved</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
